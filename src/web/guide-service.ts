import type { DemandDetail, DemandRead, StageState } from '@/aidlc/reader';
import type { WorkSignals } from '@/aidlc/work-signals';
import { decideMoment, deriveCommandSent } from '@/core/decide-moment';
import { demandProgress, trailStatuses } from '@/core/trail';
import type {
  GuideDecision,
  PositionSource,
  RepoHealth,
  SessionStatus,
  SignalSnapshot,
  StageMark,
  TrailStatus,
} from '@/core/types';
import {
  type ConclusionNote,
  conclusionNote,
  type MomentContent,
  momentContent,
} from '@/guide/moment-content';
import { phaseName, type StageContent, stageContent, stageName } from '@/guide/stage-content';
import { terminalTitle, type EndReason } from '@/terminal/terminal-manager';
import { countStageArtifacts } from './artifact-service';
import type { Runtime } from './runtime';

export type TrailStage = {
  slug: string;
  name: string;
  number: string;
  status: TrailStatus;
  /** A Unidade, só na etapa atual e na Construção. */
  unit: string | null;
};

export type TrailPhase = {
  name: string;
  label: string;
  done: number;
  total: number;
  isCurrent: boolean;
  stages: TrailStage[];
};

export type SentCommandView = {
  commandId: string;
  stageName: string;
  text: string;
  mode: 'execute' | 'paste';
  sentAt: string;
};

export type GuideView = {
  intentId: string;
  title: string;
  scope: string;
  stage: {
    /** A etapa mostrada: na Construção, a da Unidade. */
    slug: string;
    /** A chave de `guide_progress` e `sent_command`: a etapa do `aidlc-state.md`. */
    stateSlug: string;
    name: string;
    number: string;
    mark: StageMark;
    unit: string | null;
  };
  position: { source: PositionSource };
  decision: GuideDecision;
  content: MomentContent;
  stageContent: StageContent;
  command: string;
  trail: TrailPhase[];
  artifacts: { total: number; reviewed: number };
  progress: { done: number; total: number };
  nextStage: { slug: string; name: string } | null;
  conclusion: ConclusionNote | null;
  sentCommands: SentCommandView[];
  /** A etapa aprovada de que a conclusão fala. Só existe no momento `conclusion`. */
  previousStage: { slug: string; name: string } | null;
  minutesSinceLastChange: number;
  session: { sessionId: string | null; status: SessionStatus; endReason: EndReason | null };
  terminalTitle: string;
  repo: { health: RepoHealth; failedPath: string | null };
  lastChangedAt: string | null;
  /** A última leitura falhou e a tela mostra a anterior: a interface tenta de novo. */
  stale: boolean;
};

const EMPTY_STAGE: StageState = {
  intentId: '',
  stageSlug: '',
  phase: '',
  number: '',
  leadAgent: '',
  mark: 'unknown',
  planned: 'execute',
};

function allStages(detail: DemandDetail): StageState[] {
  return detail.phases.flatMap((phase) => phase.stages);
}

function plannedAfter(detail: DemandDetail, slug: string): StageState | null {
  const stages = allStages(detail);
  const index = stages.findIndex((stage) => stage.stageSlug === slug);
  if (index < 0) return null;
  return stages.slice(index + 1).find((stage) => stage.planned === 'execute') ?? null;
}

const toTrailInput = (stage: StageState) => ({
  slug: stage.stageSlug,
  mark: stage.mark,
  planned: stage.planned,
});

/** A etapa antes da atual, na ordem do plano, sem as puladas. */
function plannedBefore(detail: DemandDetail, slug: string): StageState | null {
  const stages = allStages(detail);
  const index = stages.findIndex((stage) => stage.stageSlug === slug);
  const before = stages
    .slice(0, Math.max(index, 0))
    .filter((stage) => stage.planned === 'execute' && stage.mark !== 'skipped');
  return before.at(-1) ?? null;
}

/** Trilha por fase: os números e os status vêm dos arquivos (BR8.1). */
function buildTrail(
  detail: DemandDetail,
  currentSlug: string | null,
  snapshot: Pick<SignalSnapshot, 'stage' | 'position'>,
): TrailPhase[] {
  const flat = allStages(detail);
  const statuses = trailStatuses(flat.map(toTrailInput), currentSlug, snapshot.position.source);
  const statusOf = new Map(flat.map((stage, index) => [stage.stageSlug, statuses[index]]));
  return detail.phases.map((phase) => {
    const stages = phase.stages.map((stage) => {
      const status = statusOf.get(stage.stageSlug) as TrailStatus;
      return {
        slug: stage.stageSlug,
        name: stageName(stage.stageSlug),
        number: stage.number,
        status,
        unit: status === 'current' ? snapshot.stage.unit : null,
      };
    });
    const planned = stages.filter((stage) => stage.status !== 'skipped');
    return {
      name: phase.name,
      label: phaseName(phase.name),
      done: planned.filter((stage) => stage.status === 'done').length,
      total: planned.length,
      isCurrent: stages.some((stage) => stage.status === 'current'),
      stages,
    };
  });
}

