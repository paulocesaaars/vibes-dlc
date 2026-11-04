import { appendFileSync, copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AidlcReader } from '@/aidlc/reader';
import { GET as getDecisions } from '@/app/api/demands/[intentId]/decisions/route';
import { GET as getDemands } from '@/app/api/demands/route';
import { INTENT_ID } from '../u1/aidlc-fixture';
import { appRequest, createHarness, paramsOf, type Harness } from '../u1/routes-harness';

// Metas de desempenho de U3 (NFR1.1, NFR1.2 e NFR1.3), medidas com o `audit/` grande da demanda ativa.
const OVERVIEW_LIMIT_MS = 2000;
const DECISIONS_LIMIT_MS = 2000;
const CHANGE_LIMIT_MS = 3000;
const OTHER_DEMANDS = 19;
const AUDIT_ENTRIES = 12_000;

let harness: Harness | null = null;
afterEach(() => {
  harness?.dispose();
  harness = null;
});

function decisionEntry(index: number): string {
  const at = new Date(Date.UTC(2026, 10, 3) + index * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
  return `## Decisão\n**Timestamp**: ${at}\n**Event**: DECISION_RECORDED\n**Details**: decisão ${index}\n\n---\n\n`;
}

/** Monta a demanda ativa com um `audit/` de mais de 10 mil linhas e mais 19 demandas ao lado. */
function setup(): Harness {
  harness = createHarness({ shell: { path: 'bash.exe', searched: ['bash.exe'] } });
  const { repo } = harness;
  const audit = path.join(repo.recordDir, 'audit');
  mkdirSync(audit, { recursive: true });
  let text = '# AI-DLC Audit Log\n\n';
  for (let i = 0; i < AUDIT_ENTRIES; i += 1) text += decisionEntry(i);
  writeFileSync(path.join(audit, 'sessao.md'), text);
  for (let i = 0; i < OTHER_DEMANDS; i += 1) {
    const dir = path.join(repo.intentsDir, `2611${String(i).padStart(2, '0')}-outra-${i}`);
    mkdirSync(dir, { recursive: true });
    copyFileSync(repo.statePath, path.join(dir, 'aidlc-state.md'));
  }
  return harness;
}

describe('desempenho de U3', () => {
  it('abre o Início com 20 demandas e um audit/ grande em até 2 s (NFR1.1)', async () => {
    setup();
    const started = performance.now();
    const response = await getDemands(appRequest('/api/demands', { method: 'GET' }));
    const elapsed = performance.now() - started;
    expect(response.status).toBe(200);
    const body = (await response.json()) as { demands: unknown[]; rows: unknown[] };
    expect(body.demands).toHaveLength(OTHER_DEMANDS + 1);
    expect(body.rows).toHaveLength(OTHER_DEMANDS + 1);
    console.info(`[U3] NFR1.1 Início com 20 demandas: ${elapsed.toFixed(0)} ms`);
    expect(elapsed).toBeLessThan(OVERVIEW_LIMIT_MS);
  });

  it('abre a aba Decisões com no máximo 500 linhas, as mais recentes, em até 2 s (NFR1.2)', async () => {
    setup();
    const started = performance.now();
    const response = await getDecisions(
      appRequest('/api/demands/x/decisions', { method: 'GET' }),
      paramsOf(INTENT_ID),
    );
    const elapsed = performance.now() - started;
    expect(response.status).toBe(200);
    const body = (await response.json()) as { decisions: { text: string }[] };
    expect(body.decisions).toHaveLength(500);
    expect(body.decisions[0]?.text).toBe(`decisão ${AUDIT_ENTRIES - 1}`);
    console.info(`[U3] NFR1.2 Aba Decisões: ${elapsed.toFixed(0)} ms`);
    expect(elapsed).toBeLessThan(DECISIONS_LIMIT_MS);
  });

  it('avisa uma demanda nova em até 3 s, com o vigia no ritmo normal (NFR1.3)', async () => {
    const { repo } = setup();
    // O vigia do harness é acelerado; este usa o ritmo de produção.
    const reader = new AidlcReader(repo.root);
    try {
      const changed = new Promise<number>((resolve) => {
        const started = performance.now();
        const stop = reader.subscribe(() => {
          stop();
          resolve(performance.now() - started);
        });
      });
      // O vigia precisa ter lido a base antes da demanda nova aparecer.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const fresh = path.join(repo.intentsDir, '261199-nova');
      mkdirSync(fresh, { recursive: true });
      writeFileSync(path.join(fresh, 'aidlc-state.md'), 'novo\n');
      appendFileSync(path.join(repo.recordDir, 'aidlc-state.md'), '\n');
      const elapsed = (await changed) - 1200;
      console.info(`[U3] NFR1.3 Demanda nova avisada: ${elapsed.toFixed(0)} ms`);
      expect(elapsed).toBeLessThan(CHANGE_LIMIT_MS);
    } finally {
      reader.close();
    }
  });
});
