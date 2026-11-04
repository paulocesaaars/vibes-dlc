import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  contrastWarnings,
  deriveColors,
  mixColors,
  ORIGINAL_COLORS,
  validateColor,
} from '@/customization/colors';
import { detectMediaType } from '@/customization/media-type';
import { applyTokens } from '@/customization/tokens';
import { CUSTOMIZABLE_MOMENTS, findMoment } from '@/guide/customizable-moments';
import { mediaBytes } from './helpers';

const text = (value: string) => new Uint8Array(Buffer.from(value));

describe('detectMediaType', () => {
  it.each([
    ['png', 'image/png'],
    ['jpeg', 'image/jpeg'],
    ['gif', 'image/gif'],
    ['webp', 'image/webp'],
    ['mp4', 'video/mp4'],
    ['webm', 'video/webm'],
  ])('reconhece %s pelo conteúdo', (kind, contentType) => {
    expect(detectMediaType(mediaBytes(kind))?.contentType).toBe(contentType);
  });

  it('recusa SVG e HTML mesmo com cara de imagem', () => {
    expect(detectMediaType(text('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectMediaType(text('<?xml version="1.0"?><svg/>'))).toBeNull();
    expect(detectMediaType(text('<html><script>alert(1)</script></html>'))).toBeNull();
  });

  it('aceita um PNG legítimo com XMP embutido, porque a assinatura combina', () => {
    const png = Buffer.concat([
      Buffer.from(mediaBytes('png', 8)),
      Buffer.from('<x:xmpmeta><svg onload="alert(1)"/></x:xmpmeta>'),
    ]);
    expect(detectMediaType(png)?.contentType).toBe('image/png');
  });

  it('recusa arquivo vazio, truncado, RIFF/WAV e ftyp de marca não aceita', () => {
    expect(detectMediaType(new Uint8Array())).toBeNull();
    expect(detectMediaType(new Uint8Array([0x89, 0x50]))).toBeNull();
    expect(detectMediaType(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(detectMediaType(text('GIF8'))).toBeNull();
    const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt ')]);
    expect(detectMediaType(wav)).toBeNull();
    for (const brand of ['heic', 'avif', '3gp4', 'M4A ']) {
      const bytes = Buffer.concat([Buffer.alloc(4), Buffer.from('ftyp'), Buffer.from(brand)]);
      expect(detectMediaType(bytes), brand).toBeNull();
    }
  });

  it('recusa Matroska sem webm nos primeiros 64 bytes', () => {
    const mkv = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.from('matroska')]);
    expect(detectMediaType(mkv)).toBeNull();
  });

  it('decide pelo conteúdo, não pelo nome: PNG vale como PNG e SVG segue recusado', () => {
    expect(detectMediaType(mediaBytes('png'))?.extension).toBe('png');
    expect(detectMediaType(text('<svg/>'))).toBeNull();
  });
});

describe('cores', () => {
  it('aceita #rrggbb e guarda em minúsculas', () => {
    expect(validateColor('#ABCDEF')).toBe('#abcdef');
  });

  it.each(['#fff', 'red', '#12345g', 'url(javascript:1)', '', 12, null, '#1234567'])(
    'recusa %s',
    (value) => {
      expect(validateColor(value)).toBeNull();
    },
  );

  it('mistura e deriva com os fatores do protótipo', () => {
    expect(mixColors('#ffffff', '#000000', 0.5)).toBe('#808080');
    const derived = deriveColors({ ...ORIGINAL_COLORS, accent: '#ff0000', ok: '#000000' });
    expect(derived.accentHover).toBe('#e00000');
    expect(derived.accentSoft).toBe('#ffbfbf');
    expect(derived.okSoft).toBe('#e0e0e0');
  });

  it('escolhe branco ou #222222 sobre o destaque, o que tiver mais contraste', () => {
    expect(deriveColors({ ...ORIGINAL_COLORS, accent: '#000000' }).onAccent).toBe('#ffffff');
    expect(deriveColors({ ...ORIGINAL_COLORS, accent: '#ffff00' }).onAccent).toBe('#222222');
  });

  it('calcula o contraste do WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('não avisa com as cores originais e avisa brand, text e muted abaixo do mínimo', () => {
    expect(contrastWarnings(ORIGINAL_COLORS)).toEqual([]);
    const warnings = contrastWarnings({
      ...ORIGINAL_COLORS,
      brand: '#fafafa',
      text: '#eeeeee',
      muted: '#999999',
    });
    expect(warnings.map((warning) => [warning.colorKey, warning.minimum])).toEqual([
      ['brand', 3],
      ['text', 4.5],
      ['muted', 4.5],
    ]);
    expect(warnings[0]?.message).toMatch(/contraste/);
  });
});

describe('marcações', () => {
  it('troca só as marcações do momento e deixa as outras como foram escritas', () => {
    expect(applyTokens('{etapa}: {x} e {descricao}', ['etapa'], { etapa: 'Projeto' })).toBe(
      'Projeto: {x} e {descricao}',
    );
  });

  it('não interpreta HTML: o resultado é texto puro', () => {
    expect(applyTokens('<b>{etapa}</b>', ['etapa'], { etapa: '<script>' })).toBe('<b><script></b>');
  });

  it('deixa a marcação quando falta o valor', () => {
    expect(applyTokens('{nivel}', ['nivel'], {})).toBe('{nivel}');
  });
});

describe('momentos personalizáveis', () => {
  it('são 16, sem failure, e os de recuperação aceitam só a arte', () => {
    expect(CUSTOMIZABLE_MOMENTS).toHaveLength(16);
    expect(findMoment('failure')).toBeUndefined();
    expect(findMoment('session_dead')?.textEditable).toBe(false);
    expect(findMoment('not_active')?.textEditable).toBe(false);
    expect(findMoment('understand')?.tokens).toEqual(['etapa', 'descricao']);
  });
});
