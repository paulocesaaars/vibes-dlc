// Carregado com `--require` no processo do Next pelo `src/web/bootstrap.ts`.
//
// O produto não faz chamadas de rede (BR2.2). O `next dev` consulta o registro do npm para mostrar
// a versão mais nova, sem opção para desligar, então o `fetch` para fora da máquina é recusado aqui.
// O Next trata a recusa como "versão desconhecida" e segue normalmente.
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const originalFetch = globalThis.fetch;

function hostOf(input) {
  const raw = typeof input === 'string' || input instanceof URL ? String(input) : input?.url;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

globalThis.fetch = function guardedFetch(input, init) {
  const host = hostOf(input);
  if (host !== null && !LOOPBACK_HOSTS.has(host)) {
    if (process.env.VIBES_NETWORK_DEBUG === '1') {
      console.error(`[vibes][rede-bloqueada] ${host}`);
    }
    return Promise.reject(new Error(`Chamada de rede bloqueada pelo Vibes DLC: ${host}`));
  }
  return originalFetch(input, init);
};
