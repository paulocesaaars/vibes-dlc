import { describe, expect, it } from 'vitest';
import { decideMoment } from '@/core/decide-moment';
import type { GuideDecision, Moment, Turn } from '@/core/types';
import {
  momentContent,
  type MomentContext,
  NO_ACTIVE_INTENT_CONTENT,
  sendBlockedMessage,
  STEP_LABELS,
} from '@/guide/moment-content';
import { phaseName, stageContent, stageName } from '@/guide/stage-content';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const context: MomentContext = {
  stageName: 'Projeto funcional',
  stageNumber: '3.1',
  stageDescription: 'Cada unidade ganha suas entidades e regras de negócio.',
  health: 'ok',
  failedPath: null,
};

const decision = (moment: Moment, turn: Turn = 'person'): GuideDecision => ({
  moment,
  turn,
  primaryAction: 'none',
  canSend: false,
  sendBlockedReason: null,
  showIdleNotice: false,
});

describe('StageContent', () => {
  it('traz o texto em português da etapa, com o agente do grafo', () => {
    const content = stageContent('functional-design', 'aidlc-architect-agent');
    expect(content.whatItDoes).toContain('entidades e regras');
    expect(content.howItWorks.join(' ')).toContain('agente de arquitetura');
    expect(content.stageSlug).toBe('functional-design');
  });

  it('usa o texto genérico em etapa sem texto próprio', () => {
    const content = stageContent('etapa-nova', 'aidlc-qualquer-agent');
    expect(content.stageSlug).toBe('generic');
    expect(content.whatItDoes).toContain('a sua IA');
    expect(content.howItWorks.join(' ')).toContain('agente desta etapa');
  });

  it('traduz nomes e mantém o original quando não conhece', () => {
    expect(phaseName('construction')).toBe('Construção');
    expect(phaseName('nova')).toBe('nova');
    expect(stageName('code-generation')).toBe('Geração de código');
    expect(stageName('nova')).toBe('nova');
  });

  it('nenhum texto do guia cita uma ferramenta de IA específica', () => {
    const sources = ['stage-content.ts', 'moment-content.ts'].map((file) =>
      readFileSync(path.join(process.cwd(), 'src', 'guide', file), 'utf8'),
    );
    for (const source of sources) expect(source).not.toMatch(/claude|codex|devin|copilot/i);
  });
});

describe('momentContent', () => {
  it('Entender mostra a etapa, o que ela faz e a ação Entendi', () => {
    const content = momentContent(decision('understand'), context);
    expect(content).toMatchObject({
      eyebrow: 'Etapa 3.1',
      title: 'Projeto funcional',
      primaryLabel: 'Entendi, continuar',
      stepNumber: 1,
      stepLabel: 'Entender',
      turnLabel: 'Sua vez',
    });
    expect(content.text).toBe(context.stageDescription);
  });

  it('Enviar oferece Enviar agora', () => {
    expect(momentContent(decision('send'), context)).toMatchObject({
      primaryLabel: 'Enviar agora',
      stepLabel: 'Enviar',
    });
  });

  it('colado pede Enter, sem afirmar que executou', () => {
    const content = momentContent(decision('pasted'), context);
    expect(content.title).toBe('Pressione Enter no terminal');
    expect(content.text).toContain('ainda não rodou');
    expect(content.primaryLabel).toBeNull();
  });

  it('Acompanhar traz as frases da especificação, conforme a vez', () => {
    const ai = momentContent(decision('following', 'ai'), context);
    expect(ai.text).toBe('Se a sua IA perguntar algo, responda no terminal.');
    expect(ai.turnLabel).toBe('Vez da sua IA');

    const person = momentContent(decision('following', 'person'), context);
    expect(person.text).toBe('Confira o terminal: a sua IA pode estar esperando por você.');
    expect(person.turnLabel).toBe('Sua vez');
    expect(person.text).not.toMatch(/aprovad/i);
  });

  it('sessão encerrada oferece Nova sessão', () => {
    expect(momentContent(decision('session_dead'), context).primaryLabel).toBe('Nova sessão');
  });

  it.each([
    ['missing_shell', 'C:\\Git\\bin\\bash.exe', /Git Bash.*C:\\Git\\bin\\bash\.exe.*VIBES_SHELL/],
    ['missing_aidlc', 'C:\\repo\\aidlc', /C:\\repo\\aidlc/],
    ['unreadable_record', 'C:\\r\\aidlc-state.md', /C:\\r\\aidlc-state\.md/],
  ] as const)('a falha %s mostra o caminho', (health, failedPath, expected) => {
    const content = momentContent(decision('failure'), { ...context, health, failedPath });
    expect(content.text).toMatch(expected);
    expect(content.primaryLabel).toBe('Tentar de novo');
    expect(content.stepNumber).toBe(0);
    expect(content.stepLabel).toBeNull();
  });

  it('cada momento tem no máximo uma ação e sempre uma instrução', () => {
    const moments: Moment[] = [
      'failure',
      'session_dead',
      'understand',
      'send',
      'pasted',
      'following',
    ];
    for (const moment of moments) {
      const content = momentContent(decision(moment), context);
      expect(content.title.length).toBeGreaterThan(0);
      expect(content.art.src).toMatch(/^\/guia\/[a-z]+\.webp$/);
      expect(content.art.alt.length).toBeGreaterThan(0);
    }
  });

  it('não oferece nenhuma ação de aprovar', () => {
    const moments: Moment[] = [
      'failure',
      'session_dead',
      'understand',
      'send',
      'pasted',
      'following',
    ];
    for (const moment of moments) {
      expect(momentContent(decision(moment), context).primaryLabel ?? '').not.toMatch(/aprov/i);
    }
  });

  it('usa um rótulo neutro quando a etapa não tem número', () => {
    expect(momentContent(decision('send'), { ...context, stageNumber: '' }).eyebrow).toBe(
      'Etapa atual',
    );
  });

  it('as artes usadas existem em public/guia', () => {
    const moments: Moment[] = [
      'failure',
      'session_dead',
      'understand',
      'send',
      'pasted',
      'following',
    ];
    const sources = moments.map((m) => momentContent(decision(m), context).art.src);
    for (const src of [...sources, NO_ACTIVE_INTENT_CONTENT.art.src]) {
      expect(() => readFileSync(path.join(process.cwd(), 'public', src))).not.toThrow();
    }
  });
});

describe('mensagens de bloqueio', () => {
  it('explica cada motivo em português', () => {
    const snapshotReasons = [
      'repo_failure',
      'not_active',
      'session_dead',
      'other_cli',
      'not_send_moment',
    ] as const;
    for (const reason of snapshotReasons) {
      expect(sendBlockedMessage(reason).length).toBeGreaterThan(10);
    }
    expect(decideMoment).toBeDefined();
    expect(STEP_LABELS).toEqual(['Entender', 'Enviar', 'Acompanhar', 'Revisar', 'Aprovar']);
  });
});
