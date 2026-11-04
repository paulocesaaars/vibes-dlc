/** Tipos de mídia aceitos, decididos só pelos primeiros bytes do arquivo (BR1.1, BR1.2). */
export const MAX_MEDIA_BYTES = 25 * 1024 * 1024;

export type MediaType = {
  contentType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'video/mp4' | 'video/webm';
  extension: 'png' | 'jpg' | 'gif' | 'webp' | 'mp4' | 'webm';
};

const MP4_BRANDS = new Set(['isom', 'iso2', 'mp41', 'mp42', 'avc1']);

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

/**
 * Devolve o tipo pelo conteúdo, ou `null` quando nenhuma assinatura aceita combina. SVG, XML, HTML,
 * HEIC, AVIF, WAV e Matroska caem em `null`. O nome e o tipo declarado nunca entram aqui.
 */
export function detectMediaType(bytes: Uint8Array): MediaType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) {
    return { contentType: 'image/png', extension: 'png' };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }
  if (bytes.length >= 6) {
    const head = ascii(bytes, 0, 6);
    if (head === 'GIF87a' || head === 'GIF89a')
      return { contentType: 'image/gif', extension: 'gif' };
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return { contentType: 'image/webp', extension: 'webp' };
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === 'ftyp' && MP4_BRANDS.has(ascii(bytes, 8, 12))) {
    return { contentType: 'video/mp4', extension: 'mp4' };
  }
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) {
    const window = ascii(bytes, 0, Math.min(bytes.length, 64));
    if (window.includes('webm')) return { contentType: 'video/webm', extension: 'webm' };
  }
  return null;
}

const EXTENSION_BY_TYPE: Record<MediaType['contentType'], MediaType['extension']> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

export function isMediaContentType(value: unknown): value is MediaType['contentType'] {
  return typeof value === 'string' && value in EXTENSION_BY_TYPE;
}

export function extensionOf(contentType: MediaType['contentType']): MediaType['extension'] {
  return EXTENSION_BY_TYPE[contentType];
}
