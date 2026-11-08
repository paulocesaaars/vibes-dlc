import path from 'node:path';
import { type AuditSummary, listAuditFiles, readAuditSummary } from './audit-events';
import type { DemandDetail, StageState } from './reader';

export type WorkPosition = { stageSlug: string; unit: string | null; source: 'state' | 'audit' };
export type WorkSignals = {
  position: WorkPosition;
  gateApproved: boolean;
  gateRejected: boolean;
  isGateApproved: (stage: string) => boolean;
  lastEvent: string | null;
  minutesSinceLastChange: number;
};
export function deriveWorkPosition(
  current: Pick<StageState, 'stageSlug' | 'mark'> | null,
  summary: AuditSummary,
): WorkPosition {
  if (!current) return { stageSlug: '', unit: null, source: 'state' };
  const unit =
    current.mark === 'in_progress' ? summary.unitEventAfterStart(current.stageSlug) : null;
  return unit
    ? { stageSlug: unit.stage, unit: unit.unit, source: 'audit' }
    : { stageSlug: current.stageSlug, unit: null, source: 'state' };
}
/** Estado e auditoria são relidos: uma troca de branch não reutiliza aprovações de outro histórico. */
export class WorkSignalsReader {
  constructor(private readonly now: () => number) {}
  async read(detail: DemandDetail, recordDir: string): Promise<WorkSignals> {
    const files = await listAuditFiles(path.join(recordDir, 'audit'));
    const audit = await readAuditSummary(files.files);
    const position = deriveWorkPosition(detail.currentStage, audit);
    const gate =
      position.source === 'state' && detail.currentStage
        ? audit.gateOf(detail.currentStage.stageSlug)
        : null;
    return {
      position,
      gateApproved: gate === 'GATE_APPROVED',
      gateRejected: gate === 'GATE_REJECTED',
      isGateApproved: (slug) => audit.gateOf(slug) === 'GATE_APPROVED',
      lastEvent: audit.lastEvent,
      minutesSinceLastChange: Math.max(
        0,
        Math.floor((this.now() - Math.max(detail.stateModifiedAtMs, files.lastModifiedMs)) / 60000),
      ),
    };
  }
}
