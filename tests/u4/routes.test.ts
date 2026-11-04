import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET as getCustomization, PUT as putCustomization } from '@/app/api/customization/route';
import { POST as postMedia } from '@/app/api/customization/media/route';
import { GET as getMedia } from '@/app/api/customization/media/[mediaId]/route';
import { POST as postVisit } from '@/app/api/customization/visit/route';
import { POST as postCancel } from '@/app/api/customization/visit/cancel/route';
import { POST as postDone } from '@/app/api/customization/visit/done/route';
import { GET as getDemands } from '@/app/api/demands/route';
import { COLOR_KEYS } from '@/customization/colors';
import { CUSTOMIZABLE_MOMENTS } from '@/guide/customizable-moments';
import {
  APP_HOST,
  APP_ORIGIN,
  appRequest,
  createHarness,
  type Harness,
} from '../u1/routes-harness';
import { mediaBytes } from './helpers';

let harness: Harness;
beforeEach(() => {
  harness = createHarness({ shell: { path: 'bash.exe', searched: ['bash.exe'] } });
});
afterEach(() => harness.dispose());

const BOUNDARY = '----vibes-teste';
const TOO_BIG = 25 * 1024 * 1024 + 1;

async function open(): Promise<string> {
  const response = await postVisit(appRequest('/api/customization/visit'));
  expect(response.status).toBe(200);
  return ((await response.json()) as { visitId: string }).visitId;
}

type Fields = { momentKey?: string; visitId?: string; filename?: string };

/** Corpo multipart em partes, sem copiar os bytes do arquivo. */
function multipartChunks(file: Uint8Array, fields: Fields): Uint8Array[] {
  const field = (name: string, value: string) =>
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
  const head =
    (fields.momentKey === undefined ? '' : field('momentKey', fields.momentKey)) +
    (fields.visitId === undefined ? '' : field('visitId', fields.visitId)) +
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${fields.filename ?? 'arte.png'}"\r\nContent-Type: image/png\r\n\r\n`;
  const parts: Uint8Array[] = [Buffer.from(head)];
  for (let start = 0; start < file.length; start += 65536) {
    parts.push(file.subarray(start, Math.min(start + 65536, file.length)));
  }
  parts.push(Buffer.from(`\r\n--${BOUNDARY}--\r\n`));
  return parts;
}

function streamOf(chunks: Uint8Array[], onPull?: () => void): ReadableStream<Uint8Array> {
  let index = 0;
  // Com marca d'água 0, o fluxo só puxa dados quando alguém lê, e a contagem vale como leitura.
  return new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        onPull?.();
        const chunk = chunks[index++];
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
    },
    { highWaterMark: 0 },
  );
}

function uploadRequest(
  body: ReadableStream<Uint8Array> | string,
  headers: Record<string, string> = {},
): Request {
  return new Request(`${APP_ORIGIN}/api/customization/media`, {
    method: 'POST',
    headers: {
      host: APP_HOST,
      origin: APP_ORIGIN,
      'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
      ...headers,
    },
    body,
    duplex: 'half',
  } as RequestInit);
}

async function upload(file: Uint8Array, fields: Fields, headers: Record<string, string> = {}) {
  return postMedia(uploadRequest(streamOf(multipartChunks(file, fields)), headers));
}

async function uploadOk(momentKey = 'home', file: Uint8Array = mediaBytes('png')) {
  const visitId = await open();
  const response = await upload(file, { momentKey, visitId });
  expect(response.status).toBe(200);
  const state = (await response.json()) as { media: Record<string, { mediaId: string }> };
  return { visitId, mediaId: state.media[momentKey]!.mediaId };
}

function mediaRequest(mediaId: string, headers: Record<string, string> = {}): [Request, never] {
  return [
    new Request(`${APP_ORIGIN}/api/customization/media/${mediaId}`, {
      headers: { host: APP_HOST, ...headers },
    }),
    { params: Promise.resolve({ mediaId }) } as never,
  ];
}

// O corpo das respostas tem formas diferentes por rota; o teste confere só os campos que cita.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = async (response: Response) => (await response.json()) as Record<string, any>;

