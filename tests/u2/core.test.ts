import { describe, expect, it } from 'vitest';
import { decideMoment, showIdleNotice } from '@/core/decide-moment';
import { demandProgress, reviewStatus, trailStatuses } from '@/core/trail';
import type { SignalSnapshot, StageMark } from '@/core/types';

type Overrides = {
  previous?: SignalSnapshot['previous'];
  health?: SignalSnapshot['repo']['health'];
  isActive?: boolean;
  session?: SignalSnapshot['session']['status'];
  mark?: StageMark;
  gateApproved?: boolean;
  gateRejected?: boolean;
  hasNextStage?: boolean;
  source?: 'state' | 'audit';
  openQuestions?: number | 'unavailable';
  minutes?: number;
  commandSent?: SignalSnapshot['guide']['commandSent'];
  understood?: boolean;
  total?: number;
  reviewed?: number;
  cliKind?: SignalSnapshot['preferences']['cliKind'];
};

const APPROVED_BEFORE = { slug: 'p', gateApproved: true, conclusionSeen: false };

function snapshot(o: Overrides = {}): SignalSnapshot {
  return {
    repo: { health: o.health ?? 'ok', failedPath: null },
    demand: { intentId: 'i', isActive: o.isActive ?? true, activeIntentId: 'i' },
    stage: {
      slug: 's',
      mark: o.mark ?? 'in_progress',
      lastEvent: null,
      hasNextStage: o.hasNextStage ?? true,
      unit: null,
      gateApproved: o.gateApproved ?? false,
      gateRejected: o.gateRejected ?? false,
    },
    previous: o.previous ?? null,
    position: { source: o.source ?? 'state' },
    signals: {
      openQuestions: o.openQuestions ?? 'unavailable',
      minutesSinceLastChange: o.minutes ?? 0,
    },
    guide: {
      understood: o.understood ?? false,
      commandSent: o.commandSent ?? 'none',
      artifactsTotal: o.total ?? 0,
      artifactsReviewed: o.reviewed ?? 0,
    },
    session: { status: o.session ?? 'alive' },
    preferences: { cliKind: o.cliKind ?? 'claude_code' },
  };
}

