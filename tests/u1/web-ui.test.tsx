// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExposureAlert } from '@/web/components/exposure-alert';
import { GuideApp } from '@/web/components/guide-app';
import { FakeEventSource, guideView, installFakeServer } from './web-fakes';

const terminalMock = vi.hoisted(() => ({
  written: [] as string[],
  focused: 0,
  dataHandler: null as ((data: string) => void) | null,
  keyHandler: null as ((event: KeyboardEvent) => boolean) | null,
  resets: 0,
}));

vi.mock('@xterm/xterm', () => ({
  Terminal: class {
    cols = 100;
    rows = 30;
    options: Record<string, unknown> = {};
    loadAddon() {}
    open(element: HTMLElement) {
      const textarea = document.createElement('textarea');
      textarea.setAttribute('data-testid', 'xterm-textarea');
      element.appendChild(textarea);
    }
    attachCustomKeyEventHandler(handler: (event: KeyboardEvent) => boolean) {
      terminalMock.keyHandler = handler;
    }
    onData(handler: (data: string) => void) {
      terminalMock.dataHandler = handler;
    }
    write(data: string) {
      terminalMock.written.push(data);
    }
    reset() {
      terminalMock.resets += 1;
    }
    focus() {
      terminalMock.focused += 1;
      (document.querySelector('[data-testid="xterm-textarea"]') as HTMLElement | null)?.focus();
    }
    dispose() {}
  },
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit() {}
  },
}));

beforeEach(() => {
  FakeEventSource.instances = [];
  terminalMock.written = [];
  terminalMock.focused = 0;
  terminalMock.resets = 0;
  terminalMock.dataHandler = null;
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
  vi.unstubAllGlobals();
});

async function renderGuide() {
  render(<GuideApp />);
  await waitFor(() => expect(screen.queryByText('Abrindo o guia…')).toBeNull());
}

