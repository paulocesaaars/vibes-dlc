// Prova da Unidade U5 (instalação): repositório temporário, Git Bash, node-pty e Edge reais.
// Precisa de rede só durante o `npm install` (e para baixar um Node.js 20 que prova a mensagem de
// versão). Depois disso o produto roda sem rede. Uso: `npx tsx scripts/proof-u5.ts`.
//
// Falha em qualquer conferência sai com código diferente de zero, inclusive quando o `node-pty` não
// instala. Nada aqui toca o repositório real: tudo acontece numa pasta temporária fora dele.
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { PROOF_BROWSER_CHANNEL } from '../playwright.config';
import { findShell } from '../src/config/shell-lookup';
import { INSTALL_LIST } from './install-list';

const ROOT = process.cwd();
const ID = randomBytes(4).toString('hex');
const PORT_A = Number(process.env.PROOF_PORT ?? 3925);
const PORT_B = PORT_A + 1;
const SERVER_LOG: string[] = [];
const PROOF_NAME = `vibes-proof-${ID}`;

type Check = { step: string; ok: boolean; detail: string };
const checks: Check[] = [];
const measures: Record<string, string> = {};

function record(step: string, ok: boolean, detail = ''): void {
  checks.push({ step, ok, detail });
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${step}${detail ? ` | ${detail}` : ''}`);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function until<T>(read: () => Promise<T> | T, timeoutMs = 15_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('Tempo esgotado esperando a condição.');
    await sleep(50);
  }
}

// ---------------------------------------------------------------------------------------------
// Pastas de teste
// ---------------------------------------------------------------------------------------------

function hasAidlcAbove(dir: string): boolean {
  let current = path.resolve(dir);
  for (;;) {
    const candidate = path.join(current, 'aidlc');
    if (existsSync(candidate) && statSync(candidate).isDirectory()) return true;
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

/** Uma pasta sem `aidlc/` em nenhum ancestral, para a prova sem raiz valer em qualquer máquina. */
function pickWorkDir(): string {
  const candidates = [os.tmpdir(), path.parse(os.tmpdir()).root];
  for (const base of candidates) {
    if (!hasAidlcAbove(base)) return path.join(base, PROOF_NAME);
  }
  throw new Error(
    `Não achei uma pasta sem aidlc/ acima dela para a prova. Procurei em: ${candidates.join(', ')}.`,
  );
}

const WORK = pickWorkDir();
// Pasta do projeto com espaços e acentos. A subpasta do produto fica mais fundo que a raiz do AI-DLC,
// para a pasta do terminal sem raiz (pai do produto) ser diferente da pasta da raiz.
const PROJECT_A = path.join(WORK, `Código do João ${ID}`);
const PRODUCT_A = path.join(PROJECT_A, 'ferramentas', 'vibes-dlc');
// Segundo projeto: sem package.json próprio e com a instalação do README (na raiz do projeto).
const PROJECT_B = path.join(WORK, `Sem pacote ${ID}`);
const PRODUCT_B = path.join(PROJECT_B, 'vibes-dlc');
const NODE20_DIR = path.join(WORK, 'node20');

const BASH = findShell().path;

// ---------------------------------------------------------------------------------------------
// Comandos no Git Bash e processos
// ---------------------------------------------------------------------------------------------

type BashResult = { code: number | null; output: string };

function runBash(command: string, cwd: string, timeoutMs: number): Promise<BashResult> {
  return new Promise((resolve) => {
    if (!BASH) {
      resolve({ code: null, output: 'O Git Bash não foi encontrado.' });
      return;
    }
    const child = spawn(BASH, ['-lc', command], {
      cwd,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout?.on('data', (data) => (output += String(data)));
    child.stderr?.on('data', (data) => (output += String(data)));
    const timer = setTimeout(() => {
      stopTree(child);
      output += '\n[a prova encerrou o comando por tempo]';
    }, timeoutMs);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
}

function stopTree(child: ChildProcess): void {
  if (child.pid === undefined) return;
  try {
    execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'pipe' });
  } catch {
    // O processo pode já ter terminado.
  }
}

function startPanel(
  product: string,
  port: number,
  extraEnv: Record<string, string> = {},
): ChildProcess {
  if (!BASH) throw new Error('O Git Bash não foi encontrado.');
  const child = spawn(BASH, ['-lc', 'npm run dev'], {
    cwd: product,
    env: { ...process.env, PORT: String(port), VIBES_NETWORK_DEBUG: '1', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (data) => SERVER_LOG.push(String(data)));
  child.stderr?.on('data', (data) => SERVER_LOG.push(String(data)));
  return child;
}

async function waitForPanel(port: number): Promise<void> {
  await until(async () => {
    try {
      return (await fetch(`http://127.0.0.1:${port}/api/demands`)).ok;
    } catch {
      return false;
    }
  }, 180_000);
}

