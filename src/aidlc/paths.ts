import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
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

/** Descobre o arquivo real instalado; a escolha da IA não define seu caminho. */
function findGraph(repoRoot: string): string {
  const accept = (candidate: string): string => {
    const relative = path.relative(realpathSync.native(repoRoot), realpathSync.native(candidate));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('O grafo do AI-DLC está fora do projeto selecionado.');
    }
    return candidate;
  };
  const preferred = path.join(repoRoot, '.claude', 'tools', 'data', 'stage-graph.json');
  if (existsSync(preferred)) return accept(preferred);
  let visited = 0;
  function search(directory: string, depth: number): string | null {
    if (depth > 6 || visited++ > 2000) return null;
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return null;
    }
    const graph = entries.find((entry) => entry.isFile() && entry.name === 'stage-graph.json');
    if (graph) return path.join(directory, graph.name);
    for (const entry of entries) {
      if (
        !entry.isDirectory() ||
        ['.git', 'node_modules', '.next', '.vibes', 'spaces'].includes(entry.name)
      )
        continue;
      const found = search(path.join(directory, entry.name), depth + 1);
      if (found) return found;
    }
    return null;
  }
  // Somente arquivos de configuração ocultos e a pasta do framework; não vasculha o código do projeto.
  for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || (entry.name !== 'aidlc' && !entry.name.startsWith('.'))) continue;
    if (['.git', '.next', '.vibes'].includes(entry.name)) continue;
    const found = search(path.join(repoRoot, entry.name), 0);
    if (found) return accept(found);
  }
  throw new Error(
    'Arquivo stage-graph.json do AI-DLC não encontrado em suas pastas de configuração.',
  );
}

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
    graphPath: findGraph(repoRoot),
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