describe('momentos', () => {
  it('Entender mostra a etapa, a vez, o passo, o que ela faz e uma ação', async () => {
    const server = installFakeServer(guideView('understand'));
    await renderGuide();
    expect(screen.getByTestId('guide-stage-name').textContent).toBe('Projeto funcional');
    expect(screen.getByTestId('guide-turn').textContent).toBe('Sua vez');
    expect(screen.getByTestId('guide-step-label').textContent).toBe('Passo 1 de 5: Entender');
    expect(screen.getByTestId('guide-text').textContent).toContain('entidades e regras');
    expect(screen.getByTestId('guide-understand-card').textContent).toContain(
      'agente de arquitetura',
    );
    expect(screen.queryByTestId('guide-send-button')).toBeNull();

    server.view = guideView('send');
    await userEvent.click(screen.getByTestId('guide-understood-button'));
    await waitFor(() => screen.getByTestId('guide-send-card'));
    expect(server.bodiesOf('/understood')).toEqual([{ stageSlug: 'functional-design' }]);
    expect(document.activeElement).toBe(screen.getByTestId('guide-instruction'));
  });

  it('uma etapa desatualizada em Entendi pede a decisão de novo', async () => {
    const server = installFakeServer(guideView('understand'));
    await renderGuide();
    server.understoodStatus = 409;
    const before = server.requests.filter((r) => r.url.endsWith('/guide')).length;
    await userEvent.click(screen.getByTestId('guide-understood-button'));
    await waitFor(() =>
      expect(server.requests.filter((r) => r.url.endsWith('/guide')).length).toBeGreaterThan(
        before,
      ),
    );
  });

  it('Enviar traz o nome da etapa, o lembrete e duas formas de confirmar', async () => {
    installFakeServer(guideView('send'));
    await renderGuide();
    expect((screen.getByTestId('guide-command-input') as HTMLTextAreaElement).value).toBe('/aidlc');
    expect(screen.getByTestId('guide-send-stage').textContent).toBe('Projeto funcional');
    expect(screen.getByTestId('guide-send-reminder').textContent).toContain(
      'A sua IA precisa estar aberta',
    );
    expect(screen.getByTestId('guide-send-button').textContent).toBe('Enviar agora');
    expect(screen.getByTestId('guide-paste-button').textContent).toBe('Colar sem executar');
  });

  it('colado pede Enter, sem botão de enviar', async () => {
    installFakeServer(guideView('pasted'));
    await renderGuide();
    expect(screen.getByTestId('guide-instruction').textContent).toBe('Pressione Enter no terminal');
    expect(screen.getByTestId('guide-band-text').textContent).toContain('Aguardando o seu Enter');
    expect(screen.queryByTestId('guide-send-button')).toBeNull();
  });

  it('Acompanhar mostra de quem é a vez em texto, sem depender de cor', async () => {
    installFakeServer(guideView('following', 'ai'));
    await renderGuide();
    expect(screen.getByTestId('guide-turn').textContent).toBe('Vez da sua IA');
    expect(screen.getByTestId('guide-text').textContent).toBe(
      'Se a sua IA perguntar algo, responda no terminal.',
    );
    expect(screen.getByTestId('guide-step-label').textContent).toContain('Acompanhar');
  });

  it('sessão encerrada oferece Nova sessão, que abre com pedido explícito', async () => {
    const server = installFakeServer(guideView('session_dead'));
    await renderGuide();
    expect(screen.getByTestId('guide-instruction').textContent).toContain('nova sessão');
    expect(screen.queryByTestId('guide-send-button')).toBeNull();
    expect(screen.queryByTestId('terminal-end-session-button')).toBeNull();

    server.view = guideView('understand');
    await userEvent.click(screen.getByTestId('guide-new-session-button'));
    await waitFor(() =>
      expect(server.bodiesOf('/api/terminal/session')).toContainEqual({ newSession: true }),
    );
  });

  it('a barra do terminal também oferece Nova sessão', async () => {
    const server = installFakeServer(guideView('session_dead'));
    await renderGuide();
    await userEvent.click(screen.getByTestId('terminal-new-session-button'));
    expect(server.bodiesOf('/api/terminal/session')).toContainEqual({ newSession: true });
  });

  it('falha mostra o caminho e Tentar de novo', async () => {
    const failure = guideView('failure', 'person', {
      repo: { health: 'missing_shell', failedPath: 'C:\\Git\\bin\\bash.exe' },
    });
    failure.content.text = 'O Git Bash não foi encontrado. Procurei em: C:\\Git\\bin\\bash.exe.';
    const server = installFakeServer(failure);
    server.sessionStatus = 503;
    await renderGuide();
    expect(screen.getByTestId('guide-text').textContent).toContain('C:\\Git\\bin\\bash.exe');
    await userEvent.click(screen.getByTestId('guide-retry-button'));
    expect(server.bodiesOf('/api/terminal/session')).toContainEqual({ newSession: true });
  });

  it('sem intent ativo, abre o Início e oferece Nova demanda', async () => {
    installFakeServer(null);
    await renderGuide();
    expect(screen.getByTestId('demand-home').textContent).toContain('Nenhuma demanda');
    expect(screen.getByTestId('new-demand')).toBeTruthy();
    expect(screen.queryByTestId('guide-trail')).toBeNull();
  });

  it('sem aidlc/, mostra a falha com o caminho, e tentar de novo relê', async () => {
    const server = installFakeServer(null);
    server.repo = { health: 'missing_aidlc', failedPath: 'C:\\repo\\aidlc' };
    await renderGuide();
    expect(screen.getByTestId('guide-text').textContent).toContain('C:\\repo\\aidlc');
    server.repo = { health: 'ok', failedPath: null };
    await userEvent.click(screen.getByTestId('guide-retry-button'));
    await waitFor(() =>
      expect(screen.getByTestId('demand-home').textContent).toContain('Nenhuma demanda'),
    );
  });

  it('mostra a mensagem quando o painel não responde', async () => {
    const server = installFakeServer(null);
    server.sessionStatus = 599;
    render(<GuideApp />);
    await waitFor(() => expect(screen.getByTestId('guide-load-error').textContent).toBeTruthy());
  });

  it('não tem botão de aprovar em nenhum momento', async () => {
    for (const moment of [
      'understand',
      'send',
      'pasted',
      'following',
      'failure',
      'session_dead',
    ] as const) {
      installFakeServer(guideView(moment));
      await renderGuide();
      const labels = screen.getAllByRole('button').map((button) => button.textContent ?? '');
      expect(labels.join(' ')).not.toMatch(/aprov/i);
      cleanup();
    }
  });
});

