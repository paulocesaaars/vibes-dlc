import { getRuntime } from '@/web/runtime';
import { rejectForeignRequest } from '@/web/request-guard';
import { jsonResponse } from '@/web/responses';

export const dynamic = 'force-dynamic';
export async function GET(
  request: Request,
  context: { params: Promise<{ intentId: string }> },
): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;
  return jsonResponse({
    decisions: await runtime.reader.readDecisions((await context.params).intentId),
  });
}
