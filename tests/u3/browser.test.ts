import { appendFileSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listDemandRows, readDecisions, readUnits } from '@/aidlc/demand-browser';
import { buildAnalysisCommand, buildDemandCommand, suggestLevel } from '@/triage/suggest-level';
import { tempDir } from '../u1/helpers';

function fixture() {
  const root = tempDir();
  const intents = path.join(root, 'aidlc', 'spaces', 'default', 'intents');
  const record = path.join(intents, 'safe');
  mkdirSync(path.join(record, 'inception', 'units-generation'), { recursive: true });
  mkdirSync(path.join(record, 'audit'), { recursive: true });
  writeFileSync(path.join(intents, 'active-intent'), 'safe');
  writeFileSync(
    path.join(record, 'aidlc-state.md'),
    '# AI-DLC State\n\n## Project Information\n\n- **Project**: Teste\n- **Scope**: mvp\n\n## Current Position\n\n- **Current Stage**: code-generation\n\n## Stage Progress\n\n- [R] code-generation 3.5 EXECUTE\n',
  );
  writeFileSync(
    path.join(record, 'inception', 'units-generation', 'unit-of-work.md'),
    '| Unit ID | Directory | Kind |\n|---|---|---|\n| U1 | `u1-one` | `service` |\n\n## U1. `u1-one`\n\n- **Descrição:** primeira\n',
  );
  writeFileSync(
    path.join(record, 'audit', 'one.md'),
    '## Unit\n**Timestamp**: 2026-11-01T00:00:00Z\n**Event**: UNIT_COMPLETED\n**Stage**: code-generation\n**Unit**: u1-one\n\n---\n\n## Gate\n**Timestamp**: 2026-11-02T00:00:00Z\n**Event**: GATE_APPROVED\n**Unit**: u1-one\n**Gate Scope**: unit-end\n**Details**: Aprovado\n\n---\n',
  );
  return { root, intents, record };
}

describe('sugestões e comandos', () => {
  it.each([
    ['corrigir erro no login', 'bugfix'],
    ['corrigir a vulnerabilidade CVE-2026-1234', 'security-patch'],
    ['refatorar o módulo de pagamentos', 'refactor'],
    ['configurar terraform para a fila', 'infra'],
    ['prova de conceito de busca', 'poc'],
    ['criar o MVP do catálogo', 'mvp'],
    ['oficina de treinamento', 'workshop'],
    ['fluxo com auditoria e LGPD', 'enterprise'],
    ['ajuste pequeno no rodapé', 'express'],
    ['adicionar filtro por data', 'feature'],
  ])('%s sugere %s', (description, scope) => expect(suggestLevel(description).scope).toBe(scope));
  it('limpa aspas e quebras, e inclui new-intent só com trabalho ativo', () => {
    expect(buildDemandCommand('Criar "algo"\nnovo', 'mvp', true)).toBe(
      '/aidlc --new-intent --scope mvp "Criar \'algo\' novo"',
    );
    expect(buildDemandCommand('x', 'feature', false)).not.toContain('--new-intent');
    expect(buildAnalysisCommand('x\ny')).toBe('/aidlc compose "x y"');
  });
});

describe('leitura de demandas', () => {
  it('lê a ativa e ignora pasta insegura', async () => {
    const { root, intents } = fixture();
    mkdirSync(path.join(intents, '..bad'));
    const rows = await listDemandRows(root);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ intentId: 'safe', isActive: true });
  });
  it('tolera registro ilegível e intents.json inválido', async () => {
    const { root, intents } = fixture();
    mkdirSync(path.join(intents, 'broken'));
    writeFileSync(path.join(intents, 'intents.json'), '{');
    expect(await listDemandRows(root)).toEqual(
      expect.arrayContaining([expect.objectContaining({ intentId: 'broken', readable: false })]),
    );
  });
  it('ignora arquivadas no registro', async () => {
    const { root, intents } = fixture();
    writeFileSync(
      path.join(intents, 'intents.json'),
      JSON.stringify([{ dirName: 'safe', status: 'archived' }]),
    );
    expect(await listDemandRows(root)).toEqual([]);
  });
  it('não segue junção de diretório para fora do registro', async () => {
    const { root, intents } = fixture();
    const outside = tempDir();
    writeFileSync(path.join(outside, 'aidlc-state.md'), 'conteúdo fora');
    symlinkSync(outside, path.join(intents, 'linked'), 'junction');
    expect((await listDemandRows(root)).map((row) => row.intentId)).toEqual(['safe']);
  });
  it('Unidades e Decisões não abrem registro ligado para fora de intents', async () => {
    const { root, intents } = fixture();
    const outside = tempDir();
    const units = path.join(outside, 'inception', 'units-generation');
    const audit = path.join(outside, 'audit');
    mkdirSync(units, { recursive: true });
    mkdirSync(audit);
    writeFileSync(path.join(units, 'unit-of-work.md'), '| U1 | `u1-secret` | `service` |');
    writeFileSync(
      path.join(audit, 'private.md'),
      '## Decisão\n**Timestamp**: 2026-11-03T00:00:00Z\n**Event**: DECISION_RECORDED\n**Details**: segredo\n\n---\n',
    );
    symlinkSync(outside, path.join(intents, 'linked'), 'junction');
    expect(await readUnits(root, 'linked')).toEqual([]);
    expect(await readDecisions(root, 'linked')).toEqual([]);
  });
  it('a demanda ativa usa a marca para mostrar de quem é a vez', async () => {
    const { root } = fixture();
    expect((await listDemandRows(root))[0]?.turn).toBe('ai');
  });
  it('relê o cursor ativo ao mudar de demanda', async () => {
    const { root, intents } = fixture();
    mkdirSync(path.join(intents, 'other'));
    writeFileSync(path.join(intents, 'active-intent'), 'other');
    expect((await listDemandRows(root)).find((row) => row.intentId === 'safe')?.isActive).toBe(
      false,
    );
  });
  it('deriva aprovação da Unidade sem confundir com etapa', async () => {
    const { root } = fixture();
    expect(await readUnits(root, 'safe')).toEqual([
      expect.objectContaining({ unitName: 'u1-one', status: 'approved' }),
    ]);
  });
  it('lê decisões recentes como texto', async () => {
    const { root } = fixture();
    expect(await readDecisions(root, 'safe')).toEqual([
      expect.objectContaining({ kind: 'approval', text: 'Aprovado' }),
    ]);
  });
  it('rejeição de gate posterior tira a aprovação da Unidade', async () => {
    const { root, record } = fixture();
    appendFileSync(
      path.join(record, 'audit', 'one.md'),
      '## Gate\n**Timestamp**: 2026-11-03T00:00:00Z\n**Event**: GATE_REJECTED\n**Unit**: u1-one\n**Gate Scope**: unit-end\n\n---\n',
    );
    expect((await readUnits(root, 'safe'))[0]?.status).toBe('in_progress');
  });
  it('guarda no máximo 500 decisões recentes', async () => {
    const { root, record } = fixture();
    const blocks = Array.from(
      { length: 510 },
      (_, i) =>
        `## Decisão\n**Timestamp**: 2026-11-03T00:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z\n**Event**: DECISION_RECORDED\n**Details**: decisão ${i}\n\n---\n`,
    ).join('\n');
    appendFileSync(path.join(record, 'audit', 'one.md'), blocks);
    const decisions = await readDecisions(root, 'safe');
    expect(decisions).toHaveLength(500);
    expect(decisions[0]?.text).toBe('decisão 509');
  });
});
