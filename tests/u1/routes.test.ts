import { randomUUID } from 'node:crypto';
import { writeFileSync, rmSync, utimesSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as postCommand } from '@/app/api/commands/route';
import { GET as getDemands } from '@/app/api/demands/route';
import { GET as getGuide } from '@/app/api/demands/[intentId]/guide/route';
import { POST as postUnderstood } from '@/app/api/demands/[intentId]/understood/route';
import { GET as getEvents } from '@/app/api/events/route';
import { POST as postInput } from '@/app/api/terminal/input/route';
import { POST as postResize } from '@/app/api/terminal/resize/route';
import { DELETE as deleteSession, POST as postSession } from '@/app/api/terminal/session/route';
import { GET as getStream } from '@/app/api/terminal/stream/route';
import { logger } from '@/config/logger';
import type { GuideView } from '@/web/guide-service';
import { isRequestAllowed } from '@/web/request-guard';
import { INTENT_ID, REAL_STATE, withMark } from './aidlc-fixture';
import { tempDir } from './helpers';
import {
  APP_HOST,
  APP_ORIGIN,
  appRequest,
  createHarness,
  fakePty,
  type Harness,
  paramsOf,
  PORT,
  readSse,
} from './routes-harness';

const STAGE = 'functional-design';

let harness: Harness | null = null;
afterEach(() => {
  harness?.dispose();
  harness = null;
});

function withFakePty(overrides = {}) {
  const fake = fakePty(overrides);
  harness = createHarness({
    shell: { path: 'bash.exe', searched: ['bash.exe'] },
    spawnPty: () => fake.pty,
  });
  return { ...fake, harness };
}

const commandBody = (overrides: Record<string, unknown> = {}) => ({
  commandId: randomUUID(),
  intentId: INTENT_ID,
  stageSlug: STAGE,
  text: 'echo ola',
  mode: 'execute',
  ...overrides,
});

async function guide(): Promise<GuideView> {
  const response = await getGuide(
    appRequest(`/api/demands/${INTENT_ID}/guide`, { method: 'GET' }),
    paramsOf(INTENT_ID),
  );
  return response.json();
}

async function reachSendMoment() {
  await postSession(appRequest('/api/terminal/session', { body: {} }));
  await postUnderstood(
    appRequest(`/api/demands/${INTENT_ID}/understood`, { body: { stageSlug: STAGE } }),
    paramsOf(INTENT_ID),
  );
}

describe('isRequestAllowed', () => {
  const config = { host: '127.0.0.1', port: PORT, publicHost: null };
  const request = (method: string, headers: Record<string, string>) =>
    new Request(`${APP_ORIGIN}/x`, { method, headers: new Headers(headers) });

  it.each([
    ['POST', { host: APP_HOST, origin: APP_ORIGIN }, true],
    ['POST', { host: `localhost:${PORT}`, origin: `http://localhost:${PORT}` }, true],
    ['GET', { host: APP_HOST }, true],
    ['GET', { host: APP_HOST, origin: APP_ORIGIN }, true],
    ['POST', { host: APP_HOST }, false],
    ['POST', { host: APP_HOST, origin: 'https://malicioso.example' }, false],
    ['GET', { host: APP_HOST, origin: 'https://malicioso.example' }, false],
    ['POST', { host: 'malicioso.example', origin: APP_ORIGIN }, false],
    ['GET', { host: 'malicioso.example' }, false],
    ['GET', {}, false],
    ['GET', { host: '127.0.0.1:9999' }, false],
    ['POST', { host: APP_HOST, origin: 'null' }, false],
    ['POST', { host: APP_HOST, origin: 'file:///c:/x.html' }, false],
    ['DELETE', { host: APP_HOST }, false],
  ] as const)('%s %j -> %s', (method, headers, expected) => {
    expect(isRequestAllowed(request(method, headers), config)).toBe(expected);
  });

  it('aceita VIBES_HOST definido e VIBES_PUBLIC_HOST com 0.0.0.0', () => {
    const lan = { host: '192.168.0.5', port: PORT, publicHost: null };
    expect(isRequestAllowed(request('GET', { host: `192.168.0.5:${PORT}` }), lan)).toBe(true);

    const open = { host: '0.0.0.0', port: PORT, publicHost: 'maquina' };
    expect(isRequestAllowed(request('GET', { host: `maquina:${PORT}` }), open)).toBe(true);
    expect(isRequestAllowed(request('GET', { host: `0.0.0.0:${PORT}` }), open)).toBe(false);
    const noName = { host: '0.0.0.0', port: PORT, publicHost: null };
    expect(isRequestAllowed(request('GET', { host: `outra:${PORT}` }), noName)).toBe(false);
    expect(isRequestAllowed(request('GET', { host: APP_HOST }), noName)).toBe(true);
  });
});

