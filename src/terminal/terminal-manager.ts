import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import * as nodePty from 'node-pty';
import { logger } from '@/config/logger';
import type { ShellLookup } from '@/config/shell-lookup';
import { OutputWindow } from './output-window';
import { killProcessTree } from './stale-shell';

export type EndReason = 'killed' | 'shell_exited' | 'server_stopped';
export type TerminalStatus = 'alive' | 'dead' | 'unavailable';

export type SessionView = {
  sessionId: string;
  status: TerminalStatus;
  endReason: EndReason | null;
  startedAt: string;
  searchedShells: string[];
};

export type StreamEvent =
  | { type: 'output'; data: string; seq: number }
  | { type: 'reset' }
  | { type: 'ended'; reason: EndReason };

export type StreamListener = (event: StreamEvent) => void;

export type PtyProcess = Pick<
  nodePty.IPty,
  'pid' | 'write' | 'resize' | 'kill' | 'onData' | 'onExit'
>;

export type TerminalManagerOptions = {
  findShell: () => ShellLookup;
  /** Lido a cada sessão aberta: a raiz pode mudar sem reiniciar o servidor. */
  getCwd: () => string | null;
  /** Lido a cada gravação ou remoção do PID; `null` não grava nem apaga nada. */
  getPidFile: () => string | null;
  env?: NodeJS.ProcessEnv;
  spawnPty?: (file: string, args: string[], options: nodePty.IPtyForkOptions) => PtyProcess;
  killShell?: (shell: PtyProcess) => void;
  initialSize?: { cols: number; rows: number };
};

/** No Windows, o `taskkill` leva junto a CLI aberta no shell e funciona ao parar o processo. */
const defaultKillShell = (shell: PtyProcess): void => {
  if (process.platform === 'win32') killProcessTree(shell.pid);
  else shell.kill();
};

type SessionRecord = SessionView & {
  output: OutputWindow;
  pty: PtyProcess | null;
  listeners: Set<StreamListener>;
  /** Arquivo de PID usado na abertura: é esse mesmo que se apaga no fim, mesmo após trocar a raiz. */
  pidFile: string | null;
  /** Pasta em que o shell abriu. A sessão fica nela mesmo depois de a raiz mudar. */
  cwd: string | null;
};

/** A sessão não está viva: a rota responde 409 `session_dead`. */
export class SessionNotAliveError extends Error {
  constructor() {
    super('A sessão do terminal não está viva.');
    this.name = 'SessionNotAliveError';
  }
}

/** Variáveis do próprio servidor que não devem vazar para os comandos da pessoa. */
const SERVER_ONLY_ENV = /^(NODE_ENV|NODE_OPTIONS|PORT|VIBES_.*|NEXT_.*|__NEXT.*|TURBOPACK.*)$/;

export function buildShellEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const shellEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined && !SERVER_ONLY_ENV.test(key)) shellEnv[key] = value;
  }
  // CHERE_INVOKING mantém o Git Bash na pasta de trabalho, em vez de ir para a pasta da pessoa.
  return { ...shellEnv, TERM: 'xterm-256color', COLORTERM: 'truecolor', CHERE_INVOKING: '1' };
}

const defaultSpawn: NonNullable<TerminalManagerOptions['spawnPty']> = (file, args, options) =>
  nodePty.spawn(file, args, options);

/**
 * Dono da única sessão de shell do processo (NFR2.3). A abertura é síncrona, então pedidos
 * simultâneos ficam em fila no próprio laço de eventos, e só o primeiro abre o shell.
 */
export class TerminalManager {
  private session: SessionRecord | null = null;
  private readonly statusListeners = new Set<() => void>();
  private size: { cols: number; rows: number };

  constructor(private readonly options: TerminalManagerOptions) {
    this.size = options.initialSize ?? { cols: 100, rows: 30 };
  }

  /** Estado atual, ou `null` antes do primeiro pedido de sessão. */
  view(): SessionView | null {
    return this.session ? toView(this.session) : null;
  }

  /** Abre ou retoma a sessão, nas regras de BR3.1, BR3.5, BR3.6 e BR3.7. */
  openOrJoin(clientSessionId?: string): SessionView {
    if (!this.session) {
      if (clientSessionId) return toView(this.createDead(clientSessionId, 'server_stopped'));
      return toView(this.spawnSession());
    }
    if (this.session.status === 'unavailable') return toView(this.spawnSession());
    return toView(this.session);
  }

  /** Nova sessão: substitui qualquer registro encerrado (W2.7). Uma sessão viva continua. */
  newSession(): SessionView {
    if (this.session?.status === 'alive') return toView(this.session);
    return toView(this.spawnSession());
  }

  /** Pasta em que a sessão viva abriu, ou `null` sem sessão viva. */
  aliveSessionCwd(): string | null {
    return this.session?.status === 'alive' ? this.session.cwd : null;
  }

  write(data: string): void {
    const session = this.session;
    if (session?.status !== 'alive' || !session.pty) throw new SessionNotAliveError();
    session.pty.write(data);
  }

  resize(cols: number, rows: number): void {
    const session = this.session;
    if (session?.status !== 'alive' || !session.pty) throw new SessionNotAliveError();
    this.size = { cols, rows };
    session.pty.resize(cols, rows);
  }

  /** Encerra a sessão por pedido da pessoa. Nada abre sozinho depois disso (BR3.6). */
  kill(): void {
    const session = this.session;
    if (session?.status !== 'alive') return;
    const shell = session.pty;
    this.finish(session, 'killed');
    if (shell) this.terminate(shell);
  }

