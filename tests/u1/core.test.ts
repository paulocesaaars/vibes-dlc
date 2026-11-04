import { describe, expect, it } from 'vitest';
import { decideMoment, deriveCommandSent } from '@/core/decide-moment';
import type { SignalSnapshot, StageMark } from '@/core/types';

type Overrides = {
  health?: SignalSnapshot['repo']['health'];
  isActive?: boolean;
  mark?: StageMark;
  understood?: boolean;
  commandSent?: SignalSnapshot['guide']['commandSent'];
  session?: SignalSnapshot['session']['status'];
  cliKind?: SignalSnapshot['preferences']['cliKind'];
  artifactsTotal?: number;
};

function snapshot(overrides: Overrides = {}): SignalSnapshot {
  return {
    repo: { health: overrides.health ?? 'ok', failedPath: null },
    demand: { intentId: 'i', isActive: overrides.isActive ?? true, activeIntentId: 'i' },
    stage: {
      slug: 's',
      mark: overrides.mark ?? 'pending',
      lastEvent: null,
      hasNextStage: true,
      unit: null,
      gateApproved: false,
      gateRejected: false,
    },
    previous: null,
    position: { source: 'state' },
    signals: { openQuestions: 'unavailable', minutesSinceLastChange: 0 },
    guide: {
      understood: overrides.understood ?? false,
      commandSent: overrides.commandSent ?? 'none',
      artifactsTotal: overrides.artifactsTotal ?? 0,
      artifactsReviewed: 0,
    },
    session: { status: overrides.session ?? 'alive' },
    preferences: { cliKind: overrides.cliKind ?? 'claude_code' },
  };
}

