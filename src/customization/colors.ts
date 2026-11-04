/** Cores configuráveis, cores derivadas e avisos de contraste (BR3.1 a BR3.4). Funções puras. */
export const COLOR_KEYS = ['brand', 'accent', 'text', 'muted', 'bg', 'soft', 'line', 'ok'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];
export type ColorMap = Record<ColorKey, string>;

export const ORIGINAL_COLORS: ColorMap = {
  brand: '#ff385c',
  accent: '#ff385c',
  text: '#222222',
  muted: '#6a6a6a',
  bg: '#ffffff',
  soft: '#f7f7f7',
  line: '#dddddd',
  ok: '#04694a',
};

export const COLOR_LABELS: Record<ColorKey, string> = {
  brand: 'Logo e título',
  accent: 'Destaque',
  text: 'Texto',
  muted: 'Texto de apoio',
  bg: 'Fundo',
  soft: 'Preenchimentos',
  line: 'Bordas',
  ok: 'Sucesso',
};

export type DerivedColors = {
  accentHover: string;
  accentSoft: string;
  onAccent: string;
  okSoft: string;
};

export type ContrastWarning = {
  colorKey: 'brand' | 'text' | 'muted';
  ratio: number;
  minimum: 3 | 4.5;
  message: string;
};

/**
 * Variáveis CSS de cada origem (`functional-spec.md`). As derivadas só valem quando a cor de origem
 * foi trocada; sem troca, o `globals.css` continua mandando.
 */
export const COLOR_VARIABLES: {
  source: ColorKey;
  variable: string;
  derived?: keyof DerivedColors;
}[] = [
  { source: 'brand', variable: '--brand' },
  { source: 'accent', variable: '--green' },
  { source: 'accent', variable: '--furDark' },
  { source: 'accent', variable: '--green2', derived: 'accentHover' },
  { source: 'accent', variable: '--greenText', derived: 'accentHover' },
  { source: 'accent', variable: '--leaf', derived: 'accentSoft' },
  { source: 'accent', variable: '--onAccent', derived: 'onAccent' },
  { source: 'text', variable: '--ink' },
  { source: 'text', variable: '--night' },
  { source: 'text', variable: '--blue' },
  { source: 'text', variable: '--blueText' },
  { source: 'muted', variable: '--gray' },
  { source: 'bg', variable: '--paper' },
  { source: 'soft', variable: '--wash' },
  { source: 'soft', variable: '--mint' },
  { source: 'soft', variable: '--furLight' },
  { source: 'line', variable: '--line' },
  { source: 'line', variable: '--faded' },
  { source: 'ok', variable: '--ok' },
  { source: 'ok', variable: '--okSoft', derived: 'okSoft' },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isColorKey(value: string): value is ColorKey {
  return (COLOR_KEYS as readonly string[]).includes(value);
}

/** Devolve o valor em minúsculas, ou `null` quando não é `#rrggbb` (BR3.1). */
export function validateColor(value: unknown): string | null {
  return typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : null;
}

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16)) as Rgb;
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`;
}

/** Mistura `from` com `to`, com `amount` (0 a 1) de `to`. */
export function mixColors(from: string, to: string, amount: number): string {
  const a = toRgb(from);
  const b = toRgb(to);
  return toHex(a.map((part, index) => part * (1 - amount) + (b[index] as number) * amount) as Rgb);
}

/** Luminância relativa do WCAG. */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((part) => {
    const channel = part / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(first: string, second: string): number {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

/** Fatores do protótipo (BR3.2). */
export function deriveColors(colors: ColorMap): DerivedColors {
  const white = '#ffffff';
  const dark = '#222222';
  return {
    accentHover: mixColors(colors.accent, '#000000', 0.12),
    accentSoft: mixColors(colors.accent, white, 0.75),
    onAccent:
      contrastRatio(white, colors.accent) >= contrastRatio(dark, colors.accent) ? white : dark,
    okSoft: mixColors(colors.ok, white, 0.88),
  };
}

const WARNING_TEXT: Record<ContrastWarning['colorKey'], string> = {
  brand: 'O logo e o título ficam difíceis de ver sobre o fundo.',
  text: 'O texto fica difícil de ler sobre o fundo.',
  muted: 'O texto de apoio fica difícil de ler sobre o fundo.',
};

/** Avisa, sem bloquear, quando o contraste com `bg` fica abaixo do mínimo (BR3.3). */
export function contrastWarnings(colors: ColorMap): ContrastWarning[] {
  const checks: [ContrastWarning['colorKey'], 3 | 4.5][] = [
    ['brand', 3],
    ['text', 4.5],
    ['muted', 4.5],
  ];
  const warnings: ContrastWarning[] = [];
  for (const [colorKey, minimum] of checks) {
    const ratio = contrastRatio(colors[colorKey], colors.bg);
    if (ratio < minimum) {
      const shown = (Math.floor(ratio * 10) / 10).toFixed(1).replace('.', ',');
      warnings.push({
        colorKey,
        ratio: Math.round(ratio * 100) / 100,
        minimum,
        message: `${WARNING_TEXT[colorKey]} O contraste é de ${shown} para 1, e o mínimo recomendado é ${String(minimum).replace('.', ',')} para 1.`,
      });
    }
  }
  return warnings;
}
