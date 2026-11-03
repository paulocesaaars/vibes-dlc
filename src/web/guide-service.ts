import type { DemandDetail, DemandRead, StageState } from '@/aidlc/reader';
import { decideMoment, deriveCommandSent } from '@/core/decide-moment';
import type {
  GuideDecision,
  RepoHealth,
  SessionStatus,
  SignalSnapshot,
  StageMark,
} from '@/core/types';
import { type MomentContent, momentContent } from '@/guide/moment-content';
import { phaseName, type StageContent, stageContent, stageName } from '@/guide/stage-content';
import { terminalTitle, type EndReason } from '@/terminal/terminal-manager';
import type { Runtime } from './runtime';

export type TrailStage = {
  slug: string;
  name: string;
  number: string;
  status: 'done' | 'now' | 'pending' | 'skipped';
};

export type TrailPhase = {
  name: string;
  label: string;
  done: number;
  total: number;
  isCurrent: boolean;
  stages: TrailStage[];
};

export type GuideView = {
  intentId: string;
  title: string;
  scope: string;
  stage: { slug: string; name: string; number: string; mark: StageMark };
  decision: GuideDecision;
  content: MomentContent;
  stageContent: StageContent;
  command: string;
  trail: TrailPhase[];
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

function trailStatus(stage: StageState, currentSlug: string | null): TrailStage['status'] {
  if (stage.stageSlug === currentSlug) return 'now';
  if (stage.mark === 'approved') return 'done';
  if (stage.mark === 'skipped' || stage.planned === 'skip') return 'skipped';
  return 'pending';
}

/** Trilha mínima: contagens lidas dos arquivos, sem número fixo no código (BR4.3). */
function buildTrail(detail: DemandDetail): TrailPhase[] {
  const currentSlug = detail.currentStage?.stageSlug ?? null;
  return detail.phases.map((phase) => {
    const stages = phase.stages.map((stage) => ({
      slug: stage.stageSlug,
      name: stageName(stage.stageSlug),
      number: stage.number,
      status: trailStatus(stage, currentSlug),
    }));
    const planned = stages.filter((stage) => stage.status !== 'skipped');
    return {
      name: phase.name,
      label: phaseName(phase.name),
      done: planned.filter((stage) => stage.status === 'done').length,
      total: planned.length,
      isCurrent: stages.some((stage) => stage.status === 'now'),
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

export type SignalInputs = {
  intentId: string;
  read: DemandRead;
  session: GuideView['session'];
  repo: GuideView['repo'];
};

/** Monta o retrato de sinais a partir dos arquivos, do banco e do terminal. */
export function buildSnapshot(runtime: Runtime, inputs: SignalInputs): SignalSnapshot {
  const { intentId, read, session, repo } = inputs;
  const detail = read.kind === 'ok' ? read.detail : null;
  const stage = detail?.currentStage ?? EMPTY_STAGE;
  const progress = stage.stageSlug ? runtime.progress.find(intentId, stage.stageSlug) : null;
  const lastWritten = stage.stageSlug
    ? runtime.commands.lastWritten(intentId, stage.stageSlug)
    : null;
  return {
    repo,
    demand: {
      intentId,
      isActive: detail?.summary.isActive ?? false,
      activeIntentId: detail?.summary.isActive ? intentId : null,
    },
    stage: {
      slug: stage.stageSlug,
      mark: stage.mark,
      lastEvent: null,
      hasNextStage: detail?.hasNextStage ?? false,
    },
    signals: { openQuestions: 'unavailable', minutesSinceLastChange: 0 },
    guide: {
      understood: Boolean(progress?.understoodAt),
      commandSent: deriveCommandSent(lastWritten, detail?.stateModifiedAtMs ?? 0),
      artifactsTotal: 0,
      artifactsReviewed: 0,
    },
    session: { status: session.status },
    preferences: { cliKind: 'claude_code' },
  };
}

/** Relê os arquivos e decide. É o mesmo caminho da tela e da rota de envio (BR5.7). */
export function decideFor(runtime: Runtime, intentId: string, read: DemandRead) {
  const session = sessionSignals(runtime);
  const repo = resolveHealth(read, runtime, session);
  const snapshot = buildSnapshot(runtime, { intentId, read, session, repo });
  return { decision: decideMoment(snapshot), session, repo, snapshot };
}

export function buildGuideView(runtime: Runtime, intentId: string): GuideView {
  const read = runtime.reader.readDemand(intentId);
  const { decision, session, repo } = decideFor(runtime, intentId, read);
  const detail = read.kind === 'ok' ? read.detail : null;
  const stage = detail?.currentStage ?? EMPTY_STAGE;
  const name = stage.stageSlug ? stageName(stage.stageSlug) : 'Etapa atual';
  const about = stageContent(stage.stageSlug, stage.leadAgent);
  return {
    intentId,
    title: detail?.summary.title ?? intentId,
    scope: detail?.summary.scope ?? '',
    stage: { slug: stage.stageSlug, name, number: stage.number, mark: stage.mark },
    decision,
    content: momentContent(decision, {
      stageName: name,
      stageNumber: stage.number,
      stageDescription: about.whatItDoes,
      health: repo.health,
      failedPath: repo.failedPath,
    }),
    stageContent: about,
    command: runtime.reader.buildStageCommand(),
    trail: detail ? buildTrail(detail) : [],
    session,
    terminalTitle: terminalTitle(runtime.config.repoRoot),
    repo,
    lastChangedAt: detail?.summary.lastChangedAt ?? null,
    stale: read.kind === 'ok' && read.stale,
  };
}
