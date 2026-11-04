'use client';

import { useEffect, useState } from 'react';
import { type CustomizationState, fetchCustomization } from './customization-api';

/** A personalização salva, lida uma vez ao abrir. A tela Personalizar a atualiza a cada mudança. */
export function useCustomization() {
  const [custom, setCustom] = useState<CustomizationState | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchCustomization()
      .then((result) => {
        if (!cancelled && result.ok) setCustom(result.state);
      })
      .catch(() => {
        // Sem a personalização, o guia segue com os textos e as cores originais.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { custom, setCustom };
}
