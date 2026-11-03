import { mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as postCommand } from '@/app/api/commands/route';
import { GET as getArtifacts } from '@/app/api/demands/[intentId]/artifacts/route';
import { POST as postReview } from '@/app/api/demands/[intentId]/artifacts/review/route';
import { POST as postConclusion } from '@/app/api/demands/[intentId]/conclusion/route';
import { GET as getGuide } from '@/app/api/demands/[intentId]/guide/route';
import { GET as getSeen, POST as postSeen } from '@/app/api/demands/[intentId]/seen/route';
import { GET as getTrail } from '@/app/api/demands/[intentId]/trail/route';
import { POST as postUnderstood } from '@/app/api/demands/[intentId]/understood/route';
import type { ArtifactList } from '@/web/artifact-service';
import type { GuideView } from '@/web/guide-service';
import { INTENT_ID, REAL_STATE, withMark } from '../u1/aidlc-fixture';
import { appRequest, createHarness, fakePty, type Harness, paramsOf } from '../u1/routes-harness';

const STAGE = 'functional-design';
const NEXT = 'nfr-requirements';
const PREVIOUS = 'delivery-planning';
const BASE = `/api/demands/${INTENT_ID}`;
const STAGE_DIR = `construction/${STAGE}`;
const params = paramsOf(INTENT_ID);

let harness: Harness;
let written: string[];

beforeEach(() => {
  const fake = fakePty();
  written = fake.written;
  harness = createHarness({ spawnPty: () => fake.pty });
  harness.runtime.terminal.openOrJoin();
});

afterEach(() => {
  harness.dispose();
  vi.useRealTimers();
});

function setMark(mark: string, slug = STAGE): void {
  writeFileSync(harness.repo.statePath, withMark(REAL_STATE, slug, mark));
}

function auditBlock(event: string, fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([name, value]) => `**${name}**: ${value}`);
  return `## X\n**Timestamp**: 2026-11-03T10:00:00Z\n**Event**: ${event}\n${lines.join('\n')}\n\n---\n\n`;
}

function writeAudit(...blocks: string[]): void {
  mkdirSync(path.join(harness.repo.recordDir, 'audit'), { recursive: true });
  writeFileSync(path.join(harness.repo.recordDir, 'audit', 'clone.md'), blocks.join(''));
}

function writeArtifact(name: string, content: string): void {
  const file = path.join(harness.repo.recordDir, STAGE_DIR, name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

async function guide(query = ''): Promise<GuideView> {
  const response = await getGuide(appRequest(`${BASE}/guide${query}`, { method: 'GET' }), params);
  return (await response.json()) as GuideView;
}

async function artifacts(query = `?stage=${STAGE}`) {
  return getArtifacts(appRequest(`${BASE}/artifacts${query}`, { method: 'GET' }), params);
}

async function list(query?: string): Promise<ArtifactList> {
  return (await (await artifacts(query)).json()) as ArtifactList;
}

function review(body: unknown): Promise<Response> {
  return postReview(appRequest(`${BASE}/artifacts/review`, { body }), params);
}

function send(stageSlug: string, commandId: string): Promise<Response> {
  return postCommand(
    appRequest('/api/commands', {
      body: { commandId, intentId: INTENT_ID, stageSlug, text: '/aidlc', mode: 'execute' },
    }),
  );
}

describe('origem e entrada nas rotas novas (NFR4.1)', () => {
  const foreign = { origin: 'https://malicioso.example' };
  const wrongHost = { host: 'malicioso.example:3456' };

  it.each([
    [
      'artifacts',
      () =>
        getArtifacts(
          appRequest(`${BASE}/artifacts?stage=${STAGE}`, { method: 'GET', headers: foreign }),
          params,
        ),
    ],
    [
      'review',
      () =>
        postReview(appRequest(`${BASE}/artifacts/review`, { body: {}, headers: foreign }), params),
    ],
    [
      'seen GET',
      () => getSeen(appRequest(`${BASE}/seen`, { method: 'GET', headers: foreign }), params),
    ],
    [
      'seen POST',
      () => postSeen(appRequest(`${BASE}/seen`, { body: {}, headers: foreign }), params),
    ],
    [
      'trail',
      () => getTrail(appRequest(`${BASE}/trail`, { method: 'GET', headers: foreign }), params),
    ],
    [
      'conclusion',
      () =>
        postConclusion(appRequest(`${BASE}/conclusion`, { body: {}, headers: foreign }), params),
    ],
    [
      'Host de fora',
      () => getTrail(appRequest(`${BASE}/trail`, { method: 'GET', headers: wrongHost }), params),
    ],
  ])('%s responde 403', async (_name, call) => {
    const response = await call();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'origin_rejected' });
  });

  it('entrada inválida responde 422, sem ler nem gravar', async () => {
    expect((await artifacts('?stage=../..')).status).toBe(422);
    expect((await artifacts('')).status).toBe(422);
    expect((await review({ path: 'a.md', contentHash: 'curto' })).status).toBe(422);
    const seen = await postSeen(
      appRequest(`${BASE}/seen`, { body: { stageSlug: 'a b', unit: '', mark: 'approved' } }),
      params,
    );
    expect(seen.status).toBe(422);
    expect(harness.db.all('SELECT * FROM artifact_review')).toEqual([]);
    expect(harness.db.all('SELECT * FROM demand_seen_state')).toEqual([]);
  });
});

