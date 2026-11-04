import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';

export type ByteRange = { start: number; end: number };

/**
 * Interpreta o cabeçalho `Range` de uma faixa só. Devolve `null` quando não há faixa útil (sem
 * cabeçalho, várias faixas ou formato desconhecido: respondem 200 inteiro) e `'unsatisfiable'`
 * quando a faixa cai fora do arquivo (416).
 */
export function parseRange(
  header: string | null,
  size: number,
): ByteRange | 'unsatisfiable' | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, first = '', last = ''] = match;
  if (first === '' && last === '') return null;
  if (first === '') {
    // Faixa sufixo: os últimos N bytes.
    const length = Number(last);
    if (length === 0) return 'unsatisfiable';
    return { start: Math.max(size - length, 0), end: size - 1 };
  }
  const start = Number(first);
  if (start >= size) return 'unsatisfiable';
  const end = last === '' ? size - 1 : Math.min(Number(last), size - 1);
  if (end < start) return 'unsatisfiable';
  return { start, end };
}

/** Cabeçalhos fixos de segurança e de cache (BR1.4, `performance-design.md`). */
export function mediaHeaders(contentType: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Content-Disposition': 'inline',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=31536000, immutable',
  };
}

/** Abre o arquivo como fluxo, sem carregá-lo inteiro. */
export function streamFile(filePath: string, range?: ByteRange): ReadableStream<Uint8Array> {
  const stream = createReadStream(filePath, range ? { start: range.start, end: range.end } : {});
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}
