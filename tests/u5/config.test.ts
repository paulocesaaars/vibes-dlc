import { existsSync, mkdirSync, readdirSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { findRepoRoot, loadConfig } from '@/config/app-config';
import { logger } from '@/config/logger';
import { tempDir } from '../u1/helpers';

// Os testes só enxergam os `aidlc/` criados por eles, e não um que a máquina tenha acima do /tmp.
vi.mock('node:fs', async (importOriginal) => {
  const { hideStrayAidlc } = await import('./no-stray-aidlc');
  return hideStrayAidlc(await importOriginal<typeof import('node:fs')>());
});

afterEach(() => vi.restoreAllMocks());

/** Projeto com `aidlc/` e a subpasta do produto copiada para dentro, como manda o `README`. */
function installedProduct(): { project: string; product: string } {
  const project = path.join(tempDir(), 'Código do João & cia');
  const product = path.join(project, 'vibes-dlc');
  mkdirSync(path.join(project, 'aidlc'), { recursive: true });
  mkdirSync(product, { recursive: true });
  return { project, product };
}

describe('procura da raiz com a subpasta do produto', () => {
  it('acha a raiz acima da subpasta do produto', () => {
    const { project, product } = installedProduct();
    expect(findRepoRoot(product, product)).toBe(project);
    expect(loadConfig({ VIBES_PRODUCT_DIR: product }, product).repoRoot).toBe(project);
  });

  it('ignora o aidlc/ dentro da subpasta quando não há .git, e segue para cima', () => {
    const { project, product } = installedProduct();
    mkdirSync(path.join(product, 'aidlc'));
    expect(findRepoRoot(product, product)).toBe(project);
  });

  it('sem raiz acima, o aidlc/ da subpasta sem .git não vira raiz', () => {
    const alone = path.join(tempDir(), 'sozinho');
    mkdirSync(path.join(alone, 'aidlc'), { recursive: true });
    expect(findRepoRoot(alone, alone)).toBeNull();
  });

  it('aceita a subpasta como raiz quando tem .git (uso em desenvolvimento)', () => {
    const dev = path.join(tempDir(), 'dev');
    mkdirSync(path.join(dev, 'aidlc'), { recursive: true });
    mkdirSync(path.join(dev, '.git'));
    expect(findRepoRoot(dev, dev)).toBe(dev);
  });

  it('sem productDir, vale a primeira pasta com aidlc/', () => {
    const { project, product } = installedProduct();
    mkdirSync(path.join(product, 'aidlc'));
    expect(findRepoRoot(product)).toBe(product);
    expect(findRepoRoot(path.join(project, 'x', '..', 'vibes-dlc'), null)).toBe(product);
  });

  it.skipIf(process.platform !== 'win32')('trata c:\\x e C:\\x como a mesma pasta', () => {
    const { project, product } = installedProduct();
    mkdirSync(path.join(product, 'aidlc'));
    const flipped = product.replace(/^[A-Za-z]/, (letter) =>
      letter === letter.toUpperCase() ? letter.toLowerCase() : letter.toUpperCase(),
    );
    expect(findRepoRoot(product, flipped)).toBe(project);
  });

  it.skipIf(process.platform !== 'win32')('segue uma junção até a pasta real', () => {
    const { project, product } = installedProduct();
    mkdirSync(path.join(product, 'aidlc'));
    const link = path.join(tempDir(), 'atalho');
    symlinkSync(product, link, 'junction');
    expect(findRepoRoot(product, link)).toBe(project);
  });

  it('não cria nada ao procurar nem ao carregar a configuração', () => {
    const { project, product } = installedProduct();
    const before = readdirSync(project).sort();
    loadConfig({ VIBES_PRODUCT_DIR: product }, product);
    expect(readdirSync(project).sort()).toEqual(before);
    expect(existsSync(path.join(project, '.vibes'))).toBe(false);
  });
});

describe('configuração sem raiz', () => {
  it('deixa banco, .vibes e mídia nulos', () => {
    const empty = tempDir();
    const config = loadConfig({}, empty);
    expect(config.repoRoot === null || !config.repoRoot.startsWith(empty)).toBe(true);
    if (config.repoRoot === null) {
      expect(config.dbPath).toBeNull();
      expect(config.vibesDir).toBeNull();
      expect(config.mediaDir).toBeNull();
    }
    expect(existsSync(path.join(empty, '.vibes'))).toBe(false);
  });

  it('ignora VIBES_DB_PATH sem raiz, avisa em português e não cria o destino', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    const lonely = path.join(tempDir(), 'sem-raiz');
    mkdirSync(lonely);
    const target = path.join(tempDir(), 'destino');
    const productDir = lonely;
    mkdirSync(path.join(lonely, 'aidlc'));
    const config = loadConfig(
      { VIBES_DB_PATH: path.join(target, 'x.db'), VIBES_PRODUCT_DIR: productDir },
      lonely,
    );
    expect(config.repoRoot).toBeNull();
    expect(config.dbPath).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'config',
      expect.stringContaining('VIBES_DB_PATH foi ignorada'),
    );
    expect(existsSync(target)).toBe(false);
    expect(existsSync(path.join(lonely, '.vibes'))).toBe(false);
  });

  it('com raiz, mantém o banco, o .vibes e a mídia dentro da raiz', () => {
    const { project, product } = installedProduct();
    const config = loadConfig({ VIBES_PRODUCT_DIR: product }, product);
    expect(config.dbPath).toBe(path.join(project, '.vibes', 'vibes.db'));
    expect(config.vibesDir).toBe(path.join(project, '.vibes'));
    expect(config.mediaDir).toBe(path.join(project, '.vibes', 'media'));
  });
});
