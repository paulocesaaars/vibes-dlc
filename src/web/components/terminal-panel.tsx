'use client';

import type { FitAddon } from '@xterm/addon-fit';
import type { Terminal } from '@xterm/xterm';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { postInput, postResize } from '@/web/client/api';
import { InputQueue, TerminalStream } from '@/web/client/terminal-io';

export type TerminalPanelHandle = { focus: () => void; hasFocus: () => boolean };

type TerminalPanelProps = {
  sessionId: string | null;
  status: 'alive' | 'dead' | 'unavailable' | 'none';
  title: string;
  collapsed: boolean;
  highlight: boolean;
  onToggle: () => void;
  onBackToGuide: () => void;
  onEndSession: () => void;
  onNewSession: () => void;
  onSessionEnded: () => void;
};

/** Tema próximo do Git Bash (`TDD.md`, Aparência): cores ANSI do mintty e fonte Consolas. */
const THEME = {
  background: '#000000',
  foreground: '#CCCCCC',
  cursor: '#CCCCCC',
  black: '#000000',
  red: '#BF0000',
  green: '#00BF00',
  yellow: '#BFBF00',
  blue: '#0000BF',
  magenta: '#BF00BF',
  cyan: '#00BFBF',
  white: '#BFBFBF',
  brightBlack: '#404040',
  brightRed: '#FF4040',
  brightGreen: '#40FF40',
  brightYellow: '#FFFF40',
  brightBlue: '#6060FF',
  brightMagenta: '#FF40FF',
  brightCyan: '#40FFFF',
  brightWhite: '#FFFFFF',
};

const RESIZE_DEBOUNCE_MS = 100;

