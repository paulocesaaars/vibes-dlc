'use client';

import { useEffect, useState } from 'react';
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
import { customArt } from '@/web/compose-moment';
import { ArtifactCard, ArtifactList } from './artifact-panel';
import { MomentArt } from './moment-art';

type Tab = 'artifacts' | 'units' | 'decisions' | 'history';
export type HubScreen = 'guide' | 'home' | 'new' | 'tabs' | 'customize';
const TURN_TEXT: Record<DemandRow['turn'], string> = {
  person: 'Sua vez',
  ai: 'Vez da sua IA',
  guide: 'Vez do guia',
  unknown: 'Abra para ver de quem é a vez',
};

/** Frases e mídia personalizadas de um momento da navegação; vazio quando não há troca. */
function momentOverride(
  custom: CustomizationState | null | undefined,
  momentKey: string,
  values: Record<string, string> = {},
) {
  const moment = findMoment(momentKey);
  if (!custom || !moment) return { title: undefined, text: undefined, art: undefined };
  const says = custom.says[momentKey];
  const media = custom.media[momentKey];
  return {
    title: says?.title ? applyTokens(says.title, moment.tokens, values) : undefined,
    text: says?.text ? applyTokens(says.text, moment.tokens, values) : undefined,
    art: media ? customArt({ src: moment.defaultArtSrc, alt: moment.name }, media) : undefined,
  };
}

