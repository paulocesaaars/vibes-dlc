import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RootLayout from '@/app/layout';
import { loadConfig } from '@/config/app-config';
import { logger } from '@/config/logger';
import { Database } from '@/db/database';
import { SentCommandRepo } from '@/db/sent-command-repo';
import { prepareStorage } from '@/db/storage';
import {
  announceAddress,
  buildNextArgs,
  buildNextEnv,
  parseMode,
  prepareStart,
  StartupError,
} from '@/web/bootstrap';
import { getRuntime, installRuntime } from '@/web/runtime';
import { replaceTerminalManager } from '@/terminal/registry';
import { tempDir } from './helpers';

function repo(): string {
  const root = path.join(tempDir(), 'repo');
  mkdirSync(path.join(root, 'aidlc'), { recursive: true });
  return root;
}

afterEach(() => vi.restoreAllMocks());

describe('início do processo', () => {
  it('escuta por padrão em 127.0.0.1, passando o endereço ao Next', () => {
    const config = loadConfig({}, repo());
    expect(buildNextArgs('dev', config)).toEqual([
      'dev',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3000',
    ]);
    expect(buildNextArgs('start', { ...config, port: 4000 })).toEqual([
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      '4000',
    ]);
    expect(buildNextArgs('build', config)).toEqual(['build']);
  });

  it('desliga a telemetria e recusa fetch para fora da máquina', () => {
    const env = buildNextEnv(loadConfig({}, repo()), { NODE_OPTIONS: '--max-old-space-size=512' });
    expect(env.NEXT_TELEMETRY_DISABLED).toBe('1');
    expect(env.VIBES_HOST).toBe('127.0.0.1');
    expect(env.NODE_OPTIONS).toContain('--max-old-space-size=512');
    expect(env.NODE_OPTIONS).toContain('no-network.cjs');
  });

  it('recusa um modo desconhecido', () => {
    expect(parseMode('dev')).toBe('dev');
    expect(() => parseMode('outro')).toThrow(StartupError);
    expect(() => parseMode(undefined)).toThrow(StartupError);
  });

  it('prepara o banco antes de escutar e registra o endereço', () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => {});
    const root = repo();
    const config = prepareStart({}, root);
    expect(existsSync(path.join(root, '.vibes', 'vibes.db'))).toBe(true);
    expect(info).toHaveBeenCalledWith('inicio', `Painel em http://127.0.0.1:${config.port}`);
  });

  it('interrompe com variável inválida, antes de criar o banco', () => {
    const root = repo();
    expect(() => prepareStart({ PORT: 'abc' }, root)).toThrow(/PORT/);
    expect(existsSync(path.join(root, '.vibes'))).toBe(false);
  });

  it('passa a failed o que ficou em pending, antes de escutar', () => {
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    const root = repo();
    const dbPath = path.join(root, '.vibes', 'vibes.db');
    const db = prepareStorage(dbPath);
    new SentCommandRepo(db).insertPending({
      commandId: 'c1',
      intentId: 'i',
      stageSlug: 's',
      text: 't',
      mode: 'execute',
    });
    db.close();

    prepareStart({}, root);
    const reopened = new Database(dbPath);
    expect(new SentCommandRepo(reopened).find('c1')?.status).toBe('failed');
    reopened.close();
  });

  it('avisa fora de 127.0.0.1 e sem VIBES_PUBLIC_HOST', () => {
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const config = loadConfig({ VIBES_HOST: '0.0.0.0' }, repo());
    announceAddress(config);
    expect(warn.mock.calls.map((call) => call[1]).join(' ')).toMatch(/exposto em 0\.0\.0\.0/);
    expect(warn.mock.calls.map((call) => call[1]).join(' ')).toMatch(/VIBES_PUBLIC_HOST/);
  });

  it('não avisa em 127.0.0.1', () => {
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    announceAddress(loadConfig({}, repo()));
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('alerta permanente no layout', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('aparece em todas as telas com outro endereço de escuta', () => {
    vi.stubEnv('VIBES_HOST', '0.0.0.0');
    const html = renderToStaticMarkup(RootLayout({ children: 'tela' }));
    expect(html).toContain('role="alert"');
    expect(html).toContain('0.0.0.0');
    expect(html).toContain('tela');
  });

  it('não aparece com o padrão, e a página é em português', () => {
    vi.stubEnv('VIBES_HOST', '');
    const html = renderToStaticMarkup(RootLayout({ children: 'tela' }));
    expect(html).not.toContain('role="alert"');
    expect(html).toContain('lang="pt-BR"');
  });
});

describe('runtime em globalThis', () => {
  afterEach(() => {
    installRuntime(undefined);
    replaceTerminalManager(undefined);
  });

  it('cria as peças uma vez e devolve as mesmas para todas as rotas', () => {
    const cwd = process.cwd();
    const root = repo();
    process.chdir(root);
    try {
      const first = getRuntime();
      expect(getRuntime()).toBe(first);
      expect(first.config.repoRoot).toBe(root);
      expect(first.terminal.view()).toBeNull();
    } finally {
      process.chdir(cwd);
    }
  });
});

describe('recusa de rede no processo do Next', () => {
  it('recusa endereço de fora e deixa passar o da própria máquina', () => {
    const script = path.join(tempDir(), 'check.cjs');
    writeFileSync(
      script,
      `globalThis.fetch = async () => 'passou';
       require(${JSON.stringify(path.join(process.cwd(), 'scripts', 'no-network.cjs'))});
       (async () => {
         const results = {};
         results.local = await fetch('http://127.0.0.1:1/x');
         results.url = await fetch(new URL('http://localhost:1/x'));
         results.semUrl = await fetch('/relativo');
         results.fora = await fetch('https://registry.npmjs.org/x').catch((e) => e.message);
         results.foraObjeto = await fetch({ url: 'https://exemplo.com/' }).catch((e) => e.message);
         console.log(JSON.stringify(results));
       })();`,
    );
    const output = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    expect(JSON.parse(output)).toEqual({
      local: 'passou',
      url: 'passou',
      semUrl: 'passou',
      fora: expect.stringContaining('bloqueada'),
      foraObjeto: expect.stringContaining('bloqueada'),
    });
  });
});
