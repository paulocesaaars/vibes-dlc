/**
 * O que se copia para a subpasta `vibes-dlc/` do projeto. A mesma lista está no `README.md`, e um teste
 * confere que cada item aparece lá. Ficam de fora `aidlc/`, `.claude/`, `.vibes/`, `node_modules/`,
 * `.next/`, `tests/`, `design/` e os scripts de prova: copiar `aidlc/` faria a subpasta ser tomada
 * pela raiz do AI-DLC.
 */
export const INSTALL_LIST = [
  'src/',
  'public/',
  'migrations/',
  'scripts/run-next.mjs',
  'scripts/no-network.cjs',
  'package.json',
  'package-lock.json',
  'next.config.ts',
  'next-env.d.ts',
  'tsconfig.json',
] as const;

/** Pasta onde a subpasta do produto é instalada, dentro do projeto da pessoa. */
export const INSTALL_FOLDER = 'vibes-dlc';
