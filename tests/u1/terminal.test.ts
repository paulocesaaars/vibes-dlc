import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findShell } from '@/config/shell-lookup';
import { logger } from '@/config/logger';
import { MAX_BYTES, OutputWindow } from '@/terminal/output-window';
import { getTerminalManager, replaceTerminalManager } from '@/terminal/registry';
import { killStaleShell, type CommandRunner } from '@/terminal/stale-shell';
import {
  buildShellEnv,
  SessionNotAliveError,
  terminalTitle,
  TerminalManager,
  type PtyProcess,
  type StreamEvent,
} from '@/terminal/terminal-manager';
import { tempDir } from './helpers';

const REAL_SHELL = findShell();
const managers: TerminalManager[] = [];

function realManager(cwd = tempDir()): { manager: TerminalManager; pidFile: string; cwd: string } {
  const pidFile = path.join(tempDir(), 'terminal.pid');
  const manager = new TerminalManager({ findShell: () => REAL_SHELL, cwd, pidFile });
  managers.push(manager);
  return { manager, pidFile, cwd };
}

function collect(manager: TerminalManager, sessionId: string, afterSeq: number | null = null) {
  const events: StreamEvent[] = [];
  const attached = manager.attach(sessionId, afterSeq, (event) => events.push(event));
  if (!attached) throw new Error('sessão não encontrada');
  events.unshift(...attached.replay);
  const text = () => events.map((event) => (event.type === 'output' ? event.data : '')).join('');
  return { events, text, detach: attached.detach };
}

afterEach(() => {
  for (const manager of managers.splice(0)) manager.shutdown();
});