describe('artefatos', () => {
  it('lista a etapa e devolve o primeiro pendente como texto', async () => {
    writeArtifact('a.md', '<script>alert(1)</script>');
    writeArtifact('b.md', 'segundo');
    writeArtifact('memory.md', 'não aparece');
    const body = await list();
    expect(body.items.map((item) => item.name)).toEqual(['a.md', 'b.md']);
    expect(body.selected).toMatchObject({
      path: `${STAGE_DIR}/a.md`,
      content: '<script>alert(1)</script>',
    });
    expect(body).toMatchObject({ total: 2, reviewed: 0 });
  });

  it('um caminho de fora responde 404, sem o conteúdo', async () => {
    const outside = path.join(harness.repo.root, 'segredo.txt');
    writeFileSync(outside, 'segredo');
    for (const candidate of ['../../../../../segredo.txt', outside, 'nao-existe.md']) {
      const response = await artifacts(`?stage=${STAGE}&path=${encodeURIComponent(candidate)}`);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain('segredo"');
    }
  });

  it('um arquivo grande devolve o caminho e o motivo', async () => {
    writeArtifact('grande.md', 'x'.repeat(2 * 1024 * 1024 + 1));
    expect((await list()).selected).toMatchObject({ content: null, omittedReason: 'too_large' });
  });
});

describe('revisar (BR4.4)', () => {
  async function selected() {
    const body = await list();
    return body.selected as NonNullable<ArtifactList['selected']>;
  }

  it('marcar com o hash mostrado grava a revisão e muda a contagem', async () => {
    writeArtifact('a.md', 'um');
    writeArtifact('b.md', 'dois');
    setMark('?');
    expect((await guide()).decision.moment).toBe('review');
    const shown = await selected();
    const response = await review({ path: shown.path, contentHash: shown.contentHash });
    expect(response.status).toBe(200);
    const view = await guide();
    expect(view.artifacts).toEqual({ total: 2, reviewed: 1 });
    expect(view.content.eyebrow).toContain('1 de 2 revisados');
    expect((await list()).selected?.path).toBe(`${STAGE_DIR}/b.md`);
  });

  it('conteúdo que mudou nesse meio-tempo responde 409 artifact_changed, com o novo', async () => {
    writeArtifact('a.md', 'versão lida');
    const shown = await selected();
    writeArtifact('a.md', 'versão nova');
    const response = await review({ path: shown.path, contentHash: shown.contentHash });
    expect(response.status).toBe(409);
    const body = (await response.json()) as { code: string; artifact: { content: string } };
    expect(body.code).toBe('artifact_changed');
    expect(body.artifact.content).toBe('versão nova');
    expect(harness.db.all('SELECT * FROM artifact_review')).toEqual([]);
  });

  it('revisado cujo conteúdo muda volta a pedir revisão, como changed', async () => {
    writeArtifact('a.md', 'um');
    setMark('?');
    const shown = await selected();
    await review({ path: shown.path, contentHash: shown.contentHash });
    expect((await guide()).decision.moment).toBe('approve');
    writeArtifact('a.md', 'alterado');
    const view = await guide();
    expect(view.decision.moment).toBe('review');
    expect((await list()).items[0]?.reviewStatus).toBe('changed');
  });

  it('caminho de fora responde 404 e nada é marcado', async () => {
    const response = await review({ path: '../../../../../x', contentHash: 'a'.repeat(64) });
    expect(response.status).toBe(404);
    expect(harness.db.all('SELECT * FROM artifact_review')).toEqual([]);
  });

  it('falha ao gravar responde 500, e nada fica marcado', async () => {
    writeArtifact('a.md', 'um');
    const shown = await selected();
    vi.spyOn(harness.runtime.reviews, 'markReviewed').mockImplementation(() => {
      throw new Error('disco cheio');
    });
    const response = await review({ path: shown.path, contentHash: shown.contentHash });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ code: 'review_failed' });
  });
});

