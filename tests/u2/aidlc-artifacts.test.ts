import { execFileSync } from 'node:child_process';
import { mkdirSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAX_ARTIFACT_BYTES, resolveArtifactPath } from '@/aidlc/artifacts';
import { AidlcReader } from '@/aidlc/reader';
import { tempDir } from '../u1/helpers';
import { type AidlcRepo, createAidlcRepo, INTENT_ID } from '../u1/aidlc-fixture';

function writeIn(repo: AidlcRepo, relative: string, content: string | Buffer = 'conteúdo'): string {
  const file = path.join(repo.recordDir, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}

describe('listArtifacts', () => {
  it('lista os arquivos da etapa, sem os do próprio AI-DLC', async () => {
    const repo = createAidlcRepo();
    const stage = 'construction/functional-design';
    writeIn(repo, `${stage}/functional-spec.md`);
    writeIn(repo, `${stage}/rules.md`);
    writeIn(repo, `${stage}/sub/anexo.md`);
    writeIn(repo, `${stage}/memory.md`);
    writeIn(repo, `${stage}/functional-design-questions.md`);
    writeIn(repo, `${stage}/traceability.json`);
    writeIn(repo, `${stage}/reviews/review-01.md`);
    writeIn(repo, `${stage}/.aidlc-interno`);
    const items = await new AidlcReader(repo.root).listArtifacts(INTENT_ID, 'functional-design');
    expect(items.map((item) => item.path)).toEqual([
      `${stage}/functional-spec.md`,
      `${stage}/rules.md`,
      `${stage}/sub/anexo.md`,
    ]);
    expect(items[0]?.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('o hash muda com o conteúdo', async () => {
    const repo = createAidlcRepo();
    const reader = new AidlcReader(repo.root);
    writeIn(repo, 'construction/functional-design/a.md', 'um');
    const [before] = await reader.listArtifacts(INTENT_ID, 'functional-design');
    writeIn(repo, 'construction/functional-design/a.md', 'dois');
    const [after] = await reader.listArtifacts(INTENT_ID, 'functional-design');
    expect(before?.contentHash).not.toBe(after?.contentHash);
  });

  it('sem pasta, a etapa não tem artefatos; etapa desconhecida ou insegura também não', async () => {
    const reader = new AidlcReader(createAidlcRepo().root);
    await expect(reader.listArtifacts(INTENT_ID, 'functional-design')).resolves.toEqual([]);
    await expect(reader.listArtifacts(INTENT_ID, 'nao-existe')).resolves.toEqual([]);
    await expect(reader.listArtifacts(INTENT_ID, '../..')).resolves.toEqual([]);
    await expect(reader.listArtifacts('../fora', 'functional-design')).resolves.toEqual([]);
    await expect(
      reader.listArtifacts(INTENT_ID, 'functional-design', { unit: '../x' }),
    ).resolves.toEqual([]);
  });

  it('com a Unidade, lê a pasta dela; na consulta, junta as de todas as Unidades', async () => {
    const repo = createAidlcRepo();
    writeIn(repo, 'construction/functional-design/raiz.md');
    writeIn(repo, 'construction/u1-a/functional-design/um.md');
    writeIn(repo, 'construction/u2-b/functional-design/dois.md');
    writeIn(repo, 'construction/notas/functional-design/fora.md');
    const reader = new AidlcReader(repo.root);
    const paths = async (scope: { unit?: string; includeUnits?: boolean }) =>
      (await reader.listArtifacts(INTENT_ID, 'functional-design', scope)).map((i) => i.name);
    await expect(paths({})).resolves.toEqual(['raiz.md']);
    await expect(paths({ unit: 'u2-b' })).resolves.toEqual(['dois.md']);
    await expect(paths({ includeUnits: true })).resolves.toEqual(['raiz.md', 'um.md', 'dois.md']);
  });
});

describe('resolveArtifactPath', () => {
  it('aceita um caminho dentro do registro e normaliza as barras', async () => {
    const repo = createAidlcRepo();
    writeIn(repo, 'construction/a/b.md');
    await expect(resolveArtifactPath(repo.recordDir, 'construction/a/../a/b.md')).resolves.toEqual(
      expect.objectContaining({ recordPath: 'construction/a/b.md' }),
    );
  });

  it.each([
    ['..', '../../../../aidlc/active-space'],
    ['.. misturado', 'construction/../../outro/segredo.md'],
    ['absoluto', 'C:\\Windows\\win.ini'],
    ['absoluto Unix', '/etc/passwd'],
    ['nulo', 'a\0b.md'],
    ['inexistente', 'construction/nao-existe.md'],
    ['a própria pasta', '.'],
    ['uma pasta', 'construction'],
  ])('recusa: %s', async (_name, candidate) => {
    const repo = createAidlcRepo();
    mkdirSync(path.join(repo.recordDir, 'construction'), { recursive: true });
    await expect(resolveArtifactPath(repo.recordDir, candidate)).resolves.toBeNull();
  });

  function createJunction(link: string, target: string): void {
    // A junção de diretório não pede modo desenvolvedor, ao contrário do link simbólico.
    execFileSync('cmd.exe', ['/d', '/c', 'mklink', '/J', link, target], { stdio: 'pipe' });
  }

  it.runIf(process.platform === 'win32')(
    'recusa uma junção de diretório que aponta para fora do registro',
    async () => {
      const repo = createAidlcRepo();
      const outsideDir = tempDir();
      writeFileSync(path.join(outsideDir, 'segredo.md'), 'segredo');
      createJunction(path.join(repo.recordDir, 'atalho'), outsideDir);
      await expect(resolveArtifactPath(repo.recordDir, 'atalho/segredo.md')).resolves.toBeNull();
      const reader = new AidlcReader(repo.root);
      await expect(reader.readArtifact(INTENT_ID, 'atalho/segredo.md')).resolves.toBeNull();
    },
  );

  it.runIf(process.platform === 'win32')(
    'aceita uma junção que continua dentro do registro',
    async () => {
      const repo = createAidlcRepo();
      writeIn(repo, 'construction/a/b.md');
      createJunction(
        path.join(repo.recordDir, 'atalho'),
        path.join(repo.recordDir, 'construction', 'a'),
      );
      await expect(resolveArtifactPath(repo.recordDir, 'atalho/b.md')).resolves.toEqual(
        expect.objectContaining({ recordPath: 'construction/a/b.md' }),
      );
    },
  );
});

describe('readArtifact', () => {
  it('devolve o texto como dado, com o hash, mesmo com etiqueta de script', async () => {
    const repo = createAidlcRepo();
    const script = '<script>alert("oi")</script>';
    writeIn(repo, 'a.md', script);
    const read = await new AidlcReader(repo.root).readArtifact(INTENT_ID, 'a.md');
    expect(read).toMatchObject({ path: 'a.md', content: script, omittedReason: null });
    expect(read?.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('acima de 2 MB, devolve o caminho e o motivo, sem o conteúdo', async () => {
    const repo = createAidlcRepo();
    writeIn(repo, 'grande.md', 'x'.repeat(MAX_ARTIFACT_BYTES + 1));
    const read = await new AidlcReader(repo.root).readArtifact(INTENT_ID, 'grande.md');
    expect(read).toMatchObject({ content: null, omittedReason: 'too_large' });
    expect(read?.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('exatamente 2 MB ainda é mostrado', async () => {
    const repo = createAidlcRepo();
    writeIn(repo, 'limite.md', 'x'.repeat(MAX_ARTIFACT_BYTES));
    const read = await new AidlcReader(repo.root).readArtifact(INTENT_ID, 'limite.md');
    expect(read?.omittedReason).toBeNull();
  });

  it('um arquivo binário não vira texto', async () => {
    const repo = createAidlcRepo();
    writeIn(repo, 'imagem.png', Buffer.from([0x89, 0x50, 0x00, 0x01]));
    const read = await new AidlcReader(repo.root).readArtifact(INTENT_ID, 'imagem.png');
    expect(read).toMatchObject({ content: null, omittedReason: 'binary' });
  });

  it('um caminho de fora ou um intent inseguro não é lido', async () => {
    const reader = new AidlcReader(createAidlcRepo().root);
    await expect(reader.readArtifact(INTENT_ID, '../../../../x')).resolves.toBeNull();
    await expect(reader.readArtifact('../fora', 'a.md')).resolves.toBeNull();
  });
});

describe('tempo sem mudança', () => {
  it('usa a maior data entre aidlc-state.md e audit/ e continua depois de reler', async () => {
    const repo = createAidlcRepo();
    const audit = writeIn(repo, 'audit/clone.md', '# AI-DLC Audit Log\n');
    const nowMs = Date.UTC(2026, 10, 3, 12, 0, 0);
    const minutesAgo = (minutes: number) => new Date(nowMs - minutes * 60_000);
    utimesSync(repo.statePath, minutesAgo(40), minutesAgo(40));
    utimesSync(audit, minutesAgo(12), minutesAgo(12));

    const reader = new AidlcReader(repo.root, () => nowMs);
    const signals = async () => {
      const read = reader.readDemand(INTENT_ID);
      if (read.kind !== 'ok') throw new Error('leitura falhou');
      return reader.readWorkSignals(read.detail);
    };
    expect((await signals()).minutesSinceLastChange).toBe(12);

    utimesSync(audit, minutesAgo(1), minutesAgo(1));
    expect((await signals()).minutesSinceLastChange).toBe(1);
  });
});