describe('TerminalManager com node-pty e Git Bash reais', () => {
  it('abre o Git Bash na pasta pedida, em caminho com espaços e acentos, e executa', async () => {
    const cwd = path.join(tempDir(), 'Código do João');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(cwd);
    const { manager, pidFile } = realManager(cwd);
    const session = manager.openOrJoin();
    expect(session.status).toBe('alive');
    expect(JSON.parse(readFileSync(pidFile, 'utf8'))).toMatchObject({
      shellPid: expect.any(Number),
      ownerPid: process.pid,
      startedAt: expect.any(Number),
    });

    const stream = collect(manager, session.sessionId);
    manager.write('echo "MARCA_$((40+2))"; pwd -W 2>/dev/null || pwd\r');
    await vi.waitFor(() => expect(stream.text()).toContain('MARCA_42'), { timeout: 15_000 });
    await vi.waitFor(() => expect(stream.text()).toMatch(/Jo.o/), { timeout: 5_000 });
  });

  it('um segundo pedido entra na sessão viva, mesmo com sessionId antigo', () => {
    const { manager } = realManager();
    const first = manager.openOrJoin();
    expect(manager.openOrJoin().sessionId).toBe(first.sessionId);
    expect(manager.openOrJoin('id-de-outra-aba').sessionId).toBe(first.sessionId);
  });

  it('entrega a mesma saída a duas conexões, e quem cai sai da lista', async () => {
    const { manager } = realManager();
    const { sessionId } = manager.openOrJoin();
    const a = collect(manager, sessionId);
    const b = collect(manager, sessionId);
    manager.write('echo DUAS_$((1+1))\r');
    await vi.waitFor(
      () => {
        expect(a.text()).toContain('DUAS_2');
        expect(b.text()).toContain('DUAS_2');
      },
      { timeout: 15_000 },
    );

    b.detach();
    const before = b.events.length;
    manager.write('echo SO_A_$((1+1))\r');
    await vi.waitFor(() => expect(a.text()).toContain('SO_A_2'), { timeout: 15_000 });
    expect(b.events.length).toBe(before);
  });

  it('continua do afterSeq sem repetir, e reenvia tudo com afterSeq fora da janela', async () => {
    const { manager } = realManager();
    const { sessionId } = manager.openOrJoin();
    const first = collect(manager, sessionId);
    await vi.waitFor(
      () => expect(first.events.filter((e) => e.type === 'output').length).toBeGreaterThan(0),
      { timeout: 15_000 },
    );
    first.detach();
    const outputs = first.events.filter((e) => e.type === 'output');
    const lastSeq = (outputs.at(-1) as { seq: number }).seq;

    const resumed = manager.attach(sessionId, lastSeq, () => {});
    expect(resumed?.replay.every((e) => e.type === 'output' && e.seq > lastSeq)).toBe(true);
    resumed?.detach();

    const farAhead = manager.attach(sessionId, 999_999, () => {});
    expect(farAhead?.replay[0]).toEqual({ type: 'reset' });
    farAhead?.detach();
  });

  it('o redimensionamento chega ao shell', async () => {
    const { manager } = realManager();
    const { sessionId } = manager.openOrJoin();
    const stream = collect(manager, sessionId);
    manager.resize(123, 40);
    manager.write('echo "COLS_$(tput cols)"\r');
    await vi.waitFor(() => expect(stream.text()).toContain('COLS_123'), { timeout: 15_000 });
  });

  it('encerrar deixa a sessão dead com killed e nada abre sozinho', () => {
    const { manager, pidFile } = realManager();
    const { sessionId } = manager.openOrJoin();
    const stream = collect(manager, sessionId);
    manager.kill();
    expect(manager.view()).toMatchObject({ status: 'dead', endReason: 'killed' });
    expect(stream.events.at(-1)).toEqual({ type: 'ended', reason: 'killed' });
    expect(existsSync(pidFile)).toBe(false);
    expect(manager.openOrJoin()).toMatchObject({ status: 'dead', sessionId });
    expect(() => manager.write('x')).toThrow(SessionNotAliveError);
    expect(() => manager.resize(10, 10)).toThrow(SessionNotAliveError);

    const reconnected = manager.attach(sessionId, null, () => {});
    expect(reconnected?.replay.at(-1)).toEqual({ type: 'ended', reason: 'killed' });
    expect(manager.newSession().status).toBe('alive');
    expect(manager.view()?.sessionId).not.toBe(sessionId);
  });

  it('quando o shell acaba sozinho, fica dead com shell_exited', async () => {
    const { manager } = realManager();
    manager.openOrJoin();
    manager.write('exit\r');
    await vi.waitFor(
      () => expect(manager.view()).toMatchObject({ status: 'dead', endReason: 'shell_exited' }),
      { timeout: 15_000 },
    );
  });

  it('encerra com a árvore de processos ao parar o servidor', async () => {
    const { manager } = realManager();
    manager.openOrJoin();
    manager.shutdown();
    expect(manager.view()).toMatchObject({ status: 'dead', endReason: 'server_stopped' });
  });

  it('encerra um bash.exe que sobrou de um processo anterior', async () => {
    const { manager, pidFile } = realManager();
    manager.openOrJoin();
    const leftoverFile = path.join(tempDir(), 'terminal.pid');
    writeFileSync(leftoverFile, readFileSync(pidFile, 'utf8'));

    // O dono é este processo, que está vivo: nada pode ser encerrado enquanto isso valer.
    expect(killStaleShell(leftoverFile)).toBe(false);
    expect(existsSync(leftoverFile)).toBe(true);
    expect(manager.view()).toMatchObject({ status: 'alive' });

    expect(killStaleShell(leftoverFile, undefined, () => false)).toBe(true);
    expect(existsSync(leftoverFile)).toBe(false);
    await vi.waitFor(
      () => expect(manager.view()).toMatchObject({ status: 'dead', endReason: 'shell_exited' }),
      { timeout: 15_000 },
    );
  });
});

