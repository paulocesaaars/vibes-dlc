// Prova de U4 em cópia isolada: painel, navegador e Git Bash reais, sem executar IA.
import { randomBytes } from 'node:crypto';
import { appendFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
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

const repo = createProofRepo(randomBytes(4).toString('hex'), { withAudit: true });
const port = Number(process.env.PROOF_PORT ?? 3920);
const base = `http://127.0.0.1:${port}`;
const log: string[] = [];
let failed = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? 'OK' : 'FALHA'} ${label}`);
  if (!ok) failed++;
}
async function ready() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${base}/api/customization`)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('O painel não abriu.');
}

/** PNG de 1x1 pixel válido. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const filesDir = path.join(repo.root, '.vibes', 'proof-files');
function sample(name: string, content: Buffer): string {
  mkdirSync(filesDir, { recursive: true });
  const file = path.join(filesDir, name);
  writeFileSync(file, content);
  return file;
}
function pngOfSize(bytes: number): Buffer {
  const content = Buffer.alloc(bytes, 7);
  PNG_1X1.copy(content);
  return content;
}

async function customization(page: Page) {
  return page.evaluate(async () => (await fetch('/api/customization')).json());
}
const previewArt = (page: Page) => page.getByTestId('customize-preview').getByTestId('moment-art');

function percentile95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1] as number;
}

/**
 * Abre `build-and-test` na cópia, como o AI-DLC faria, para o guia poder chegar ao passo Enviar: o
 * registro copiado pode estar no meio de uma etapa, em que nenhum botão de envio aparece.
 */
function startOpenStage(): void {
  const stage = 'build-and-test';
  const [auditName] = readdirSync(repo.auditDir);
  const auditFile = path.join(repo.auditDir, auditName as string);
  const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  appendFileSync(
    auditFile,
    `## Prova\n**Timestamp**: ${stamp}\n**Event**: STAGE_STARTED\n**Stage**: ${stage}\n**Agent**: aidlc-product-agent\n\n---\n\n`,
  );
  repo.noteWrite(auditFile);
  const state = readFileSync(repo.statePath, 'utf8')
    .replace(/\*\*Current Stage\*\*: .+/, `**Current Stage**: ${stage}`)
    .replace(new RegExp(`^- \\[.\\] ${stage} `, 'm'), `- [-] ${stage} `);
  writeFileSync(repo.statePath, state);
  repo.noteWrite(repo.statePath);
}

/**
 * Envia um arquivo e espera a resposta e o fim do envio na tela. O aviso de erro de um envio anterior
 * continua visível e o campo ignora um arquivo escolhido com outro envio em andamento, então esperar
 * só pelo aviso deixaria a prova adiante do painel.
 */
async function upload(page: Page, name: string, content: Buffer): Promise<number> {
  const answered = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      new URL(response.url()).pathname === '/api/customization/media',
    { timeout: 30_000 },
  );
  await page.getByTestId('media-file').setInputFiles(sample(name, content));
  const status = (await answered).status();
  await page.waitForFunction(
    () => !(document.querySelector('[data-testid=media-file]') as HTMLInputElement).disabled,
  );
  return status;
}

