import { COLOR_VARIABLES } from '@/customization/colors';
import type { CustomizationState } from '@/customization/customization-service';

/**
 * Aplica as cores como variáveis CSS no elemento raiz, numa só passagem. Cor que voltou ao original
 * perde a propriedade, e o `globals.css` volta a valer (`functional-spec.md`).
 */
export function applyColors(
  element: HTMLElement,
  state: Pick<CustomizationState, 'colors' | 'derived'> | null,
): void {
  for (const entry of COLOR_VARIABLES) {
    const custom = state?.colors.custom[entry.source];
    if (!custom) {
      element.style.removeProperty(entry.variable);
      continue;
    }
    element.style.setProperty(
      entry.variable,
      entry.derived && state ? state.derived[entry.derived] : custom,
    );
  }
}
