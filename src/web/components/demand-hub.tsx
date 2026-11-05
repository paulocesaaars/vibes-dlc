'use client';

import { type ReactNode, useEffect, useState } from 'react';
import type { DemandRow, DecisionRow, UnitRow } from '@/aidlc/demand-browser';
import type { CliKind } from '@/core/types';
import type { ArtifactNote } from '@/db/artifact-note-repo';
import type { SentCommand } from '@/db/sent-command-repo';
import {
  buildAnalysisCommand,
  buildDemandCommand,
  suggestLevel,
  type Level,
} from '@/triage/suggest-level';
import {
  fetchCommandHistory,
  fetchDecisions,
  fetchDemands,
  fetchDemandRows,
  fetchNotes,
  fetchUnits,
  postActivate,
  postNewDemandCommand,
  postNote,
} from '@/web/client/api';
import { newCommandId } from '@/web/client/terminal-io';
import { useArtifacts } from '@/web/client/use-artifacts';
import type { GuideView } from '@/web/guide-service';
import type { CustomizationState } from '@/customization/customization-service';
import { applyTokens } from '@/customization/tokens';
import { findMoment } from '@/guide/customizable-moments';
import { LEVELS, levelLabel } from '@/guide/levels';
import type { GuideArt } from '@/guide/moment-content';
import { stageName } from '@/guide/stage-content';
import { customArt } from '@/web/compose-moment';
import { ArtifactCard, ArtifactList } from './artifact-panel';
import { Say } from './guide-parts';
import { ScreenFrame } from './screen-frame';
import { CommandActions } from './command-actions';

export type DemandTab = 'guide' | 'artifacts' | 'units' | 'decisions' | 'history';
export type HubScreen = 'guide' | 'home' | 'new' | 'customize';

const TURN_TEXT: Record<DemandRow['turn'], string> = {
  person: 'Sua vez',
  ai: 'Vez da sua IA',
  guide: 'Vez do guia',
  unknown: 'Abra para ver de quem é a vez',
};

const UNIT_STATUS: Record<UnitRow['status'], string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  built: 'Construída',
  approved: 'Aprovada',
};

const DECISION_KIND: Record<DecisionRow['kind'], string> = {
  question: 'Pergunta',
  answer: 'Resposta',
  approval: 'Aprovação',
  rejection: 'Alterações pedidas',
  review: 'Revisão',
};

function formatMoment(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('pt-BR');
}

/** Título, frase e arte de um momento da navegação, com a personalização aplicada. */
function momentSay(
  custom: CustomizationState | null | undefined,
  momentKey: string,
  values: Record<string, string> = {},
): { title: string; text: string; art: GuideArt } {
  const moment = findMoment(momentKey);
  if (!moment) throw new Error(`Momento desconhecido: ${momentKey}`);
  const says = custom?.says[momentKey];
  const media = custom?.media[momentKey];
  const original: GuideArt = { src: moment.defaultArtSrc, alt: moment.name };
  return {
    title: applyTokens(says?.title ?? moment.defaultTitle, moment.tokens, values),
    text: applyTokens(says?.text ?? moment.defaultText, moment.tokens, values),
    art: media ? customArt(original, media) : original,
  };
}

function rowStage(row: DemandRow): string {
  if (row.totalCount > 0 && row.doneCount >= row.totalCount) return 'Todas as etapas aprovadas';
  return row.stageLabel ? `Agora: ${stageName(row.stageLabel)}` : 'Sem etapa em andamento';
}

function DemandLine({ row, index, onOpen }: { row: DemandRow; index: number; onOpen: () => void }) {
  const share = row.totalCount > 0 ? row.doneCount / row.totalCount : 0;
  return (
    <button
      type="button"
      className="row"
      data-testid="demand-row"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onOpen}
    >
      <span className="row-main">
        <span className="row-title">{row.title}</span>
        <span className="row-meta">
          {levelLabel(row.scope)} · {rowStage(row)}
        </span>
        <span className="track">
          <span className="track-fill" style={{ transform: `scaleX(${share.toFixed(3)})` }} />
        </span>
        {row.readable ? null : (
          <span className="notice-error">Registro ilegível: {row.failedPath}</span>
        )}
      </span>
      {row.isActive ? <span className="tag">Ativa</span> : null}
      <span className="tag" style={{ color: 'var(--blueText)' }}>
        {TURN_TEXT[row.turn]}
      </span>
    </button>
  );
}