function sessionSignals(runtime: Runtime): GuideView['session'] {
  const session = runtime.terminal.view();
  // Sem registro, o retrato lê `dead`. A página pede a sessão antes de pedir a decisão.
  if (!session) return { sessionId: null, status: 'dead', endReason: null };
  return { sessionId: session.sessionId, status: session.status, endReason: session.endReason };
}

function resolveHealth(
  read: DemandRead,
  runtime: Runtime,
  session: GuideView['session'],
): GuideView['repo'] {
  if (read.kind === 'failure') return { health: read.health, failedPath: read.failedPath };
  if (session.status === 'unavailable') {
    const searched = runtime.terminal.view()?.searchedShells.join(', ') ?? '';
    return { health: 'missing_shell', failedPath: searched };
  }
  return { health: 'ok', failedPath: null };
}

const NO_SIGNALS: WorkSignals = {
  position: { stageSlug: '', unit: null, source: 'state' },
  gateApproved: false,
  gateRejected: false,
  isGateApproved: () => false,
  lastEvent: null,
  minutesSinceLastChange: 0,
  openQuestions: 'unavailable',
};

/** A etapa foi aprovada, e o AI-DLC registrou: `[x]` e `GATE_APPROVED` na tentativa dela (BR6.2). */
function isApprovedByGate(stage: StageState | null, signals: WorkSignals): boolean {
  return stage?.mark === 'approved' && signals.isGateApproved(stage.stageSlug);
}

/** Os artefatos da etapa atual importam no gate e para saber se ela já andou depois da aprovação. */
async function countArtifacts(
  runtime: Runtime,
  intentId: string,
  stage: StageState,
  signals: WorkSignals,
): Promise<{ total: number; reviewed: number }> {
  if (signals.position.source === 'audit' || !stage.stageSlug) return { total: 0, reviewed: 0 };
  return countStageArtifacts(runtime, intentId, stage.stageSlug);
}

type SnapshotInputs = {
  intentId: string;
  read: DemandRead;
  stage: StageState;
  signals: WorkSignals;
  artifacts: { total: number; reviewed: number };
  repo: GuideView['repo'];
  session: GuideView['session'];
};

function previousSignal(
  runtime: Runtime,
  intentId: string,
  previous: StageState | null,
  signals: WorkSignals,
): SignalSnapshot['previous'] {
  if (!previous) return null;
  const seen = runtime.progress.find(intentId, previous.stageSlug)?.conclusionSeenAt;
  return {
    slug: previous.stageSlug,
    gateApproved: isApprovedByGate(previous, signals),
    conclusionSeen: Boolean(seen),
  };
}

/** Monta o retrato de sinais a partir dos arquivos, do banco e do terminal. */
function buildSnapshot(runtime: Runtime, inputs: SnapshotInputs): SignalSnapshot {
  const { intentId, read, stage, signals, artifacts, repo, session } = inputs;
  const detail = read.kind === 'ok' ? read.detail : null;
  // `guide_progress` e `sent_command` continuam com a chave de U1, sem colisão entre Unidades.
  const key = stage.stageSlug;
  const previous = detail && key ? plannedBefore(detail, key) : null;
  const progress = key ? runtime.progress.find(intentId, key) : null;
  const lastWritten = key ? runtime.commands.lastWritten(intentId, key) : null;
  const inUnit = signals.position.source === 'audit';
  return {
    repo,
    demand: {
      intentId,
      isActive: detail?.summary.isActive ?? false,
      activeIntentId: detail?.summary.isActive ? intentId : null,
    },
    stage: {
      slug: inUnit ? signals.position.stageSlug : key,
      // Dentro de uma Unidade, a marca não vem do `aidlc-state.md` (`functional-spec.md`).
      mark: inUnit ? 'in_progress' : stage.mark,
      lastEvent: signals.lastEvent,
      hasNextStage: detail && key ? plannedAfter(detail, key) !== null : false,
      unit: signals.position.unit,
      gateApproved: signals.gateApproved,
      gateRejected: signals.gateRejected,
    },
    previous: previousSignal(runtime, intentId, previous, signals),
    position: { source: signals.position.source },
    signals: {
      openQuestions: signals.openQuestions,
      minutesSinceLastChange: signals.minutesSinceLastChange,
    },
    guide: {
      understood: Boolean(progress?.understoodAt),
      commandSent: deriveCommandSent(lastWritten, detail?.stateModifiedAtMs ?? 0),
      artifactsTotal: artifacts.total,
      artifactsReviewed: artifacts.reviewed,
    },
    session: { status: session.status },
    preferences: { cliKind: 'claude_code' },
  };
}

