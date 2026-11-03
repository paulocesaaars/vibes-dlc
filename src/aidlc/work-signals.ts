import path from 'node:path';
import { logger } from '@/config/logger';
import type { PositionSource } from '@/core/types';
import {
  type AuditFiles,
  type AuditSummary,
  listAuditFiles,
  readAuditSummary,
  summarizeEvents,
} from './audit-events';
import { type QuestionOptions, readOpenQuestionCount } from './open-questions';
import type { DemandDetail, StageState } from './reader';

export type WorkPosition = { stageSlug: string; unit: string | null; source: PositionSource };

export type WorkSignals = {
  position: WorkPosition;
  gateApproved: boolean;
  gateRejected: boolean;
  /** O último gate da tentativa da etapa é `GATE_APPROVED`. Vale para qualquer etapa. */
  isGateApproved: (stageSlug: string) => boolean;
  lastEvent: string | null;
  minutesSinceLastChange: number;
  openQuestions: number | 'unavailable';
};

const EMPTY_SUMMARY = summarizeEvents([]);
const NO_AUDIT: AuditFiles = { files: [], signature: 'sem-audit', lastModifiedMs: 0 };

/**
 * Onde o trabalho está de fato (BR1.2). Com a etapa em `[-]` e um evento de Unidade da execução
 * atual, a posição vem do `audit/`. Nos demais casos, vale o `aidlc-state.md`.
 */
export function deriveWorkPosition(
  current: Pick<StageState, 'stageSlug' | 'mark'> | null,
  summary: AuditSummary,
): WorkPosition {
  if (!current) return { stageSlug: '', unit: null, source: 'state' };
  const unitEvent =
    current.mark === 'in_progress' ? summary.unitEventAfterStart(current.stageSlug) : null;
  if (unitEvent) return { stageSlug: unitEvent.stage, unit: unitEvent.unit, source: 'audit' };
  return { stageSlug: current.stageSlug, unit: null, source: 'state' };
}

type CachedAudit = { signature: string; summary: AuditSummary };
type InFlightCount = { key: string; result: Promise<number | 'unavailable'> };

/**
 * Lê eventos e perguntas de forma assíncrona e guarda o resultado até as datas dos arquivos mudarem
 * (BR2.3, `performance-design.md`). Só um comando de perguntas roda por vez.
 */
export class WorkSignalsReader {
  private readonly audits = new Map<string, CachedAudit>();
  private readonly counts = new Map<string, { key: string; count: number | 'unavailable' }>();
  private inFlight: InFlightCount | null = null;
  private lastWarning: string | null = null;

  constructor(
    private readonly now: () => number,
    private readonly questions: QuestionOptions | null,
  ) {}

  async read(detail: DemandDetail, recordDir: string, cwd: string): Promise<WorkSignals> {
    const { audit, files } = await this.readAudit(detail.summary.intentId, recordDir);
    const current = detail.currentStage;
    const position = deriveWorkPosition(current, audit);
    const gate = position.source === 'state' && current ? audit.gateOf(current.stageSlug) : null;
    const lastChangeMs = Math.max(detail.stateModifiedAtMs, files.lastModifiedMs);
    const key = [detail.stateModifiedAtMs, files.signature].join('#');
    return {
      position,
      gateApproved: gate === 'GATE_APPROVED',
      gateRejected: gate === 'GATE_REJECTED',
      isGateApproved: (stageSlug) => audit.gateOf(stageSlug) === 'GATE_APPROVED',
      lastEvent: audit.lastEvent,
      minutesSinceLastChange: Math.max(0, Math.floor((this.now() - lastChangeMs) / 60_000)),
      openQuestions: detail.summary.isActive
        ? await this.countQuestions(detail.summary.intentId, position, cwd, key)
        : 'unavailable',
    };
  }

  /** Um `audit/` ilegível mantém o último resumo válido, ou volta ao `aidlc-state.md` (BR1.4). */
  private async readAudit(
    intentId: string,
    recordDir: string,
  ): Promise<{ audit: AuditSummary; files: AuditFiles }> {
    const cached = this.audits.get(intentId);
    try {
      const files = await listAuditFiles(path.join(recordDir, 'audit'));
      if (cached?.signature === files.signature) return { audit: cached.summary, files };
      const summary = await readAuditSummary(files.files);
      this.audits.set(intentId, { signature: files.signature, summary });
      return { audit: summary, files };
    } catch (error) {
      const reason = (error as NodeJS.ErrnoException).code ?? 'erro de leitura';
      this.warnOnce(`Não foi possível ler o audit/ de ${intentId} (${reason}).`);
      return { audit: cached?.summary ?? EMPTY_SUMMARY, files: NO_AUDIT };
    }
  }

  private async countQuestions(
    intentId: string,
    position: WorkPosition,
    cwd: string,
    filesKey: string,
  ): Promise<number | 'unavailable'> {
    if (!this.questions || !position.stageSlug) return 'unavailable';
    const key = [position.stageSlug, position.unit ?? '', filesKey].join('|');
    const cached = this.counts.get(intentId);
    if (cached?.key === key) return cached.count;

    const running = this.inFlight;
    if (running?.key === key) return running.result;
    if (running) await running.result;

    const result = readOpenQuestionCount(
      {
        stage: position.stageSlug,
        unit: position.unit,
        cwd,
        onUnavailable: (reason) => this.warnOnce(`Perguntas indisponíveis: ${reason}.`),
      },
      this.questions,
    );
    this.inFlight = { key, result };
    const count = await result;
    if (this.inFlight?.key === key) this.inFlight = null;
    if (count !== 'unavailable') this.lastWarning = null;
    this.counts.set(intentId, { key, count });
    return count;
  }

  /** Uma vez por motivo enquanto ele não mudar, para não encher o console (NFR13.1). */
  private warnOnce(message: string): void {
    if (message === this.lastWarning) return;
    this.lastWarning = message;
    logger.warn('aidlc', message);
  }
}
