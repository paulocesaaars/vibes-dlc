import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { logger } from '@/config/logger';
import type { RepoHealth, StageMark } from '@/core/types';
import { ChangeWatcher } from './change-watcher';
import { computeSignature } from './file-signature';
import { parseState, type ParsedState } from './parse-state';
import { type AidlcPaths, isSafeName, readActiveIntent, resolveAidlcPaths } from './paths';
import { type GraphStage, readStageGraph } from './stage-graph';

const STALE_LIMIT_MS = 10_000;

export type DemandSummary = {
  intentId: string;
  title: string;
  scope: string;
  currentStage: string | null;
  isActive: boolean;
  readable: boolean;
  lastChangedAt: string;
};

export type StageState = {
  intentId: string;
  stageSlug: string;
  phase: string;
  number: string;
  leadAgent: string;
  mark: StageMark;
  planned: 'execute' | 'skip';
};

export type DemandDetail = {
  summary: DemandSummary;
  phases: { name: string; stages: StageState[] }[];
  currentStage: StageState | null;
  hasNextStage: boolean;
  stateModifiedAtMs: number;
};

export type ReadFailure = {
  kind: 'failure';
  health: Exclude<RepoHealth, 'ok' | 'missing_shell'>;
  failedPath: string;
};
export type DemandRead = { kind: 'ok'; detail: DemandDetail; stale: boolean } | ReadFailure;
export type ActiveRead = DemandRead | { kind: 'no_active_intent' };

type LastValid = { detail: DemandDetail; failingSinceMs: number | null };

function orderPhases(stages: StageState[]): DemandDetail['phases'] {
  const phases: DemandDetail['phases'] = [];
  for (const stage of stages) {
    const phase = phases.find((entry) => entry.name === stage.phase);
    if (phase) phase.stages.push(stage);
    else phases.push({ name: stage.phase, stages: [stage] });
  }
  return phases;
}

function toStageStates(
  intentId: string,
  parsed: ParsedState,
  graph: Map<string, GraphStage>,
): StageState[] {
  return parsed.stages.map((stage) => {
    const node = graph.get(stage.slug);
    return {
      intentId,
      stageSlug: stage.slug,
      phase: node?.phase ?? 'unknown',
      number: node?.number ?? '',
      leadAgent: node?.leadAgent ?? '',
      mark: stage.mark,
      planned: stage.planned,
    };
  });
}

/** Lê o AI-DLC sem nunca escrever. Conteúdo lido é dado não confiável (C2). */
export class AidlcReader {
  private readonly listeners = new Set<(intentId: string | null) => void>();
  private readonly lastValid = new Map<string, LastValid>();
  private watcher: ChangeWatcher | null = null;

  constructor(
    private readonly repoRoot: string | null,
    private readonly now: () => number = Date.now,
    private readonly watchOptions: { pollIntervalMs?: number; debounceMs?: number } = {},
  ) {}

  /** Lê a demanda ativa, sempre a partir dos cursores (BR5.7). */
  readActive(): ActiveRead {
    const paths = this.paths();
    if (!paths) return this.missingAidlc();
    const intentId = readActiveIntent(paths);
    if (!intentId) return { kind: 'no_active_intent' };
    return this.readDemand(intentId);
  }

  readDemand(intentId: string): DemandRead {
    const paths = this.paths();
    if (!paths) return this.missingAidlc();
    if (!isSafeName(intentId)) {
      return { kind: 'failure', health: 'unreadable_record', failedPath: intentId };
    }
    const statePath = path.join(paths.intentsDir, intentId, 'aidlc-state.md');

    let attemptedPath = statePath;
    try {
      const parsed = parseState(readFileSync(statePath, 'utf8'));
      const stateModifiedAtMs = statSync(statePath).mtimeMs;
      attemptedPath = paths.graphPath;
      const graph = new Map(readStageGraph(paths.graphPath).map((node) => [node.slug, node]));
      const detail = this.buildDetail(paths, intentId, parsed, graph, stateModifiedAtMs);
      this.lastValid.set(intentId, { detail, failingSinceMs: null });
      return { kind: 'ok', detail, stale: false };
    } catch (error) {
      return this.handleFailure(intentId, attemptedPath, error);
    }
  }