  /** Encerra o shell com a árvore de processos quando o servidor para. Precisa ser síncrono. */
  shutdown(): void {
    const session = this.session;
    if (session?.status !== 'alive' || !session.pty) return;
    const shell = session.pty;
    this.finish(session, 'server_stopped');
    this.terminate(shell);
  }

  private terminate(shell: PtyProcess): void {
    try {
      (this.options.killShell ?? defaultKillShell)(shell);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn('terminal', `Não foi possível encerrar o shell (PID ${shell.pid}): ${reason}.`);
    }
  }

  /**
   * Conecta um ouvinte à sessão. Devolve o que falta aplicar: sem `afterSeq` válido, um `reset` e
   * todos os blocos guardados; com ele, só os blocos seguintes (BR3.4). `null` se a sessão não é
   * a atual.
   */
  attach(
    sessionId: string,
    afterSeq: number | null,
    listener: StreamListener,
  ): { replay: StreamEvent[]; detach: () => void } | null {
    const session = this.session;
    if (session?.sessionId !== sessionId) return null;

    const resumes = afterSeq !== null && session.output.covers(afterSeq);
    const chunks = session.output.since(resumes ? afterSeq : null);
    const replay: StreamEvent[] = resumes ? [] : [{ type: 'reset' }];
    for (const chunk of chunks) replay.push({ type: 'output', data: chunk.data, seq: chunk.seq });

    if (session.status === 'alive') {
      session.listeners.add(listener);
    } else if (session.endReason) {
      replay.push({ type: 'ended', reason: session.endReason });
    }
    return { replay, detach: () => session.listeners.delete(listener) };
  }

  /** Avisa quando a sessão muda de estado, para o guia pedir a decisão de novo. */
  onStatusChange(listener: () => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private spawnSession(): SessionRecord {
    const lookup = this.options.findShell();
    const record = this.newRecord('alive', lookup.searched);
    if (!lookup.path) return this.markUnavailable(record, lookup.searched.join(', '));

    try {
      const cwd = this.options.getCwd() ?? process.cwd();
      const shell = (this.options.spawnPty ?? defaultSpawn)(lookup.path, ['--login', '-i'], {
        name: 'xterm-256color',
        cols: this.size.cols,
        rows: this.size.rows,
        cwd,
        env: buildShellEnv(this.options.env ?? process.env),
      });
      record.cwd = cwd;
      record.pty = shell;
      this.session = record;
      shell.onData((data) => this.handleOutput(record, data));
      shell.onExit(() => this.handleExit(record));
      this.writePidFile(record, shell.pid);
      this.notifyStatus();
      return record;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.error('terminal', `Não foi possível abrir o Git Bash em ${lookup.path}: ${reason}.`);
      return this.markUnavailable(record, lookup.path);
    }
  }

  private markUnavailable(record: SessionRecord, searched: string): SessionRecord {
    logger.error('terminal', `O Git Bash não foi encontrado. Procurei em: ${searched}.`);
    record.status = 'unavailable';
    this.session = record;
    this.notifyStatus();
    return record;
  }

  private createDead(sessionId: string, endReason: EndReason): SessionRecord {
    const record = this.newRecord('dead', []);
    record.sessionId = sessionId;
    record.endReason = endReason;
    this.session = record;
    return record;
  }

  private newRecord(status: TerminalStatus, searchedShells: string[]): SessionRecord {
    return {
      sessionId: randomUUID(),
      status,
      endReason: null,
      startedAt: new Date().toISOString(),
      searchedShells,
      output: new OutputWindow(),
      pty: null,
      listeners: new Set(),
      pidFile: null,
      cwd: null,
    };
  }

  private handleOutput(record: SessionRecord, data: string): void {
    const chunk = record.output.append(data);
    for (const listener of record.listeners) {
      listener({ type: 'output', data: chunk.data, seq: chunk.seq });
    }
  }

  private handleExit(record: SessionRecord): void {
    if (record.status === 'alive') this.finish(record, 'shell_exited');
  }

  private finish(record: SessionRecord, reason: EndReason): void {
    record.status = 'dead';
    record.endReason = reason;
    record.pty = null;
    for (const listener of record.listeners) listener({ type: 'ended', reason });
    record.listeners.clear();
    this.removePidFile(record);
    this.notifyStatus();
  }

  private removePidFile(record: SessionRecord): void {
    const pidFile = record.pidFile;
    if (!pidFile) return;
    try {
      rmSync(pidFile, { force: true });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn('terminal', `Não foi possível apagar ${pidFile}: ${reason}.`);
    }
  }

  private writePidFile(record: SessionRecord, pid: number): void {
    const pidFile = this.options.getPidFile();
    if (!pidFile) return;
    record.pidFile = pidFile;
    try {
      mkdirSync(path.dirname(pidFile), { recursive: true });
      const content = { shellPid: pid, ownerPid: process.pid, startedAt: Date.now() };
      writeFileSync(pidFile, JSON.stringify(content));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn('terminal', `Não foi possível gravar ${pidFile}: ${reason}.`);
    }
  }

  private notifyStatus(): void {
    for (const listener of this.statusListeners) listener();
  }
}

function toView(record: SessionRecord): SessionView {
  return {
    sessionId: record.sessionId,
    status: record.status,
    endReason: record.endReason,
    startedAt: record.startedAt,
    searchedShells: record.searchedShells,
  };
}

/** Caminho no formato da barra do terminal: `MINGW64:/c/caminho/do/repo` (`TDD.md`). */
export function terminalTitle(repoRoot: string | null): string {
  if (!repoRoot) return 'MINGW64';
  const posix = repoRoot.replaceAll('\\', '/');
  const withDrive = posix.replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`);
  return `MINGW64:${withDrive}`;
}
