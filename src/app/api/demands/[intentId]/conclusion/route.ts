import { logger } from '@/config/logger';
import { buildGuideView, decideFor } from '@/web/guide-service';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, invalidInput, jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';
import { conclusionSchema, readJsonBody } from '@/web/schemas';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ intentId: string }> };

const STALE_SCREEN = 'A tela está desatualizada. Confira a etapa atual.';

/**
 * "Ir para a próxima etapa": grava em `.vibes/` que a pessoa viu a conclusão da etapa anterior. Só
 * vale no momento `conclusion`, que exige `[x]` com `GATE_APPROVED` no registro (BR6.2).
 */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const body = await readJsonBody(request, conclusionSchema);
  if (!body.ok) return invalidInput(body.message);

  const { intentId } = await context.params;
  const read = runtime.reader.readDemand(intentId);
  const { decision, snapshot } = await decideFor(runtime, intentId, read);
  if (decision.moment !== 'conclusion' || snapshot.previous?.slug !== body.data.stageSlug) {
    return errorResponse(409, 'stale_screen', STALE_SCREEN);
  }

  try {
    runtime.progress.markConclusionSeen(intentId, body.data.stageSlug);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('conclusao', `Não foi possível gravar o reconhecimento: ${reason}.`);
    return errorResponse(500, 'conclusion_failed', 'Não consegui guardar isso. Tente de novo.');
  }
  return jsonResponse(await buildGuideView(runtime, intentId));
}
