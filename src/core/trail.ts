import type { PositionSource, StageMark, TrailStatus } from './types';
export type TrailInput = { slug: string; mark: StageMark; planned: 'execute' | 'skip' };
export function trailStatuses(
  stages: TrailInput[],
  currentSlug: string | null,
  source: PositionSource,
): TrailStatus[] {
  const current = stages.findIndex((s) => s.slug === currentSlug);
  return stages.map((stage, index) => {
    if (index === current) return 'current';
    if (stage.mark === 'approved') return 'done';
    if (stage.mark === 'skipped' || stage.planned === 'skip') return 'skipped';
    return source === 'audit' && index < current ? 'previous' : 'blocked';
  });
}
export function demandProgress(stages: TrailInput[]): { done: number; total: number } {
  const planned = stages.filter((s) => s.planned === 'execute' && s.mark !== 'skipped');
  return { done: planned.filter((s) => s.mark === 'approved').length, total: planned.length };
}