describe('tabela de 15 linhas', () => {
  it.each<[string, Overrides, string, string, string]>([
    ['1 falha', { health: 'unreadable_record' }, 'failure', 'person', 'retry'],
    ['2 não ativa', { isActive: false }, 'not_active', 'person', 'activate'],
    ['3 sessão encerrada', { session: 'dead' }, 'session_dead', 'person', 'new_session'],
    [
      '4 conclusão da etapa anterior',
      { previous: APPROVED_BEFORE },
      'conclusion',
      'guide',
      'next_stage',
    ],
    [
      '5 trilha concluída',
      { mark: 'approved', gateApproved: true, hasNextStage: false },
      'trail_done',
      'guide',
      'none',
    ],
    ['6 aprovada sem evento', { mark: 'approved' }, 'following', 'person', 'none'],
    ['6 pulada', { mark: 'skipped' }, 'following', 'person', 'none'],
    ['6 desconhecida', { mark: 'unknown' }, 'following', 'person', 'none'],
    [
      '7 revisar',
      { mark: 'awaiting_approval', total: 2, reviewed: 1 },
      'review',
      'person',
      'mark_reviewed',
    ],
    [
      '8 aprovar com tudo revisado',
      { mark: 'awaiting_approval', total: 2, reviewed: 2 },
      'approve',
      'person',
      'none',
    ],
    ['8 aprovar sem artefatos', { mark: 'awaiting_approval' }, 'approve', 'person', 'none'],
    ['9 pergunta', { openQuestions: 2 }, 'question', 'person', 'none'],
    ['10 marca em revisão', { mark: 'revising' }, 'revising', 'ai', 'none'],
    ['10 gate rejeitado', { gateRejected: true }, 'revising', 'ai', 'none'],
    ['11 posição do audit', { source: 'audit' }, 'following', 'ai', 'none'],
    ['12 executado', { commandSent: 'executed' }, 'following', 'ai', 'none'],
    ['13 colado', { commandSent: 'pasted' }, 'pasted', 'person', 'none'],
    ['14 entendeu', { understood: true }, 'send', 'person', 'send'],
    ['15 início', {}, 'understand', 'person', 'understood'],
  ])('linha %s', (_name, overrides, moment, turn, primaryAction) => {
    expect(decideMoment(snapshot(overrides))).toMatchObject({ moment, turn, primaryAction });
  });

  it('a pergunta do gate não conta: a marca [?] vem antes da linha 9', () => {
    const decision = decideMoment(snapshot({ mark: 'awaiting_approval', openQuestions: 1 }));
    expect(decision.moment).toBe('approve');
  });

  it('openQuestions em unavailable segue a tabela, sem o momento question (BR2.2)', () => {
    expect(decideMoment(snapshot({ openQuestions: 'unavailable' })).moment).toBe('understand');
    expect(decideMoment(snapshot({ openQuestions: 0 })).moment).toBe('understand');
  });

  it('dentro de uma Unidade, só restam question e following (BR1.2)', () => {
    const inUnit = { source: 'audit', understood: true, commandSent: 'pasted' } as const;
    expect(decideMoment(snapshot(inUnit)).moment).toBe('following');
    expect(decideMoment(snapshot({ ...inUnit, openQuestions: 1 })).moment).toBe('question');
  });

  it('next_stage só existe com a etapa anterior em [x] e GATE_APPROVED (BR6.2)', () => {
    const notApproved: Parameters<typeof snapshot>[0][] = [
      {},
      { mark: 'approved' },
      { mark: 'approved', gateApproved: true },
      { mark: 'in_progress', gateApproved: true },
      { previous: { ...APPROVED_BEFORE, gateApproved: false } },
    ];
    for (const overrides of notApproved) {
      expect(decideMoment(snapshot(overrides)).primaryAction).not.toBe('next_stage');
    }
  });

  it.each<[string, Parameters<typeof snapshot>[0], string]>([
    ['já reconhecida', { previous: { ...APPROVED_BEFORE, conclusionSeen: true } }, 'understand'],
    ['já entendeu a etapa atual', { previous: APPROVED_BEFORE, understood: true }, 'send'],
    ['comando enviado', { previous: APPROVED_BEFORE, commandSent: 'executed' }, 'following'],
    ['comando colado', { previous: APPROVED_BEFORE, commandSent: 'pasted' }, 'pasted'],
    ['já tem artefatos', { previous: APPROVED_BEFORE, total: 1 }, 'understand'],
    ['pergunta aberta', { previous: APPROVED_BEFORE, openQuestions: 1 }, 'question'],
    ['dentro de uma Unidade', { previous: APPROVED_BEFORE, source: 'audit' }, 'following'],
    ['gate aberto', { previous: APPROVED_BEFORE, mark: 'awaiting_approval' }, 'approve'],
    ['em revisão', { previous: APPROVED_BEFORE, mark: 'revising' }, 'revising'],
    ['gate rejeitado', { previous: APPROVED_BEFORE, gateRejected: true }, 'revising'],
  ])('não volta à conclusão: %s', (_name, overrides, moment) => {
    expect(decideMoment(snapshot(overrides)).moment).toBe(moment);
  });

  it('a conclusão também vale com a etapa atual ainda em [ ], e nunca libera o envio', () => {
    const decision = decideMoment(snapshot({ previous: APPROVED_BEFORE, mark: 'pending' }));
    expect(decision.moment).toBe('conclusion');
    expect(decision).toMatchObject({ canSend: false, sendBlockedReason: 'not_send_moment' });
    const last = decideMoment(
      snapshot({ mark: 'approved', gateApproved: true, hasNextStage: false }),
    );
    expect(last).toMatchObject({ moment: 'trail_done', canSend: false });
  });

  it('falha, demanda não ativa e sessão encerrada vêm antes da conclusão', () => {
    const base = { previous: APPROVED_BEFORE };
    expect(decideMoment(snapshot({ ...base, health: 'missing_aidlc' })).moment).toBe('failure');
    expect(decideMoment(snapshot({ ...base, isActive: false })).moment).toBe('not_active');
    expect(decideMoment(snapshot({ ...base, session: 'dead' })).moment).toBe('session_dead');
  });

  it('nenhuma linha oferece uma ação de aprovar', () => {
    const decision = decideMoment(snapshot({ mark: 'awaiting_approval' }));
    expect(decision.primaryAction).toBe('none');
    expect(decision.canSend).toBe(false);
  });
});

