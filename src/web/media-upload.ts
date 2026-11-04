import { MAX_MEDIA_BYTES } from '@/customization/media-type';

/** 25 MiB de arquivo mais 1 MiB de margem do multipart (`security-design.md`). */
export const MAX_BODY_BYTES = MAX_MEDIA_BYTES + 1024 * 1024;

export class BodyTooLargeError extends Error {
  constructor() {
    super('O envio passa do limite de 25 MB.');
    this.name = 'BodyTooLargeError';
  }
}

/**
 * Lê o corpo em partes contando os bytes e cancela ao passar do limite, com ou sem `Content-Length`
 * (NFR5.5). Devolve um único `Buffer`, e a lista de partes é solta antes de devolver.
 */
export async function readLimitedBody(request: Request, limit = MAX_BODY_BYTES): Promise<Buffer> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) throw new BodyTooLargeError();
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  let chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        throw new BodyTooLargeError();
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks, total);
  } finally {
    chunks = [];
  }
}

const SEMAPHORE_KEY = Symbol.for('vibes-dlc.upload-semaphore');
type Holder = { [SEMAPHORE_KEY]?: { busy: boolean } };

function semaphore(): { busy: boolean } {
  const holder = globalThis as Holder;
  holder[SEMAPHORE_KEY] ??= { busy: false };
  return holder[SEMAPHORE_KEY];
}

/** Só um envio de mídia lê o corpo por vez. Devolve a função que solta, ou `null` se já há um. */
export function acquireUpload(): (() => void) | null {
  const state = semaphore();
  if (state.busy) return null;
  state.busy = true;
  return () => {
    state.busy = false;
  };
}
