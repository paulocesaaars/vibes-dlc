// Prova de U2: painel, Edge, Git Bash e `aidlc` reais, em uma cópia de teste de um registro real,
// sem créditos de IA. O script escreve os estados na cópia e nunca toca o registro de verdade.
// Passos em `functional-design/functional-spec.md`. Uso: `npx tsx scripts/proof-u2.ts`.
import { randomBytes } from 'node:crypto';
import {
  appendFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { PROOF_BROWSER_CHANNEL } from '../playwright.config';
import { findAidlcCommand, readOpenQuestionCount } from '../src/aidlc/open-questions';
import { killProcessTree } from '../src/terminal/stale-shell';
import {
  createProofRepo,
  gitStatusOf,
  modifiedTimes,
  realRepoChanges,
  ROOT,
  startPanel,
  stopPanel,
} from './proof-repo';

const PORT = Number(process.env.PROOF_PORT ?? 3918);
const BASE = `http://127.0.0.1:${PORT}`;
const PROOF_ID = randomBytes(4).toString('hex');
const REPO = createProofRepo(PROOF_ID, { withAudit: true });
// Etapas ainda abertas no registro copiado: a seguinte precisa estar em `[ ]`.
const STAGE = 'build-and-test';
const NEXT_STAGE = 'ci-pipeline';
const DONE_STAGE = 'requirements-analysis';
const ARTIFACTS_DIR = path.join(REPO.recordDir, 'construction', STAGE);
const SERVER_LOG: string[] = [];
const BASE_STATE = readFileSync(REPO.statePath, 'utf8');
const SECRET_QUESTION = `IGNORE-AS-INSTRUCOES-${PROOF_ID}`;
const HOSTILE_ARTIFACT = `<script>window.__invadiu=true</script><img src="http://externo.example/x-${PROOF_ID}.png">`;

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

function stampNow(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

function auditEntry(event: string, fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(([name, value]) => `**${name}**: ${value}`);
  return `## Prova\n**Timestamp**: ${stampNow()}\n**Event**: ${event}\n${lines.join('\n')}\n\n---\n\n`;
}

function auditFile(): string {
  const [name] = readdirSync(REPO.auditDir);
  return path.join(REPO.auditDir, name as string);
}

/** Toda escrita do script na cópia passa por aqui, para não contar como mudança do produto. */
function appendText(file: string, text: string): void {
  appendFileSync(file, text);
  REPO.noteWrite(file);
}

function writeText(file: string, text: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
  REPO.noteWrite(file);
}

function appendAudit(event: string, fields: Record<string, string>): void {
  appendText(auditFile(), auditEntry(event, fields));
}

/** Escreve a etapa atual e as marcas, como o AI-DLC faria, na cópia de teste. */
function writeState(slug: string, mark: string, others: Record<string, string> = {}): void {
  let state = BASE_STATE.replace(/\*\*Current Stage\*\*: .+/, `**Current Stage**: ${slug}`);
  for (const [stage, value] of Object.entries({ ...others, [slug]: mark })) {
    state = state.replace(new RegExp(`^- \\[.\\] ${stage} `, 'm'), `- [${value}] ${stage} `);
  }
  writeText(REPO.statePath, state);
}

function writeArtifact(name: string, content: string): void {
  writeText(path.join(ARTIFACTS_DIR, name), content);
}

const turn = (page: Page) => page.getByTestId('guide-turn').textContent();
const instruction = (page: Page) => page.getByTestId('guide-instruction').textContent();

async function waitInstruction(page: Page, text: string, timeoutMs = 10_000): Promise<number> {
  const started = Date.now();
  await page
    .getByTestId('guide-instruction')
    .filter({ hasText: text })
    .waitFor({ timeout: timeoutMs });
  return Date.now() - started;
}

/** Começa uma tentativa nova da etapa, sem Unidade, para sair da posição herdada do audit real. */
function startAttempt(mark: string): void {
  appendAudit('STAGE_STARTED', { Stage: STAGE, Agent: 'aidlc-product-agent' });
  writeState(STAGE, mark);
}

async function stepInProgress(page: Page): Promise<void> {
  startAttempt('-');
  await page.goto(BASE);
  await page.getByTestId('guide-stage-name').waitFor({ timeout: 90_000 });
  await waitInstruction(page, 'Compilação e testes', 15_000);
  record('[-] sem comando enviado: Entender', true, (await instruction(page)) ?? '');
  await page.getByTestId('guide-understood-button').click();
  await page.getByTestId('guide-send-card').waitFor();
  await page.getByTestId('guide-send-button').click();
  await waitInstruction(page, 'Pode acompanhar daqui');
  record('[-] com comando enviado: Acompanhar, vez da IA', (await turn(page)) === 'Vez da sua IA');
}

async function stepNewArtifact(page: Page): Promise<void> {
  await sleep(1100);
  const started = Date.now();
  writeArtifact('requirements.md', '# Requisitos\n\nPrimeira versão.\n');
  try {
    await page.getByTestId('artifact-pill').waitFor({ timeout: 5000 });
    const elapsed = Date.now() - started;
    measures['Artefato novo aparece no painel'] = `${elapsed} ms`;
    record('Artefato novo aparece em até 3 s, sem recarregar', elapsed <= 3000, `${elapsed} ms`);
  } catch {
    record('Artefato novo aparece em até 3 s, sem recarregar', false, 'não apareceu em 5 s');
  }
}

async function stepQuestion(page: Page): Promise<void> {
  await sleep(1100);
  const started = Date.now();
  appendAudit('DECISION_RECORDED', {
    Stage: STAGE,
    Decision: SECRET_QUESTION,
    Options: '|A. Sim|B. Não',
  });
  const elapsed = await waitInstruction(page, 'A sua IA tem uma pergunta')
    .then(() => Date.now() - started)
    .catch(() => null);
  if (elapsed === null) {
    record('Pergunta aberta aparece em até 3 s', false, 'não apareceu em 10 s');
    return;
  }
  measures['Pergunta aberta aparece no painel'] = `${elapsed} ms`;
  record('Pergunta aberta aparece em até 3 s', elapsed <= 3000, `${elapsed} ms`);
  record('Com pergunta, a vez é da pessoa', (await turn(page)) === 'Sua vez');
  const text = await page.locator('main').textContent();
  record('O texto da pergunta não aparece na tela', !text?.includes(SECRET_QUESTION));

  appendAudit('QUESTION_ANSWERED', { Stage: STAGE, Details: 'A. Sim', 'Person Reply': 'A. Sim' });
  await waitInstruction(page, 'Pode acompanhar daqui');
  record('Respondida, o guia volta a Acompanhar', true);
}

async function stepReview(page: Page): Promise<void> {
  writeArtifact('stories.md', HOSTILE_ARTIFACT);
  writeState(STAGE, '?');
  await waitInstruction(page, 'Leia antes de aprovar');
  record('[?] com artefato pendente: Revisar', (await turn(page)) === 'Sua vez');
  await page.getByTestId('artifact-content').waitFor();
  record(
    'Revisar mostra o caminho e o que conferir',
    (await page.getByTestId('artifact-path').textContent())?.includes(`construction/${STAGE}/`) ===
      true && (await page.getByTestId('artifact-checklist').count()) === 1,
  );

  await page.getByTestId('artifact-pill').filter({ hasText: 'stories.md' }).click();
  await page.getByTestId('artifact-content').filter({ hasText: '<script>' }).waitFor();
  const raw = await page.getByTestId('artifact-content').textContent();
  const scriptRan = await page.evaluate(
    () => (window as unknown as { __invadiu?: boolean }).__invadiu === true,
  );
  const nested = await page.getByTestId('artifact-content').locator('script, img').count();
  record(
    'Artefato com script aparece como texto, sem executar',
    raw === HOSTILE_ARTIFACT && !scriptRan && nested === 0,
  );
  record(
    'Não há botão de aprovar',
    (await page.getByRole('button', { name: /aprov|approve/i }).count()) === 0,
  );
}

async function stepChangedWhileReading(page: Page): Promise<void> {
  // A resposta da leitura fica retida, então a tela segue mostrando o hash antigo ao marcar.
  await page.route('**/artifacts?*', (route) => route.abort());
  writeArtifact('stories.md', 'Versão nova, gravada enquanto a pessoa lia.\n');
  await page.getByTestId('guide-mark-reviewed-button').click();
  await page.getByTestId('artifact-notice').filter({ hasText: 'mudou enquanto' }).waitFor();
  await page.unroute('**/artifacts?*');
  const shown = await page.getByTestId('artifact-content').textContent();
  record('Conteúdo alterado: 409, aviso e novo conteúdo', shown?.includes('Versão nova') === true);
  await page.getByTestId('guide-mark-reviewed-button').click();
  await page
    .getByTestId('artifact-pill')
    .filter({ hasText: 'requirements.md' })
    .waitFor({ timeout: 5000 });
}

async function stepApprove(page: Page): Promise<void> {
  await page.getByTestId('artifact-content').filter({ hasText: 'Primeira versão' }).waitFor();
  await page.getByTestId('guide-mark-reviewed-button').click();
  await waitInstruction(page, 'Agora é só aprovar');
  const point = await page.getByTestId('guide-point').textContent();
  record(
    'Tudo revisado: Aprovar, com as opções no original',
    point?.includes('Approve') === true && point.includes('Request Changes'),
  );
  record(
    'Aprovar não tem ação na faixa',
    (await page.getByTestId('guide-band').locator('button').count()) === 0,
  );

  writeArtifact('requirements.md', '# Requisitos\n\nSegunda versão.\n');
  await waitInstruction(page, 'Leia antes de aprovar');
  await page.getByTestId('artifact-changed-notice').waitFor();
  record('Revisado que muda volta a pedir revisão, com aviso', true);
  await page.getByTestId('guide-mark-reviewed-button').click();
  await waitInstruction(page, 'Agora é só aprovar');
}

async function stepRevising(page: Page): Promise<void> {
  writeState(STAGE, 'R');
  await waitInstruction(page, 'A sua IA está refazendo');
  record('[R]: em revisão, com a vez da IA', (await turn(page)) === 'Vez da sua IA');
  writeState(STAGE, '-');
  appendAudit('GATE_REJECTED', { Stage: STAGE });
  await page.waitForTimeout(1200);
  record('GATE_REJECTED: em revisão', (await instruction(page)) === 'A sua IA está refazendo');
  writeState(STAGE, '?');
  await waitInstruction(page, 'Agora é só aprovar');
  record('[?] de novo: a aprovação é pedida de novo', true);
}

async function stepConclusion(page: Page): Promise<void> {
  // O que o AI-DLC grava de fato: anterior em `[x]`, atual em `[-]` e `Current Stage` já atualizado.
  appendAudit('GATE_APPROVED', { Stage: STAGE, 'User Input': 'Approve' });
  appendAudit('STAGE_COMPLETED', { Stage: STAGE });
  appendAudit('STAGE_STARTED', { Stage: NEXT_STAGE, Agent: 'aidlc-pipeline-deploy-agent' });
  writeState(NEXT_STAGE, '-', { [STAGE]: 'x' });
  await waitInstruction(page, 'Etapa concluída!');
  const progress = await page.getByTestId('guide-progress').textContent();
  const note = await page.getByTestId('guide-conclusion-note').textContent();
  record(
    'Anterior [x] com GATE_APPROVED e atual [-]: conclusão',
    /\d+ de \d+ etapas/.test(progress ?? ''),
    progress ?? '',
  );
  record(
    'A conclusão conta os artefatos da etapa anterior',
    note?.includes('2 artefatos') === true,
    note ?? '',
  );
  record(
    'A conclusão não oferece envio',
    (await page.getByTestId('guide-send-button').count()) === 0,
  );
  const band = (await page.getByTestId('guide-band-text').textContent()) ?? '';
  record('A faixa cita a etapa que o AI-DLC abriu', band.includes('Esteira de integração'), band);

  await page.reload();
  await waitInstruction(page, 'Etapa concluída!', 15_000);
  record('Recarregar antes de reconhecer mantém a conclusão', true);

  await page.getByTestId('guide-next-stage-button').click();
  await waitInstruction(page, 'Esteira de integração');
  record('Ir para a próxima etapa leva ao Entender dela', true, NEXT_STAGE);
  await page.reload();
  await waitInstruction(page, 'Esteira de integração', 15_000);
  record('Depois de reconhecer, recarregar não volta à conclusão', true);

  await page.getByTestId('guide-understood-button').click();
  await page.getByTestId('guide-send-card').waitFor();
  const command = await page.getByTestId('guide-command-input').inputValue();
  record('Enviar oferece /aidlc na etapa seguinte', command === '/aidlc', command);
}

/** A pessoa foi em frente pelo terminal, sem passar pelo guia: a conclusão não aparece. */
async function stepWentAheadByTerminal(page: Page): Promise<void> {
  // Etapas que o registro real nunca teve: o `audit/` copiado cresce com a construção, e eventos
  // reais de uma etapa mais antiga (como uma pergunta aberta) mudariam o que o guia mostra aqui.
  const ahead = 'performance-validation';
  const before = 'incident-response';
  appendAudit('STAGE_STARTED', { Stage: before, Agent: 'aidlc-architect-agent' });
  appendAudit('GATE_APPROVED', { Stage: before, 'User Input': 'Approve' });
  appendAudit('STAGE_STARTED', { Stage: ahead, Agent: 'aidlc-architect-agent' });
  writeText(path.join(REPO.recordDir, 'construction', ahead, 'performance.md'), '# Já gravado\n');
  writeState(ahead, '-', { [before]: 'x' });
  await page.goto(BASE);
  await waitInstruction(page, 'Validação de desempenho', 15_000);
  record(
    'Com a etapa atual já andando, o guia não volta à conclusão',
    (await page.getByTestId('guide-conclusion').count()) === 0,
  );
}

async function stepTrailDone(page: Page): Promise<void> {
  appendAudit('GATE_APPROVED', { Stage: NEXT_STAGE, 'User Input': 'Approve' });
  writeState(NEXT_STAGE, 'x', { [STAGE]: 'x' });
  await waitInstruction(page, 'Trilha concluída!');
  record(
    'Última etapa [x] com GATE_APPROVED: trilha concluída, sem ação de seguir',
    (await page.getByTestId('guide-next-stage-button').count()) === 0,
  );
  record(
    'A trilha concluída mostra os comandos enviados',
    (await page.getByTestId('guide-sent-commands').count()) === 1,
  );
}

function makeOld(minutes: number): void {
  const when = new Date(Date.now() - minutes * 60_000);
  utimesSync(REPO.statePath, when, when);
  utimesSync(auditFile(), when, when);
}

async function stepIdle(page: Page): Promise<void> {
  appendAudit('STAGE_STARTED', { Stage: 'functional-design', Agent: 'aidlc-architect-agent' });
  appendAudit('UNIT_STARTED', { Stage: 'nfr-design', Unit: 'u2-guide-flow' });
  writeState('functional-design', '-');
  await page.goto(BASE);
  await page.getByTestId('guide-stage-name').filter({ hasText: 'u2-guide-flow' }).waitFor();
  record(
    'Na Construção, o topo mostra Unidade e etapa',
    (await page.getByTestId('guide-stage-name').textContent()) ===
      'u2-guide-flow · Projeto não funcional',
    (await page.getByTestId('guide-stage-name').textContent()) ?? '',
  );
  record(
    'Na trilha, a etapa atual mostra a Unidade',
    (await page.getByTestId('trail-unit').textContent()) === 'u2-guide-flow',
  );
  record(
    'Dentro de uma Unidade, não há Entender nem Enviar',
    (await page.getByTestId('guide-understood-button').count()) === 0 &&
      (await page.getByTestId('guide-send-button').count()) === 0,
  );
  const passed = page.getByTestId('trail-stage-functional-design');
  const passedText = (await passed.textContent()) ?? '';
  record(
    'Etapa por onde a Unidade passou: "anterior", sem cadeado e sem afirmar conclusão',
    (await passed.getAttribute('data-status')) === 'previous' &&
      passedText.includes('anterior') &&
      !/conclu|bloquead/.test(passedText) &&
      (await passed.locator('svg').count()) === 0 &&
      (await passed.isDisabled()),
    passedText,
  );

  makeOld(9);
  await page.reload();
  await page.getByTestId('guide-instruction').waitFor();
  record(
    'Com 9 minutos, a faixa não aparece',
    (await page.getByTestId('guide-idle-notice').count()) === 0,
  );

  makeOld(12);
  await page.reload();
  await page.getByTestId('guide-idle-notice').waitFor({ timeout: 10_000 });
  const text = (await page.getByTestId('guide-idle-text').textContent()) ?? '';
  record(
    'Com data antiga, a faixa aparece e não afirma nada',
    text.includes('12 minutos') && text.includes('pode ter parado'),
    text,
  );

  await page.getByTestId('guide-resume-button').click();
  const command = await page.getByTestId('guide-command-input').inputValue();
  record('Retomar mostra /aidlc no cartão, sem enviar', command === '/aidlc');
  await page.getByTestId('guide-send-button').click();
  await page.getByTestId('guide-send-card').waitFor({ state: 'detached', timeout: 5000 });
  record('O envio só vai depois da confirmação', true);

  await sleep(1100);
  appendAudit('HOST_TURN', { Origin: 'prova' });
  await page.getByTestId('guide-idle-notice').waitFor({ state: 'detached', timeout: 5000 });
  record('Um arquivo mudou, e a faixa some', true);
}

async function stepReopen(page: Page): Promise<void> {
  await page.close();
  appendAudit('UNIT_STARTED', { Stage: 'code-generation', Unit: 'u2-guide-flow' });
  const reopened = await page.context().newPage();
  await reopened.addInitScript('globalThis.__name = (fn) => fn;');
  await reopened.goto(BASE);
  const notice = reopened.getByTestId('guide-changed-notice');
  await notice.waitFor({ timeout: 15_000 });
  const text = (await notice.textContent()) ?? '';
  record('Reabrir com mudança: avisa o que mudou', text.includes('Geração de código'), text);
  record('O aviso não afirma aprovação de Unidade', !text.includes('aprovada'));
  record(
    'O momento atual continua na tela',
    (await reopened.getByTestId('guide-instruction').count()) === 1,
  );
  await reopened.getByTestId('guide-changed-dismiss-button').click();
  await notice.waitFor({ state: 'detached' });
  await reopened.reload();
  await reopened.getByTestId('guide-instruction').waitFor();
  await sleep(800);
  record(
    'Depois de Entendi, reabrir não avisa de novo',
    (await reopened.getByTestId('guide-changed-notice').count()) === 0,
  );
  await stepKeyboardTrail(reopened);
  await stepEchoDuringAuditRead(reopened);
  await reopened.close();
}

async function stepKeyboardTrail(page: Page): Promise<void> {
  writeText(
    path.join(REPO.recordDir, 'inception', DONE_STAGE, 'requirements.md'),
    '# Requisitos aprovados\n',
  );
  const phase = page.getByTestId('trail-phase-inception');
  await phase.focus();
  await page.keyboard.press('Enter');
  const done = page.getByTestId(`trail-stage-${DONE_STAGE}`);
  await done.waitFor();
  await done.focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('guide-consult').waitFor();
  record('A trilha abre uma etapa concluída com o teclado', true);
  await page.getByTestId('artifact-content').filter({ hasText: 'Requisitos aprovados' }).waitFor();
  record('A etapa concluída mostra os artefatos dela', true);
  await page.getByTestId('guide-back-button').click();
  await page.getByTestId('guide-consult').waitFor({ state: 'detached' });
  const blocked = page.getByTestId(`trail-stage-${NEXT_STAGE}`);
  record('Uma etapa bloqueada não abre', await blocked.isDisabled());
}

/** Eco durante a leitura de um `audit/` grande: a leitura não pode bloquear o processo (NFR1.2). */
async function stepEchoDuringAuditRead(page: Page): Promise<void> {
  const noise = auditEntry('SENSOR_PASSED', { Stage: 'x', Details: 'y'.repeat(40) }).repeat(4000);
  appendText(auditFile(), noise);
  const lines = readFileSync(auditFile(), 'utf8').split('\n').length;
  record('O audit/ da prova tem mais de 10 mil linhas', lines > 10_000, `${lines} linhas`);

  await page.getByTestId('terminal-screen').click();
  await page.keyboard.type('clear');
  await page.keyboard.press('Enter');
  await sleep(600);
  await page.evaluate(() => {
    const state = { samples: [] as number[], start: 0, count: 0 };
    const visible = () =>
      (document.querySelector('.xterm-rows')?.textContent ?? '').replace(/[\s ]/g, '').length;
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
  for (let i = 0; i < 60; i += 1) {
    // A cada 10 teclas, um arquivo muda, e o painel relê o `audit/` inteiro.
    if (i % 10 === 0) appendText(auditFile(), auditEntry('HOST_TURN', { Origin: 'prova' }));
    await page.keyboard.press(letters[i % letters.length] as string);
    await page.waitForFunction(
      (target) =>
        (window as unknown as { __echo: { samples: number[] } }).__echo.samples.length >= target,
      i + 1,
      { timeout: 5000 },
    );
    await sleep(25);
  }
  const samples = await page.evaluate(
    () => (window as unknown as { __echo: { samples: number[] } }).__echo.samples,
  );
  await page.keyboard.press('Control+U');
  const p95 = percentile(samples, 0.95);
  measures['Eco durante a leitura do audit/'] =
    `p95 ${p95.toFixed(1)} ms, máximo ${Math.max(...samples).toFixed(1)} ms, ${samples.length} amostras, ${lines} linhas`;
  record(
    'Eco até 150 ms em 95% das teclas, lendo o audit/',
    p95 <= 150,
    `p95 ${p95.toFixed(1)} ms`,
  );
}

/** O comando real, na cópia: mede o tempo e confere que `aidlc/` e o Git não mudam. */
async function stepRealCommand(): Promise<void> {
  const command = findAidlcCommand(process.env);
  if (!command) {
    record('Comando real do aidlc', false, 'o comando não foi encontrado');
    return;
  }
  const aidlcDir = path.join(REPO.root, 'aidlc');
  const statusBefore = gitStatusOf(REPO.root);
  const timesBefore = modifiedTimes(aidlcDir);
  // O ambiente herdado traz a sessão desta CLI: a lista permitida não pode deixá-la passar.
  const options = { env: process.env, killTree: (pid: number) => killProcessTree(pid) };
  const samples: number[] = [];
  let count: number | 'unavailable' = 'unavailable';
  for (let i = 0; i < 5; i += 1) {
    const started = performance.now();
    count = await readOpenQuestionCount(
      { stage: STAGE, unit: null, cwd: REPO.root },
      { ...options, timeoutMs: 15_000 },
    );
    samples.push(performance.now() - started);
  }
  const slowest = Math.max(...samples);
  measures['Comando real de perguntas'] =
    `mediana ${percentile(samples, 0.5).toFixed(0)} ms, máximo ${slowest.toFixed(0)} ms, ${samples.length} execuções`;
  record('O comando real devolve uma contagem', typeof count === 'number', String(count));
  record(
    'O comando real fica abaixo do limite de 1,5 s',
    slowest <= 1500,
    `${slowest.toFixed(0)} ms`,
  );

  const timesAfter = modifiedTimes(aidlcDir);
  const changed = [...timesAfter].filter(([file, time]) => timesBefore.get(file) !== time);
  record(
    'O comando não mudou nada em aidlc/',
    changed.length === 0 && timesAfter.size === timesBefore.size,
    changed.map(([file]) => path.basename(file)).join(', '),
  );
  const statusAfter = gitStatusOf(REPO.root);
  record(
    'O comando não mudou o git status da cópia',
    JSON.stringify(statusBefore) === JSON.stringify(statusAfter),
    statusAfter.join(', '),
  );
}

function checkNetworkAndData(externalRequests: string[], statusBefore: string[]): void {
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
  record(
    'Logs: o texto da pergunta não vai ao console',
    !SERVER_LOG.join('').includes(SECRET_QUESTION),
  );
  // A cópia é onde o produto roda: além do que o script escreveu, nada pode mudar, nem em `aidlc/`.
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

    await stepRealCommand();

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const externalRequests: string[] = [];
    context.on('request', (request) => {
      const { protocol, origin } = new URL(request.url());
      if ((protocol === 'http:' || protocol === 'https:') && origin !== BASE) {
        externalRequests.push(request.url());
      }
    });
    // O `tsx` envolve as funções com `__name`, que não existe dentro da página.
    await page.addInitScript('globalThis.__name = (fn) => fn;');

    await stepInProgress(page);
    await stepNewArtifact(page);
    await stepQuestion(page);
    await stepReview(page);
    await stepChangedWhileReading(page);
    await stepApprove(page);
    await stepRevising(page);
    await stepConclusion(page);
    await stepTrailDone(page);
    await stepWentAheadByTerminal(page);
    await stepIdle(page);
    await stepReopen(page);
    checkNetworkAndData(externalRequests, statusBefore);
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