async function main() {
  const beforeReal = gitStatusOf(ROOT);
  const panel = startPanel(repo, port, log);
  const browser = await chromium.launch({ channel: PROOF_BROWSER_CHANNEL });
  try {
    await ready();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const outside: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(base) && !url.startsWith('data:') && !url.startsWith('blob:')) {
        outside.push(url);
      }
    });
    await page.goto(base);
    await page.getByTestId('guide-stage-name').waitFor({ timeout: 30_000 });
    const faviconHref = () =>
      page.evaluate(() => document.querySelector('link[rel~="icon"]')?.getAttribute('href') ?? '');
    const faviconBefore = await faviconHref();
    const faviconSize = async () =>
      page.evaluate(
        async (href) => (await (await fetch(href)).arrayBuffer()).byteLength,
        faviconBefore,
      );
    const faviconBytes = await faviconSize();

    // --- Visita 1: tudo o que o Cancelar precisa desfazer ---
    await page.getByTestId('customize-open').click();
    await page.getByTestId('customize-preview').waitFor();
    const originalSrc = await previewArt(page).getAttribute('src');

    check('Um PNG válido é aceito', (await upload(page, 'arte.png', PNG_1X1)) === 200);
    await page.waitForFunction(() =>
      document
        .querySelector('[data-testid=customize-preview] [data-testid=moment-art]')
        ?.getAttribute('src')
        ?.includes('/api/customization/media/'),
    );
    const customSrc = await previewArt(page).getAttribute('src');
    const loaded = await page
      .waitForFunction(() => {
        const image = document.querySelector(
          '[data-testid=customize-preview] [data-testid=moment-art]',
        ) as HTMLImageElement | null;
        return image !== null && image.complete && image.naturalWidth > 0;
      })
      .then(() => true)
      .catch(() => false);
    check('O PNG troca a arte do momento e carrega no navegador', loaded);

    const refused: [string, string, Buffer, number][] = [
      [
        'SVG',
        'arte.svg',
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
        415,
      ],
      [
        'SVG disfarçado de PNG',
        'falso.png',
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
        415,
      ],
      ['arquivo acima de 25 MiB', 'grande.png', pngOfSize(25 * 1024 * 1024 + 1), 413],
    ];
    for (const [label, name, content, expectedStatus] of refused) {
      const status = await upload(page, name, content);
      const errorShown = await page.getByTestId('customize-error').isVisible();
      check(
        `Recusa ${label} com ${expectedStatus}, avisa e mantém a mídia anterior`,
        status === expectedStatus &&
          errorShown &&
          (await previewArt(page).getAttribute('src')) === customSrc,
      );
    }
    const mediaDir = path.join(repo.root, '.vibes', 'media');
    check('Nenhum arquivo recusado ficou em .vibes/media/', readdirSync(mediaDir).length === 1);

    // NFR1.3: da escolha do arquivo à prévia com a mídia nova carregada, em 10 repetições.
    const limitFile = pngOfSize(25 * 1024 * 1024);
    const uploadTimes: number[] = [];
    let limitAccepted = true;
    let previousSrc = customSrc;
    for (let run = 0; run < 10; run++) {
      const started = Date.now();
      limitAccepted = (await upload(page, 'limite.png', limitFile)) === 200 && limitAccepted;
      await page.waitForFunction(
        (previous) => {
          const image = document.querySelector(
            '[data-testid=customize-preview] [data-testid=moment-art]',
          ) as HTMLImageElement | null;
          return (
            image !== null &&
            image.getAttribute('src') !== previous &&
            image.complete &&
            image.naturalWidth > 0
          );
        },
        previousSrc,
        { timeout: 30_000 },
      );
      uploadTimes.push(Date.now() - started);
      previousSrc = await previewArt(page).getAttribute('src');
    }
    const uploadP95 = percentile95(uploadTimes);
    check(
      `Envio de exatamente 25 MiB chega à prévia, p95 de ${uploadP95} ms em 10 repetições (meta de 5000 ms)`,
      limitAccepted && uploadP95 <= 5000,
    );
    check(
      'O aviso de erro some depois de um envio aceito',
      (await page.getByTestId('customize-error').count()) === 0,
    );

    // NFR12.1: três mídias grandes ao mesmo tempo, com o tamanho de cada uma na tela.
    const sizesShown: (string | null)[] = [];
    for (const momentKey of ['new_describe', 'send']) {
      await page.getByTestId(`moment-${momentKey}`).click();
      const accepted = await upload(page, 'limite.png', limitFile);
      sizesShown.push(accepted === 200 ? await page.getByTestId('media-size').textContent() : null);
    }
    await page.getByTestId('moment-home').click();
    sizesShown.push(await page.getByTestId('media-size').textContent());
    const largeFiles = (await customization(page)).media;
    check(
      `Três mídias de 25 MiB ficam salvas, com o tamanho na tela (${sizesShown.join(' | ')})`,
      Object.keys(largeFiles).length === 3 && sizesShown.every((text) => text?.includes('25,0 MB')),
    );
    for (const momentKey of ['new_describe', 'send']) {
      await page.getByTestId(`moment-${momentKey}`).click();
      await page.getByTestId('media-reset').click();
      await page.getByTestId('media-size').waitFor({ state: 'detached' });
    }
    await page.getByTestId('moment-home').click();

    await page.getByTestId('media-reset').click();
    await page.waitForFunction(
      (src) =>
        document
          .querySelector('[data-testid=customize-preview] [data-testid=moment-art]')
          ?.getAttribute('src') === src,
      originalSrc,
    );
    check(
      'Voltar ao original traz a arte original',
      (await previewArt(page).getAttribute('src')) === originalSrc &&
        Object.keys((await customization(page)).media).length === 0,
    );

    check('Um novo PNG entra na mesma visita', (await upload(page, 'arte.png', PNG_1X1)) === 200);
    await page.waitForFunction(() =>
      document
        .querySelector('[data-testid=customize-preview] [data-testid=moment-art]')
        ?.getAttribute('src')
        ?.includes('/api/customization/media/'),
    );

    // NFR1.2: da ação à prévia atualizada, em 10 repetições.
    const saveTimes: number[] = [];
    for (let run = 0; run < 10; run++) {
      const title = `Medida ${run}`;
      await page.getByTestId('say-title').fill(title);
      const started = Date.now();
      await page.getByTestId('say-title').blur();
      await page.getByTestId('preview-title').filter({ hasText: title }).waitFor();
      saveTimes.push(Date.now() - started);
      await page.waitForFunction(
        () => !(document.querySelector('[data-testid=say-title]') as HTMLInputElement).disabled,
      );
    }
    const saveP95 = percentile95(saveTimes);
    check(
      `Salvar uma frase atualiza a prévia, p95 de ${saveP95} ms em 10 repetições (meta de 500 ms)`,
      saveP95 <= 500,
    );

    await page.getByTestId('say-title').fill('Título da prova <b>x</b>');
    await page.getByTestId('say-title').blur();
    await page.getByTestId('preview-title').filter({ hasText: 'Título da prova' }).waitFor();
    check(
      'Frase com HTML aparece como texto',
      (await page.getByTestId('preview-title').textContent()) === 'Título da prova <b>x</b>',
    );

    await page.getByTestId('color-text').fill('#eeeeee');
    await page.getByTestId('contrast-warning').waitFor();
    check(
      'Aviso de contraste aparece e a cor é salva mesmo assim',
      (await customization(page)).colors.custom.text === '#eeeeee',
    );
    await page.getByTestId('color-brand').fill('#0000ff');
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector('.brand svg rect') as Element).fill ===
        'rgb(0, 0, 255)',
    );
    check(
      'O logo muda de cor com a cor Logo e título',
      (await customization(page)).colors.custom.brand === '#0000ff',
    );
    check(
      'O favicon continua o mesmo',
      (await faviconHref()) === faviconBefore && (await faviconSize()) === faviconBytes,
    );

    await page.getByTestId('cli-other').click();
    await page.getByTestId('cli-other-note').waitFor();
    check(
      'Outra CLI não oferece Abrir a sua IA',
      (await page.getByText(/Abrir a sua IA/).count()) === 0,
    );

    await page.getByTestId('customize-cancel').click();
    await page.getByTestId('customize-screen').waitFor({ state: 'detached' });
    const afterCancel = await customization(page);
    check(
      'Cancelar desfaz mídia, frase, cor e Sua IA da visita inteira',
      Object.keys(afterCancel.media).length === 0 &&
        Object.keys(afterCancel.says).length === 0 &&
        Object.keys(afterCancel.colors.custom).length === 0 &&
        afterCancel.cliKind === 'claude_code',
    );
    check('Cancelar apaga os arquivos novos de .vibes/media/', readdirSync(mediaDir).length === 0);
    check(
      'As cores voltam ao original na tela',
      ((await page.getByTestId('guide-app').getAttribute('style')) ?? '') === '',
    );

    const statusAfterVisit = gitStatusOf(repo.root);
    check(
      `Git status da cópia limpo depois da visita${statusAfterVisit.length ? `: ${statusAfterVisit.join(', ')}` : ''}`,
      statusAfterVisit.length === 0,
    );

    // --- Visita 2: Outra CLI deixa Enviar sem botão ---
    startOpenStage();
    await page.reload();
    await page
      .getByTestId('guide-instruction')
      .filter({ hasText: 'Compilação e testes' })
      .waitFor({ timeout: 15_000 });
    await page.getByTestId('customize-open').click();
    await page.getByTestId('cli-other').click();
    await page.getByTestId('cli-other-note').waitFor();
    await page.getByTestId('customize-done').click();
    await page.getByTestId('customize-screen').waitFor({ state: 'detached' });
    await page.getByTestId('guide-understood-button').click();
    await page
      .getByTestId('guide-instruction')
      .filter({ hasText: 'Confira o comando' })
      .waitFor({ timeout: 15_000 });
    check(
      'O guia chegou ao passo Enviar',
      (await page.getByTestId('guide-send-card').count()) === 1,
    );
    check(
      'Com Outra CLI, Enviar fica sem botão de envio',
      (await page.getByTestId('guide-send-button').count()) === 0 &&
        (await page.getByTestId('guide-paste-button').count()) === 0,
    );
    check(
      'Com Outra CLI, o comando aparece como referência, com a orientação de digitar o equivalente',
      (await page.getByTestId('guide-command-input').inputValue()).startsWith('/aidlc') &&
        ((await page.getByTestId('guide-send-reminder').textContent()) ?? '').includes(
          'Digite o equivalente',
        ),
    );

    // A outra CLI grava o primeiro artefato da etapa: o guia passa a Acompanhar (BR6.3). A gravação é
    // simulada na cópia, como nas demais provas; nenhuma outra CLI roda aqui.
    const stageDir = path.join(path.dirname(repo.statePath), 'construction', 'build-and-test');
    mkdirSync(stageDir, { recursive: true });
    const firstArtifact = path.join(stageDir, 'build-instructions.md');
    writeFileSync(firstArtifact, '# Instruções de build\n');
    repo.noteWrite(firstArtifact);
    await page.reload();
    const followed = await page
      .getByTestId('guide-instruction')
      .filter({ hasText: 'Pode acompanhar daqui' })
      .waitFor({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    check('Com Outra CLI, o primeiro artefato da etapa leva o guia a Acompanhar', followed);

    // --- Volta ao padrão e confere o isolamento ---
    await page.getByTestId('customize-open').click();
    await page.getByTestId('cli-claude_code').click();
    await page.getByTestId('customize-reset').click();
    await page.getByTestId('customize-reset-confirm').click();
    await page.getByTestId('customize-done').click();
    await page.getByTestId('customize-screen').waitFor({ state: 'detached' });
    check('Sua IA volta a Claude Code', (await customization(page)).cliKind === 'claude_code');
    // Controle da checagem de Outra CLI: no mesmo passo, com Claude Code, o botão existe.
    const sendOffered = await page
      .getByTestId('guide-send-button')
      .waitFor({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    check('Com Claude Code, o mesmo passo oferece o botão de envio', sendOffered);

    check(
      `O navegador só falou com a origem do app${outside.length ? `: ${outside.slice(0, 3).join(', ')}` : ''}`,
      outside.length === 0,
    );
    const blocked = log.join('').match(/\[vibes\]\[rede-bloqueada\] \S+/g) ?? [];
    const hosts = [...new Set(blocked.map((line) => line.split(' ')[1]))];
    check(
      `O servidor não saiu da máquina (recusadas: ${hosts.join(', ') || 'nenhuma'})`,
      hosts.every((host) => host === 'registry.npmjs.org'),
    );
    check('Produto não escreve fora de .vibes/', repo.changesBeyondScript().length === 0);
    check('Repositório real preservado', realRepoChanges(beforeReal).length === 0);
    await context.close();
  } catch (error) {
    failed++;
    console.error(error);
    console.error(log.join('').slice(-1500));
  } finally {
    await browser.close();
    stopPanel(panel);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    repo.remove();
    if (failed) process.exitCode = 1;
  }
}
await main();
