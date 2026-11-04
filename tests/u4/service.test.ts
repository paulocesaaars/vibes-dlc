import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { CustomizationError, nodeMediaFiles } from '@/customization/customization-service';
import { detectMediaType } from '@/customization/media-type';
import { createService, mediaBytes, mediaFiles, type ServiceKit } from './helpers';

let kit: ServiceKit | null = null;
afterEach(() => {
  kit?.close();
  kit = null;
});
const png = () => ({ bytes: mediaBytes('png'), type: detectMediaType(mediaBytes('png'))! });
const mp4 = () => ({ bytes: mediaBytes('mp4'), type: detectMediaType(mediaBytes('mp4'))! });
async function failure(promise: Promise<unknown>): Promise<CustomizationError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(CustomizationError);
  return error as CustomizationError;
}
async function visit() {
  const opened = await kit!.service.openVisit();
  return opened.visitId;
}

describe('visita', () => {
  it('lê o original sem linhas e abre uma visita com retrato', async () => {
    kit = createService();
    const state = kit.service.read();
    expect(state).toMatchObject({ visitId: null, cliKind: 'claude_code', says: {}, media: {} });
    expect(state.colors.effective.brand).toBe('#ff385c');
    const id = await visit();
    expect(kit.service.read().visitId).toBe(id);
  });

  it('abrir outra visita invalida a anterior com stale_visit, sem desfazer nada', async () => {
    kit = createService();
    const first = await visit();
    await kit.service.put(first, { colors: { brand: '#112233' } });
    const second = await visit();
    expect((await failure(kit.service.put(first, { cliKind: 'other' }))).code).toBe('stale_visit');
    expect(kit.service.read().colors.custom.brand).toBe('#112233');
    expect(second).not.toBe(first);
  });

  it('sem visita aberta, qualquer ação responde stale_visit e não grava', async () => {
    kit = createService();
    expect((await failure(kit.service.put('x', { cliKind: 'other' }))).status).toBe(409);
    expect((await failure(kit.service.done('x'))).code).toBe('stale_visit');
    expect((await failure(kit.service.cancel('x'))).code).toBe('stale_visit');
    const { bytes, type } = png();
    expect((await failure(kit.service.saveMedia('x', 'home', bytes, type))).code).toBe(
      'stale_visit',
    );
    expect(kit.repo.all()).toEqual([]);
    expect(mediaFiles(kit.mediaDir)).toEqual([]);
  });

  it('Cancelar desfaz mídia, frase, cor e Sua IA da visita inteira', async () => {
    kit = createService();
    const setup = await visit();
    const { bytes, type } = png();
    await kit.service.saveMedia(setup, 'home', bytes, type);
    await kit.service.put(setup, { colors: { accent: '#00aa00' }, cliKind: 'other' });
    await kit.service.done(setup);
    const before = kit.repo.all();
    const original = mediaFiles(kit.mediaDir);

    const id = await visit();
    await kit.service.saveMedia(id, 'home', mp4().bytes, mp4().type);
    await kit.service.saveMedia(id, 'send', bytes, type);
    await kit.service.put(id, {
      colors: { accent: '#ff00ff', brand: '#123456' },
      says: { home: { title: 'Olá' } },
      cliKind: null,
    });
    await kit.service.cancel(id);
    expect(kit.repo.all().sort((a, b) => a.itemKey.localeCompare(b.itemKey))).toEqual(
      before.sort((a, b) => a.itemKey.localeCompare(b.itemKey)),
    );
    expect(mediaFiles(kit.mediaDir)).toEqual(original);
    expect(kit.service.read().visitId).toBeNull();
  });

  it('Cancelar com falha na transação não muda nada e mantém a visita aberta', async () => {
    kit = createService();
    const id = await visit();
    await kit.service.put(id, { colors: { brand: '#123456' } });
    const original = kit.repo.replaceAll.bind(kit.repo);
    kit.repo.replaceAll = () => {
      throw new Error('disco cheio');
    };
    expect((await failure(kit.service.cancel(id))).code).toBe('save_failed');
    expect(kit.service.read().colors.custom.brand).toBe('#123456');
    expect(kit.service.read().visitId).toBe(id);
    kit.repo.replaceAll = original;
    await kit.service.cancel(id);
    expect(kit.service.read().colors.custom).toEqual({});
  });

  it('Concluir apaga o arquivo trocado e mantém o que está em uso', async () => {
    kit = createService();
    const id = await visit();
    const { bytes, type } = png();
    await kit.service.saveMedia(id, 'home', bytes, type);
    const first = kit.service.read().media.home!.mediaId;
    await kit.service.saveMedia(id, 'home', mp4().bytes, mp4().type);
    const second = kit.service.read().media.home!.mediaId;
    expect(mediaFiles(kit.mediaDir).sort()).toEqual([`${first}.png`, `${second}.mp4`].sort());
    await kit.service.done(id);
    expect(mediaFiles(kit.mediaDir)).toEqual([`${second}.mp4`]);
  });
});

