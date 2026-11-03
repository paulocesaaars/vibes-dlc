// Cópia de teste de um registro real, usada pelas provas. Nada aqui escreve no registro de verdade.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();
const REAL_INTENTS = path.join(ROOT, 'aidlc', 'spaces', 'default', 'intents');

export type ProofRepo = {
  root: string;
  intentId: string;
  recordDir: string;
  statePath: string;
  auditDir: string;
  dbPath: string;
  /** Registra uma escrita do próprio script, que não conta como mudança do produto. */
  noteWrite: (file: string) => void;
  /**
   * O que mudou na cópia sem ter sido o script, desde a base. Roda sobre o `git status`, sem ignorar
   * `aidlc/`, e um arquivo do script que mudou depois da última escrita dele também aparece.
   */
  changesBeyondScript: () => string[];
  remove: () => void;
};

function hashOf(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function changesBeyond(root: string, written: Map<string, string>): string[] {
  const outsideScript = gitStatusOf(root).filter((line) => {
    const file = line.slice(3).replace(/^"|"$/g, '');
    return !written.has(path.join(root, file));
  });
  const overwritten = [...written]
    .filter(([file, hash]) => hashOf(file) !== hash)
    .map(([file]) => `sobrescrito: ${path.relative(root, file)}`);
  return [...outsideScript, ...overwritten];
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });
}

/**
 * Monta um repositório de teste em `.vibes/`, já ignorada pelo Git. O painel sobe com esta pasta como
 * diretório de trabalho, então só ela é lida e só nela o terminal abre.
 */
export function createProofRepo(proofId: string, options: { withAudit: boolean }): ProofRepo {
  const intentId = readFileSync(path.join(REAL_INTENTS, 'active-intent'), 'utf8').trim();
  const root = path.join(ROOT, '.vibes', `proof-${proofId}`);
  const intentsDir = path.join(root, 'aidlc', 'spaces', 'default', 'intents');
  const recordDir = path.join(intentsDir, intentId);
  mkdirSync(recordDir, { recursive: true });
  mkdirSync(path.join(root, '.claude', 'tools', 'data'), { recursive: true });

  const realRecord = path.join(REAL_INTENTS, intentId);
  cpSync(path.join(realRecord, 'aidlc-state.md'), path.join(recordDir, 'aidlc-state.md'));
  if (options.withAudit) {
    cpSync(path.join(realRecord, 'audit'), path.join(recordDir, 'audit'), { recursive: true });
  }
  cpSync(path.join(ROOT, 'migrations'), path.join(root, 'migrations'), { recursive: true });
  cpSync(
    path.join(ROOT, '.claude', 'tools', 'data', 'stage-graph.json'),
    path.join(root, '.claude', 'tools', 'data', 'stage-graph.json'),
  );
  writeFileSync(path.join(root, 'aidlc', 'active-space'), 'default\n');
  writeFileSync(path.join(intentsDir, 'active-intent'), `${intentId}\n`);
  writeFileSync(path.join(root, '.gitignore'), '.vibes/\nmigrations/\n');

  git(root, 'init', '--quiet');
  git(root, 'add', '.');
  git(
    root,
    '-c',
    'user.name=prova',
    '-c',
    'user.email=prova@exemplo.invalid',
    'commit',
    '-qm',
    'base',
  );

  const written = new Map<string, string>();
  return {
    root,
    intentId,
    recordDir,
    statePath: path.join(recordDir, 'aidlc-state.md'),
    auditDir: path.join(recordDir, 'audit'),
    dbPath: path.join(root, '.vibes', 'vibes.db'),
    noteWrite: (file) => written.set(file, hashOf(file)),
    changesBeyondScript: () => changesBeyond(root, written),
    remove: () => rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }),
  };
}

/** Sobe o painel real em modo dev, com o projeto em `ROOT` e os dados na cópia de teste. */
export function startPanel(repo: ProofRepo, port: number, log: string[]): ChildProcess {
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts', 'run-next.mjs'), 'dev', ROOT], {
    cwd: repo.root,
    env: { ...process.env, PORT: String(port), VIBES_NETWORK_DEBUG: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (data) => log.push(String(data)));
  child.stderr?.on('data', (data) => log.push(String(data)));
  return child;
}

export function stopPanel(child: ChildProcess): void {
  if (child.pid === undefined) return;
  try {
    execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'pipe' });
  } catch {
    // O processo pode já ter terminado.
  }
}

export function gitStatusOf(cwd: string): string[] {
  return git(cwd, 'status', '--porcelain', '--untracked-files=all')
    .split('\n')
    .filter(Boolean)
    .sort();
}

/**
 * O painel roda na cópia, então só as ferramentas do projeto poderiam mudar o repositório real, como
 * o `next dev` gravando um AGENTS.md. O filtro é só o que o próprio AI-DLC grava durante a prova.
 */
const AIDLC_RUNTIME_FILES =
  / aidlc\/(\.aidlc-[^/]*|spaces\/default\/intents\/[^/]+\/(aidlc-state\.md|audit\/.*|.*\/memory\.md|.*\.aidlc-.*))$/;

export function realRepoChanges(statusBefore: string[]): string[] {
  return gitStatusOf(ROOT)
    .filter((line) => !statusBefore.includes(line))
    .filter((line) => !AIDLC_RUNTIME_FILES.test(line));
}

/** Caminho e data de cada arquivo sob `directory`, para conferir que nada mudou. */
export function modifiedTimes(directory: string): Map<string, number> {
  const times = new Map<string, number>();
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name);
    const stats = statSync(file);
    if (stats.isDirectory()) {
      for (const [inner, time] of modifiedTimes(file)) times.set(inner, time);
    } else {
      times.set(file, stats.mtimeMs);
    }
  }
  return times;
}
