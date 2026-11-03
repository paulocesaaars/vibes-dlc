import type { Database } from './database';

export type DemandSeenState = {
  intentId: string;
  stageSlug: string;
  /** Vazio fora da Construção. */
  unit: string;
  mark: string;
  seenAt: string;
};

type DemandSeenRow = {
  intent_id: string;
  stage_slug: string;
  unit: string;
  mark: string;
  seen_at: string;
};

/** Último estado visto de cada demanda, base do aviso ao reabrir o painel (BR7.1). */
export class DemandSeenRepo {
  constructor(private readonly db: Database) {}

  find(intentId: string): DemandSeenState | null {
    const rows = this.db.all<DemandSeenRow>('SELECT * FROM demand_seen_state WHERE intent_id = ?', [
      intentId,
    ]);
    const row = rows[0];
    if (!row) return null;
    return {
      intentId: row.intent_id,
      stageSlug: row.stage_slug,
      unit: row.unit,
      mark: row.mark,
      seenAt: row.seen_at,
    };
  }

  save(state: Omit<DemandSeenState, 'seenAt'>, seenAt: string = new Date().toISOString()): void {
    this.db.run(
      `INSERT INTO demand_seen_state (intent_id, stage_slug, unit, mark, seen_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (intent_id) DO UPDATE
         SET stage_slug = excluded.stage_slug, unit = excluded.unit,
             mark = excluded.mark, seen_at = excluded.seen_at`,
      [state.intentId, state.stageSlug, state.unit, state.mark, seenAt],
    );
  }
}
