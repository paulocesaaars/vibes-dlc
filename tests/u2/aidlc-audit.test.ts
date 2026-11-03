import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AidlcReader } from '@/aidlc/reader';
import { readAuditSummary, parseAuditText, summarizeEvents } from '@/aidlc/audit-events';
import { deriveWorkPosition } from '@/aidlc/work-signals';
import { tempDir } from '../u1/helpers';
import { createAidlcRepo, INTENT_ID } from '../u1/aidlc-fixture';

const REAL_AUDIT = readFileSync(
  path.join(process.cwd(), 'tests', 'fixtures', 'aidlc', 'audit-construction.md'),
  'utf8',
);

function entry(
  event: string,
  fields: Record<string, string> = {},
  timestamp = '2026-11-03T10:00:00Z',
) {
  const lines = Object.entries(fields).map(([name, value]) => `**${name}**: ${value}`);
  return `## Título\n**Timestamp**: ${timestamp}\n**Event**: ${event}\n${lines.join('\n')}\n\n---\n\n`;
}

const summaryOf = (text: string) => summarizeEvents(parseAuditText(text));

function inProgress(stageSlug: string) {
  return { stageSlug, mark: 'in_progress' as const };
}

describe('parseAuditText', () => {
  it('lê o formato real do audit/', () => {
    const events = parseAuditText(REAL_AUDIT);
    expect(events.map((e) => e.event)).toContain('UNIT_STARTED');
    const last = events.at(-1);
    expect(last).toMatchObject({ event: 'HOST_TURN', stage: null, unit: null });
    const unitGate = events.find((e) => e.event === 'GATE_APPROVED' && e.unit);
    expect(unitGate?.stages).toContain('functional-design');
    expect(unitGate?.unit).toBe('u1-walking-skeleton');
  });

  it('ignora uma entrada cortada no fim, ainda sem o separador (BR1.3)', () => {
    const cut = `${entry('STAGE_STARTED', { Stage: 'a' })}## Gate\n**Timestamp**: 2026-11-03T10:00:01Z\n**Event**: GATE_APP`;
    expect(parseAuditText(cut).map((e) => e.event)).toEqual(['STAGE_STARTED']);
  });

  it('ignora entradas malformadas entre entradas boas', () => {
    const text = [
      entry('STAGE_STARTED', { Stage: 'a' }),
      '## Sem evento\n**Timestamp**: 2026-11-03T10:00:00Z\n\n---\n\n',
      '## Data ruim\n**Timestamp**: ontem\n**Event**: GATE_APPROVED\n**Stage**: a\n\n---\n\n',
      'lixo solto sem título\n\n---\n\n',
      entry('STAGE_COMPLETED', { Stage: 'a' }),
    ].join('');
    expect(parseAuditText(text).map((e) => e.event)).toEqual(['STAGE_STARTED', 'STAGE_COMPLETED']);
  });

  it('um título novo sem separador descarta a entrada anterior incompleta', () => {
    const text = `## A\n**Timestamp**: 2026-11-03T10:00:00Z\n**Event**: GATE_APPROVED\n**Stage**: a\n${entry('STAGE_STARTED', { Stage: 'b' })}`;
    expect(parseAuditText(text).map((e) => e.event)).toEqual(['STAGE_STARTED']);
  });

  it('campos desconhecidos são ignorados, e o campo não vira outro evento', () => {
    const text = entry('HOST_TURN', {
      Desconhecido: 'x',
      Details: '**Event**: GATE_APPROVED',
    });
    expect(parseAuditText(text)).toEqual([expect.objectContaining({ event: 'HOST_TURN' })]);
  });
});

describe('tentativa atual e gate', () => {
  it('um gate aprovado vale até um novo STAGE_STARTED', () => {
    const approved =
      entry('STAGE_STARTED', { Stage: 'a' }) + entry('GATE_APPROVED', { Stage: 'a' });
    expect(summaryOf(approved).gateOf('a')).toBe('GATE_APPROVED');
    expect(summaryOf(approved + entry('STAGE_STARTED', { Stage: 'a' })).gateOf('a')).toBeNull();
  });

  it('vale o último evento de gate da tentativa', () => {
    const text =
      entry('STAGE_STARTED', { Stage: 'a' }) +
      entry('GATE_REJECTED', { Stage: 'a' }) +
      entry('GATE_APPROVED', { Stage: 'a' });
    expect(summaryOf(text).gateOf('a')).toBe('GATE_APPROVED');
  });

  it('um gate de Unidade não aprova a etapa, mesmo citando-a em Stages', () => {
    const summary = summaryOf(REAL_AUDIT);
    expect(summary.gateOf('code-generation')).toBeNull();
    expect(summary.gateOf('functional-design')).toBeNull();
    expect(summary.gateOf('intent-capture')).toBe('GATE_APPROVED');
    expect(summary.gateOf('etapa-que-nao-existe')).toBeNull();
  });
});

