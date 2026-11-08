'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AI_OPTIONS, formatAiCommand } from '@/core/commands';
import { stageName } from '@/guide/stage-content';
import { findMoment } from '@/guide/customizable-moments';
import { applyTokens } from '@/customization/tokens';
import { levelLabel } from '@/guide/levels';
import { NewDemandWizard, type DemandDraft } from './new-demand-wizard';
import { buildDemandCommand, buildAnalysisCommand } from '@/triage/suggest-level';
import type { WorkspaceView } from '@/web/workspace-service';
import { useCustomization } from '@/web/client/use-customization';
import { applyColors } from '@/web/client/apply-colors';
import { TerminalPanel, type TerminalPanelHandle } from './terminal-panel';
import { Customize } from './customize';
import { Say } from './guide-parts';
import { Trail } from './trail';
import { Logo } from './logo';
import { CommandActions } from './command-actions';
import { AiPicker, PickerChevron } from './ai-picker';
import { DirectoryPicker } from './directory-picker';

type Preview = {
  contextId: string;
  commandId: string;
  text: string;
  kind: 'stage' | 'activate' | 'new' | 'analysis';
  intentId: string | null;
  activeIntentId: string | null;
  activeStage: string | null;
};
const MARK_LABELS = {
  pending: 'Pendente',
  in_progress: 'Em andamento no AI-DLC',
  awaiting_approval: 'Aprovação pendente',
  revising: 'Em revisão',
  approved: 'Concluída no estado',
  skipped: 'Pulada',
  unknown: 'Estado desconhecido',
};
async function workspacePost(body: unknown): Promise<void> {
  const response = await fetch('/api/workspace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(result.message || 'O painel não respondeu.'), {
      code: result.code,
    });
}

