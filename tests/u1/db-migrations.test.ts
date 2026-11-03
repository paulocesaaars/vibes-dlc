import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { Database } from '@/db/database';
import { applyMigrations, listMigrations, MigrationError } from '@/db/migrations';
import { prepareStorage, StorageError } from '@/db/storage';
import { tempDir } from './helpers';

function migrationsDir(files: Record<string, string>): string {
  const dir = tempDir();
  for (const [name, sql] of Object.entries(files)) writeFileSync(path.join(dir, name), sql);
  return dir;
}

describe('migrações', () => {
  it('cria .vibes/ e o banco quando a pasta não existe', () => {
    const dbPath = path.join(tempDir(), 'novo', '.vibes', 'vibes.db');
    const db = prepareStorage(dbPath);
    expect(existsSync(dbPath)).toBe(true);
    const tables = db
      .all<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table'`)
      .map((t) => t.name);
    expect(tables).toEqual(expect.arrayContaining(['guide_progress', 'sent_command']));
    db.close();
  });

  it('não reaplica migrações e mantém os dados ao reabrir', () => {
    const dbPath = path.join(tempDir(), 'vibes.db');
    const first = prepareStorage(dbPath);
    first.run(
      `INSERT INTO guide_progress (intent_id, stage_slug, current_step) VALUES ('i', 's', 'send')`,
    );
    first.close();

    const second = prepareStorage(dbPath);
    expect(second.all('SELECT * FROM guide_progress')).toHaveLength(1);
    expect(second.all('SELECT * FROM schema_migrations')).toHaveLength(1);
    second.close();
  });

  it('aplica em ordem numérica e ignora arquivos fora do padrão', () => {
    const dir = migrationsDir({
      '0002_b.sql': 'CREATE TABLE b (x TEXT);',
      '0001_a.sql': 'CREATE TABLE a (x TEXT);',
      'notas.txt': 'não é migração',
      'sem-numero.sql': 'CREATE TABLE nunca (x TEXT);',
    });
    expect(listMigrations(dir).map((m) => m.file)).toEqual(['0001_a.sql', '0002_b.sql']);

    const dbPath = path.join(tempDir(), 'vibes.db');
    const db = new Database(dbPath);
    expect(applyMigrations(db, dbPath, dir)).toBe(2);
    expect(applyMigrations(db, dbPath, dir)).toBe(0);
    db.close();
  });

  it('copia o banco antes de migrar quando já existem migrações aplicadas', () => {
    const dir = migrationsDir({ '0001_a.sql': 'CREATE TABLE a (x TEXT);' });
    const dbPath = path.join(tempDir(), 'vibes.db');
    const first = new Database(dbPath);
    applyMigrations(first, dbPath, dir);
    first.run(`INSERT INTO a VALUES ('anterior')`);
    first.close();

    writeFileSync(path.join(dir, '0002_b.sql'), 'CREATE TABLE b (x TEXT);');
    const second = new Database(dbPath);
    applyMigrations(second, dbPath, dir);
    second.close();

    const backupPath = `${dbPath}.before-0002.bak`;
    expect(existsSync(backupPath)).toBe(true);
    const backup = new Database(backupPath);
    expect(backup.all('SELECT * FROM a')).toEqual([{ x: 'anterior' }]);
    expect(backup.all(`SELECT name FROM sqlite_master WHERE name = 'b'`)).toEqual([]);
    backup.close();
  });

  it('interrompe na migração com falha, desfaz a transação e mantém a cópia', () => {
    const dir = migrationsDir({ '0001_a.sql': 'CREATE TABLE a (x TEXT);' });
    const dbPath = path.join(tempDir(), 'vibes.db');
    const first = new Database(dbPath);
    applyMigrations(first, dbPath, dir);
    first.close();

    writeFileSync(path.join(dir, '0002_ruim.sql'), 'CREATE TABLE ok (x TEXT); ISTO NAO E SQL;');
    const second = new Database(dbPath);
    let failure: unknown;
    try {
      applyMigrations(second, dbPath, dir);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(MigrationError);
    expect((failure as MigrationError).file).toBe('0002_ruim.sql');
    expect((failure as MigrationError).message).toContain('0002_ruim.sql');
    expect((failure as MigrationError).backupPath).toBe(`${dbPath}.before-0002.bak`);
    expect(second.all(`SELECT name FROM sqlite_master WHERE name = 'ok'`)).toEqual([]);
    second.close();
  });

  it('mostra o caminho e o motivo quando não consegue criar .vibes/', () => {
    const root = tempDir();
    const blocker = path.join(root, 'arquivo');
    writeFileSync(blocker, 'um arquivo no lugar da pasta');
    expect(() => prepareStorage(path.join(blocker, 'vibes.db'))).toThrow(StorageError);
    expect(() => prepareStorage(path.join(blocker, 'vibes.db'))).toThrow(blocker);
  });

  it('não tem coluna para a saída do terminal no esquema', () => {
    const sql = readFileSync(path.join(process.cwd(), 'migrations', '0001_u1.sql'), 'utf8');
    expect(sql).not.toMatch(/output|saida/i);
  });
});
