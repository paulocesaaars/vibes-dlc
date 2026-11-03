'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GuideDecision } from '@/core/types';
import { momentContent, NO_ACTIVE_INTENT_CONTENT } from '@/guide/moment-content';
import { useGuide, type GuideState } from '@/web/client/use-guide';
import type { GuideView } from '@/web/guide-service';
import { Say, SendCard, StepBar, Trail, UnderstandCard } from './guide-parts';
import { Logo } from './logo';
import { TerminalPanel, type TerminalPanelHandle } from './terminal-panel';

const MAX_COMMAND_LENGTH = 8000;

const FAILURE_DECISION: GuideDecision = {
  moment: 'failure',
  turn: 'person',
  primaryAction: 'retry',
  canSend: false,
  sendBlockedReason: 'repo_failure',
};

function commandIssue(text: string): string | null {
  if (/[\r\n]/.test(text))
    return 'O comando tem uma linha só. Tire as quebras de linha para enviar.';
  if (text.trim().length === 0) return 'Escreva o comando antes de enviar.';
  if (text.length > MAX_COMMAND_LENGTH) return 'O comando passou de 8000 caracteres.';
  return null;
}

function focusInstruction(): void {
  document.getElementById('guide-instruction')?.focus();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR');
}

type GuideBodyProps = {
  view: GuideView;
  draft: string;
  failure: string | null;
  onDraft: (value: string) => void;
  onResetDraft: () => void;
};

function GuideBody({ view, draft, failure, onDraft, onResetDraft }: GuideBodyProps) {
  const { content, decision } = view;
  return (
    <>
      <Say
        art={content.art}
        eyebrow={content.eyebrow}
        title={content.title}
        text={content.text}
        point={content.point}
      />
      {decision.moment === 'understand' ? (
        <UnderstandCard steps={view.stageContent.howItWorks} />
      ) : null}
      {decision.moment === 'send' ? (
        <SendCard
          stageName={view.stage.name}
          value={draft}
          original={view.command}
          issue={commandIssue(draft)}
          failure={failure}
          onChange={onDraft}
          onReset={onResetDraft}
        />
      ) : null}
    </>
  );
}

type BandProps = {
  view: GuideView;
  draft: string;
  sending: boolean;
  onUnderstood: () => void;
  onSend: (mode: 'execute' | 'paste') => void;
  onNewSession: () => void;
  onRetry: () => void;
};

/** Faixa inferior: uma ação principal por momento, ou o que está sendo aguardado (BR4.4). */
function Band({ view, draft, sending, onUnderstood, onSend, onNewSession, onRetry }: BandProps) {
  const { content, decision } = view;
  const className = content.bandWaiting ? 'band band-wait' : 'band';
  const blocked = sending || commandIssue(draft) !== null || !decision.canSend;
  return (
    <div className={className} data-testid="guide-band">
      {content.bandText ? (
        <span className="band-txt" data-testid="guide-band-text">
          {content.bandText}
        </span>
      ) : null}
      {decision.primaryAction === 'send' ? (
        <button
          className="btn2"
          type="button"
          data-testid="guide-paste-button"
          disabled={blocked}
          onClick={() => onSend('paste')}
        >
          Colar sem executar
        </button>
      ) : null}
      {decision.primaryAction === 'send' ? (
        <button
          className="cta"
          type="button"
          data-testid="guide-send-button"
          disabled={blocked}
          onClick={() => onSend('execute')}
        >
          {content.primaryLabel}
        </button>
      ) : null}
      {decision.primaryAction === 'understood' ? (
        <button
          className="cta"
          type="button"
          data-testid="guide-understood-button"
          onClick={onUnderstood}
        >
          {content.primaryLabel}
        </button>
      ) : null}
      {decision.primaryAction === 'new_session' ? (
        <button
          className="cta"
          type="button"
          data-testid="guide-new-session-button"
          onClick={onNewSession}
        >
          {content.primaryLabel}
        </button>
      ) : null}
      {decision.primaryAction === 'retry' ? (
        <button className="cta" type="button" data-testid="guide-retry-button" onClick={onRetry}>
          {content.primaryLabel}
        </button>
      ) : null}
    </div>
  );
}

function NoGuideBody({ state }: { state: Exclude<GuideState, { kind: 'guide' }> }) {
  if (state.kind === 'loading') {
    return (
      <p role="status" style={{ margin: 0, color: 'var(--gray)' }}>
        Abrindo o guia…
      </p>
    );
  }
  if (state.kind === 'no_intent') return <Say {...NO_ACTIVE_INTENT_CONTENT} />;
  const content = momentContent(FAILURE_DECISION, {
    stageName: '',
    stageNumber: '',
    stageDescription: '',
    health: state.health,
    failedPath: state.failedPath,
  });
  return (
    <Say art={content.art} eyebrow={content.eyebrow} title={content.title} text={content.text} />
  );
}

