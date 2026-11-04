import path from 'node:path';
import { findShell } from '@/config/shell-lookup';
import { logger } from '@/config/logger';
import type { RepoHealth } from '@/core/types';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, jsonResponse } from '@/web/responses';
import { getRuntime, refreshRuntime, terminalCwd, type Runtime } from '@/web/runtime';

export const dynamic = 'force-dynamic';

function healthOf(runtime: Runtime): { health: RepoHealth; failedPath: string | null } {
  const active = runtime.reader.readActive();
  if (active.kind === 'failure') return { health: active.health, failedPath: active.failedPath };
  const shell = findShell();
  if (!shell.path) return { health: 'missing_shell', failedPath: shell.searched.join(', ') };
  return { health: 'ok', failedPath: null };
}

function samePlace(a: string, b: string): boolean {
  const normalize = (value: string) => {
    const resolved = path.resolve(value);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  return normalize(a) === normalize(b);
}

/**
 * Pasta de uma sessão viva do terminal que ficou para trás: ela abriu numa pasta e as próximas
 * sessões abririam em outra. Encerrar uma sessão em uso seria pior, então a tela só avisa.
 */
function staleSessionFolder(runtime: Runtime): string | null {
  const opened = runtime.terminal.aliveSessionCwd();
  if (!opened) return null;
  return samePlace(opened, terminalCwd() ?? process.cwd()) ? null : opened;
}

/**
 * Tentar de novo: reavalia onde está o AI-DLC sem reiniciar o servidor (FR11.5). A origem é conferida
 * antes de qualquer leitura, e o corpo traz só a saúde que a tela já mostra.
 */
export async function POST(request: Request): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  try {
    const current = await refreshRuntime();
    return jsonResponse({
      repo: healthOf(current),
      repoRoot: current.config.repoRoot,
      staleSessionFolder: staleSessionFolder(current),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('runtime', `Não foi possível reavaliar o projeto: ${reason}`);
    return errorResponse(
      500,
      'recheck_failed',
      `Não foi possível verificar o projeto de novo. ${reason}`,
    );
  }
}