/** Encerra o processo que escuta na porta e tudo o que ele abriu (inclusive os terminais). */
function stopListener(port: number): void {
  const lines = execFileSync('netstat', ['-ano'], { encoding: 'utf8' }).split('\n');
  const pattern = new RegExp(`127\\.0\\.0\\.1:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`);
  for (const line of lines) {
    const pid = pattern.exec(line)?.[1];
    if (!pid) continue;
    try {
      execFileSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'pipe' });
    } catch {
      // O processo pode já ter terminado.
    }
  }
}

/**
 * Para o painel. Matar só o Git Bash que o iniciou não basta: o servidor do Next pode continuar vivo
 * e segurar os arquivos da pasta de teste, então o processo da porta também é encerrado.
 */
async function stopPanel(child: ChildProcess | null, port: number): Promise<void> {
  if (child) stopTree(child);
  stopListener(port);
  await sleep(1500);
}

function connectsFrom(address: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: address, port, timeout: 1500 });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function lanAddress(): string | null {
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Arquivos e Git
// ---------------------------------------------------------------------------------------------

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });
}

/** Hash de todo arquivo sob `dir`, menos o que `skip` recusa (caminho relativo com barras `/`). */
function snapshot(dir: string, skip: (relative: string) => boolean): Map<string, string> {
  const hashes = new Map<string, string>();
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const relative = path.relative(dir, full).replaceAll('\\', '/');
      if (skip(relative)) continue;
      if (entry.isDirectory()) walk(full);
      else hashes.set(relative, createHash('sha256').update(readFileSync(full)).digest('hex'));
    }
  };
  walk(dir);
  return hashes;
}

function diffSnapshots(before: Map<string, string>, after: Map<string, string>): string[] {
  const changes: string[] = [];
  for (const [file, hash] of after) {
    if (!before.has(file)) changes.push(`novo: ${file}`);
    else if (before.get(file) !== hash) changes.push(`alterado: ${file}`);
  }
  for (const file of before.keys()) if (!after.has(file)) changes.push(`apagado: ${file}`);
  return changes;
}

/** O que é do projeto da pessoa: tudo, menos a subpasta do produto, `.vibes/`, `aidlc/` e o Git. */
const outsideProduct = (relative: string): boolean =>
  relative === '.git' ||
  relative === '.vibes' ||
  relative === 'aidlc' ||
  relative === '.claude' ||
  relative === 'ferramentas' ||
  relative === 'vibes-dlc';

function gitStatusOutsideProduct(project: string, product: string): string[] {
  const relative = path.relative(project, product).split(path.sep)[0] as string;
  return git(
    project,
    'status',
    '--porcelain',
    '--untracked-files=all',
    '--',
    '.',
    `:(exclude)${relative}`,
  )
    .split('\n')
    .filter(Boolean);
}

