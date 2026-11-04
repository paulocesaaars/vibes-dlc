// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GuideDecision, Moment, Turn } from '@/core/types';
import { momentContent } from '@/guide/moment-content';
import type { ArtifactContent } from '@/aidlc/artifacts';
import type { ArtifactList, ArtifactView } from '@/web/artifact-service';
import { GuideApp } from '@/web/components/guide-app';
import type { GuideView } from '@/web/guide-service';
import { FakeEventSource, guideView } from '../u1/web-fakes';

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 100;
    rows = 30;
    options: Record<string, unknown> = {};
    loadAddon() {}
    open() {}
    attachCustomKeyEventHandler() {}
    onData() {}
    write() {}
    reset() {}
    focus() {}
    dispose() {}
  },
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit() {}
  },
}));

const CONTEXT = {
  stageName: 'Projeto funcional',
  stageNumber: '3.1',
  stageDescription: 'x',
  health: 'ok' as const,
  failedPath: null,
};

type ViewOptions = {
  turn?: Turn;
  decision?: Partial<GuideDecision>;
  artifacts?: { total: number; reviewed: number };
  extra?: Partial<GuideView>;
};

function viewOf(moment: Moment, options: ViewOptions = {}): GuideView {
  const base = guideView(moment, options.turn ?? 'person');
  const decision = { ...base.decision, ...options.decision };
  const artifacts = options.artifacts ?? { total: 0, reviewed: 0 };
  return {
    ...base,
    decision,
    artifacts,
    content: momentContent(decision, {
      ...CONTEXT,
      artifactsTotal: artifacts.total,
      artifactsReviewed: artifacts.reviewed,
      nextStageName: base.nextStage?.name ?? null,
    }),
    ...options.extra,
  };
}

function item(name: string, reviewStatus: ArtifactView['reviewStatus'] = 'pending'): ArtifactView {
  const path = `construction/functional-design/${name}`;
  return { path, name, contentHash: 'a'.repeat(64), reviewStatus };
}

function content(name: string, text: string | null = 'conteúdo'): ArtifactContent {
  return {
    path: `construction/functional-design/${name}`,
    contentHash: 'a'.repeat(64),
    size: 10,
    content: text,
    omittedReason: null,
  };
}

function listOf(items: ArtifactView[], selected: ArtifactContent | null): ArtifactList {
  return {
    stageSlug: 'functional-design',
    total: items.length,
    reviewed: items.filter((entry) => entry.reviewStatus === 'reviewed').length,
    items,
    selected,
  };
}

type Server = {
  view: GuideView;
  list: ArtifactList;
  seen: { status: string; current: Record<string, string>; text: string | null };
  reviewResponse: { status: number; body: unknown };
  conclusionResponse: { status: number; body: unknown };
  requests: { url: string; method: string; body: Record<string, unknown> | null }[];
  bodiesOf: (fragment: string) => Record<string, unknown>[];
  urlsOf: (fragment: string) => string[];
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function installServer(view: GuideView, list: ArtifactList = listOf([], null)): Server {
  const server: Server = {
    view,
    list,
    seen: { status: 'same', current: {}, text: null },
    reviewResponse: { status: 200, body: { path: 'x', contentHash: 'y' } },
    conclusionResponse: { status: 200, body: view },
    requests: [],
    bodiesOf: (fragment) =>
      server.requests
        .filter((request) => request.url.includes(fragment) && request.body)
        .map((request) => request.body as Record<string, unknown>),
    urlsOf: (fragment) => server.requests.filter((r) => r.url.includes(fragment)).map((r) => r.url),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      server.requests.push({ url: input, method, body });
      if (input === '/api/terminal/session') return json({ sessionId: 's1', status: 'alive' });
      if (input === '/api/demands') {
        return json({
          repo: { health: 'ok', failedPath: null },
          activeIntentId: 'intent-a',
          demands: [],
        });
      }
      if (input.includes('/guide')) return json(server.view);
      if (input.includes('/conclusion')) {
        return json(server.conclusionResponse.body, server.conclusionResponse.status);
      }
      if (input.includes('/artifacts/review')) {
        return json(server.reviewResponse.body, server.reviewResponse.status);
      }
      if (input.includes('/artifacts')) return json(server.list);
      if (input.includes('/seen')) return json(method === 'GET' ? server.seen : { saved: true });
      if (input === '/api/commands') return json({ status: 'written' });
      return new Response(null, { status: 204 });
    }),
  );
  return server;
}

