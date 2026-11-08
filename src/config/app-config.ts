import path from 'node:path';
import { homedir } from 'node:os';
import { z } from 'zod';
import { type Env, findShell, type ShellLookup } from './shell-lookup';

export const MINIMUM_NODE = { major: 22, minor: 13 };
export type AppConfig = {
  port: number;
  host: string;
  publicHost: string | null;
  dbPath: string;
  vibesDir: string;
  mediaDir: string;
  shell: ShellLookup;
  repoRoot: string | null;
  exposed: boolean;
  nodeVersionOk: boolean;
};

export class ConfigError extends Error {
  constructor(
    readonly key: string,
    expected: string,
  ) {
    super(`A variável ${key} é inválida. Esperado: ${expected}.`);
    this.name = 'ConfigError';
  }
}
export function isNodeVersionOk(version = process.versions.node): boolean {
  const [major = 0, minor = 0] = version.split('.').map(Number);
  return (
    major > MINIMUM_NODE.major || (major === MINIMUM_NODE.major && minor >= MINIMUM_NODE.minor)
  );
}
export function nodeVersionMessage(version = process.versions.node): string {
  return `O Vibes DLC exige Node.js 22.13 ou superior, e este é o ${version}.`;
}

/** Configuração do produto, independente do projeto selecionado. */
export function loadConfig(env: Env = process.env): AppConfig {
  const port = z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .safeParse(env.PORT || 3000);
  if (!port.success) throw new ConfigError('PORT', 'um inteiro entre 1 e 65535');
  const readHost = (key: string, fallback: string | null) => {
    const value = env[key]?.trim() || fallback;
    if (value && !/^[^\s/\\]+$/.test(value))
      throw new ConfigError(key, 'um endereço sem espaços nem barras');
    return value;
  };
  const host = readHost('VIBES_HOST', '127.0.0.1')!;
  const base =
    process.platform === 'win32'
      ? env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local')
      : process.platform === 'darwin'
        ? path.join(homedir(), 'Library', 'Application Support')
        : env.XDG_DATA_HOME || path.join(homedir(), '.local', 'share');
  const dataDir = env.VIBES_DATA_DIR?.trim() || path.join(base, 'vibes-dlc');
  if (!path.isAbsolute(dataDir)) throw new ConfigError('VIBES_DATA_DIR', 'um caminho absoluto');
  return {
    port: port.data,
    host,
    publicHost: readHost('VIBES_PUBLIC_HOST', null),
    dbPath: path.join(dataDir, 'preferences.db'),
    vibesDir: dataDir,
    mediaDir: path.join(dataDir, 'media'),
    shell: findShell(env),
    repoRoot: null,
    exposed: host !== '127.0.0.1',
    nodeVersionOk: isNodeVersionOk(),
  };
}