describe('trilha', () => {
  it('mostra as fases com contagens dos arquivos e a etapa atual em texto', async () => {
    installFakeServer(guideView('understand'));
    await renderGuide();
    const trail = screen.getByTestId('guide-trail');
    expect(trail.textContent).toContain('Ideação');
    expect(trail.textContent).toContain('1/3');
    expect(trail.textContent).toContain('Você está aqui');
    expect(trail.textContent).toContain('(pulada)');
    expect(trail.querySelector('[aria-current="step"]')?.textContent).toContain(
      'Projeto funcional',
    );
    expect(trail.textContent).not.toContain('Captura da intenção');
  });
});

describe('conteúdo não confiável', () => {
  it('mostra etiqueta de script como texto, sem executar nem criar elementos', async () => {
    const hostile = '<script>window.__invadiu = true</script><img src=x onerror=alert(1)>';
    const view = guideView('understand');
    view.content.title = hostile;
    view.content.text = hostile;
    view.stage.name = hostile;
    view.stageContent.howItWorks = [hostile];
    installFakeServer(view);
    await renderGuide();

    expect(screen.getByTestId('guide-instruction').textContent).toBe(hostile);
    expect(screen.getByTestId('guide-text').textContent).toBe(hostile);
    expect(screen.getByTestId('guide-stage-name').textContent).toBe(hostile);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect((window as unknown as { __invadiu?: boolean }).__invadiu).toBeUndefined();
  });
});