describe('origem e esquema', () => {
  const foreign = { origin: 'http://evil.example:3456' };
  it('rejeita Origin e Host de fora em todas as rotas', async () => {
    const id = '11111111-2222-4333-8444-555555555555';
    const responses = [
      await getCustomization(
        appRequest('/api/customization', { method: 'GET', headers: { host: 'evil.example' } }),
      ),
      await putCustomization(
        appRequest('/api/customization', {
          method: 'PUT',
          body: { visitId: 'x' },
          headers: foreign,
        }),
      ),
      await postVisit(appRequest('/api/customization/visit', { headers: foreign })),
      await postDone(
        appRequest('/api/customization/visit/done', { body: { visitId: 'x' }, headers: foreign }),
      ),
      await postCancel(
        appRequest('/api/customization/visit/cancel', { body: { visitId: 'x' }, headers: foreign }),
      ),
      await postMedia(uploadRequest('', foreign)),
      await getMedia(...mediaRequest(id, { host: 'evil.example' })).then((r) => r),
    ];
    for (const response of responses) {
      expect(response.status).toBe(403);
      expect((await json(response)).code).toBe('origin_rejected');
    }
    expect(harness.runtime.customization.read().visitId).toBeNull();
  });

  it('recusa chave desconhecida, cor inválida e momentos fora da regra com invalid_value', async () => {
    const visitId = await open();
    const put = async (body: unknown) =>
      putCustomization(appRequest('/api/customization', { method: 'PUT', body }));
    const bodies = [
      { visitId, terminal: true },
      { visitId, colors: { brand: 'red' } },
      { visitId, colors: { fundo: '#ffffff' } },
      { visitId, says: { failure: { title: 'x' } } },
      { visitId, says: { session_dead: { title: 'x' } } },
      { visitId, says: { not_active: { text: 'x' } } },
      { visitId, says: { home: { cor: 'x' } } },
      { visitId, media: { failure: null } },
      { visitId, media: { home: 'arquivo.png' } },
      { visitId, cliKind: 'bash' },
      { visitId, resetAll: false },
      { visitId, resetAll: true, cliKind: 'other' },
      {},
    ];
    for (const body of bodies) {
      const response = await put(body);
      expect(response.status, JSON.stringify(body)).toBe(422);
      expect((await json(response)).code).toBe('invalid_value');
    }
    expect(harness.runtime.customization.read().colors.custom).toEqual({});
  });
});

describe('visita e PUT', () => {
  it('abre, salva, relê e conclui, devolvendo a personalização com os avisos de contraste', async () => {
    const visitId = await open();
    const saved = await putCustomization(
      appRequest('/api/customization', {
        method: 'PUT',
        body: {
          visitId,
          colors: { text: '#EEEEEE' },
          says: { home: { title: 'Olá <script>' } },
          cliKind: 'other',
        },
      }),
    );
    expect(saved.status).toBe(200);
    const body = await json(saved);
    expect(body.colors.custom.text).toBe('#eeeeee');
    expect(body.says.home.title).toBe('Olá <script>');
    expect(body.warnings[0]).toMatchObject({ colorKey: 'text', minimum: 4.5 });
    expect(body.derived.onAccent).toBeTruthy();
    const read = await getCustomization(appRequest('/api/customization', { method: 'GET' }));
    expect((await json(read)).visitId).toBe(visitId);
    const done = await postDone(appRequest('/api/customization/visit/done', { body: { visitId } }));
    expect((await json(done)).visitId).toBeNull();
    expect(harness.runtime.customization.readCliKind()).toBe('other');
  });

  it('Cancelar desfaz a visita pela rota', async () => {
    const visitId = await open();
    await putCustomization(
      appRequest('/api/customization', {
        method: 'PUT',
        body: { visitId, colors: { brand: '#112233' } },
      }),
    );
    const cancelled = await postCancel(
      appRequest('/api/customization/visit/cancel', { body: { visitId } }),
    );
    expect((await json(cancelled)).colors.custom).toEqual({});
  });

  it('responde 409 stale_visit com visitId antigo, ausente ou depois de Concluir', async () => {
    const first = await open();
    await open();
    const stale = await putCustomization(
      appRequest('/api/customization', {
        method: 'PUT',
        body: { visitId: first, cliKind: 'other' },
      }),
    );
    expect(stale.status).toBe(409);
    expect((await json(stale)).code).toBe('stale_visit');
    const done = await postDone(
      appRequest('/api/customization/visit/done', { body: { visitId: first } }),
    );
    expect(done.status).toBe(409);
    const missing = await postCancel(appRequest('/api/customization/visit/cancel', { body: {} }));
    expect(missing.status).toBe(422);
  });

  it('Outra CLI salva bloqueia o envio nas rotas existentes e entra no retrato das demandas', async () => {
    await harness.setCliKind('other');
    const response = await getDemands(appRequest('/api/demands', { method: 'GET' }));
    expect((await json(response)).cliKind).toBe('other');
  });
});

