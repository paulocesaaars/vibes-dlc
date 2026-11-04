import { findMoment } from '@/guide/customizable-moments';
import { customizationFailure, invalidValue } from '@/web/customization-http';
import { rejectForeignRequest } from '@/web/request-guard';
import { jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';
import { customizationPutSchema, readJsonBody } from '@/web/schemas';

export const dynamic = 'force-dynamic';

/** Lê a personalização atual, sem abrir nenhum arquivo de mídia. */
export async function GET(request: Request): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;
  try {
    return jsonResponse(runtime.customization.read());
  } catch (error) {
    return customizationFailure(error);
  }
}

/** Salva cores, frases, voltar ao original, Sua IA e Restaurar tudo, sempre dentro de uma visita. */
export async function PUT(request: Request): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;
  const body = await readJsonBody(request, customizationPutSchema);
  if (!body.ok) return invalidValue(body.message);
  const { visitId, ...patch } = body.data;

  // `Customization` recebe só chaves já conferidas contra a lista fixa de momentos (BR2.2).
  for (const momentKey of Object.keys(patch.says ?? {})) {
    const moment = findMoment(momentKey);
    if (!moment || !moment.textEditable) {
      return invalidValue(`O momento "${momentKey}" não aceita frases.`);
    }
  }
  for (const momentKey of Object.keys(patch.media ?? {})) {
    if (!findMoment(momentKey)) return invalidValue(`O momento "${momentKey}" não existe.`);
  }
  try {
    return jsonResponse(await runtime.customization.put(visitId, patch));
  } catch (error) {
    return customizationFailure(error);
  }
}
