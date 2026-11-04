import { describe, expect, it } from 'vitest';
import { boundaryOf, parseMultipart } from '@/web/multipart';

const B = 'xyz';
const TYPE = `multipart/form-data; boundary=${B}`;
const field = (name: string, value: string) =>
  `--${B}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
const file = (content: string) =>
  `--${B}\r\nContent-Disposition: form-data; name="file"; filename="a.png"\r\nContent-Type: image/png\r\n\r\n${content}\r\n`;
const body = (...parts: string[]) => Buffer.from(`${parts.join('')}--${B}--\r\n`);

describe('leitor de multipart', () => {
  it('lê campos e arquivo, e o arquivo é uma janela do corpo, sem cópia', () => {
    const buffer = body(field('momentKey', 'home'), field('visitId', 'v1'), file('BYTES\r\n--x'));
    const result = parseMultipart(buffer, TYPE)!;
    expect(result.fields.get('momentKey')).toBe('home');
    expect(result.fields.get('visitId')).toBe('v1');
    expect(Buffer.from(result.file!.bytes).toString()).toBe('BYTES\r\n--x');
    expect(result.file!.filename).toBe('a.png');
    expect(result.file!.bytes.buffer).toBe(buffer.buffer);
  });

  it('aceita boundary entre aspas e arquivo vazio', () => {
    expect(boundaryOf('multipart/form-data; boundary="abc def"')).toBe('abc def');
    const result = parseMultipart(body(file('')), TYPE)!;
    expect(result.file!.bytes).toHaveLength(0);
  });

  it('recusa sem boundary, sem delimitador, truncado e sem cabeçalho de campo', () => {
    expect(parseMultipart(body(file('x')), 'multipart/form-data')).toBeNull();
    expect(parseMultipart(Buffer.from('nada'), TYPE)).toBeNull();
    expect(parseMultipart(Buffer.from(file('x').slice(0, 60)), TYPE)).toBeNull();
    expect(
      parseMultipart(Buffer.from(`--${B}\r\nX-Outro: 1\r\n\r\nv\r\n--${B}--`), TYPE),
    ).toBeNull();
  });

  it('recusa campo repetido, dois arquivos, campo grande e partes demais', () => {
    expect(parseMultipart(body(field('a', '1'), field('a', '2')), TYPE)).toBeNull();
    expect(parseMultipart(body(file('1'), file('2')), TYPE)).toBeNull();
    expect(parseMultipart(body(field('a', 'x'.repeat(2000))), TYPE)).toBeNull();
    const many = Array.from({ length: 12 }, (_, index) => field(`c${index}`, '1'));
    expect(parseMultipart(body(...many), TYPE)).toBeNull();
  });
});
