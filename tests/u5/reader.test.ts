import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { AidlcReader } from '@/aidlc/reader';
import { createAidlcRepo } from '../u1/aidlc-fixture';

describe('AidlcReader.close', () => {
  it('para o vigia e solta as assinaturas: depois de fechar, nada mais é avisado', async () => {
    const repo = createAidlcRepo();
    const reader = new AidlcReader(repo.root, Date.now, { pollIntervalMs: 30, debounceMs: 5 });
    const listener = vi.fn();
    reader.subscribe(listener);
    await new Promise((resolve) => setTimeout(resolve, 80));

    reader.close();
    writeFileSync(path.join(repo.root, 'aidlc', 'active-space'), 'default\n# mudou\n');
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(listener).not.toHaveBeenCalled();
  });

  it('fechar duas vezes e cancelar a assinatura depois de fechar não dá erro', () => {
    const reader = new AidlcReader(createAidlcRepo().root);
    const stop = reader.subscribe(() => {});
    reader.close();
    expect(() => reader.close()).not.toThrow();
    expect(() => stop()).not.toThrow();
  });

  it('um leitor sem raiz fecha sem vigia e continua devolvendo a falha', () => {
    const reader = new AidlcReader(null);
    reader.subscribe(() => {});
    reader.close();
    expect(reader.readActive()).toMatchObject({ kind: 'failure', health: 'missing_aidlc' });
  });

  it('depois de fechar, uma nova assinatura volta a vigiar', async () => {
    const repo = createAidlcRepo();
    const reader = new AidlcReader(repo.root, Date.now, { pollIntervalMs: 30, debounceMs: 5 });
    reader.subscribe(() => {});
    reader.close();
    const listener = vi.fn();
    const stop = reader.subscribe(listener);
    await new Promise((resolve) => setTimeout(resolve, 80));
    writeFileSync(path.join(repo.root, 'aidlc', 'active-space'), 'default\n# de novo\n');
    await vi.waitFor(() => expect(listener).toHaveBeenCalled(), { timeout: 3000 });
    stop();
    reader.close();
  });
});