export function GuideApp() {
  const [view, setView] = useState<WorkspaceView | null>(null);
  const [query, setQuery] = useState<{ intent?: string; stage?: string; artifact?: string }>({});
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [projectForm, setProjectForm] = useState(false);
  const [projectPath, setProjectPath] = useState('');
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState<string | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<'artifacts' | 'units' | 'decisions'>('artifacts');
  const [newDemand, setNewDemand] = useState(false);
  const [home, setHome] = useState(true);
  const [draft, setDraft] = useState<DemandDraft>({
    step: 1,
    description: '',
    level: 'feature',
    showAll: false,
  });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<TerminalPanelHandle>(null);
  const { custom, setCustom } = useCustomization();
  const currentContext = useRef<{ id: string; path: string | null } | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function load() {
      try {
        const params = new URLSearchParams(query);
        const response = await fetch('/api/workspace?' + params, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Não foi possível ler o projeto.');
        if (stopped) return;
        const next = data as WorkspaceView;
        if (next.notice) {
          setFeedback(next.notice);
          if (query.artifact && next.detail) {
            setQuery((previous) => {
              const remaining = { ...previous };
              delete remaining.artifact;
              return remaining;
            });
          }
        }
        if (currentContext.current && currentContext.current.id !== next.contextId) {
          setPreview(null);
          setConfirmSwitch(null);
          if (currentContext.current.path !== (next.project?.path ?? null)) {
            setQuery({});
            setFeedback(null);
            setNewDemand(false);
            setHome(true);
            setDraft({ step: 1, description: '', level: 'feature', showAll: false });
          }
        }
        currentContext.current = { id: next.contextId, path: next.project?.path ?? null };
        setView(next);
        setError(null);
      } catch (failure) {
        if (!stopped)
          setError(failure instanceof Error ? failure.message : 'O painel não respondeu.');
      } finally {
        if (!stopped) timer = setTimeout(load, 2000);
      }
    }
    void load();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, refresh]);
  useEffect(() => {
    if (rootRef.current) applyColors(rootRef.current, custom);
  }, [custom]);
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if (event.key !== 'F6') return;
      event.preventDefault();
      event.stopPropagation();
      if (terminalRef.current?.hasFocus()) document.getElementById('guide-instruction')?.focus();
      else {
        setCollapsed(false);
        requestAnimationFrame(() => terminalRef.current?.focus());
      }
    };
    window.addEventListener('keydown', toggle, { capture: true });
    return () => window.removeEventListener('keydown', toggle, { capture: true });
  }, []);
  const run = useCallback(async (work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      await work();
    } catch (failure) {
      setFeedback(failure instanceof Error ? failure.message : 'Não foi possível concluir.');
    } finally {
      busyRef.current = false;
      setBusy(false);
      setRefresh((value) => value + 1);
    }
  }, []);
  const select = async (target: string, confirmed = false) => {
    if (!view) return;
    await run(async () => {
      try {
        await workspacePost({
          action: 'select',
          contextId: view.contextId,
          path: target,
          confirmedSession: confirmed ? (view.session?.sessionId ?? null) : null,
        });
        setQuery({});
        setHome(true);
        setNewDemand(false);
        setPreview(null);
        setProjectForm(false);
        setDirectoryOpen(false);
        setConfirmSwitch(null);
      } catch (failure) {
        if (failure instanceof Error && 'code' in failure && failure.code === 'confirm_session') {
          setConfirmSwitch(target);
          setDirectoryOpen(false);
          return;
        }
        throw failure;
      }
    });
  };
  const prepare = (text: string, kind: Preview['kind'], intentId: string | null) => {
    if (!view?.project) return;
    setFeedback(null);
    setPreview({
      contextId: view.contextId,
      commandId: crypto.randomUUID(),
      text: formatAiCommand(text, view.project.ai),
      kind,
      intentId,
      activeIntentId: view.activeIntentId,
      activeStage: view.activeStage,
    });
    requestAnimationFrame(() => document.getElementById('command-preview')?.focus());
  };
  const send = (mode: 'execute' | 'paste') => {
    if (!view || !preview) return;
    void run(async () => {
      await workspacePost({
        action: 'send',
        ...preview,
        sessionId: view.session?.sessionId ?? '',
        mode,
      });
      setPreview(null);
      setCollapsed(false);
      setFeedback(
        mode === 'paste'
          ? 'Comando colado. Pressione Enter no terminal quando estiver pronto.'
          : 'Comando escrito no terminal. O andamento será atualizado quando o AI-DLC registrar mudanças.',
      );
    });
  };
  const detail = view?.detail;
  const project = view?.project;
  const active = detail?.intentId === view?.activeIntentId;
  const activePreview = preview?.contextId === view?.contextId ? preview : null;
  const invalidCommand =
    !activePreview?.text.trim() ||
    activePreview.text.length > 8000 ||
    /[\u0000-\u001f\u007f]/.test(activePreview.text);
  const uiUnavailable = busy || Boolean(error) || Boolean(view?.error);
  let momentKey = 'home';
  if (detail && !home && !newDemand) {
    momentKey =
      detail.mark === 'awaiting_approval'
        ? 'approve'
        : detail.gateRejected || detail.mark === 'revising'
          ? 'revising'
          : detail.progress.total > 0 &&
              detail.progress.done === detail.progress.total &&
              detail.gateApproved
            ? 'trail_done'
            : 'following';
  }
  const moment = findMoment(momentKey)!;
  const values = { etapa: detail ? stageName(detail.stage) : '' };
  const media = custom?.media[momentKey];
  const original = { src: moment.defaultArtSrc, alt: moment.name };
  const art = media
    ? {
        src: media.url,
        alt: moment.name,
        kind: media.contentType.startsWith('video/') ? ('video' as const) : ('image' as const),
        fallback: original,
      }
    : original;
  const notices = (
    <>
      {error ? (
        <p role="alert" className="notice-error">
          {error}{' '}
          <button className="btn2" onClick={() => setRefresh((v) => v + 1)}>
            Tentar novamente
          </button>
        </p>
      ) : null}
      {view?.error ? (
        <p role="alert" className="notice-error">
          {view.error}
        </p>
      ) : null}
      {feedback ? (
        <p role="status" className="card card-pad">
          {feedback}
        </p>
      ) : null}
    </>
  );

  const commandPreview = activePreview ? (
    <section className="card card-pad stack-14" aria-label="Confirmar envio">
      <h2 className="section-title">Confira o comando</h2>
      <p>
        Abra {project ? AI_OPTIONS[project.ai] : 'a IA'} no terminal antes de enviar. A seleção não
        troca a ferramenta aberta.
      </p>
      <CommandActions text={activePreview.text}>
        <label htmlFor="command-preview" className="visually-hidden">
          Comando a enviar
        </label>
        <textarea
          id="command-preview"
          className="field mono"
          rows={3}
          value={activePreview.text}
          maxLength={8000}
          onChange={(event) =>
            setPreview({
              ...activePreview,
              commandId: crypto.randomUUID(),
              text: event.target.value,
            })
          }
        />
      </CommandActions>
      {invalidCommand ? (
        <p role="alert">
          Use uma única linha, sem caracteres de controle e com até 8000 caracteres.
        </p>
      ) : null}
      <div className="workspace-actions">
        <button
          className="cta"
          disabled={uiUnavailable || invalidCommand || view?.session?.status !== 'alive'}
          onClick={() => send('execute')}
        >
          Confirmar e executar
        </button>
        <button
          className="btn2"
          disabled={uiUnavailable || invalidCommand || view?.session?.status !== 'alive'}
          onClick={() => send('paste')}
        >
          Colar sem executar
        </button>
        <button className="btn2" disabled={busy} onClick={() => setPreview(null)}>
          Cancelar
        </button>
      </div>
      {view?.session?.status !== 'alive' ? <p>Abra uma sessão no terminal para enviar.</p> : null}
    </section>
  ) : null;

  return (
    <div ref={rootRef} className={collapsed ? 'app app-term-closed' : 'app'}>
      <div className="left">
        <header className="top workspace-top">
          <button
            className="brand"
            type="button"
            aria-label="Vibes DLC, início"
            onClick={() => {
              setQuery({});
              setNewDemand(false);
              setCustomizing(false);
              setHome(true);
              setPreview(null);
            }}
          >
            <Logo />
            <span>vibes dlc</span>
          </button>
          <button
            className="context-picker project-picker"
            type="button"
            title={project?.path}
            aria-expanded={projectForm}
            onClick={() => setProjectForm((v) => !v)}
          >
            <span className="picker-label">Projeto: {project?.name ?? 'Selecionar'}</span>
            <PickerChevron />
          </button>
          <AiPicker
            value={project?.ai ?? 'claude_code'}
            disabled={!project || busy}
            onChange={(ai) => {
              void run(async () => {
                await workspacePost({ action: 'ai', contextId: view!.contextId, ai });
                setPreview(null);
                setFeedback(
                  'A seleção altera os próximos comandos. A ferramenta aberta no terminal continua a mesma.',
                );
              });
            }}
          />
          <button className="btn2" type="button" onClick={() => setCustomizing((v) => !v)}>
            Personalizar
          </button>
        </header>
        <p className="workspace-context">
          {project?.path ?? 'Selecione um repositório local com AI-DLC.'} · A IA é aberta
          manualmente no terminal.
        </p>
        {projectForm || !project ? (
          <section className="project-form card card-pad" aria-label="Selecionar projeto">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setFeedback(null);
                setDirectoryOpen(true);
              }}
            >
              <label htmlFor="project-path">Caminho absoluto do repositório</label>
              <div className="workspace-actions">
                <input
                  id="project-path"
                  className="field"
                  value={projectPath}
                  readOnly
                  disabled={!view || busy}
                  onClick={() => {
                    setFeedback(null);
                    setDirectoryOpen(true);
                  }}
                  placeholder="Clique para selecionar a pasta"
                  aria-haspopup="dialog"
                />
                <button
                  type="button"
                  className="cta"
                  disabled={!view || busy}
                  onClick={() => {
                    setFeedback(null);
                    setDirectoryOpen(true);
                  }}
                >
                  Escolher pasta
                </button>
              </div>
            </form>
            {view?.recent.length ? (
              <div className="workspace-actions" aria-label="Projetos recentes">
                {view.recent.map((item) => (
                  <div className="recent-project-item" key={item.path}>
                    <button
                      type="button"
                      className="btn2 recent-project"
                      title={item.path}
                      disabled={busy}
                      onClick={() => void select(item.path)}
                    >
                      {item.path}
                    </button>
                    <button
                      type="button"
                      className="recent-project-remove"
                      aria-label={`Remover ${item.path} dos recentes`}
                      title="Remover dos recentes"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await workspacePost({
                            action: 'forget',
                            contextId: view.contextId,
                            path: item.path,
                          });
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
        {directoryOpen ? (
          <DirectoryPicker
            initialPath={projectPath || project?.path}
            busy={busy}
            error={feedback}
            onSelect={(path) => {
              setProjectPath(path);
              void select(path);
            }}
            onClose={() => setDirectoryOpen(false)}
          />
        ) : null}
        {confirmSwitch ? (
          <section
            className="card card-pad project-form"
            role="alertdialog"
            aria-modal="false"
            aria-labelledby="switch-title"
          >
            <h2 id="switch-title">Encerrar o terminal para trocar de projeto?</h2>
            <p>Isso interrompe a IA e os processos desta sessão. Destino: {confirmSwitch}</p>
            <div className="workspace-actions">
              <button
                className="cta"
                disabled={busy}
                onClick={() => void select(confirmSwitch, true)}
              >
                Encerrar e trocar
              </button>
              <button className="btn2" disabled={busy} onClick={() => setConfirmSwitch(null)}>
                Cancelar
              </button>
            </div>
          </section>
        ) : null}
        <div
          className={detail && !customizing && !home && !newDemand ? 'panes with-rail' : 'panes'}
        >
          {detail && !customizing && !home && !newDemand ? (
            <Trail
              phases={detail.trail}
              onSelect={(stage) => {
                setQuery({ intent: detail.intentId, stage });
                setTab('artifacts');
              }}
            />
          ) : null}
          <main className="main">
            {customizing ? (
              <Customize
                notices={notices}
                onChange={setCustom}
                onClose={() => setCustomizing(false)}
              />
            ) : newDemand && project ? (
              <NewDemandWizard
                key={project.path}
                draft={draft}
                onDraftChange={setDraft}
                notices={notices}
                preview={commandPreview}
                disabled={uiUnavailable}
                onCancel={() => {
                  setNewDemand(false);
                  setDraft({ step: 1, description: '', level: 'feature', showAll: false });
                  setHome(true);
                  setPreview(null);
                }}
                onChange={() => setPreview(null)}
                onPrepare={(description, level) =>
                  prepare(
                    buildDemandCommand(description, level, Boolean(view?.activeIntentId)),
                    'new',
                    null,
                  )
                }
                onAnalyze={(description) =>
                  prepare(buildAnalysisCommand(description), 'analysis', null)
                }
              />
            ) : (
              <div className="scroll">
                <div className="scroll-body">
                  {notices}
                  {!view ? <p role="status">Abrindo o painel…</p> : null}
                  {project && !newDemand ? (
                    <>
                      <Say
                        art={art}
                        eyebrow={home ? 'Bem-vindo' : (detail?.title ?? 'AI-DLC')}
                        title={applyTokens(
                          custom?.says[momentKey]?.title || moment.defaultTitle,
                          moment.tokens,
                          values,
                        )}
                        text={applyTokens(
                          custom?.says[momentKey]?.text || moment.defaultText,
                          moment.tokens,
                          values,
                        )}
                      />
                      <div className="workspace-actions">
                        <button
                          className="btn2"
                          disabled={busy}
                          onClick={() => {
                            setNewDemand(true);
                            setPreview(null);
                          }}
                        >
                          Nova demanda
                        </button>
                        <button
                          className="btn2"
                          onClick={() => {
                            setQuery({});
                            setHome(false);
                            setNewDemand(false);
                          }}
                        >
                          Demanda ativa
                        </button>
                        <button className="btn2" onClick={() => setRefresh((v) => v + 1)}>
                          Atualizar arquivos
                        </button>
                      </div>
                      {home ? (
                        <section className="stack-8" aria-label="Demandas">
                          {view?.demands.map((d) => (
                            <button
                              type="button"
                              className="row"
                              key={d.intentId}
                              onClick={() => {
                                setQuery({ intent: d.intentId });
                                setHome(false);
                                setNewDemand(false);
                                setPreview(null);
                              }}
                            >
                              <span className="row-main">
                                <strong className="row-title">{d.title}</strong>
                                <span className="row-meta">
                                  {levelLabel(d.scope)} ·{' '}
                                  {d.currentStage
                                    ? `Agora: ${stageName(d.currentStage)}`
                                    : 'Sem etapa em andamento'}
                                  {d.readable ? '' : ' · Registro indisponível'}
                                  {d.stale
                                    ? ' · Dados desatualizados; aguardando nova leitura'
                                    : ''}
                                </span>
                                {d.progress ? (
                                  <progress
                                    aria-label={`Progresso de ${d.title}`}
                                    value={d.progress.done}
                                    max={Math.max(1, d.progress.total)}
                                  />
                                ) : null}
                              </span>
                              <span className="tag">
                                {d.stale
                                  ? 'Dados desatualizados'
                                  : d.progress &&
                                      d.progress.total > 0 &&
                                      d.progress.done === d.progress.total
                                    ? 'Etapas concluídas'
                                    : d.isActive
                                      ? 'Continuar'
                                      : 'Abrir demanda'}
                              </span>
                            </button>
                          ))}
                          {view && !view.demands.length && !view.error ? (
                            <p>Nenhuma demanda registrada neste espaço do AI-DLC.</p>
                          ) : null}
                        </section>
                      ) : null}
                    </>
                  ) : null}
                  {commandPreview}
                  {detail && !newDemand && !home ? (
                    <section className="stack-14">
                      <div className="card card-pad stack-8">
                        <h2 className="section-title">
                          {stageName(detail.stage)}
                          {detail.unit ? ' · ' + detail.unit : ''}
                        </h2>
                        <p>
                          {MARK_LABELS[detail.mark]}
                          {detail.gateApproved ? ' · Aprovação registrada' : ''}
                          {detail.gateRejected ? ' · Rejeição registrada' : ''}
                        </p>
                        <progress
                          aria-label="Progresso das etapas"
                          value={detail.progress.done}
                          max={Math.max(1, detail.progress.total)}
                        />
                        <span>
                          {detail.progress.done} de {detail.progress.total} etapas concluídas no
                          estado
                        </span>
                        <span className="row-meta">
                          Última mudança nos arquivos:{' '}
                          {new Date(detail.lastChangedAt).toLocaleString('pt-BR')}
                        </span>
                        <div className="workspace-actions">
                          <button
                            className="cta"
                            disabled={uiUnavailable || detail.stale}
                            onClick={() =>
                              prepare(
                                active ? '/aidlc' : '/aidlc intent switch ' + detail.intentId,
                                active ? 'stage' : 'activate',
                                detail.intentId,
                              )
                            }
                          >
                            {active
                              ? 'Conferir comando de continuidade'
                              : 'Conferir ativação desta demanda'}
                          </button>
                        </div>
                        <p className="row-meta">
                          Aprovações e respostas acontecem no terminal. Arquivos sem atualização não
                          indicam se a IA está trabalhando.
                        </p>
                      </div>
                      <nav className="workspace-actions" aria-label="Consultas">
                        {(['artifacts', 'units', 'decisions'] as const).map((value, i) => (
                          <button
                            className={tab === value ? 'ctab ctab-on' : 'ctab'}
                            key={value}
                            onClick={() => setTab(value)}
                            aria-pressed={tab === value}
                          >
                            {['Artefatos', 'Unidades', 'Decisões'][i]}
                          </button>
                        ))}
                      </nav>
                      {tab === 'artifacts' ? (
                        <section className="stack-8" aria-label="Artefatos">
                          <h3>{stageName(detail.shownStage)}</h3>
                          <div className="workspace-actions">
                            {detail.artifacts.map((item) => (
                              <button
                                className="pillb"
                                aria-pressed={detail.selected?.path === item.path}
                                key={item.path}
                                onClick={() =>
                                  setQuery({
                                    intent: detail.intentId,
                                    ...(query.stage ? { stage: query.stage } : {}),
                                    artifact: item.path,
                                  })
                                }
                              >
                                {item.name}
                              </button>
                            ))}
                          </div>
                          {detail.selected ? (
                            <article className="card card-pad">
                              <p className="mono artifact-path">{detail.selected.path}</p>
                              <pre className="artifact-text">
                                {detail.selected.content ??
                                  (detail.selected.omittedReason === 'too_large'
                                    ? 'Arquivo maior que 2 MB. Abra-o no editor.'
                                    : 'Arquivo binário. Abra-o no editor.')}
                              </pre>
                            </article>
                          ) : (
                            <p>Nenhum artefato disponível nesta etapa.</p>
                          )}
                        </section>
                      ) : null}
                      {tab === 'units' ? (
                        <section className="stack-8" aria-label="Unidades">
                          {detail.units.map((unit) => (
                            <article className="card card-pad" key={unit.unitName}>
                              <strong>{unit.unitName}</strong>
                              <p>{unit.description}</p>
                              <p>
                                {
                                  {
                                    pending: 'Pendente',
                                    in_progress: 'Em andamento',
                                    built: 'Construída',
                                    approved: 'Aprovada',
                                  }[unit.status]
                                }
                                {unit.lastStage ? ' · ' + stageName(unit.lastStage) : ''}
                              </p>
                            </article>
                          ))}
                          {!detail.units.length ? <p>Nenhuma unidade registrada.</p> : null}
                        </section>
                      ) : null}
                      {tab === 'decisions' ? (
                        <section className="stack-8" aria-label="Decisões">
                          {detail.decisions.map((decision, index) => (
                            <article className="card card-pad" key={decision.at + index}>
                              <strong>
                                {
                                  {
                                    question: 'Pergunta',
                                    answer: 'Resposta',
                                    approval: 'Aprovação',
                                    rejection: 'Rejeição',
                                    review: 'Revisão',
                                  }[decision.kind]
                                }
                              </strong>
                              <p>{decision.text}</p>
                              <span className="row-meta">
                                {decision.stage ? stageName(decision.stage) + ' · ' : ''}
                                {new Date(decision.at).toLocaleString('pt-BR')}
                              </span>
                            </article>
                          ))}
                          {!detail.decisions.length ? <p>Nenhuma decisão registrada.</p> : null}
                        </section>
                      ) : null}
                    </section>
                  ) : null}
                </div>
              </div>
            )}
            {project && home && !newDemand && !customizing ? (
              <div className="band">
                <span className="band-txt">Quer começar outro trabalho?</span>
                <button
                  className="cta"
                  disabled={busy}
                  onClick={() => {
                    setNewDemand(true);
                    setPreview(null);
                  }}
                >
                  Nova demanda
                </button>
              </div>
            ) : null}
          </main>
        </div>
      </div>
      {project ? (
        <TerminalPanel
          key={view.contextId + ':' + (view.session?.sessionId ?? 'none')}
          ref={terminalRef}
          sessionId={view.session?.sessionId ?? null}
          status={view.session?.status ?? 'none'}
          title={view.terminalTitle}
          collapsed={collapsed}
          highlight={detail?.mark === 'awaiting_approval'}
          hint={
            detail?.mark === 'awaiting_approval'
              ? 'Consulte os artefatos e responda ao gate do AI-DLC no terminal.'
              : null
          }
          onToggle={() => setCollapsed((value) => !value)}
          onBackToGuide={() => document.getElementById('guide-instruction')?.focus()}
          onEndSession={() =>
            void run(() =>
              workspacePost({
                action: 'end',
                contextId: view.contextId,
                sessionId: view.session?.sessionId,
              }),
            )
          }
          onNewSession={() =>
            void run(() => workspacePost({ action: 'session', contextId: view.contextId }))
          }
          onSessionEnded={() => setRefresh((v) => v + 1)}
        />
      ) : (
        <aside className="term empty-terminal">
          <p>Selecione um projeto para abrir o terminal.</p>
        </aside>
      )}
    </div>
  );
}
