import { logger } from '@/config/logger';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, invalidInput, jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';
import { readJsonBody, reviewSchema } from '@/web/schemas';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ intentId: string }> };

/**
 * Marca um artefato como revisado, com o hash mostrado na tela (BR4.4). É uma anotação do guia e não
 * aprova nada no AI-DLC. Se o conteúdo mudou nesse meio-tempo, devolve o novo conteúdo.
 */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const body = await readJsonBody(request, reviewSchema);
  if (!body.ok) return invalidInput(body.message);

  const { intentId } = await context.params;
  const current = await runtime.reader.readArtifact(intentId, body.data.path);
  if (!current) {
    return errorResponse(404, 'artifact_not_found', 'Este arquivo não está mais disponível.');
  }
  if (current.contentHash !== body.data.contentHash) {
    return jsonResponse(
      {
        code: 'artifact_changed',
        message: 'O conteúdo mudou enquanto você lia. Confira a nova versão.',
        artifact: current,
      },
      409,
    );
  }

  try {
    runtime.reviews.markReviewed(intentId, current.path, current.contentHash);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('artefatos', `Não foi possível gravar a revisão: ${reason}.`);
    return errorResponse(500, 'review_failed', 'Não consegui guardar a marca. Tente de novo.');
  }
  return jsonResponse({ path: current.path, contentHash: current.contentHash });
}
