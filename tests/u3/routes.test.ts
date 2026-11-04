import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { POST as postNew } from '@/app/api/demands/new/command/route';
import { POST as postStageCommand } from '@/app/api/commands/route';
import { POST as postActivate } from '@/app/api/demands/[intentId]/activate/route';
import { GET as getUnits } from '@/app/api/demands/[intentId]/units/route';
import { GET as getDecisions } from '@/app/api/demands/[intentId]/decisions/route';
import { GET as getHistory } from '@/app/api/demands/[intentId]/commands/route';
import { GET as getNotes, POST as postNote } from '@/app/api/demands/[intentId]/notes/route';
import { POST as postSession } from '@/app/api/terminal/session/route';
import { INTENT_ID } from '../u1/aidlc-fixture';
import { appRequest, createHarness, fakePty, paramsOf, type Harness } from '../u1/routes-harness';

let harness: Harness | null = null;
afterEach(() => {
  harness?.dispose();
  harness = null;
});
function setup() {
  const fake = fakePty();
  harness = createHarness({
    shell: { path: 'bash.exe', searched: ['bash.exe'] },
    spawnPty: () => fake.pty,
  });
  return fake;
}
async function session() {
  await postSession(appRequest('/api/terminal/session', { body: {} }));
}

describe('rotas U3', () => {
  it('envia nova demanda após confirmação e a classifica', async () => {
    const { written } = setup();
    await session();
    const commandId = randomUUID();
    const response = await postNew(
      appRequest('/api/demands/new/command', {
        body: {
          commandId,
          text: '/aidlc --scope feature "x"',
          mode: 'execute',
          kind: 'new_demand',
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(written).toContain('/aidlc --scope feature "x"\r');
    expect(harness!.runtime.commands.find(commandId)?.kind).toBe('new_demand');
  });
  it('recusa controle invisível antes de escrever', async () => {
    const { written } = setup();
    await session();
    const response = await postNew(
      appRequest('/api/demands/new/command', {
        body: { commandId: randomUUID(), text: 'a\u000f', mode: 'execute', kind: 'analysis' },
      }),
    );
    expect(response.status).toBe(422);
    expect(written).toEqual([]);
  });
  it('recusa origem externa em todas as rotas novas', async () => {
    setup();
    const request = (method: string) =>
      appRequest('/api/x?path=x.md', {
        method,
        headers: { origin: 'https://fora.example' },
        body: method === 'POST' ? {} : undefined,
      });
    for (const response of await Promise.all([
      postNew(request('POST')),
      postActivate(request('POST'), paramsOf(INTENT_ID)),
      getUnits(request('GET'), paramsOf(INTENT_ID)),
      getDecisions(request('GET'), paramsOf(INTENT_ID)),
      getHistory(request('GET'), paramsOf(INTENT_ID)),
      getNotes(request('GET'), paramsOf(INTENT_ID)),
      postNote(request('POST'), paramsOf(INTENT_ID)),
    ]))
      expect(response.status).toBe(403);
  });
  it('não ativa uma demanda que já é ativa', async () => {
    const { written } = setup();
    await session();
    const response = await postActivate(
      appRequest('/api/demands/x/activate', { body: { commandId: randomUUID(), mode: 'execute' } }),
      paramsOf(INTENT_ID),
    );
    expect(response.status).toBe(409);
    expect(written).toEqual([]);
  });
  it('notas só aceitam artefato existente', async () => {
    setup();
    const response = await postNote(
      appRequest('/api/demands/x/notes', { body: { path: 'missing.md', text: 'nota' } }),
      paramsOf(INTENT_ID),
    );
    expect(response.status).toBe(404);
    expect(harness!.db.all('SELECT * FROM artifact_note')).toEqual([]);
  });
  it('histórico, Unidades e decisões devolvem coleções', async () => {
    setup();
    const context = paramsOf(INTENT_ID);
    for (const handler of [getHistory, getUnits, getDecisions]) {
      const response = await handler(appRequest('/api/x', { method: 'GET' }), context);
      expect(response.status).toBe(200);
    }
  });
  it('recusa envio com sessão morta e preserva commandId', async () => {
    const { written } = setup();
    const commandId = randomUUID();
    const body = { commandId, text: '/aidlc', mode: 'execute', kind: 'new_demand' };
    const response = await postNew(appRequest('/api/demands/new/command', { body }));
    expect(response.status).toBe(409);
    expect(written).toEqual([]);
    expect(harness!.runtime.commands.find(commandId)).toBeNull();
  });
  it('Outra CLI bloqueia nova demanda e análise antes da escrita', async () => {
    const { written } = setup();
    await session();
    await harness!.setCliKind('other');
    for (const kind of ['new_demand', 'analysis'] as const) {
      const commandId = randomUUID();
      const response = await postNew(
        appRequest('/api/demands/new/command', {
          body: { commandId, text: '/aidlc', mode: 'execute', kind },
        }),
      );
      expect(response.status).toBe(409);
      expect((await response.json()).code).toBe('other_cli');
      expect(harness!.runtime.commands.find(commandId)).toBeNull();
    }
    expect(written).toEqual([]);
  });
  it('Outra CLI bloqueia a ativação antes da escrita', async () => {
    const { written } = setup();
    await session();
    await harness!.setCliKind('other');
    const intentId = 'other';
    const other = path.join(harness!.repo.intentsDir, intentId);
    mkdirSync(other);
    writeFileSync(
      path.join(other, 'aidlc-state.md'),
      readFileSync(harness!.repo.statePath, 'utf8'),
    );
    const response = await postActivate(
      appRequest('/api/demands/other/activate', {
        body: { commandId: randomUUID(), mode: 'execute' },
      }),
      paramsOf(intentId),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('other_cli');
    expect(written).toEqual([]);
  });
  it('usa commandId como chave idempotente', async () => {
    const { written } = setup();
    await session();
    const body = { commandId: randomUUID(), text: '/aidlc', mode: 'execute', kind: 'analysis' };
    await postNew(appRequest('/api/demands/new/command', { body }));
    const again = await postNew(appRequest('/api/demands/new/command', { body }));
    expect((await again.json()).duplicate).toBe(true);
    expect(written).toEqual(['/aidlc\r']);
  });
  it('ativa só demanda não ativa e não escreve no cursor', async () => {
    const { written } = setup();
    await session();
    const intentId = 'other';
    const other = path.join(harness!.repo.intentsDir, intentId);
    mkdirSync(other);
    writeFileSync(
      path.join(other, 'aidlc-state.md'),
      readFileSync(harness!.repo.statePath, 'utf8'),
    );
    const cursor = path.join(harness!.repo.intentsDir, 'active-intent');
    const before = readFileSync(cursor, 'utf8');
    const response = await postActivate(
      appRequest('/api/demands/other/activate', {
        body: { commandId: randomUUID(), mode: 'paste' },
      }),
      paramsOf(intentId),
    );
    expect(response.status).toBe(200);
    expect(written).toEqual([`/aidlc intent switch ${intentId}`]);
    expect(readFileSync(cursor, 'utf8')).toBe(before);
  });
  it('recusa comando de etapa em demanda não ativa sem escrever', async () => {
    const { written } = setup();
    await session();
    const intentId = 'other';
    const other = path.join(harness!.repo.intentsDir, intentId);
    mkdirSync(other);
    writeFileSync(
      path.join(other, 'aidlc-state.md'),
      readFileSync(harness!.repo.statePath, 'utf8'),
    );
    const response = await postStageCommand(
      appRequest('/api/commands', {
        body: {
          commandId: randomUUID(),
          intentId,
          stageSlug: 'functional-design',
          text: '/aidlc',
          mode: 'execute',
        },
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe('not_active');
    expect(written).toEqual([]);
  });
  it('grava e lista nota sem tocar o arquivo do artefato', async () => {
    setup();
    const relative = 'inception/requirements-analysis/test.md';
    const artifact = path.join(harness!.repo.recordDir, ...relative.split('/'));
    mkdirSync(path.dirname(artifact), { recursive: true });
    writeFileSync(artifact, 'conteúdo original');
    const response = await postNote(
      appRequest('/api/demands/x/notes', { body: { path: relative, text: 'Minha nota' } }),
      paramsOf(INTENT_ID),
    );
    expect(response.status).toBe(201);
    const listed = await getNotes(
      appRequest(`/api/demands/x/notes?path=${encodeURIComponent(relative)}`, { method: 'GET' }),
      paramsOf(INTENT_ID),
    );
    expect((await listed.json()).notes[0].text).toBe('Minha nota');
    expect(readFileSync(artifact, 'utf8')).toBe('conteúdo original');
  });
});
