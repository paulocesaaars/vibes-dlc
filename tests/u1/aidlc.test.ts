import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChangeWatcher } from '@/aidlc/change-watcher';
import { computeSignature } from '@/aidlc/file-signature';
import { parseState, StateParseError } from '@/aidlc/parse-state';
import { isSafeName } from '@/aidlc/paths';
import { AidlcReader } from '@/aidlc/reader';
import { logger } from '@/config/logger';
import { createAidlcRepo, INTENT_ID, REAL_STATE, withMark } from './aidlc-fixture';
import { tempDir } from './helpers';

function detailOf(reader: AidlcReader) {
  const read = reader.readActive();
  if (read.kind !== 'ok') throw new Error(`leitura inesperada: ${JSON.stringify(read)}`);
  return read.detail;
}

describe('leitura de aidlc-state.md real', () => {
  it('traduz o exemplo real deste intent', () => {
    const parsed = parseState(REAL_STATE);
    expect(parsed.scope).toBe('mvp');
    expect(parsed.currentStage).toBe('functional-design');
    expect(parsed.project).toContain('Vibes DLC');
    expect(parsed.stages.find((s) => s.slug === 'intent-capture')?.mark).toBe('approved');
    expect(parsed.stages.find((s) => s.slug === 'functional-design')?.mark).toBe('in_progress');
    expect(parsed.stages.find((s) => s.slug === 'nfr-design')?.mark).toBe('pending');
  });

  it('trata a etapa fora do plano como pulada', () => {
    const market = parseState(REAL_STATE).stages.find((s) => s.slug === 'market-research');
    expect(market).toEqual({ slug: 'market-research', mark: 'skipped', planned: 'skip' });
  });

  it.each([
    ['?', 'awaiting_approval'],
    ['R', 'revising'],
    ['x', 'approved'],
    ['S', 'skipped'],
    ['Z', 'unknown'],
  ])('lê a marca [%s] como %s', (mark, expected) => {
    const parsed = parseState(withMark(REAL_STATE, 'functional-design', mark));
    expect(parsed.stages.find((s) => s.slug === 'functional-design')?.mark).toBe(expected);
  });

  it('recusa arquivo incompleto', () => {
    expect(() => parseState('# AI-DLC State Tracking\n')).toThrow(StateParseError);
    const withoutCurrent = REAL_STATE.replace(/^- \*\*Current Stage\*\*.*$/m, '');
    expect(() => parseState(withoutCurrent)).toThrow(/Current Stage/);
  });

  it('um Current Stage fora da lista vira nulo', () => {
    const state = REAL_STATE.replace(
      /^- \*\*Current Stage\*\*.*$/m,
      '- **Current Stage**: etapa-nova',
    );
    expect(parseState(state).currentStage).toBeNull();
  });
});

