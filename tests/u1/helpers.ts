import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';

const created: string[] = [];

/** Cria uma pasta temporária removida ao fim do teste. */
export function tempDir(prefix = 'vibes-test-'): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  created.push(dir);
  return dir;
}

export function ensureDir(dir: string): string {
  mkdirSync(dir, { recursive: true });
  return dir;
}

afterEach(() => {
  for (const dir of created.splice(0)) {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch {
      // No Windows, um shell recém-encerrado ainda segura a pasta por um instante. É pasta temporária.
    }
  }
});
