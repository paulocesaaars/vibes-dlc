import type { AppConfig } from '@/config/app-config';
import { errorResponse } from './responses';

type GuardConfig = Pick<AppConfig, 'host' | 'port' | 'publicHost'>;

function allowedHosts(config: GuardConfig): Set<string> {
  const names = ['127.0.0.1', 'localhost'];
  // Com 0.0.0.0 não existe um nome único: o aceito é o de VIBES_PUBLIC_HOST (`security-design.md`).
  if (config.host !== '0.0.0.0') names.push(config.host);
  if (config.publicHost) names.push(config.publicHost);
  return new Set(names.map((name) => `${name}:${config.port}`.toLowerCase()));
}

function originHost(origin: string): string | null {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Confere `Host` e `Origin` no início de todas as rotas (BR2.1, NFR4.6). Bloqueia CSRF de uma
 * página aberta no navegador e DNS rebinding, que chega com outro `Host`. Nunca libera CORS.
 */
export function isRequestAllowed(request: Request, config: GuardConfig): boolean {
  const allowed = allowedHosts(config);
  const host = request.headers.get('host');
  if (!host || !allowed.has(host.toLowerCase())) return false;

  const origin = request.headers.get('origin');
  // Um GET da mesma origem pode vir sem `Origin`, como o do EventSource.
  if (origin === null) return request.method === 'GET';
  const fromOrigin = originHost(origin);
  return fromOrigin !== null && allowed.has(fromOrigin);
}

/** Resposta 403 quando a origem é de fora, ou `null` quando a requisição pode seguir. */
export function rejectForeignRequest(request: Request, config: GuardConfig): Response | null {
  if (isRequestAllowed(request, config)) return null;
  return errorResponse(403, 'origin_rejected', 'Esta requisição não veio do próprio painel.');
}
