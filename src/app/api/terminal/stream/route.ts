import { rejectForeignRequest } from '@/web/request-guard';
import { invalidInput } from '@/web/responses';
import { getRuntime } from '@/web/runtime';
import { streamQuerySchema } from '@/web/schemas';
import { sseResponse } from '@/web/sse';

export const dynamic = 'force-dynamic';

/** Saída da sessão, em blocos numerados por `seq` (C5). A saída nunca é analisada aqui. */
export function GET(request: Request): Response {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  const params = new URL(request.url).searchParams;
  const query = streamQuerySchema.safeParse({
    sessionId: params.get('sessionId') ?? undefined,
    afterSeq: params.get('afterSeq') ?? undefined,
  });
  if (!query.success) return invalidInput('Faltou o sessionId ou o afterSeq é inválido.');

  return sseResponse(request, {
    start(send, close) {
      const attached = runtime.terminal.attach(
        query.data.sessionId,
        query.data.afterSeq ?? null,
        (event) => {
          const { type, ...payload } = event;
          send(type, payload);
          if (type === 'ended') close();
        },
      );
      if (!attached) {
        send('ended', { reason: 'server_stopped' });
        close();
        return () => {};
      }
      for (const event of attached.replay) {
        const { type, ...payload } = event;
        send(type, payload);
        if (type === 'ended') close();
      }
      return attached.detach;
    },
  });
}
