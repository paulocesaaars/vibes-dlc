import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type * as nodePty from 'node-pty';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findShell } from '@/config/shell-lookup';
import { TerminalManager, type PtyProcess, type StreamEvent } from '@/terminal/terminal-manager';
import { tempDir } from '../u1/helpers';

const managers: TerminalManager[] = [];

afterEach(() => {
  for (const manager of managers.splice(0)) manager.shutdown();
});

function fakeProcess(pid: number): PtyProcess {
  return {
    pid,
    write: () => {},
    resize: () => {},
    kill: () => {},
    onData: () => ({ dispose: () => {} }),
    onExit: () => ({ dispose: () => {} }),
  };
}

/** Gerenciador com pseudo-terminal substituto, que guarda as opções de cada abertura. */
function fakeManager(getCwd: () => string | null, getPidFile: () => string | null) {
  const opened: nodePty.IPtyForkOptions[] = [];
  let nextPid = 1000;
  const manager = new TerminalManager({
    findShell: () => ({ path: 'C:\\bash.exe', searched: ['C:\\bash.exe'] }),
    getCwd,
    getPidFile,
    spawnPty: (_file, _args, options) => {
      opened.push(options);
      return fakeProcess(nextPid++);
    },
    killShell: () => {},
  });
  managers.push(manager);
  return { manager, opened };
}

describe('terminal: pasta e arquivo de PID lidos na hora', () => {
  it('cada sessão nasce na pasta que getCwd devolve naquele momento', () => {
    const first = tempDir();
    const second = tempDir();
    let current = first;
    const { manager, opened } = fakeManager(
      () => current,
      () => null,
    );
    manager.openOrJoin();
    manager.kill();
    current = second;
    manager.newSession();
    expect(opened.map((options) => options.cwd)).toEqual([first, second]);
  });

  it('sem pasta (getCwd nulo), abre no diretório do processo', () => {
    const { manager, opened } = fakeManager(
      () => null,
      () => null,
    );
    manager.openOrJoin();
    expect(opened[0]?.cwd).toBe(process.cwd());
  });

  it('com getPidFile nulo, nada é gravado nem apagado', () => {
    const decoy = path.join(tempDir(), 'terminal.pid');
    writeFileSync(decoy, 'intacto');
    const { manager } = fakeManager(
      () => null,
      () => null,
    );
    manager.openOrJoin();
    manager.kill();
    expect(readFileSync(decoy, 'utf8')).toBe('intacto');
  });

  it('grava o PID no caminho vigente na abertura', () => {
    const pidFile = path.join(tempDir(), 'sub', 'terminal.pid');
    const { manager } = fakeManager(
      () => null,
      () => pidFile,
    );
    manager.openOrJoin();
    expect(JSON.parse(readFileSync(pidFile, 'utf8'))).toMatchObject({
      shellPid: 1000,
      ownerPid: process.pid,
    });
  });

  it('apaga o PID no caminho da abertura, mesmo depois de a raiz trocar', () => {
    const oldFile = path.join(tempDir(), 'terminal.pid');
    const newFile = path.join(tempDir(), 'terminal.pid');
    let current: string | null = oldFile;
    const { manager } = fakeManager(
      () => null,
      () => current,
    );
    manager.openOrJoin();
    expect(existsSync(oldFile)).toBe(true);
    current = newFile;
    manager.kill();
    expect(existsSync(oldFile)).toBe(false);
    expect(existsSync(newFile)).toBe(false);
  });

  it('uma sessão aberta antes de existir o arquivo de PID não deixa registro depois', () => {
    let current: string | null = null;
    const later = path.join(tempDir(), 'terminal.pid');
    const { manager } = fakeManager(
      () => null,
      () => current,
    );
    manager.openOrJoin();
    current = later;
    manager.shutdown();
    expect(existsSync(later)).toBe(false);
  });
});

describe('terminal real com caminho de caracteres especiais', () => {
  const shell = findShell();

  it("abre o Git Bash numa pasta com espaços, acentos e & ' $ ( ), passada só por cwd", async () => {
    const cwd = path.join(tempDir(), "Pasta & 'x' $(y) (z) João");
    mkdirSync(cwd, { recursive: true });
    const manager = new TerminalManager({
      findShell: () => shell,
      getCwd: () => cwd,
      getPidFile: () => null,
    });
    managers.push(manager);
    const session = manager.openOrJoin();
    expect(session.status).toBe('alive');

    const events: StreamEvent[] = [];
    manager.attach(session.sessionId, null, (event) => events.push(event));
    manager.write('echo "ONDE:$(pwd)"\r');
    const text = () => events.map((event) => (event.type === 'output' ? event.data : '')).join('');
    await vi.waitFor(() => expect(text()).toMatch(/ONDE:\/\S+\/Pasta & 'x' \$\(y\) \(z\) João/), {
      timeout: 15_000,
    });
  });
});
