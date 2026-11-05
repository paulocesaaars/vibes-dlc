'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GuideDecision, Moment } from '@/core/types';
import { momentContent, NO_ACTIVE_INTENT_CONTENT, terminalHint } from '@/guide/moment-content';
import { REPO_SETUP_STEPS, REPO_SETUP_TITLE } from '@/guide/repo-setup';
import type { ArtifactQuery } from '@/web/client/use-artifacts';
import { useArtifacts } from '@/web/client/use-artifacts';
import { applyColors } from '@/web/client/apply-colors';
import { useCustomization } from '@/web/client/use-customization';
import { useGuide, type GuideState } from '@/web/client/use-guide';
import { postInput } from '@/web/client/api';
import type { GuideView } from '@/web/guide-service';
import { GuideBand } from './guide-band';
import { ConsultBody, GuideBody } from './guide-body';
import { Say, StepBar, UnderstandCard } from './guide-parts';
import { Logo } from './logo';
import { TerminalPanel, type TerminalPanelHandle } from './terminal-panel';
import { Trail } from './trail';
import { Customize } from './customize';
import {
  Activation,
  DemandTabBar,
  DemandTabs,
  Home,
  NewDemand,
  type DemandTab,
  type HubScreen,
} from './demand-hub';

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

function NoGuideBody({
  state,
  onSendCommand,
  sendDisabled,
}: {
  state: Exclude<GuideState, { kind: 'guide' }>;
  onSendCommand: (text: string) => Promise<void>;
  sendDisabled: boolean;
}) {
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
    <>
      <Say art={content.art} eyebrow={content.eyebrow} title={content.title} text={content.text} />
      {state.health === 'missing_aidlc' ? (
        <UnderstandCard
          steps={REPO_SETUP_STEPS}
          title={REPO_SETUP_TITLE}
          onSendCommand={onSendCommand}
          sendDisabled={sendDisabled}
        />
      ) : null}
    </>
  );
}

function artifactQuery(view: GuideView | null, consultStage: string | null): ArtifactQuery | null {
  if (!view) return null;
  const base = { intentId: view.intentId, version: view.lastChangedAt };
  if (consultStage) return { ...base, stage: consultStage, unit: null, consult: true };
  if (!ARTIFACT_MOMENTS.includes(view.decision.moment) || !view.stage.slug) return null;
  return { ...base, stage: view.stage.slug, unit: view.stage.unit, consult: false };
}

