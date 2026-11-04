import { sendBlockedMessage } from '@/guide/moment-content';
import { decideFor } from '@/web/guide-service';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, jsonResponse, invalidInput } from '@/web/responses';
import { getRuntime, type Runtime } from '@/web/runtime';
import { sendCommand } from '@/web/send-command';
import { commandSchema, readJsonBody } from '@/web/schemas';

export const dynamic = 'force-dynamic';

const STALE_SCREEN = 'A tela está desatualizada. Confira a etapa atual e confirme de novo.';

type CommandBody = {
  commandId: string;
  intentId: string;
  stageSlug: string;
  text: string;
  mode: 'execute' | 'paste';
};

/** Relê a demanda ativa e só libera com `canSend` verdadeiro (BR5.7). */
async function checkSendAllowed(runtime: Runtime, body: CommandBody): Promise<Response | null> {
  const read = runtime.reader.readActive();
  if (read.kind === 'no_active_intent') return errorResponse(409, 'stale_screen', STALE_SCREEN);

  if (read.kind === 'ok') {
    const { summary, currentStage } = read.detail;
    if (summary.intentId !== body.intentId) {
      const target = runtime.reader.readDemand(body.intentId);
      if (target.kind === 'ok' && !target.detail.summary.isActive) {
        return errorResponse(
          409,
          'not_active',
          'Esta demanda está em modo de consulta. Torne-a ativa antes de enviar.',
        );
      }
    }
    // Uma leitura antiga não serve para liberar um envio: a tela tenta de novo em seguida.
    if (
      read.stale ||
      summary.intentId !== body.intentId ||
      currentStage?.stageSlug !== body.stageSlug
    ) {
      return errorResponse(409, 'stale_screen', STALE_SCREEN);
    }
  }

  const { decision } = await decideFor(runtime, body.intentId, read);
  if (decision.canSend) return null;
  const reason = decision.sendBlockedReason ?? 'not_send_moment';
  return errorResponse(409, reason, sendBlockedMessage(reason));
}

/** Envia um comando confirmado pela pessoa, com as camadas de `security-design.md`, nesta ordem. */
export async function POST(request: Request): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const body = await readJsonBody(request, commandSchema);
  if (!body.ok) return invalidInput(body.message);

  const existing = runtime.commands.find(body.data.commandId);
  if (existing) {
    return jsonResponse({
      commandId: existing.commandId,
      status: existing.status,
      mode: existing.mode,
      writtenAt: existing.writtenAt,
      duplicate: true,
    });
  }

  const blocked = await checkSendAllowed(runtime, body.data);
  if (blocked) return blocked;
  return sendCommand(runtime, { ...body.data, kind: 'stage' }, true);
}
