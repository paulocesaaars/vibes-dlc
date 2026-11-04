import type { CustomizationState } from '@/customization/customization-service';

export type { CustomizationState };

export type CustomizationPutBody = {
  colors?: Record<string, string | null>;
  says?: Record<string, { title?: string | null; text?: string | null }>;
  media?: Record<string, null>;
  cliKind?: 'claude_code' | 'other' | null;
  resetAll?: true;
};

export type CustomizationResult =
  { ok: true; state: CustomizationState } | { ok: false; code: string; message: string };

async function readResult(response: Response): Promise<CustomizationResult> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    if (response.ok) return { ok: true, state: body as unknown as CustomizationState };
    return {
      ok: false,
      code: typeof body.code === 'string' ? body.code : 'unexpected',
      message:
        typeof body.message === 'string' ? body.message : 'O painel não respondeu como o esperado.',
    };
  } catch {
    return { ok: false, code: 'unexpected', message: 'O painel não respondeu como o esperado.' };
  }
}

function post(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function fetchCustomization(): Promise<CustomizationResult> {
  return readResult(await fetch('/api/customization'));
}

export async function openCustomizationVisit(): Promise<CustomizationResult> {
  return readResult(await post('/api/customization/visit', {}));
}

export async function putCustomization(
  visitId: string,
  patch: CustomizationPutBody,
): Promise<CustomizationResult> {
  const response = await fetch('/api/customization', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitId, ...patch }),
  });
  return readResult(response);
}

export async function uploadCustomMedia(
  visitId: string,
  momentKey: string,
  file: File,
): Promise<CustomizationResult> {
  const form = new FormData();
  form.set('momentKey', momentKey);
  form.set('visitId', visitId);
  form.set('file', file);
  return readResult(await fetch('/api/customization/media', { method: 'POST', body: form }));
}

export async function finishCustomizationVisit(
  visitId: string,
  how: 'done' | 'cancel',
): Promise<CustomizationResult> {
  return readResult(await post(`/api/customization/visit/${how}`, { visitId }));
}
