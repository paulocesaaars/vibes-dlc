import { logger } from '@/config/logger';
import { sendBlockedMessage } from '@/guide/moment-content';
import { decideFor } from '@/web/guide-service';
import { rejectForeignRequest } from '@/web/request-guard';
import { errorResponse, jsonResponse, invalidInput } from '@/web/responses';
import { getRuntime, type Runtime } from '@/web/runtime';
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
function checkSendAllowed(runtime: Runtime, body: CommandBody): Response | null {
  const read = runtime.reader.readActive();
  if (read.kind === 'no_active_intent') return errorResponse(409, 'stale_screen', STALE_SCREEN);

  if (read.kind === 'ok') {
    const { summary, currentStage } = read.detail;
    // Uma leitura antiga não serve para liberar um envio: a tela tenta de novo em seguida.
    if (
      read.stale ||
      summary.intentId !== body.intentId ||
      currentStage?.stageSlug !== body.stageSlug
    ) {
      return errorResponse(409, 'stale_screen', STALE_SCREEN);
    }
  }

  const { decision } = decideFor(runtime, body.intentId, read);
  if (decision.canSend) return null;
  const reason = decision.sendBlockedReason ?? 'not_send_moment';
  return errorResponse(409, reason, sendBlockedMessage(reason));
}

/** Grava `pending`, escreve no terminal e grava `written` (BR5.2). Enter só em `execute` (BR5.4). */
function writeCommand(runtime: Runtime, body: CommandBody): Response {
  const { commandId, intentId, stageSlug, text, mode } = body;
  runtime.commands.insertPending({ commandId, intentId, stageSlug, text, mode });

  try {
    runtime.terminal.write(mode === 'execute' ? `${text}\r` : text);
  } catch (error) {
    runtime.commands.markFailed(commandId);
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('envio', `A escrita do comando ${commandId} no terminal falhou: ${reason}.`);
    return errorResponse(500, 'write_failed', 'O comando não chegou ao terminal. Tente de novo.');
  }

  try {
    const writtenAt = Date.now();
    runtime.commands.markWritten(commandId, writtenAt);
    runtime.progress.markFollowing(intentId, stageSlug);
    return jsonResponse({ commandId, status: 'written', mode, writtenAt });
  } catch (error) {
    // O comando chegou, mas o registro falhou: a linha fica em `pending` e vira `failed` no início
    // seguinte, então a interface avisa em vez de oferecer o reenvio como seguro.
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('envio', `O registro do comando ${commandId} falhou: ${reason}.`);
    return errorResponse(
      500,
      'unknown_delivery',
      'O comando pode ter chegado ao terminal, mas o guia não conseguiu registrá-lo. Confira o terminal antes de enviar de novo.',
    );
  }
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

  const blocked = checkSendAllowed(runtime, body.data);
  if (blocked) return blocked;
  return writeCommand(runtime, body.data);
}