function createPersonProject(project: string, withPackageJson: boolean): void {
  mkdirSync(project, { recursive: true });
  writeFileSync(path.join(project, 'README.md'), '# Projeto da pessoa\n');
  writeFileSync(path.join(project, 'index.js'), "console.log('olá');\n");
  // A linha do `.gitignore` que o `README` manda fazer, feita à mão pela pessoa.
  writeFileSync(path.join(project, '.gitignore'), '.vibes/\n');
  if (withPackageJson) {
    writeFileSync(
      path.join(project, 'package.json'),
      JSON.stringify({ name: 'projeto-da-pessoa', version: '1.0.0', private: true }, null, 2),
    );
    writeFileSync(
      path.join(project, 'package-lock.json'),
      JSON.stringify({
        name: 'projeto-da-pessoa',
        lockfileVersion: 3,
        requires: true,
        packages: {},
      }),
    );
  }
  git(project, 'init', '--quiet');
  git(project, 'add', '.');
  git(
    project,
    '-c',
    'user.name=prova',
    '-c',
    'user.email=prova@exemplo.invalid',
    'commit',
    '-qm',
    'base',
  );
}

/** A cópia que o `README` manda fazer: só a lista, sem `aidlc/`, `.git` nem `node_modules/`. */
function copyProduct(product: string): void {
  mkdirSync(product, { recursive: true });
  for (const item of INSTALL_LIST) {
    const target = path.join(product, item);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(ROOT, item), target, { recursive: true });
  }
}

/** Um `aidlc/` mínimo e um intent real, copiados dos exemplos de teste, só onde a prova precisa. */
function writeAidlcWithIntent(project: string): void {
  const fixtures = path.join(ROOT, 'tests', 'fixtures', 'aidlc');
  const intentId = '261103-vibes-dlc-mvp';
  const intents = path.join(project, 'aidlc', 'spaces', 'default', 'intents');
  mkdirSync(path.join(intents, intentId), { recursive: true });
  mkdirSync(path.join(project, '.claude', 'tools', 'data'), { recursive: true });
  writeFileSync(path.join(project, 'aidlc', 'active-space'), 'default\n');
  writeFileSync(path.join(intents, 'active-intent'), `${intentId}\n`);
  cpSync(path.join(fixtures, 'aidlc-state.md'), path.join(intents, intentId, 'aidlc-state.md'));
  cpSync(
    path.join(fixtures, 'stage-graph.json'),
    path.join(project, '.claude', 'tools', 'data', 'stage-graph.json'),
  );
}

// ---------------------------------------------------------------------------------------------
// Navegador e terminal
// ---------------------------------------------------------------------------------------------

function screenText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const rows = document.querySelector('.xterm-rows');
    return Array.from(rows?.children ?? [])
      .map((row) => (row.textContent ?? '').replaceAll(' ', ' ').trimEnd())
      .join('\n');
  });
}

async function typeInTerminal(page: Page, text: string): Promise<void> {
  await page.getByTestId('terminal-screen').click();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

async function waitForPrompt(page: Page): Promise<void> {
  await until(async () => (await screenText(page)).includes('$'), 60_000);
}

/**
 * Diz se o terminal real está numa pasta cujo caminho (de `pwd -W`) termina em `suffix`. A conferência
 * roda dentro do shell, porque a saída de um caminho longo quebra em várias linhas da tela estreita.
 * O sufixo é só ASCII (o identificador da prova e, às vezes, `/ferramentas`).
 */
async function terminalEndsWith(page: Page, suffix: string): Promise<boolean> {
  const marker = randomBytes(3).toString('hex');
  await waitForPrompt(page);
  await typeInTerminal(
    page,
    `p=$(pwd -W); [[ "$p" == *"${suffix}" ]] && printf 'SIM%s\\n' ${marker} || printf 'NAO%s\\n' ${marker}`,
  );
  const answer = await until(async () => {
    const rows = (await screenText(page)).split('\n').map((row) => row.trim());
    return rows.find((row) => row === `SIM${marker}` || row === `NAO${marker}`) ?? '';
  }, 30_000);
  return answer === `SIM${marker}`;
}

async function openPage(browser: Awaited<ReturnType<typeof chromium.launch>>, base: string) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const external: string[] = [];
  page.on('request', (request) => {
    const { protocol, origin } = new URL(request.url());
    if ((protocol === 'http:' || protocol === 'https:') && origin !== base) {
      external.push(request.url());
    }
  });
  // O `tsx` envolve as funções com `__name`, que não existe dentro da página.
  await page.addInitScript('globalThis.__name = (fn) => fn;');
  return { page, external };
}

