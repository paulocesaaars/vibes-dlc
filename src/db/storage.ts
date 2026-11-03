import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { Database } from './database';
import { applyMigrations } from './migrations';
import { SentCommandRepo } from './sent-command-repo';

export const DEFAULT_MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

/** Não foi possível criar `.vibes/` ou abrir o banco: falha fatal, com o caminho e o motivo. */
export class StorageError extends Error {
  constructor(
    readonly targetPath: string,
    reason: string,
  ) {
    super(`Não foi possível preparar ${targetPath}: ${reason}.`);
    this.name = 'StorageError';
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Cria `.vibes/` se faltar, migra e marca como `failed` o que ficou em `pending` de um processo
 * interrompido (BR1.5, BR6.1, NFR12.3). A ordem segue `reliability-design.md`.
 */
export function prepareStorage(
  dbPath: string,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): Database {
  const directory = path.dirname(dbPath);
  try {
    mkdirSync(directory, { recursive: true });
  } catch (error) {
    throw new StorageError(directory, describe(error));
  }

  let db: Database;
  try {
    db = new Database(dbPath);
  } catch (error) {
    throw new StorageError(dbPath, describe(error));
  }

  try {
    applyMigrations(db, dbPath, migrationsDir);
    new SentCommandRepo(db).failInterrupted();
  } catch (error) {
    db.close();
    throw error;
  }
  return db;
}