describe('aprovar, alterações e conclusão', () => {
  it('sem artefatos, o momento é approve, sem ação nem envio', async () => {
    setMark('?');
    const view = await guide();
    expect(view.decision).toMatchObject({ moment: 'approve', primaryAction: 'none' });
    expect((await send(STAGE, crypto.randomUUID())).status).toBe(409);
    expect(written).toEqual([]);
  });

  it('[R] volta a Acompanhar, com a vez da IA', async () => {
    setMark('R');
    expect((await guide()).decision).toMatchObject({ moment: 'revising', turn: 'ai' });
  });

  it('GATE_REJECTED também, e um novo STAGE_STARTED zera o gate', async () => {
    const started = auditBlock('STAGE_STARTED', { Stage: STAGE });
    writeAudit(started, auditBlock('GATE_REJECTED', { Stage: STAGE }));
    expect((await guide()).decision.moment).toBe('revising');
    writeAudit(started, auditBlock('GATE_REJECTED', { Stage: STAGE }), started);
    expect((await guide()).decision.moment).toBe('understand');
  });

  it('[x] sem GATE_APPROVED fica em following, sem afirmar aprovação', async () => {
    setMark('x');
    const view = await guide();
    expect(view.decision).toMatchObject({ moment: 'following', turn: 'person' });
    expect(view.conclusion).toBeNull();
  });

  /** O que o AI-DLC grava de fato: anterior em `[x]`, atual em `[-]` e `Current Stage` atualizado. */
  function approvePrevious(): void {
    writeAudit(
      auditBlock('STAGE_STARTED', { Stage: PREVIOUS }),
      auditBlock('GATE_APPROVED', { Stage: PREVIOUS }),
      auditBlock('STAGE_STARTED', { Stage: STAGE }),
    );
  }

  function writePreviousArtifact(name: string, content: string): void {
    const file = path.join(harness.repo.recordDir, 'inception', PREVIOUS, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }

  const acknowledge = (stageSlug: string) =>
    postConclusion(appRequest(`${BASE}/conclusion`, { body: { stageSlug } }), params);

  it('a conclusão é da etapa anterior, com a contagem dela e o aviso', async () => {
    writePreviousArtifact('plano.md', 'um');
    approvePrevious();
    const view = await guide();
    expect(view.decision).toMatchObject({
      moment: 'conclusion',
      turn: 'guide',
      primaryAction: 'next_stage',
      canSend: false,
    });
    expect(view.previousStage?.slug).toBe(PREVIOUS);
    expect(view.nextStage?.slug).toBe(STAGE);
    expect(view.conclusion).toMatchObject({
      review: 'Planejamento de entrega aprovada',
      isWarning: true,
    });
    expect(view.conclusion?.note).toContain('0 de 1');
    expect((await send(STAGE, crypto.randomUUID())).status).toBe(409);
    expect(written).toEqual([]);
  });

  it('a revisão feita na etapa anterior entra na conclusão, sem aviso', async () => {
    writePreviousArtifact('plano.md', 'um');
    const shown = await list(`?stage=${PREVIOUS}`);
    const artifact = shown.selected as NonNullable<ArtifactList['selected']>;
    await review({ path: artifact.path, contentHash: artifact.contentHash });
    approvePrevious();
    const { conclusion } = await guide();
    expect(conclusion).toMatchObject({ isWarning: false });
    expect(conclusion?.note).toContain('1 artefato');
  });

  it('Ir para a próxima etapa grava o reconhecimento, e Enviar oferece /aidlc (BR6.2)', async () => {
    approvePrevious();
    const response = await acknowledge(PREVIOUS);
    expect(response.status).toBe(200);
    const view = (await response.json()) as GuideView;
    expect(view.decision.moment).toBe('understand');
    expect(view.previousStage).toBeNull();
    expect(harness.runtime.progress.find(INTENT_ID, PREVIOUS)?.conclusionSeenAt).toBeTruthy();
    expect((await guide()).decision.moment).toBe('understand');

    const understood = await postUnderstood(
      appRequest(`${BASE}/understood`, { body: { stageSlug: STAGE } }),
      params,
    );
    const sending = (await understood.json()) as GuideView;
    expect(sending.decision).toMatchObject({ moment: 'send', canSend: true });
    expect(sending.command).toBe('/aidlc');
    expect((await send(STAGE, crypto.randomUUID())).status).toBe(200);
    expect(written).toEqual(['/aidlc\r']);
  });

  it('se a pessoa já foi em frente pelo terminal, o guia não volta à conclusão', async () => {
    approvePrevious();
    writeArtifact('novo.md', 'a sua IA já gravou');
    expect((await guide()).decision.moment).toBe('understand');
  });

  it('com o comando já enviado, também não', async () => {
    approvePrevious();
    harness.runtime.commands.insertPending({
      commandId: 'c1',
      intentId: INTENT_ID,
      stageSlug: STAGE,
      text: '/aidlc',
      mode: 'execute',
    });
    harness.runtime.commands.markWritten('c1');
    expect((await guide()).decision).toMatchObject({ moment: 'following', turn: 'ai' });
  });

  it('sem GATE_APPROVED na tentativa da anterior, não há conclusão', async () => {
    writeAudit(
      auditBlock('STAGE_STARTED', { Stage: PREVIOUS }),
      auditBlock('GATE_APPROVED', { Stage: PREVIOUS }),
      auditBlock('STAGE_STARTED', { Stage: PREVIOUS }),
    );
    expect((await guide()).decision.moment).toBe('understand');
    writeAudit(
      auditBlock('GATE_APPROVED', { Stage: PREVIOUS, Unit: 'u1-x' }),
      auditBlock('STAGE_STARTED', { Stage: STAGE }),
    );
    expect((await guide()).decision.moment).toBe('understand');
  });

  it('com a marca da anterior fora de [x], o evento sozinho não basta', async () => {
    writeFileSync(harness.repo.statePath, withMark(REAL_STATE, PREVIOUS, '?'));
    approvePrevious();
    expect((await guide()).decision.moment).toBe('understand');
  });

  it('[x] na atual com GATE_APPROVED e etapa seguinte não afirma conclusão', async () => {
    setMark('x');
    writeAudit(
      auditBlock('STAGE_STARTED', { Stage: STAGE }),
      auditBlock('GATE_APPROVED', { Stage: STAGE }),
    );
    const view = await guide();
    expect(view.decision).toMatchObject({ moment: 'following', turn: 'person' });
    expect(view.conclusion).toBeNull();
  });

  it('o reconhecimento só vale no momento conclusion e para a etapa anterior', async () => {
    expect((await acknowledge(PREVIOUS)).status).toBe(409);
    approvePrevious();
    expect((await acknowledge('intent-capture')).status).toBe(409);
    expect((await acknowledge('a b')).status).toBe(422);
    expect(harness.runtime.progress.find(INTENT_ID, PREVIOUS)).toBeNull();
  });

  it('falha ao gravar o reconhecimento responde 500, e a conclusão continua', async () => {
    approvePrevious();
    vi.spyOn(harness.runtime.progress, 'markConclusionSeen').mockImplementation(() => {
      throw new Error('disco cheio');
    });
    const response = await acknowledge(PREVIOUS);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ code: 'conclusion_failed' });
    expect((await guide()).decision.moment).toBe('conclusion');
  });

  it('a etapa seguinte não é aceita antes da aprovação registrada (AC4.3.3)', async () => {
    setMark('?');
    const view = await guide();
    expect(view.stage.stateSlug).toBe(STAGE);
    const understood = await postUnderstood(
      appRequest(`${BASE}/understood`, { body: { stageSlug: NEXT } }),
      params,
    );
    expect(understood.status).toBe(409);
    expect((await send(NEXT, crypto.randomUUID())).status).toBe(409);
    expect(written).toEqual([]);
  });

  it('na última etapa, a trilha fica concluída e mostra os comandos enviados', async () => {
    const lastStage = 'ci-pipeline';
    const state = REAL_STATE.replace(
      /\*\*Current Stage\*\*: .+/,
      `**Current Stage**: ${lastStage}`,
    );
    writeFileSync(harness.repo.statePath, withMark(state, lastStage, 'x'));
    writeAudit(
      auditBlock('STAGE_STARTED', { Stage: lastStage }),
      auditBlock('GATE_APPROVED', { Stage: lastStage }),
    );
    harness.runtime.commands.insertPending({
      commandId: 'c1',
      intentId: INTENT_ID,
      stageSlug: STAGE,
      text: '/aidlc',
      mode: 'execute',
    });
    harness.runtime.commands.markWritten('c1');
    const view = await guide();
    expect(view.decision.moment).toBe('trail_done');
    expect(view.sentCommands).toEqual([
      expect.objectContaining({ text: '/aidlc', stageName: 'Projeto funcional' }),
    ]);
  });
});