/** Terminal real na tela. A saída é interpretada só pelo `xterm`, nunca como HTML (NFR5.1). */
export const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(
  function TerminalPanel(props, ref) {
    const { sessionId, status, title, collapsed, highlight, onSessionEnded } = props;
    const screenRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitRef = useRef<FitAddon | null>(null);
    const sessionIdRef = useRef<string | null>(sessionId);
    const statusRef = useRef(status);
    const resizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [ready, setReady] = useState(false);
    const [confirmingEnd, setConfirmingEnd] = useState(false);

    const endedRef = useRef(onSessionEnded);

    useEffect(() => {
      sessionIdRef.current = sessionId;
      statusRef.current = status;
      endedRef.current = onSessionEnded;
      if (terminalRef.current) terminalRef.current.options.disableStdin = status !== 'alive';
    }, [sessionId, status, onSessionEnded]);

    const fitAndSync = () => {
      const terminal = terminalRef.current;
      const fit = fitRef.current;
      if (!terminal || !fit || !screenRef.current?.offsetWidth) return;
      fit.fit();
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        const id = sessionIdRef.current;
        if (id && statusRef.current === 'alive') {
          void postResize(id, terminal.cols, terminal.rows);
        }
      }, RESIZE_DEBOUNCE_MS);
    };

    useImperativeHandle(ref, () => ({
      focus: () => terminalRef.current?.focus(),
      hasFocus: () => Boolean(screenRef.current?.contains(document.activeElement)),
    }));

    useEffect(() => {
      let disposed = false;
      let observer: ResizeObserver | null = null;
      const load = async () => {
        const [{ Terminal: XTerm }, { FitAddon: Fit }] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
        ]);
        const screen = screenRef.current;
        if (disposed || !screen) return;

        const terminal = new XTerm({
          fontFamily: "Consolas, 'Lucida Console', 'Cascadia Mono', monospace",
          fontSize: 14,
          cursorBlink: true,
          scrollback: 5000,
          theme: THEME,
        });
        const fit = new Fit();
        terminal.loadAddon(fit);
        terminal.open(screen);
        // F6 alterna o foco: nunca chega à CLI (BR3.10).
        terminal.attachCustomKeyEventHandler((event) => event.key !== 'F6');

        const queue = new InputQueue((data) => {
          const id = sessionIdRef.current;
          return id && statusRef.current === 'alive' ? postInput(id, data) : Promise.resolve();
        });
        terminal.onData((data) => queue.push(data));

        terminalRef.current = terminal;
        fitRef.current = fit;
        observer = new ResizeObserver(() => fitAndSync());
        observer.observe(screen);
        fitAndSync();
        setReady(true);
      };
      void load();
      return () => {
        disposed = true;
        observer?.disconnect();
        terminalRef.current?.dispose();
        terminalRef.current = null;
        fitRef.current = null;
      };
    }, []);

    useEffect(() => {
      if (!ready || !sessionId) return;
      const terminal = terminalRef.current;
      if (!terminal) return;
      terminal.reset();

      let synced = false;
      const stream = new TerminalStream(sessionId, {
        onOutput: (data) => {
          terminal.write(data);
          // Uma CLI que redesenha a tela se recompõe com um resize depois dos blocos (BR3.4).
          if (!synced) {
            synced = true;
            fitAndSync();
          }
        },
        onReset: () => terminal.reset(),
        onEnded: () => endedRef.current(),
      });
      stream.connect();
      return () => stream.close();
    }, [ready, sessionId]);

    useEffect(() => {
      if (!collapsed) fitAndSync();
    }, [collapsed]);

    const sectionClass = [
      'term',
      collapsed ? 'term-closed' : '',
      highlight && !collapsed ? 'term-you' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <section className={sectionClass} aria-label="Terminal integrado" data-testid="terminal">
        <span className="term-ring" aria-hidden="true" />
        {collapsed ? (
          <button
            className="term-strip"
            type="button"
            data-testid="terminal-expand-button"
            onClick={props.onToggle}
            aria-expanded="false"
            aria-label="Expandir terminal"
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 6-6 6 6 6" />
            </svg>
            <span className="term-strip-label">Terminal</span>
          </button>
        ) : (
          <div className="term-bar">
            <button
              className="term-btn"
              type="button"
              data-testid="terminal-collapse-button"
              onClick={props.onToggle}
              aria-expanded="true"
              aria-label="Recolher terminal"
              title="Recolher terminal"
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
            <span data-testid="terminal-title">{title}</span>
            <span style={{ flex: '1 1 auto' }} />
            <button
              className="term-action"
              type="button"
              data-testid="terminal-back-to-guide-button"
              onClick={props.onBackToGuide}
            >
              Voltar ao guia (F6)
            </button>
            {status === 'alive' && !confirmingEnd ? (
              <button
                className="term-action"
                type="button"
                data-testid="terminal-end-session-button"
                onClick={() => setConfirmingEnd(true)}
              >
                Encerrar sessão
              </button>
            ) : null}
            {status === 'alive' && confirmingEnd ? (
              <span
                role="group"
                aria-label="Confirmar encerramento"
                style={{ display: 'contents' }}
              >
                <span>Isto interrompe o que estiver rodando no terminal.</span>
                <button
                  className="term-action term-action-main"
                  type="button"
                  data-testid="terminal-confirm-end-button"
                  onClick={() => {
                    setConfirmingEnd(false);
                    props.onEndSession();
                  }}
                >
                  Encerrar
                </button>
                <button
                  className="term-action"
                  type="button"
                  data-testid="terminal-cancel-end-button"
                  onClick={() => setConfirmingEnd(false)}
                >
                  Cancelar
                </button>
              </span>
            ) : null}
            {status !== 'alive' ? (
              <button
                className="term-action term-action-main"
                type="button"
                data-testid="terminal-new-session-button"
                onClick={props.onNewSession}
              >
                Nova sessão
              </button>
            ) : null}
          </div>
        )}
        <div
          ref={screenRef}
          className="term-screen"
          data-testid="terminal-screen"
          style={collapsed ? { display: 'none' } : undefined}
        />
      </section>
    );
  },
);
