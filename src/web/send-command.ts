import { logger } from '@/config/logger';
import type { NewSentCommand } from '@/db/sent-command-repo';
import { errorResponse, jsonResponse } from './responses';
import type { Runtime } from './runtime';

export function sendCommand(runtime: Runtime, body: NewSentCommand, followStage = false): Response {
  const existing = runtime.commands.find(body.commandId);
  if (existing)
    return jsonResponse({
      commandId: existing.commandId,
      status: existing.status,
      mode: existing.mode,
      writtenAt: existing.writtenAt,
      duplicate: true,
    });
  const session = runtime.terminal.view();
  if (!session || session.status !== 'alive')
    return errorResponse(
      409,
      'session_dead',
      'O terminal não está aberto. Abra uma sessão antes de enviar.',
    );
  runtime.commands.insertPending(body);
  try {
    runtime.terminal.write(body.mode === 'execute' ? `${body.text}\r` : body.text);
  } catch (error) {
    runtime.commands.markFailed(body.commandId);
    logger.error(
      'envio',
      `A escrita do comando ${body.commandId} no terminal falhou: ${String(error)}.`,
    );
    return errorResponse(500, 'write_failed', 'O comando não chegou ao terminal. Tente de novo.');
  }
  try {
    const writtenAt = Date.now();
    runtime.commands.markWritten(body.commandId, writtenAt);
    if (followStage) runtime.progress.markFollowing(body.intentId, body.stageSlug);
    return jsonResponse({
      commandId: body.commandId,
      status: 'written',
      mode: body.mode,
      writtenAt,
    });
  } catch (error) {
    logger.error('envio', `O registro do comando ${body.commandId} falhou: ${String(error)}.`);
    return errorResponse(
      500,
      'unknown_delivery',
      'O comando pode ter chegado ao terminal. Confira antes de enviar de novo.',
    );
  }
}