  listDemands(): DemandSummary[] {
    const paths = this.paths();
    if (!paths || !existsSync(paths.intentsDir)) return [];
    return readdirSync(paths.intentsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && isSafeName(entry.name))
      .map((entry) => this.summarize(entry.name));
  }

  /** Comando oferecido na etapa atual (BR5.8). O nome da etapa fica ao lado, na interface. */
  buildStageCommand(): string {
    return '/aidlc';
  }

  /** Avisa só que algo mudou, e a interface pede a decisão de novo (C5). */
  subscribe(listener: (intentId: string | null) => void): () => void {
    this.listeners.add(listener);
    this.ensureWatching();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.watcher?.stop();
        this.watcher = null;
      }
    };
  }

  private paths(): AidlcPaths | null {
    if (!this.repoRoot) return null;
    const paths = resolveAidlcPaths(this.repoRoot);
    return existsSync(paths.aidlcDir) ? paths : null;
  }

  private missingAidlc(): ReadFailure {
    const failedPath = this.repoRoot ? path.join(this.repoRoot, 'aidlc') : 'aidlc';
    return { kind: 'failure', health: 'missing_aidlc', failedPath };
  }

  private buildDetail(
    paths: AidlcPaths,
    intentId: string,
    parsed: ParsedState,
    graph: Map<string, GraphStage>,
    stateModifiedAtMs: number,
  ): DemandDetail {
    const stages = toStageStates(intentId, parsed, graph);
    const currentIndex = stages.findIndex((stage) => stage.stageSlug === parsed.currentStage);
    const recordDir = path.join(paths.intentsDir, intentId);
    const { lastModifiedMs } = computeSignature([recordDir]);
    return {
      summary: {
        intentId,
        title: parsed.project,
        scope: parsed.scope,
        currentStage: parsed.currentStage,
        isActive: readActiveIntent(paths) === intentId,
        readable: true,
        lastChangedAt: new Date(lastModifiedMs || stateModifiedAtMs).toISOString(),
      },
      phases: orderPhases(stages),
      currentStage: stages[currentIndex] ?? null,
      hasNextStage:
        currentIndex >= 0 && stages.slice(currentIndex + 1).some((s) => s.planned === 'execute'),
      stateModifiedAtMs,
    };
  }

  private handleFailure(intentId: string, failedPath: string, error: unknown): DemandRead {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn('aidlc', `Não foi possível ler ${failedPath}: ${reason}.`);

    const last = this.lastValid.get(intentId);
    if (!last) return { kind: 'failure', health: 'unreadable_record', failedPath };

    const failingSinceMs = last.failingSinceMs ?? this.now();
    last.failingSinceMs = failingSinceMs;
    if (this.now() - failingSinceMs >= STALE_LIMIT_MS) {
      return { kind: 'failure', health: 'unreadable_record', failedPath };
    }
    return { kind: 'ok', detail: last.detail, stale: true };
  }

  private summarize(intentId: string): DemandSummary {
    const read = this.readDemand(intentId);
    if (read.kind === 'ok') return read.detail.summary;
    return {
      intentId,
      title: intentId,
      scope: '',
      currentStage: null,
      isActive: false,
      readable: false,
      lastChangedAt: new Date(0).toISOString(),
    };
  }

  private observedRoots(paths: AidlcPaths): string[] {
    const intentId = readActiveIntent(paths);
    const record = intentId ? [path.join(paths.intentsDir, intentId)] : [];
    return [paths.activeSpaceCursor, paths.activeIntentCursor, ...record];
  }

  private ensureWatching(): void {
    if (this.watcher || !this.repoRoot) return;
    const aidlcDir = path.join(this.repoRoot, 'aidlc');
    this.watcher = new ChangeWatcher({
      ...this.watchOptions,
      watchDir: aidlcDir,
      readSignature: () => {
        const paths = this.paths();
        return paths ? computeSignature(this.observedRoots(paths)).signature : 'missing';
      },
      onChange: () => {
        const paths = this.paths();
        const intentId = paths ? readActiveIntent(paths) : null;
        for (const listener of this.listeners) listener(intentId);
      },
    });
    this.watcher.start();
  }
}
