import { isSafeName } from '@/aidlc/paths';
import { getRuntime } from '@/web/runtime';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, invalidInput } from '@/web/responses';
import { activateCommandSchema, readJsonBody } from '@/web/schemas';
import { sendCommand } from '@/web/send-command';

export const dynamic = 'force-dynamic';
export async function POST(
  request: Request,
  context: { params: Promise<{ intentId: string }> },
): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;
  const { intentId } = await context.params;
  if (!isSafeName(intentId)) return invalidInput('Nome de demanda inválido.');
  const body = await readJsonBody(request, activateCommandSchema);
  if (!body.ok) return invalidInput(body.message);
  if (runtime.customization.readCliKind() !== 'claude_code')
    return errorResponse(409, 'other_cli', 'Com outra CLI, o comando é apenas uma referência.');
  const read = runtime.reader.readDemand(intentId);
  if (read.kind !== 'ok') return errorResponse(404, 'not_found', 'A demanda não foi encontrada.');
  if (read.detail.summary.isActive)
    return errorResponse(409, 'stale_screen', 'Esta demanda já está ativa. Atualize o painel.');
  return sendCommand(runtime, {
    ...body.data,
    intentId,
    stageSlug: '',
    text: `/aidlc intent switch ${intentId}`,
    kind: 'activate',
  });
}
