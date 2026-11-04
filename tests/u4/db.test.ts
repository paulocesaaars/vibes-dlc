import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { Database } from '@/db/database';
import { CustomizationItemRepo, type CustomizationRow } from '@/db/customization-item-repo';
import { applyMigrations } from '@/db/migrations';
import { prepareStorage } from '@/db/storage';
import { CUSTOMIZABLE_MOMENTS } from '@/guide/customizable-moments';
import { COLOR_KEYS } from '@/customization/colors';
import { tempDir } from '../u1/helpers';

const dbs: Database[] = [];
afterEach(() => dbs.splice(0).forEach((db) => db.close()));
function open(): Database {
  const db = prepareStorage(path.join(tempDir(), 'vibes.db'));
  dbs.push(db);
  return db;
}
const row = (itemKey: string, kind = 'color', value = '#aabbcc'): CustomizationRow => ({
  itemKey,
  kind,
  value,
  updatedAt: '2026-11-03T00:00:00.000Z',
});

describe('migração U4', () => {
  it('cria customization_item a partir de um banco de U3 com dados, sem tocar nas tabelas anteriores', () => {
    const directory = tempDir();
    const migrations = path.join(directory, 'migrations');
    mkdirSync(migrations);
    for (const file of ['0001_u1.sql', '0002_u2.sql', '0003_u3.sql']) {
      copyFileSync(path.join('migrations', file), path.join(migrations, file));
    }
    const dbPath = path.join(directory, 'vibes.db');
    const old = new Database(dbPath);
    dbs.push(old);
    applyMigrations(old, dbPath, migrations);
    old.run(
      "INSERT INTO sent_command (command_id, intent_id, stage_slug, text, mode, status, sent_at) VALUES ('c', 'i', 's', '/aidlc', 'execute', 'written', 'agora')",
    );
    const before = old.all('SELECT * FROM sent_command');
    copyFileSync(path.join('migrations', '0004_u4.sql'), path.join(migrations, '0004_u4.sql'));
    expect(applyMigrations(old, dbPath, migrations)).toBe(1);
    expect(old.all('SELECT * FROM sent_command')).toEqual(before);
    expect(old.all('SELECT * FROM customization_item')).toEqual([]);
    const tables = old.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
    expect(tables.map((entry) => entry.name)).toContain('customization_item');
  });

  it('recusa chave repetida e kind desconhecido', () => {
    const db = open();
    const insert = (key: string, kind: string) =>
      db.run('INSERT INTO customization_item VALUES (?, ?, ?, ?)', [key, kind, 'v', 'agora']);
    insert('color.brand', 'color');
    expect(() => insert('color.brand', 'color')).toThrow();
    expect(() => insert('x', 'font')).toThrow();
  });
});

describe('repositório de customization_item', () => {
  it('grava, troca, lê e remove uma linha', () => {
    const repo = new CustomizationItemRepo(open());
    repo.upsert(row('color.brand'));
    repo.upsert(row('color.brand', 'color', '#112233'));
    expect(repo.all()).toEqual([row('color.brand', 'color', '#112233')]);
    repo.remove('color.brand');
    repo.remove('nao.existe');
    expect(repo.all()).toEqual([]);
  });

  it('replaceAll troca o conjunto inteiro, inclusive apagando as linhas que sobram', () => {
    const repo = new CustomizationItemRepo(open());
    repo.upsert(row('color.brand'));
    repo.upsert(row('color.text'));
    repo.replaceAll([row('color.text', 'color', '#000000'), row('ai_cli', 'cli', 'other')]);
    expect(
      repo
        .all()
        .map((entry) => entry.itemKey)
        .sort(),
    ).toEqual(['ai_cli', 'color.text']);
  });

  it('replaceAll desfaz tudo quando uma linha falha no meio da transação', () => {
    const repo = new CustomizationItemRepo(open());
    repo.upsert(row('color.brand'));
    expect(() => repo.replaceAll([row('color.text'), row('x', 'invalido')])).toThrow();
    expect(repo.all()).toEqual([row('color.brand')]);
  });

  it('guarda o conjunto completo de 53 linhas sem campo de chave, token, nome ou caminho de CLI', () => {
    const repo = new CustomizationItemRepo(open());
    const editable = CUSTOMIZABLE_MOMENTS.filter((moment) => moment.textEditable);
    const media = JSON.stringify({
      mediaId: '11111111-2222-4333-8444-555555555555',
      contentType: 'image/png',
      sizeBytes: 10,
    });
    const rows = [
      ...COLOR_KEYS.map((key) => row(`color.${key}`)),
      ...editable.flatMap((moment) => [
        row(`say.${moment.momentKey}.title`, 'say', 'Título'),
        row(`say.${moment.momentKey}.text`, 'say', 'Texto'),
      ]),
      ...CUSTOMIZABLE_MOMENTS.map((moment) => row(`media.${moment.momentKey}`, 'media', media)),
      row('ai_cli', 'cli', 'other'),
    ];
    expect(rows).toHaveLength(53);
    repo.replaceAll(rows);
    const stored = repo.all();
    expect(stored).toHaveLength(53);
    for (const entry of stored) {
      expect(Object.keys(entry).sort()).toEqual(['itemKey', 'kind', 'updatedAt', 'value']);
      if (entry.kind === 'media') {
        expect(Object.keys(JSON.parse(entry.value)).sort()).toEqual([
          'contentType',
          'mediaId',
          'sizeBytes',
        ]);
      }
      if (entry.kind === 'cli') expect(['claude_code', 'other']).toContain(entry.value);
      expect(entry.value).not.toMatch(/token|secret|apikey|[a-z]:\\/i);
    }
  });
});

describe('arquitetura U4', () => {
  it('nenhum arquivo de src/db importa de src/customization', () => {
    for (const file of globSync('src/db/**/*.ts')) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/customization\//);
    }
  });

  it('customization não importa node:sqlite nem cliente de rede', () => {
    for (const file of globSync('src/customization/**/*.ts')) {
      const text = readFileSync(file, 'utf8');
      expect(text, file).not.toMatch(/node:sqlite|node:http|node:https|node:net|\bfetch\(/);
    }
  });
});
