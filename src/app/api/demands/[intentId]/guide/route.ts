import { buildGuideView } from '@/web/guide-service';
import { rejectForeignRequest } from '@/web/request-guard';
import { jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ intentId: string }> };

/** Momento atual da demanda, sempre relido dos arquivos (C4). */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const { intentId } = await context.params;
  return jsonResponse(await buildGuideView(runtime, intentId));
}
