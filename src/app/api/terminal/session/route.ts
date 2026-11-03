import { terminalTitle } from '@/terminal/terminal-manager';
import { rejectForeignRequest } from '@/web/request-guard';
import { emptyResponse, errorResponse, invalidInput, jsonResponse } from '@/web/responses';
import { getRuntime } from '@/web/runtime';
import { readJsonBody, sessionSchema } from '@/web/schemas';

export const dynamic = 'force-dynamic';

/** Abre ou retoma a sessão. Nova sessão só com o pedido explícito da pessoa (BR3.1, BR3.6). */
export async function POST(request: Request): Promise<Response> {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const body = await readJsonBody(request, sessionSchema);
  if (!body.ok) return invalidInput(body.message);

  const session = body.data.newSession
    ? runtime.terminal.newSession()
    : runtime.terminal.openOrJoin(body.data.sessionId);

  if (session.status === 'unavailable') {
    const searched = session.searchedShells.join(', ');
    return Response.json(
      {
        code: 'shell_unavailable',
        message: `O Git Bash não foi encontrado. Procurei em: ${searched}.`,
        session,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return jsonResponse({ ...session, terminalTitle: terminalTitle(runtime.config.repoRoot) });
}

/** Encerra a sessão. Nada abre sozinho depois disso (BR3.6). */
export function DELETE(request: Request): Response {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;
  if (!runtime.terminal.view()) {
    return errorResponse(409, 'session_dead', 'Não há sessão do terminal para encerrar.');
  }
  runtime.terminal.kill();
  return emptyResponse();
}
