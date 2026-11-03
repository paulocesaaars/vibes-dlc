import type { RepoHealth } from '@/core/types';
import type { GuideView } from '@/web/guide-service';

export type DemandsResponse = {
  repo: { health: RepoHealth; failedPath: string | null };
  activeIntentId: string | null;
};

export type ApiFailure = { code: string; message: string };

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function readFailure(response: Response): Promise<ApiFailure> {
  try {
    return await readJson<ApiFailure>(response);
  } catch {
    return { code: 'unexpected', message: 'O painel não respondeu como o esperado.' };
  }
}

function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export type SessionResponse = {
  sessionId: string;
  status: 'alive' | 'dead' | 'unavailable';
  terminalTitle?: string;
};

/** Abre ou retoma a sessão. Com 503, a decisão do guia mostra a falha do Git Bash. */
export async function requestSession(body: {
  sessionId?: string;
  newSession?: boolean;
}): Promise<SessionResponse | null> {
  const response = await postJson('/api/terminal/session', body);
  if (response.status === 503) return null;
  if (!response.ok) throw new Error((await readFailure(response)).message);
  return readJson<SessionResponse>(response);
}

export async function killSession(): Promise<void> {
  await fetch('/api/terminal/session', { method: 'DELETE' });
}

export async function fetchDemands(): Promise<DemandsResponse> {
  const response = await fetch('/api/demands');
  if (!response.ok) throw new Error((await readFailure(response)).message);
  return readJson<DemandsResponse>(response);
}

export async function fetchGuide(intentId: string): Promise<GuideView> {
  const response = await fetch(`/api/demands/${encodeURIComponent(intentId)}/guide`);
  if (!response.ok) throw new Error((await readFailure(response)).message);
  return readJson<GuideView>(response);
}

export async function postUnderstood(
  intentId: string,
  stageSlug: string,
): Promise<GuideView | null> {
  const response = await postJson(`/api/demands/${encodeURIComponent(intentId)}/understood`, {
    stageSlug,
  });
  if (!response.ok) return null;
  return readJson<GuideView>(response);
}

export type SendRequest = {
  commandId: string;
  intentId: string;
  stageSlug: string;
  text: string;
  mode: 'execute' | 'paste';
};

export type SendResult = { ok: true } | ({ ok: false; status: number } & ApiFailure);

export async function postCommand(request: SendRequest): Promise<SendResult> {
  const response = await postJson('/api/commands', request);
  if (response.ok) return { ok: true };
  return { ok: false, status: response.status, ...(await readFailure(response)) };
}

export async function postInput(sessionId: string, data: string): Promise<void> {
  await postJson('/api/terminal/input', { sessionId, data });
}

export async function postResize(sessionId: string, cols: number, rows: number): Promise<void> {
  await postJson('/api/terminal/resize', { sessionId, cols, rows });
}