function StageHeader({
  view,
  consulting,
  tab,
  onPickTab,
}: {
  view: GuideView;
  consulting: boolean;
  tab: DemandTab;
  onPickTab: (tab: DemandTab) => void;
}) {
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
        <span className="stage-title">
          <strong
            data-testid="guide-stage-name"
            style={{ fontWeight: 900, fontSize: 17, minWidth: 0 }}
          >
            {label}
          </strong>
          <span className="tag" data-testid="guide-turn" style={{ color: 'var(--blueText)' }}>
            {view.content.turnLabel}
          </span>
        </span>
        <DemandTabBar
          intentId={view.intentId}
          version={view.lastChangedAt}
          tab={tab}
          onPick={onPickTab}
        />
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
  const { state, actions, loadError, changedNotice, staleSessionFolder, looseSession } = useGuide();
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
  const [tab, setTab] = useState<DemandTab>('guide');
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
      setTab('guide');
      setConsultStage(slug === view?.stage.slug ? null : slug);
    },
    [view?.stage.slug],
  );

  // Fora de uma demanda (falha, início), a sessão vem solta: é nela que se instala o AI-DLC.
  const session = view?.session ?? looseSession;
  async function sendSetupCommand(text: string): Promise<void> {
    if (!session?.sessionId || session.status !== 'alive') {
      throw new Error('Abra uma sessão no terminal ao lado antes de enviar.');
    }
    if (staleSessionFolder) {
      throw new Error('Abra uma nova sessão na pasta do projeto antes de enviar.');
    }
    if (
      commandIssue(text) ||
      Array.from(text).some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    ) {
      throw new Error('O comando precisa ter uma única linha, sem caracteres de controle.');
    }
    await postInput(session.sessionId, text);
    setCollapsed(false);
    requestAnimationFrame(() => terminalRef.current?.focus());
  }
  const highlight =
    moment === 'pasted' ||
    moment === 'question' ||
    moment === 'approve' ||
    (moment === 'following' && view?.decision.turn === 'person');
  const consulting = consultStage !== null;
  const issue = commandIssue(draft);
  const onGuideScreen = currentScreen === 'guide';
  const onDemandTab = view && onGuideScreen && tab !== 'guide' ? tab : null;
  const notices = (
    <>
      {loadError ? (
        <p role="alert" className="notice-error" data-testid="guide-load-error">
          {loadError}
        </p>
      ) : null}
      {staleSessionFolder ? (
        <p role="status" className="notice-error" data-testid="stale-session-notice">
          <strong>Atenção:</strong> a sessão aberta do terminal ficou na pasta antiga (
          {staleSessionFolder}). Para trabalhar na pasta do projeto, encerre esta sessão e abra uma
          nova.{' '}
          <button
            type="button"
            className="btn2"
            data-testid="stale-session-new-session"
            onClick={() => void actions.restartSession()}
          >
            Encerrar e abrir nova sessão
          </button>
        </p>
      ) : null}
    </>
  );

  return (
    <div ref={appRef} className={collapsed ? 'app app-closed' : 'app'} data-testid="guide-app">
      <div className="left">
        <header className="top">
          <button
            type="button"
            className="brand"
            data-testid="guide-brand"
            aria-label="Vibes DLC, ir para o início"
            onClick={() => setScreen('home')}
          >
            <Logo />
            <span>vibes dlc</span>
          </button>
          <span style={{ flex: '1 1 auto' }} />
          <button
            type="button"
            className={currentScreen === 'customize' ? 'ctab ctab-on' : 'ctab'}
            data-testid="customize-open"
            aria-current={currentScreen === 'customize' ? 'page' : undefined}
            onClick={() => setScreen('customize')}
          >
            Personalizar
          </button>
        </header>
        <div className={view && onGuideScreen ? 'panes with-rail' : 'panes'}>
          {view && onGuideScreen ? (
            <Trail phases={view.trail} onSelect={handleTrailSelect} />
          ) : null}
          <main className="main">
            {view && onGuideScreen ? (
              <StageHeader view={view} consulting={consulting} tab={tab} onPickTab={setTab} />
            ) : null}
            {currentScreen === 'customize' ? (
              <Customize
                notices={notices}
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
                notices={notices}
                onOpen={(id) => {
                  setTab('guide');
                  void actions.openDemand(id);
                  setScreen('guide');
                }}
                onNew={() => setScreen('new')}
              />
            ) : null}
            {currentScreen === 'new' ? (
              <NewDemand
                custom={custom}
                notices={notices}
                onCancel={() => setScreen('home')}
                onCreated={() => setScreen('home')}
              />
            ) : null}
            {onGuideScreen ? (
              <div className="scroll">
                <div className="scroll-body">
                  {notices}
                  {onDemandTab && view ? <DemandTabs view={view} tab={onDemandTab} /> : null}
                  {!onDemandTab && view?.decision.moment === 'not_active' ? (
                    <Activation
                      intentId={view.intentId}
                      onActivated={() => void actions.refresh()}
                    />
                  ) : null}
                  {!onDemandTab && view && consultStage ? (
                    <ConsultBody stageSlug={consultStage} artifacts={artifacts} />
                  ) : null}
                  {!onDemandTab && view && !consultStage ? (
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
                  {view ? null : (
                    <NoGuideBody
                      state={state as Exclude<GuideState, { kind: 'guide' }>}
                      onSendCommand={sendSetupCommand}
                      sendDisabled={session?.status !== 'alive' || Boolean(staleSessionFolder)}
                    />
                  )}
                </div>
              </div>
            ) : null}
            {onDemandTab ? (
              <div className="band" data-testid="tabs-band">
                <span className="band-txt">
                  Você está consultando. O guia continua de onde parou.
                </span>
                <button
                  type="button"
                  className="cta"
                  data-testid="tabs-back"
                  onClick={() => setTab('guide')}
                >
                  Voltar ao guia
                </button>
              </div>
            ) : view && onGuideScreen ? (
              <GuideBand
                view={view}
                resuming={isResuming}
                sendBlocked={sending || issue !== null}
                canMarkReviewed={Boolean(artifacts.list?.selected) && !artifacts.busy}
                consulting={consulting}
                onUnderstood={() => void handleUnderstood()}
                onSend={(mode) => void handleSend(mode)}
                onNewSession={() => void actions.openNewSession()}
                onRetry={() => void actions.recheck().then(() => actions.openNewSession())}
                onMarkReviewed={() => void artifacts.markReviewed()}
                onNextStage={() => void handleNextStage()}
                onBackToGuide={() => setConsultStage(null)}
              />
            ) : state.kind === 'repo_failure' && onGuideScreen ? (
              <div className="band" data-testid="guide-band">
                <span className="band-txt" data-testid="guide-failure-band-text">
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3 2 21h20L12 3zM12 10v5M12 18v.5" />
                  </svg>{' '}
                  O guia não consegue seguir ainda. Resolva o que está escrito acima e tente de
                  novo.
                </span>
                <button
                  className="cta"
                  type="button"
                  data-testid="guide-retry-button"
                  onClick={() => void actions.recheck()}
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
        title={view?.terminalTitle ?? looseSession?.terminalTitle ?? 'MINGW64'}
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
