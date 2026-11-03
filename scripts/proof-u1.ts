// Prova da fatia U1: painel, Edge e Git Bash reais, sem créditos de IA.
// Passos em `functional-design/functional-spec.md`. Uso: `npx tsx scripts/proof-u1.ts`.
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { chromium, type Page } from '@playwright/test';
import { PROOF_BROWSER_CHANNEL } from '../playwright.config';
import {
  createProofRepo,
  gitStatusOf,
  realRepoChanges,
  ROOT,
  startPanel,
  stopPanel,
} from './proof-repo';

const PORT = Number(process.env.PROOF_PORT ?? 3917);
const BASE = `http://127.0.0.1:${PORT}`;
const PROOF_ID = randomBytes(4).toString('hex');
// A prova roda em uma cópia, sem o `audit/`: U1 prova o caminho pelo `aidlc-state.md`, e nada toca o
// registro real nem o progresso de quem desenvolve.
const REPO = createProofRepo(PROOF_ID, { withAudit: false });
const VIBES_DIR = path.dirname(REPO.dbPath);
const DB_PATH = REPO.dbPath;
const SERVER_LOG: string[] = [];

type Check = { step: string; ok: boolean; detail: string };
const checks: Check[] = [];
const measures: Record<string, string> = {};

function record(step: string, ok: boolean, detail = ''): void {
  checks.push({ step, ok, detail });
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${step}${detail ? ` | ${detail}` : ''}`);
}

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] as number;
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

function connectsFrom(address: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: address, port: PORT, timeout: 1500 });
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

/** Texto visível do terminal, com os espaços do xterm normalizados. */
function screenText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const rows = document.querySelector('.xterm-rows');
    return Array.from(rows?.children ?? [])
      .map((row) => (row.textContent ?? '').replaceAll(' ', ' ').trimEnd())
      .join('\n');
  });
}

async function countOnScreen(page: Page, text: string): Promise<number> {
  return (await screenText(page)).split(text).length - 1;
}

async function typeInTerminal(page: Page, text: string): Promise<void> {
  await page.getByTestId('terminal-screen').click();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

async function openGuide(page: Page): Promise<void> {
  await page.goto(BASE);
  await page.getByTestId('guide-stage-name').waitFor({ timeout: 90_000 });
  await until(() => page.locator('.xterm-rows').count(), 30_000);
}

async function sessionIdFromServer(): Promise<string> {
  const demands = (await (await fetch(`${BASE}/api/demands`)).json()) as { activeIntentId: string };
  const guide = (await (
    await fetch(`${BASE}/api/demands/${demands.activeIntentId}/guide`)
  ).json()) as { session: { sessionId: string } };
  return guide.session.sessionId;
}

function readDb<T>(sql: string): T[] {
  const db = new DatabaseSync(DB_PATH, { readOnly: true });
  try {
    return db.prepare(sql).all() as T[];
  } finally {
    db.close();
  }
}

/**
 * BR4.1 fecha o envio depois do primeiro comando da etapa. Só a prova limpa a tabela, no banco à
 * parte, para exercitar os dois modos de envio na mesma sessão.
 */
function forgetSentCommands(): void {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA busy_timeout = 3000');
  db.exec('DELETE FROM sent_command');
  db.close();
}

async function goToSendMoment(page: Page): Promise<void> {
  await page.reload();
  await page.getByTestId('guide-instruction').waitFor();
  const understood = page.getByTestId('guide-understood-button');
  if (await understood.count()) await understood.click();
  await page.getByTestId('guide-send-card').waitFor();
}

async function stepAddressAndStage(page: Page, activeIntent: string): Promise<void> {
  const state = readFileSync(REPO.statePath, 'utf8');
  const currentSlug = /\*\*Current Stage\*\*: (.+)/.exec(state)?.[1]?.trim() ?? '';
  const guide = (await (await fetch(`${BASE}/api/demands/${activeIntent}/guide`)).json()) as {
    stage: { slug: string; name: string };
  };
  record('1. Etapa vem do intent ativo', guide.stage.slug === currentSlug, currentSlug);
  await openGuide(page);
  record(
    '1. Etapa aparece na tela',
    (await page.getByTestId('guide-stage-name').textContent()) === guide.stage.name,
    guide.stage.name,
  );
  const lan = lanAddress();
  const reachable = lan ? await connectsFrom(lan) : false;
  record(
    '1. Escuta só em 127.0.0.1',
    !reachable,
    lan ? `recusou ${lan}:${PORT}` : 'sem rede externa',
  );
}

async function stepSessionSurvivesReload(page: Page): Promise<string> {
  const variable = `PROVA_${PROOF_ID}`;
  const echoMarker = `MARCA${PROOF_ID}ECO`;
  await until(async () => (await screenText(page)).includes('$'), 30_000);
  const before = await sessionIdFromServer();
  await typeInTerminal(page, `export ${variable}=valor${PROOF_ID}`);
  await typeInTerminal(page, `echo ${echoMarker}`);
  await until(async () => (await countOnScreen(page, echoMarker)) >= 2);

  const reloadStart = Date.now();
  await page.reload();
  await page.getByTestId('guide-stage-name').waitFor();
  await until(async () => (await screenText(page)).includes(echoMarker));
  measures['Reaplicar a saída ao recarregar'] = `${Date.now() - reloadStart} ms`;
  const after = await sessionIdFromServer();
  record('2. Mesmo sessionId depois de recarregar', before === after, after);
  record('2. O marcador aparece na tela', (await countOnScreen(page, echoMarker)) >= 2);

  await typeInTerminal(page, `echo "lida=$${variable}"`);
  await until(async () => (await screenText(page)).includes(`lida=valor${PROOF_ID}`));
  record('2. A variável continua no shell', true);

  const countBefore = await countOnScreen(page, echoMarker);
  const reconnectUrl = await page.evaluate(async () => {
    const sources = (window as unknown as { __proofSources: EventSource[] }).__proofSources;
    const stream = sources
      .filter((s) => s.url.includes('/api/terminal/stream'))
      .at(-1) as EventSource;
    stream.close();
    stream.dispatchEvent(new Event('error'));
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return sources.filter((s) => s.url.includes('/api/terminal/stream')).at(-1)?.url ?? '';
  });
  record('2. Reconexão informa afterSeq', reconnectUrl.includes('afterSeq='), reconnectUrl);
  await typeInTerminal(page, 'echo depois-da-queda');
  await until(async () => (await countOnScreen(page, 'depois-da-queda')) >= 2);
  record(
    '2. O marcador não se repete ao reconectar',
    (await countOnScreen(page, echoMarker)) === countBefore,
    `${countBefore} ocorrências`,
  );
  return echoMarker;
}

async function stepNothingWithoutConfirmation(page: Page): Promise<void> {
  await goToSendMoment(page);
  const marker = `SEMCONFIRMAR${PROOF_ID}`;
  await page.getByTestId('guide-command-input').fill(`echo ${marker}`);
  await sleep(800);
  record('3. Nada chega ao terminal sem confirmar', (await countOnScreen(page, marker)) === 0);
  record(
    '3. Nada é registrado sem confirmar',
    readDb('SELECT command_id FROM sent_command').length === 0,
  );
}

async function stepSendAndPaste(page: Page): Promise<void> {
  const marker = `ENVIADO${PROOF_ID}`;
  await page.getByTestId('guide-command-input').fill(`echo ${marker}$((40+2))`);
  await page.getByTestId('guide-send-button').click();
  await until(async () => (await screenText(page)).includes(`${marker}42`));
  record('4. Comando editado executa no Git Bash', true, `${marker}42`);
  const rows = readDb<{ status: string; mode: string }>('SELECT status, mode FROM sent_command');
  record(
    '4. Registrado como written, em execute',
    rows.length === 1 && rows[0]?.status === 'written' && rows[0]?.mode === 'execute',
  );
  await page.getByTestId('guide-turn').waitFor();
  record(
    '4. O guia acompanha, com a vez da IA',
    (await page.getByTestId('guide-turn').textContent()) === 'Vez da sua IA',
  );

  forgetSentCommands();
  await goToSendMoment(page);
  await page.getByTestId('guide-paste-button').click();
  await page.getByText('Pressione Enter no terminal').waitFor();
  const screen = await screenText(page);
  const lastLine = screen.split('\n').filter(Boolean).at(-1) ?? '';
  record('5. /aidlc colado na linha, sem Enter', lastLine.trimEnd().endsWith('/aidlc'), lastLine);
  record(
    '5. O guia pede Enter, sem afirmar execução',
    (await page.getByTestId('guide-text').textContent())?.includes('ainda não rodou') === true,
  );
  await page.getByTestId('terminal-screen').click();
  await page.keyboard.press('Control+U');
}

async function stepForeignOrigin(): Promise<void> {
  const foreign = await fetch(`${BASE}/api/terminal/input`, {
    method: 'POST',
    headers: { Origin: 'https://malicioso.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'x', data: 'echo invadido\r' }),
  });
  const body = (await foreign.json()) as { code: string };
  record(
    '6. Origin de fora recebe 403',
    foreign.status === 403 && body.code === 'origin_rejected',
    String(foreign.status),
  );
}

async function stepEcho(page: Page): Promise<void> {
  const samples = await measureEcho(page);
  const p95 = percentile(samples, 0.95);
  measures['Eco de 100 teclas'] =
    `p95 ${p95.toFixed(1)} ms, mediana ${percentile(samples, 0.5).toFixed(1)} ms, ` +
    `máximo ${Math.max(...samples).toFixed(1)} ms, ${samples.length} amostras`;
  record(
    '7. Eco até 150 ms em 95% das teclas',
    samples.length === 100 && p95 <= 150,
    `p95 ${p95.toFixed(1)} ms`,
  );
}

/** Do `keydown` ao caractere na tela, medido dentro da página, com o terminal real. */
async function measureEcho(page: Page): Promise<number[]> {
  await typeInTerminal(page, 'clear');
  await sleep(600);
  await page.getByTestId('terminal-screen').click();
  await page.evaluate(() => {
    const state = { samples: [] as number[], start: 0, count: 0 };
    const visible = () =>
      (document.querySelector('.xterm-rows')?.textContent ?? '').replace(/[\s ]/g, '').length;
    state.count = visible();
    window.addEventListener('keydown', () => (state.start = performance.now()), { capture: true });
    const tick = () => {
      const now = visible();
      if (now > state.count && state.start > 0) {
        state.samples.push(performance.now() - state.start);
        state.start = 0;
      }
      state.count = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    (window as unknown as { __echo: typeof state }).__echo = state;
  });

  const letters = 'abcdefghij';
  for (let i = 0; i < 100; i += 1) {
    const expected = i + 1;
    await page.keyboard.press(letters[i % letters.length] as string);
    await page.waitForFunction(
      (target) =>
        (window as unknown as { __echo: { samples: number[] } }).__echo.samples.length >= target,
      expected,
      { timeout: 5000 },
    );
    await sleep(15);
  }
  const samples = await page.evaluate(
    () => (window as unknown as { __echo: { samples: number[] } }).__echo.samples,
  );
  await page.keyboard.press('Control+U');
  return samples;
}

async function stepFileChange(page: Page): Promise<void> {
  // Arquivo de teste dentro do registro observado, na cópia. Removido no fim.
  const watched = path.join(REPO.recordDir, `.aidlc-proof-${PROOF_ID}`);
  const caption = page.getByTestId('guide-last-changed');
  await caption.waitFor();
  const before = await caption.getAttribute('data-value');
  await sleep(1100);
  const start = Date.now();
  writeFileSync(watched, 'prova da fatia');
  try {
    await until(async () => (await caption.getAttribute('data-value')) !== before, 5000);
    const elapsed = Date.now() - start;
    measures['Atualização depois de mudar um arquivo'] = `${elapsed} ms`;
    record('8. A tela atualiza em até 3 segundos', elapsed <= 3000, `${elapsed} ms`);
  } catch {
    measures['Atualização depois de mudar um arquivo'] = 'não atualizou em 5 s';
    record('8. A tela atualiza em até 3 segundos', false, 'não atualizou em 5 s');
  } finally {
    rmSync(watched, { force: true });
  }
}

async function stepF6(page: Page): Promise<void> {
  await page.getByTestId('terminal-screen').click();
  const inTerminal = await page.evaluate(() =>
    Boolean(document.activeElement?.closest('[data-testid="terminal-screen"]')),
  );
  await page.keyboard.press('F6');
  const result = await page.evaluate(() => ({
    testId: document.activeElement?.getAttribute('data-testid'),
    pageHasFocus: document.hasFocus(),
  }));
  record(
    '9. F6 volta ao guia, sem ir à barra de endereço',
    inTerminal && result.testId === 'guide-instruction' && result.pageHasFocus,
    JSON.stringify(result),
  );
  await page.keyboard.press('F6');
  // O foco é dado no quadro seguinte (`requestAnimationFrame`), então a conferência espera por ele.
  const backInTerminal = await page
    .waitForFunction(
      () => Boolean(document.activeElement?.closest('[data-testid="terminal-screen"]')),
      undefined,
      { timeout: 2000 },
    )
    .then(() => true)
    .catch(() => false);
  record('9. F6 volta ao terminal', backInTerminal);
}

async function stepEndSession(page: Page): Promise<void> {
  const before = await sessionIdFromServer();
  await page.getByTestId('terminal-end-session-button').click();
  await page.getByTestId('terminal-confirm-end-button').click();
  await page.getByTestId('guide-new-session-button').waitFor();
  await page.reload();
  await page.getByTestId('guide-new-session-button').waitFor();
  const after = (await (await fetch(`${BASE}/api/demands`)).json()) as { activeIntentId: string };
  const guide = (await (
    await fetch(`${BASE}/api/demands/${after.activeIntentId}/guide`)
  ).json()) as {
    session: { sessionId: string; status: string; endReason: string };
    decision: { moment: string; canSend: boolean };
  };
  record(
    '10. Encerrar e recarregar: nada abre sozinho',
    guide.session.sessionId === before && guide.session.status === 'dead',
    `${guide.session.status}, ${guide.session.endReason}`,
  );
  record('10. O guia oferece Nova sessão', guide.decision.moment === 'session_dead');
  await page.getByTestId('guide-new-session-button').click();
  await until(async () => (await sessionIdFromServer()) !== before);
  record('10. Nova sessão abre outro shell', true);
}

function filesWithMarker(directory: string, marker: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name);
    if (statSync(file).isDirectory()) found.push(...filesWithMarker(file, marker));
    else if (readFileSync(file).includes(marker)) found.push(name);
  }
  return found;
}

function checkDataAndNetwork(
  externalRequests: string[],
  echoMarker: string,
  statusBefore: string[],
): void {
  record(
    'Rede: o navegador só falou com a origem do app',
    externalRequests.length === 0,
    externalRequests.slice(0, 3).join(', '),
  );
  const blocked = SERVER_LOG.join('').match(/\[vibes\]\[rede-bloqueada\] \S+/g) ?? [];
  const hosts = [...new Set(blocked.map((line) => line.split(' ')[1]))];
  measures['Tentativas de rede do Next, recusadas'] = hosts.join(', ') || 'nenhuma';
  record(
    'Rede: o servidor não saiu da máquina',
    hosts.every((host) => host === 'registry.npmjs.org'),
    `recusadas: ${hosts.join(', ') || 'nenhuma'}`,
  );

  const withOutput = existsSync(VIBES_DIR) ? filesWithMarker(VIBES_DIR, echoMarker) : [];
  record(
    'Dados: a saída do terminal não vai a .vibes/',
    withOutput.length === 0,
    withOutput.join(', '),
  );
  const inLogs = SERVER_LOG.join('').includes(`ENVIADO${PROOF_ID}`);
  record('Dados: o texto do comando não vai aos logs', !inLogs);

  // A cópia é onde o produto roda: nada pode mudar lá, nem em `aidlc/`.
  const inCopy = REPO.changesBeyondScript();
  record('Git: o produto não mudou nada na cópia', inCopy.length === 0, inCopy.join(', '));
  const inRealRepo = realRepoChanges(statusBefore);
  record(
    'Git: as ferramentas não mudaram o repositório real',
    inRealRepo.length === 0,
    inRealRepo.join(', '),
  );
}

function printSummary(): void {
  console.log('\nMedidas');
  for (const [name, value] of Object.entries(measures)) console.log(`  ${name}: ${value}`);
  const failed = checks.filter((check) => !check.ok);
  console.log(`\n${checks.length - failed.length} de ${checks.length} conferências passaram.`);
  if (failed.length > 0) process.exitCode = 1;
}

async function main(): Promise<void> {
  const activeIntent = REPO.intentId;
  // O nome vem do registro copiado: nada aqui lê o `active-intent` real de novo.
  const statusBefore = gitStatusOf(ROOT);
  const panel = startPanel(REPO, PORT, SERVER_LOG);
  const browser = await chromium.launch({ channel: PROOF_BROWSER_CHANNEL });
  try {
    await until(async () => {
      try {
        return (await fetch(`${BASE}/api/demands`)).ok;
      } catch {
        return false;
      }
    }, 90_000);

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const externalRequests: string[] = [];
    page.on('request', (request) => {
      const { protocol, origin } = new URL(request.url());
      if ((protocol === 'http:' || protocol === 'https:') && origin !== BASE) {
        externalRequests.push(request.url());
      }
    });
    // O `tsx` envolve as funções com `__name`, que não existe dentro da página.
    await page.addInitScript('globalThis.__name = (fn) => fn;');
    await page.addInitScript(() => {
      const Original = window.EventSource;
      const sources: EventSource[] = [];
      (window as unknown as { __proofSources: EventSource[] }).__proofSources = sources;
      window.EventSource = class extends Original {
        constructor(url: string | URL, init?: EventSourceInit) {
          super(url, init);
          sources.push(this);
        }
      };
    });

    await stepAddressAndStage(page, activeIntent);
    const echoMarker = await stepSessionSurvivesReload(page);
    await stepNothingWithoutConfirmation(page);
    await stepSendAndPaste(page);
    await stepForeignOrigin();
    await stepEcho(page);
    await stepFileChange(page);
    await stepF6(page);
    await stepEndSession(page);
    await page.close();
    await sleep(500);
    checkDataAndNetwork(externalRequests, echoMarker, statusBefore);
  } catch (error) {
    record(
      'A prova terminou antes do fim',
      false,
      error instanceof Error ? error.message : String(error),
    );
    console.error(SERVER_LOG.join('').slice(-1500));
  } finally {
    await browser.close();
    stopPanel(panel);
    await sleep(800);
    REPO.remove();
    printSummary();
  }
}

await main();