describe('TerminalManager sem Git Bash', () => {
  let errorLog: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorLog = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });
  afterEach(() => errorLog.mockRestore());

  const missing = 'C:\\nao\\existe\\bash.exe';
  const withoutShell = () =>
    new TerminalManager({
      findShell: () => findShell({ VIBES_SHELL: missing }),
      cwd: null,
      pidFile: path.join(tempDir(), 'terminal.pid'),
    });

  it('fica unavailable, com o caminho procurado, sem outra opção', () => {
    const session = withoutShell().openOrJoin();
    expect(session).toMatchObject({ status: 'unavailable', searchedShells: [missing] });
    expect(errorLog).toHaveBeenCalledWith('terminal', expect.stringContaining(missing));
  });

  it('com sessionId antigo, cria dead com server_stopped, sem procurar o shell', () => {
    const manager = withoutShell();
    expect(manager.openOrJoin('antigo')).toMatchObject({
      sessionId: 'antigo',
      status: 'dead',
      endReason: 'server_stopped',
    });
    expect(errorLog).not.toHaveBeenCalled();
    expect(manager.newSession().status).toBe('unavailable');
  });

  it('tenta de novo e abre quando o shell aparece', () => {
    let lookup = findShell({ VIBES_SHELL: missing });
    const manager = new TerminalManager({
      findShell: () => lookup,
      cwd: tempDir(),
      pidFile: path.join(tempDir(), 'terminal.pid'),
    });
    managers.push(manager);
    expect(manager.openOrJoin().status).toBe('unavailable');
    lookup = REAL_SHELL;
    expect(manager.openOrJoin().status).toBe('alive');
  });

  it('uma falha ao abrir o processo vira unavailable, sem lançar erro', () => {
    const manager = new TerminalManager({
      findShell: () => ({ path: 'C:\\bash.exe', searched: ['C:\\bash.exe'] }),
      cwd: null,
      pidFile: path.join(tempDir(), 'terminal.pid'),
      spawnPty: () => {
        throw new Error('acesso negado');
      },
    });
    expect(manager.openOrJoin().status).toBe('unavailable');
    expect(errorLog).toHaveBeenCalledWith('terminal', expect.stringContaining('acesso negado'));
  });
});

