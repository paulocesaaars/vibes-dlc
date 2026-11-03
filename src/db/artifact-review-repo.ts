import type { Database } from './database';

export type ArtifactReview = {
  intentId: string;
  artifactPath: string;
  contentHash: string;
  reviewedAt: string;
};

type ArtifactReviewRow = {
  intent_id: string;
  artifact_path: string;
  content_hash: string;
  reviewed_at: string;
};

function toReview(row: ArtifactReviewRow): ArtifactReview {
  return {
    intentId: row.intent_id,
    artifactPath: row.artifact_path,
    contentHash: row.content_hash,
    reviewedAt: row.reviewed_at,
  };
}

/** Marcas de revisão. É uma anotação do guia e não aprova nada no AI-DLC (BR4.4). */
export class ArtifactReviewRepo {
  constructor(private readonly db: Database) {}

  find(intentId: string, artifactPath: string): ArtifactReview | null {
    const rows = this.db.all<ArtifactReviewRow>(
      'SELECT * FROM artifact_review WHERE intent_id = ? AND artifact_path = ?',
      [intentId, artifactPath],
    );
    return rows[0] ? toReview(rows[0]) : null;
  }

  /** Hash revisado de cada caminho da demanda. */
  hashesByPath(intentId: string): Map<string, string> {
    const rows = this.db.all<ArtifactReviewRow>(
      'SELECT * FROM artifact_review WHERE intent_id = ?',
      [intentId],
    );
    return new Map(rows.map((row) => [row.artifact_path, row.content_hash]));
  }

  /** Grava o hash mostrado. Revisar de novo substitui a marca anterior do mesmo caminho. */
  markReviewed(
    intentId: string,
    artifactPath: string,
    contentHash: string,
    reviewedAt: string = new Date().toISOString(),
  ): void {
    this.db.run(
      `INSERT INTO artifact_review (intent_id, artifact_path, content_hash, reviewed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (intent_id, artifact_path) DO UPDATE
         SET content_hash = excluded.content_hash, reviewed_at = excluded.reviewed_at`,
      [intentId, artifactPath, contentHash, reviewedAt],
    );
  }
}