export function Home({
  onOpen,
  onNew,
  custom,
}: {
  onOpen: (intentId: string) => void;
  onNew: () => void;
  custom?: CustomizationState | null;
}) {
  const shown = momentOverride(custom, 'home');
  const [rows, setRows] = useState<DemandRow[]>([]);
  useEffect(() => {
    void fetchDemandRows().then(setRows);
    const events = new EventSource('/api/events');
    events.addEventListener('changed', () => void fetchDemandRows().then(setRows));
    return () => events.close();
  }, []);
  return (
    <section data-testid="demand-home">
      {shown.art ? <MomentArt art={shown.art} /> : null}
      <h1>{shown.title ?? 'Início'}</h1>
      <p>{shown.text ?? 'Escolha uma demanda para continuar ou consultar.'}</p>
      <button data-testid="new-demand" onClick={onNew}>
        Nova demanda
      </button>
      {rows.length === 0 ? (
        <p>Nenhuma demanda ainda. Crie a primeira para começar.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.intentId}>
              <button data-testid="demand-row" onClick={() => onOpen(row.intentId)}>
                <strong>{row.title}</strong> · {row.scope} · {row.stageLabel ?? 'sem etapa'} ·{' '}
                {row.doneCount}/{row.totalCount} · {TURN_TEXT[row.turn]}{' '}
                {row.isActive ? '· ativa' : ''}
                {row.readable ? '' : ` · Registro ilegível: ${row.failedPath}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function NewDemand({
  onCancel,
  onCreated,
  custom,
}: {
  onCancel: () => void;
  onCreated: () => void;
  custom?: CustomizationState | null;
}) {
  const [step, setStep] = useState<'describe' | 'level' | 'confirm' | 'waiting'>('describe');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<Level>('feature');
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
  const shown = momentOverride(custom, momentKey, { nivel: scope, motivo: reason });
  return (
    <section data-testid="new-demand-flow">
      {shown.art ? <MomentArt art={shown.art} /> : null}
      <h1>{shown.title ?? 'Nova demanda'}</h1>
      {shown.text ? <p data-testid="new-demand-text">{shown.text}</p> : null}
      <p>Passo {step === 'describe' ? 1 : step === 'level' ? 2 : 3} de 3</p>
      {step === 'describe' ? (
        <>
          <label>
            O que você quer fazer?
            <textarea
              data-testid="demand-description"
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <button data-testid="demand-next" disabled={!description.trim()} onClick={next}>
            Continuar
          </button>
        </>
      ) : null}
      {step === 'level' ? (
        <>
          <p>
            Nível sugerido: <strong>{scope}</strong>. {reason}
          </p>
          <label>
            Escolher nível
            <select
              data-testid="demand-level"
              value={scope}
              onChange={(event) => setScope(event.target.value as Level)}
            >
              {[
                'express',
                'bugfix',
                'security-patch',
                'refactor',
                'poc',
                'infra',
                'mvp',
                'classic',
                'workshop',
                'feature',
                'enterprise',
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <button
            data-testid="analyze-level"
            onClick={() => {
              setKind('analysis');
              setCommand(buildAnalysisCommand(description));
              setStep('confirm');
            }}
          >
            Pedir análise à sua IA
          </button>
          <button data-testid="demand-back" onClick={() => setStep('describe')}>
            Voltar
          </button>
          <button data-testid="demand-next" onClick={next}>
            Continuar
          </button>
        </>
      ) : null}
      {step === 'confirm' ? (
        <>
          <p>Confira o comando. Sua IA precisa estar aberta no terminal.</p>
          <textarea
            data-testid="demand-command"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
          />
          {cliKind === 'claude_code' ? (
            <>
              <button data-testid="demand-send" onClick={() => void send('execute')}>
                Confirmar e enviar
              </button>
              <button data-testid="demand-paste" onClick={() => void send('paste')}>
                Colar sem executar
              </button>
            </>
          ) : (
            <p data-testid="other-cli-reference">
              Com Outra CLI, copie o comando acima para usar na sua IA. O painel não o envia.
            </p>
          )}
          <button onClick={() => setStep('level')}>Voltar</button>
        </>
      ) : null}
      {step === 'waiting' ? (
        <p role="status">
          Esperando sua IA criar a demanda. Ela pode fazer perguntas no terminal. Se demorar mais de
          10 minutos, confira o terminal.
        </p>
      ) : null}
      {issue ? <p role="alert">{issue}</p> : null}
      <button data-testid="demand-cancel" onClick={onCancel}>
        Cancelar
      </button>
    </section>
  );
}

export function DemandTabs({ view, onBack }: { view: GuideView; onBack: () => void }) {
  const intentId = view.intentId;
  const [tab, setTab] = useState<Tab>('artifacts');
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [history, setHistory] = useState<SentCommand[]>([]);
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
    if (tab === 'units') void fetchUnits(intentId).then(setUnits);
    if (tab === 'decisions') void fetchDecisions(intentId).then(setDecisions);
    if (tab === 'history') void fetchCommandHistory(intentId).then(setHistory);
  }, [intentId, tab]);
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
    <section data-testid="demand-tabs">
      <button onClick={onBack}>Voltar ao guia</button>
      <nav>
        {(
          [
            ['artifacts', 'Artefatos'],
            ['units', 'Unidades e ciclos'],
            ['decisions', 'Decisões'],
            ['history', 'Histórico'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            data-testid={`tab-${value}`}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === 'artifacts' ? (
        <div>
          <label>
            Etapa{' '}
            <select
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
          </label>
          {artifacts.list ? (
            <ArtifactList
              title="Artefatos da etapa"
              state={artifacts}
              items={artifacts.list.items}
              selectedPath={path}
              canPick
            />
          ) : (
            <p>Carregando artefatos…</p>
          )}
          {artifacts.list?.selected ? <ArtifactCard artifact={artifacts.list.selected} /> : null}
          <p>Escolha um artefato para escrever uma nota.</p>
          <textarea
            data-testid="note-text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={4000}
          />
          <button
            data-testid="note-save"
            disabled={!path || !note.trim()}
            onClick={() => void saveNote()}
          >
            Salvar nota
          </button>
          {notes.map((entry) => (
            <p key={entry.noteId}>{entry.text}</p>
          ))}
        </div>
      ) : null}
      {tab === 'units' ? (
        <ul>
          {units.map((unit) => (
            <li key={unit.unitName}>
              {unit.unitName} · {unit.status} · {unit.description}
            </li>
          ))}
        </ul>
      ) : null}
      {tab === 'decisions' ? (
        <ul>
          {decisions.map((row, index) => (
            <li key={`${row.at}-${index}`}>
              {row.at} · {row.kind} · {row.stage}: {row.text}
            </li>
          ))}
        </ul>
      ) : null}
      {tab === 'history' ? (
        <>
          <p>Só aparecem comandos enviados pelo painel.</p>
          <ul>
            {history.map((entry) => (
              <li key={entry.commandId}>
                {entry.sentAt} · {entry.kind}: {entry.text}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {(tab === 'units' && units.length === 0) ||
      (tab === 'decisions' && decisions.length === 0) ||
      (tab === 'history' && history.length === 0) ? (
        <p>Ainda não há itens nesta aba.</p>
      ) : null}
      {issue ? <p role="alert">{issue}</p> : null}
    </section>
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
    <div data-testid="consultation-band">
      <p>Esta demanda está em modo de consulta. Para conduzi-la, torne-a ativa no AI-DLC.</p>
      {confirming ? (
        <>
          <code>/aidlc intent switch {intentId}</code>
          {cliKind === 'claude_code' ? (
            <button data-testid="activate-confirm" onClick={() => void send()}>
              Confirmar e enviar
            </button>
          ) : (
            <p data-testid="other-cli-reference">
              Com Outra CLI, copie o comando acima para usar na sua IA. O painel não o envia.
            </p>
          )}
          <button onClick={() => setConfirming(false)}>Cancelar</button>
        </>
      ) : (
        <button data-testid="activate-demand" onClick={() => setConfirming(true)}>
          Tornar esta demanda ativa
        </button>
      )}
      {issue ? <p role="alert">{issue}</p> : null}
    </div>
  );
}
