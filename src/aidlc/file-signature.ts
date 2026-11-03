import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const MAX_ENTRIES = 5000;

export type FileSignature = { signature: string; lastModifiedMs: number };

function statOrNull(filePath: string): { mtimeMs: number; isDirectory: boolean } | null {
  try {
    const stats = statSync(filePath);
    return { mtimeMs: stats.mtimeMs, isDirectory: stats.isDirectory() };
  } catch {
    // O arquivo pode sumir entre listar e ler, e isso já aparece como mudança na assinatura.
    return null;
  }
}

function listDirectory(directory: string): string[] {
  try {
    return readdirSync(directory).map((name) => path.join(directory, name));
  } catch {
    return [];
  }
}

/** Resume as datas e a quantidade de arquivos sob `roots`, sem ler o conteúdo de nenhum. */
export function computeSignature(roots: string[]): FileSignature {
  const queue = [...roots];
  let count = 0;
  let sum = 0;
  let lastModifiedMs = 0;
  while (queue.length > 0 && count < MAX_ENTRIES) {
    const current = queue.pop() as string;
    const stats = statOrNull(current);
    if (!stats) continue;
    if (stats.isDirectory) {
      queue.push(...listDirectory(current));
      continue;
    }
    count += 1;
    sum += stats.mtimeMs;
    lastModifiedMs = Math.max(lastModifiedMs, stats.mtimeMs);
  }
  return { signature: `${count}:${sum}`, lastModifiedMs };
}
