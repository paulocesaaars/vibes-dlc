import type { PositionSource, ReviewStatus, StageMark, TrailStatus } from './types';

export type TrailInput = { slug: string; mark: StageMark; planned: 'execute' | 'skip' };

/**
 * Status de cada etapa na trilha, na ordem do plano (BR8.1). `done` vem só da marca `[x]`. Com a
 * posição vinda do `audit/`, o `aidlc-state.md` não acompanha a Unidade, então as etapas antes da
 * atual ficam em `previous`: nem concluídas, nem bloqueadas.
 */
export function trailStatuses(
  stages: TrailInput[],
  currentSlug: string | null,
  source: PositionSource,
): TrailStatus[] {
  const currentIndex = stages.findIndex((stage) => stage.slug === currentSlug);
  return stages.map((stage, index) => {
    if (index === currentIndex) return 'current';
    if (stage.mark === 'approved') return 'done';
    if (stage.mark === 'skipped' || stage.planned === 'skip') return 'skipped';
    return source === 'audit' && index < currentIndex ? 'previous' : 'blocked';
  });
}

/** Progresso da demanda, contado nos arquivos: etapas planejadas e etapas com `[x]`. */
export function demandProgress(stages: TrailInput[]): { done: number; total: number } {
  const planned = stages.filter((stage) => stage.planned === 'execute' && stage.mark !== 'skipped');
  return {
    done: planned.filter((stage) => stage.mark === 'approved').length,
    total: planned.length,
  };
}

/** Estado de revisão de um artefato (BR4.4): o hash mostrado contra o hash revisado. */
export function reviewStatus(contentHash: string, reviewedHash: string | undefined): ReviewStatus {
  if (reviewedHash === undefined) return 'pending';
  return reviewedHash === contentHash ? 'reviewed' : 'changed';
}
