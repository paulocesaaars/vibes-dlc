import { defineConfig } from '@playwright/test';

/**
 * A prova da fatia (`scripts/proof-u1.ts`) lê este canal. O Edge já vem com o Windows, então
 * nenhum navegador é baixado no `npm install` nem nesta verificação.
 */
export const PROOF_BROWSER_CHANNEL = 'msedge';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { channel: PROOF_BROWSER_CHANNEL },
});
