// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuideApp } from '@/web/components/guide-app';
import { FakeEventSource, installFakeServer, type FakeServer } from '../u1/web-fakes';

const terminalMock = vi.hoisted(() => ({ written: [] as string[] }));

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
    attachCustomKeyEventHandler() {}
    onData() {}
    write(data: string) {
      terminalMock.written.push(data);
    }
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

beforeEach(() => {
  FakeEventSource.instances = [];
  terminalMock.written = [];
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
  const view = render(<GuideApp />);
  await waitFor(() => expect(screen.queryByText('Abrindo o guia…')).toBeNull());
  return view;
}

function failureServer(failedPath = 'aidlc'): FakeServer {
  const server = installFakeServer(null);
  server.repo = { health: 'missing_aidlc', failedPath };
  return server;
}

async function focusRetryWithKeyboard() {
  const user = userEvent.setup();
  for (let step = 0; step < 12; step++) {
    if (document.activeElement === screen.getByTestId('guide-retry-button')) return user;
    await user.tab();
  }
  throw new Error('Tentar de novo não foi alcançado só com o teclado.');
}

describe('telas de falha (U5)', () => {
  it('mostra o caminho como texto: marcação HTML no caminho não vira elemento', async () => {
    const hostile = '<img src=x onerror=alert(1)><script>alert(2)</script>';
    failureServer(hostile);
    const { container } = await renderGuide();
    expect(screen.getByTestId('guide-text').textContent).toContain(hostile);
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('um <script> no nome de uma demanda aparece como texto na lista', async () => {
    const server = installFakeServer(null);
    const original = globalThis.fetch;
    const title = '<script>alert(1)</script>';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input === '/api/demands') {
          return new Response(
            JSON.stringify({
              repo: { health: 'ok', failedPath: null },
              activeIntentId: null,
              demands: [],
              rows: [
                {
                  intentId: 'intent-x',
                  title,
                  scope: 'mvp',
                  stageLabel: null,
                  doneCount: 0,
                  totalCount: 1,
                  turn: 'person',
                  isActive: false,
                  readable: true,
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        return original(input, init);
      }),
    );
    expect(server.requests).toEqual([]);
    const { container } = await renderGuide();
    await waitFor(() => expect(screen.getByTestId('demand-row')).toBeTruthy());
    expect(screen.getByTestId('demand-row').textContent).toContain(title);
    expect(container.querySelector('script')).toBeNull();
  });

  it('na falha, o terminal fica ligado à sessão, para instalar o AI-DLC por ele', async () => {
    failureServer();
    await renderGuide();
    await waitFor(() =>
      expect(
        FakeEventSource.instances.some((source) =>
          source.url.includes('/api/terminal/stream?sessionId=sessao-1'),
        ),
      ).toBe(true),
    );
  });

  it('diz em que pasta instalar o AI-DLC e onde o terminal abre', async () => {
    failureServer();
    await renderGuide();
    const text = screen.getByTestId('guide-text').textContent ?? '';
    expect(text).toContain('Instale o AI-DLC');
    expect(text).toContain('pasta onde você copiou o guia');
    expect(text).toContain('Tentar de novo');
  });

  it('tem texto e ícone além da cor, e se alcança só pelo teclado', async () => {
    failureServer();
    await renderGuide();
    const band = screen.getByTestId('guide-band');
    expect(band.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByTestId('guide-failure-band-text').textContent).toContain('tente de novo');
    await focusRetryWithKeyboard();
    expect(document.activeElement).toBe(screen.getByTestId('guide-retry-button'));
  });

  it('Tentar de novo (Enter) chama a verificação e sai da falha quando o AI-DLC aparece', async () => {
    const server = failureServer();
    await renderGuide();
    const user = await focusRetryWithKeyboard();
    server.repo = { health: 'ok', failedPath: null };
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(screen.getByTestId('demand-home').textContent).toContain('Nenhuma demanda'),
    );
    expect(server.requests.some((r) => r.url === '/api/repo/recheck' && r.method === 'POST')).toBe(
      true,
    );
    // Verifica antes de reler: o `recheck` vem antes da próxima leitura de /api/demands.
    const urls = server.requests.map((r) => r.url);
    const recheckAt = urls.indexOf('/api/repo/recheck');
    expect(urls.slice(recheckAt + 1)).toContain('/api/demands');
  });

  it('se a verificação falhar, mostra a mensagem e continua na falha', async () => {
    const server = failureServer();
    await renderGuide();
    server.recheckStatus = 500;
    await userEvent.click(screen.getByTestId('guide-retry-button'));
    await waitFor(() =>
      expect(screen.getByTestId('guide-load-error').textContent).toContain(
        'Não foi possível verificar o projeto',
      ),
    );
    expect(screen.getByTestId('guide-retry-button')).toBeTruthy();
  });

  it('avisa que a sessão aberta ficou na pasta antiga, e Nova sessão tira o aviso', async () => {
    const server = failureServer();
    await renderGuide();
    server.staleSessionFolder = 'C:\\projeto antigo';
    await userEvent.click(screen.getByTestId('guide-retry-button'));
    const notice = await screen.findByTestId('stale-session-notice');
    expect(notice.textContent).toContain('ficou na pasta antiga');
    expect(notice.textContent).toContain('C:\\projeto antigo');

    await userEvent.click(screen.getByTestId('stale-session-new-session'));
    await waitFor(() => expect(screen.queryByTestId('stale-session-notice')).toBeNull());
    expect(server.bodiesOf('/api/terminal/session')).toContainEqual({ newSession: true });
    // A sessão antiga está viva: ela é encerrada antes de a nova abrir, e só por pedido da pessoa.
    const calls = server.requests
      .filter((request) => request.url === '/api/terminal/session')
      .map((request) => request.method);
    expect(calls.lastIndexOf('DELETE')).toBeLessThan(calls.lastIndexOf('POST'));
  });

  it('sem sessão antiga, nenhum aviso aparece', async () => {
    const server = failureServer();
    await renderGuide();
    await userEvent.click(screen.getByTestId('guide-retry-button'));
    await waitFor(() =>
      expect(server.requests.some((r) => r.url === '/api/repo/recheck')).toBe(true),
    );
    expect(screen.queryByTestId('stale-session-notice')).toBeNull();
  });

  it('a mensagem não traz variáveis de ambiente nem a saída do terminal', async () => {
    const server = installFakeServer(null);
    server.repo = { health: 'missing_shell', failedPath: 'C:\\Git\\bin\\bash.exe' };
    terminalMock.written.push('SEGREDO_DO_TERMINAL=abc\r\n');
    await renderGuide();
    const text = screen.getByTestId('guide-text').textContent ?? '';
    expect(text).toContain('C:\\Git\\bin\\bash.exe');
    expect(text).toContain('VIBES_SHELL');
    expect(text).not.toMatch(/=/);
    expect(text).not.toContain('SEGREDO_DO_TERMINAL');
    expect(document.body.textContent).not.toContain('SEGREDO_DO_TERMINAL');
  });
});
