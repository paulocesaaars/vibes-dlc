import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  ConfigError,
  findRepoRoot,
  isNodeVersionOk,
  loadConfig,
  nodeVersionMessage,
} from '@/config/app-config';
import { Logger, type LogLevel } from '@/config/logger';
import { findShell } from '@/config/shell-lookup';
import { tempDir } from './helpers';

function repoWithAidlc(name = 'repo'): string {
  const root = path.join(tempDir(), name);
  mkdirSync(path.join(root, 'aidlc'), { recursive: true });
  return root;
}

describe('configuração', () => {
  it('usa os padrões, com escuta em 127.0.0.1 e banco em .vibes/', () => {
    const root = repoWithAidlc();
    const config = loadConfig({}, root);
    expect(config).toMatchObject({
      port: 3000,
      host: '127.0.0.1',
      exposed: false,
      repoRoot: root,
      dbPath: path.join(root, '.vibes', 'vibes.db'),
      vibesDir: path.join(root, '.vibes'),
    });
  });

  it('marca como exposto um host fora de 127.0.0.1', () => {
    const config = loadConfig(
      { VIBES_HOST: '0.0.0.0', VIBES_PUBLIC_HOST: 'maquina' },
      repoWithAidlc(),
    );
    expect(config.exposed).toBe(true);
    expect(config.publicHost).toBe('maquina');
  });

  it.each(['0', '70000', 'abc', '1.5'])('interrompe com PORT inválida: %s', (PORT) => {
    expect(() => loadConfig({ PORT }, repoWithAidlc())).toThrow(ConfigError);
    expect(() => loadConfig({ PORT }, repoWithAidlc())).toThrow(/PORT.*1 a 65535/);
  });

  it('interrompe com VIBES_HOST inválido, citando a chave', () => {
    expect(() => loadConfig({ VIBES_HOST: 'a b' }, repoWithAidlc())).toThrow(/VIBES_HOST/);
  });

  it('recusa um banco fora de .vibes/, porque o produto só escreve lá', () => {
    const root = repoWithAidlc();
    expect(() => loadConfig({ VIBES_DB_PATH: 'src/vibes.db' }, root)).toThrow(/VIBES_DB_PATH/);
    expect(() => loadConfig({ VIBES_DB_PATH: '.vibes' }, root)).toThrow(/VIBES_DB_PATH/);
    expect(loadConfig({ VIBES_DB_PATH: '.vibes/outro/x.db' }, root).vibesDir).toBe(
      path.join(root, '.vibes', 'outro'),
    );
  });

  it('acha a raiz subindo pastas, em caminho com espaços e acentos', () => {
    const root = repoWithAidlc('Código do João');
    const nested = path.join(root, 'guia', 'sub pasta');
    mkdirSync(nested, { recursive: true });
    expect(findRepoRoot(nested)).toBe(root);
    expect(loadConfig({}, nested).repoRoot).toBe(root);
  });

  it('deixa a raiz vazia sem aidlc/, e um arquivo com esse nome não conta', () => {
    const dir = tempDir();
    writeFileSync(path.join(dir, 'aidlc'), 'não é pasta');
    const config = loadConfig({}, dir);
    expect(config.repoRoot === null || !config.repoRoot.startsWith(dir)).toBe(true);
  });

  it('compara a versão do Node.js com o mínimo de 22.13', () => {
    expect(isNodeVersionOk('22.13.0')).toBe(true);
    expect(isNodeVersionOk('22.12.9')).toBe(false);
    expect(isNodeVersionOk('23.0.0')).toBe(true);
    expect(isNodeVersionOk('20.18.0')).toBe(false);
    expect(nodeVersionMessage('20.18.0')).toContain('22.13');
  });
});

describe('busca do shell', () => {
  const windowsEnv = {
    ProgramFiles: 'C:\\Program Files',
    PATH: 'C:\\Windows\\System32;D:\\Ferramentas\\Git\\cmd',
  };

  it('usa VIBES_SHELL primeiro', () => {
    const result = findShell({ ...windowsEnv, VIBES_SHELL: 'D:\\bash.exe' }, 'win32', () => true);
    expect(result.path).toBe('D:\\bash.exe');
  });

  it('com VIBES_SHELL inexistente, fica sem shell e mostra o caminho, sem outra opção', () => {
    const result = findShell(
      { ...windowsEnv, VIBES_SHELL: 'D:\\nada.exe' },
      'win32',
      (file) => file !== 'D:\\nada.exe',
    );
    expect(result).toEqual({ path: null, searched: ['D:\\nada.exe'] });
  });

  it('procura o bash.exe da instalação do Git', () => {
    const expected = 'C:\\Program Files\\Git\\bin\\bash.exe';
    const result = findShell(windowsEnv, 'win32', (file) => file === expected);
    expect(result.path).toBe(expected);
  });

  it('acha o Git instalado em outra pasta pelo PATH', () => {
    const expected = 'D:\\Ferramentas\\Git\\bin\\bash.exe';
    const result = findShell(windowsEnv, 'win32', (file) => file === expected);
    expect(result.path).toBe(expected);
  });

  it('nunca oferece PowerShell, cmd nem o bash do WSL', () => {
    const result = findShell(windowsEnv, 'win32', () => false);
    expect(result.path).toBeNull();
    const searched = result.searched.join(' ').toLowerCase();
    expect(searched).not.toMatch(/powershell|cmd\.exe|system32/);
  });

  it('usa $SHELL fora do Windows', () => {
    expect(findShell({ SHELL: '/bin/zsh' }, 'linux', () => true).path).toBe('/bin/zsh');
    expect(findShell({}, 'linux', (file) => file === '/bin/bash').path).toBe('/bin/bash');
  });
});

describe('registro', () => {
  it('escreve em português com nível e área, só no destino informado', () => {
    const lines: [LogLevel, string][] = [];
    const log = new Logger((level, line) => lines.push([level, line]));
    log.info('inicio', 'Painel em http://127.0.0.1:3000');
    log.warn('inicio', 'Painel exposto');
    log.error('db', 'Falhou');
    expect(lines).toEqual([
      ['info', '[vibes][info][inicio] Painel em http://127.0.0.1:3000'],
      ['warn', '[vibes][warn][inicio] Painel exposto'],
      ['error', '[vibes][error][db] Falhou'],
    ]);
  });

  it('usa o console por padrão', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    new Logger().info('a', 'b');
    expect(spy).toHaveBeenCalledWith('[vibes][info][a] b');
    spy.mockRestore();
  });
});
