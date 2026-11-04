import { customizationFailure } from '@/web/customization-http';
import { rejectForeignRequest } from '@/web/request-guard';
import { jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';

export const dynamic = 'force-dynamic';

/** Abre uma visita nova à tela Personalizar; a anterior perde o desfazer (BR4.4). */
export async function POST(request: Request): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;
  try {
    const { visitId, state } = await runtime.customization.openVisit();
    return jsonResponse({ ...state, visitId });
  } catch (error) {
    return customizationFailure(error);
  }
}
