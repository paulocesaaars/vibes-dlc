// Ponto de entrada de `npm run dev`, `npm run build` e `npm start`.
// Fica em JavaScript puro para poder avisar sobre a versão do Node.js antes de carregar o restante.
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
