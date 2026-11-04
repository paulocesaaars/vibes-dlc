/** Frases personalizadas: limites e troca de marcações sobre texto puro (BR2.1, BR2.3). */
export const MAX_TITLE_LENGTH = 120;
export const MAX_TEXT_LENGTH = 600;

export type SayField = 'title' | 'text';

export const SAY_LIMITS: Record<SayField, number> = {
  title: MAX_TITLE_LENGTH,
  text: MAX_TEXT_LENGTH,
};

/**
 * Troca cada marcação listada em `tokens` pelo valor atual. Uma marcação desconhecida, como `{x}`,
 * e uma sem valor ficam como foram escritas.
 */
export function applyTokens(
  text: string,
  tokens: readonly string[],
  values: Readonly<Record<string, string | undefined>>,
): string {
  return text.replace(/\{([a-z_]+)\}/g, (whole, name: string) => {
    if (!tokens.includes(name)) return whole;
    return values[name] ?? whole;
  });
}