describe('AidlcReader', () => {
  it('lê a demanda ativa com etapas e fases dos arquivos, sem número fixo', () => {
    const repo = createAidlcRepo();
    const detail = detailOf(new AidlcReader(repo.root));
    expect(detail.summary).toMatchObject({ intentId: INTENT_ID, isActive: true, scope: 'mvp' });
    expect(detail.currentStage).toMatchObject({
      stageSlug: 'functional-design',
      phase: 'construction',
      number: '3.1',
      mark: 'in_progress',
    });
    expect(detail.phases.map((phase) => phase.name)).toEqual([
      'initialization',
      'ideation',
      'inception',
      'construction',
      'operation',
    ]);
    expect(detail.hasNextStage).toBe(true);
  });

  it('funciona em caminho com espaços e acentos', () => {
    const repo = createAidlcRepo('Código do João');
    expect(new AidlcReader(repo.root).readActive().kind).toBe('ok');
  });

  it('informa missing_aidlc sem raiz ou sem a pasta', () => {
    expect(new AidlcReader(null).readActive()).toMatchObject({
      kind: 'failure',
      health: 'missing_aidlc',
    });
    expect(new AidlcReader(tempDir()).readActive()).toMatchObject({ health: 'missing_aidlc' });
  });

  it('sem intent ativo, não há retrato', () => {
    const repo = createAidlcRepo();
    rmSync(path.join(repo.intentsDir, 'active-intent'));
    expect(new AidlcReader(repo.root).readActive()).toEqual({ kind: 'no_active_intent' });
  });

  it('um cursor que tenta sair da pasta conta como nenhum', () => {
    const repo = createAidlcRepo();
    writeFileSync(path.join(repo.intentsDir, 'active-intent'), '../../../segredo');
    expect(new AidlcReader(repo.root).readActive()).toEqual({ kind: 'no_active_intent' });
    expect(isSafeName('..')).toBe(false);
    expect(new AidlcReader(repo.root).readDemand('../fora')).toMatchObject({
      kind: 'failure',
      health: 'unreadable_record',
    });
  });

  it('informa o arquivo quando o registro falha sem leitura anterior', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const repo = createAidlcRepo();
    writeFileSync(repo.statePath, 'pela metade');
    expect(new AidlcReader(repo.root).readActive()).toEqual({
      kind: 'failure',
      health: 'unreadable_record',
      failedPath: repo.statePath,
    });
    expect(warn).toHaveBeenCalledWith('aidlc', expect.stringContaining(repo.statePath));
    warn.mockRestore();
  });

  it('informa o grafo quando ele falha', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const repo = createAidlcRepo();
    const graphPath = path.join(repo.root, '.claude', 'tools', 'data', 'stage-graph.json');
    writeFileSync(graphPath, '{ quebrado');
    expect(new AidlcReader(repo.root).readActive()).toMatchObject({
      health: 'unreadable_record',
      failedPath: graphPath,
    });
    warn.mockRestore();
  });

  it('mantém a última leitura válida por 10 segundos e depois mostra a falha', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const repo = createAidlcRepo();
    let now = 1_000;
    const reader = new AidlcReader(repo.root, () => now);
    expect(reader.readActive().kind).toBe('ok');

    writeFileSync(repo.statePath, 'pela metade');
    expect(reader.readActive()).toMatchObject({ kind: 'ok', stale: true });
    now += 9_000;
    expect(reader.readActive()).toMatchObject({ kind: 'ok', stale: true });
    now += 1_000;
    expect(reader.readActive()).toMatchObject({ kind: 'failure', health: 'unreadable_record' });

    writeFileSync(repo.statePath, REAL_STATE);
    expect(reader.readActive()).toMatchObject({ kind: 'ok', stale: false });
    warn.mockRestore();
  });

  it('lista as demandas e marca a ilegível sem interromper', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const repo = createAidlcRepo();
    mkdirSync(path.join(repo.intentsDir, 'quebrada'));
    const demands = new AidlcReader(repo.root).listDemands();
    expect(demands.map((d) => [d.intentId, d.readable, d.isActive])).toEqual([
      [INTENT_ID, true, true],
      ['quebrada', false, false],
    ]);
    expect(new AidlcReader(null).listDemands()).toEqual([]);
    warn.mockRestore();
  });

  it('monta o comando da etapa', () => {
    expect(new AidlcReader(null).buildStageCommand()).toBe('/aidlc');
  });

  it('avisa quando um arquivo do intent ativo muda, e para sem ouvintes', async () => {
    const repo = createAidlcRepo();
    const reader = new AidlcReader(repo.root, Date.now, { pollIntervalMs: 50, debounceMs: 10 });
    const listener = vi.fn();
    const unsubscribe = reader.subscribe(listener);

    writeFileSync(path.join(repo.recordDir, 'artefato.md'), 'novo');
    await vi.waitFor(() => expect(listener).toHaveBeenCalledWith(INTENT_ID), { timeout: 3000 });

    unsubscribe();
    listener.mockClear();
    writeFileSync(path.join(repo.recordDir, 'outro.md'), 'novo');
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(listener).not.toHaveBeenCalled();
  });

  it('não reage a arquivos de outro intent', async () => {
    const repo = createAidlcRepo();
    const other = path.join(repo.intentsDir, 'outra-demanda');
    mkdirSync(other);
    const reader = new AidlcReader(repo.root, Date.now, { pollIntervalMs: 50, debounceMs: 10 });
    const listener = vi.fn();
    const unsubscribe = reader.subscribe(listener);

    writeFileSync(path.join(other, 'a.md'), 'x');
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('ChangeWatcher e assinatura', () => {
  let watcher: ChangeWatcher | null = null;
  afterEach(() => watcher?.stop());

  it('a assinatura muda com arquivo novo e ignora raiz inexistente', () => {
    const dir = tempDir();
    const before = computeSignature([dir, path.join(dir, 'nada')]);
    writeFileSync(path.join(dir, 'a.txt'), 'a');
    const after = computeSignature([dir, path.join(dir, 'nada')]);
    expect(after.signature).not.toBe(before.signature);
    expect(after.lastModifiedMs).toBeGreaterThan(0);
  });

  it('confere as datas como reserva e agrupa várias mudanças em um aviso', async () => {
    let signature = 'a';
    const onChange = vi.fn();
    watcher = new ChangeWatcher({
      watchDir: path.join(tempDir(), 'nao-existe'),
      readSignature: () => signature,
      onChange,
      pollIntervalMs: 10,
      debounceMs: 80,
    });
    watcher.start();
    signature = 'b';
    await new Promise((resolve) => setTimeout(resolve, 30));
    signature = 'c';
    await vi.waitFor(() => expect(onChange).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });

  it('sem mudança na assinatura, não avisa', async () => {
    const onChange = vi.fn();
    const dir = tempDir();
    watcher = new ChangeWatcher({
      watchDir: dir,
      readSignature: () => 'fixa',
      onChange,
      pollIntervalMs: 10,
      debounceMs: 5,
    });
    watcher.start();
    writeFileSync(path.join(dir, 'x'), 'x');
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(onChange).not.toHaveBeenCalled();
  });
});
