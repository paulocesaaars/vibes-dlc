'use client';

import { type ReactNode, useRef, useState } from 'react';

type CommandActionsProps = {
  text: string;
  onSend?: (text: string) => Promise<void>;
  sendDisabled?: boolean;
  children: ReactNode;
};

/** Ações explícitas sobre o comando exibido, com retorno acessível. */
export function CommandActions({ text, onSend, sendDisabled, children }: CommandActionsProps) {
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    text: string;
    message: string;
    error: boolean;
  } | null>(null);

  async function act(send: boolean) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      if (send && onSend) {
        await onSend(text);
      } else {
        if (!navigator.clipboard?.writeText) {
          throw new Error('Não foi possível copiar. Selecione o comando e copie manualmente.');
        }
        await navigator.clipboard.writeText(text);
      }
      setFeedback({
        text,
        message: send
          ? 'Comando enviado. Pressione Enter no terminal para executar.'
          : 'Comando copiado.',
        error: false,
      });
    } catch (error) {
      setFeedback({
        text,
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível concluir a ação. Tente novamente.',
        error: true,
      });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="stack-6">
      <div className="command-block">
        {children}
        <button
          type="button"
          className="command-copy"
          aria-label="Copiar comando"
          title="Copiar comando"
          disabled={busy || !text.trim()}
          onClick={() => void act(false)}
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>
      {onSend ? (
        <div className="button-row">
          <button
            type="button"
            className="btn2"
            disabled={busy || sendDisabled || !text.trim()}
            title="Colar o comando sem executar"
            onClick={() => void act(true)}
          >
            Enviar ao terminal
          </button>
        </div>
      ) : null}
      {feedback?.text === text ? (
        <p
          role={feedback.error ? 'alert' : 'status'}
          className={feedback.error ? 'notice-error' : 'muted small'}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