describe('dentro de uma Unidade', () => {
  const unitAudit = () =>
    writeAudit(
      auditBlock('STAGE_STARTED', { Stage: STAGE }),
      auditBlock('UNIT_STARTED', { Stage: 'nfr-design', Unit: 'u2-guide-flow' }),
    );

  it('mostra a Unidade e a etapa real, e a marca não vem do estado', async () => {
    unitAudit();
    const view = await guide();
    expect(view.position.source).toBe('audit');
    expect(view.stage).toMatchObject({
      slug: 'nfr-design',
      stateSlug: STAGE,
      unit: 'u2-guide-flow',
      mark: 'in_progress',
    });
    expect(view.decision).toMatchObject({ moment: 'following', turn: 'ai' });
  });

  it('Entender e Enviar não aparecem, mesmo depois de entender a etapa', async () => {
    unitAudit();
    harness.runtime.progress.markUnderstood(INTENT_ID, STAGE);
    expect((await guide()).decision.moment).toBe('following');
    expect((await send(STAGE, crypto.randomUUID())).status).toBe(409);
    expect(written).toEqual([]);
  });

  it('a trilha marca a etapa da Unidade como atual e mostra a Unidade', async () => {
    unitAudit();
    const response = await getTrail(appRequest(`${BASE}/trail`, { method: 'GET' }), params);
    const body = (await response.json()) as { phases: GuideView['trail'] };
    const construction = body.phases.find((phase) => phase.name === 'construction');
    const current = construction?.stages.find((stage) => stage.status === 'current');
    expect(current).toMatchObject({ slug: 'nfr-design', unit: 'u2-guide-flow' });
    const statusOf = (slug: string) => construction?.stages.find((s) => s.slug === slug)?.status;
    expect(statusOf(STAGE)).toBe('previous');
    expect(statusOf(NEXT)).toBe('previous');
    expect(statusOf('code-generation')).toBe('blocked');
    expect(construction?.done).toBe(0);
  });
});

