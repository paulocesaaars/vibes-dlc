import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArtifactNoteRepo } from '@/db/artifact-note-repo';
import type { Database } from '@/db/database';
import { SentCommandRepo } from '@/db/sent-command-repo';
import { prepareStorage } from '@/db/storage';
import { tempDir } from '../u1/helpers';

let db: Database;
beforeEach(() => {
  db = prepareStorage(path.join(tempDir(), 'vibes.db'));
});
afterEach(() => db.close());

describe('migração U3', () => {
  it('cria notas e classifica comandos anteriores como stage', () => {
    const tables = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
    expect(tables.map((row) => row.name)).toContain('artifact_note');
    db.run(
      "INSERT INTO sent_command (command_id, intent_id, stage_slug, text, mode, status, sent_at) VALUES ('c', 'i', 's', '/aidlc', 'execute', 'written', 'agora')",
    );
    expect(
      db.all<{ kind: string }>("SELECT kind FROM sent_command WHERE command_id = 'c'"),
    ).toEqual([{ kind: 'stage' }]);
  });
  it('recusa kind desconhecido', () => {
    expect(() =>
      db.run(
        "INSERT INTO sent_command (command_id, intent_id, stage_slug, text, mode, status, sent_at, kind) VALUES ('c', 'i', 's', '/aidlc', 'execute', 'written', 'agora', 'other')",
      ),
    ).toThrow();
  });
  it('recusa nota vazia e maior que o limite', () => {
    const notes = new ArtifactNoteRepo(db);
    const base = { noteId: 'n', intentId: 'i', artifactPath: 'a.md', createdAt: 'agora' };
    expect(() => notes.add({ ...base, text: '' })).toThrow();
    expect(() => notes.add({ ...base, text: 'x'.repeat(4001) })).toThrow();
  });
});

describe('repositórios U3', () => {
  it('persiste notas em ordem recente e separadas por demanda e caminho', () => {
    const notes = new ArtifactNoteRepo(db);
    notes.add({
      noteId: 'n1',
      intentId: 'i',
      artifactPath: 'a.md',
      text: 'primeira',
      createdAt: '2026-01-01',
    });
    notes.add({
      noteId: 'n2',
      intentId: 'i',
      artifactPath: 'a.md',
      text: 'segunda',
      createdAt: '2026-01-02',
    });
    notes.add({
      noteId: 'n3',
      intentId: 'j',
      artifactPath: 'a.md',
      text: 'outra',
      createdAt: '2026-01-03',
    });
    expect(notes.list('i', 'a.md').map((note) => note.noteId)).toEqual(['n2', 'n1']);
    expect(notes.list('i', 'b.md')).toEqual([]);
  });
  it('comandos de nova demanda não mudam lastWritten nem aparecem no histórico', () => {
    const commands = new SentCommandRepo(db);
    for (const [id, kind] of [
      ['stage', 'stage'],
      ['new', 'new_demand'],
      ['activate', 'activate'],
    ] as const) {
      commands.insertPending(
        { commandId: id, intentId: 'i', stageSlug: 's', text: '/aidlc', mode: 'execute', kind },
        id,
      );
      commands.markWritten(id, id === 'stage' ? 1 : id === 'new' ? 2 : 3);
    }
    expect(commands.lastWritten('i', 's')?.commandId).toBe('stage');
    expect(commands.listWritten('i').map((entry) => entry.commandId)).toEqual([
      'activate',
      'stage',
    ]);
  });
  it('comando duplicado não substitui a classificação', () => {
    const commands = new SentCommandRepo(db);
    const data = {
      commandId: 'c',
      intentId: 'i',
      stageSlug: '',
      text: '/aidlc',
      mode: 'paste' as const,
    };
    expect(commands.insertPending({ ...data, kind: 'analysis' })).toBe(true);
    expect(commands.insertPending({ ...data, kind: 'stage' })).toBe(false);
    expect(commands.find('c')?.kind).toBe('analysis');
  });
});
