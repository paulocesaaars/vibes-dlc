export type OutputChunk = { seq: number; data: string; newlines: number; bytes: number };

export const MAX_NEWLINES = 2000;
export const MAX_BYTES = 5 * 1024 * 1024;

function countNewlines(data: string): number {
  let count = 0;
  for (let index = data.indexOf('\n'); index !== -1; index = data.indexOf('\n', index + 1)) {
    count += 1;
  }
  return count;
}

/**
 * Janela em memória dos blocos brutos de saída (BR3.4, NFR2.2). `seq` numera blocos, não linhas.
 * Ao passar do limite, os mais antigos saem, com custo proporcional aos removidos.
 */
export class OutputWindow {
  private chunks: OutputChunk[] = [];
  private head = 0;
  private newlines = 0;
  private bytes = 0;
  private nextSeqValue = 1;

  constructor(
    private readonly maxNewlines = MAX_NEWLINES,
    private readonly maxBytes = MAX_BYTES,
  ) {}

  get nextSeq(): number {
    return this.nextSeqValue;
  }

  get totalBytes(): number {
    return this.bytes;
  }

  get totalNewlines(): number {
    return this.newlines;
  }

  get firstSeq(): number {
    return this.chunks[this.head]?.seq ?? this.nextSeqValue;
  }

  append(data: string): OutputChunk {
    const chunk: OutputChunk = {
      seq: this.nextSeqValue,
      data,
      newlines: countNewlines(data),
      bytes: Buffer.byteLength(data),
    };
    this.nextSeqValue += 1;
    this.chunks.push(chunk);
    this.newlines += chunk.newlines;
    this.bytes += chunk.bytes;
    this.trim();
    return chunk;
  }

  /** Blocos com `seq` maior que `afterSeq`, ou todos quando ele é nulo. */
  since(afterSeq: number | null): OutputChunk[] {
    const live = this.chunks.slice(this.head);
    return afterSeq === null ? live : live.filter((chunk) => chunk.seq > afterSeq);
  }

  /** Dá para continuar de `afterSeq` sem perder nada? */
  covers(afterSeq: number): boolean {
    return afterSeq >= this.firstSeq - 1 && afterSeq < this.nextSeqValue;
  }

  private trim(): void {
    while (
      this.head < this.chunks.length &&
      (this.newlines > this.maxNewlines || this.bytes > this.maxBytes)
    ) {
      const removed = this.chunks[this.head] as OutputChunk;
      this.newlines -= removed.newlines;
      this.bytes -= removed.bytes;
      this.head += 1;
    }
    if (this.head > 1024) {
      this.chunks = this.chunks.slice(this.head);
      this.head = 0;
    }
  }
}
