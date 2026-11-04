import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isNodeVersionOk, loadConfig, nodeVersionMessage } from '@/config/app-config';
import { logger } from '@/config/logger';
import { buildNextArgs, prepareStart, StartupError } from '@/web/bootstrap';
import { tempDir } from '../u1/helpers';

vi.mock('node:fs', async (importOriginal) => {
  const { hideStrayAidlc } = await import('./no-stray-aidlc');
  return hideStrayAidlc(await importOriginal<typeof import('node:fs')>());
});

afterEach(() => vi.restoreAllMocks());

function installed(): { project: string; product: string; env: Record<string, string> } {
  const project = path.join(tempDir(), 'Projeto ação');
  const product = path.join(project, 'vibes-dlc');
  mkdirSync(path.join(project, 'aidlc'), { recursive: true });
  mkdirSync(product, { recursive: true });
  return { project, product, env: { VIBES_PRODUCT_DIR: product } };
}

function withoutRoot(): { dir: string; env: Record<string, string> } {
  const dir = path.join(tempDir(), 'sem aidlc');
  mkdirSync(dir);
  return { dir, env: { VIBES_PRODUCT_DIR: dir } };
}

describe('versão do Node.js', () => {
  it.each([
    ['22.13.0', true],
    ['22.12.9', false],
    ['22.13', true],
    ['21.99.0', false],
    ['24.0.0', true],
    ['100.1.0', true],
  ])('%s -> %s', (version, expected) => {
    expect(isNodeVersionOk(version)).toBe(expected);
  });

  it('a mensagem fica em português, com o mínimo e a versão encontrada', () => {
    expect(nodeVersionMessage('20.18.1')).toBe(
      'O Vibes DLC exige Node.js 22.13 ou superior, e este é o 20.18.1.',
    );
  });
});

describe('prepareStart', () => {
  it('com versão antiga, interrompe com a mensagem e não abre banco nem cria .vibes/', () => {
    const { project, product, env } = installed();
    expect(() => prepareStart(env, product, '20.18.0')).toThrow(StartupError);
    expect(() => prepareStart(env, product, '20.18.0')).toThrow(/22\.13.*20\.18\.0/);
    expect(existsSync(path.join(project, '.vibes'))).toBe(false);
  });

  it('com raiz, cria .vibes/ só na raiz e nunca na subpasta do produto', () => {
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    const { project, product, env } = installed();
    const config = prepareStart(env, product, '22.13.0');
    expect(config.repoRoot).toBe(project);
    expect(existsSync(path.join(project, '.vibes', 'vibes.db'))).toBe(true);
    expect(existsSync(path.join(product, '.vibes'))).toBe(false);
    expect(readdirSync(product)).toEqual([]);
  });

  it('sem raiz, não cria .vibes/ nem banco, avisa em português e mantém a escuta', () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const { dir, env } = withoutRoot();
    const config = prepareStart(env, dir, '22.13.0');
    expect(config.repoRoot).toBeNull();
    expect(config.dbPath).toBeNull();
    expect(readdirSync(dir)).toEqual([]);
    expect(warn.mock.calls.map((call) => call[1]).join(' ')).toMatch(/Não encontrei o AI-DLC/);
    expect(info).toHaveBeenCalledWith('inicio', 'Painel em http://127.0.0.1:3000');
  });

  it('sem raiz, não toca em terminal.pid', () => {
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const { dir, env } = withoutRoot();
    prepareStart(env, dir, '22.13.0');
    expect(existsSync(path.join(dir, '.vibes', 'terminal.pid'))).toBe(false);
  });
});

describe('escuta e script de início', () => {
  it('escuta em 127.0.0.1 por padrão e só muda com VIBES_HOST', () => {
    const { product } = installed();
    const padrao = loadConfig({ VIBES_PRODUCT_DIR: product }, product);
    expect(buildNextArgs('start', padrao)).toContain('127.0.0.1');
    const exposto = loadConfig({ VIBES_PRODUCT_DIR: product, VIBES_HOST: '0.0.0.0' }, product);
    expect(buildNextArgs('start', exposto)).toContain('0.0.0.0');
    expect(exposto.exposed).toBe(true);
  });

  it('run-next.mjs grava VIBES_PRODUCT_DIR e o início passa por prepareStart em dev e start', () => {
    const script = readFileSync(path.join(process.cwd(), 'scripts', 'run-next.mjs'), 'utf8');
    expect(script).toContain('process.env.VIBES_PRODUCT_DIR');
    const bootstrap = readFileSync(path.join(process.cwd(), 'src', 'web', 'bootstrap.ts'), 'utf8');
    expect(bootstrap).toMatch(/mode === 'build' \? loadConfig\(\) : prepareStart\(\)/);
  });
});
