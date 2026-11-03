const NO_STORE = { 'Cache-Control': 'no-store' };

/** Erro padrão das rotas (C4): `code` estável e `message` em português. */
export function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ code, message }, { status, headers: NO_STORE });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function emptyResponse(): Response {
  return new Response(null, { status: 204, headers: NO_STORE });
}

export function invalidInput(message = 'A requisição veio em um formato inválido.'): Response {
  return errorResponse(422, 'invalid_input', message);
}
