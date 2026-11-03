import { rejectForeignRequest } from '@/web/request-guard';
import { jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';

export const dynamic = 'force-dynamic';

/** Lista as demandas e diz qual é a ativa, sem guardar cópia no banco. */
export function GET(request: Request): Response {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const active = runtime.reader.readActive();
  const demands = runtime.reader.listDemands();
  if (active.kind === 'failure') {
    const intentId = demands.find((demand) => demand.isActive)?.intentId ?? null;
    return jsonResponse({
      repo: { health: active.health, failedPath: active.failedPath },
      activeIntentId: intentId,
      demands,
    });
  }
  return jsonResponse({
    repo: { health: 'ok', failedPath: null },
    activeIntentId: active.kind === 'ok' ? active.detail.summary.intentId : null,
    demands,
  });
}