describe('PUT', () => {
  it('valida e normaliza cores e recusa chave desconhecida sem gravar nada', async () => {
    kit = createService();
    const id = await visit();
    await kit.service.put(id, { colors: { brand: '#ABCDEF' } });
    expect(kit.service.read().colors.custom.brand).toBe('#abcdef');
    for (const colors of [{ brand: 'red' }, { brand: '#fff' }, { nope: '#ffffff' }]) {
      expect((await failure(kit.service.put(id, { colors, cliKind: 'other' }))).status).toBe(422);
    }
    expect(kit.service.read().cliKind).toBe('claude_code');
  });

  it('frase vazia ou só com espaços volta ao original, e acima do limite é recusada', async () => {
    kit = createService();
    const id = await visit();
    await kit.service.put(id, { says: { home: { title: '  Oi  ', text: 'Texto' } } });
    expect(kit.service.read().says.home).toEqual({ title: 'Oi', text: 'Texto' });
    await kit.service.put(id, { says: { home: { title: '   ', text: null } } });
    expect(kit.service.read().says.home).toBeUndefined();
    expect(
      (await failure(kit.service.put(id, { says: { home: { title: 'x'.repeat(121) } } }))).code,
    ).toBe('invalid_value');
    expect(
      (await failure(kit.service.put(id, { says: { home: { text: 'x'.repeat(601) } } }))).code,
    ).toBe('invalid_value');
    await kit.service.put(id, {
      says: { home: { title: 'x'.repeat(120), text: 'y'.repeat(600) } },
    });
  });

  it('Sua IA aceita só claude_code e other, e null volta ao padrão', async () => {
    kit = createService();
    const id = await visit();
    await kit.service.put(id, { cliKind: 'other' });
    expect(kit.service.readCliKind()).toBe('other');
    await kit.service.put(id, { cliKind: null });
    expect(kit.service.readCliKind()).toBe('claude_code');
    const bad = kit.service.put(id, { cliKind: 'bash' as never });
    expect((await failure(bad)).code).toBe('invalid_value');
  });

  it('Restaurar tudo apaga imagens, frases e cores e preserva Sua IA', async () => {
    kit = createService();
    const id = await visit();
    const { bytes, type } = png();
    await kit.service.saveMedia(id, 'home', bytes, type);
    await kit.service.put(id, {
      colors: { brand: '#112233' },
      says: { home: { title: 'Oi' } },
      cliKind: 'other',
    });
    await kit.service.put(id, { resetAll: true });
    const state = kit.service.read();
    expect(state).toMatchObject({ says: {}, media: {}, cliKind: 'other' });
    expect(state.colors.custom).toEqual({});
    expect((await failure(kit.service.put(id, { resetAll: true, cliKind: 'other' }))).code).toBe(
      'invalid_value',
    );
    await kit.service.done(id);
    expect(mediaFiles(kit.mediaDir)).toEqual([]);
  });

  it('voltar ao original de um item que já é original não faz nada', async () => {
    kit = createService();
    const id = await visit();
    await kit.service.put(id, { colors: { brand: null }, media: { home: null }, cliKind: null });
    expect(kit.repo.all()).toEqual([]);
  });

  it('uma falha na transação do PUT mantém a personalização anterior', async () => {
    kit = createService();
    const id = await visit();
    await kit.service.put(id, { colors: { brand: '#112233' } });
    kit.repo.replaceAll = () => {
      throw new Error('falha');
    };
    expect((await failure(kit.service.put(id, { colors: { brand: '#445566' } }))).code).toBe(
      'save_failed',
    );
    expect(kit.service.read().colors.custom.brand).toBe('#112233');
  });
});

