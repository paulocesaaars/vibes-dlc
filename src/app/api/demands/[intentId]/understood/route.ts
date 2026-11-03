import { buildGuideView } from '@/web/guide-service';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, invalidInput, jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';
import { readJsonBody, understoodSchema } from '@/web/schemas';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ intentId: string }> };

/** A pessoa clicou em Entendi. Grava `understoodAt` para a etapa que ela viu na tela. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const body = await readJsonBody(request, understoodSchema);
  if (!body.ok) return invalidInput(body.message);

  const { intentId } = await context.params;
  const read = runtime.reader.readDemand(intentId);
  if (read.kind !== 'ok' || read.detail.currentStage?.stageSlug !== body.data.stageSlug) {
    return errorResponse(409, 'stale_screen', 'A tela está desatualizada. Confira a etapa atual.');
  }

  runtime.progress.markUnderstood(intentId, body.data.stageSlug);
  return jsonResponse(await buildGuideView(runtime, intentId));
}
