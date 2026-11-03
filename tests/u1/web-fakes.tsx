import { vi } from 'vitest';
import type { GuideDecision, Moment, Turn } from '@/core/types';
import { momentContent } from '@/guide/moment-content';
import { stageContent } from '@/guide/stage-content';
import type { GuideView } from '@/web/guide-service';

/** Monta uma resposta do guia com o mesmo código de texto do servidor. */
export function guideView(
  moment: Moment,
  turn: Turn = 'person',
  extra: Partial<GuideView> = {},
): GuideView {
  const primary: Record<Moment, GuideDecision['primaryAction']> = {
    failure: 'retry',
    not_active: 'activate',
    session_dead: 'new_session',
    conclusion: 'next_stage',
    trail_done: 'none',
    review: 'mark_reviewed',
    approve: 'none',
    question: 'none',
    revising: 'none',
    understand: 'understood',
    send: 'send',
    pasted: 'none',
    following: 'none',
  };
  const decision: GuideDecision = {
    moment,
    turn,
    primaryAction: primary[moment],
    canSend: moment === 'send',
    sendBlockedReason: moment === 'send' ? null : 'not_send_moment',
    showIdleNotice: false,
  };
  const about = stageContent('functional-design', 'aidlc-architect-agent');
  return {
    intentId: 'intent-a',
    title: 'Demanda',
    scope: 'mvp',
    stage: {
      slug: 'functional-design',
      stateSlug: 'functional-design',
      name: 'Projeto funcional',
      number: '3.1',
      mark: 'in_progress',
      unit: null,
    },
    position: { source: 'state' },
    artifacts: { total: 0, reviewed: 0 },
    progress: { done: 2, total: 5 },
    nextStage: { slug: 'nfr-design', name: 'Projeto não funcional' },
    conclusion: null,
    sentCommands: [],
    previousStage: null,
    minutesSinceLastChange: 0,
    decision,
    content: momentContent(decision, {
      stageName: 'Projeto funcional',
      stageNumber: '3.1',
      stageDescription: about.whatItDoes,
      health: 'ok',
      failedPath: null,
    }),
    stageContent: about,
    command: '/aidlc',
    trail: [
      {
        name: 'ideation',
        label: 'Ideação',
        done: 1,
        total: 1,
        isCurrent: false,
        stages: [
          {
            slug: 'intent-capture',
            name: 'Captura da intenção',
            number: '1.1',
            status: 'done',
            unit: null,
          },
        ],
      },
      {
        name: 'construction',
        label: 'Construção',
        done: 1,
        total: 3,
        isCurrent: true,
        stages: [
          { slug: 'antes', name: 'Etapa concluída', number: '3.0', status: 'done', unit: null },
          {
            slug: 'functional-design',
            name: 'Projeto funcional',
            number: '3.1',
            status: 'current',
            unit: null,
          },
          {
            slug: 'nfr-design',
            name: 'Projeto não funcional',
            number: '3.3',
            status: 'blocked',
            unit: null,
          },
          { slug: 'pulada', name: 'Etapa pulada', number: '3.4', status: 'skipped', unit: null },
        ],
      },
    ],
    session: {
      sessionId: 'sessao-1',
      status: moment === 'session_dead' ? 'dead' : 'alive',
      endReason: moment === 'session_dead' ? 'killed' : null,
    },
    terminalTitle: 'MINGW64:/c/Git/vibes-dlc',
    repo: { health: 'ok', failedPath: null },
    lastChangedAt: '2026-11-03T12:00:00.000Z',
    stale: false,
    ...extra,
  };
}

export class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly listeners = new Map<string, ((event: MessageEvent<string>) => void)[]>();
  onerror: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  close(): void {
    this.closed = true;
  }

  emit(type: string, data: unknown = {}): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data: JSON.stringify(data) } as MessageEvent<string>);
    }
  }

  static last(fragment: string): FakeEventSource {
    const found = [...FakeEventSource.instances].reverse().find((s) => s.url.includes(fragment));
    if (!found) throw new Error(`nenhuma conexão com ${fragment}`);
    return found;
  }
}

export type FakeServer = {
  view: GuideView | null;
  activeIntentId: string | null;
  repo: { health: string; failedPath: string | null };
  sessionStatus: number;
  sendResponse: { status: number; body: Record<string, unknown> };
  understoodStatus: number;
  requests: { url: string; method: string; body: Record<string, unknown> | null }[];
  bodiesOf: (fragment: string) => Record<string, unknown>[];
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Substitui o `fetch` da tela: guarda as chamadas e responde como as rotas. */
export function installFakeServer(view: GuideView | null): FakeServer {
  const server: FakeServer = {
    view,
    activeIntentId: view ? view.intentId : null,
    repo: { health: 'ok', failedPath: null },
    sessionStatus: 200,
    sendResponse: { status: 200, body: { status: 'written' } },
    understoodStatus: 200,
    requests: [],
    bodiesOf: (fragment) =>
      server.requests
        .filter((request) => request.url.includes(fragment) && request.body)
        .map((request) => request.body as Record<string, unknown>),
  };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      server.requests.push({ url: input, method, body });
      if (input === '/api/terminal/session') {
        if (method === 'DELETE') return new Response(null, { status: 204 });
        if (server.sessionStatus === 503)
          return json({ code: 'shell_unavailable', message: 'x' }, 503);
        if (server.sessionStatus !== 200)
          return json({ code: 'erro', message: 'Falha ao abrir' }, 500);
        return json({ sessionId: 'sessao-1', status: 'alive' });
      }
      if (input === '/api/demands') {
        if (server.sessionStatus === 599)
          return json({ code: 'erro', message: 'Painel fora' }, 500);
        return json({ repo: server.repo, activeIntentId: server.activeIntentId, demands: [] });
      }
      if (input.endsWith('/guide')) return json(server.view);
      if (input.endsWith('/understood')) {
        if (server.understoodStatus !== 200)
          return json({ code: 'stale_screen', message: 'x' }, 409);
        return json(server.view);
      }
      if (input === '/api/commands')
        return json(server.sendResponse.body, server.sendResponse.status);
      return new Response(null, { status: 204 });
    }),
  );
  return server;
}
