import { existsSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { logger } from './logger';
import { type Env, findShell, type ShellLookup } from './shell-lookup';

export const MINIMUM_NODE = { major: 22, minor: 13 };

export type AppConfig = {
  port: number;
  host: string;
  publicHost: string | null;
  /** `null` sem raiz: o produto não cria nem escreve nada fora de `.vibes/` da raiz (NFR7.3). */
  dbPath: string | null;
  vibesDir: string | null;
  /** Pasta das mídias personalizadas: `vibesDir/media` (BR7.1). */
  mediaDir: string | null;
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

/** Caminho real (resolve junções e nomes curtos) e com a letra do drive em caixa única. */
function canonicalPath(target: string): string {
  let resolved = path.resolve(target);
  try {
    resolved = realpathSync.native(resolved);
  } catch {
    // Pasta que não existe mais: vale o caminho absoluto como está.
  }
  return resolved.replace(/^[a-z]:/, (drive) => drive.toUpperCase());
}

function isDirectory(target: string): boolean {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Sobe a partir de `start` até a pasta mais próxima que contém `aidlc/` (BR1.4). A pasta do próprio
 * produto (`productDir`) só vale como raiz se tiver `.git`: sem ele, é a subpasta copiada para dentro
 * de um projeto, e o `aidlc/` dentro dela não é o do projeto, então a busca continua para cima.
 */
export function findRepoRoot(start: string, productDir: string | null = null): string | null {
  const product = productDir ? canonicalPath(productDir) : null;
  let current = path.resolve(start);
  for (;;) {
    if (isDirectory(path.join(current, 'aidlc'))) {
      const isProduct = product !== null && canonicalPath(current) === product;
      if (!isProduct || existsSync(path.join(current, '.git'))) return current;
    }
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

/**
 * Lê e valida a configuração, sem efeitos além de procurar a raiz e o shell. Sem raiz, nada do
 * armazenamento existe: `dbPath`, `vibesDir` e `mediaDir` ficam nulos (NFR7.3).
 */
export function loadConfig(env: Env = process.env, cwd: string = process.cwd()): AppConfig {
  const host = readHost('VIBES_HOST', env.VIBES_HOST, '127.0.0.1');
  const repoRoot = findRepoRoot(cwd, env.VIBES_PRODUCT_DIR?.trim() || null);
  let paths: { dbPath: string; vibesDir: string } | null = null;
  if (repoRoot) {
    paths = readDbPath(env, repoRoot);
  } else if (env.VIBES_DB_PATH?.trim()) {
    logger.warn(
      'config',
      'VIBES_DB_PATH foi ignorada: sem o AI-DLC no projeto não há onde guardar o banco.',
    );
  }
  return {
    port: readPort(env),
    host,
    publicHost: readHost('VIBES_PUBLIC_HOST', env.VIBES_PUBLIC_HOST, null),
    dbPath: paths?.dbPath ?? null,
    vibesDir: paths?.vibesDir ?? null,
    mediaDir: paths ? path.join(paths.vibesDir, 'media') : null,
    shell: findShell(env),
    repoRoot,
    exposed: host !== '127.0.0.1',
    nodeVersionOk: isNodeVersionOk(),
  };
}
