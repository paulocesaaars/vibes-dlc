import type { ArtifactContent, ArtifactScope } from '@/aidlc/artifacts';
import { reviewStatus } from '@/core/trail';
import type { ReviewStatus } from '@/core/types';
import type { Runtime } from './runtime';

export type ArtifactView = {
  path: string;
  name: string;
  contentHash: string;
  reviewStatus: ReviewStatus;
};

export type ArtifactList = {
  stageSlug: string;
  total: number;
  reviewed: number;
  items: ArtifactView[];
  selected: ArtifactContent | null;
};

/** Junta o que está no disco com as marcas do banco. O `aidlc` não conhece o `db`. */
export async function listArtifactViews(
  runtime: Runtime,
  intentId: string,
  stageSlug: string,
  scope: ArtifactScope = {},
): Promise<ArtifactView[]> {
  const items = await runtime.reader.listArtifacts(intentId, stageSlug, scope);
  const reviewed = runtime.reviews.hashesByPath(intentId);
  return items.map((item) => ({
    ...item,
    reviewStatus: reviewStatus(item.contentHash, reviewed.get(item.path)),
  }));
}

export async function countStageArtifacts(
  runtime: Runtime,
  intentId: string,
  stageSlug: string,
): Promise<{ total: number; reviewed: number }> {
  const views = await listArtifactViews(runtime, intentId, stageSlug);
  return {
    total: views.length,
    reviewed: views.filter((view) => view.reviewStatus === 'reviewed').length,
  };
}

/** Sem caminho pedido, mostra o primeiro ainda não revisado: um artefato por vez (BR4.1). */
export function pickDefaultArtifact(items: ArtifactView[]): ArtifactView | null {
  return items.find((item) => item.reviewStatus !== 'reviewed') ?? items[0] ?? null;
}
