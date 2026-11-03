import { seenChangeText } from '@/guide/moment-content';
import { stageName } from '@/guide/stage-content';
import { decideFor } from '@/web/guide-service';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, invalidInput, jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';
import { readJsonBody, seenSchema, type SeenResponse } from '@/web/schemas';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ intentId: string }> };

/** Compara o estado atual com o último visto (BR7.1). Só lê: gravar fica com o POST. */
export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const { intentId } = await context.params;
  const read = runtime.reader.readDemand(intentId);
  if (read.kind !== 'ok') {
    return errorResponse(409, 'stale_screen', 'Não consegui ler esta demanda agora.');
  }
  const { snapshot } = await decideFor(runtime, intentId, read);
  const current = {
    stageSlug: snapshot.stage.slug,
    unit: snapshot.stage.unit ?? '',
    mark: snapshot.stage.mark,
  };
  const before = runtime.seen.find(intentId);

  let body: SeenResponse;
  if (!before) {
    body = { status: 'first_visit', current, text: null };
  } else if (
    before.stageSlug === current.stageSlug &&
    before.unit === current.unit &&
    before.mark === current.mark
  ) {
    body = { status: 'same', current, text: null };
  } else {
    const text = seenChangeText(
      { name: stageName(before.stageSlug), unit: before.unit, mark: before.mark },
      { name: stageName(current.stageSlug), unit: current.unit, mark: current.mark },
    );
    body = { status: 'changed', current, text };
  }
  return jsonResponse(body);
}

/** Grava o estado que está na tela: na primeira visita, ao clicar em Entendi e ao acompanhar. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const body = await readJsonBody(request, seenSchema);
  if (!body.ok) return invalidInput(body.message);

  const { intentId } = await context.params;
  const read = runtime.reader.readDemand(intentId);
  if (read.kind !== 'ok') {
    return errorResponse(409, 'stale_screen', 'Não consegui ler esta demanda agora.');
  }
  runtime.seen.save({ intentId, ...body.data });
  return jsonResponse({ saved: true });
}
