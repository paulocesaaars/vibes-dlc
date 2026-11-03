import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { type Env, findShell, type ShellLookup } from './shell-lookup';

export const MINIMUM_NODE = { major: 22, minor: 13 };

export type AppConfig = {
  port: number;
  host: string;
  publicHost: string | null;
  dbPath: string;
  vibesDir: string;
  shell: ShellLookup;
  repoRoot: string | null;
  exposed: boolean;
  nodeVersionOk: boolean;
};

/** Configuração inválida: o processo não inicia, e a mensagem traz a chave e a forma esperada. */
export class ConfigError extends Error {
  constructor(
    readonly key: string,
    expected: string,
  ) {
    super(`A variável ${key} é inválida. Esperado: ${expected}.`);
    this.name = 'ConfigError';
  }
}

export function isNodeVersionOk(version: string = process.versions.node): boolean {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  if (major !== MINIMUM_NODE.major) return major > MINIMUM_NODE.major;
  return minor >= MINIMUM_NODE.minor;
}

export function nodeVersionMessage(version: string = process.versions.node): string {
  return `O Vibes DLC exige Node.js ${MINIMUM_NODE.major}.${MINIMUM_NODE.minor} ou superior, e este é o ${version}.`;
}

/** Sobe a partir de `start` até a pasta mais próxima que contém `aidlc/` (BR1.4). */
export function findRepoRoot(start: string): string | null {
  let current = path.resolve(start);
  for (;;) {
    const candidate = path.join(current, 'aidlc');
    if (existsSync(candidate) && statSync(candidate).isDirectory()) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

const portSchema = z.coerce.number().int().min(1).max(65535);
const hostSchema = z.string().regex(/^[^\s/\\]+$/);

function readPort(env: Env): number {
  const parsed = portSchema.safeParse(env.PORT?.trim() || 3000);
  if (!parsed.success) throw new ConfigError('PORT', 'um número inteiro de 1 a 65535');
  return parsed.data;
}

function readHost(key: string, value: string | undefined, fallback: string): string;
function readHost(key: string, value: string | undefined, fallback: null): string | null;
function readHost(key: string, value: string | undefined, fallback: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (!hostSchema.safeParse(trimmed).success) {
    throw new ConfigError(key, 'um endereço ou nome de máquina, sem espaços nem barras');
  }
  return trimmed;
}

function readDbPath(env: Env, baseDir: string): { dbPath: string; vibesDir: string } {
  const vibesDir = path.join(baseDir, '.vibes');
  const dbPath = path.resolve(
    baseDir,
    env.VIBES_DB_PATH?.trim() || path.join('.vibes', 'vibes.db'),
  );
  const relative = path.relative(vibesDir, dbPath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ConfigError('VIBES_DB_PATH', 'um caminho de arquivo dentro de .vibes/');
  }
  return { dbPath, vibesDir: path.dirname(dbPath) };
}

/** Lê e valida a configuração, sem efeitos além de procurar a raiz e o shell. */
export function loadConfig(env: Env = process.env, cwd: string = process.cwd()): AppConfig {
  const host = readHost('VIBES_HOST', env.VIBES_HOST, '127.0.0.1');
  const repoRoot = findRepoRoot(cwd);
  return {
    port: readPort(env),
    host,
    publicHost: readHost('VIBES_PUBLIC_HOST', env.VIBES_PUBLIC_HOST, null),
    ...readDbPath(env, repoRoot ?? cwd),
    shell: findShell(env),
    repoRoot,
    exposed: host !== '127.0.0.1',
    nodeVersionOk: isNodeVersionOk(),
  };
}
