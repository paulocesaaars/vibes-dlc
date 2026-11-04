'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GuideDecision, Moment } from '@/core/types';
import { momentContent, NO_ACTIVE_INTENT_CONTENT, terminalHint } from '@/guide/moment-content';
import type { ArtifactQuery } from '@/web/client/use-artifacts';
import { useArtifacts } from '@/web/client/use-artifacts';
import { applyColors } from '@/web/client/apply-colors';
import { useCustomization } from '@/web/client/use-customization';
import { useGuide, type GuideState } from '@/web/client/use-guide';
import type { GuideView } from '@/web/guide-service';
import { GuideBand } from './guide-band';
import { ConsultBody, GuideBody } from './guide-body';
import { Say, StepBar } from './guide-parts';
import { Logo } from './logo';
import { TerminalPanel, type TerminalPanelHandle } from './terminal-panel';
import { Trail } from './trail';
import { Customize } from './customize';
import { Activation, DemandTabs, Home, NewDemand, type HubScreen } from './demand-hub';

const MAX_COMMAND_LENGTH = 8000;

const FAILURE_DECISION: GuideDecision = {
  moment: 'failure',
  turn: 'person',
  primaryAction: 'retry',
  canSend: false,
  sendBlockedReason: 'repo_failure',
  showIdleNotice: false,
};

/** Momentos em que a tela lê os artefatos da etapa. */
const ARTIFACT_MOMENTS: readonly Moment[] = [
  'following',
  'question',
  'review',
  'approve',
  'revising',
];
/** Reabrem o terminal recolhido: pergunta registrada e aprovação pendente (`interaction-spec.md`). */
const REOPEN_TERMINAL_MOMENTS: readonly Moment[] = ['question', 'approve'];

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

function artifactQuery(view: GuideView | null, consultStage: string | null): ArtifactQuery | null {
  if (!view) return null;
  const base = { intentId: view.intentId, version: view.lastChangedAt };
  if (consultStage) return { ...base, stage: consultStage, unit: null, consult: true };
  if (!ARTIFACT_MOMENTS.includes(view.decision.moment) || !view.stage.slug) return null;
  return { ...base, stage: view.stage.slug, unit: view.stage.unit, consult: false };
}

function StageHeader({ view, consulting }: { view: GuideView; consulting: boolean }) {
  const label = view.stage.unit ? `${view.stage.unit} · ${view.stage.name}` : view.stage.name;
  return (
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
          {label}
        </strong>
        <span className="tag" data-testid="guide-turn" style={{ color: 'var(--blueText)' }}>
          {view.content.turnLabel}
        </span>
      </div>
      {consulting ? null : <StepBar stepNumber={view.content.stepNumber} />}
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
  );
}

