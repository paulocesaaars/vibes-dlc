// Prova de U3 em cópia isolada: painel, navegador e Git Bash reais, sem executar IA.
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { PROOF_BROWSER_CHANNEL } from '../playwright.config';
import { Database } from '../src/db/database';
import {
  createProofRepo,
  gitStatusOf,
  modifiedTimes,
  realRepoChanges,
  ROOT,
  startPanel,
  stopPanel,
} from './proof-repo';

const repo = createProofRepo(randomBytes(4).toString('hex'), { withAudit: true });
const port = Number(process.env.PROOF_PORT ?? 3919);
const base = `http://127.0.0.1:${port}`;
const log: string[] = [];
let failed = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? 'OK' : 'FALHA'} ${label}`);
  if (!ok) failed++;
}
function write(file: string, value: string) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, value);
  repo.noteWrite(file);
}
async function ready() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/api/demands`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('O painel não abriu.');
}

async function main() {
  const beforeReal = gitStatusOf(ROOT);
  const panel = startPanel(repo, port, log);
  const browser = await chromium.launch({ channel: PROOF_BROWSER_CHANNEL });
  try {
    await ready();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(base);
    await page.getByTestId('guide-stage-name').waitFor({ timeout: 30_000 });
    const originalTimes = modifiedTimes(path.join(repo.root, 'aidlc'));
    const originalStatus = gitStatusOf(repo.root);
    await page.getByTestId('guide-brand').click();
    await page.getByTestId('demand-home').waitFor();
    await page.getByTestId('demand-row').first().waitFor();
    check('Início mostra demanda ativa', (await page.getByTestId('demand-row').count()) === 1);

    await page.getByTestId('new-demand').click();
    await page.getByTestId('demand-description').fill('corrigir a vulnerabilidade CVE-2026-1234');
    await page.getByTestId('demand-next').click();
    check(
      'Sugestão prioriza security-patch',
      (await page.getByTestId('demand-level').inputValue()) === 'security-patch',
    );
    await page.getByTestId('demand-next').click();
    check(
      'Comando visível antes de confirmar',
      (await page.getByTestId('demand-command').inputValue()).includes('--scope security-patch'),
    );
    await page.getByTestId('demand-paste').click();
    await page.getByText(/Esperando sua IA criar a demanda/).waitFor();
    const db = new Database(repo.dbPath);
    const written = db.all<{ status: string; kind: string }>(
      "SELECT status, kind FROM sent_command WHERE kind = 'new_demand'",
    );
    db.close();
    check(
      'Envio confirmado chega à sessão real do Git Bash',
      written.some((row) => row.status === 'written'),
    );

    const otherId = '261103-outra-demanda';
    const otherRecord = path.join(repo.root, 'aidlc', 'spaces', 'default', 'intents', otherId);
    mkdirSync(otherRecord, { recursive: true });
    write(
      path.join(otherRecord, 'aidlc-state.md'),
      readFileSync(repo.statePath, 'utf8').replace(
        /\*\*Project\*\*: .+/,
        '**Project**: Outra demanda',
      ),
    );
    await page.getByTestId('demand-home').waitFor({ timeout: 10_000 });
    await page.getByTestId('demand-row').nth(1).waitFor({ timeout: 10_000 });
    check('Novo registro aparece no Início', (await page.getByTestId('demand-row').count()) === 2);
    await page.getByTestId('demand-row').filter({ hasText: 'Outra demanda' }).click();
    await page.getByTestId('consultation-band').waitFor();
    check(
      'Demanda não ativa bloqueia envio',
      (await page.getByTestId('guide-send-button').count()) === 0,
    );
    await page.getByTestId('activate-demand').click();
    check(
      'Ativação exige confirmação',
      (await page.getByText(`/aidlc intent switch ${otherId}`).count()) === 1,
    );
    const activated = await page.evaluate(async (intentId) => {
      const response = await fetch(`/api/demands/${intentId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandId: crypto.randomUUID(), mode: 'paste' }),
      });
      return response.ok;
    }, otherId);
    check('Comando de ativação confirmado pode ser colado sem executar IA', activated);
    write(
      path.join(repo.root, 'aidlc', 'spaces', 'default', 'intents', 'active-intent'),
      `${otherId}\n`,
    );
    await page.getByTestId('consultation-band').waitFor({ state: 'hidden', timeout: 10_000 });

    await page.getByTestId('open-demand-tabs').click();
    for (const tab of ['artifacts', 'units', 'decisions', 'history']) {
      await page.getByTestId(`tab-${tab}`).click();
      check(
        `Aba ${tab} abre`,
        (await page.getByTestId(`tab-${tab}`).getAttribute('aria-pressed')) === 'true',
      );
    }
    const artifactPath = path.join(otherRecord, 'inception', 'requirements-analysis', 'test.md');
    write(artifactPath, '# Exemplo\n\nConteúdo da prova.\n');
    await page.getByTestId('tab-artifacts').click();
    await page.getByTestId('artifact-stage').selectOption('requirements-analysis');
    await page.getByTestId('artifact-pill').filter({ hasText: 'test.md' }).click();
    await page.getByTestId('note-text').fill('Nota da prova');
    await page.getByTestId('note-save').click();
    await page.getByText('Nota da prova').waitFor();
    check(
      'Nota fica no banco, sem editar o artefato',
      readFileSync(artifactPath, 'utf8') === '# Exemplo\n\nConteúdo da prova.\n',
    );
    const afterTimes = modifiedTimes(path.join(repo.root, 'aidlc'));
    check(
      'Produto não edita arquivos do AI-DLC',
      [...afterTimes].every(
        ([file, time]) =>
          originalTimes.get(file) === time ||
          file.startsWith(otherRecord) ||
          file.endsWith('active-intent'),
      ),
    );
    check('Produto não escreve além da cópia de teste', repo.changesBeyondScript().length === 0);
    check('Repositório real preservado', realRepoChanges(beforeReal).length === 0);
    check(
      'Status Git da cópia reflete só o script',
      gitStatusOf(repo.root).length >= originalStatus.length,
    );
    await context.close();
  } catch (error) {
    failed++;
    console.error(error);
    console.error(log.join('').slice(-1000));
  } finally {
    await browser.close();
    stopPanel(panel);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    repo.remove();
    if (failed) process.exitCode = 1;
  }
}
await main();
