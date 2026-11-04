import { rejectForeignRequest } from '@/web/request-guard';
import { jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';
import { guardRuntimeChange } from '@/web/runtime-guard';
import { decideFor } from '@/web/guide-service';

export const dynamic = 'force-dynamic';

/** Lista as demandas e diz qual é a ativa, sem guardar cópia no banco. */
async function handleGet(request: Request): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const active = runtime.reader.readActive();
  const demands = runtime.reader.listDemands();
  const rows = await runtime.reader.listDemandRows();
  if (active.kind === 'ok') {
    const row = rows.find((entry) => entry.intentId === active.detail.summary.intentId);
    if (row) row.turn = (await decideFor(runtime, row.intentId, active)).decision.turn;
  }
  if (active.kind === 'failure') {
    const intentId = demands.find((demand) => demand.isActive)?.intentId ?? null;
    return jsonResponse({
      repo: { health: active.health, failedPath: active.failedPath },
      activeIntentId: intentId,
      demands,
      rows,
      cliKind: runtime.customization.readCliKind(),
    });
  }
  return jsonResponse({
    repo: { health: 'ok', failedPath: null },
    activeIntentId: active.kind === 'ok' ? active.detail.summary.intentId : null,
    demands,
    rows,
    cliKind: runtime.customization.readCliKind(),
  });
}

export const GET = guardRuntimeChange(handleGet);