async function renderGuide() {
  render(<GuideApp />);
  await screen.findByTestId('guide-stage-name');
}

beforeEach(() => {
  FakeEventSource.instances = [];
  sessionStorage.clear();
  vi.stubGlobal('EventSource', FakeEventSource);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function reviewView(reviewed = 0, total = 2): GuideView {
  return viewOf('review', { artifacts: { total, reviewed } });
}

describe('Revisar', () => {
  it('mostra um artefato por vez, com o caminho, o que conferir e a contagem', async () => {
    installServer(reviewView(), listOf([item('a.md'), item('b.md')], content('a.md', 'texto a')));
    await renderGuide();
    await screen.findByTestId('artifact-content');
    expect(screen.getByTestId('artifact-content').textContent).toBe('texto a');
    expect(screen.getByTestId('artifact-path').textContent).toContain(
      'construction/functional-design/a.md',
    );
    expect(screen.getByTestId('artifact-checklist').textContent).toContain('O que conferir');
    expect(screen.getByText(/0 de 2 revisados/)).toBeTruthy();
    expect(screen.getByTestId('guide-band-text').textContent).toContain('Falta revisar 2');
  });

  it('um artefato com script aparece como texto, sem criar elementos nem recursos', async () => {
    const hostile =
      '<script>window.__invadiu = true</script><img src="http://externo.example/x.png">';
    installServer(reviewView(0, 1), listOf([item('a.md')], content('a.md', hostile)));
    await renderGuide();
    const shown = await screen.findByTestId('artifact-content');
    expect(shown.tagName).toBe('PRE');
    expect(shown.textContent).toBe(hostile);
    expect(shown.querySelector('script, img')).toBeNull();
    expect((window as unknown as { __invadiu?: boolean }).__invadiu).toBeUndefined();
  });

  it('marcar envia o caminho e o hash mostrados, e a decisão é relida', async () => {
    const server = installServer(reviewView(0, 1), listOf([item('a.md')], content('a.md')));
    await renderGuide();
    await screen.findByTestId('artifact-content');
    const guideCalls = server.urlsOf('/guide').length;
    await userEvent.click(screen.getByTestId('guide-mark-reviewed-button'));
    await waitFor(() =>
      expect(server.bodiesOf('/artifacts/review')).toEqual([
        { path: 'construction/functional-design/a.md', contentHash: 'a'.repeat(64) },
      ]),
    );
    await waitFor(() => expect(server.urlsOf('/guide').length).toBeGreaterThan(guideCalls));
  });

  it('conteúdo que mudou mostra o aviso e o novo conteúdo, sem marcar', async () => {
    const server = installServer(
      reviewView(0, 1),
      listOf([item('a.md')], content('a.md', 'velho')),
    );
    server.reviewResponse = {
      status: 409,
      body: {
        code: 'artifact_changed',
        message: 'O conteúdo mudou enquanto você lia. Confira a nova versão.',
        artifact: content('a.md', 'novo'),
      },
    };
    await renderGuide();
    await screen.findByTestId('artifact-content');
    await userEvent.click(screen.getByTestId('guide-mark-reviewed-button'));
    await waitFor(() =>
      expect(screen.getByTestId('artifact-notice').textContent).toContain('mudou enquanto'),
    );
    expect(screen.getByTestId('artifact-content').textContent).toBe('novo');
  });

  it('falha ao gravar fica na própria linha, e o artefato continua na tela', async () => {
    const server = installServer(
      reviewView(0, 1),
      listOf([item('a.md')], content('a.md', 'igual')),
    );
    server.reviewResponse = {
      status: 500,
      body: { code: 'review_failed', message: 'Não consegui guardar a marca. Tente de novo.' },
    };
    await renderGuide();
    await screen.findByTestId('artifact-content');
    await userEvent.click(screen.getByTestId('guide-mark-reviewed-button'));
    await waitFor(() =>
      expect(screen.getByTestId('artifact-notice').textContent).toContain('guardar a marca'),
    );
    expect(screen.getByTestId('artifact-content').textContent).toBe('igual');
  });

  it('um artefato revisado que mudou avisa, com texto além da cor', async () => {
    installServer(reviewView(0, 1), listOf([item('a.md', 'changed')], content('a.md')));
    await renderGuide();
    await screen.findByTestId('artifact-changed-notice');
    const pill = screen.getByTestId('artifact-pill');
    expect(pill.textContent).toContain('mudou');
  });

  it('o estado revisado tem ícone e texto, sem depender só da cor', async () => {
    installServer(
      reviewView(1, 2),
      listOf([item('a.md', 'reviewed'), item('b.md')], content('b.md')),
    );
    await renderGuide();
    await screen.findByTestId('artifact-content');
    const [reviewed] = screen.getAllByTestId('artifact-pill');
    expect(reviewed?.querySelector('svg')).not.toBeNull();
    expect(reviewed?.textContent).toContain('(revisado)');
  });

  it('arquivo grande mostra o caminho e o motivo, sem conteúdo', async () => {
    const large: ArtifactContent = {
      ...content('a.md'),
      content: null,
      omittedReason: 'too_large',
    };
    installServer(reviewView(0, 1), listOf([item('a.md')], large));
    await renderGuide();
    const omitted = await screen.findByTestId('artifact-omitted');
    expect(omitted.textContent).toContain('2 MB');
    expect(screen.queryByTestId('artifact-content')).toBeNull();
  });

  it('escolher outro artefato pede o caminho dele', async () => {
    const server = installServer(
      reviewView(),
      listOf([item('a.md'), item('b.md')], content('a.md')),
    );
    await renderGuide();
    await screen.findByTestId('artifact-content');
    const [, second] = screen.getAllByTestId('artifact-pill');
    await userEvent.click(second as HTMLElement);
    await waitFor(() =>
      expect(server.urlsOf('/artifacts').some((url) => url.includes('b.md'))).toBe(true),
    );
  });
});

describe('sem botão de aprovar (BR5.1)', () => {
  const moments: [Moment, ViewOptions][] = [
    ['review', { artifacts: { total: 2, reviewed: 1 } }],
    ['approve', { artifacts: { total: 2, reviewed: 2 } }],
    ['question', {}],
    ['revising', { turn: 'ai' }],
    ['conclusion', { turn: 'guide' }],
    ['trail_done', { turn: 'guide' }],
  ];

  it.each(moments)('%s não tem botão que aprove', async (moment, options) => {
    installServer(viewOf(moment, options));
    await renderGuide();
    const buttons = within(screen.getByTestId('guide-band')).queryAllByRole('button');
    for (const button of buttons) {
      expect(button.textContent).not.toMatch(/aprov|approve/i);
    }
  });

  it('Aprovar pede a resposta no terminal, com as opções no original', async () => {
    installServer(viewOf('approve', { artifacts: { total: 1, reviewed: 1 } }));
    await renderGuide();
    expect(screen.getByTestId('guide-point').textContent).toContain('Approve');
    expect(screen.getByTestId('guide-point').textContent).toContain('Request Changes');
    expect(within(screen.getByTestId('guide-band')).queryAllByRole('button')).toEqual([]);
    expect(screen.getByTestId('terminal-hint').textContent).toContain('Approve');
  });
});

describe('pergunta', () => {
  it('mostra a contagem como momento, sem nenhum texto da pergunta', async () => {
    installServer(viewOf('question'));
    await renderGuide();
    expect(screen.getByTestId('guide-instruction').textContent).toBe('A sua IA tem uma pergunta');
    expect(screen.getByTestId('terminal-hint').textContent).toContain('Responda');
    expect(screen.queryByTestId('guide-send-button')).toBeNull();
  });

  it('reabre o terminal recolhido, e recolher depois continua valendo', async () => {
    const server = installServer(viewOf('following', { turn: 'ai' }));
    await renderGuide();
    await userEvent.click(screen.getByTestId('terminal-collapse-button'));
    await screen.findByTestId('terminal-expand-button');
    server.view = viewOf('question');
    await act(async () => {
      FakeEventSource.last('/api/events').emit('changed');
    });
    await screen.findByTestId('terminal-collapse-button');
    await userEvent.click(screen.getByTestId('terminal-collapse-button'));
    expect(screen.getByTestId('terminal-expand-button')).toBeTruthy();
  });
});

function idleView(extra: Partial<GuideDecision> = {}): GuideView {
  return viewOf('following', {
    turn: 'ai',
    decision: { showIdleNotice: true, canSend: true, sendBlockedReason: null, ...extra },
    extra: { minutesSinceLastChange: 12 },
  });
}

describe('Outra CLI no passo Enviar (BR6.2)', () => {
  const otherCli = { canSend: false, sendBlockedReason: 'other_cli' } as const;

  it('mostra o comando como referência, sem botão de envio e sem colar', async () => {
    const server = installServer(viewOf('send', { decision: otherCli }));
    await renderGuide();
    const command = screen.getByTestId('guide-command-input') as HTMLTextAreaElement;
    expect(command.value).toBe('/aidlc');
    expect(command.readOnly).toBe(true);
    expect(screen.queryByTestId('guide-send-button')).toBeNull();
    expect(screen.queryByTestId('guide-paste-button')).toBeNull();
    expect(screen.getByTestId('guide-send-reminder').textContent).toContain('Digite o equivalente');
    expect(server.bodiesOf('/api/commands')).toEqual([]);
  });

  it('não promete o envio no texto do passo', async () => {
    installServer(viewOf('send', { decision: otherCli }));
    await renderGuide();
    expect(screen.queryByText(/quando você confirmar/)).toBeNull();
    expect(screen.getByText(/Este comando é uma referência/)).toBeTruthy();
  });

  it('com Claude Code, o mesmo passo mantém o envio e a edição', async () => {
    installServer(viewOf('send'));
    await renderGuide();
    expect(screen.getByTestId('guide-send-button')).toBeTruthy();
    expect(screen.getByTestId('guide-paste-button')).toBeTruthy();
    expect((screen.getByTestId('guide-command-input') as HTMLTextAreaElement).readOnly).toBe(false);
  });
});

describe('IA parada', () => {
  it('mostra os minutos e o texto de que pode ter parado, sem afirmar', async () => {
    installServer(idleView());
    await renderGuide();
    const text = screen.getByTestId('guide-idle-text').textContent ?? '';
    expect(text).toContain('12 minutos');
    expect(text).toContain('pode ter parado');
  });

  it('Retomar abre o cartão com /aidlc, e nada vai ao terminal sem confirmar', async () => {
    const server = installServer(idleView());
    await renderGuide();
    await userEvent.click(screen.getByTestId('guide-resume-button'));
    expect((screen.getByTestId('guide-command-input') as HTMLTextAreaElement).value).toBe('/aidlc');
    expect(server.bodiesOf('/api/commands')).toEqual([]);
    expect(server.bodiesOf('/api/terminal/input')).toEqual([]);
    await userEvent.click(screen.getByTestId('guide-send-button'));
    await waitFor(() => expect(server.bodiesOf('/api/commands')).toHaveLength(1));
    expect(server.bodiesOf('/api/commands')[0]).toMatchObject({
      text: '/aidlc',
      stageSlug: 'functional-design',
      mode: 'execute',
    });
  });

  it('com outra CLI, fica só a orientação', async () => {
    installServer(idleView({ canSend: false, sendBlockedReason: 'other_cli' }));
    await renderGuide();
    expect(screen.getByTestId('guide-idle-text').textContent).toContain('outra CLI');
    expect(screen.queryByTestId('guide-resume-button')).toBeNull();
  });

  it('a faixa não reabre o terminal recolhido e some quando um arquivo muda', async () => {
    const server = installServer(viewOf('following', { turn: 'ai' }));
    await renderGuide();
    await userEvent.click(screen.getByTestId('terminal-collapse-button'));
    server.view = idleView();
    await act(async () => {
      FakeEventSource.last('/api/events').emit('changed');
    });
    await screen.findByTestId('guide-idle-notice');
    expect(screen.getByTestId('terminal-expand-button')).toBeTruthy();
    server.view = viewOf('following', { turn: 'ai' });
    await act(async () => {
      FakeEventSource.last('/api/events').emit('changed');
    });
    await waitFor(() => expect(screen.queryByTestId('guide-idle-notice')).toBeNull());
  });

  it('pede a decisão a cada 30 segundos em Acompanhar', async () => {
    // Só o relógio da faixa: as esperas da biblioteca de testes continuam reais.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const server = installServer(viewOf('following', { turn: 'ai' }));
    await renderGuide();
    const before = server.urlsOf('/guide').length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    await waitFor(() => expect(server.urlsOf('/guide').length).toBeGreaterThan(before));
  });
});

describe('conclusão', () => {
  const conclusion = (
    isWarning: boolean,
    note = 'Você revisou 1 de 3 artefatos antes de aprovar.',
  ) =>
    viewOf('conclusion', {
      turn: 'guide',
      extra: {
        conclusion: { review: 'Projeto funcional aprovada', note, isWarning },
        progress: { done: 4, total: 10 },
        previousStage: { slug: 'delivery-planning', name: 'Planejamento de entrega' },
      },
    });

  it('mostra o progresso, os artefatos e o aviso quando faltou revisar', async () => {
    installServer(conclusion(true));
    await renderGuide();
    expect(screen.getByTestId('guide-instruction').textContent).toBe('Etapa concluída!');
    expect(screen.getByTestId('guide-progress').textContent).toContain('4 de 10');
    const note = screen.getByTestId('guide-conclusion-note');
    expect(note.textContent).toContain('1 de 3');
    expect(note.getAttribute('data-warning')).toBe('true');
  });

  it('Ir para a próxima etapa grava o reconhecimento e passa a Entender, sem enviar nada', async () => {
    const server = installServer(conclusion(false, 'Tudo revisado.'));
    await renderGuide();
    server.conclusionResponse = { status: 200, body: viewOf('understand') };
    await userEvent.click(screen.getByTestId('guide-next-stage-button'));
    await waitFor(() =>
      expect(server.bodiesOf('/conclusion')).toEqual([{ stageSlug: 'delivery-planning' }]),
    );
    await screen.findByTestId('guide-understood-button');
    expect(server.bodiesOf('/api/commands')).toEqual([]);
  });

  it('com a tela desatualizada, relê os arquivos e mostra o que eles dizem', async () => {
    const server = installServer(conclusion(false, 'Tudo revisado.'));
    await renderGuide();
    server.conclusionResponse = { status: 409, body: { code: 'stale_screen', message: 'x' } };
    server.view = viewOf('following', { turn: 'ai' });
    await userEvent.click(screen.getByTestId('guide-next-stage-button'));
    await waitFor(() =>
      expect(screen.getByTestId('guide-instruction').textContent).toBe('Pode acompanhar daqui'),
    );
  });

  it('na trilha concluída, os comandos enviados aparecem como texto', async () => {
    installServer(
      viewOf('trail_done', {
        turn: 'guide',
        extra: {
          conclusion: { review: 'X aprovada', note: 'ok', isWarning: false },
          sentCommands: [
            {
              commandId: 'c1',
              stageName: 'Projeto funcional',
              text: '<b>/aidlc</b>',
              mode: 'execute',
              sentAt: '2026-11-03T12:00:00.000Z',
            },
          ],
        },
      }),
    );
    await renderGuide();
    const history = screen.getByTestId('guide-sent-commands');
    expect(history.textContent).toContain('<b>/aidlc</b>');
    expect(history.querySelector('b')).toBeNull();
    expect(screen.queryByTestId('guide-next-stage-button')).toBeNull();
  });
});

describe('reabrir o painel (BR7.1)', () => {
  const current = { stageSlug: 'functional-design', unit: '', mark: 'in_progress' };

  it('avisa o que mudou, e Entendi grava o estado atual', async () => {
    const server = installServer(viewOf('following', { turn: 'ai' }));
    server.seen = { status: 'changed', current, text: 'Antes: A. Agora: B.' };
    await renderGuide();
    const notice = await screen.findByTestId('guide-changed-notice');
    expect(notice.textContent).toContain('Antes: A. Agora: B.');
    expect(screen.getByTestId('guide-instruction')).toBeTruthy();
    expect(server.bodiesOf('/seen')).toEqual([]);
    await userEvent.click(screen.getByTestId('guide-changed-dismiss-button'));
    await waitFor(() => expect(server.bodiesOf('/seen')).toEqual([current]));
    expect(screen.queryByTestId('guide-changed-notice')).toBeNull();
  });

  it('na primeira visita, grava sem aviso', async () => {
    const server = installServer(viewOf('understand'));
    server.seen = { status: 'first_visit', current, text: null };
    await renderGuide();
    await waitFor(() => expect(server.bodiesOf('/seen')).toEqual([current]));
    expect(screen.queryByTestId('guide-changed-notice')).toBeNull();
  });

  it('com o painel aberto, o que aparece na tela passa a ser o último visto', async () => {
    const server = installServer(viewOf('following', { turn: 'ai' }));
    await renderGuide();
    await waitFor(() => expect(server.urlsOf('/seen').length).toBeGreaterThan(0));
    const next = viewOf('following', { turn: 'ai' });
    server.view = { ...next, stage: { ...next.stage, mark: 'revising' } };
    await act(async () => {
      FakeEventSource.last('/api/events').emit('changed');
    });
    await waitFor(() =>
      expect(server.bodiesOf('/seen')).toEqual([{ ...current, mark: 'revising' }]),
    );
  });
});

describe('trilha', () => {
  it('as fases abrem e fecham com o teclado, com o estado em aria-expanded', async () => {
    installServer(viewOf('understand'));
    await renderGuide();
    const phase = screen.getByTestId('trail-phase-ideation');
    expect(phase.getAttribute('aria-expanded')).toBe('false');
    phase.focus();
    await userEvent.keyboard('{Enter}');
    expect(phase.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('trail-stage-intent-capture')).toBeTruthy();
    await userEvent.keyboard(' ');
    expect(phase.getAttribute('aria-expanded')).toBe('false');
  });

  it('o status tem texto e ícone, sem depender só de cor', async () => {
    installServer(viewOf('understand'));
    await renderGuide();
    const expected: [string, string][] = [
      ['trail-stage-antes', '(concluída)'],
      ['trail-stage-functional-design', '(etapa atual)'],
      ['trail-stage-nfr-design', '(bloqueada)'],
      ['trail-stage-pulada', '(pulada)'],
    ];
    for (const [testId, text] of expected) {
      expect(screen.getByTestId(testId).textContent).toContain(text);
    }
    expect(screen.getByTestId('trail-stage-antes').querySelector('svg')).not.toBeNull();
    expect(screen.getByTestId('trail-stage-nfr-design').querySelector('svg')).not.toBeNull();
  });

  it('uma etapa anterior mostra "anterior", sem cadeado, sem afirmar conclusão e sem abrir', async () => {
    const base = viewOf('following', { turn: 'ai' });
    const trail = base.trail.map((phase) => ({
      ...phase,
      stages: phase.stages.map((stage) =>
        stage.slug === 'nfr-design' ? { ...stage, status: 'previous' as const } : stage,
      ),
    }));
    const server = installServer({ ...base, trail, position: { source: 'audit' } });
    await renderGuide();
    const previous = screen.getByTestId('trail-stage-nfr-design') as HTMLButtonElement;
    expect(previous.textContent).toContain('anterior');
    expect(previous.textContent).not.toMatch(/conclu|bloquead/);
    expect(previous.querySelector('svg')).toBeNull();
    expect(previous.disabled).toBe(true);
    await userEvent.click(previous);
    expect(screen.queryByTestId('guide-consult')).toBeNull();
    expect(server.bodiesOf('/api/commands')).toEqual([]);
  });

  it('uma etapa bloqueada não abre nem oferece comando', async () => {
    const server = installServer(viewOf('understand'));
    await renderGuide();
    const blocked = screen.getByTestId('trail-stage-nfr-design') as HTMLButtonElement;
    expect(blocked.disabled).toBe(true);
    await userEvent.click(blocked);
    expect(screen.queryByTestId('guide-consult')).toBeNull();
    expect(server.bodiesOf('/api/commands')).toEqual([]);
  });

  it('uma etapa concluída abre com o teclado e mostra os artefatos, sem mudar o momento', async () => {
    const server = installServer(viewOf('understand'), listOf([item('a.md')], content('a.md')));
    await renderGuide();
    const done = screen.getByTestId('trail-stage-antes');
    done.focus();
    await userEvent.keyboard('{Enter}');
    await screen.findByTestId('guide-consult');
    await screen.findByTestId('artifact-content');
    expect(server.urlsOf('/artifacts').some((url) => url.includes('consult=1'))).toBe(true);
    expect(screen.queryByTestId('guide-send-button')).toBeNull();
    expect(screen.queryByTestId('guide-understood-button')).toBeNull();
    await userEvent.click(screen.getByTestId('guide-back-button'));
    expect(screen.getByTestId('guide-understood-button')).toBeTruthy();
  });

  it('dentro de uma Unidade, mostra "Unidade · etapa" no topo e na trilha', async () => {
    const base = viewOf('following', { turn: 'ai' });
    const trail = base.trail.map((phase) => ({
      ...phase,
      stages: phase.stages.map((stage) =>
        stage.status === 'current' ? { ...stage, unit: 'u2-guide-flow' } : stage,
      ),
    }));
    installServer({
      ...base,
      trail,
      position: { source: 'audit' },
      stage: { ...base.stage, unit: 'u2-guide-flow' },
    });
    await renderGuide();
    expect(screen.getByTestId('guide-stage-name').textContent).toBe(
      'u2-guide-flow · Projeto funcional',
    );
    expect(screen.getByTestId('trail-unit').textContent).toBe('u2-guide-flow');
  });
});

describe('Acompanhar', () => {
  it('um artefato novo aparece sem recarregar, e a lista não é clicável', async () => {
    const server = installServer(viewOf('following', { turn: 'ai' }));
    await renderGuide();
    expect(screen.queryByTestId('artifact-list')).toBeNull();
    server.list = listOf([item('novo.md')], content('novo.md'));
    server.view = {
      ...viewOf('following', { turn: 'ai' }),
      lastChangedAt: '2026-11-03T12:30:00.000Z',
    };
    await act(async () => {
      FakeEventSource.last('/api/events').emit('changed');
    });
    const list = await screen.findByTestId('artifact-list');
    expect(list.textContent).toContain('novo.md');
    expect((screen.getByTestId('artifact-pill') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId('artifact-content')).toBeNull();
  });
});
