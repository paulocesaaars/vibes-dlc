// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { deriveColors, ORIGINAL_COLORS } from '@/customization/colors';
import type { CustomizationState } from '@/customization/customization-service';
import { applyColors } from '@/web/client/apply-colors';
import { Customize } from '@/web/components/customize';
import { Home, NewDemand } from '@/web/components/demand-hub';
import { MomentArt } from '@/web/components/moment-art';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function state(overrides: Partial<CustomizationState> = {}): CustomizationState {
  return {
    visitId: 'visita-1',
    colors: { original: ORIGINAL_COLORS, custom: {}, effective: ORIGINAL_COLORS },
    derived: deriveColors(ORIGINAL_COLORS),
    warnings: [],
    says: {},
    media: {},
    cliKind: 'claude_code',
    ...overrides,
  };
}

type Call = { url: string; method: string; body: unknown };

/** Servidor falso: responde com o estado que o teste mandar, e guarda as chamadas. */
function fakeServer(
  next: (call: Call) => Response | CustomizationState = () => state(),
  opened: CustomizationState = state(),
) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const raw = init?.body;
      const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const call = { url, method: init?.method ?? 'GET', body };
      calls.push(call);
      if (url === '/api/customization/visit') return json(opened);
      const answer = next(call);
      return answer instanceof Response ? answer : json(answer);
    }),
  );
  return calls;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('style');
});

async function openScreen(props: { onClose?: () => void; onChange?: () => void } = {}) {
  render(
    <Customize onChange={props.onChange ?? (() => {})} onClose={props.onClose ?? (() => {})} />,
  );
  await screen.findByTestId('customize-preview');
}