describe('posição do trabalho', () => {
  it('na Construção, vem do último evento de Unidade da execução atual', () => {
    const position = deriveWorkPosition(inProgress('functional-design'), summaryOf(REAL_AUDIT));
    expect(position).toEqual({ stageSlug: 'nfr-design', unit: 'u2-guide-flow', source: 'audit' });
  });

  it('depois de UNIT_COMPLETED, fica nele até o próximo evento', () => {
    const text =
      entry('STAGE_STARTED', { Stage: 'functional-design' }) +
      entry('UNIT_STARTED', { Stage: 'nfr-design', Unit: 'u2' }) +
      entry('UNIT_COMPLETED', { Stage: 'nfr-design', Unit: 'u2' });
    expect(deriveWorkPosition(inProgress('functional-design'), summaryOf(text))).toMatchObject({
      stageSlug: 'nfr-design',
      source: 'audit',
    });
  });

  it('evento de Unidade de uma execução anterior não conta', () => {
    const text =
      entry('UNIT_STARTED', { Stage: 'nfr-design', Unit: 'u2' }) +
      entry('STAGE_STARTED', { Stage: 'functional-design' });
    expect(deriveWorkPosition(inProgress('functional-design'), summaryOf(text))).toEqual({
      stageSlug: 'functional-design',
      unit: null,
      source: 'state',
    });
  });

  it('com a etapa fora de [-], a fonte volta ao estado', () => {
    const position = deriveWorkPosition(
      { stageSlug: 'functional-design', mark: 'awaiting_approval' },
      summaryOf(REAL_AUDIT),
    );
    expect(position.source).toBe('state');
  });

  it('sem etapa atual nem STAGE_STARTED, não inventa posição', () => {
    expect(deriveWorkPosition(null, summaryOf(REAL_AUDIT))).toEqual({
      stageSlug: '',
      unit: null,
      source: 'state',
    });
    const noStart = entry('UNIT_STARTED', { Stage: 'x', Unit: 'u' });
    expect(deriveWorkPosition(inProgress('y'), summaryOf(noStart)).source).toBe('state');
  });
});

describe('leitura dos arquivos', () => {
  it('lê várias cópias locais e ordena pela data', async () => {
    const dir = tempDir();
    const older = path.join(dir, 'z-clone.md');
    const newer = path.join(dir, 'a-clone.md');
    writeFileSync(
      older,
      entry('STAGE_STARTED', { Stage: 'a' }, '2026-11-03T10:00:00Z') +
        entry('GATE_REJECTED', { Stage: 'a' }, '2026-11-03T10:00:05Z'),
    );
    writeFileSync(newer, entry('GATE_APPROVED', { Stage: 'a' }, '2026-11-03T10:00:09Z'));
    const summary = await readAuditSummary([newer, older]);
    expect(summary.gateOf('a')).toBe('GATE_APPROVED');
    expect(summary.lastEvent).toBe('GATE_APPROVED');
  });

  it('um registro com mais de 10 mil linhas é lido em fluxo, sem perder o fim', async () => {
    const file = path.join(tempDir(), 'grande.md');
    const noise = entry('SENSOR_PASSED', { Stage: 'a', Details: 'x'.repeat(40) });
    const body = noise.repeat(3000);
    writeFileSync(file, `${body}${REAL_AUDIT}`);
    expect(readFileSync(file, 'utf8').split('\n').length).toBeGreaterThan(10_000);
    const summary = await readAuditSummary([file]);
    expect(summary.lastEvent).toBe('HOST_TURN');
    expect(summary.unitEventAfterStart('functional-design')?.unit).toBe('u2-guide-flow');
  });

  it('o leitor monta a posição a partir de um registro em disco', async () => {
    const repo = createAidlcRepo();
    mkdirSync(path.join(repo.recordDir, 'audit'));
    writeFileSync(path.join(repo.recordDir, 'audit', 'clone.md'), REAL_AUDIT);
    const reader = new AidlcReader(repo.root);
    await expect(reader.readWorkPosition(INTENT_ID)).resolves.toMatchObject({
      unit: 'u2-guide-flow',
      source: 'audit',
    });
  });

  it('sem audit/, a posição vem do aidlc-state.md', async () => {
    const repo = createAidlcRepo();
    const reader = new AidlcReader(repo.root);
    await expect(reader.readWorkPosition(INTENT_ID)).resolves.toMatchObject({
      stageSlug: 'functional-design',
      source: 'state',
    });
    await expect(reader.readWorkPosition('../fora')).resolves.toBeNull();
  });

  it('um audit/ que não pode ser lido volta ao aidlc-state.md, sem erro', async () => {
    const repo = createAidlcRepo();
    // Um arquivo no lugar da pasta: `readdir` falha com um erro diferente de "não existe".
    writeFileSync(path.join(repo.recordDir, 'audit'), 'isto não é uma pasta');
    const read = new AidlcReader(repo.root);
    const signals = await read.readWorkPosition(INTENT_ID);
    expect(signals?.source).toBe('state');
  });
});