async function clickRetry(page: Page): Promise<void> {
  await page.getByTestId('guide-retry-button').click();
}

async function failureText(page: Page): Promise<string> {
  await page.getByTestId('guide-text').waitFor({ timeout: 120_000 });
  return (await page.getByTestId('guide-text').textContent()) ?? '';
}

// ---------------------------------------------------------------------------------------------
// Etapas
// ---------------------------------------------------------------------------------------------

async function stepInstall(): Promise<void> {
  record('0. O Git Bash existe nesta máquina', Boolean(BASH), BASH ?? '');
  record('0. A pasta de prova não tem aidlc/ acima dela', !hasAidlcAbove(WORK), WORK);

  createPersonProject(PROJECT_A, true);
  copyProduct(PRODUCT_A);
  const copied = readdirSync(PRODUCT_A).sort();
  const leaked = ['aidlc', '.claude', '.vibes', 'node_modules', '.next', 'tests', 'design'].filter(
    (name) => copied.includes(name),
  );
  record(
    '1. A cópia segue a lista do README, sem aidlc/ nem .git',
    leaked.length === 0,
    copied.join(', '),
  );

  const started = Date.now();
  const install = await runBash('npm install --no-audit --no-fund', PRODUCT_A, 15 * 60_000);
  measures['npm install'] = `${Math.round((Date.now() - started) / 1000)} s`;
  record(
    '1. npm install conclui',
    install.code === 0,
    install.code === 0 ? '' : install.output.slice(-800),
  );
  if (install.code !== 0) throw new Error('O npm install falhou.');

  const pty = await runBash(
    `node -e "require('node-pty'); console.log('node-pty-ok')"`,
    PRODUCT_A,
    60_000,
  );
  record(
    '1. O node-pty instalou e carrega',
    pty.code === 0 && pty.output.includes('node-pty-ok'),
    pty.output.slice(-400),
  );
  if (pty.code !== 0) throw new Error('O node-pty não instalou.');
}

