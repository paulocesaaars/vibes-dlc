import { rejectForeignRequest } from '@/web/request-guard';
import { getRuntime } from '@/web/runtime';
import { sseResponse } from '@/web/sse';

export const dynamic = 'force-dynamic';

/** Só avisa que algo mudou. A interface pede a decisão de novo, o que mantém uma única fonte (C5). */
export function GET(request: Request): Response {
  const runtime = getRuntime();
  const rejected = rejectForeignRequest(request, runtime.config);
  if (rejected) return rejected;

  return sseResponse(request, {
    start(send) {
      const notify = (intentId: string | null) => {
        send('changed', { intentId, at: new Date().toISOString() });
      };
      const stopReader = runtime.reader.subscribe(notify);
      const stopTerminal = runtime.terminal.onStatusChange(() => notify(null));
      return () => {
        stopReader();
        stopTerminal();
      };
    },
  });
}
