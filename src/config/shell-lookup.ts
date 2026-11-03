import { existsSync } from 'node:fs';
import path from 'node:path';

export type ShellLookup = { path: string | null; searched: string[] };

export type Env = Record<string, string | undefined>;

function gitBashCandidates(env: Env): string[] {
  const fromInstall = [env.ProgramFiles, env['ProgramFiles(x86)'], env.ProgramW6432]
    .filter((dir): dir is string => Boolean(dir))
    .map((dir) => path.win32.join(dir, 'Git', 'bin', 'bash.exe'));
  const fromUser = env.LOCALAPPDATA
    ? [path.win32.join(env.LOCALAPPDATA, 'Programs', 'Git', 'bin', 'bash.exe')]
    : [];

  // O `git.exe` no PATH aponta para a instalação do Git. Nunca o `bash.exe` solto no PATH, que no
  // Windows pode ser o do WSL.
  const pathEntries = (env.PATH ?? env.Path ?? '').split(path.win32.delimiter).filter(Boolean);
  const fromPath = pathEntries
    .filter((entry) => /[\\/]git[\\/]/i.test(`${entry}\\`))
    .flatMap((entry) => [
      path.win32.join(entry, '..', 'bin', 'bash.exe'),
      path.win32.join(entry, '..', '..', 'bin', 'bash.exe'),
    ]);

  return [...new Set([...fromInstall, ...fromUser, ...fromPath])];
}

/**
 * Escolhe o shell (BR3.1): `VIBES_SHELL`, e depois o `bash.exe` da instalação do Git. Com
 * `VIBES_SHELL` definido, só ele vale. Nunca cai para PowerShell nem `cmd` (BR3.2).
 */
export function findShell(
  env: Env = process.env,
  platform: NodeJS.Platform = process.platform,
  exists: (candidate: string) => boolean = existsSync,
): ShellLookup {
  const configured = env.VIBES_SHELL?.trim();
  if (configured) {
    return { path: exists(configured) ? configured : null, searched: [configured] };
  }

  const candidates =
    platform === 'win32' ? gitBashCandidates(env) : [env.SHELL, '/bin/bash'].filter(isText);
  const found = candidates.find((candidate) => exists(candidate)) ?? null;
  return { path: found, searched: candidates };
}

function isText(value: string | undefined): value is string {
  return Boolean(value);
}