export function Home({
  onOpen,
  onNew,
  custom,
  notices,
}: {
  onOpen: (intentId: string) => void;
  onNew: () => void;
  custom?: CustomizationState | null;
  notices?: ReactNode;
}) {
  const shown = momentSay(custom, 'home');
  const [rows, setRows] = useState<DemandRow[]>([]);
  useEffect(() => {
    void fetchDemandRows().then(setRows);
    const events = new EventSource('/api/events');
    events.addEventListener('changed', () => void fetchDemandRows().then(setRows));
    return () => events.close();
  }, []);
  return (
    <ScreenFrame
      testId="demand-home"
      notices={notices}
      band={
        <div className="band" data-testid="home-band">
          <span className="band-txt">Quer começar outro trabalho?</span>
          <button type="button" className="cta" data-testid="new-demand" onClick={onNew}>
            Nova demanda
          </button>
        </div>
      }
    >
      <Say art={shown.art} eyebrow="Bem-vindo" title={shown.title} text={shown.text} />
      {rows.length === 0 ? (
        <p className="muted">Nenhuma demanda ainda. Crie a primeira para começar.</p>
      ) : (
        <div className="fade stack-10">
          {rows.map((row, index) => (
            <DemandLine
              key={row.intentId}
              row={row}
              index={index}
              onOpen={() => onOpen(row.intentId)}
            />
          ))}
        </div>
      )}
    </ScreenFrame>
  );
}

type NewDemandStep = 'describe' | 'level' | 'confirm' | 'waiting';

const WAITING_SAY = {
  title: 'Esperando a sua IA',
  text: 'Esperando sua IA criar a demanda. Ela pode fazer perguntas no terminal. Se demorar mais de 10 minutos, confira o terminal.',
  art: { src: '/guia/trabalhando.webp', alt: 'A Nix esperando a sua IA trabalhar' },
};

function ScopeCard({
  level,
  suggested,
  picked,
  index,
  onPick,
}: {
  level: (typeof LEVELS)[number];
  suggested: boolean;
  picked: boolean;
  index: number;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={picked ? 'scope scope-on' : 'scope'}
      data-testid={`scope-${level.name}`}
      aria-pressed={picked}
      style={{ animationDelay: `${index * 40}ms` }}
      onClick={onPick}
    >
      <span className="scope-head">
        <strong className="row-title">{level.label}</strong>
        {suggested ? (
          <span className="eyebrow" style={{ color: '#222222' }}>
            Sugerido
          </span>
        ) : null}
      </span>
      <span>{level.description}</span>
      <span className="row-meta">Profundidade {level.depth}</span>
    </button>
  );
}

