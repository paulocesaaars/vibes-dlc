import path from 'node:path';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import type { Database } from '@/db/database';
import { GuideProgressRepo } from '@/db/guide-progress-repo';
import { type NewSentCommand, SentCommandRepo } from '@/db/sent-command-repo';
import { prepareStorage } from '@/db/storage';
import { tempDir } from './helpers';

const command = (overrides: Partial<NewSentCommand> = {}): NewSentCommand => ({
  commandId: 'c1',
  intentId: 'intent-a',
  stageSlug: 'functional-design',
  text: '/aidlc',
  mode: 'execute',
  ...overrides,
});

describe('repositórios', () => {
  let dbPath: string;
  let db: Database;
  let commands: SentCommandRepo;
  let progress: GuideProgressRepo;

  beforeEach(() => {
    dbPath = path.join(tempDir(), 'vibes.db');
    db = prepareStorage(dbPath);
    commands = new SentCommandRepo(db);
    progress = new GuideProgressRepo(db);
  });

  afterEach(() => db.close());

  it('grava pending e passa a written com a data', () => {
    expect(commands.insertPending(command())).toBe(true);
    expect(commands.find('c1')?.status).toBe('pending');

    commands.markWritten('c1', 1234);
    expect(commands.find('c1')).toMatchObject({ status: 'written', writtenAt: 1234 });
  });

  it('passa a failed e não volta depois de um estado final', () => {
    commands.insertPending(command());
    commands.markFailed('c1');
    expect(commands.find('c1')?.status).toBe('failed');

    commands.markWritten('c1', 99);
    expect(commands.find('c1')).toMatchObject({ status: 'failed', writtenAt: null });
  });

  it('um commandId repetido não grava de novo nem muda o texto', () => {
    commands.insertPending(command());
    commands.markWritten('c1', 1);
    expect(commands.insertPending(command({ text: 'outro' }))).toBe(false);
    expect(commands.find('c1')).toMatchObject({ text: '/aidlc', status: 'written' });
  });

  it('só considera written em lastWritten, por etapa, e pega o mais recente', () => {
    commands.insertPending(command({ commandId: 'pendente' }));
    expect(commands.lastWritten('intent-a', 'functional-design')).toBeNull();

    commands.insertPending(command({ commandId: 'velho', mode: 'paste' }));
    commands.markWritten('velho', 100);
    commands.insertPending(command({ commandId: 'novo', mode: 'execute' }));
    commands.markWritten('novo', 200);
    commands.insertPending(command({ commandId: 'outra', stageSlug: 'nfr-design' }));
    commands.markWritten('outra', 300);

    expect(commands.lastWritten('intent-a', 'functional-design')?.commandId).toBe('novo');
    expect(commands.lastWritten('intent-b', 'functional-design')).toBeNull();
  });

  it('marca como failed no início o que ficou em pending', () => {
    commands.insertPending(command({ commandId: 'interrompido' }));
    commands.insertPending(command({ commandId: 'concluido' }));
    commands.markWritten('concluido', 10);
    db.close();

    db = prepareStorage(dbPath);
    commands = new SentCommandRepo(db);
    expect(commands.find('interrompido')?.status).toBe('failed');
    expect(commands.find('concluido')?.status).toBe('written');
  });

  it('recusa um modo fora do contrato', () => {
    expect(() =>
      commands.insertPending(command({ mode: 'outro' as unknown as NewSentCommand['mode'] })),
    ).toThrow();
  });

  it('grava o progresso uma vez e mantém a primeira data', () => {
    expect(progress.find('intent-a', 's')).toBeNull();
    progress.markUnderstood('intent-a', 's', '2026-01-01T00:00:00.000Z');
    progress.markUnderstood('intent-a', 's', '2027-01-01T00:00:00.000Z');
    expect(progress.find('intent-a', 's')).toEqual({
      intentId: 'intent-a',
      stageSlug: 's',
      currentStep: 'send',
      understoodAt: '2026-01-01T00:00:00.000Z',
      conclusionSeenAt: null,
    });
  });

  it('passa a acompanhar sem perder a data de entendimento', () => {
    progress.markUnderstood('intent-a', 's', '2026-01-01T00:00:00.000Z');
    progress.markFollowing('intent-a', 's');
    progress.markUnderstood('intent-a', 's');
    expect(progress.find('intent-a', 's')).toMatchObject({
      currentStep: 'follow',
      understoodAt: '2026-01-01T00:00:00.000Z',
    });

    progress.markFollowing('intent-a', 'sem-entender');
    expect(progress.find('intent-a', 'sem-entender')).toMatchObject({
      currentStep: 'follow',
      understoodAt: null,
    });
  });

  it('separa o progresso por etapa e por demanda', () => {
    progress.markUnderstood('intent-a', 's1');
    expect(progress.find('intent-a', 's2')).toBeNull();
    expect(progress.find('intent-b', 's1')).toBeNull();
  });
});