describe('envio', () => {
  it('nada é enviado até a confirmação', async () => {
    const server = installFakeServer(guideView('send'));
    await renderGuide();
    await userEvent.type(screen.getByTestId('guide-command-input'), ' --editado');
    expect(server.bodiesOf('/api/commands')).toEqual([]);
    expect(server.bodiesOf('/api/terminal/input')).toEqual([]);
  });

  it('Enviar agora manda o texto editado, com um commandId novo', async () => {
    const server = installFakeServer(guideView('send'));
    await renderGuide();
    const input = screen.getByTestId('guide-command-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'echo editado');
    await userEvent.click(screen.getByTestId('guide-send-button'));

    await waitFor(() => expect(server.bodiesOf('/api/commands')).toHaveLength(1));
    const [body] = server.bodiesOf('/api/commands');
    expect(body).toMatchObject({
      text: 'echo editado',
      mode: 'execute',
      intentId: 'intent-a',
      stageSlug: 'functional-design',
    });
    expect(String(body?.commandId)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('Colar sem executar usa o modo paste', async () => {
    const server = installFakeServer(guideView('send'));
    await renderGuide();
    await userEvent.click(screen.getByTestId('guide-paste-button'));
    await waitFor(() => expect(server.bodiesOf('/api/commands')).toHaveLength(1));
    expect(server.bodiesOf('/api/commands')[0]?.mode).toBe('paste');
  });

  it('um duplo clique envia uma vez só', async () => {
    const server = installFakeServer(guideView('send'));
    await renderGuide();
    const button = screen.getByTestId('guide-send-button');
    // Os dois cliques chegam antes de o React atualizar a tela.
    act(() => {
      button.click();
      button.click();
    });
    await waitFor(() => expect(server.bodiesOf('/api/commands').length).toBeGreaterThan(0));
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    expect(server.bodiesOf('/api/commands')).toHaveLength(1);
  });

  it('colar um texto com quebra de linha mostra o motivo e desativa o envio', async () => {
    const server = installFakeServer(guideView('send'));
    await renderGuide();
    const input = screen.getByTestId('guide-command-input');
    await userEvent.click(input);
    await userEvent.paste('echo a\necho b');
    expect(screen.getByTestId('guide-command-issue').textContent).toContain('uma linha só');
    expect((screen.getByTestId('guide-send-button') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('guide-paste-button') as HTMLButtonElement).disabled).toBe(true);
    expect(server.bodiesOf('/api/commands')).toEqual([]);
  });

  it('Enter no campo não insere quebra de linha nem envia', async () => {
    const server = installFakeServer(guideView('send'));
    await renderGuide();
    await userEvent.type(screen.getByTestId('guide-command-input'), '{Enter}');
    expect((screen.getByTestId('guide-command-input') as HTMLTextAreaElement).value).toBe('/aidlc');
    expect(server.bodiesOf('/api/commands')).toEqual([]);
  });

  it('campo vazio ou longo demais desativa o envio', async () => {
    installFakeServer(guideView('send'));
    await renderGuide();
    const input = screen.getByTestId('guide-command-input');
    await userEvent.clear(input);
    expect(screen.getByTestId('guide-command-issue').textContent).toContain('Escreva');
    await userEvent.click(input);
    await userEvent.paste('x'.repeat(8001));
    expect(screen.getByTestId('guide-command-issue').textContent).toContain('8000');
  });

  it('restaurar volta ao comando original', async () => {
    installFakeServer(guideView('send'));
    await renderGuide();
    await userEvent.type(screen.getByTestId('guide-command-input'), 'x');
    await userEvent.click(screen.getByTestId('guide-command-reset-button'));
    expect((screen.getByTestId('guide-command-input') as HTMLTextAreaElement).value).toBe('/aidlc');
    expect(screen.queryByTestId('guide-command-reset-button')).toBeNull();
  });

  it('com falha na escrita, mostra o motivo e mantém o texto no campo', async () => {
    const server = installFakeServer(guideView('send'));
    server.sendResponse = {
      status: 500,
      body: { code: 'write_failed', message: 'O comando não chegou ao terminal.' },
    };
    await renderGuide();
    await userEvent.type(screen.getByTestId('guide-command-input'), ' extra');
    await userEvent.click(screen.getByTestId('guide-send-button'));
    await waitFor(() => screen.getByTestId('guide-send-failure'));
    expect(screen.getByTestId('guide-send-failure').textContent).toContain('não chegou');
    expect((screen.getByTestId('guide-command-input') as HTMLTextAreaElement).value).toBe(
      '/aidlc extra',
    );
    expect((screen.getByTestId('guide-send-button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('com a tela desatualizada, pede a decisão de novo', async () => {
    const server = installFakeServer(guideView('send'));
    server.sendResponse = {
      status: 409,
      body: { code: 'stale_screen', message: 'A tela está desatualizada.' },
    };
    await renderGuide();
    const before = server.requests.filter((r) => r.url.endsWith('/guide')).length;
    await userEvent.click(screen.getByTestId('guide-send-button'));
    await waitFor(() =>
      expect(server.requests.filter((r) => r.url.endsWith('/guide')).length).toBeGreaterThan(
        before,
      ),
    );
  });

  it('o envio reabre o terminal recolhido, sem mover o foco para ele', async () => {
    const server = installFakeServer(guideView('send'));
    await renderGuide();
    await waitFor(() => expect(terminalMock.dataHandler).not.toBeNull());
    await userEvent.click(screen.getByTestId('terminal-collapse-button'));
    expect(screen.getByTestId('guide-app').className).toContain('app-closed');

    server.view = guideView('following', 'ai');
    await userEvent.click(screen.getByTestId('guide-send-button'));
    await waitFor(() => expect(screen.queryByTestId('terminal-expand-button')).toBeNull());
    expect(screen.getByTestId('guide-app').className).not.toContain('app-closed');
    expect(document.activeElement).toBe(screen.getByTestId('guide-instruction'));
    expect(terminalMock.focused).toBe(0);
  });
});

describe('terminal', () => {
  async function renderReady(view = guideView('understand')) {
    const server = installFakeServer(view);
    await renderGuide();
    await waitFor(() => expect(terminalMock.dataHandler).not.toBeNull());
    await waitFor(() => FakeEventSource.last('/api/terminal/stream'));
    return server;
  }

  it('pede a sessão antes da decisão, informando o sessionId guardado na aba', async () => {
    sessionStorage.setItem('vibes-dlc.session-id', 'antiga');
    const server = await renderReady();
    expect(server.requests[0]).toMatchObject({
      url: '/api/terminal/session',
      method: 'POST',
      body: { sessionId: 'antiga' },
    });
    expect(sessionStorage.getItem('vibes-dlc.session-id')).toBe('sessao-1');
  });

  it('mostra a saída em blocos e ignora o que já foi aplicado', async () => {
    await renderReady();
    const stream = FakeEventSource.last('/api/terminal/stream');
    act(() => {
      stream.emit('reset');
      stream.emit('output', { data: 'um', seq: 1 });
      stream.emit('output', { data: 'dois', seq: 2 });
      stream.emit('output', { data: 'dois', seq: 2 });
    });
    expect(terminalMock.written).toEqual(['um', 'dois']);
  });

  it('reconecta informando afterSeq quando o stream cai, sem recarregar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await renderReady();
      const stream = FakeEventSource.last('/api/terminal/stream');
      expect(stream.url).not.toContain('afterSeq');
      act(() => stream.emit('output', { data: 'um', seq: 7 }));
      act(() => stream.onerror?.());
      expect(stream.closed).toBe(true);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(600);
      });
      const reconnected = FakeEventSource.last('/api/terminal/stream');
      expect(reconnected).not.toBe(stream);
      expect(reconnected.url).toContain('afterSeq=7');
    } finally {
      vi.useRealTimers();
    }
  });

  it('o aviso de mudança faz pedir a decisão de novo', async () => {
    const server = await renderReady();
    server.view = guideView('following', 'ai');
    act(() => FakeEventSource.last('/api/events').emit('changed', { intentId: 'intent-a' }));
    await waitFor(() => expect(screen.getByTestId('guide-turn').textContent).toBe('Vez da sua IA'));
  });

  it('ao encerrar pelo stream, pede a decisão de novo', async () => {
    const server = await renderReady();
    server.view = guideView('session_dead');
    act(() =>
      FakeEventSource.last('/api/terminal/stream').emit('ended', { reason: 'shell_exited' }),
    );
    await waitFor(() => screen.getByTestId('guide-new-session-button'));
  });

  it('o que a pessoa digita vai por input, e o stream é só saída', async () => {
    const server = await renderReady();
    act(() => terminalMock.dataHandler?.('l'));
    await waitFor(() =>
      expect(server.bodiesOf('/api/terminal/input')).toContainEqual({
        sessionId: 'sessao-1',
        data: 'l',
      }),
    );
  });

  it('encerrar pede confirmação na própria linha, nomeando o efeito', async () => {
    const server = await renderReady();
    await userEvent.click(screen.getByTestId('terminal-end-session-button'));
    expect(screen.getByRole('group', { name: 'Confirmar encerramento' }).textContent).toContain(
      'interrompe o que estiver rodando',
    );
    expect(server.requests.some((r) => r.method === 'DELETE')).toBe(false);

    await userEvent.click(screen.getByTestId('terminal-cancel-end-button'));
    expect(server.requests.some((r) => r.method === 'DELETE')).toBe(false);

    await userEvent.click(screen.getByTestId('terminal-end-session-button'));
    await userEvent.click(screen.getByTestId('terminal-confirm-end-button'));
    await waitFor(() => expect(server.requests.some((r) => r.method === 'DELETE')).toBe(true));
  });

  it('recolher e expandir só mudam a tela, sem tocar na sessão', async () => {
    const server = await renderReady();
    const before = server.requests.filter((r) => r.url === '/api/terminal/session').length;
    await userEvent.click(screen.getByTestId('terminal-collapse-button'));
    expect(screen.getByTestId('terminal-screen').style.display).toBe('none');
    await userEvent.click(screen.getByTestId('terminal-expand-button'));
    expect(screen.getByTestId('terminal-screen').style.display).toBe('');
    expect(server.requests.filter((r) => r.url === '/api/terminal/session')).toHaveLength(before);
  });

  it('mostra o caminho no formato do Git Bash', async () => {
    await renderReady();
    expect(screen.getByTestId('terminal-title').textContent).toBe('MINGW64:/c/Git/vibes-dlc');
  });
});

describe('teclado', () => {
  async function ready() {
    installFakeServer(guideView('understand'));
    await renderGuide();
    await waitFor(() => expect(terminalMock.dataHandler).not.toBeNull());
  }

  it('F6 leva ao terminal e volta ao guia, e não chega à CLI', async () => {
    await ready();
    expect(terminalMock.keyHandler?.(new KeyboardEvent('keydown', { key: 'F6' }))).toBe(false);
    expect(terminalMock.keyHandler?.(new KeyboardEvent('keydown', { key: 'a' }))).toBe(true);

    await userEvent.keyboard('{F6}');
    expect(document.activeElement).toBe(screen.getByTestId('xterm-textarea'));
    await userEvent.keyboard('{F6}');
    expect(document.activeElement).toBe(screen.getByTestId('guide-instruction'));
  });

  it('F6 reabre o terminal recolhido para focar nele', async () => {
    await ready();
    await userEvent.click(screen.getByTestId('terminal-collapse-button'));
    await userEvent.keyboard('{F6}');
    await waitFor(() => expect(screen.queryByTestId('terminal-expand-button')).toBeNull());
  });

  it('impede a ação do navegador em F6 e ignora outras teclas', async () => {
    await ready();
    const f6 = new KeyboardEvent('keydown', { key: 'F6', bubbles: true, cancelable: true });
    window.dispatchEvent(f6);
    expect(f6.defaultPrevented).toBe(true);
    const other = new KeyboardEvent('keydown', { key: 'F5', bubbles: true, cancelable: true });
    window.dispatchEvent(other);
    expect(other.defaultPrevented).toBe(false);
  });

  it('o botão Voltar ao guia leva o foco à instrução', async () => {
    await ready();
    await userEvent.click(screen.getByTestId('terminal-back-to-guide-button'));
    expect(document.activeElement).toBe(screen.getByTestId('guide-instruction'));
  });

  it('todas as ações são elementos nativos, alcançáveis com Tab', async () => {
    await ready();
    const understood = screen.getByTestId('guide-understood-button');
    expect(understood.tagName).toBe('BUTTON');
    const reached: Element[] = [];
    for (let i = 0; i < 12; i += 1) {
      await userEvent.tab();
      if (document.activeElement) reached.push(document.activeElement);
    }
    expect(reached).toContain(understood);
    expect(reached).toContain(screen.getByTestId('terminal-end-session-button'));
    expect(reached).toContain(screen.getByTestId('terminal-back-to-guide-button'));
  });
});

describe('alerta de exposição', () => {
  it('é permanente: mostra o endereço e não tem botão de fechar', () => {
    render(<ExposureAlert host="0.0.0.0" />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('0.0.0.0');
    expect(alert.textContent).toContain('VIBES_HOST');
    expect(alert.querySelector('button')).toBeNull();
  });
});

describe('leitura desatualizada', () => {
  it('tenta de novo sozinha enquanto a leitura falha', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const server = installFakeServer(guideView('understand', 'person', { stale: true }));
      await renderGuide();
      const before = server.requests.filter((r) => r.url.endsWith('/guide')).length;
      server.view = guideView('understand');
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100);
      });
      expect(server.requests.filter((r) => r.url.endsWith('/guide')).length).toBeGreaterThan(
        before,
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
