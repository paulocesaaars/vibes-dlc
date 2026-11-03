import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type AppConfig,
  isNodeVersionOk,
  loadConfig,
  nodeVersionMessage,
} from '@/config/app-config';
import { logger } from '@/config/logger';
import type { Env } from '@/config/shell-lookup';
import { prepareStorage } from '@/db/storage';
import { killStaleShell } from '@/terminal/stale-shell';
import { terminalPidFile } from './runtime';

const NO_NETWORK_SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'scripts',
  'no-network.cjs',
);

export type NextMode = 'dev' | 'build' | 'start';

export class StartupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StartupError';
  }
}

export function parseMode(mode: string | undefined): NextMode {
  if (mode === 'dev' || mode === 'build' || mode === 'start') return mode;
  throw new StartupError(`Modo desconhecido: ${mode ?? '(vazio)'}. Use dev, build ou start.`);
}

/** Argumentos do Next. O endereço de escuta vem da `Config` (NFR3.1). */
export function buildNextArgs(mode: NextMode, config: AppConfig, extra: string[] = []): string[] {
  if (mode === 'build') return ['build', ...extra];
  return [mode, '--hostname', config.host, '--port', String(config.port), ...extra];
}

/** Ambiente do Next: sem telemetria e sem `fetch` para fora da máquina (BR2.2). */
export function buildNextEnv(config: AppConfig, env: Env): Env {
  const preload = `--require ${JSON.stringify(NO_NETWORK_SCRIPT)}`;
  return {
    ...env,
    PORT: String(config.port),
    VIBES_HOST: config.host,
    NEXT_TELEMETRY_DISABLED: '1',
    NODE_OPTIONS: [env.NODE_OPTIONS, preload].filter(Boolean).join(' '),
  };
}

/** Passos antes de escutar, na ordem de `reliability-design.md`. Qualquer falha aqui é fatal. */
export function prepareStart(env: Env = process.env, cwd = process.cwd()): AppConfig {
  if (!isNodeVersionOk()) throw new StartupError(nodeVersionMessage());
  const config = loadConfig(env, cwd);
  prepareStorage(config.dbPath).close();
  killStaleShell(terminalPidFile(config));
  announceAddress(config);
  return config;
}

export function announceAddress(config: AppConfig): void {
  logger.info('inicio', `Painel em http://${config.host}:${config.port}`);
  if (!config.exposed) return;
  logger.warn(
    'inicio',
    `O painel está exposto em ${config.host}. Qualquer pessoa com acesso a esse endereço pode executar comandos nesta máquina.`,
  );
  if (config.host === '0.0.0.0' && !config.publicHost) {
    logger.warn(
      'inicio',
      'Sem VIBES_PUBLIC_HOST, só 127.0.0.1 e localhost são aceitos como endereço do painel.',
    );
  }
}

function forwardSignals(child: ChildProcess): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => child.kill(signal));
  }
}

/** Valida, prepara e inicia o Next com o endereço da configuração. */
export async function runNext(modeArgument: string | undefined, extra: string[]): Promise<void> {
  const mode = parseMode(modeArgument);
  const config = mode === 'build' ? loadConfig() : prepareStart();
  const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
  const child = spawn(process.execPath, [nextBin, ...buildNextArgs(mode, config, extra)], {
    stdio: 'inherit',
    env: buildNextEnv(config, process.env) as NodeJS.ProcessEnv,
  });
  forwardSignals(child);
  child.on('exit', (code) => process.exit(code ?? 0));
}