export function NewDemand({
  onCancel,
  onCreated,
  custom,
  notices,
}: {
  onCancel: () => void;
  onCreated: () => void;
  custom?: CustomizationState | null;
  notices?: ReactNode;
}) {
  const [step, setStep] = useState<NewDemandStep>('describe');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<Level>('feature');
  const [suggested, setSuggested] = useState<Level>('feature');
  const [showAll, setShowAll] = useState(false);
  const [reason, setReason] = useState('');
  const [command, setCommand] = useState('');
  const [kind, setKind] = useState<'new_demand' | 'analysis'>('new_demand');
  const [issue, setIssue] = useState<string | null>(null);
  const [hasActiveWork, setHasActiveWork] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [cliKind, setCliKind] = useState<CliKind>('other');
  useEffect(() => {
    void fetchDemands()
      .then((response) => {
        const rows = response.rows ?? [];
        setCliKind(response.cliKind ?? 'claude_code');
        setSeenIds(rows.map((row) => row.intentId));
        setHasActiveWork(
          rows.some((row) => row.isActive && row.readable && row.doneCount < row.totalCount),
        );
      })
      .catch(() => setHasActiveWork(false));
  }, []);
  useEffect(() => {
    if (step !== 'waiting') return;
    const events = new EventSource('/api/events');
    const check = () =>
      void fetchDemandRows().then((rows) => {
        if (rows.some((row) => row.readable && !seenIds.includes(row.intentId))) onCreated();
      });
    events.addEventListener('changed', check);
    return () => events.close();
  }, [step, seenIds, onCreated]);
  function next() {
    if (step === 'describe' && description.trim()) {
      const suggestion = suggestLevel(description);
      setScope(suggestion.scope);
      setSuggested(suggestion.scope);
      setShowAll(false);
      setReason(suggestion.reason);
      setStep('level');
    } else if (step === 'level') {
      setKind('new_demand');
      setCommand(buildDemandCommand(description, scope, hasActiveWork));
      setStep('confirm');
    }
  }
  async function send(mode: 'execute' | 'paste') {
    if (cliKind !== 'claude_code') return;
    setIssue(null);
    const result = await postNewDemandCommand({
      commandId: newCommandId(),
      text: command,
      mode,
      kind,
    });
    if (!result.ok) {
      setIssue(result.message);
      return;
    }
    setStep(kind === 'analysis' ? 'level' : 'waiting');
  }

  const momentKey =
    step === 'describe' ? 'new_describe' : step === 'level' ? 'new_level' : 'new_confirm';
  const shown =
    step === 'waiting'
      ? WAITING_SAY
      : momentSay(custom, momentKey, { nivel: levelLabel(scope), motivo: reason });
  const stepNumber = step === 'describe' ? 1 : step === 'level' ? 2 : 3;
  const visible = LEVELS.filter(
    (level) => showAll || level.name === scope || level.name === suggested,
  );

  return (
    <ScreenFrame
      testId="new-demand-flow"
      notices={notices}
      band={
        <div className="band" data-testid="new-demand-band">
          {step === 'describe' ? (
            <>
              <button type="button" className="btn2" data-testid="demand-cancel" onClick={onCancel}>
                Cancelar
              </button>
              <button
                type="button"
                className="cta"
                data-testid="demand-next"
                disabled={!description.trim()}
                onClick={next}
              >
                Continuar
              </button>
            </>
          ) : null}
          {step === 'level' ? (
            <>
              <button
                type="button"
                className="btn2"
                data-testid="demand-back"
                onClick={() => setStep('describe')}
              >
                Voltar
              </button>
              <button type="button" className="cta" data-testid="demand-next" onClick={next}>
                Usar {levelLabel(scope)}
              </button>
            </>
          ) : null}
          {step === 'confirm' ? (
            <>
              <button type="button" className="btn2" onClick={() => setStep('level')}>
                Voltar
              </button>
              {cliKind === 'claude_code' ? (
                <>
                  <button
                    type="button"
                    className="btn2"
                    data-testid="demand-paste"
                    onClick={() => void send('paste')}
                  >
                    Colar sem executar
                  </button>
                  <button
                    type="button"
                    className="cta"
                    data-testid="demand-send"
                    onClick={() => void send('execute')}
                  >
                    Confirmar e executar
                  </button>
                </>
              ) : null}
            </>
          ) : null}
          {step === 'waiting' ? (
            <button type="button" className="btn2" data-testid="demand-cancel" onClick={onCancel}>
              Voltar ao início
            </button>
          ) : null}
        </div>
      }
    >
      <Say
        art={shown.art}
        eyebrow={`Nova demanda · ${stepNumber} de 3`}
        title={shown.title}
        text={shown.text}
      />
      {step === 'describe' ? (
        <div className="fade stack-6">
          <label htmlFor="demand-description" className="field-label">
            O que precisa ser feito?
          </label>
          <textarea
            id="demand-description"
            className="field"
            rows={4}
            data-testid="demand-description"
            maxLength={2000}
            placeholder="Ex.: Corrigir a perda do histórico ao recarregar a página"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      ) : null}
      {step === 'level' ? (
        <div className="fade stack-10">
          {visible.map((level, index) => (
            <ScopeCard
              key={level.name}
              level={level}
              suggested={level.name === suggested}
              picked={level.name === scope}
              index={index}
              onPick={() => setScope(level.name)}
            />
          ))}
          <div className="button-row">
            <button
              type="button"
              className="btn2"
              data-testid="levels-toggle"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? 'Ver menos níveis' : 'Ver todos os níveis'}
            </button>
            <button
              type="button"
              className="btn2"
              data-testid="analyze-level"
              onClick={() => {
                setKind('analysis');
                setCommand(buildAnalysisCommand(description));
                setStep('confirm');
              }}
            >
              Pedir análise à sua IA
            </button>
          </div>
        </div>
      ) : null}
      {step === 'confirm' ? (
        <div className="card fade card-pad stack-8">
          <label htmlFor="demand-command" className="field-label">
            Comando que vai para a sua IA
          </label>
          <CommandActions text={command}>
            <textarea
              id="demand-command"
              className="field mono"
              rows={3}
              style={{ fontSize: 13 }}
              data-testid="demand-command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
            />
          </CommandActions>
          {cliKind === 'claude_code' ? (
            <p className="muted small">A sua IA precisa estar aberta no terminal para receber.</p>
          ) : (
            <p className="muted" data-testid="other-cli-reference">
              Com Outra CLI, copie o comando acima para usar na sua IA. O painel não o envia.
            </p>
          )}
        </div>
      ) : null}
      {issue ? (
        <p role="alert" className="notice-error">
          {issue}
        </p>
      ) : null}
    </ScreenFrame>
  );
}

