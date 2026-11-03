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

const MARKS_WITHOUT_CLAIM: readonly StageMark[] = ['approved', 'skipped', 'unknown'];

/** A tabela de momentos de U1 (`functional-spec.md`): a primeira condição verdadeira vale. */
function pickMoment(snapshot: SignalSnapshot): MomentRow {
  const { repo, session, stage, guide } = snapshot;
  if (repo.health !== 'ok') return { moment: 'failure', turn: 'person', primaryAction: 'retry' };
  if (session.status === 'dead') {
    return { moment: 'session_dead', turn: 'person', primaryAction: 'new_session' };
  }
  if (MARKS_WITHOUT_CLAIM.includes(stage.mark)) {
    return { moment: 'following', turn: 'person', primaryAction: 'none' };
  }
  if (guide.commandSent === 'executed') {
    const turn: Turn = stage.mark === 'awaiting_approval' ? 'person' : 'ai';
    return { moment: 'following', turn, primaryAction: 'none' };
  }
  if (guide.commandSent === 'pasted') {
    return { moment: 'pasted', turn: 'person', primaryAction: 'none' };
  }
  if (guide.understood) return { moment: 'send', turn: 'person', primaryAction: 'send' };
  return { moment: 'understand', turn: 'person', primaryAction: 'understood' };
}

function sendBlock(snapshot: SignalSnapshot, moment: Moment): SendBlockedReason | null {
  if (moment === 'failure') return 'repo_failure';
  if (moment === 'session_dead') return 'session_dead';
  if (moment !== 'send') return 'not_send_moment';
  if (!snapshot.demand.isActive) return 'not_active';
  if (snapshot.session.status !== 'alive') return 'session_dead';
  if (snapshot.preferences.cliKind !== 'claude_code') return 'other_cli';
  return null;
}

/** Função pura: o `Core` não faz entrada nem saída (C1). */
export function decideMoment(snapshot: SignalSnapshot): GuideDecision {
  const row = pickMoment(snapshot);
  const sendBlockedReason = sendBlock(snapshot, row.moment);
  return { ...row, canSend: sendBlockedReason === null, sendBlockedReason };
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
