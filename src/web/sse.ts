const HEARTBEAT_MS = 15_000;

export type SseSender = (event: string, data: unknown) => void;

export type SseHandlers = {
  /** Começa a enviar e devolve a limpeza. `close` encerra a conexão pelo servidor. */
  start: (send: SseSender, close: () => void) => () => void;
};

/**
 * Resposta de eventos do servidor (C5). Cada envio vai direto ao navegador, sem agrupar, e quem cai
 * sai da lista pela limpeza, sem afetar os demais.
 */
export function sseResponse(request: Request, handlers: SseHandlers): Response {
  const encoder = new TextEncoder();
  let cleanup: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const finish = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        request.signal.removeEventListener('abort', finish);
        cleanup();
        try {
          controller.close();
        } catch {
          // A conexão já foi cancelada pelo navegador.
        }
      };

      const enqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          finish();
        }
      };

      const heartbeat = setInterval(() => enqueue(': ativo\n\n'), HEARTBEAT_MS);
      heartbeat.unref();
      request.signal.addEventListener('abort', finish);

      cleanup = handlers.start((event, data) => {
        enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }, finish);

      if (closed) cleanup();
    },
    cancel() {
      cleanup();
      cleanup = () => {};
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
