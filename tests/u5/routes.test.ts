import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getEvents } from '@/app/api/events/route';
import { POST as postRecheck } from '@/app/api/repo/recheck/route';
import { logger } from '@/config/logger';
import { prepareStorage } from '@/db/storage';
import { replaceTerminalManager } from '@/terminal/registry';
import { getRuntime, installRuntime, refreshRuntime, type Runtime } from '@/web/runtime';
import { createAidlcRepo } from '../u1/aidlc-fixture';
import { tempDir } from '../u1/helpers';
import { APP_HOST, APP_ORIGIN, appRequest } from '../u1/routes-harness';

vi.mock('node:fs', async (importOriginal) => {
  const { hideStrayAidlc } = await import('./no-stray-aidlc');
  return hideStrayAidlc(await importOriginal<typeof import('node:fs')>());
});

vi.mock('@/db/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/storage')>();
  return { ...actual, prepareStorage: vi.fn(actual.prepareStorage) };
});

const originalCwd = process.cwd();
const created: Runtime[] = [];

/** Repositório real do AI-DLC com a subpasta do produto dentro, e um jeito de apagar e voltar o aidlc/. */
function setup(productParent = '') {
  const repo = createAidlcRepo('Projeto ação');
  const product = path.join(repo.root, productParent, 'vibes-dlc');
  mkdirSync(product, { recursive: true });
  const backup = path.join(tempDir(), 'aidlc-copia');
  cpSync(path.join(repo.root, 'aidlc'), backup, { recursive: true });
  vi.stubEnv('VIBES_PRODUCT_DIR', product);
  vi.stubEnv('VIBES_SHELL', process.execPath);
  vi.stubEnv('PORT', '3456');
  process.chdir(product);
  return {
    repo,
    removeAidlc: () => rmSync(path.join(repo.root, 'aidlc'), { recursive: true, force: true }),
    restoreAidlc: () => cpSync(backup, path.join(repo.root, 'aidlc'), { recursive: true }),
  };
}

function track(runtime: Runtime): Runtime {
  created.push(runtime);
  return runtime;
}

beforeEach(() => {
  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
  for (const runtime of created.splice(0)) runtime.dispose?.();
  installRuntime(undefined);
  replaceTerminalManager(undefined);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  process.chdir(originalCwd);
});

const recheck = (init: Parameters<typeof appRequest>[1] = {}) =>
  postRecheck(appRequest('/api/repo/recheck', init));