async function stepNodeVersion(): Promise<void> {
  const install = await runBash(
    `npm install --prefix "${NODE20_DIR.replaceAll('\\', '/')}" node@20.18.0 --no-audit --no-fund`,
    WORK,
    10 * 60_000,
  );
  const candidates = [
    path.join(NODE20_DIR, 'node_modules', 'node', 'bin', 'node.exe'),
    path.join(NODE20_DIR, 'node_modules', 'node', 'bin', 'node'),
  ];
  const node20 = candidates.find((file) => existsSync(file));
  record(
    '6. Um Node.js 20 real foi baixado para a prova',
    install.code === 0 && Boolean(node20),
    install.code === 0 ? (node20 ?? 'sem binário') : install.output.slice(-400),
  );
  if (!node20) return;
  const vibesBefore = snapshot(path.join(PROJECT_A, '.vibes'), () => false);
  const reported = execFileSync(node20, ['-p', 'process.version'], { encoding: 'utf8' }).trim();
  const run = await new Promise<{ code: number | null; output: string }>((resolve) => {
    const child = spawn(node20, [path.join('scripts', 'run-next.mjs'), 'start'], {
      cwd: PRODUCT_A,
      env: { ...process.env, PORT: String(PORT_B + 1) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout?.on('data', (data) => (output += String(data)));
    child.stderr?.on('data', (data) => (output += String(data)));
    const timer = setTimeout(() => stopTree(child), 60_000);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
  record(
    '6. Com Node.js 20, o início para com a mensagem de versão',
    run.code !== 0 &&
      run.output.includes('22.13') &&
      run.output.includes(reported.replace('v', '')),
    `${reported} | ${run.output.trim().split('\n').slice(-2).join(' / ')}`,
  );
  const vibesAfter = snapshot(path.join(PROJECT_A, '.vibes'), () => false);
  record(
    '6. A falha de versão não criou nem mudou nada em .vibes/',
    diffSnapshots(vibesBefore, vibesAfter).length === 0 &&
      !existsSync(path.join(PRODUCT_A, '.vibes')),
  );
}

async function stepNetworkCut(): Promise<void> {
  const blocked = await runBash(
    `node -r ./scripts/no-network.cjs -e "fetch('https://example.com').then(() => console.log('PASSOU')).catch((e) => console.log('RECUSADO:' + e.message))"`,
    PRODUCT_A,
    60_000,
  );
  record(
    '9. A rede é recusada no processo do produto depois do npm install',
    blocked.output.includes('RECUSADO:') && !blocked.output.includes('PASSOU'),
    blocked.output.trim().slice(-160),
  );
}

async function stepProjectA(browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<void> {
  const base = `http://127.0.0.1:${PORT_A}`;
  const before = snapshot(PROJECT_A, outsideProduct);
  record(
    '2. Base do projeto registrada para comparar os arquivos',
    before.size >= 4,
    `${before.size} arquivos`,
  );

  // Um caminho de banco válido para quando a raiz existir. Sem raiz, ele deve ser ignorado, e nada
  // pode nascer a partir da pasta do processo (a subpasta do produto).
  const panel = startPanel(PRODUCT_A, PORT_A, { VIBES_DB_PATH: '.vibes/custom/x.db' });
  try {
    await waitForPanel(PORT_A);
    const lan = lanAddress();
    const reachable = lan ? await connectsFrom(lan, PORT_A) : false;
    record(
      '2. O painel abre e escuta só em 127.0.0.1',
      !reachable,
      lan ? `recusou ${lan}` : 'sem LAN',
    );

    const { page, external } = await openPage(browser, base);
    await page.goto(base);
    const text = await failureText(page);
    record(
      '2. Sem aidlc/, a tela de falha mostra o motivo e onde instalar',
      text.includes('Não encontrei a pasta do AI-DLC') && text.includes('Instale o AI-DLC'),
      text.slice(0, 120),
    );
    record(
      '2. A tela oferece Tentar de novo',
      (await page.getByTestId('guide-retry-button').count()) === 1,
    );

    const nothing = [
      path.join(PROJECT_A, '.vibes'),
      path.join(PRODUCT_A, '.vibes'),
      path.join(path.dirname(PRODUCT_A), '.vibes'),
    ].filter((target) => existsSync(target));
    record(
      '3. Sem aidlc/, nada foi criado (nem .vibes/ nem o destino de VIBES_DB_PATH)',
      nothing.length === 0,
      nothing.join(', '),
    );

    const upload = await page.evaluate(async () => {
      const visit = await fetch('/api/customization/visit', { method: 'POST' });
      const { visitId } = (await visit.json()) as { visitId: string };
      const bytes = new Uint8Array(64);
      bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const form = new FormData();
      form.append('momentKey', 'home');
      form.append('visitId', visitId);
      form.append('file', new Blob([bytes], { type: 'image/png' }), 'a.png');
      const response = await fetch('/api/customization/media', { method: 'POST', body: form });
      return { status: response.status, body: (await response.json()) as { message: string } };
    });
    record(
      '3. O envio de imagem sem raiz é recusado com 409 e mensagem em português',
      upload.status === 409 && upload.body.message.includes('Sem o AI-DLC no projeto'),
      `${upload.status} ${upload.body.message}`,
    );
    record(
      '3. A recusa não criou nada',
      !existsSync(path.join(PROJECT_A, '.vibes')) && !existsSync(path.join(PRODUCT_A, '.vibes')),
    );

    // O terminal real abre na pasta pai da subpasta do produto, e a pessoa instala o AI-DLC por ele.
    record(
      '4. Sem raiz, o terminal abre na pasta pai do produto',
      await terminalEndsWith(page, `${ID}/ferramentas`),
    );

    // Um aidlc/ dentro da subpasta do produto, sem .git, não é o do projeto e é ignorado.
    mkdirSync(path.join(PRODUCT_A, 'aidlc'), { recursive: true });
    await clickRetry(page);
    await sleep(1500);
    const stillFailing = await failureText(page);
    record(
      '5. Um aidlc/ dentro da subpasta é ignorado',
      stillFailing.includes('Não encontrei a pasta do AI-DLC') &&
        !existsSync(path.join(PROJECT_A, '.vibes')) &&
        !existsSync(path.join(PRODUCT_A, '.vibes')),
    );
    rmSync(path.join(PRODUCT_A, 'aidlc'), { recursive: true, force: true });

    // Cria o aidlc/ pelo terminal real e tenta de novo, sem reiniciar o painel.
    await typeInTerminal(page, 'mkdir -p ../aidlc/spaces/default/intents && echo criado');
    await until(
      () => existsSync(path.join(PROJECT_A, 'aidlc', 'spaces', 'default', 'intents')),
      30_000,
    );
    await clickRetry(page);
    await page.getByTestId('demand-home').waitFor({ timeout: 60_000 });
    record('6. Criado o aidlc/ pelo terminal, Tentar de novo sai da falha, sem reiniciar', true);
    record(
      '6. A pasta .vibes/ nasce só na raiz do projeto',
      existsSync(path.join(PROJECT_A, '.vibes', 'custom', 'x.db')) &&
        !existsSync(path.join(PRODUCT_A, '.vibes')),
    );
    const notice = page.getByTestId('stale-session-notice');
    record(
      '6. A sessão aberta antes da raiz ganha o aviso de pasta antiga',
      (await notice.count()) === 1 &&
        ((await notice.textContent()) ?? '').includes('ficou na pasta antiga'),
    );

    await page.getByTestId('stale-session-new-session').click();
    await notice.waitFor({ state: 'detached', timeout: 30_000 });
    await sleep(1500);
    record('6. Uma sessão nova abre na raiz do projeto', await terminalEndsWith(page, ID));

    // Apaga o aidlc/ pelo terminal real: a tela volta à falha e avisa da sessão que ficou para trás.
    await typeInTerminal(page, 'rm -rf aidlc && echo apagado');
    await until(() => !existsSync(path.join(PROJECT_A, 'aidlc')), 30_000);
    // O vigia de arquivos nem sempre avisa quando a própria pasta vigiada some: a tela pode seguir no
    // início sem o botão. Quem usa recarrega a página, e é isso que a prova faz.
    await page.reload();
    await clickRetry(page);
    const backToFailure = await failureText(page);
    record(
      '7. Apagado o aidlc/, Tentar de novo volta à falha',
      backToFailure.includes('Não encontrei a pasta do AI-DLC'),
    );
    // A tela já podia estar na falha (o vigia avisou sozinho), então o aviso chega com a resposta de
    // Tentar de novo, e não junto com o texto da falha.
    const stale = await page
      .getByTestId('stale-session-notice')
      .waitFor({ timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    record('7. A tela avisa que a sessão aberta ficou na pasta antiga', stale);

    await page.close();
    await sleep(500);
    record(
      '9. O navegador só falou com a origem do painel',
      external.length === 0,
      external.slice(0, 3).join(', '),
    );
  } finally {
    await stopPanel(panel, PORT_A);
  }

  const blocked = SERVER_LOG.join('').match(/\[vibes\]\[rede-bloqueada\] \S+/g) ?? [];
  const hosts = [...new Set(blocked.map((line) => line.split(' ')[1]))];
  record(
    '9. O servidor não saiu da máquina depois do npm install',
    hosts.every((host) => host === 'registry.npmjs.org'),
    `recusadas: ${hosts.join(', ') || 'nenhuma'}`,
  );

  // Nada fora da subpasta e de .vibes/ mudou: hashes de todo arquivo e git status.
  const after = snapshot(PROJECT_A, outsideProduct);
  const changes = diffSnapshots(before, after);
  record('2. Nenhum arquivo do projeto mudou (hashes)', changes.length === 0, changes.join(', '));
  const status = gitStatusOutsideProduct(PROJECT_A, PRODUCT_A);
  record(
    '2. O git status do projeto está limpo fora da subpasta',
    status.length === 0,
    status.join(', '),
  );
  record(
    '2. O package.json do projeto ficou igual',
    before.get('package.json') === after.get('package.json') &&
      before.get('package-lock.json') === after.get('package-lock.json'),
  );
}

async function stepMissingShell(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<void> {
  writeAidlcWithIntent(PROJECT_A);
  const missing = path.join(WORK, 'sem-git', 'bash.exe');
  const base = `http://127.0.0.1:${PORT_A}`;
  const panel = startPanel(PRODUCT_A, PORT_A, { VIBES_SHELL: missing });
  try {
    await waitForPanel(PORT_A);
    const { page } = await openPage(browser, base);
    await page.goto(base);
    const text = await failureText(page);
    record(
      '8. Sem o Git Bash, a tela mostra o caminho procurado e como resolver',
      text.includes('O Git Bash não foi encontrado') &&
        text.includes(missing) &&
        text.includes('VIBES_SHELL'),
      text.slice(0, 140),
    );
    const response = await fetch(`${base}/api/terminal/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: '{}',
    });
    record('8. O terminal não abre, e não cai para PowerShell nem cmd', response.status === 503);
    await page.close();
  } finally {
    await stopPanel(panel, PORT_A);
  }
}

async function stepProjectB(browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<void> {
  createPersonProject(PROJECT_B, false);
  copyProduct(PRODUCT_B);
  const install = await runBash('npm install --no-audit --no-fund', PRODUCT_B, 15 * 60_000);
  record(
    '10. Sem package.json próprio: npm install conclui',
    install.code === 0,
    install.code === 0 ? '' : install.output.slice(-600),
  );
  if (install.code !== 0) return;

  // O aidlc/ da pessoa já existe neste projeto.
  mkdirSync(path.join(PROJECT_B, 'aidlc', 'spaces', 'default', 'intents'), { recursive: true });
  const before = snapshot(PROJECT_B, outsideProduct);
  const base = `http://127.0.0.1:${PORT_B}`;
  const panel = startPanel(PRODUCT_B, PORT_B);
  try {
    await waitForPanel(PORT_B);
    const { page } = await openPage(browser, base);
    await page.goto(base);
    await page.getByTestId('demand-home').waitFor({ timeout: 120_000 });
    record('10. Sem package.json próprio, o painel abre e acha a raiz', true);
    record(
      '10. A pasta .vibes/ nasce na raiz, e não na subpasta',
      existsSync(path.join(PROJECT_B, '.vibes', 'vibes.db')) &&
        !existsSync(path.join(PRODUCT_B, '.vibes')),
    );
    record('10. O terminal abre na raiz do projeto', await terminalEndsWith(page, ID));
    await page.close();
  } finally {
    await stopPanel(panel, PORT_B);
  }
  const changes = diffSnapshots(before, snapshot(PROJECT_B, outsideProduct));
  record('10. Nenhum arquivo do projeto mudou (hashes)', changes.length === 0, changes.join(', '));
}

/** Apaga a pasta de teste. No Windows, os processos que acabaram de ser encerrados ainda a seguram. */
async function removeWorkDir(): Promise<void> {
  for (let attempt = 1; attempt <= 15; attempt++) {
    await sleep(2000);
    try {
      rmSync(WORK, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 15) console.error(`Não consegui apagar ${WORK}: ${String(error)}`);
    }
  }
}

function printSummary(): void {
  console.log('\nMedidas');
  for (const [name, value] of Object.entries(measures)) console.log(`  ${name}: ${value}`);
  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length} de ${checks.length} conferências passaram.`);
  if (failed.length > 0) process.exitCode = 1;
}

async function main(): Promise<void> {
  if (!existsSync(path.join(ROOT, 'package.json'))) {
    throw new Error('Rode a prova na raiz do repositório do produto.');
  }
  mkdirSync(WORK, { recursive: true });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
  try {
    await stepInstall();
    browser = await chromium.launch({ channel: PROOF_BROWSER_CHANNEL });
    await stepProjectA(browser);
    await stepNetworkCut();
    await stepMissingShell(browser);
    await stepNodeVersion();
    await stepProjectB(browser);
  } catch (error) {
    record(
      'A prova terminou antes do fim',
      false,
      error instanceof Error ? error.message : String(error),
    );
    console.error(SERVER_LOG.join('').slice(-1500));
  } finally {
    await browser?.close();
    await removeWorkDir();
    printSummary();
  }
}

await main();