describe('gravação de mídia', () => {
  it('grava o arquivo com o nome do mediaId e troca a referência do momento', async () => {
    kit = createService();
    const id = await visit();
    const { bytes, type } = png();
    const state = await kit.service.saveMedia(id, 'home', bytes, type);
    const media = state.media.home!;
    expect(media.url).toBe(`/api/customization/media/${media.mediaId}`);
    expect(mediaFiles(kit.mediaDir)).toEqual([`${media.mediaId}.png`]);
    expect([...readFileSync(path.join(kit.mediaDir, `${media.mediaId}.png`))]).toEqual([...bytes]);
    expect(kit.service.mediaFile(media.mediaId)).toMatchObject({
      contentType: 'image/png',
      sizeBytes: bytes.length,
    });
    expect(kit.service.mediaFile('00000000-0000-4000-8000-000000000000')).toBeNull();
    expect(kit.service.mediaFile('../x')).toBeNull();
  });

  it('disco cheio no temporário apaga o parcial e mantém a mídia anterior', async () => {
    kit = createService({
      files: {
        writeFile: async (file, bytes) => {
          if (file.endsWith('.tmp') && bytes.length === 99) {
            await nodeMediaFiles.writeFile(file, bytes.subarray(0, 10));
            throw new Error('ENOSPC');
          }
          return nodeMediaFiles.writeFile(file, bytes);
        },
      },
    });
    const id = await visit();
    const { bytes, type } = png();
    await kit.service.saveMedia(id, 'home', bytes, type);
    const before = kit.service.read().media.home!.mediaId;
    const big = mediaBytes('png', 99);
    expect((await failure(kit.service.saveMedia(id, 'home', big, type))).code).toBe('save_failed');
    expect(kit.service.read().media.home!.mediaId).toBe(before);
    expect(mediaFiles(kit.mediaDir)).toEqual([`${before}.png`]);
    expect(kit.logs.some((entry) => entry.line.includes('save_failed operação=media'))).toBe(true);
  });

  it('falha no rename apaga o temporário, e falha na linha apaga o arquivo final', async () => {
    kit = createService({
      files: {
        rename: async () => {
          throw new Error('rename');
        },
      },
    });
    let id = await visit();
    const { bytes, type } = png();
    expect((await failure(kit.service.saveMedia(id, 'home', bytes, type))).code).toBe(
      'save_failed',
    );
    expect(mediaFiles(kit.mediaDir)).toEqual([]);
    kit.close();

    kit = createService();
    id = await visit();
    kit.repo.upsert = () => {
      throw new Error('banco');
    };
    expect((await failure(kit.service.saveMedia(id, 'home', bytes, type))).code).toBe(
      'save_failed',
    );
    expect(mediaFiles(kit.mediaDir)).toEqual([]);
  });

  it('recusa arquivo vazio e acima de 25 MiB dentro da fila', async () => {
    kit = createService();
    const id = await visit();
    const { type } = png();
    expect((await failure(kit.service.saveMedia(id, 'home', new Uint8Array(), type))).status).toBe(
      415,
    );
    const big = new Uint8Array(25 * 1024 * 1024 + 1);
    expect((await failure(kit.service.saveMedia(id, 'home', big, type))).status).toBe(413);
    expect(mediaFiles(kit.mediaDir)).toEqual([]);
  });

  it('dois envios em sequência para o mesmo momento deixam um arquivo em uso e um sem dono até Concluir', async () => {
    kit = createService();
    const id = await visit();
    const { bytes, type } = png();
    await kit.service.saveMedia(id, 'home', bytes, type);
    await kit.service.saveMedia(id, 'home', bytes, type);
    expect(mediaFiles(kit.mediaDir)).toHaveLength(2);
    await kit.service.done(id);
    expect(mediaFiles(kit.mediaDir)).toHaveLength(1);
  });

  it('dois envios simultâneos para o mesmo momento passam pela fila e sobra um arquivo ao Concluir', async () => {
    kit = createService();
    const id = await visit();
    const { bytes, type } = png();
    const [first, second] = await Promise.all([
      kit.service.saveMedia(id, 'home', bytes, type),
      kit.service.saveMedia(id, 'home', bytes, type),
    ]);
    expect(first.media.home!.mediaId).not.toBe(second.media.home!.mediaId);
    expect(kit.repo.all().filter((row) => row.kind === 'media')).toHaveLength(1);
    await kit.service.done(id);
    expect(mediaFiles(kit.mediaDir)).toHaveLength(1);
  });

  it('mídia em voo que cruza Concluir ou Cancelar recebe stale_visit e não deixa arquivo', async () => {
    kit = createService();
    const { bytes, type } = png();
    for (const close of ['done', 'cancel'] as const) {
      const id = await visit();
      const closing = kit.service[close](id);
      const late = kit.service.saveMedia(id, 'home', bytes, type);
      await closing;
      expect((await failure(late)).code).toBe('stale_visit');
      expect(mediaFiles(kit.mediaDir)).toEqual([]);
      expect(kit.repo.all()).toEqual([]);
    }
  });

  it('a fila segue em frente depois de uma operação que falhou', async () => {
    kit = createService();
    const id = await visit();
    const failed = kit.service.put(id, { colors: { brand: 'red' } });
    const next = kit.service.put(id, { colors: { brand: '#112233' } });
    await failure(failed);
    expect((await next).colors.custom.brand).toBe('#112233');
  });
});