/** Tela do guia: segue a estrutura de `design/prototipo/Main.dc.html`. */
export function GuideApp() {
  const { state, actions, loadError } = useGuide();
  const [collapsed, setCollapsed] = useState(false);
  const [draftEdit, setDraftEdit] = useState<{ stage: string; text: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const terminalRef = useRef<TerminalPanelHandle>(null);
  const pendingFocus = useRef(false);

  const view = state.kind === 'guide' ? state.view : null;
  const stageSlug = view?.stage.slug ?? '';
  const draft = draftEdit?.stage === stageSlug ? draftEdit.text : (view?.command ?? '');
  const moment = view?.decision.moment;

  useEffect(() => {
    if (!pendingFocus.current || !view) return;
    pendingFocus.current = false;
    focusInstruction();
  }, [view]);

  const toggleFocus = useCallback(() => {
    if (terminalRef.current?.hasFocus()) {
      focusInstruction();
      return;
    }
    setCollapsed(false);
    requestAnimationFrame(() => terminalRef.current?.focus());
  }, []);

  useEffect(() => {
    // Captura antes de a tecla chegar à CLI e impede o atalho do navegador (BR3.10).
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F6') return;
      event.preventDefault();
      event.stopPropagation();
      toggleFocus();
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [toggleFocus]);

  const handleSend = useCallback(
    async (mode: 'execute' | 'paste') => {
      // A proteção contra duplo clique vale antes de o React atualizar a tela (BR5.3).
      if (sendingRef.current) return;
      sendingRef.current = true;
      setSending(true);
      setFailure(null);
      try {
        const result = await actions.send(draft, mode);
        if (result.ok) {
          // Reabre o terminal recolhido, sem mover o foco para ele (BR3.11).
          setCollapsed(false);
          setDraftEdit(null);
          pendingFocus.current = true;
        } else {
          setFailure(result.message);
        }
      } catch (error) {
        setFailure(error instanceof Error ? error.message : 'O painel não respondeu.');
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [actions, draft],
  );

  const handleUnderstood = useCallback(async () => {
    pendingFocus.current = true;
    await actions.understood();
  }, [actions]);

  const session = view?.session ?? null;
  const highlight =
    moment === 'pasted' || (moment === 'following' && view?.decision.turn === 'person');

  return (
    <div className={collapsed ? 'app app-closed' : 'app'} data-testid="guide-app">
      <div className="left">
        <header className="top">
          <div className="brand" data-testid="guide-brand">
            <Logo />
            <span>vibes dlc</span>
          </div>
        </header>
        <div className={view ? 'panes with-rail' : 'panes'}>
          {view ? <Trail phases={view.trail} /> : null}
          <main className="main">
            {view ? (
              <div
                style={{
                  padding: '12px 24px 10px',
                  borderBottom: '2px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '4px 12px',
                  }}
                >
                  <strong
                    data-testid="guide-stage-name"
                    style={{ fontWeight: 900, fontSize: 17, minWidth: 0 }}
                  >
                    {view.stage.name}
                  </strong>
                  <span
                    className="tag"
                    data-testid="guide-turn"
                    style={{ color: 'var(--blueText)' }}
                  >
                    {view.content.turnLabel}
                  </span>
                </div>
                <StepBar stepNumber={view.content.stepNumber} />
                {view.lastChangedAt ? (
                  <span
                    data-testid="guide-last-changed"
                    data-value={view.lastChangedAt}
                    style={{ fontSize: 13, color: 'var(--gray)' }}
                  >
                    Última mudança nos arquivos: {formatTime(view.lastChangedAt)}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="scroll">
              <div
                style={{
                  maxWidth: 760,
                  margin: '0 auto',
                  padding: '22px 24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 18,
                }}
              >
                {loadError ? (
                  <p role="alert" className="notice-error" data-testid="guide-load-error">
                    {loadError}
                  </p>
                ) : null}
                {view ? (
                  <GuideBody
                    view={view}
                    draft={draft}
                    failure={failure}
                    onDraft={(text) => setDraftEdit({ stage: stageSlug, text })}
                    onResetDraft={() => setDraftEdit(null)}
                  />
                ) : (
                  <NoGuideBody state={state as Exclude<GuideState, { kind: 'guide' }>} />
                )}
              </div>
            </div>
            {view ? (
              <Band
                view={view}
                draft={draft}
                sending={sending}
                onUnderstood={() => void handleUnderstood()}
                onSend={(mode) => void handleSend(mode)}
                onNewSession={() => void actions.openNewSession()}
                onRetry={() => void actions.openNewSession()}
              />
            ) : state.kind === 'repo_failure' ? (
              <div className="band" data-testid="guide-band">
                <button
                  className="cta"
                  type="button"
                  data-testid="guide-retry-button"
                  onClick={() => void actions.refresh()}
                >
                  Tentar de novo
                </button>
              </div>
            ) : null}
          </main>
        </div>
      </div>
      <TerminalPanel
        ref={terminalRef}
        sessionId={session?.sessionId ?? null}
        status={session?.status ?? 'none'}
        title={view?.terminalTitle ?? 'MINGW64'}
        collapsed={collapsed}
        highlight={highlight}
        onToggle={() => setCollapsed((value) => !value)}
        onBackToGuide={focusInstruction}
        onEndSession={() => void actions.endSession()}
        onNewSession={() => void actions.openNewSession()}
        onSessionEnded={() => void actions.refresh()}
      />
    </div>
  );
}