describe('IA parada', () => {
  it('aparece aos 10 minutos em Acompanhar e não aos 9 (AC3.6.1, AC3.6.2)', () => {
    const at = (minutes: number) =>
      decideMoment(snapshot({ commandSent: 'executed', minutes })).showIdleNotice;
    expect(at(9)).toBe(false);
    expect(at(10)).toBe(true);
    expect(at(12)).toBe(true);
  });

  it('também vale em revisão e dentro de uma Unidade', () => {
    expect(decideMoment(snapshot({ mark: 'revising', minutes: 10 })).showIdleNotice).toBe(true);
    expect(decideMoment(snapshot({ source: 'audit', minutes: 10 })).showIdleNotice).toBe(true);
  });

  it('não aparece com a vez da pessoa nem com a etapa fora de andamento', () => {
    const cases: Overrides[] = [
      { mark: 'approved', minutes: 60 },
      { mark: 'awaiting_approval', minutes: 60 },
      { openQuestions: 1, minutes: 60 },
      { understood: true, minutes: 60 },
    ];
    for (const overrides of cases) {
      expect(decideMoment(snapshot(overrides)).showIdleNotice).toBe(false);
    }
    expect(showIdleNotice('following', snapshot({ mark: 'skipped', minutes: 60 }))).toBe(false);
  });
});

describe('canSend', () => {
  const idle = { source: 'audit', minutes: 10 } as const;

  it('é verdadeiro em send e em Retomar, com tudo em ordem (BR3.3)', () => {
    expect(decideMoment(snapshot({ understood: true })).canSend).toBe(true);
    expect(decideMoment(snapshot(idle))).toMatchObject({ canSend: true, sendBlockedReason: null });
  });

  it('é falso em Acompanhar antes dos 10 minutos', () => {
    expect(decideMoment(snapshot({ source: 'audit', minutes: 9 }))).toMatchObject({
      canSend: false,
      sendBlockedReason: 'not_send_moment',
    });
  });

  it('com outra CLI, Retomar fica só na orientação', () => {
    expect(decideMoment(snapshot({ ...idle, cliKind: 'other' }))).toMatchObject({
      canSend: false,
      sendBlockedReason: 'other_cli',
    });
  });

  it.each<[string, Overrides, string]>([
    ['falha', { health: 'missing_aidlc' }, 'repo_failure'],
    ['não ativa', { isActive: false }, 'not_active'],
    ['sessão encerrada', { session: 'dead' }, 'session_dead'],
    ['sem shell', { session: 'unavailable' }, 'session_dead'],
  ])('bloqueia em Retomar com %s', (_name, overrides, reason) => {
    const decision = decideMoment(snapshot({ ...idle, ...overrides }));
    expect(decision).toMatchObject({ canSend: false, sendBlockedReason: reason });
  });
});

describe('trilha', () => {
  const stage = (slug: string, mark: StageMark, planned: 'execute' | 'skip' = 'execute') => ({
    slug,
    mark,
    planned,
  });

  const plan = [
    stage('a', 'approved'),
    stage('b', 'in_progress'),
    stage('c', 'pending'),
    stage('d', 'pending'),
    stage('e', 'pending', 'skip'),
    stage('f', 'skipped'),
  ];

  it('distingue concluída, atual, bloqueada e pulada, com a posição do estado', () => {
    expect(trailStatuses(plan, 'b', 'state')).toEqual([
      'done',
      'current',
      'blocked',
      'blocked',
      'skipped',
      'skipped',
    ]);
  });

  it('com a posição do audit, o que vem antes da atual fica em previous, sem virar concluída', () => {
    expect(trailStatuses(plan, 'd', 'audit')).toEqual([
      'done',
      'previous',
      'previous',
      'current',
      'skipped',
      'skipped',
    ]);
  });

  it('com a posição do estado, nada fica em previous', () => {
    expect(trailStatuses(plan, 'd', 'state')).not.toContain('previous');
  });

  it('sem etapa atual, nada fica em previous nem em current', () => {
    const statuses = trailStatuses(plan, null, 'audit');
    expect(statuses).not.toContain('previous');
    expect(statuses).not.toContain('current');
  });

  it('o progresso conta só as etapas planejadas', () => {
    const stages = [
      stage('a', 'approved'),
      stage('b', 'approved'),
      stage('c', 'in_progress'),
      stage('d', 'pending', 'skip'),
      stage('e', 'skipped'),
    ];
    expect(demandProgress(stages)).toEqual({ done: 2, total: 3 });
    expect(demandProgress([])).toEqual({ done: 0, total: 0 });
  });
});

describe('estado do artefato (BR4.4)', () => {
  it('sem revisão, com o mesmo hash e com outro hash', () => {
    expect(reviewStatus('h1', undefined)).toBe('pending');
    expect(reviewStatus('h1', 'h1')).toBe('reviewed');
    expect(reviewStatus('h2', 'h1')).toBe('changed');
  });
});
