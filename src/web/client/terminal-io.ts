/** Limite por requisição de `/api/terminal/input` (NFR4.7), em caracteres seguros para UTF-8. */
const MAX_BATCH_CHARS = 16 * 1024;
const RECONNECT_DELAY_MS = 500;

/**
 * Agrupa as teclas: enquanto uma requisição está em curso, as próximas esperam e seguem juntas,
 * sempre em ordem (`performance-design.md`).
 */
export class InputQueue {
  private pending = '';
  private sending = false;

  constructor(
    private readonly send: (data: string) => Promise<void>,
    private readonly onError: (error: unknown) => void = () => {},
  ) {}

  push(data: string): void {
    this.pending += data;
    if (!this.sending) void this.flush();
  }

  private async flush(): Promise<void> {
    this.sending = true;
    while (this.pending) {
      const batch = this.pending.slice(0, MAX_BATCH_CHARS);
      this.pending = this.pending.slice(batch.length);
      try {
        await this.send(batch);
      } catch (error) {
        this.onError(error);
      }
    }
    this.sending = false;
  }
}

export type TerminalStreamHandlers = {
  onOutput: (data: string) => void;
  onReset: () => void;
  onEnded: (reason: string) => void;
};

/**
 * Conexão de saída do terminal. Com o stream caído, reconecta informando `afterSeq`, e ignora o que
 * já foi aplicado, então a tela não duplica (BR3.4). Reconectar nunca repete um envio.
 */
export class TerminalStream {
  private source: EventSource | null = null;
  private retry: ReturnType<typeof setTimeout> | null = null;
  private lastSeq = 0;
  private closed = false;

  constructor(
    private readonly sessionId: string,
    private readonly handlers: TerminalStreamHandlers,
  ) {}

  connect(): void {
    if (this.closed) return;
    const after = this.lastSeq > 0 ? `&afterSeq=${this.lastSeq}` : '';
    const source = new EventSource(
      `/api/terminal/stream?sessionId=${encodeURIComponent(this.sessionId)}${after}`,
    );
    this.source = source;
    source.addEventListener('output', (event) => this.handleOutput(event as MessageEvent<string>));
    source.addEventListener('reset', () => {
      this.lastSeq = 0;
      this.handlers.onReset();
    });
    source.addEventListener('ended', (event) => {
      const { reason } = JSON.parse((event as MessageEvent<string>).data) as { reason: string };
      this.closed = true;
      source.close();
      this.handlers.onEnded(reason);
    });
    source.onerror = () => this.scheduleReconnect(source);
  }

  close(): void {
    this.closed = true;
    this.source?.close();
    if (this.retry) clearTimeout(this.retry);
  }

  private handleOutput(event: MessageEvent<string>): void {
    const { data, seq } = JSON.parse(event.data) as { data: string; seq: number };
    if (seq <= this.lastSeq) return;
    this.lastSeq = seq;
    this.handlers.onOutput(data);
  }

  private scheduleReconnect(source: EventSource): void {
    source.close();
    if (this.closed || this.source !== source) return;
    this.source = null;
    this.retry = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
  }
}

/** `crypto.randomUUID` só existe em contexto seguro, e `VIBES_HOST` pode ser outro endereço. */
export function newCommandId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] as number) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const SESSION_KEY = 'vibes-dlc.session-id';

/** O `sessionId` fica na aba, para o servidor saber se a sessão anterior acabou (BR3.7). */
export function readStoredSessionId(): string | undefined {
  try {
    return sessionStorage.getItem(SESSION_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function storeSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, sessionId);
  } catch {
    // Sem armazenamento, a aba só deixa de reconhecer a sessão anterior.
  }
}