describe('Retomar', () => {
  function unitIdleFor(minutes: number): void {
    writeAudit(
      auditBlock('STAGE_STARTED', { Stage: STAGE }),
      auditBlock('UNIT_STARTED', { Stage: 'nfr-design', Unit: 'u2-guide-flow' }),
    );
    const when = new Date(Date.now() - minutes * 60_000);
    utimesSync(path.join(harness.repo.recordDir, 'audit', 'clone.md'), when, when);
    utimesSync(harness.repo.statePath, when, when);
  }

  it('aos 10 minutos a faixa aparece, e o envio só vai com a confirmação', async () => {
    unitIdleFor(11);
    const view = await guide();
    expect(view.decision).toMatchObject({ showIdleNotice: true, canSend: true });
    expect(written).toEqual([]);
    expect((await send(STAGE, crypto.randomUUID())).status).toBe(200);
    expect(written).toEqual(['/aidlc\r']);
  });

  it('aos 9 minutos, a rota recusa', async () => {
    unitIdleFor(9);
    expect((await guide()).decision.showIdleNotice).toBe(false);
    const response = await send(STAGE, crypto.randomUUID());
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'not_send_moment' });
    expect(written).toEqual([]);
  });
});

describe('último estado visto (BR7.1)', () => {
  const seen = async () =>
    (await (await getSeen(appRequest(`${BASE}/seen`, { method: 'GET' }), params)).json()) as {
      status: string;
      current: { stageSlug: string; unit: string; mark: string };
      text: string | null;
    };
  const save = (body: unknown) => postSeen(appRequest(`${BASE}/seen`, { body }), params);

  it('na primeira visita não há aviso, e o GET não grava', async () => {
    const first = await seen();
    expect(first).toMatchObject({ status: 'first_visit', text: null });
    expect(harness.db.all('SELECT * FROM demand_seen_state')).toEqual([]);
  });

  it('sem mudança, não há aviso', async () => {
    const { current } = await seen();
    expect((await save(current)).status).toBe(200);
    expect((await seen()).status).toBe('same');
  });

  it('com a marca diferente, avisa o que mudou', async () => {
    await save((await seen()).current);
    setMark('?');
    const changed = await seen();
    expect(changed.status).toBe('changed');
    expect(changed.text).toContain('Antes: Projeto funcional (em andamento)');
    expect(changed.text).toContain('Agora: Projeto funcional (aguardando a sua aprovação)');
    await save(changed.current);
    expect((await seen()).status).toBe('same');
  });

  it('a Unidade diferente também conta como mudança', async () => {
    await save((await seen()).current);
    writeAudit(
      auditBlock('STAGE_STARTED', { Stage: STAGE }),
      auditBlock('UNIT_STARTED', { Stage: STAGE, Unit: 'u2-guide-flow' }),
    );
    const changed = await seen();
    expect(changed.status).toBe('changed');
    expect(changed.current.unit).toBe('u2-guide-flow');
  });

  it('demanda ilegível responde 409, sem gravar', async () => {
    const badParams = paramsOf('../fora');
    const read = await getSeen(appRequest(`${BASE}/seen`, { method: 'GET' }), badParams);
    expect(read.status).toBe(409);
    const write = await postSeen(
      appRequest(`${BASE}/seen`, { body: { stageSlug: 'a', unit: '', mark: 'approved' } }),
      badParams,
    );
    expect(write.status).toBe(409);
    expect(harness.db.all('SELECT * FROM demand_seen_state')).toEqual([]);
  });
});

describe('trilha', () => {
  it('mostra fases, números lidos dos arquivos e etapas puladas', async () => {
    const response = await getTrail(appRequest(`${BASE}/trail`, { method: 'GET' }), params);
    const body = (await response.json()) as {
      phases: GuideView['trail'];
      progress: GuideView['progress'];
    };
    const ideation = body.phases.find((phase) => phase.name === 'ideation');
    expect(ideation?.stages.find((s) => s.slug === 'market-research')?.status).toBe('skipped');
    expect(ideation?.stages.find((s) => s.slug === 'feasibility')?.status).toBe('done');
    expect(body.progress.total).toBeGreaterThan(body.progress.done);
  });

  it('uma etapa concluída mostra os artefatos dela, inclusive os de Unidades', async () => {
    const file = path.join(harness.repo.recordDir, 'construction/u1-a/nfr-design/plano.md');
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, 'de U1');
    const body = await list('?stage=nfr-design&consult=1');
    expect(body.items.map((item) => item.path)).toEqual(['construction/u1-a/nfr-design/plano.md']);
    expect((await list('?stage=nfr-design')).items).toEqual([]);
  });
});