/** As abas da demanda, no cabeçalho da etapa. Os totais vêm das mesmas rotas que as abas leem. */
export function DemandTabBar({
  intentId,
  version,
  tab,
  onPick,
}: {
  intentId: string;
  version: string | null;
  tab: DemandTab;
  onPick: (tab: DemandTab) => void;
}) {
  const [decisions, setDecisions] = useState<number | null>(null);
  const [commands, setCommands] = useState<number | null>(null);
  useEffect(() => {
    let current = true;
    void fetchDecisions(intentId)
      .then((rows) => current && setDecisions(rows.length))
      .catch(() => current && setDecisions(null));
    void fetchCommandHistory(intentId)
      .then((rows) => current && setCommands(rows.length))
      .catch(() => current && setCommands(null));
    return () => {
      current = false;
    };
  }, [intentId, version]);
  const total = (count: number | null) => (count === null ? '' : ` (${count})`);
  const tabs: [DemandTab, string][] = [
    ['guide', 'Guia'],
    ['artifacts', 'Artefatos'],
    ['units', 'Unidades e ciclos'],
    ['decisions', `Decisões${total(decisions)}`],
    ['history', `Comandos${total(commands)}`],
  ];
  return (
    <div role="tablist" aria-label="Consultar" className="tab-list">
      {tabs.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="tab"
          className={tab === value ? 'ctab ctab-on' : 'ctab'}
          data-testid={`tab-${value}`}
          aria-selected={tab === value}
          onClick={() => onPick(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ArtifactsTab({ view }: { view: GuideView }) {
  const intentId = view.intentId;
  const [stage, setStage] = useState(view.stage.slug);
  const artifacts = useArtifacts(
    { intentId, stage, unit: null, consult: true, version: view.lastChangedAt },
    () => {},
  );
  const path = artifacts.list?.selected?.path ?? '';
  const [notes, setNotes] = useState<ArtifactNote[]>([]);
  const [note, setNote] = useState('');
  const [issue, setIssue] = useState<string | null>(null);
  useEffect(() => {
    if (path) void fetchNotes(intentId, path).then(setNotes);
  }, [intentId, path]);
  async function saveNote() {
    const error = await postNote(intentId, path, note);
    if (error) setIssue(error.message);
    else {
      setIssue(null);
      setNote('');
      setNotes(await fetchNotes(intentId, path));
    }
  }
  return (
    <div className="fade stack-14">
      <div className="stack-6">
        <label htmlFor="artifact-stage" className="field-label">
          Etapa
        </label>
        <select
          id="artifact-stage"
          className="field"
          data-testid="artifact-stage"
          value={stage}
          onChange={(event) => setStage(event.target.value)}
        >
          {view.trail
            .flatMap((phase) => phase.stages)
            .map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
        </select>
      </div>
      {artifacts.list ? (
        <ArtifactList
          title="Artefatos da etapa"
          state={artifacts}
          items={artifacts.list.items}
          selectedPath={path}
          canPick
        />
      ) : (
        <p className="muted">Carregando artefatos…</p>
      )}
      {artifacts.list?.items.length === 0 ? (
        <p className="muted">Esta etapa não tem artefatos gravados.</p>
      ) : null}
      {artifacts.list?.selected ? <ArtifactCard artifact={artifacts.list.selected} /> : null}
      <div className="stack-6">
        <label htmlFor="note-text" className="field-label">
          Suas notas
        </label>
        {notes.map((entry) => (
          <p key={entry.noteId} className="card fade note">
            {entry.text}
          </p>
        ))}
        <div className="button-row">
          <textarea
            id="note-text"
            className="field note-input"
            rows={2}
            data-testid="note-text"
            maxLength={4000}
            placeholder={path ? undefined : 'Escolha um artefato para escrever uma nota.'}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button
            type="button"
            className="btn2"
            data-testid="note-save"
            disabled={!path || !note.trim()}
            onClick={() => void saveNote()}
          >
            Salvar nota
          </button>
        </div>
        <p className="muted small">
          Ficam em <span className="mono">.vibes/</span>, fora do repositório versionado. Notas não
          são enviadas à sua IA.
        </p>
      </div>
      {issue ? (
        <p role="alert" className="notice-error">
          {issue}
        </p>
      ) : null}
    </div>
  );
}

const EMPTY_TAB = <p className="muted">Ainda não há itens nesta aba.</p>;

function UnitsTab({ intentId }: { intentId: string }) {
  const [units, setUnits] = useState<UnitRow[]>([]);
  useEffect(() => {
    void fetchUnits(intentId).then(setUnits);
  }, [intentId]);
  return (
    <section className="fade stack-8">
      <h2 className="section-title">Unidades</h2>
      {units.length === 0 ? EMPTY_TAB : null}
      {units.map((unit, index) => (
        <div
          key={unit.unitName}
          className="card pop unit-card"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <div className="unit-head">
            <strong className="strong-900">{unit.unitName}</strong>
            <span className="tag">{UNIT_STATUS[unit.status]}</span>
          </div>
          <span>{unit.description}</span>
        </div>
      ))}
    </section>
  );
}

function DecisionsTab({ intentId }: { intentId: string }) {
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  useEffect(() => {
    void fetchDecisions(intentId).then(setDecisions);
  }, [intentId]);
  return (
    <div className="fade stack-2">
      <p className="muted" style={{ marginBottom: 8 }}>
        Lidas do registro do AI-DLC. Decisões e aprovações são dadas no terminal.
      </p>
      {decisions.length === 0 ? EMPTY_TAB : null}
      {decisions.map((row, index) => (
        <div key={`${row.at}-${index}`} className="log-row">
          <div className="log-head">
            <strong className="strong-900">{DECISION_KIND[row.kind]}</strong>
            <span className="row-meta">
              {row.stage ? `${stageName(row.stage)} · ` : ''}
              {formatMoment(row.at)}
            </span>
          </div>
          <span>{row.text}</span>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ intentId }: { intentId: string }) {
  const [history, setHistory] = useState<SentCommand[]>([]);
  useEffect(() => {
    void fetchCommandHistory(intentId).then(setHistory);
  }, [intentId]);
  return (
    <div className="fade stack-2">
      <p className="muted" style={{ marginBottom: 8 }}>
        Só aparecem comandos enviados pelo painel.
      </p>
      {history.length === 0 ? EMPTY_TAB : null}
      {history.map((entry) => (
        <div key={entry.commandId} className="log-row">
          <span className="row-meta">
            {formatMoment(entry.sentAt)} · {entry.kind}
          </span>
          <code className="mono log-code">{entry.text}</code>
        </div>
      ))}
    </div>
  );
}

/** O conteúdo de cada aba da demanda. A aba Guia é o próprio guia, fora daqui. */
export function DemandTabs({ view, tab }: { view: GuideView; tab: Exclude<DemandTab, 'guide'> }) {
  return (
    <div data-testid="demand-tabs" className="stack-18">
      {tab === 'artifacts' ? <ArtifactsTab view={view} /> : null}
      {tab === 'units' ? <UnitsTab intentId={view.intentId} /> : null}
      {tab === 'decisions' ? <DecisionsTab intentId={view.intentId} /> : null}
      {tab === 'history' ? <HistoryTab intentId={view.intentId} /> : null}
    </div>
  );
}

export function Activation({
  intentId,
  onActivated,
}: {
  intentId: string;
  onActivated: () => void;
}) {
  const [issue, setIssue] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cliKind, setCliKind] = useState<CliKind>('other');
  useEffect(() => {
    void fetchDemands()
      .then((response) => setCliKind(response.cliKind ?? 'claude_code'))
      .catch(() => setCliKind('other'));
  }, []);
  async function send() {
    if (cliKind !== 'claude_code') return;
    const result = await postActivate(intentId, { commandId: newCommandId(), mode: 'execute' });
    if (!result.ok) setIssue(result.message);
    else {
      setConfirming(false);
      onActivated();
    }
  }
  return (
    <div className="card pop card-pad stack-8" data-testid="consultation-band">
      <span>Esta demanda está em modo de consulta. Para conduzi-la, torne-a ativa no AI-DLC.</span>
      {confirming ? (
        <>
          <CommandActions text={`/aidlc intent switch ${intentId}`}>
            <code className="mono log-code">/aidlc intent switch {intentId}</code>
          </CommandActions>
          {cliKind === 'claude_code' ? null : (
            <p className="muted" data-testid="other-cli-reference">
              Com Outra CLI, copie o comando acima para usar na sua IA. O painel não o envia.
            </p>
          )}
          <div className="button-row">
            {cliKind === 'claude_code' ? (
              <button
                type="button"
                className="cta"
                data-testid="activate-confirm"
                onClick={() => void send()}
              >
                Confirmar e enviar
              </button>
            ) : null}
            <button type="button" className="btn2" onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <div className="button-row">
          <button
            type="button"
            className="btn2"
            data-testid="activate-demand"
            onClick={() => setConfirming(true)}
          >
            Tornar esta demanda ativa
          </button>
        </div>
      )}
      {issue ? (
        <p role="alert" className="notice-error">
          {issue}
        </p>
      ) : null}
    </div>
  );
}