describe('tela Personalizar', () => {
  it('mostra o esqueleto, depois os momentos, a prévia original e a lista do que fica fixo', async () => {
    fakeServer();
    render(<Customize onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByTestId('customize-skeleton')).toBeTruthy();
    await screen.findByTestId('customize-preview');
    expect(screen.getByTestId('preview-title').textContent).toBe('Início');
    expect(screen.getByTestId('fixed-list').textContent).toContain('logo');
    expect((screen.getByTestId('media-reset') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('cli-claude_code')).toHaveProperty('checked', true);
  });

  it('mostra o tamanho da mídia do momento, e nada quando a arte é a original', async () => {
    fakeServer(undefined, state());
    await openScreen();
    expect(screen.queryByTestId('media-size')).toBeNull();
    cleanup();
    const media = {
      mediaId: '11111111-2222-4333-8444-555555555555',
      url: '/api/customization/media/11111111-2222-4333-8444-555555555555',
      contentType: 'image/png' as const,
      sizeBytes: 25 * 1024 * 1024,
    };
    fakeServer(undefined, state({ media: { home: media } }));
    await openScreen();
    expect(screen.getByTestId('media-size').textContent).toContain('25,0 MB');
  });

  it('funciona só com teclado: todo campo tem nome acessível e o foco alcança Concluir', async () => {
    const calls = fakeServer();
    await openScreen();
    const fields = document.querySelectorAll<HTMLElement>('input, textarea, button, select');
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      const named =
        (field as HTMLInputElement).labels?.length ||
        field.getAttribute('aria-label') ||
        field.textContent?.trim();
      expect(named, `campo sem nome: ${field.outerHTML}`).toBeTruthy();
      expect(field.tabIndex).toBeGreaterThanOrEqual(0);
    }
    const user = userEvent.setup();
    let reached = false;
    for (let press = 0; press < fields.length + 1 && !reached; press++) {
      await user.tab();
      reached = document.activeElement === screen.getByTestId('customize-done');
    }
    expect(reached).toBe(true);
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(calls.some((call) => call.url === '/api/customization/visit/done')).toBe(true),
    );
  });

  it('mostra a frase com HTML como texto, na prévia, e salva ao sair do campo', async () => {
    const calls = fakeServer((call) =>
      call.method === 'PUT'
        ? state({ says: { home: { title: '<script>alert(1)</script>' } } })
        : state(),
    );
    const { container } = render(<Customize onChange={() => {}} onClose={() => {}} />);
    const title = await screen.findByTestId('say-title');
    fireEvent.change(title, { target: { value: '<script>alert(1)</script>' } });
    fireEvent.blur(title);
    await waitFor(() =>
      expect(screen.getByTestId('preview-title').textContent).toBe('<script>alert(1)</script>'),
    );
    expect(container.querySelector('script')).toBeNull();
    expect(calls.find((call) => call.method === 'PUT')?.body).toEqual({
      visitId: 'visita-1',
      says: { home: { title: '<script>alert(1)</script>' } },
    });
  });

  it('troca a marcação por exemplo na prévia e avisa as marcações aceitas', async () => {
    fakeServer(undefined, state({ says: { understand: { title: 'Agora: {etapa} e {x}' } } }));
    render(<Customize onChange={() => {}} onClose={() => {}} />);
    fireEvent.click(await screen.findByTestId('moment-understand'));
    expect(screen.getByTestId('tokens-hint').textContent).toContain('{etapa}');
    expect(screen.getByTestId('preview-title').textContent).toBe('Agora: Projeto funcional e {x}');
  });

  it('salva uma cor válida, recusa o formato inválido e mostra o aviso de contraste', async () => {
    const warning = {
      colorKey: 'text' as const,
      ratio: 1.2,
      minimum: 4.5 as const,
      message: 'O texto fica difícil de ler sobre o fundo.',
    };
    const calls = fakeServer((call) =>
      call.method === 'PUT'
        ? state({
            colors: {
              original: ORIGINAL_COLORS,
              custom: { text: '#eeeeee' },
              effective: { ...ORIGINAL_COLORS, text: '#eeeeee' },
            },
            warnings: [warning],
          })
        : state(),
    );
    await openScreen();
    const input = screen.getByTestId('color-text');
    fireEvent.change(input, { target: { value: '#12' } });
    expect(await screen.findByTestId('color-invalid-text')).toBeTruthy();
    expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0);
    fireEvent.change(input, { target: { value: '#eeeeee' } });
    expect((await screen.findByTestId('contrast-warning')).textContent).toContain('⚠');
    expect(calls.find((call) => call.method === 'PUT')?.body).toMatchObject({
      colors: { text: '#eeeeee' },
    });
    expect((screen.getByTestId('color-reset-text') as HTMLButtonElement).disabled).toBe(false);
  });

  it('Sua IA em Outra CLI salva a escolha e não oferece envio nem abrir a IA', async () => {
    const calls = fakeServer((call) =>
      call.method === 'PUT' ? state({ cliKind: 'other' }) : state(),
    );
    await openScreen();
    fireEvent.click(screen.getByTestId('cli-other'));
    expect((await screen.findByTestId('cli-other-note')).textContent).toContain(
      'sem botão de envio',
    );
    expect(calls.find((call) => call.method === 'PUT')?.body).toMatchObject({ cliKind: 'other' });
    expect(screen.queryByText(/Abrir a sua IA/)).toBeNull();
    expect(screen.queryByTestId('guide-send-button')).toBeNull();
  });

  it('Concluir e Cancelar chamam a rota da visita e voltam à tela anterior', async () => {
    for (const [button, route] of [
      ['customize-done', '/api/customization/visit/done'],
      ['customize-cancel', '/api/customization/visit/cancel'],
    ] as const) {
      const onClose = vi.fn();
      const calls = fakeServer(() => state({ visitId: null }));
      await openScreen({ onClose });
      fireEvent.click(screen.getByTestId(button));
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
      expect(calls.find((call) => call.url === route)?.body).toEqual({ visitId: 'visita-1' });
      cleanup();
    }
  });

  it('Restaurar tudo só envia depois da confirmação', async () => {
    const calls = fakeServer();
    await openScreen();
    fireEvent.click(screen.getByTestId('customize-reset'));
    fireEvent.click(screen.getByTestId('customize-reset-cancel'));
    expect(calls.some((call) => call.method === 'PUT')).toBe(false);
    fireEvent.click(screen.getByTestId('customize-reset'));
    fireEvent.click(screen.getByTestId('customize-reset-confirm'));
    await waitFor(() =>
      expect(calls.find((call) => call.method === 'PUT')?.body).toEqual({
        visitId: 'visita-1',
        resetAll: true,
      }),
    );
  });

  it('mostra save_failed e stale_visit como aviso e oferece reabrir', async () => {
    const calls = fakeServer((call) =>
      call.method === 'PUT'
        ? json({ code: 'stale_visit', message: 'Esta tela ficou desatualizada.' }, 409)
        : state(),
    );
    await openScreen();
    fireEvent.click(screen.getByTestId('cli-other'));
    expect((await screen.findByTestId('customize-error')).textContent).toContain('desatualizada');
    expect(screen.getByTestId('say-title')).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByTestId('customize-reopen'));
    await waitFor(() =>
      expect(calls.filter((call) => call.url === '/api/customization/visit')).toHaveLength(2),
    );
    await waitFor(() => expect(screen.queryByTestId('customize-error')).toBeNull());
  });

  it('em momento de recuperação aceita só a arte e explica por quê', async () => {
    fakeServer();
    await openScreen();
    fireEvent.click(screen.getByTestId('moment-session_dead'));
    expect(screen.getByTestId('art-only-note').textContent).toContain('instrução');
    expect(screen.queryByTestId('say-title')).toBeNull();
  });

  it('envia o arquivo escolhido com momento e visita, e mostra o motivo se for recusado', async () => {
    const calls = fakeServer((call) =>
      call.url === '/api/customization/media'
        ? json({ code: 'unsupported_type', message: 'SVG não é aceito.' }, 415)
        : state(),
    );
    await openScreen();
    const file = new File([new Uint8Array([1, 2, 3])], 'arte.svg', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('media-file'), { target: { files: [file] } });
    expect((await screen.findByTestId('customize-error')).textContent).toContain('SVG');
    const upload = calls.find((call) => call.url === '/api/customization/media');
    const form = upload?.body as FormData;
    expect(form.get('momentKey')).toBe('home');
    expect(form.get('visitId')).toBe('visita-1');
    expect(screen.getByTestId('preview-title').textContent).toBe('Início');
  });
});

