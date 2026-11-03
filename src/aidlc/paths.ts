import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Nome seguro de espaço ou intent: letras, números e hífens, sem sair da pasta (C2). */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isSafeName(name: string): boolean {
  return SAFE_NAME.test(name) && !name.includes('..');
}

function readCursor(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  const value = readFileSync(filePath, 'utf8').trim();
  return value || null;
}

export type AidlcPaths = {
  aidlcDir: string;
  graphPath: string;
  space: string;
  spaceDir: string;
  intentsDir: string;
  activeSpaceCursor: string;
  activeIntentCursor: string;
};

/** Resolve os caminhos a partir do cursor `aidlc/active-space`, com `default` como padrão. */
export function resolveAidlcPaths(repoRoot: string): AidlcPaths {
  const aidlcDir = path.join(repoRoot, 'aidlc');
  const activeSpaceCursor = path.join(aidlcDir, 'active-space');
  const cursor = readCursor(activeSpaceCursor);
  const space = cursor && isSafeName(cursor) ? cursor : 'default';
  const spaceDir = path.join(aidlcDir, 'spaces', space);
  const intentsDir = path.join(spaceDir, 'intents');
  return {
    aidlcDir,
    graphPath: path.join(repoRoot, '.claude', 'tools', 'data', 'stage-graph.json'),
    space,
    spaceDir,
    intentsDir,
    activeSpaceCursor,
    activeIntentCursor: path.join(intentsDir, 'active-intent'),
  };
}

/** Lê o intent ativo. Um valor que tente sair da pasta conta como nenhum. */
export function readActiveIntent(paths: AidlcPaths): string | null {
  const cursor = readCursor(paths.activeIntentCursor);
  return cursor && isSafeName(cursor) ? cursor : null;
}
