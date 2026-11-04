import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as postMedia } from '@/app/api/customization/media/route';
import { logger } from '@/config/logger';
import { DatabaseClosedError } from '@/db/database';
import { prepareStorage } from '@/db/storage';
import { replaceTerminalManager } from '@/terminal/registry';
import { jsonResponse } from '@/web/responses';
import {
  DISPOSE_DELAY_MS,
  getRuntime,
  installRuntime,
  onRuntimeChange,
  refreshRuntime,
  terminalPidFile,
  type Runtime,
} from '@/web/runtime';
import { guardRuntimeChange } from '@/web/runtime-guard';
import { APP_HOST, APP_ORIGIN } from '../u1/routes-harness';
import { tempDir } from '../u1/helpers';
import { mediaBytes } from '../u4/helpers';

vi.mock('node:fs', async (importOriginal) => {
  const { hideStrayAidlc } = await import('./no-stray-aidlc');
  return hideStrayAidlc(await importOriginal<typeof import('node:fs')>());
});

// Falha de montagem injetada por substituição do módulo, só nos testes de unidade.
vi.mock('@/db/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/storage')>();
  return { ...actual, prepareStorage: vi.fn(actual.prepareStorage) };
});

const originalCwd = process.cwd();
const created: Runtime[] = [];

function track(runtime: Runtime): Runtime {
  created.push(runtime);
  return runtime;
}

function setup() {
  const project = path.join(tempDir(), 'Projeto ação');
  const product = path.join(project, 'vibes-dlc');
  mkdirSync(product, { recursive: true });
  vi.stubEnv('VIBES_PRODUCT_DIR', product);
  vi.stubEnv('PORT', '3456');
  process.chdir(product);
  return {
    project,
    product,
    installAidlc: () => mkdirSync(path.join(project, 'aidlc'), { recursive: true }),
    removeAidlc: () => rmSync(path.join(project, 'aidlc'), { recursive: true, force: true }),
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  for (const runtime of created.splice(0)) runtime.dispose?.();
  installRuntime(undefined);
  replaceTerminalManager(undefined);
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  process.chdir(originalCwd);
});

