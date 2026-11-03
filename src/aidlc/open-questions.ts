import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Env } from '@/config/shell-lookup';

/** Limite de `performance-requirements.md` (NFR1.3): a meta de 3 s inclui a detecção de 1 s. */
export const QUESTION_TIMEOUT_MS = 1500;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;
/** Quebram as aspas do `cmd.exe`. Espaços, acentos e parênteses ficam dentro delas e são aceitos. */
const UNSAFE_PATH = /["%!&|<>^]/;

/**
 * O mínimo para o `aidlc.cmd` chegar ao PowerShell e ao executável, em nome maiúsculo porque o Windows
 * ignora a caixa. Todo o resto fica de fora, inclusive segredos e variáveis de sessão de qualquer CLI.
 */
const ALLOWED_ENV = new Set([
  'APPDATA',
  'COMSPEC',
  'LOCALAPPDATA',
  'PATH',
  'PATHEXT',
  'PROGRAMDATA',
  'SYSTEMDRIVE',
  'SYSTEMROOT',
  'TEMP',
  'TMP',
  'USERPROFILE',
  'WINDIR',
]);

const answersSchema = z.object({ open: z.array(z.unknown()) });

export type QuestionOptions = {
  env: Env;
  /** Encerra a árvore de processos ao esgotar o limite. Vem de fora: `aidlc` não conhece `terminal`. */
  killTree: (pid: number) => void;
  timeoutMs?: number;
};

export type QuestionRequest = {
  stage: string;
  unit: string | null;
  cwd: string;
  /** Recebe o motivo, nunca a saída do comando (NFR13.1). */
  onUnavailable?: (reason: string) => void;
};

export function isSafeSlug(value: string): boolean {
  return SAFE_SLUG.test(value);
}

/**
 * Localiza o `aidlc`: `VIBES_AIDLC` e depois `aidlc.cmd` no `PATH` herdado, feita pelo Node.js e só
 * em pastas com caminho absoluto, porque `.` apontaria para o repositório (`security-design.md`).
 */
export function findAidlcCommand(
  env: Env,
  exists: (candidate: string) => boolean = existsSync,
): string | null {
  const configured = env.VIBES_AIDLC?.trim();
  if (configured)
    return path.win32.isAbsolute(configured) && exists(configured) ? configured : null;

  const entries = (env.PATH ?? env.Path ?? '').split(path.win32.delimiter);
  for (const entry of entries) {
    const directory = entry.trim().replace(/^"|"$/g, '');
    if (!path.win32.isAbsolute(directory)) continue;
    const candidate = path.win32.join(directory, 'aidlc.cmd');
    if (exists(candidate)) return candidate;
  }
  return null;
}

function buildCommandLine(aidlcPath: string, stage: string, unit: string | null): string {
  const unitArgument = unit ? ` --unit ${unit}` : '';
  return `/d /s /c ""${aidlcPath}" engine log answers --stage ${stage}${unitArgument}"`;
}

/**
 * Ambiente por lista permitida. O painel pode ter sido aberto de dentro de um chat da CLI de IA, e,
 * com a identificação do chat, o `aidlc` grava `aidlc/.aidlc-sessions/` mesmo em um comando de
 * leitura, e o produto não pode mudar `aidlc/` (NFR7.1). `AIDLC_PROJECT_DIR` fica fixo, porque um valor
 * de outro projeto faria o guia contar as perguntas erradas.
 */
function buildCommandEnv(env: Env, cwd: string): NodeJS.ProcessEnv {
  const allowed = Object.entries(env).filter(([name]) => ALLOWED_ENV.has(name.toUpperCase()));
  const commandEnv: Env = { ...Object.fromEntries(allowed), AIDLC_PROJECT_DIR: cwd };
  return commandEnv as NodeJS.ProcessEnv;
}

function countOpen(output: string): number | null {
  try {
    const parsed = answersSchema.safeParse(JSON.parse(output));
    return parsed.success ? parsed.data.open.length : null;
  } catch {
    return null;
  }
}

/** Só o código do erro: a mensagem do `execFile` traz a saída do comando (NFR13.1). */
function describeFailure(error: { code?: string | number | null }): string {
  return error.code === undefined || error.code === null
    ? 'o comando terminou com erro'
    : `erro ${String(error.code)}`;
}

/**
 * A única função que monta o comando de perguntas. Etapa e Unidade passam pelo padrão seguro antes
 * de virar argumento. A saída é dado não confiável: dela sai só o tamanho de `open` (NFR5.2, NFR5.3).
 */
export function readOpenQuestionCount(
  request: QuestionRequest,
  options: QuestionOptions,
): Promise<number | 'unavailable'> {
  const { stage, unit, cwd, onUnavailable } = request;
  const giveUp = (reason: string): 'unavailable' => {
    onUnavailable?.(reason);
    return 'unavailable';
  };

  if (!isSafeSlug(stage) || (unit !== null && !isSafeSlug(unit))) {
    return Promise.resolve(giveUp('a etapa ou a Unidade não seguem o padrão seguro'));
  }
  const aidlcPath = findAidlcCommand(options.env);
  if (!aidlcPath) return Promise.resolve(giveUp('o comando aidlc não foi encontrado'));
  if (UNSAFE_PATH.test(aidlcPath)) {
    return Promise.resolve(giveUp('o caminho do aidlc tem caracteres não aceitos'));
  }

  return new Promise((resolve) => {
    let finished = false;
    const child = execFile(
      'cmd.exe',
      [buildCommandLine(aidlcPath, stage, unit)],
      {
        cwd,
        windowsVerbatimArguments: true,
        windowsHide: true,
        maxBuffer: MAX_OUTPUT_BYTES,
        env: buildCommandEnv(options.env, cwd),
      },
      (error, stdout) => {
        clearTimeout(timer);
        if (finished) return;
        finished = true;
        if (error) {
          resolve(giveUp(describeFailure(error)));
          return;
        }
        const count = countOpen(stdout);
        resolve(count === null ? giveUp('a saída do comando não é a esperada') : count);
      },
    );
    // O `timeout` do `execFile` encerraria só o `cmd.exe`, e os filhos continuariam rodando.
    const timer = setTimeout(() => {
      finished = true;
      if (child.pid !== undefined) {
        try {
          options.killTree(child.pid);
        } catch (error) {
          const failure = describeFailure(error as NodeJS.ErrnoException);
          onUnavailable?.(`não foi possível encerrar o comando: ${failure}`);
        }
      }
      resolve(giveUp('o comando passou do limite de tempo'));
    }, options.timeoutMs ?? QUESTION_TIMEOUT_MS);
  });
}
