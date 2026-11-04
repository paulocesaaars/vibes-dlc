/**
 * Leitor mínimo de multipart/form-data sobre um `Buffer` já limitado em tamanho. Ele existe para o
 * arquivo sair como uma janela do próprio corpo, sem cópia: o `FormData` do Node.js copia o
 * conteúdo mais de uma vez e estourava os 100 MB de memória do envio (NFR5.5).
 */
export type MultipartResult = {
  fields: Map<string, string>;
  file: { filename: string; bytes: Uint8Array } | null;
};

const MAX_PARTS = 8;
const MAX_HEADER_BYTES = 4096;
const MAX_FIELD_BYTES = 1024;
const CRLF = Buffer.from('\r\n');
const HEADER_END = Buffer.from('\r\n\r\n');

export function boundaryOf(contentType: string): string | null {
  const match = /;\s*boundary=(?:"([^"]{1,70})"|([^\s;"]{1,70}))/i.exec(contentType);
  return match?.[1] ?? match?.[2] ?? null;
}

function dispositionOf(header: string): { name: string; filename: string | null } | null {
  const line = header
    .split('\r\n')
    .find((entry) => entry.toLowerCase().startsWith('content-disposition:'));
  if (!line) return null;
  const name = /;\s*name="([^"]*)"/i.exec(line)?.[1];
  if (name === undefined) return null;
  return { name, filename: /;\s*filename="([^"]*)"/i.exec(line)?.[1] ?? null };
}

/** Devolve os campos e o arquivo, ou `null` quando o corpo não segue o formato. */
export function parseMultipart(body: Buffer, contentType: string): MultipartResult | null {
  const boundary = boundaryOf(contentType);
  if (!boundary) return null;
  const delimiter = Buffer.from(`--${boundary}`);
  const result: MultipartResult = { fields: new Map(), file: null };

  let position = body.indexOf(delimiter);
  if (position < 0) return null;
  for (let parts = 0; parts <= MAX_PARTS; parts++) {
    position += delimiter.length;
    // O delimitador final termina em "--".
    if (body[position] === 0x2d && body[position + 1] === 0x2d) return result;
    if (!body.subarray(position, position + 2).equals(CRLF)) return null;
    const contentStart = position + 2;
    const headerEnd = body.indexOf(HEADER_END, contentStart);
    if (headerEnd < 0 || headerEnd - contentStart > MAX_HEADER_BYTES) return null;
    const disposition = dispositionOf(body.toString('utf8', contentStart, headerEnd));
    if (!disposition) return null;

    const dataStart = headerEnd + HEADER_END.length;
    const next = body.indexOf(Buffer.concat([CRLF, delimiter]), dataStart);
    if (next < 0) return null;
    const data = new Uint8Array(body.buffer, body.byteOffset + dataStart, next - dataStart);

    if (disposition.name === 'file') {
      if (result.file) return null;
      result.file = { filename: disposition.filename ?? '', bytes: data };
    } else {
      if (result.fields.has(disposition.name) || data.length > MAX_FIELD_BYTES) return null;
      result.fields.set(disposition.name, Buffer.from(data).toString('utf8'));
    }
    position = next + CRLF.length;
  }
  return null;
}
