import { SessionNotAliveError } from '@/terminal/terminal-manager';
import { rejectForeignRequest } from '@/web/request-guard';
import { emptyResponse, errorResponse, invalidInput } from '@/web/responses';
import { getRuntime } from '@/web/runtime';
import { readJsonBody, resizeSchema } from '@/web/schemas';

export const dynamic = 'force-dynamic';

const SESSION_DEAD = 'A sessão do terminal foi encerrada.';

/** Vale o último tamanho recebido, mesmo com duas abas (`scalability-design.md`). */
export async function POST(request: Request): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const body = await readJsonBody(request, resizeSchema);
  if (!body.ok) return invalidInput(body.message);

  if (runtime.terminal.view()?.sessionId !== body.data.sessionId) {
    return errorResponse(409, 'session_dead', SESSION_DEAD);
  }
  try {
    runtime.terminal.resize(body.data.cols, body.data.rows);
  } catch (error) {
    if (error instanceof SessionNotAliveError) {
      return errorResponse(409, 'session_dead', SESSION_DEAD);
    }
    throw error;
  }
  return emptyResponse();
}