describe('arte do momento', () => {
  const original = { src: '/guia/entender.webp', alt: 'Original' };

  it('volta à arte original quando a mídia personalizada não carrega', () => {
    render(
      <MomentArt art={{ src: '/api/customization/media/x', alt: 'Mídia', fallback: original }} />,
    );
    const image = screen.getByTestId('moment-art') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('/api/customization/media/x');
    fireEvent.error(image);
    expect((screen.getByTestId('moment-art') as HTMLImageElement).getAttribute('src')).toBe(
      original.src,
    );
  });

  it('toca o vídeo sem som e em repetição, e o deixa parado com redução de movimento', () => {
    const art = { src: '/m.mp4', alt: 'Vídeo', kind: 'video' as const, fallback: original };
    render(<MomentArt art={art} />);
    const video = screen.getByTestId('moment-art') as HTMLVideoElement;
    expect(video.tagName).toBe('VIDEO');
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.autoplay).toBe(true);
    cleanup();

    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    render(<MomentArt art={art} />);
    expect((screen.getByTestId('moment-art') as HTMLVideoElement).autoplay).toBe(false);
    expect(pause).toHaveBeenCalled();
    pause.mockRestore();
  });
});

describe('cores aplicadas', () => {
  it('põe as variáveis das cores trocadas e das derivadas, e tira ao voltar ao original', () => {
    const element = document.createElement('div');
    const effective = { ...ORIGINAL_COLORS, accent: '#112233', brand: '#445566' };
    const custom = { accent: '#112233', brand: '#445566' };
    const derived = deriveColors(effective);
    applyColors(element, { colors: { original: ORIGINAL_COLORS, custom, effective }, derived });
    expect(element.style.getPropertyValue('--brand')).toBe('#445566');
    expect(element.style.getPropertyValue('--green')).toBe('#112233');
    expect(element.style.getPropertyValue('--green2')).toBe(derived.accentHover);
    expect(element.style.getPropertyValue('--onAccent')).toBe(derived.onAccent);
    expect(element.style.getPropertyValue('--ink')).toBe('');
    applyColors(element, state());
    expect(element.getAttribute('style') ?? '').toBe('');
    applyColors(element, null);
  });
});

describe('Início e nova demanda personalizados', () => {
  it('usam a frase e a mídia do momento, e mostram HTML como texto', async () => {
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
    const custom = state({
      says: {
        home: { title: '<b>Oi</b>', text: 'Bem-vinda' },
        new_level: { text: 'Nível {nivel}' },
      },
      media: {
        home: {
          mediaId: 'm',
          url: '/api/customization/media/m',
          contentType: 'image/png',
          sizeBytes: 10,
        },
      },
    });
    const { container } = render(<Home onOpen={() => {}} onNew={() => {}} custom={custom} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('<b>Oi</b>');
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByTestId('moment-art').getAttribute('src')).toBe('/api/customization/media/m');
    cleanup();

    render(<NewDemand onCancel={() => {}} onCreated={() => {}} custom={custom} />);
    fireEvent.change(screen.getByTestId('demand-description'), {
      target: { value: 'corrigir erro' },
    });
    fireEvent.click(screen.getByTestId('demand-next'));
    expect(screen.getByTestId('new-demand-text').textContent).toBe('Nível bugfix');
  });
});
