import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    // O node-pty é um módulo nativo e precisa de processos, não de threads.
    pool: 'forks',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      // O relatório não é versionado: fica em uma pasta já ignorada pelo Git.
      reportsDirectory: 'node_modules/.cache/vibes-coverage',
      include: ['src/**/*.{ts,tsx}'],
      thresholds: { lines: 80 },
    },
  },
});
