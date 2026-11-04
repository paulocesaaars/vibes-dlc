import type { ArtifactContent } from '@/aidlc/artifacts';
import type { RepoHealth } from '@/core/types';
import type { CliKind } from '@/core/types';
import type { ArtifactList } from '@/web/artifact-service';
import type { GuideView } from '@/web/guide-service';
import type { SeenResponse } from '@/web/schemas';
import type { DemandRow, DecisionRow, UnitRow } from '@/aidlc/demand-browser';
import type { ArtifactNote } from '@/db/artifact-note-repo';
import type { SentCommand } from '@/db/sent-command-repo';

export type DemandsResponse = {
  repo: { health: RepoHealth; failedPath: string | null };
  activeIntentId: string | null;
  rows: DemandRow[];
  cliKind: CliKind;
};

export async function fetchDemandRows(): Promise<DemandRow[]> {
  return (await fetchDemands()).rows ?? [];
}
export async function fetchUnits(intentId: string): Promise<UnitRow[]> {
  return (await (await fetch(`/api/demands/${encodeURIComponent(intentId)}/units`)).json())
    .units as UnitRow[];
}
export async function fetchDecisions(intentId: string): Promise<DecisionRow[]> {
  return (await (await fetch(`/api/demands/${encodeURIComponent(intentId)}/decisions`)).json())
    .decisions as DecisionRow[];
}
export async function fetchCommandHistory(intentId: string): Promise<SentCommand[]> {
  return (await (await fetch(`/api/demands/${encodeURIComponent(intentId)}/commands`)).json())
    .commands as SentCommand[];
}
export async function fetchNotes(intentId: string, path: string): Promise<ArtifactNote[]> {
  return (
    await (
      await fetch(
        `/api/demands/${encodeURIComponent(intentId)}/notes?path=${encodeURIComponent(path)}`,
      )
    ).json()
  ).notes as ArtifactNote[];
}
export async function postNote(
  intentId: string,
  path: string,
  text: string,
): Promise<ApiFailure | null> {
  const response = await postJson(`/api/demands/${encodeURIComponent(intentId)}/notes`, {
    path,
    text,
  });
  return response.ok ? null : readFailure(response);
}
export async function postNewDemandCommand(body: {
  commandId: string;
  text: string;
  mode: 'execute' | 'paste';
  kind: 'new_demand' | 'analysis';
}): Promise<SendResult> {
  const response = await postJson('/api/demands/new/command', body);
  return response.ok
    ? { ok: true }
    : { ok: false, status: response.status, ...(await readFailure(response)) };
}
export async function postActivate(
  intentId: string,
  body: { commandId: string; mode: 'execute' | 'paste' },
): Promise<SendResult> {
  const response = await postJson(`/api/demands/${encodeURIComponent(intentId)}/activate`, body);
  return response.ok
    ? { ok: true }
    : { ok: false, status: response.status, ...(await readFailure(response)) };
}

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

/** Reconhece a conclusão. Com a tela desatualizada, devolve `null`, e o guia relê os arquivos. */
export async function postConclusionSeen(
  intentId: string,
  stageSlug: string,
): Promise<GuideView | null> {
  const response = await postJson(`/api/demands/${encodeURIComponent(intentId)}/conclusion`, {
    stageSlug,
  });
  if (!response.ok) return null;
  return readJson<GuideView>(response);
}

export type ArtifactsRequest = {
  intentId: string;
  stage: string;
  unit: string | null;
  consult: boolean;
  path: string | null;
};

export type ArtifactsResult =
  { kind: 'ok'; list: ArtifactList } | { kind: 'gone' } | { kind: 'failed'; message: string };

export async function fetchArtifacts(request: ArtifactsRequest): Promise<ArtifactsResult> {
  const params = new URLSearchParams({ stage: request.stage });
  if (request.unit) params.set('unit', request.unit);
  if (request.consult) params.set('consult', '1');
  if (request.path) params.set('path', request.path);
  const url = `/api/demands/${encodeURIComponent(request.intentId)}/artifacts?${params.toString()}`;
  try {
    const response = await fetch(url);
    if (response.status === 404) return { kind: 'gone' };
    if (!response.ok) return { kind: 'failed', message: (await readFailure(response)).message };
    return { kind: 'ok', list: await readJson<ArtifactList>(response) };
  } catch {
    return { kind: 'failed', message: 'O painel não respondeu ao ler os arquivos.' };
  }
}

export type ReviewResult =
  | { kind: 'ok' }
  | { kind: 'changed'; message: string; artifact: ArtifactContent }
  | { kind: 'failed'; message: string };

/** Marca como revisado, com o hash mostrado na tela. Um erro fica na própria linha, sem marcar. */
export async function postReview(
  intentId: string,
  path: string,
  contentHash: string,
): Promise<ReviewResult> {
  try {
    const response = await postJson(
      `/api/demands/${encodeURIComponent(intentId)}/artifacts/review`,
      { path, contentHash },
    );
    if (response.ok) return { kind: 'ok' };
    if (response.status === 409) {
      const body = await readJson<{ message: string; artifact: ArtifactContent }>(response);
      return { kind: 'changed', message: body.message, artifact: body.artifact };
    }
    return { kind: 'failed', message: (await readFailure(response)).message };
  } catch {
    return { kind: 'failed', message: 'O painel não respondeu. Tente marcar de novo.' };
  }
}

/** Uma falha aqui só deixa de mostrar o aviso: o momento atual continua na tela. */
export async function fetchSeen(intentId: string): Promise<SeenResponse | null> {
  try {
    const response = await fetch(`/api/demands/${encodeURIComponent(intentId)}/seen`);
    if (!response.ok || response.status === 204) return null;
    return await readJson<SeenResponse>(response);
  } catch {
    return null;
  }
}

export async function postSeen(
  intentId: string,
  state: { stageSlug: string; unit: string; mark: string },
): Promise<void> {
  try {
    await postJson(`/api/demands/${encodeURIComponent(intentId)}/seen`, state);
  } catch {
    // Sem gravar, o aviso só aparece de novo ao reabrir. Nada na tela depende disso.
  }
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
