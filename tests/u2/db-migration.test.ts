import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Database } from '@/db/database';
import { applyMigrations, MigrationError } from '@/db/migrations';
import { prepareStorage } from '@/db/storage';
import { tempDir } from '../u1/helpers';

const REAL_MIGRATIONS = path.join(process.cwd(), 'migrations');

/** Pasta com só a migração de U1, para montar um banco como o que a pessoa já tem. */
function u1MigrationsDir(): string {
  const dir = path.join(tempDir(), 'migrations');
  mkdirSync(dir);
  copyFileSync(path.join(REAL_MIGRATIONS, '0001_u1.sql'), path.join(dir, '0001_u1.sql'));
  return dir;
}

function createU1Database(): string {
  const dbPath = path.join(tempDir(), 'vibes.db');
  const db = new Database(dbPath);
  applyMigrations(db, dbPath, u1MigrationsDir());
  db.run(
    `INSERT INTO guide_progress (intent_id, stage_slug, current_step) VALUES ('i', 's', 'send')`,
  );
  db.run(
    `INSERT INTO sent_command (command_id, intent_id, stage_slug, text, mode, status, sent_at)
     VALUES ('c1', 'i', 's', '/aidlc', 'execute', 'written', '2026-11-03T00:00:00Z')`,
  );
  db.close();
  return dbPath;
}

function tableNames(db: Database): string[] {
  return db
    .all<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table'`)
    .map((table) => table.name);
}

describe('migração 0002_u2', () => {
  it('parte de um banco de U1 com dados e mantém esses dados', () => {
    const dbPath = createU1Database();
    const db = prepareStorage(dbPath, REAL_MIGRATIONS);
    expect(tableNames(db)).toEqual(
      expect.arrayContaining(['artifact_review', 'demand_seen_state']),
    );
    expect(db.all('SELECT * FROM guide_progress')).toHaveLength(1);
    expect(db.all('SELECT * FROM sent_command')).toHaveLength(1);
    db.close();
  });

  it('copia o banco antes de migrar, e a cópia continua no esquema de U1', () => {
    const dbPath = createU1Database();
    prepareStorage(dbPath, REAL_MIGRATIONS).close();

    const backupPath = `${dbPath}.before-0002.bak`;
    expect(existsSync(backupPath)).toBe(true);
    const backup = new Database(backupPath);
    expect(tableNames(backup)).not.toContain('artifact_review');
    expect(backup.all('SELECT * FROM sent_command')).toHaveLength(1);
    backup.close();
  });

  it('cria a coluna unit em demand_seen_state, vazia por padrão', () => {
    const db = prepareStorage(path.join(tempDir(), 'vibes.db'), REAL_MIGRATIONS);
    db.run(
      `INSERT INTO demand_seen_state (intent_id, stage_slug, mark, seen_at) VALUES ('i', 's', 'x', 't')`,
    );
    expect(db.all('SELECT unit FROM demand_seen_state')).toEqual([{ unit: '' }]);
    db.close();
  });

  it('a chave de artifact_review é composta: outro caminho e outra demanda não colidem', () => {
    const db = prepareStorage(path.join(tempDir(), 'vibes.db'), REAL_MIGRATIONS);
    const insert = (intent: string, file: string) =>
      db.run(
        `INSERT INTO artifact_review (intent_id, artifact_path, content_hash, reviewed_at)
         VALUES (?, ?, 'h', 't')`,
        [intent, file],
      );
    insert('a', 'x.md');
    insert('a', 'y.md');
    insert('b', 'x.md');
    expect(() => insert('a', 'x.md')).toThrow();
    expect(db.all('SELECT * FROM artifact_review')).toHaveLength(3);
    db.close();
  });

  it('não reaplica nem copia de novo ao reabrir', () => {
    const dbPath = createU1Database();
    prepareStorage(dbPath, REAL_MIGRATIONS).close();
    const db = new Database(dbPath);
    expect(applyMigrations(db, dbPath, REAL_MIGRATIONS)).toBe(0);
    db.close();
  });

  it('migração com falha desfaz a transação, mantém os dados e guarda a cópia', () => {
    const dbPath = createU1Database();
    const broken = u1MigrationsDir();
    writeFileSync(
      path.join(broken, '0002_u2.sql'),
      'CREATE TABLE artifact_review (x TEXT); ISTO NAO E SQL;',
    );
    const db = new Database(dbPath);
    let failure: unknown;
    try {
      applyMigrations(db, dbPath, broken);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(MigrationError);
    expect((failure as MigrationError).backupPath).toBe(`${dbPath}.before-0002.bak`);
    expect(tableNames(db)).not.toContain('artifact_review');
    expect(db.all('SELECT * FROM sent_command')).toHaveLength(1);
    db.close();
    expect(existsSync(`${dbPath}.before-0002.bak`)).toBe(true);
  });
});
