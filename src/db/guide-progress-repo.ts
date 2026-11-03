import type { Database } from './database';

export type GuideStep = 'understand' | 'send' | 'follow';

export type GuideProgress = {
  intentId: string;
  stageSlug: string;
  currentStep: GuideStep;
  understoodAt: string | null;
};

type GuideProgressRow = {
  intent_id: string;
  stage_slug: string;
  current_step: GuideStep;
  understood_at: string | null;
};

/** O que o guia sabe sobre a etapa e que o AI-DLC não guarda. */
export class GuideProgressRepo {
  constructor(private readonly db: Database) {}

  find(intentId: string, stageSlug: string): GuideProgress | null {
    const rows = this.db.all<GuideProgressRow>(
      'SELECT * FROM guide_progress WHERE intent_id = ? AND stage_slug = ?',
      [intentId, stageSlug],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      intentId: row.intent_id,
      stageSlug: row.stage_slug,
      currentStep: row.current_step,
      understoodAt: row.understood_at,
    };
  }

  /** Grava `understoodAt` só na primeira vez, e o passo avança para Enviar. */
  markUnderstood(
    intentId: string,
    stageSlug: string,
    understoodAt: string = new Date().toISOString(),
  ): void {
    this.db.run(
      `INSERT INTO guide_progress (intent_id, stage_slug, current_step, understood_at)
       VALUES (?, ?, 'send', ?)
       ON CONFLICT (intent_id, stage_slug) DO UPDATE
         SET understood_at = COALESCE(understood_at, excluded.understood_at),
             current_step = CASE WHEN current_step = 'understand' THEN 'send' ELSE current_step END`,
      [intentId, stageSlug, understoodAt],
    );
  }

  /** Depois de um comando chegar ao terminal, o guia passa a acompanhar. */
  markFollowing(intentId: string, stageSlug: string): void {
    this.db.run(
      `INSERT INTO guide_progress (intent_id, stage_slug, current_step)
       VALUES (?, ?, 'follow')
       ON CONFLICT (intent_id, stage_slug) DO UPDATE SET current_step = 'follow'`,
      [intentId, stageSlug],
    );
  }
}
