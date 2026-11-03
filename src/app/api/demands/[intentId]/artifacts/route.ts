import { logger } from '@/config/logger';
import { type ArtifactList, listArtifactViews, pickDefaultArtifact } from '@/web/artifact-service';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, invalidInput, jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';
import { artifactsQuerySchema, readQuery } from '@/web/schemas';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ intentId: string }> };

/** Lista os artefatos da etapa e devolve um deles como texto, nunca como HTML (BR4.2, BR4.3). */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const query = readQuery(request, artifactsQuerySchema);
  if (!query) return invalidInput();

  const { intentId } = await context.params;
  try {
    const scope = { unit: query.unit, includeUnits: query.consult === '1' };
    const items = await listArtifactViews(runtime, intentId, query.stage, scope);
    const wanted = query.path ?? pickDefaultArtifact(items)?.path ?? null;
    const selected = wanted ? await runtime.reader.readArtifact(intentId, wanted) : null;
    if (query.path && !selected) {
      return errorResponse(404, 'artifact_not_found', 'Este arquivo não está mais disponível.');
    }
    const body: ArtifactList = {
      stageSlug: query.stage,
      total: items.length,
      reviewed: items.filter((item) => item.reviewStatus === 'reviewed').length,
      items,
      selected,
    };
    return jsonResponse(body);
  } catch (error) {
    const reason = (error as NodeJS.ErrnoException).code ?? 'erro de leitura';
    logger.warn('artefatos', `Não foi possível ler os artefatos de ${query.stage} (${reason}).`);
    return errorResponse(500, 'artifact_unreadable', 'Não consegui ler os arquivos desta etapa.');
  }
}
