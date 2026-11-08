import { z } from 'zod';
import { isSafeName } from '@/aidlc/paths';
import { formatAiCommand } from '@/core/commands';
import { rejectForeignRequest } from '@/web/request-guard';
import {
  getRuntime,
  assertContext,
  selectProject,
  advanceContext,
  WorkspaceError,
} from '@/web/runtime';
import { readWorkspace, activeIdentity } from '@/web/workspace-service';
import { commandTextSchema, readJsonBody } from '@/web/schemas';
import { errorResponse, jsonResponse, invalidInput } from '@/web/responses';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const context = z.string().uuid();
const ai = z.enum(['claude_code', 'devin', 'copilot']);
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('forget'), contextId: context, path: z.string().min(1).max(4096) }),
  z.object({
    action: z.literal('select'),
    contextId: context,
    path: z.string().min(1).max(4096),
    confirmedSession: z.string().nullable(),
  }),
  z.object({ action: z.literal('ai'), contextId: context, ai }),
  z.object({ action: z.literal('session'), contextId: context }),
  z.object({ action: z.literal('end'), contextId: context, sessionId: z.string() }),
  z.object({
    action: z.literal('send'),
    contextId: context,
    sessionId: z.string(),
    commandId: z.uuid(),
    text: commandTextSchema,
    mode: z.enum(['execute', 'paste']),
    activeIntentId: z.string().nullable(),
    activeStage: z.string().nullable(),
    intentId: z.string().nullable(),
    kind: z.enum(['stage', 'activate', 'new', 'analysis']),
  }),
]);
function failure(error: unknown): Response {
  if (error instanceof WorkspaceError)
    return errorResponse(error.status, error.code, error.message);
  return errorResponse(
    500,
    'workspace_failed',
    error instanceof Error ? error.message : 'Não foi possível concluir a operação.',
  );
}
export async function GET(request: Request): Promise<Response> {
  const state = getRuntime();
  const rejected = rejectForeignRequest(request, state.config);
  if (rejected) return rejected;
  const params = new URL(request.url).searchParams;
  try {
    return jsonResponse(
      await readWorkspace(state, {
        intent: params.get('intent') || undefined,
        stage: params.get('stage') || undefined,
        artifact: params.get('artifact') || undefined,
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request): Promise<Response> {
  const state = getRuntime();
  const rejected = rejectForeignRequest(request, state.config);
  if (rejected) return rejected;
  const parsed = await readJsonBody(request, schema);
  if (!parsed.ok) return invalidInput(parsed.message);
  const body = parsed.data;
  try {
    assertContext(state, body.contextId);
    if (body.action === 'forget') {
      state.projects.forget(body.path);
    } else if (body.action === 'select') {
      selectProject(state, body.path, body.confirmedSession);
    } else {
      const root = state.config.repoRoot;
      if (!root)
        throw new WorkspaceError(409, 'no_project', 'Selecione um projeto antes de continuar.');
      if (body.action === 'ai') {
        state.projects.setAi(root, body.ai);
        advanceContext(state);
      } else if (body.action === 'session') {
        if (state.terminal.view()?.status !== 'alive') state.deliveries.clear();
        const session = state.terminal.newSession();
        if (session.status === 'unavailable')
          throw new WorkspaceError(
            503,
            'shell_unavailable',
            'O shell configurado não está disponível.',
          );
      } else if (body.action === 'end') {
        if (state.terminal.view()?.sessionId !== body.sessionId)
          throw new WorkspaceError(409, 'session_changed', 'A sessão mudou. Atualize a tela.');
        state.terminal.kill();
      } else {
        const session = state.terminal.view();
        if (session?.sessionId !== body.sessionId || session.status !== 'alive')
          throw new WorkspaceError(
            409,
            'session_changed',
            'Abra uma sessão atual antes de enviar.',
          );
        const fingerprint = JSON.stringify(body);
        const existing = state.deliveries.get(body.commandId);
        if (existing) {
          if (existing.fingerprint !== fingerprint)
            throw new WorkspaceError(
              409,
              'duplicate_command',
              'Este identificador já foi usado para outro envio.',
            );
          if (existing.uncertain)
            throw new WorkspaceError(
              409,
              'unknown_delivery',
              'A entrega anterior é incerta. Confira o terminal; este comando não será repetido automaticamente.',
            );
          return jsonResponse({ ok: true, duplicate: true });
        }
        const current = activeIdentity(state);
        if (
          current.activeIntentId !== body.activeIntentId ||
          current.activeStage !== body.activeStage
        )
          throw new WorkspaceError(
            409,
            'state_changed',
            'A demanda ou a etapa ativa mudou. Confira novamente o comando.',
          );
        if (body.kind === 'stage' && (!body.intentId || body.intentId !== current.activeIntentId))
          throw new WorkspaceError(
            409,
            'not_active',
            'Apenas a demanda ativa recebe comandos de continuidade.',
          );
        if (body.kind === 'activate') {
          if (
            !body.intentId ||
            !isSafeName(body.intentId) ||
            state.reader.readDemand(body.intentId).kind !== 'ok'
          )
            throw new WorkspaceError(422, 'invalid_intent', 'Demanda indisponível.');
          const ai = state.projects.find(root)?.ai ?? 'claude_code';
          const expected = formatAiCommand(`/aidlc intent switch ${body.intentId}`, ai);
          if (body.text !== expected)
            throw new WorkspaceError(
              422,
              'invalid_command',
              'O comando de ativação mudou. Confira novamente.',
            );
        }
        // Limite por sessão/contexto. Não eliminar identificadores antigos: isso permitiria reenvios.
        if (state.deliveries.size >= 2000)
          throw new WorkspaceError(
            409,
            'delivery_limit',
            'O limite de envios desta sessão foi atingido. Abra uma nova sessão.',
          );
        state.deliveries.set(body.commandId, { fingerprint, uncertain: true });
        try {
          state.terminal.write(body.text + (body.mode === 'execute' ? '\r' : ''));
          state.deliveries.set(body.commandId, { fingerprint, uncertain: false });
        } catch {
          throw new WorkspaceError(
            500,
            'unknown_delivery',
            'O comando pode ter chegado ao terminal. Confira antes de enviar novamente.',
          );
        }
      }
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
