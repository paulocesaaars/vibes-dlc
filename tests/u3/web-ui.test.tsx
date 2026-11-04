// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Activation, DemandTabs, Home, NewDemand } from '@/web/components/demand-hub';
import { guideView } from '../u1/web-fakes';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Início e nova demanda', () => {
  it('mostra estado vazio e oferece Nova demanda', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ rows: [] })),
    );
    vi.stubGlobal(
      'EventSource',
      class {
        addEventListener() {}
        close() {}
      },
    );
    render(<Home onOpen={() => {}} onNew={() => {}} />);
    await waitFor(() => expect(screen.getByText(/Nenhuma demanda/)).toBeTruthy());
  });
  it('abre a linha escolhida sem alterar cursor', async () => {
    const open = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({
          rows: [
            {
              intentId: 'other',
              title: 'Outra',
              scope: 'mvp',
              stageLabel: 'code-generation',
              doneCount: 1,
              totalCount: 2,
              isActive: false,
              readable: true,
              turn: 'person',
            },
          ],
        }),
      ),
    );
    vi.stubGlobal(
      'EventSource',
      class {
        addEventListener() {}
        close() {}
      },
    );
    render(<Home onOpen={open} onNew={() => {}} />);
    expect((await screen.findByTestId('demand-row')).textContent).toContain('Sua vez');
    fireEvent.click(await screen.findByText(/Outra/));
    expect(open).toHaveBeenCalledWith('other');
  });
  it('desativa Continuar sem descrição e cancela sem enviar', () => {
    const cancel = vi.fn();
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<NewDemand onCancel={cancel} onCreated={() => {}} />);
    expect((screen.getByTestId('demand-next') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('demand-cancel'));
    expect(cancel).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalledWith('/api/demands/new/command', expect.anything());
  });
  it('sugere nível e o permite trocar antes da confirmação', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ rows: [] })),
    );
    render(<NewDemand onCancel={() => {}} onCreated={() => {}} />);
    fireEvent.change(screen.getByTestId('demand-description'), {
      target: { value: 'corrigir erro' },
    });
    fireEvent.click(screen.getByTestId('demand-next'));
    expect(screen.getByText(/Nível sugerido/).textContent).toContain('bugfix');
    fireEvent.change(screen.getByTestId('demand-level'), { target: { value: 'mvp' } });
    fireEvent.click(screen.getByTestId('demand-next'));
    expect((screen.getByTestId('demand-command') as HTMLTextAreaElement).value).toContain(
      '--scope mvp',
    );
  });
  it('só envia depois do clique de confirmação', async () => {
    vi.stubGlobal(
      'EventSource',
      class {
        addEventListener() {}
        close() {}
      },
    );
    const fetch = vi.fn(async (input: string) => {
      void input;
      return json({ rows: [], cliKind: 'claude_code', status: 'written' });
    });
    vi.stubGlobal('fetch', fetch);
    render(<NewDemand onCancel={() => {}} onCreated={() => {}} />);
    fireEvent.change(screen.getByTestId('demand-description'), {
      target: { value: 'adicionar filtro' },
    });
    fireEvent.click(screen.getByTestId('demand-next'));
    fireEvent.click(screen.getByTestId('demand-next'));
    expect(fetch.mock.calls.some(([url]) => url === '/api/demands/new/command')).toBe(false);
    fireEvent.click(await screen.findByTestId('demand-send'));
    await waitFor(() =>
      expect(fetch.mock.calls.some(([url]) => url === '/api/demands/new/command')).toBe(true),
    );
  });
  it('Outra CLI mostra referência e não oferece envio de demanda', async () => {
    const fetch = vi.fn(async () => json({ rows: [], cliKind: 'other' }));
    vi.stubGlobal('fetch', fetch);
    render(<NewDemand onCancel={() => {}} onCreated={() => {}} />);
    fireEvent.change(screen.getByTestId('demand-description'), {
      target: { value: 'nova demanda' },
    });
    fireEvent.click(screen.getByTestId('demand-next'));
    fireEvent.click(screen.getByTestId('demand-next'));
    expect(await screen.findByTestId('other-cli-reference')).toBeTruthy();
    expect(screen.queryByTestId('demand-send')).toBeNull();
    expect(screen.queryByTestId('demand-paste')).toBeNull();
    expect(fetch).not.toHaveBeenCalledWith('/api/demands/new/command', expect.anything());
  });
  it('descarta rascunho ao recarregar a tela', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ rows: [] })),
    );
    const first = render(<NewDemand onCancel={() => {}} onCreated={() => {}} />);
    fireEvent.change(screen.getByTestId('demand-description'), { target: { value: 'rascunho' } });
    first.unmount();
    render(<NewDemand onCancel={() => {}} onCreated={() => {}} />);
    expect((screen.getByTestId('demand-description') as HTMLTextAreaElement).value).toBe('');
  });
});

describe('consulta e abas', () => {
  it('confirma ativação com comando montado no servidor', async () => {
    const fetch = vi.fn(async (input: string) => {
      void input;
      return json({ cliKind: 'claude_code', status: 'written' });
    });
    vi.stubGlobal('fetch', fetch);
    render(<Activation intentId="other" onActivated={() => {}} />);
    fireEvent.click(screen.getByTestId('activate-demand'));
    expect(screen.getByText('/aidlc intent switch other')).toBeTruthy();
    fireEvent.click(await screen.findByTestId('activate-confirm'));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/demands/other/activate', expect.anything()),
    );
  });
  it('Outra CLI mostra ativação apenas como referência', async () => {
    const fetch = vi.fn(async () => json({ cliKind: 'other' }));
    vi.stubGlobal('fetch', fetch);
    render(<Activation intentId="other" onActivated={() => {}} />);
    fireEvent.click(screen.getByTestId('activate-demand'));
    expect(await screen.findByTestId('other-cli-reference')).toBeTruthy();
    expect(screen.queryByTestId('activate-confirm')).toBeNull();
    expect(fetch).not.toHaveBeenCalledWith('/api/demands/other/activate', expect.anything());
  });
  it('troca de aba sem perder o botão de voltar ao guia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        json(
          url.includes('/artifacts?')
            ? { items: [], selected: null }
            : { units: [], decisions: [], commands: [] },
        ),
      ),
    );
    const back = vi.fn();
    render(<DemandTabs view={guideView('send')} onBack={back} />);
    fireEvent.click(screen.getByTestId('tab-units'));
    expect(screen.getByText(/Ainda não há itens/)).toBeTruthy();
    fireEvent.click(screen.getByText('Voltar ao guia'));
    expect(back).toHaveBeenCalled();
  });
  it('mostra conteúdo de decisões como texto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        json(
          url.includes('/artifacts?')
            ? { items: [], selected: null }
            : {
                decisions: [
                  { kind: 'approval', stage: 's', at: 'agora', text: '<script>alert(1)</script>' },
                ],
              },
        ),
      ),
    );
    render(<DemandTabs view={guideView('send')} onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('tab-decisions'));
    expect(await screen.findByText(/<script>alert/)).toBeTruthy();
    expect(document.querySelector('script')).toBeNull();
  });
});
