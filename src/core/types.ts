/** Contrato C1: entrada e saída da decisão do guia. U2 e U3 acrescentam momentos e campos. */

export type RepoHealth = 'ok' | 'missing_aidlc' | 'unreadable_record' | 'missing_shell';

export type StageMark =
  'pending' | 'in_progress' | 'awaiting_approval' | 'revising' | 'approved' | 'skipped' | 'unknown';

export type CommandSent = 'none' | 'pasted' | 'executed';
export type SessionStatus = 'alive' | 'dead' | 'unavailable';
export type CliKind = 'claude_code' | 'other';

export type SignalSnapshot = {
  repo: { health: RepoHealth; failedPath: string | null };
  demand: { intentId: string; isActive: boolean; activeIntentId: string | null };
  stage: { slug: string; mark: StageMark; lastEvent: string | null; hasNextStage: boolean };
  signals: { openQuestions: number | 'unavailable'; minutesSinceLastChange: number };
  guide: {
    understood: boolean;
    commandSent: CommandSent;
    artifactsTotal: number;
    artifactsReviewed: number;
  };
  session: { status: SessionStatus };
  preferences: { cliKind: CliKind };
};

export type Moment = 'failure' | 'session_dead' | 'understand' | 'send' | 'pasted' | 'following';
export type Turn = 'person' | 'ai';
export type PrimaryAction = 'none' | 'retry' | 'new_session' | 'understood' | 'send';
export type SendBlockedReason =
  'repo_failure' | 'not_active' | 'session_dead' | 'other_cli' | 'not_send_moment';

export type GuideDecision = {
  moment: Moment;
  turn: Turn;
  primaryAction: PrimaryAction;
  canSend: boolean;
  sendBlockedReason: SendBlockedReason | null;
};
