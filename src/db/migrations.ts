import { copyFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { Database } from './database';

const MIGRATION_FILE = /^(\d{4})_[a-z0-9_-]+\.sql$/;

export type Migration = { version: number; file: string };

/** Uma migração falhou: o início é interrompido, e a cópia do banco fica guardada (NFR12.2). */
export class MigrationError extends Error {
  constructor(
    readonly file: string,
    readonly reason: string,
    readonly backupPath: string | null,
  ) {
    const backup = backupPath ? ` A cópia do banco está em ${backupPath}.` : '';
    super(`A migração ${file} falhou: ${reason}.${backup}`);
    this.name = 'MigrationError';
  }
}

export function listMigrations(migrationsDir: string): Migration[] {
  return readdirSync(migrationsDir)
    .map((file) => ({ file, match: MIGRATION_FILE.exec(file) }))
    .filter((entry) => entry.match !== null)
    .map((entry) => ({ version: Number(entry.match?.[1]), file: entry.file }))
    .sort((a, b) => a.version - b.version);
}

function appliedVersions(db: Database): Set<number> {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    file TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);
  const rows = db.all<{ version: number }>('SELECT version FROM schema_migrations');
  return new Set(rows.map((row) => row.version));
}

function backupDatabase(db: Database, dbPath: string, version: number): string {
  // Traz o que está no WAL para o arquivo principal, para a cópia sair completa.
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  const backupPath = `${dbPath}.before-${String(version).padStart(4, '0')}.bak`;
  copyFileSync(dbPath, backupPath);
  return backupPath;
}

function applyMigration(db: Database, migrationsDir: string, migration: Migration): void {
  const sql = readFileSync(path.join(migrationsDir, migration.file), 'utf8');
  db.transaction(() => {
    db.exec(sql);
    db.run('INSERT INTO schema_migrations (version, file, applied_at) VALUES (?, ?, ?)', [
      migration.version,
      migration.file,
      new Date().toISOString(),
    ]);
  });
}

/**
 * Aplica as migrações pendentes em ordem, cada uma em uma transação. As migrações só avançam, e o
 * banco que já tinha dados é copiado antes da primeira pendente (BR6.1).
 */
export function applyMigrations(db: Database, dbPath: string, migrationsDir: string): number {
  const hadData = existsSync(dbPath) && statSync(dbPath).size > 0;
  const applied = appliedVersions(db);
  const pending = listMigrations(migrationsDir).filter((m) => !applied.has(m.version));
  const first = pending[0];
  if (!first) return 0;

  const hadPreviousMigrations = hadData && applied.size > 0;
  const backupPath = hadPreviousMigrations ? backupDatabase(db, dbPath, first.version) : null;
  for (const migration of pending) {
    try {
      applyMigration(db, migrationsDir, migration);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new MigrationError(migration.file, reason, backupPath);
    }
  }
  return pending.length;
}
