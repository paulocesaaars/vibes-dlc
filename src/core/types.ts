/** Contrato C1: entrada e saída da decisão do guia. U2 e U3 acrescentam momentos e campos. */

export type RepoHealth = 'ok' | 'missing_aidlc' | 'unreadable_record' | 'missing_shell';

export type StageMark =
  'pending' | 'in_progress' | 'awaiting_approval' | 'revising' | 'approved' | 'skipped' | 'unknown';

export type CommandSent = 'none' | 'pasted' | 'executed';
export type SessionStatus = 'alive' | 'dead' | 'unavailable';
export type CliKind = 'claude_code' | 'other';
export type PositionSource = 'state' | 'audit';

export type SignalSnapshot = {
  repo: { health: RepoHealth; failedPath: string | null };
  demand: { intentId: string; isActive: boolean; activeIntentId: string | null };
  stage: {
    slug: string;
    mark: StageMark;
    lastEvent: string | null;
    hasNextStage: boolean;
    unit: string | null;
    gateApproved: boolean;
    gateRejected: boolean;
  };
  /** A etapa anterior à atual, na ordem do plano, base do momento `conclusion`. */
  previous: { slug: string; gateApproved: boolean; conclusionSeen: boolean } | null;
  position: { source: PositionSource };
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

export type Moment =
  | 'failure'
  | 'not_active'
  | 'session_dead'
  | 'conclusion'
  | 'trail_done'
  | 'review'
  | 'approve'
  | 'question'
  | 'revising'
  | 'following'
  | 'pasted'
  | 'send'
  | 'understand';
export type Turn = 'person' | 'ai' | 'guide';
export type PrimaryAction =
  | 'none'
  | 'retry'
  | 'activate'
  | 'new_session'
  | 'next_stage'
  | 'mark_reviewed'
  | 'understood'
  | 'send';
export type SendBlockedReason =
  'repo_failure' | 'not_active' | 'session_dead' | 'other_cli' | 'not_send_moment';

export type GuideDecision = {
  moment: Moment;
  turn: Turn;
  primaryAction: PrimaryAction;
  canSend: boolean;
  sendBlockedReason: SendBlockedReason | null;
  showIdleNotice: boolean;
};

export type ReviewStatus = 'pending' | 'reviewed' | 'changed';
export type TrailStatus = 'done' | 'current' | 'previous' | 'blocked' | 'skipped';