describe('todas as rotas rejeitam Origin e Host de fora, sem efeito', () => {
  const routes: [string, string, (request: Request) => Promise<Response> | Response][] = [
    ['session', 'POST', postSession],
    ['session', 'DELETE', deleteSession],
    ['stream', 'GET', getStream],
    ['input', 'POST', postInput],
    ['resize', 'POST', postResize],
    ['commands', 'POST', postCommand],
    ['demands', 'GET', getDemands],
    ['guide', 'GET', (request) => getGuide(request, paramsOf(INTENT_ID))],
    ['understood', 'POST', (request) => postUnderstood(request, paramsOf(INTENT_ID))],
    ['events', 'GET', getEvents],
  ];

  it.each(routes)('%s %s', async (_name, method, handler) => {
    const { written, harness: h } = withFakePty();
    const body = method === 'GET' ? undefined : { sessionId: 'x', data: 'ls\r' };
    const foreignOrigin = await handler(
      appRequest('/api/x?sessionId=x', {
        method,
        body,
        headers: { origin: 'https://malicioso.example' },
      }),
    );
    expect(foreignOrigin.status).toBe(403);
    expect(await foreignOrigin.json()).toMatchObject({ code: 'origin_rejected' });

    const foreignHost = await handler(
      new Request(`${APP_ORIGIN}/api/x?sessionId=x`, {
        method,
        headers: new Headers({ host: 'malicioso.example', origin: APP_ORIGIN }),
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
    expect(foreignHost.status).toBe(403);
    expect(foreignOrigin.headers.get('access-control-allow-origin')).toBeNull();
    expect(written).toEqual([]);
    expect(h.runtime.terminal.view()).toBeNull();
  });

  it('a lista cobre todos os route.ts do projeto', async () => {
    const { globSync } = await import('node:fs');
    const files = globSync('src/app/api/**/route.ts');
    expect(files.length).toBe(new Set(routes.map((r) => r[0])).size);
    for (const file of files) {
      const source = (await import('node:fs')).readFileSync(file, 'utf8');
      expect(source, file).toContain('rejectForeignRequest(request, runtime.config)');
    }
  });
});

describe('/api/terminal/session', () => {
  it('abre uma sessão e entra nela no pedido seguinte', async () => {
    withFakePty();
    const first = await postSession(appRequest('/api/terminal/session', { body: {} }));
    expect(first.status).toBe(200);
    const session = await first.json();
    expect(session).toMatchObject({ status: 'alive' });
    expect(session.terminalTitle).toMatch(/^MINGW64:/);

    const second = await postSession(appRequest('/api/terminal/session', { body: {} }));
    expect((await second.json()).sessionId).toBe(session.sessionId);
  });

  it('com sessionId antigo depois de reiniciar, cria dead e não abre o shell', async () => {
    const spawned = vi.fn();
    harness = createHarness({
      shell: { path: 'x', searched: ['x'] },
      spawnPty: () => {
        spawned();
        return fakePty().pty;
      },
    });
    const response = await postSession(
      appRequest('/api/terminal/session', { body: { sessionId: 'antigo' } }),
    );
    expect(await response.json()).toMatchObject({
      status: 'dead',
      endReason: 'server_stopped',
    });
    expect(spawned).not.toHaveBeenCalled();
    expect((await guide()).decision).toMatchObject({
      moment: 'session_dead',
      primaryAction: 'new_session',
    });
  });

  it('sem Git Bash responde 503 com o caminho e o guia mostra a falha', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});
    harness = createHarness({ shell: { path: null, searched: ['C:\\Git\\bin\\bash.exe'] } });
    const response = await postSession(appRequest('/api/terminal/session', { body: {} }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe('shell_unavailable');
    expect(body.message).toContain('C:\\Git\\bin\\bash.exe');

    const view = await guide();
    expect(view.repo).toEqual({ health: 'missing_shell', failedPath: 'C:\\Git\\bin\\bash.exe' });
    expect(view.decision.moment).toBe('failure');
    expect(view.content.text).toContain('C:\\Git\\bin\\bash.exe');
    error.mockRestore();
  });

  it('encerrar deixa a sessão dead, e só Nova sessão abre outra', async () => {
    withFakePty();
    const opened = await (
      await postSession(appRequest('/api/terminal/session', { body: {} }))
    ).json();

    const killed = await deleteSession(appRequest('/api/terminal/session', { method: 'DELETE' }));
    expect(killed.status).toBe(204);
    expect((await guide()).decision.moment).toBe('session_dead');

    const reopened = await postSession(appRequest('/api/terminal/session', { body: {} }));
    expect(await reopened.json()).toMatchObject({ status: 'dead', sessionId: opened.sessionId });

    const fresh = await postSession(
      appRequest('/api/terminal/session', { body: { newSession: true } }),
    );
    const session = await fresh.json();
    expect(session.status).toBe('alive');
    expect(session.sessionId).not.toBe(opened.sessionId);
  });

  it('encerrar sem sessão responde 409', async () => {
    withFakePty();
    const response = await deleteSession(appRequest('/api/terminal/session', { method: 'DELETE' }));
    expect(response.status).toBe(409);
  });

  it('recusa corpo malformado', async () => {
    withFakePty();
    const response = await postSession(appRequest('/api/terminal/session', { body: '{ quebrado' }));
    expect(response.status).toBe(422);
    const wrongType = await postSession(
      appRequest('/api/terminal/session', { body: { newSession: 'sim' } }),
    );
    expect(wrongType.status).toBe(422);
  });
});

describe('/api/terminal/input e resize', () => {
  async function openSession() {
    const response = await postSession(appRequest('/api/terminal/session', { body: {} }));
    return (await response.json()).sessionId as string;
  }

  it('escreve o que a pessoa digita', async () => {
    const { written } = withFakePty();
    const sessionId = await openSession();
    const response = await postInput(
      appRequest('/api/terminal/input', { body: { sessionId, data: 'ls\r' } }),
    );
    expect(response.status).toBe(204);
    expect(written).toEqual(['ls\r']);
  });

  it('recusa entrada acima de 64 KB e formato inválido', async () => {
    const { written } = withFakePty();
    const sessionId = await openSession();
    const tooBig = await postInput(
      appRequest('/api/terminal/input', { body: { sessionId, data: 'x'.repeat(64 * 1024 + 1) } }),
    );
    expect(tooBig.status).toBe(422);
    const exact = await postInput(
      appRequest('/api/terminal/input', { body: { sessionId, data: 'x'.repeat(64 * 1024) } }),
    );
    expect(exact.status).toBe(204);
    expect((await postInput(appRequest('/x', { body: { sessionId } }))).status).toBe(422);
    const huge = await postInput(appRequest('/x', { body: 'x'.repeat(2 * 1024 * 1024) }));
    expect(huge.status).toBe(422);
    expect(written).toHaveLength(1);
  });

  it('responde 409 com sessão encerrada ou de outro identificador', async () => {
    const { written } = withFakePty();
    const sessionId = await openSession();
    const other = await postInput(appRequest('/x', { body: { sessionId: 'outra', data: 'ls' } }));
    expect(other.status).toBe(409);
    await deleteSession(appRequest('/x', { method: 'DELETE' }));
    const dead = await postInput(appRequest('/x', { body: { sessionId, data: 'ls' } }));
    expect(dead.status).toBe(409);
    expect(await dead.json()).toMatchObject({ code: 'session_dead' });
    expect(written).toEqual([]);
  });

  it('aceita o tamanho dentro da faixa e recusa fora dela', async () => {
    const resized: number[][] = [];
    withFakePty({ resize: (cols: number, rows: number) => resized.push([cols, rows]) });
    const sessionId = await openSession();
    const ok = await postResize(appRequest('/x', { body: { sessionId, cols: 500, rows: 200 } }));
    expect(ok.status).toBe(204);
    for (const size of [
      { cols: 0, rows: 10 },
      { cols: 501, rows: 10 },
      { cols: 10, rows: 201 },
      { cols: 1.5, rows: 10 },
    ]) {
      const response = await postResize(appRequest('/x', { body: { sessionId, ...size } }));
      expect(response.status).toBe(422);
    }
    expect(resized).toEqual([[500, 200]]);

    const other = await postResize(
      appRequest('/x', { body: { sessionId: 'y', cols: 9, rows: 9 } }),
    );
    expect(other.status).toBe(409);
    await deleteSession(appRequest('/x', { method: 'DELETE' }));
    const dead = await postResize(appRequest('/x', { body: { sessionId, cols: 9, rows: 9 } }));
    expect(dead.status).toBe(409);
  });
});

describe('/api/terminal/stream', () => {
  it('recusa sem sessionId e com afterSeq inválido', async () => {
    withFakePty();
    expect((await getStream(appRequest('/s', { method: 'GET' }))).status).toBe(422);
    const bad = await getStream(appRequest('/s?sessionId=a&afterSeq=-1', { method: 'GET' }));
    expect(bad.status).toBe(422);
  });

  it('informa ended quando a sessão não é a atual', async () => {
    withFakePty();
    const response = await getStream(appRequest('/s?sessionId=outra', { method: 'GET' }));
    const events = await readSse(response, (e) => e.length > 0);
    expect(events[0]).toEqual({ event: 'ended', data: { reason: 'server_stopped' } });
  });

  it('entrega a saída real do Git Bash a duas conexões, com seq', async () => {
    harness = createHarness();
    const { sessionId } = await (await postSession(appRequest('/x', { body: {} }))).json();

    const url = `/s?sessionId=${sessionId}`;
    const reading = [
      getStream(appRequest(url, { method: 'GET' })),
      getStream(appRequest(url, { method: 'GET' })),
    ].map((response) =>
      readSse(response, (events) =>
        events.some((e) => e.event === 'output' && String(e.data.data).includes('SSE_42')),
      ),
    );
    await postInput(appRequest('/x', { body: { sessionId, data: 'echo SSE_$((40+2))\r' } }));
    const [a, b] = await Promise.all(reading);
    for (const events of [a, b]) {
      expect(events?.[0]?.event).toBe('reset');
      const outputs = events?.filter((e) => e.event === 'output') ?? [];
      expect(outputs.map((e) => String(e.data.data)).join('')).toContain('SSE_42');
      const seqs = outputs.map((e) => e.data.seq as number);
      expect([...seqs].sort((x, y) => x - y)).toEqual(seqs);
    }
  });

  it('avisa ended ao encerrar e ao reconectar numa sessão encerrada', async () => {
    withFakePty();
    const { sessionId } = await (await postSession(appRequest('/x', { body: {} }))).json();
    const url = `/s?sessionId=${sessionId}`;
    const live = readSse(await getStream(appRequest(url, { method: 'GET' })), (events) =>
      events.some((e) => e.event === 'ended'),
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    await deleteSession(appRequest('/x', { method: 'DELETE' }));
    expect((await live).at(-1)).toEqual({ event: 'ended', data: { reason: 'killed' } });

    const after = await readSse(await getStream(appRequest(url, { method: 'GET' })), (events) =>
      events.some((e) => e.event === 'ended'),
    );
    expect(after.at(-1)).toEqual({ event: 'ended', data: { reason: 'killed' } });
  });

  it('um ouvinte que cai sai da lista', async () => {
    const dataListeners: ((data: string) => void)[] = [];
    withFakePty({
      onData: (listener: (data: string) => void) => {
        dataListeners.push(listener);
        return { dispose: () => {} };
      },
    });
    const { sessionId } = await (await postSession(appRequest('/x', { body: {} }))).json();
    const controller = new AbortController();
    const request = new Request(`${APP_ORIGIN}/s?sessionId=${sessionId}`, {
      method: 'GET',
      headers: new Headers({ host: APP_HOST }),
      signal: controller.signal,
    });
    const response = await getStream(request);
    controller.abort();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(() => dataListeners[0]?.('depois de cair')).not.toThrow();
    await response.body?.cancel().catch(() => {});
  });
});

describe('/api/demands e guia', () => {
  it('lista as demandas e indica a ativa', async () => {
    withFakePty();
    const response = await getDemands(appRequest('/d', { method: 'GET' }));
    expect(await response.json()).toMatchObject({
      repo: { health: 'ok' },
      activeIntentId: INTENT_ID,
      demands: [{ intentId: INTENT_ID, isActive: true, readable: true }],
    });
  });

  it('sem intent ativo, não há demanda ativa', async () => {
    const { harness: h } = withFakePty();
    rmSync(path.join(h.repo.intentsDir, 'active-intent'));
    const body = await (await getDemands(appRequest('/d', { method: 'GET' }))).json();
    expect(body).toMatchObject({ repo: { health: 'ok' }, activeIntentId: null });
  });

  it('informa a falha sem aidlc/', async () => {
    const { harness: h } = withFakePty();
    h.runtime.config.repoRoot = tempDir();
    const { AidlcReader } = await import('@/aidlc/reader');
    h.runtime.reader = new AidlcReader(h.runtime.config.repoRoot);
    const body = await (await getDemands(appRequest('/d', { method: 'GET' }))).json();
    expect(body.repo.health).toBe('missing_aidlc');
    expect(body.demands).toEqual([]);
  });

  it('mostra a etapa, a trilha e o momento Entender, com dados dos arquivos', async () => {
    withFakePty();
    await postSession(appRequest('/x', { body: {} }));
    const view = await guide();
    expect(view.stage).toEqual({
      slug: STAGE,
      name: 'Projeto funcional',
      number: '3.1',
      mark: 'in_progress',
    });
    expect(view.decision).toMatchObject({ moment: 'understand', turn: 'person', canSend: false });
    expect(view.content.primaryLabel).toBe('Entendi, continuar');
    expect(view.command).toBe('/aidlc');

    const construction = view.trail.find((phase) => phase.name === 'construction');
    expect(construction).toMatchObject({ label: 'Construção', isCurrent: true, done: 0 });
    expect(construction?.stages[0]).toMatchObject({ slug: STAGE, status: 'now' });
    const ideation = view.trail.find((phase) => phase.name === 'ideation');
    expect(ideation).toMatchObject({ done: 4, total: 4, isCurrent: false });
    expect(ideation?.stages.find((s) => s.slug === 'market-research')?.status).toBe('skipped');
  });

  it('Entendi avança para Enviar e recusa uma etapa desatualizada', async () => {
    withFakePty();
    await postSession(appRequest('/x', { body: {} }));
    const stale = await postUnderstood(
      appRequest('/x', { body: { stageSlug: 'outra' } }),
      paramsOf(INTENT_ID),
    );
    expect(stale.status).toBe(409);
    expect((await guide()).decision.moment).toBe('understand');

    const malformed = await postUnderstood(appRequest('/x', { body: {} }), paramsOf(INTENT_ID));
    expect(malformed.status).toBe(422);

    const ok = await postUnderstood(
      appRequest('/x', { body: { stageSlug: STAGE } }),
      paramsOf(INTENT_ID),
    );
    expect((await ok.json()).decision).toMatchObject({ moment: 'send', canSend: true });
  });

  it('com registro ilegível, o momento é falha e o terminal segue', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const { harness: h } = withFakePty();
    writeFileSync(h.repo.statePath, 'pela metade');
    const view = await guide();
    expect(view.decision.moment).toBe('failure');
    expect(view.repo).toEqual({ health: 'unreadable_record', failedPath: h.repo.statePath });
    expect(view.content.text).toContain(h.repo.statePath);
    const body = await (await getDemands(appRequest('/d', { method: 'GET' }))).json();
    expect(body.repo.health).toBe('unreadable_record');
    warn.mockRestore();
  });

  it('com leitura falhando, mantém a última válida e marca como desatualizada', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const { harness: h } = withFakePty();
    await postSession(appRequest('/x', { body: {} }));
    expect((await guide()).stale).toBe(false);
    writeFileSync(h.repo.statePath, 'pela metade');
    const view = await guide();
    expect(view.stale).toBe(true);
    expect(view.stage.slug).toBe(STAGE);
    warn.mockRestore();
  });

  it('marca desconhecida fica em following, sem afirmar aprovação', async () => {
    const { harness: h } = withFakePty();
    await postSession(appRequest('/x', { body: {} }));
    writeFileSync(h.repo.statePath, withMark(REAL_STATE, STAGE, 'Z'));
    const view = await guide();
    expect(view.decision).toMatchObject({ moment: 'following', turn: 'person', canSend: false });
    expect(view.content.text).toBe('Confira o terminal: a sua IA pode estar esperando por você.');
  });
});

describe('/api/commands', () => {
  it('sem confirmação nada é escrito: Entender e a tela sem commandId', async () => {
    const { written, harness: h } = withFakePty();
    await postSession(appRequest('/x', { body: {} }));
    const notConfirmed = await postCommand(
      appRequest('/x', { body: { ...commandBody(), commandId: undefined } }),
    );
    expect(notConfirmed.status).toBe(422);
    const notSendMoment = await postCommand(appRequest('/x', { body: commandBody() }));
    expect(notSendMoment.status).toBe(409);
    expect(await notSendMoment.json()).toMatchObject({ code: 'not_send_moment' });
    expect(written).toEqual([]);
    expect(h.db.all('SELECT * FROM sent_command')).toEqual([]);
  });

  it('Enviar agora escreve com Enter, grava written e os valores da releitura', async () => {
    const { written, harness: h } = withFakePty();
    await reachSendMoment();
    const body = commandBody({ text: 'echo editado' });
    const response = await postCommand(appRequest('/x', { body }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'written', mode: 'execute' });
    expect(written).toEqual(['echo editado\r']);
    expect(h.runtime.commands.find(body.commandId)).toMatchObject({
      status: 'written',
      intentId: INTENT_ID,
      stageSlug: STAGE,
      mode: 'execute',
      text: 'echo editado',
    });
    expect(h.runtime.progress.find(INTENT_ID, STAGE)?.currentStep).toBe('follow');
    expect((await guide()).decision).toMatchObject({ moment: 'following', turn: 'ai' });
  });

  it('Colar sem executar escreve sem Enter e fica em pasted', async () => {
    const { written } = withFakePty();
    await reachSendMoment();
    const response = await postCommand(
      appRequest('/x', { body: commandBody({ text: '/aidlc', mode: 'paste' }) }),
    );
    expect(response.status).toBe(200);
    expect(written).toEqual(['/aidlc']);
    expect((await guide()).decision.moment).toBe('pasted');
  });

  it('colado vira executado quando aidlc-state.md muda depois do envio', async () => {
    const { harness: h } = withFakePty();
    await reachSendMoment();
    await postCommand(appRequest('/x', { body: commandBody({ mode: 'paste' }) }));
    const later = new Date(Date.now() + 5000);
    utimesSync(h.repo.statePath, later, later);
    expect((await guide()).decision).toMatchObject({ moment: 'following', turn: 'ai' });
  });

  it('um commandId repetido responde 200 sem escrever de novo', async () => {
    const { written } = withFakePty();
    await reachSendMoment();
    const body = commandBody();
    await postCommand(appRequest('/x', { body }));
    const again = await postCommand(appRequest('/x', { body }));
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ status: 'written', duplicate: true });
    expect(written).toHaveLength(1);
  });

  it('responde 409 stale_screen quando a tela está em outra etapa ou demanda', async () => {
    const { written, harness: h } = withFakePty();
    await reachSendMoment();
    for (const overrides of [{ stageSlug: 'nfr-design' }, { intentId: 'outra-demanda' }]) {
      const response = await postCommand(appRequest('/x', { body: commandBody(overrides) }));
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code: 'stale_screen' });
    }
    rmSync(path.join(h.repo.intentsDir, 'active-intent'));
    const none = await postCommand(appRequest('/x', { body: commandBody() }));
    expect(await none.json()).toMatchObject({ code: 'stale_screen' });
    expect(written).toEqual([]);
  });

  it('não libera o envio com base em uma leitura antiga', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const { written, harness: h } = withFakePty();
    await reachSendMoment();
    expect((await guide()).decision.canSend).toBe(true);
    writeFileSync(h.repo.statePath, 'pela metade');
    const response = await postCommand(appRequest('/x', { body: commandBody() }));
    expect(await response.json()).toMatchObject({ code: 'stale_screen' });
    expect(written).toEqual([]);
    warn.mockRestore();
  });

  it('responde 409 session_dead com a sessão encerrada', async () => {
    const { written } = withFakePty();
    await reachSendMoment();
    await deleteSession(appRequest('/x', { method: 'DELETE' }));
    const response = await postCommand(appRequest('/x', { body: commandBody() }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: 'session_dead' });
    expect(written).toEqual([]);
  });

  it('responde 409 repo_failure com o registro ilegível', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const { written, harness: h } = withFakePty();
    await postSession(appRequest('/x', { body: {} }));
    writeFileSync(h.repo.statePath, 'pela metade');
    const response = await postCommand(appRequest('/x', { body: commandBody() }));
    expect(await response.json()).toMatchObject({ code: 'repo_failure' });
    expect(written).toEqual([]);
    warn.mockRestore();
  });

  it('responde 409 not_send_moment com a marca aprovada, sem liberar outro envio', async () => {
    const { written, harness: h } = withFakePty();
    await reachSendMoment();
    writeFileSync(h.repo.statePath, withMark(REAL_STATE, STAGE, 'x'));
    const response = await postCommand(appRequest('/x', { body: commandBody() }));
    expect(await response.json()).toMatchObject({ code: 'not_send_moment' });
    expect(written).toEqual([]);
  });

  it('com a escrita falhando, grava failed, responde 500 e não vaza o texto nos logs', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { harness: h } = withFakePty({
      write: () => {
        throw new Error('pipe fechado');
      },
    });
    await reachSendMoment();
    const body = commandBody({ text: 'echo SEGREDO_NO_COMANDO' });
    const response = await postCommand(appRequest('/x', { body }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: 'write_failed' });
    expect(h.runtime.commands.find(body.commandId)?.status).toBe('failed');
    const logged = error.mock.calls.map((call) => call.join(' ')).join('\n');
    expect(logged).toContain(body.commandId);
    expect(logged).not.toContain('SEGREDO_NO_COMANDO');
    expect((await guide()).decision.moment).toBe('send');
    error.mockRestore();
  });

  it('se o registro falha depois da escrita, avisa que não sabe se chegou', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const { written, harness: h } = withFakePty();
    await reachSendMoment();
    vi.spyOn(h.runtime.commands, 'markWritten').mockImplementation(() => {
      throw new Error('banco travado');
    });
    const response = await postCommand(appRequest('/x', { body: commandBody() }));
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: 'unknown_delivery' });
    expect(written).toHaveLength(1);
    error.mockRestore();
  });

  it.each([
    ['commandId que não é uuid', { commandId: 'abc' }],
    ['quebra de linha', { text: 'echo a\necho b' }],
    ['retorno de carro', { text: 'echo a\rrm -rf' }],
    ['texto vazio', { text: '' }],
    ['só espaços', { text: '   ' }],
    ['acima de 8000', { text: 'x'.repeat(8001) }],
    ['modo inválido', { mode: 'run' }],
  ])('recusa entrada malformada: %s', async (_name, overrides) => {
    const { written } = withFakePty();
    await reachSendMoment();
    const response = await postCommand(appRequest('/x', { body: commandBody(overrides) }));
    expect(response.status).toBe(422);
    expect(written).toEqual([]);
  });

  it('um comando vindo de artefato só chega ao terminal pela rota confirmada', async () => {
    const { harness: h, written } = withFakePty();
    await postSession(appRequest('/x', { body: {} }));
    writeFileSync(path.join(h.repo.recordDir, 'artefato.md'), '/aidlc rm -rf\n');
    await guide();
    expect(written).toEqual([]);
  });
});

describe('/api/events', () => {
  it('avisa quando um arquivo do intent ativo muda', async () => {
    const { harness: h } = withFakePty();
    const response = await getEvents(appRequest('/e', { method: 'GET' }));
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const reading = readSse(response, (events) => events.length > 0);
    await new Promise((resolve) => setTimeout(resolve, 50));
    writeFileSync(path.join(h.repo.recordDir, 'novo.md'), 'x');
    const events = await reading;
    expect(events[0]).toMatchObject({ event: 'changed', data: { intentId: INTENT_ID } });
  });

  it('avisa quando a sessão muda de estado', async () => {
    withFakePty();
    const response = await getEvents(appRequest('/e', { method: 'GET' }));
    const reading = readSse(response, (events) => events.length > 0);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await postSession(appRequest('/x', { body: {} }));
    expect((await reading)[0]).toMatchObject({ event: 'changed', data: { intentId: null } });
  });
});