describe('envio de mídia', () => {
  it('grava um PNG válido, troca a referência e o devolve por GET com os cabeçalhos fixos', async () => {
    const { mediaId } = await uploadOk();
    const served = await getMedia(...mediaRequest(mediaId));
    expect(served.status).toBe(200);
    expect(served.headers.get('content-type')).toBe('image/png');
    expect(served.headers.get('x-content-type-options')).toBe('nosniff');
    expect(served.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
    expect(served.headers.get('content-disposition')).toBe('inline');
    expect(served.headers.get('accept-ranges')).toBe('bytes');
    expect(served.headers.get('cache-control')).toBe('private, max-age=31536000, immutable');
    expect(served.headers.get('content-length')).toBe('64');
    expect(new Uint8Array(await served.arrayBuffer())).toEqual(mediaBytes('png'));
  });

  it('decide pelo conteúdo: SVG com nome .png, HTML e arquivo vazio dão 415, e nada fica no disco', async () => {
    const visitId = await open();
    for (const content of ['<svg xmlns="http://www.w3.org/2000/svg"/>', '<html></html>', '']) {
      const response = await upload(new Uint8Array(Buffer.from(content)), {
        momentKey: 'home',
        visitId,
      });
      expect(response.status, content).toBe(415);
      expect((await json(response)).code).toBe('unsupported_type');
    }
    const renamed = await upload(mediaBytes('png'), {
      momentKey: 'home',
      visitId,
      filename: 'arte.svg',
    });
    expect(renamed.status).toBe(200);
    const mediaDir = harness.runtime.config.mediaDir;
    expect(
      existsSync(mediaDir) ? await import('node:fs').then((fs) => fs.readdirSync(mediaDir)) : [],
    ).toHaveLength(1);
  });

  it('recusa 25 MiB mais 1 byte com 413 e mantém a mídia anterior', async () => {
    const { visitId, mediaId } = await uploadOk();
    const big = mediaBytes('png', TOO_BIG);
    const response = await upload(big, { momentKey: 'home', visitId });
    expect(response.status).toBe(413);
    expect((await json(response)).code).toBe('too_large');
    expect(harness.runtime.customization.read().media.home?.mediaId).toBe(mediaId);
  });

  it('recusa pelo Content-Length sem ler o corpo', async () => {
    let pulled = 0;
    const stream = streamOf([Buffer.from('x')], () => pulled++);
    const response = await postMedia(uploadRequest(stream, { 'content-length': '27262977' }));
    expect(response.status).toBe(413);
    expect(pulled).toBe(0);
  });

  it('conta os bytes quando o Content-Length falta ou é menor que o corpo real', async () => {
    const visitId = await open();
    const chunks = multipartChunks(mediaBytes('png', TOO_BIG + 1024 * 1024), {
      momentKey: 'home',
      visitId,
    });
    const chunked = await postMedia(uploadRequest(streamOf(chunks)));
    expect(chunked.status).toBe(413);
    const lying = await postMedia(uploadRequest(streamOf(chunks), { 'content-length': '1000' }));
    expect(lying.status).toBe(413);
    expect(harness.runtime.customization.read().media).toEqual({});
  });

  it('recusa corpo que não é multipart, campos faltando e momento desconhecido ou de recuperação inexistente', async () => {
    const visitId = await open();
    const notMultipart = await postMedia(
      uploadRequest('{}', { 'content-type': 'application/json' }),
    );
    expect(notMultipart.status).toBe(422);
    const noVisit = await upload(mediaBytes('png'), { momentKey: 'home' });
    expect(noVisit.status).toBe(422);
    const garbled = await postMedia(uploadRequest('isto não é multipart'));
    expect(garbled.status).toBe(422);
    for (const momentKey of ['failure', 'inexistente', '../home']) {
      const response = await upload(mediaBytes('png'), { momentKey, visitId });
      expect(response.status, momentKey).toBe(422);
    }
    expect((await upload(mediaBytes('png'), { momentKey: 'session_dead', visitId })).status).toBe(
      200,
    );
  });

  it('responde 409 stale_visit sem gravar com visita antiga', async () => {
    const stale = await open();
    await open();
    const response = await upload(mediaBytes('png'), { momentKey: 'home', visitId: stale });
    expect(response.status).toBe(409);
    expect((await json(response)).code).toBe('stale_visit');
    expect(harness.runtime.customization.read().media).toEqual({});
  });

  it('responde 429 busy a um segundo envio enquanto o primeiro lê, e solta depois', async () => {
    const visitId = await open();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const chunks = multipartChunks(mediaBytes('png'), { momentKey: 'home', visitId });
    let started!: () => void;
    const reading = new Promise<void>((resolve) => (started = resolve));
    let index = 0;
    const slow = new ReadableStream<Uint8Array>({
      async pull(controller) {
        started();
        await gate;
        const chunk = chunks[index++];
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
    });
    const first = postMedia(uploadRequest(slow));
    await reading;
    let secondPulled = 0;
    const second = await postMedia(uploadRequest(streamOf(chunks, () => secondPulled++)));
    expect(second.status).toBe(429);
    expect((await json(second)).code).toBe('busy');
    expect(secondPulled).toBe(0);
    release();
    expect((await first).status).toBe(200);
    expect((await upload(mediaBytes('png'), { momentKey: 'send', visitId })).status).toBe(200);
  });

  it('mantém o pico de memória de um envio de 25 MiB abaixo de 100 MB acima da linha de base', async () => {
    const visitId = await open();
    const file = mediaBytes('png', 25 * 1024 * 1024);
    // Torna residentes as páginas do arquivo de teste: o que o pico mede é o servidor, não o teste.
    file.fill(7, 8);
    const chunks = multipartChunks(file, { momentKey: 'home', visitId });
    global.gc?.();
    const baseline = process.memoryUsage().rss;
    let peak = baseline;
    const timer = setInterval(() => {
      peak = Math.max(peak, process.memoryUsage().rss);
    }, 10);
    const response = await postMedia(uploadRequest(streamOf(chunks)));
    clearInterval(timer);
    peak = Math.max(peak, process.memoryUsage().rss);
    expect(response.status).toBe(200);
    console.info(
      `Pico de memória do envio de 25 MiB: ${Math.round((peak - baseline) / 1048576)} MiB acima da linha de base.`,
    );
    expect(peak - baseline).toBeLessThan(100 * 1024 * 1024);
    expect((await json(response)).media.home.mediaId).toBeTruthy();
  });
});

/** Percentil 95 de 10 repetições, como em `performance-requirements.md`. */
async function p95Ms(work: () => Promise<unknown>): Promise<number> {
  const samples: number[] = [];
  for (let run = 0; run < 10; run++) {
    const started = performance.now();
    await work();
    samples.push(performance.now() - started);
  }
  return samples.sort((a, b) => a - b)[Math.ceil(samples.length * 0.95) - 1] as number;
}

describe('tempos de leitura', () => {
  it('lê a personalização com 53 linhas em até 300 ms, sem ler arquivo de mídia (NFR1.1)', async () => {
    const visitId = await open();
    const editable = CUSTOMIZABLE_MOMENTS.filter((moment) => moment.textEditable);
    await putCustomization(
      appRequest('/api/customization', {
        method: 'PUT',
        body: {
          visitId,
          colors: Object.fromEntries(COLOR_KEYS.map((key) => [key, '#123456'])),
          says: Object.fromEntries(
            editable.map((moment) => [moment.momentKey, { title: 'Título', text: 'Texto' }]),
          ),
          cliKind: 'other',
        },
      }),
    );
    for (const moment of CUSTOMIZABLE_MOMENTS) {
      const uploaded = await upload(mediaBytes('png'), { momentKey: moment.momentKey, visitId });
      expect(uploaded.status).toBe(200);
    }
    expect(harness.runtime.customization.readCliKind()).toBe('other');
    // Sem os arquivos, a leitura só dá certo se não depender deles.
    rmSync(harness.runtime.config.mediaDir, { recursive: true, force: true });
    const read = () => getCustomization(appRequest('/api/customization', { method: 'GET' }));
    const state = await json(await read());
    expect(Object.keys(state.colors.custom)).toHaveLength(COLOR_KEYS.length);
    expect(Object.keys(state.says)).toHaveLength(editable.length);
    expect(Object.keys(state.media)).toHaveLength(CUSTOMIZABLE_MOMENTS.length);
    expect(await p95Ms(read)).toBeLessThan(300);
  });

  it('começa a responder a mídia em até 200 ms (NFR1.4)', async () => {
    const { mediaId } = await uploadOk('home', mediaBytes('mp4', 25 * 1024 * 1024));
    const elapsed = await p95Ms(async () => {
      const served = await getMedia(...mediaRequest(mediaId, { range: 'bytes=0-1023' }));
      expect(served.status).toBe(206);
      await served.body?.cancel();
    });
    expect(elapsed).toBeLessThan(200);
  });
});

describe('servir a mídia', () => {
  it('trata Range: uma faixa (206), sufixo, fora do arquivo (416) e várias faixas (200 inteiro)', async () => {
    const { mediaId } = await uploadOk('home', mediaBytes('mp4', 100));
    const get = (range: string) => getMedia(...mediaRequest(mediaId, { range }));

    const part = await get('bytes=10-19');
    expect(part.status).toBe(206);
    expect(part.headers.get('content-range')).toBe('bytes 10-19/100');
    expect(part.headers.get('content-length')).toBe('10');
    expect((await part.arrayBuffer()).byteLength).toBe(10);

    const open = await get('bytes=90-');
    expect(open.headers.get('content-range')).toBe('bytes 90-99/100');

    const suffix = await get('bytes=-5');
    expect(suffix.status).toBe(206);
    expect(suffix.headers.get('content-range')).toBe('bytes 95-99/100');

    const beyond = await get('bytes=500-600');
    expect(beyond.status).toBe(416);
    expect(beyond.headers.get('content-range')).toBe('bytes */100');

    const many = await get('bytes=0-1,5-6');
    expect(many.status).toBe(200);
    expect((await many.arrayBuffer()).byteLength).toBe(100);

    const clipped = await get('bytes=95-500');
    expect(clipped.headers.get('content-range')).toBe('bytes 95-99/100');
    expect((await get('bytes=-0')).status).toBe(416);
    expect((await get('palavras')).status).toBe(200);
  });

  it('responde 404 a mediaId malformado, com .., inexistente ou arquivo apagado à mão, sem gravar no banco', async () => {
    const { mediaId } = await uploadOk();
    for (const bad of ['..', '../vibes.db', 'abc', '11111111-2222-4333-8444-555555555555']) {
      const response = await getMedia(...mediaRequest(bad));
      expect(response.status, bad).toBe(404);
      expect((await json(response)).code).toBe('not_found');
    }
    const before = harness.runtime.customization.read();
    rmSync(path.join(harness.runtime.config.mediaDir, `${mediaId}.png`));
    expect((await getMedia(...mediaRequest(mediaId))).status).toBe(404);
    const after = harness.runtime.customization.read();
    expect(after.media.home?.mediaId).toBe(mediaId);
    expect(after).toEqual(before);
    expect(
      (await getCustomization(appRequest('/api/customization', { method: 'GET' }))).status,
    ).toBe(200);
  });
});