describe('POST /api/repo/recheck', () => {
  it('sem AI-DLC devolve a falha e, depois de instalar, a saúde ok e a raiz', async () => {
    const { repo, removeAidlc, restoreAidlc } = setup();
    removeAidlc();
    track(getRuntime());

    const missing = await recheck();
    expect(missing.status).toBe(200);
    const failure = (await missing.json()) as { repo: { health: string; failedPath: string } };
    expect(failure.repo.health).toBe('missing_aidlc');
    expect(failure.repo.failedPath).toBe('aidlc');

    restoreAidlc();
    const found = await recheck();
    expect(await found.json()).toEqual({
      repo: { health: 'ok', failedPath: null },
      repoRoot: repo.root,
      staleSessionFolder: null,
    });
    track(getRuntime());
  });

  it('apagado o aidlc/, volta à falha na mesma chamada, sem reiniciar', async () => {
    const { repo, removeAidlc } = setup();
    track(getRuntime());
    expect(getRuntime().config.repoRoot).toBe(repo.root);
    removeAidlc();
    const response = await recheck();
    const body = (await response.json()) as { repo: { health: string }; repoRoot: string | null };
    expect(body.repo.health).toBe('missing_aidlc');
    expect(body.repoRoot).toBeNull();
    track(getRuntime());
  });

  it('sem o Git Bash, devolve missing_shell com o caminho procurado', async () => {
    const { repo } = setup();
    track(getRuntime());
    vi.stubEnv('VIBES_SHELL', path.join(repo.root, 'nao-existe', 'bash.exe'));
    const body = (await (await recheck()).json()) as {
      repo: { health: string; failedPath: string };
    };
    expect(body.repo.health).toBe('missing_shell');
    expect(body.repo.failedPath).toContain('bash.exe');
  });

  it('Origin e Host de fora recebem 403 e nada é reavaliado', async () => {
    const { repo, removeAidlc } = setup();
    const before = track(getRuntime());
    removeAidlc();

    const foreignOrigin = await recheck({ headers: { origin: 'https://malicioso.example' } });
    expect(foreignOrigin.status).toBe(403);
    expect(await foreignOrigin.json()).toMatchObject({ code: 'origin_rejected' });

    const foreignHost = await postRecheck(
      new Request(`${APP_ORIGIN}/api/repo/recheck`, {
        method: 'POST',
        headers: new Headers({ host: 'malicioso.example', origin: APP_ORIGIN }),
      }),
    );
    expect(foreignHost.status).toBe(403);

    const noOrigin = await recheck({ headers: { 'x-no-origin': '1' } });
    expect(noOrigin.status).toBe(403);
    expect(getRuntime()).toBe(before);
    expect(getRuntime().config.repoRoot).toBe(repo.root);
  });

  it('com uma sessão viva aberta na pasta antiga, devolve essa pasta; sem sessão, nada', async () => {
    const { repo, removeAidlc } = setup('ferramentas');
    const runtime = track(getRuntime());
    vi.stubEnv('VIBES_SHELL', '');
    const before = await (await recheck()).json();
    expect(before.staleSessionFolder).toBeNull();

    expect(runtime.terminal.openOrJoin().status).toBe('alive');
    expect(runtime.terminal.aliveSessionCwd()).toBe(repo.root);
    const sameRoot = await (await recheck()).json();
    expect(sameRoot.staleSessionFolder).toBeNull();

    // Sem aidlc/, as próximas sessões abririam na pasta pai do produto, e a viva ficou na raiz antiga.
    removeAidlc();
    const changed = await (await recheck()).json();
    expect(changed.repoRoot).toBeNull();
    expect(changed.staleSessionFolder).toBe(repo.root);

    runtime.terminal.kill();
    const afterKill = await (await recheck()).json();
    expect(afterKill.staleSessionFolder).toBeNull();
    track(getRuntime());
  });

  it('se a reavaliação falhar, responde 500 em português e mantém o runtime atual', async () => {
    const { repo, removeAidlc, restoreAidlc } = setup();
    removeAidlc();
    const before = track(getRuntime());
    restoreAidlc();
    vi.mocked(prepareStorage).mockImplementationOnce(() => {
      throw new Error('disco cheio');
    });

    const response = await recheck();
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      code: 'recheck_failed',
      message: expect.stringContaining('Não foi possível verificar o projeto de novo'),
    });
    expect(getRuntime()).toBe(before);

    const retry = await recheck();
    expect(retry.status).toBe(200);
    expect(getRuntime().config.repoRoot).toBe(repo.root);
    track(getRuntime());
  });
});

type Reader = ReadableStreamDefaultReader<Uint8Array>;

/** Lê até a condição valer ou o fluxo acabar, e diz se o fluxo acabou. */
async function readUntil(
  reader: Reader,
  done: (text: string) => boolean,
  timeoutMs: number,
): Promise<{ text: string; ended: boolean }> {
  const decoder = new TextDecoder();
  let text = '';
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && !done(text)) {
    const next = await Promise.race([
      reader.read(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), deadline - Date.now())),
    ]);
    if (next === null) break;
    if (next.done) return { text, ended: true };
    text += decoder.decode(next.value, { stream: true });
  }
  return { text, ended: false };
}

describe('GET /api/events com a troca do runtime', () => {
  it('encerra o fluxo aberto na troca, e a conexão nova recebe eventos do leitor novo', async () => {
    const { repo, removeAidlc, restoreAidlc } = setup();
    track(getRuntime());
    const eventsRequest = () =>
      new Request(`${APP_ORIGIN}/api/events`, { headers: { host: APP_HOST } });

    const open = getEvents(eventsRequest());
    expect(open.status).toBe(200);
    const openReader = (open.body as ReadableStream<Uint8Array>).getReader();

    removeAidlc();
    track(await refreshRuntime());
    const closed = await readUntil(openReader, () => false, 5000);
    expect(closed.ended).toBe(true);

    restoreAidlc();
    track(await refreshRuntime());
    const fresh = getEvents(eventsRequest());
    const freshReader = (fresh.body as ReadableStream<Uint8Array>).getReader();
    // O vigia compara assinaturas a cada segundo: mexer no cursor do espaço aparece como mudança.
    await new Promise((resolve) => setTimeout(resolve, 300));
    writeFileSync(path.join(repo.root, 'aidlc', 'active-space'), 'default\n# mudou\n');
    const received = await readUntil(freshReader, (text) => text.includes('event: changed'), 8000);
    expect(received.text).toContain('event: changed');
    await freshReader.cancel();
  }, 30_000);

  it('rejeita Origin de fora com 403', () => {
    setup();
    track(getRuntime());
    const response = getEvents(
      new Request(`${APP_ORIGIN}/api/events`, {
        headers: { host: 'malicioso.example', origin: 'https://malicioso.example' },
      }),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});
