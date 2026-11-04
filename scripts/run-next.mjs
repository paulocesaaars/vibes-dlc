// Ponto de entrada de `npm run dev`, `npm run build` e `npm start`.
// Fica em JavaScript puro para poder avisar sobre a versão do Node.js antes de carregar o restante.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sob o Next, `import.meta.url` aponta para `.next/server/...`. Este script sabe onde o produto está
// (a pasta pai de `scripts/`), e a procura da raiz do AI-DLC usa isso para ignorar a própria subpasta.
process.env.VIBES_PRODUCT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  const { tsImport } = await import('tsx/esm/api');
  const { runNext } = await tsImport('../src/web/bootstrap.ts', import.meta.url);
  await runNext(process.argv[2], process.argv.slice(3));
} catch (error) {
  console.error(
    `Não foi possível iniciar o Vibes DLC. Ele exige Node.js 22.13 ou superior, e este é o ${process.version}.`,
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
