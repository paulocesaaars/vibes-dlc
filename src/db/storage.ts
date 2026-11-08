import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { Database } from './database';
import { applyMigrations } from './migrations';

export const DEFAULT_MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

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

export function prepareStorage(
  dbPath: string,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): Database {
  const directory = path.dirname(dbPath);
  try {
    // O banco de preferências existe independentemente de haver um projeto selecionado.
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
  } catch (error) {
    db.close();
    throw error;
  }
  return db;
}
