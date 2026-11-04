import type {
  CommandSent,
  GuideDecision,
  Moment,
  PrimaryAction,
  SendBlockedReason,
  SignalSnapshot,
  StageMark,
  Turn,
} from './types';

type MomentRow = { moment: Moment; turn: Turn; primaryAction: PrimaryAction };

const IDLE_MINUTES = 10;
const MARKS_WITHOUT_CLAIM: readonly StageMark[] = ['approved', 'skipped', 'unknown'];
const IDLE_MOMENTS: readonly Moment[] = ['following', 'revising'];
const IDLE_MARKS: readonly StageMark[] = ['in_progress', 'revising'];
const CONCLUSION_MARKS: readonly StageMark[] = ['pending', 'in_progress'];

const row = (moment: Moment, turn: Turn, primaryAction: PrimaryAction): MomentRow => ({
  moment,
  turn,
  primaryAction,
});

/**
 * A aprovação marca `[x]` na etapa, `[-]` na seguinte e muda `Current Stage` no mesmo ato, então a
 * conclusão é da etapa anterior (BR5.2). Ela só aparece enquanto a etapa atual ainda não andou: se a
 * pessoa foi em frente pelo terminal, o guia não volta a ela.
 */
function isConclusionPending(snapshot: SignalSnapshot): boolean {
  const { previous, position, stage, guide, signals } = snapshot;
  return (
    previous !== null &&
    previous.gateApproved &&
    !previous.conclusionSeen &&
    position.source === 'state' &&
    CONCLUSION_MARKS.includes(stage.mark) &&
    !stage.gateRejected &&
    !guide.understood &&
    guide.commandSent === 'none' &&
    guide.artifactsTotal === 0 &&
    !(typeof signals.openQuestions === 'number' && signals.openQuestions > 0)
  );
}

/** Linhas 1 a 8 da tabela de `functional-spec.md`: falhas, conclusão e o gate. */
function pickBlockingMoment(snapshot: SignalSnapshot): MomentRow | null {
  const { repo, demand, session, stage, guide } = snapshot;
  if (repo.health !== 'ok') return row('failure', 'person', 'retry');
  if (!demand.isActive) return row('not_active', 'person', 'activate');
  if (session.status === 'dead') return row('session_dead', 'person', 'new_session');
  if (isConclusionPending(snapshot)) return row('conclusion', 'guide', 'next_stage');
  if (stage.mark === 'approved' && stage.gateApproved && !stage.hasNextStage) {
    return row('trail_done', 'guide', 'none');
  }
  // A marca `[x]` sem o evento fica aqui, sem afirmar aprovação (BR5.2).
  if (MARKS_WITHOUT_CLAIM.includes(stage.mark)) return row('following', 'person', 'none');
  if (stage.mark === 'awaiting_approval') {
    return guide.artifactsReviewed < guide.artifactsTotal
      ? row('review', 'person', 'mark_reviewed')
      : row('approve', 'person', 'none');
  }
  return null;
}

/** A tabela de 15 linhas de `functional-spec.md`: a primeira condição verdadeira vale. */
function pickMoment(snapshot: SignalSnapshot): MomentRow {
  const blocking = pickBlockingMoment(snapshot);
  if (blocking) return blocking;
  const { stage, position, signals, guide, preferences } = snapshot;
  if (typeof signals.openQuestions === 'number' && signals.openQuestions > 0) {
    return row('question', 'person', 'none');
  }
  if (stage.mark === 'revising' || stage.gateRejected) return row('revising', 'ai', 'none');
  if (position.source === 'audit') return row('following', 'ai', 'none');
  if (guide.commandSent === 'executed') return row('following', 'ai', 'none');
  if (guide.commandSent === 'pasted') return row('pasted', 'person', 'none');
  // Com Outra CLI o guia não envia comando: o primeiro artefato gravado é o sinal de que a IA começou (BR6.3).
  if (preferences.cliKind !== 'claude_code' && guide.artifactsTotal > 0) {
    return row('following', 'ai', 'none');
  }
  if (guide.understood) return row('send', 'person', 'send');
  return row('understand', 'person', 'understood');
}

/**
 * Faixa de IA parada (BR3.1): só em Acompanhar, com a etapa em andamento ou em revisão e 10 minutos
 * sem mudança. A contagem vem da data dos arquivos, então o aviso sobrevive a recarregar (BR3.2).
 */
export function showIdleNotice(moment: Moment, snapshot: SignalSnapshot): boolean {
  return (
    IDLE_MOMENTS.includes(moment) &&
    IDLE_MARKS.includes(snapshot.stage.mark) &&
    snapshot.signals.minutesSinceLastChange >= IDLE_MINUTES
  );
}

function sendBlock(
  snapshot: SignalSnapshot,
  moment: Moment,
  idleNotice: boolean,
): SendBlockedReason | null {
  if (moment === 'failure') return 'repo_failure';
  if (moment === 'not_active') return 'not_active';
  if (moment === 'session_dead') return 'session_dead';
  if (moment !== 'send' && !idleNotice) return 'not_send_moment';
  // Com Outra CLI não há envio, com ou sem sessão: o motivo não pode depender do terminal (BR6.2).
  if (snapshot.preferences.cliKind !== 'claude_code') return 'other_cli';
  if (snapshot.session.status !== 'alive') return 'session_dead';
  return null;
}

/** `canSend`: no momento `send` ou em Retomar, com tudo em ordem (BR3.3). */
export function canSend(reason: SendBlockedReason | null): boolean {
  return reason === null;
}

/** Função pura: o `Core` não faz entrada nem saída (C1). */
export function decideMoment(snapshot: SignalSnapshot): GuideDecision {
  const picked = pickMoment(snapshot);
  const idleNotice = showIdleNotice(picked.moment, snapshot);
  const sendBlockedReason = sendBlock(snapshot, picked.moment, idleNotice);
  return {
    ...picked,
    canSend: canSend(sendBlockedReason),
    sendBlockedReason,
    showIdleNotice: idleNotice,
  };
}

/**
 * Calcula `guide.commandSent` a partir do último comando `written` da etapa. Um comando colado
 * conta como executado quando `aidlc-state.md` muda depois dele: as duas datas vêm do relógio da
 * mesma máquina, e o produto não escreve em `aidlc/`.
 */
export function deriveCommandSent(
  lastWritten: { mode: 'execute' | 'paste'; writtenAt: number | null } | null,
  stateModifiedAtMs: number,
): CommandSent {
  if (!lastWritten) return 'none';
  if (lastWritten.mode === 'execute') return 'executed';
  if (lastWritten.writtenAt !== null && stateModifiedAtMs > lastWritten.writtenAt) {
    return 'executed';
  }
  return 'pasted';
}
