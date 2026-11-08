import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

/** Limite de leitura de BR4.3. */
export const MAX_ARTIFACT_BYTES = 2 * 1024 * 1024;
const MAX_LISTED_FILES = 500;
const BINARY_PROBE_BYTES = 8192;
const UNIT_DIRECTORY = /^u\d+-/;

export type ArtifactItem = { path: string; name: string };

export type ArtifactContent = {
  path: string;
  size: number;
  /** `null` quando o arquivo não é mostrado, com o motivo em `omittedReason`. */
  content: string | null;
  omittedReason: 'too_large' | 'binary' | null;
};

function isListedFile(name: string): boolean {
  return (
    name !== 'memory.md' &&
    name !== 'traceability.json' &&
    !name.endsWith('-questions.md') &&
    !name.startsWith('.aidlc')
  );
}

function toRecordPath(recordDir: string, absolute: string): string {
  return path.relative(recordDir, absolute).split(path.sep).join('/');
}

async function readDirectoryOrEmpty(directory: string) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch (error) {
    // Uma etapa sem pasta só não tem artefatos. Pastas somem durante a gravação, e isso não é erro.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/** Arquivos da pasta da etapa, sem o que é do próprio AI-DLC (`functional-spec.md`). */
async function collectFiles(directory: string, found: string[]): Promise<void> {
  const entries = await readDirectoryOrEmpty(directory);
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (found.length >= MAX_LISTED_FILES) return;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'reviews') await collectFiles(full, found);
    } else if (entry.isFile() && isListedFile(entry.name)) {
      found.push(full);
    }
  }
}

export type ArtifactScope = {
  /** Lê a pasta desta Unidade, em `<fase>/<unidade>/<etapa>/`. */
  unit?: string;
  /** Consulta na trilha: junta a pasta da etapa e as de todas as Unidades. */
  includeUnits?: boolean;
};

async function stageDirectories(
  recordDir: string,
  phase: string,
  stageSlug: string,
  scope: ArtifactScope,
): Promise<string[]> {
  const phaseDir = path.join(recordDir, phase);
  if (scope.unit) return [path.join(phaseDir, scope.unit, stageSlug)];
  const stageDir = path.join(phaseDir, stageSlug);
  if (!scope.includeUnits) return [stageDir];
  const units = (await readDirectoryOrEmpty(phaseDir))
    .filter((entry) => entry.isDirectory() && UNIT_DIRECTORY.test(entry.name))
    .map((entry) => path.join(phaseDir, entry.name, stageSlug));
  return [stageDir, ...units];
}

export async function listArtifactPaths(
  recordDir: string,
  phase: string,
  stageSlug: string,
  scope: ArtifactScope = {},
): Promise<string[]> {
  const found: string[] = [];
  const root = await realpath(recordDir);
  for (const directory of await stageDirectories(recordDir, phase, stageSlug, scope)) {
    try {
      if (!isInside(root, await realpath(directory))) continue;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    await collectFiles(directory, found);
  }
  return found;
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export type ResolvedArtifact = { absolute: string; recordPath: string };

/**
 * Junta o caminho ao registro, resolve `..` e links e recusa o que sair dele (BR4.3, NFR5.4).
 * Devolve `null` para caminho de fora, absoluto ou inexistente: a rota responde 404 nos três.
 */
export async function resolveArtifactPath(
  recordDir: string,
  relativePath: string,
): Promise<ResolvedArtifact | null> {
  if (relativePath.includes('\0')) return null;
  if (path.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) return null;
  try {
    const root = await realpath(recordDir);
    const absolute = await realpath(path.join(root, relativePath));
    if (!isInside(root, absolute)) return null;
    if (!(await stat(absolute)).isFile()) return null;
    return { absolute, recordPath: toRecordPath(root, absolute) };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return null;
    throw error;
  }
}

/** Lê como texto até 2 MB. Acima disso, ou com conteúdo binário, devolve só o caminho e o motivo. */
export async function readArtifactFile(resolved: ResolvedArtifact): Promise<ArtifactContent> {
  const { absolute, recordPath } = resolved;
  const { size } = await stat(absolute);
  if (size > MAX_ARTIFACT_BYTES) {
    return { path: recordPath, size, content: null, omittedReason: 'too_large' };
  }
  const buffer = await readFile(absolute);
  if (buffer.subarray(0, BINARY_PROBE_BYTES).includes(0)) {
    return { path: recordPath, size, content: null, omittedReason: 'binary' };
  }
  return {
    path: recordPath,
    size,
    content: buffer.toString('utf8'),
    omittedReason: null,
  };
}

/** Metadados do arquivo listado, sem ler seu conteúdo. */
export async function toArtifactItem(recordDir: string, absolute: string): Promise<ArtifactItem> {
  return {
    path: toRecordPath(recordDir, absolute),
    name: path.basename(absolute),
  };
}
