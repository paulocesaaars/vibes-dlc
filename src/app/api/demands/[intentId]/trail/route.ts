import { buildGuideView } from '@/web/guide-service';
import { rejectForeignRequest } from '@/web/request-guard';
import { jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ intentId: string }> };

/** A trilha da demanda, por fase, com os números lidos dos arquivos (BR8.1). */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const { intentId } = await context.params;
  const view = await buildGuideView(runtime, intentId);
  return jsonResponse({ phases: view.trail, progress: view.progress });
}