/** Tela do guia: segue a estrutura de `design/prototipo/Main.dc.html`. */
export function GuideApp() {
  const { state, actions, loadError, changedNotice } = useGuide();
  const { custom, setCustom } = useCustomization();
  const appRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [draftEdit, setDraftEdit] = useState<{ stage: string; text: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [consultStage, setConsultStage] = useState<string | null>(null);
  const [shownMoment, setShownMoment] = useState<Moment | undefined>(undefined);
  const [screen, setScreen] = useState<HubScreen>('guide');
  const sendingRef = useRef(false);
  const terminalRef = useRef<TerminalPanelHandle>(null);
  const pendingFocus = useRef(false);

  const view = state.kind === 'guide' ? state.view : null;
  const currentScreen = state.kind === 'no_intent' && screen === 'guide' ? 'home' : screen;
  const stageSlug = view?.stage.stateSlug ?? '';
  const draft = draftEdit?.stage === stageSlug ? draftEdit.text : (view?.command ?? '');
  const moment = view?.decision.moment;
  // Ajuste durante a renderização: só a chegada ao momento reabre, e recolher depois continua valendo.
  if (moment !== shownMoment) {
    setShownMoment(moment);
    if (moment && REOPEN_TERMINAL_MOMENTS.includes(moment)) setCollapsed(false);
  }
  // A faixa pode sumir enquanto a pessoa decide: um arquivo mudou, e o cartão fecha junto (BR3.2).
  const isResuming = resuming && view?.decision.showIdleNotice === true;

  const { refresh } = actions;
  // As cores personalizadas viram variáveis CSS no elemento raiz, sem recarregar a página.
  useEffect(() => {
    if (appRef.current) applyColors(appRef.current, custom);
  }, [custom]);
  const artifacts = useArtifacts(artifactQuery(view, consultStage), () => void refresh());

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
          setResuming(false);
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

  const handleNextStage = useCallback(async () => {
    pendingFocus.current = true;
    await actions.goToNextStage();
  }, [actions]);

  /** A etapa atual volta ao guia. As outras abrem só para consulta, sem mudar o momento (BR8.2). */
  const handleTrailSelect = useCallback(
    (slug: string) => {
      setConsultStage(slug === view?.stage.slug ? null : slug);
    },
    [view?.stage.slug],
  );

  const session = view?.session ?? null;
  const highlight =
    moment === 'pasted' ||
    moment === 'question' ||
    moment === 'approve' ||
    (moment === 'following' && view?.decision.turn === 'person');
  const consulting = consultStage !== null;
  const issue = commandIssue(draft);

  return (
    <div ref={appRef} className={collapsed ? 'app app-closed' : 'app'} data-testid="guide-app">
      <div className="left">
        <header className="top">
          <div
            className="brand"
            data-testid="guide-brand"
            role="button"
            tabIndex={0}
            onClick={() => setScreen('home')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setScreen('home');
            }}
          >
            <Logo />
            <span>vibes dlc</span>
          </div>
          <button
            type="button"
            className="btn2"
            data-testid="customize-open"
            onClick={() => setScreen('customize')}
          >
            Personalizar
          </button>
        </header>
        <div className={view ? 'panes with-rail' : 'panes'}>
          {view && currentScreen === 'guide' ? (
            <Trail phases={view.trail} onSelect={handleTrailSelect} />
          ) : null}
          <main className="main">
            {view && currentScreen === 'guide' ? (
              <StageHeader view={view} consulting={consulting} />
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
                {currentScreen === 'customize' ? (
                  <Customize
                    onChange={setCustom}
                    onClose={() => {
                      setScreen('guide');
                      void actions.refresh();
                    }}
                  />
                ) : null}
                {currentScreen === 'home' ? (
                  <Home
                    custom={custom}
                    onOpen={(id) => {
                      void actions.openDemand(id);
                      setScreen('guide');
                    }}
                    onNew={() => setScreen('new')}
                  />
                ) : null}
                {currentScreen === 'new' ? (
                  <NewDemand
                    custom={custom}
                    onCancel={() => setScreen('home')}
                    onCreated={() => setScreen('home')}
                  />
                ) : null}
                {currentScreen === 'tabs' && view ? (
                  <DemandTabs view={view} onBack={() => setScreen('guide')} />
                ) : null}
                {currentScreen === 'guide' && view?.decision.moment === 'not_active' ? (
                  <Activation intentId={view.intentId} onActivated={() => void actions.refresh()} />
                ) : null}
                {currentScreen === 'guide' && view ? (
                  <button data-testid="open-demand-tabs" onClick={() => setScreen('tabs')}>
                    Artefatos · Unidades e ciclos · Decisões · Histórico
                  </button>
                ) : null}
                {currentScreen === 'guide' && view && consultStage ? (
                  <ConsultBody stageSlug={consultStage} artifacts={artifacts} />
                ) : null}
                {currentScreen === 'guide' && view && !consultStage ? (
                  <GuideBody
                    view={view}
                    draft={draft}
                    commandIssue={issue}
                    failure={failure}
                    resuming={isResuming}
                    changedNotice={changedNotice}
                    artifacts={artifacts}
                    onDraft={(text) => setDraftEdit({ stage: stageSlug, text })}
                    onResetDraft={() => setDraftEdit(null)}
                    onResume={() => setResuming(true)}
                    onDismissChanged={actions.dismissChanged}
                  />
                ) : null}
                {view || currentScreen !== 'guide' ? null : (
                  <NoGuideBody state={state as Exclude<GuideState, { kind: 'guide' }>} />
                )}
              </div>
            </div>
            {view && currentScreen === 'guide' ? (
              <GuideBand
                view={view}
                resuming={isResuming}
                sendBlocked={sending || issue !== null}
                canMarkReviewed={Boolean(artifacts.list?.selected) && !artifacts.busy}
                consulting={consulting}
                onUnderstood={() => void handleUnderstood()}
                onSend={(mode) => void handleSend(mode)}
                onNewSession={() => void actions.openNewSession()}
                onRetry={() => void actions.openNewSession()}
                onMarkReviewed={() => void artifacts.markReviewed()}
                onNextStage={() => void handleNextStage()}
                onBackToGuide={() => setConsultStage(null)}
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
        hint={moment ? terminalHint(moment) : null}
        onToggle={() => setCollapsed((value) => !value)}
        onBackToGuide={focusInstruction}
        onEndSession={() => void actions.endSession()}
        onNewSession={() => void actions.openNewSession()}
        onSessionEnded={() => void actions.refresh()}
      />
    </div>
  );
}
