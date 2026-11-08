import path from 'node:path';
import { existsSync } from 'node:fs';
import type { ArtifactContent, ArtifactItem } from '@/aidlc/artifacts';
import type { DemandDetail } from '@/aidlc/reader';
import type { DecisionRow, UnitRow } from '@/aidlc/demand-browser';
import { resolveAidlcPaths, readActiveIntent } from '@/aidlc/paths';
import { formatAiCommand, type AiKind } from '@/core/commands';
import { type StageMark, type TrailStatus } from '@/core/types';
import { trailStatuses, demandProgress } from '@/core/trail';
import { stageName, phaseName } from '@/guide/stage-content';
import { terminalTitle } from '@/terminal/terminal-manager';
import { assertContext, WorkspaceError, type Runtime } from './runtime';

export type TrailPhase = {
  name: string;
  label: string;
  done: number;
  total: number;
  isCurrent: boolean;
  stages: {
    slug: string;
    name: string;
    number: string;
    status: TrailStatus;
    unit: string | null;
  }[];
};
export type WorkspaceView = {
  contextId: string;
  project: { path: string; name: string; ai: AiKind } | null;
  recent: { path: string; ai: AiKind }[];
  session: ReturnType<Runtime['terminal']['view']>;
  terminalTitle: string;
  activeIntentId: string | null;
  activeStage: string | null;
  demands: {
    intentId: string;
    title: string;
    scope: string;
    isActive: boolean;
    readable: boolean;
    stale: boolean;
    currentStage: string | null;
    progress: { done: number; total: number } | null;
  }[];
  detail: {
    intentId: string;
    title: string;
    stage: string;
    unit: string | null;
    mark: StageMark;
    gateApproved: boolean;
    gateRejected: boolean;
    stale: boolean;
    lastChangedAt: string;
    progress: { done: number; total: number };
    trail: TrailPhase[];
    units: UnitRow[];
    decisions: DecisionRow[];
    artifacts: ArtifactItem[];
    selected: ArtifactContent | null;
    shownStage: string;
    command: string;
  } | null;
  error: string | null;
  notice: string | null;
};
export function activeIdentity(runtime: Runtime): {
  activeIntentId: string | null;
  activeStage: string | null;
} {
  const root = runtime.config.repoRoot;
  if (!root) return { activeIntentId: null, activeStage: null };
  const id = readActiveIntent(resolveAidlcPaths(root));
  if (!id) return { activeIntentId: null, activeStage: null };
  const read = runtime.reader.readDemand(id);
  if (read.kind !== 'ok' || read.stale)
    throw new WorkspaceError(
      409,
      'unreadable_state',
      'O estado ativo do AI-DLC não está disponível. Tente novamente.',
    );
  return { activeIntentId: id, activeStage: read.detail.currentStage?.stageSlug ?? null };
}
function trail(
  detail: DemandDetail,
  current: string,
  source: 'state' | 'audit',
  unit: string | null,
): TrailPhase[] {
  const flat = detail.phases.flatMap((p) => p.stages);
  const states = trailStatuses(
    flat.map((s) => ({ slug: s.stageSlug, mark: s.mark, planned: s.planned })),
    current,
    source,
  );
  const status = new Map(flat.map((s, i) => [s.stageSlug, states[i]!]));
  return detail.phases.map((p) => {
    const stages = p.stages.map((s) => ({
      slug: s.stageSlug,
      name: stageName(s.stageSlug),
      number: s.number,
      status: status.get(s.stageSlug)!,
      unit: s.stageSlug === current ? unit : null,
    }));
    const planned = stages.filter((s) => s.status !== 'skipped');
    return {
      name: p.name,
      label: phaseName(p.name),
      done: planned.filter((s) => s.status === 'done').length,
      total: planned.length,
      isCurrent: stages.some((s) => s.status === 'current'),
      stages,
    };
  });
}
export async function readWorkspace(
  runtime: Runtime,
  query: { intent?: string; stage?: string; artifact?: string },
): Promise<WorkspaceView> {
  const contextId = runtime.contextId;
  const root = runtime.config.repoRoot;
  const reader = runtime.reader;
  const pref = root ? runtime.projects.find(root) : null;
  const view: WorkspaceView = {
    contextId,
    project: root ? { path: root, name: path.basename(root), ai: pref?.ai ?? 'claude_code' } : null,
    recent: runtime.projects.recent(),
    session: runtime.terminal.view(),
    terminalTitle: terminalTitle(root),
    activeIntentId: null,
    activeStage: null,
    demands: [],
    detail: null,
    error: null,
    notice: null,
  };
  if (!root) return view;
  try {
    if (!existsSync(path.join(root, 'aidlc')))
      throw new Error('A pasta aidlc do projeto não está disponível.');
    const paths = resolveAidlcPaths(root);
    view.activeIntentId = readActiveIntent(paths);
    if (view.activeIntentId) {
      const active = reader.readDemand(view.activeIntentId);
      if (active.kind === 'ok' && !active.stale)
        view.activeStage = active.detail.currentStage?.stageSlug ?? null;
    }
    view.demands = reader.listDemands().map((s) => {
      const read = reader.readDemand(s.intentId);
      return {
        intentId: s.intentId,
        title: s.title || s.intentId,
        scope: s.scope,
        isActive: s.isActive,
        readable: read.kind === 'ok',
        stale: read.kind === 'ok' && read.stale,
        currentStage: s.currentStage,
        progress:
          read.kind === 'ok'
            ? demandProgress(
                read.detail.phases
                  .flatMap((phase) => phase.stages)
                  .map((stage) => ({
                    slug: stage.stageSlug,
                    mark: stage.mark,
                    planned: stage.planned,
                  })),
              )
            : null,
      };
    });
    const id = query.intent || view.activeIntentId;
    if (!id) return view;
    const read = reader.readDemand(id);
    if (read.kind !== 'ok') throw new Error(`Não foi possível ler ${read.failedPath}.`);
    const detail = read.detail;
    const signals = await reader.readWorkSignals(detail);
    const current = signals.position.stageSlug || detail.currentStage?.stageSlug || '';
    const shown = query.stage || current;
    const stages = detail.phases.flatMap((p) => p.stages);
    if (shown && !stages.some((s) => s.stageSlug === shown))
      throw new Error('A etapa selecionada não pertence à demanda.');
    const inUnit = !query.stage && signals.position.source === 'audit';
    const items = shown
      ? await reader.listArtifacts(
          id,
          shown,
          inUnit && signals.position.unit
            ? { unit: signals.position.unit }
            : { includeUnits: true },
        )
      : [];
    const requestedAvailable = items.some((item) => item.path === query.artifact);
    const selectedPath = requestedAvailable ? query.artifact : items[0]?.path;
    if (query.artifact && !requestedAvailable)
      view.notice =
        'O artefato selecionado não está mais disponível nesta etapa. A lista foi atualizada.';
    const selected = selectedPath ? await reader.readArtifact(id, selectedPath) : null;
    if (selectedPath && !selected)
      view.notice = 'O artefato foi removido durante a leitura. A lista será atualizada.';
    const [units, decisions] = await Promise.all([reader.readUnits(id), reader.readDecisions(id)]);
    view.detail = {
      intentId: id,
      title: detail.summary.title || id,
      stage: current,
      unit: signals.position.unit,
      mark:
        signals.position.source === 'audit'
          ? 'in_progress'
          : (detail.currentStage?.mark ?? 'unknown'),
      gateApproved: signals.gateApproved,
      gateRejected: signals.gateRejected,
      stale: read.stale,
      lastChangedAt: detail.summary.lastChangedAt,
      progress: demandProgress(
        stages.map((s) => ({ slug: s.stageSlug, mark: s.mark, planned: s.planned })),
      ),
      trail: trail(detail, current, signals.position.source, signals.position.unit),
      units,
      decisions,
      artifacts: items,
      selected,
      shownStage: shown,
      command: formatAiCommand(reader.buildStageCommand(), pref?.ai ?? 'claude_code'),
    };
    if (read.stale)
      view.error =
        'A leitura falhou. Os dados exibidos estão desatualizados; o envio foi suspenso.';
  } catch (error) {
    view.error =
      error instanceof Error ? error.message : 'Não foi possível ler os arquivos do projeto.';
  }
  assertContext(runtime, contextId);
  return view;
}
