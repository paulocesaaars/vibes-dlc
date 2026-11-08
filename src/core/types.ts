export type RepoHealth = 'ok' | 'missing_aidlc' | 'unreadable_record' | 'missing_shell';
export type StageMark =
  'pending' | 'in_progress' | 'awaiting_approval' | 'revising' | 'approved' | 'skipped' | 'unknown';
export type PositionSource = 'state' | 'audit';
export type TrailStatus = 'done' | 'current' | 'previous' | 'blocked' | 'skipped';
