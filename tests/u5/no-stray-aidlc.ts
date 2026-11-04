import type * as NodeFs from 'node:fs';

/**
 * Uma máquina pode ter um `aidlc/` perdido acima da pasta temporária, e a procura da raiz o tomaria
 * por raiz. Nos testes de U5, só os `aidlc/` criados por eles (pastas `vibes-test-`) existem, para o
 * resultado não depender da máquina. Uso: `vi.mock('node:fs', async (original) =>
 * hideStrayAidlc(await original()))`.
 */
export function hideStrayAidlc(actual: typeof NodeFs): typeof NodeFs {
  const statSync = ((target: string, ...rest: unknown[]) => {
    const text = String(target).replaceAll('\\', '/');
    if (
      text.endsWith('/aidlc') &&
      !text.includes('vibes-test-') &&
      !text.includes('vibes-proof-')
    ) {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    }
    return (actual.statSync as (...args: unknown[]) => unknown)(target, ...rest);
  }) as typeof actual.statSync;
  return { ...actual, statSync };
}