describe('decideMoment', () => {
  it.each([
    ['falha do repositório', { health: 'unreadable_record' }, 'failure', 'person', 'retry'],
    [
      'sem shell',
      { health: 'missing_shell', session: 'unavailable' },
      'failure',
      'person',
      'retry',
    ],
    ['sessão encerrada', { session: 'dead' }, 'session_dead', 'person', 'new_session'],
    ['aprovada', { mark: 'approved' }, 'following', 'person', 'none'],
    ['pulada', { mark: 'skipped' }, 'following', 'person', 'none'],
    ['marca desconhecida', { mark: 'unknown' }, 'following', 'person', 'none'],
    [
      'executado com gate aberto',
      { commandSent: 'executed', mark: 'awaiting_approval' },
      'approve',
      'person',
      'none',
    ],
    [
      'executado em andamento',
      { commandSent: 'executed', mark: 'in_progress' },
      'following',
      'ai',
      'none',
    ],
    ['colado', { commandSent: 'pasted' }, 'pasted', 'person', 'none'],
    ['entendeu', { understood: true }, 'send', 'person', 'send'],
    ['início da etapa', {}, 'understand', 'person', 'understood'],
  ] as const)('%s', (_name, overrides, moment, turn, primaryAction) => {
    expect(decideMoment(snapshot(overrides))).toMatchObject({ moment, turn, primaryAction });
  });

  it('respeita a ordem da tabela: falha vale mais que sessão encerrada', () => {
    const decision = decideMoment(snapshot({ health: 'missing_aidlc', session: 'dead' }));
    expect(decision.moment).toBe('failure');
    expect(decision.sendBlockedReason).toBe('repo_failure');
  });

  it('marca aprovada vale mais que comando executado e não vira vez da IA', () => {
    const decision = decideMoment(snapshot({ mark: 'approved', commandSent: 'executed' }));
    expect(decision).toMatchObject({ moment: 'following', turn: 'person' });
  });

  it('canSend só é verdadeiro no momento send, com tudo em ordem', () => {
    expect(decideMoment(snapshot({ understood: true }))).toMatchObject({
      canSend: true,
      sendBlockedReason: null,
    });
    expect(decideMoment(snapshot())).toMatchObject({
      canSend: false,
      sendBlockedReason: 'not_send_moment',
    });
  });

  it('demanda não ativa tem momento próprio na tabela de U2 e bloqueia o envio', () => {
    const decision = decideMoment(snapshot({ understood: true, isActive: false }));
    expect(decision).toMatchObject({
      moment: 'not_active',
      canSend: false,
      sendBlockedReason: 'not_active',
    });
  });

  it.each([
    ['outra CLI', { cliKind: 'other' }, 'other_cli'],
    ['sessão sem shell com repositório ok', { session: 'unavailable' }, 'session_dead'],
  ] as const)('bloqueia o envio: %s', (_name, overrides, reason) => {
    const decision = decideMoment(snapshot({ understood: true, ...overrides }));
    expect(decision.moment).toBe('send');
    expect(decision).toMatchObject({ canSend: false, sendBlockedReason: reason });
  });

  it.each([
    ['já no passo Enviar', { understood: true }],
    ['antes de marcar Entendi', { understood: false }],
  ] as const)(
    'Outra CLI passa a Acompanhar com o primeiro artefato: %s (BR6.3)',
    (_name, overrides) => {
      const decision = decideMoment(
        snapshot({ cliKind: 'other', artifactsTotal: 1, ...overrides }),
      );
      expect(decision).toMatchObject({
        moment: 'following',
        turn: 'ai',
        primaryAction: 'none',
        canSend: false,
      });
    },
  );

  it('Outra CLI sem artefato continua em Enviar (BR6.3)', () => {
    const decision = decideMoment(snapshot({ understood: true, cliKind: 'other' }));
    expect(decision.moment).toBe('send');
  });

  it('Claude Code com artefato continua em Enviar: o sinal é o comando enviado', () => {
    const decision = decideMoment(
      snapshot({ understood: true, cliKind: 'claude_code', artifactsTotal: 1 }),
    );
    expect(decision.moment).toBe('send');
  });

  it('Com Outra CLI, a etapa em revisão de artefatos não muda: o gate vem antes (BR6.3)', () => {
    const decision = decideMoment(
      snapshot({ mark: 'awaiting_approval', cliKind: 'other', artifactsTotal: 1 }),
    );
    expect(decision.moment).toBe('review');
  });

  it('Outra CLI vale mais que a sessão ainda não viva no passo Enviar (BR6.2)', () => {
    const decision = decideMoment(
      snapshot({ understood: true, cliKind: 'other', session: 'unavailable' }),
    );
    expect(decision).toMatchObject({
      moment: 'send',
      canSend: false,
      sendBlockedReason: 'other_cli',
    });
  });

  it('informa o motivo em sessão encerrada', () => {
    expect(decideMoment(snapshot({ session: 'dead', understood: true }))).toMatchObject({
      canSend: false,
      sendBlockedReason: 'session_dead',
    });
  });

  it('é uma função pura: não muda o retrato', () => {
    const input = Object.freeze(snapshot());
    expect(() => decideMoment(input)).not.toThrow();
  });
});

describe('deriveCommandSent', () => {
  it('sem comando, none', () => {
    expect(deriveCommandSent(null, 100)).toBe('none');
  });

  it('execute vale como executed, seja qual for a data do estado', () => {
    expect(deriveCommandSent({ mode: 'execute', writtenAt: 500 }, 100)).toBe('executed');
  });

  it('paste fica pasted até o aidlc-state.md mudar depois do envio', () => {
    expect(deriveCommandSent({ mode: 'paste', writtenAt: 500 }, 100)).toBe('pasted');
    expect(deriveCommandSent({ mode: 'paste', writtenAt: 500 }, 500)).toBe('pasted');
    expect(deriveCommandSent({ mode: 'paste', writtenAt: 500 }, 501)).toBe('executed');
  });

  it('paste sem data continua pasted', () => {
    expect(deriveCommandSent({ mode: 'paste', writtenAt: null }, 999)).toBe('pasted');
  });
});
