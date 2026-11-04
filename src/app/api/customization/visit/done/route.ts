import { customizationFailure, invalidValue } from '@/web/customization-http';
import { rejectForeignRequest } from '@/web/request-guard';
import { jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';
import { readJsonBody, visitActionSchema } from '@/web/schemas';

export const dynamic = 'force-dynamic';

/** Concluir: mantém tudo e apaga os arquivos que ficaram sem uso (BR4.3). */
export async function POST(request: Request): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;
  const body = await readJsonBody(request, visitActionSchema);
  if (!body.ok) return invalidValue(body.message);
  try {
    return jsonResponse(await runtime.customization.done(body.data.visitId));
  } catch (error) {
    return customizationFailure(error);
  }
}