/** Relê os arquivos e decide. É o mesmo caminho da tela e da rota de envio (BR5.7). */
export async function decideFor(runtime: Runtime, intentId: string, read: DemandRead) {
  const session = sessionSignals(runtime);
  const repo = resolveHealth(read, runtime, session);
  const detail = read.kind === 'ok' ? read.detail : null;
  const signals = detail ? await runtime.reader.readWorkSignals(detail) : NO_SIGNALS;
  const stage = detail?.currentStage ?? EMPTY_STAGE;
  const artifacts = await countArtifacts(runtime, intentId, stage, signals);
  const snapshot = buildSnapshot(runtime, {
    intentId,
    read,
    stage,
    signals,
    artifacts,
    repo,
    session,
  });
  return { decision: decideMoment(snapshot), session, repo, snapshot, stage, artifacts };
}

function findStage(detail: DemandDetail | null, slug: string): StageState | null {
  if (!detail) return null;
  return allStages(detail).find((stage) => stage.stageSlug === slug) ?? null;
}

function readSentCommands(runtime: Runtime, intentId: string): SentCommandView[] {
  return runtime.commands.listWritten(intentId).map((command) => ({
    commandId: command.commandId,
    stageName: stageName(command.stageSlug),
    text: command.text,
    mode: command.mode,
    sentAt: command.sentAt,
  }));
}

/** A conclusão fala da etapa anterior, e a trilha concluída, da última: as duas com `[x]` e gate. */
async function readConclusion(
  runtime: Runtime,
  intentId: string,
  decided: Awaited<ReturnType<typeof decideFor>>,
): Promise<ConclusionNote | null> {
  const { decision, snapshot, artifacts, stage } = decided;
  if (decision.moment === 'trail_done') {
    return conclusionNote(stageName(stage.stageSlug), artifacts.reviewed, artifacts.total);
  }
  if (decision.moment !== 'conclusion' || !snapshot.previous) return null;
  const slug = snapshot.previous.slug;
  const counts = await countStageArtifacts(runtime, intentId, slug);
  return conclusionNote(stageName(slug), counts.reviewed, counts.total);
}

export async function buildGuideView(runtime: Runtime, intentId: string): Promise<GuideView> {
  const read = runtime.reader.readDemand(intentId);
  const decided = await decideFor(runtime, intentId, read);
  const { decision, session, repo, snapshot, stage, artifacts } = decided;
  const detail = read.kind === 'ok' ? read.detail : null;
  const shown = findStage(detail, snapshot.stage.slug) ?? stage;
  const name = shown.stageSlug ? stageName(shown.stageSlug) : 'Etapa atual';
  const about = stageContent(shown.stageSlug, shown.leadAgent);
  const isConclusion = decision.moment === 'conclusion';
  // Na conclusão, a próxima etapa é a que o AI-DLC já colocou como atual.
  const next =
    isConclusion || !detail || !stage.stageSlug ? stage : plannedAfter(detail, stage.stageSlug);
  const nextName = next?.stageSlug ? stageName(next.stageSlug) : null;
  const previousSlug = isConclusion ? (snapshot.previous?.slug ?? null) : null;
  return {
    intentId,
    title: detail?.summary.title ?? intentId,
    scope: detail?.summary.scope ?? '',
    stage: {
      slug: shown.stageSlug,
      stateSlug: stage.stageSlug,
      name,
      number: shown.number,
      mark: snapshot.stage.mark,
      unit: snapshot.stage.unit,
    },
    position: snapshot.position,
    decision,
    content: momentContent(decision, {
      stageName: name,
      stageNumber: shown.number,
      stageDescription: about.whatItDoes,
      health: repo.health,
      failedPath: repo.failedPath,
      artifactsTotal: artifacts.total,
      artifactsReviewed: artifacts.reviewed,
      nextStageName: nextName,
    }),
    stageContent: about,
    command: runtime.reader.buildStageCommand(),
    trail: detail ? buildTrail(detail, shown.stageSlug || null, snapshot) : [],
    artifacts,
    progress: demandProgress(detail ? allStages(detail).map(toTrailInput) : []),
    nextStage: next && nextName ? { slug: next.stageSlug, name: nextName } : null,
    previousStage: previousSlug ? { slug: previousSlug, name: stageName(previousSlug) } : null,
    conclusion: await readConclusion(runtime, intentId, decided),
    sentCommands: decision.moment === 'trail_done' ? readSentCommands(runtime, intentId) : [],
    minutesSinceLastChange: snapshot.signals.minutesSinceLastChange,
    session,
    terminalTitle: terminalTitle(runtime.config.repoRoot),
    repo,
    lastChangedAt: detail?.summary.lastChangedAt ?? null,
    stale: read.kind === 'ok' && read.stale,
  };
}