describe('runtime sem raiz', () => {
  it('usa um banco em memória e não cria .vibes/ em lugar nenhum', () => {
    const { project, product } = setup();
    const runtime = track(getRuntime());
    expect(runtime.config).toMatchObject({ repoRoot: null, dbPath: null, mediaDir: null });
    expect(runtime.commands.find('qualquer')).toBeNull();
    expect(existsSync(path.join(project, '.vibes'))).toBe(false);
    expect(readdirSync(product)).toEqual([]);
    expect(terminalPidFile(runtime.config)).toBeNull();
  });

  it('recusa o envio de imagem com 409, mensagem em português, sem criar nada', async () => {
    const { project, product } = setup();
    const target = path.join(tempDir(), 'destino-do-banco');
    vi.stubEnv('VIBES_DB_PATH', path.join(target, 'x.db'));
    const runtime = track(getRuntime());
    const { visitId } = await runtime.customization.openVisit();

    const boundary = '----vibes-u5';
    const head = `--${boundary}\r\nContent-Disposition: form-data; name="momentKey"\r\n\r\nhome\r\n--${boundary}\r\nContent-Disposition: form-data; name="visitId"\r\n\r\n${visitId}\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: image/png\r\n\r\n`;
    const body = Buffer.concat([
      Buffer.from(head),
      Buffer.from(mediaBytes('png')),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const response = await postMedia(
      new Request(`${APP_ORIGIN}/api/customization/media`, {
        method: 'POST',
        headers: {
          host: APP_HOST,
          origin: APP_ORIGIN,
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: 'no_storage',
      message: expect.stringContaining('Sem o AI-DLC no projeto não há onde guardar a imagem'),
    });
    expect(existsSync(target)).toBe(false);
    expect(existsSync(path.join(project, '.vibes'))).toBe(false);
    expect(readdirSync(product)).toEqual([]);
  });

  it('os textos de Personalizar funcionam, só em memória', async () => {
    setup();
    const runtime = track(getRuntime());
    const { visitId } = await runtime.customization.openVisit();
    await runtime.customization.put(visitId, { cliKind: 'other' });
    expect(runtime.customization.read().cliKind).toBe('other');
    await expect(runtime.customization.sweep()).resolves.toEqual({ removed: 0, aborted: false });
    expect(runtime.customization.mediaFile('11111111-2222-4333-8444-555555555555')).toBeNull();
  });
});

describe('refreshRuntime', () => {
  it('troca de sem raiz para uma raiz, cria .vibes/ na raiz e fecha o antigo depois da folga', async () => {
    const { project, product, installAidlc } = setup();
    const old = track(getRuntime());
    const closeReader = vi.spyOn(old.reader, 'close');
    installAidlc();

    const next = track(await refreshRuntime());
    expect(next).not.toBe(old);
    expect(next.config.repoRoot).toBe(project);
    expect(existsSync(path.join(project, '.vibes', 'vibes.db'))).toBe(true);
    expect(existsSync(path.join(product, '.vibes'))).toBe(false);
    expect(getRuntime()).toBe(next);
    // O vigia antigo para na hora, mas o banco antigo espera a folga das rotas em voo.
    expect(closeReader).toHaveBeenCalledTimes(1);
    expect(old.commands.find('x')).toBeNull();
    vi.advanceTimersByTime(DISPOSE_DELAY_MS);
    expect(() => old.commands.find('x')).toThrow(DatabaseClosedError);
    expect(next.commands.find('x')).toBeNull();
  });

  it('volta de uma raiz para nenhuma e de novo para uma raiz', async () => {
    const { project, installAidlc, removeAidlc } = setup();
    installAidlc();
    const first = track(getRuntime());
    expect(first.config.repoRoot).toBe(project);

    removeAidlc();
    const none = track(await refreshRuntime());
    expect(none.config).toMatchObject({ repoRoot: null, dbPath: null });

    installAidlc();
    const again = track(await refreshRuntime());
    expect(again.config.repoRoot).toBe(project);
    vi.advanceTimersByTime(DISPOSE_DELAY_MS);
    expect(() => first.commands.find('x')).toThrow(DatabaseClosedError);
    expect(() => none.commands.find('x')).toThrow(DatabaseClosedError);
    expect(again.commands.find('x')).toBeNull();
  });

  it('duas chamadas simultâneas montam um só runtime e fecham o antigo uma vez', async () => {
    const { installAidlc } = setup();
    const old = track(getRuntime());
    const dispose = vi.spyOn(old, 'dispose');
    const changes = vi.fn();
    onRuntimeChange(changes);
    installAidlc();

    const [first, second] = await Promise.all([refreshRuntime(), refreshRuntime()]);
    track(first);
    expect(second).toBe(first);
    expect(changes).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(DISPOSE_DELAY_MS * 2);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('com a mesma raiz, só devolve o runtime atual', async () => {
    const { installAidlc } = setup();
    installAidlc();
    const current = track(getRuntime());
    const changes = vi.fn();
    onRuntimeChange(changes);
    expect(await refreshRuntime()).toBe(current);
    expect(changes).not.toHaveBeenCalled();
  });

  it('se a montagem falhar, o antigo continua valendo e a próxima tentativa funciona', async () => {
    const { project, installAidlc } = setup();
    const old = track(getRuntime());
    installAidlc();
    vi.mocked(prepareStorage).mockImplementationOnce(() => {
      throw new Error('disco cheio');
    });

    await expect(refreshRuntime()).rejects.toThrow('disco cheio');
    expect(getRuntime()).toBe(old);
    expect(old.commands.find('x')).toBeNull();

    const next = track(await refreshRuntime());
    expect(next.config.repoRoot).toBe(project);
  });

  it('o aviso de troca pode ser cancelado', async () => {
    const { installAidlc } = setup();
    track(getRuntime());
    const changes = vi.fn();
    const stop = onRuntimeChange(changes);
    stop();
    installAidlc();
    track(await refreshRuntime());
    expect(changes).not.toHaveBeenCalled();
  });
});

describe('rota em voo durante a troca', () => {
  it('termina com 503 e a mensagem, sem perder a escrita em silêncio', async () => {
    const { installAidlc } = setup();
    const old = track(getRuntime());
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const route = guardRuntimeChange(async () => {
      await gate;
      return jsonResponse(old.commands.find('x'));
    });

    const inFlight = route();
    installAidlc();
    track(await refreshRuntime());
    vi.advanceTimersByTime(DISPOSE_DELAY_MS);
    release();

    const response = await inFlight;
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: 'runtime_changed',
      message: 'A raiz mudou. Tente de novo.',
    });
  });

  it('outros erros seguem para o tratamento normal', async () => {
    const route = guardRuntimeChange(() => {
      throw new Error('outro erro');
    });
    await expect(route()).rejects.toThrow('outro erro');
  });

  it('uma rota que termina antes da troca devolve a resposta normal', async () => {
    const route = guardRuntimeChange(() => jsonResponse({ ok: true }));
    const response = await route();
    expect(response.status).toBe(200);
  });
});