describe('varredura do início', () => {
  it('apaga mídia sem linha e todo temporário, e mantém a referenciada', async () => {
    kit = createService();
    const id = await visit();
    const { bytes, type } = png();
    await kit.service.saveMedia(id, 'home', bytes, type);
    await kit.service.done(id);
    const used = kit.service.read().media.home!.mediaId;
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path.join(kit.mediaDir, '11111111-2222-4333-8444-555555555555.png'), 'x');
    writeFileSync(path.join(kit.mediaDir, '22222222-2222-4333-8444-555555555555.tmp'), 'x');
    writeFileSync(path.join(kit.mediaDir, 'notas.txt'), 'x');
    expect(await kit.service.sweep()).toEqual({ removed: 2, aborted: false });
    expect(mediaFiles(kit.mediaDir)).toEqual(['notas.txt', `${used}.png`].sort());
  });

  it('aborta sem apagar nada quando a leitura do banco falha', async () => {
    kit = createService();
    const { writeFileSync } = await import('node:fs');
    const { mkdirSync } = await import('node:fs');
    mkdirSync(kit.mediaDir, { recursive: true });
    writeFileSync(path.join(kit.mediaDir, '11111111-2222-4333-8444-555555555555.png'), 'x');
    kit.repo.all = () => {
      throw new Error('banco travado');
    };
    expect(await kit.service.sweep()).toEqual({ removed: 0, aborted: true });
    expect(mediaFiles(kit.mediaDir)).toHaveLength(1);
    expect(kit.logs.some((entry) => entry.line.includes('media_sweep_aborted'))).toBe(true);
  });

  it('uma pasta que não existe não é erro', async () => {
    kit = createService();
    expect(await kit.service.sweep()).toEqual({ removed: 0, aborted: false });
  });
});

describe('readCliKind e logs', () => {
  it('devolve claude_code por padrão, other quando salvo e claude_code se a leitura falhar', async () => {
    kit = createService();
    expect(kit.service.readCliKind()).toBe('claude_code');
    const id = await visit();
    await kit.service.put(id, { cliKind: 'other' });
    expect(kit.service.readCliKind()).toBe('other');
    kit.repo.all = () => {
      throw new Error('falha');
    };
    expect(kit.service.readCliKind()).toBe('claude_code');
  });

  it('os logs nunca recebem frases, nomes de arquivo nem o valor de Sua IA', async () => {
    kit = createService();
    const id = await visit();
    await kit.service.put(id, { says: { home: { title: 'MARCADOR-FRASE' } }, cliKind: 'other' });
    kit.repo.replaceAll = () => {
      throw new Error('falha');
    };
    await failure(kit.service.put(id, { says: { home: { title: 'MARCADOR-FRASE-2' } } }));
    await failure(kit.service.cancel('antigo'));
    const output = kit.logs.map((entry) => entry.line).join('\n');
    expect(output).toContain('save_failed');
    expect(output).toContain('stale_visit');
    expect(output).not.toMatch(/MARCADOR|other/);
  });
});