describe('TerminalManager com falhas do pseudo-terminal', () => {
  it('registra a falha ao encerrar e fica dead mesmo assim', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const fakePty: PtyProcess = {
      pid: 1,
      write: () => {},
      resize: () => {},
      kill: () => {},
      onData: () => ({ dispose: () => {} }),
      onExit: () => ({ dispose: () => {} }),
    };
    const manager = new TerminalManager({
      findShell: () => ({ path: 'x', searched: ['x'] }),
      cwd: null,
      pidFile: path.join(tempDir(), 'sub', 'terminal.pid'),
      spawnPty: () => fakePty,
      killShell: () => {
        throw new Error('já encerrado');
      },
    });
    manager.openOrJoin();
    manager.kill();
    expect(manager.view()?.status).toBe('dead');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('ambiente e título do shell', () => {
  it('não passa variáveis do servidor ao shell e mantém as da pessoa', () => {
    const env = buildShellEnv({
      NODE_ENV: 'production',
      NODE_OPTIONS: '--require x',
      PORT: '3000',
      VIBES_HOST: '127.0.0.1',
      NEXT_RUNTIME: 'nodejs',
      MINHA_VARIAVEL: 'sim',
      VAZIA: undefined,
    });
    expect(env).toMatchObject({ MINHA_VARIAVEL: 'sim', CHERE_INVOKING: '1' });
    for (const key of ['NODE_ENV', 'NODE_OPTIONS', 'PORT', 'VIBES_HOST', 'NEXT_RUNTIME', 'VAZIA']) {
      expect(env).not.toHaveProperty(key);
    }
  });

  it('mostra o caminho no formato do Git Bash', () => {
    expect(terminalTitle('C:\\Git\\Código João')).toBe('MINGW64:/c/Git/Código João');
    expect(terminalTitle(null)).toBe('MINGW64');
  });
});

describe('registro em globalThis', () => {
  afterEach(() => replaceTerminalManager(undefined));

  it('devolve o mesmo gerenciador em todas as chamadas', () => {
    const pidFile = path.join(tempDir(), 'terminal.pid');
    const create = vi.fn(() => ({ findShell: () => REAL_SHELL, cwd: null, pidFile }));
    const first = getTerminalManager(create);
    expect(getTerminalManager(create)).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('killStaleShell', () => {
  const STARTED_AT = Date.parse('2026-11-03T12:00:00.000Z');
  const ownerGone = () => false;

  function recordFile(): string {
    const file = path.join(tempDir(), 'terminal.pid');
    writeFileSync(file, JSON.stringify({ shellPid: 4242, ownerPid: 1234, startedAt: STARTED_AT }));
    return file;
  }

  function fakeRunner(processName: string, startedAt: string, calls: string[] = []): CommandRunner {
    return (command) => {
      calls.push(command);
      if (command === 'tasklist') return `"${processName}","4242","Console","1","10.000 K"`;
      return command === 'powershell.exe' ? startedAt : '';
    };
  }

  it('não encerra o shell enquanto o servidor dono estiver vivo', () => {
    const file = recordFile();
    const calls: string[] = [];
    const run = fakeRunner('bash.exe', '2026-11-03T12:00:00.000Z', calls);
    expect(killStaleShell(file, run, () => true)).toBe(false);
    expect(calls).toEqual([]);
    expect(existsSync(file)).toBe(true);
  });

  it('não encerra um PID que não é mais bash.exe', () => {
    const file = recordFile();
    const calls: string[] = [];
    const run = fakeRunner('node.exe', '2026-11-03T12:00:00.000Z', calls);
    expect(killStaleShell(file, run, ownerGone)).toBe(false);
    expect(calls).toEqual(['tasklist']);
    expect(existsSync(file)).toBe(false);
  });

  it('não encerra um bash.exe que abriu em outro horário, com o PID reaproveitado', () => {
    const calls: string[] = [];
    const run = fakeRunner('bash.exe', '2026-11-03T15:00:00.000Z', calls);
    expect(killStaleShell(recordFile(), run, ownerGone)).toBe(false);
    expect(calls).not.toContain('taskkill');
  });

  it('encerra o shell quando o dono acabou e o horário confere', () => {
    const calls: string[] = [];
    const run = fakeRunner('bash.exe', '2026-11-03T12:00:03.000Z', calls);
    expect(killStaleShell(recordFile(), run, ownerGone)).toBe(true);
    expect(calls).toContain('taskkill');
  });

  it('ignora conteúdo inválido e arquivo ausente', () => {
    const file = path.join(tempDir(), 'terminal.pid');
    expect(killStaleShell(file)).toBe(false);
    writeFileSync(file, 'nao-e-pid');
    expect(killStaleShell(file)).toBe(false);
  });

  it('registra a falha da conferência sem interromper o início', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const file = recordFile();
    const run: CommandRunner = () => {
      throw new Error('tasklist indisponível');
    };
    expect(killStaleShell(file, run, ownerGone)).toBe(false);
    expect(warn).toHaveBeenCalledWith('terminal', expect.stringContaining('tasklist indisponível'));
    warn.mockRestore();
  });
});

describe('OutputWindow', () => {
  it('numera blocos a partir de 1 e devolve os seguintes', () => {
    const output = new OutputWindow();
    output.append('a');
    output.append('b\n');
    expect(output.nextSeq).toBe(3);
    expect(output.since(1).map((c) => c.data)).toEqual(['b\n']);
    expect(output.since(null)).toHaveLength(2);
    expect(output.totalNewlines).toBe(1);
  });

  it('limita a 2000 quebras de linha, tirando os mais antigos', () => {
    const output = new OutputWindow();
    for (let i = 0; i < 2500; i += 1) output.append(`linha ${i}\n`);
    expect(output.totalNewlines).toBe(2000);
    expect(output.firstSeq).toBe(501);
    expect(output.covers(499)).toBe(false);
    expect(output.covers(500)).toBe(true);
    expect(output.covers(2500)).toBe(true);
    expect(output.covers(2501)).toBe(false);
  });

  it('limita a 5 MB, mesmo sem quebras de linha', () => {
    const output = new OutputWindow();
    const block = 'x'.repeat(1024 * 1024);
    for (let i = 0; i < 8; i += 1) output.append(block);
    expect(output.totalBytes).toBeLessThanOrEqual(MAX_BYTES);
    expect(output.since(null)).toHaveLength(5);
  });

  it('conta bytes, não caracteres', () => {
    const output = new OutputWindow(10, 5);
    output.append('ção');
    expect(output.totalBytes).toBe(5);
    output.append('a');
    expect(output.totalBytes).toBe(1);
  });

  it('continua correta depois de muitas remoções', () => {
    const output = new OutputWindow(1);
    for (let i = 0; i < 3000; i += 1) output.append('l\n');
    expect(output.since(null).map((c) => c.seq)).toEqual([3000]);
  });
});
