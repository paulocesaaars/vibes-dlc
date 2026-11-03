import { describe, expect, it } from 'vitest';
import type { GuideDecision, Moment, Turn } from '@/core/types';
import {
  conclusionNote,
  idleNoticeText,
  momentContent,
  seenChangeText,
} from '@/guide/moment-content';
import { reviewChecklist } from '@/guide/review-checklist';

function decisionOf(moment: Moment, turn: Turn = 'person'): GuideDecision {
  return {
    moment,
    turn,
    primaryAction: 'none',
    canSend: false,
    sendBlockedReason: 'not_send_moment',
    showIdleNotice: false,
  };
}

const context = {
  stageName: 'Projeto funcional',
  stageNumber: '3.1',
  stageDescription: 'x',
  health: 'ok' as const,
  failedPath: null,
};

describe('textos dos momentos', () => {
  it('Revisar diz a contagem e quantos faltam, sem impedir (AC4.2.2)', () => {
    const content = momentContent(decisionOf('review'), {
      ...context,
      artifactsTotal: 3,
      artifactsReviewed: 1,
    });
    expect(content.eyebrow).toContain('1 de 3 revisados');
    expect(content.bandText).toContain('Falta revisar 2 artefatos');
    expect(content.bandText).toContain('mesmo assim');
    expect(content.stepNumber).toBe(4);
    expect(content.primaryLabel).toBe('Marcar como revisado');
  });

  it('Aprovar pede a resposta no terminal, com as opções no original (BR2.4)', () => {
    const content = momentContent(decisionOf('approve'), {
      ...context,
      artifactsTotal: 2,
      artifactsReviewed: 2,
    });
    expect(content.point).toContain('Approve');
    expect(content.point).toContain('Request Changes');
    expect(content.primaryLabel).toBeNull();
    expect(content.stepNumber).toBe(5);
  });

  it('Aprovar sem artefatos não diz que tudo foi revisado', () => {
    const content = momentContent(decisionOf('approve'), { ...context, artifactsTotal: 0 });
    expect(content.text).not.toContain('Tudo foi revisado');
    expect(content.text).toContain('não gravou artefatos');
  });

  it('a conclusão cita a próxima etapa; a trilha concluída não tem ação', () => {
    const conclusion = momentContent(decisionOf('conclusion', 'guide'), {
      ...context,
      nextStageName: 'Requisitos não funcionais',
    });
    expect(conclusion.bandText).toBe('Próxima: Requisitos não funcionais');
    expect(conclusion.primaryLabel).toBe('Ir para a próxima etapa');
    expect(conclusion.turnLabel).toBe('Vez do guia');
    const done = momentContent(decisionOf('trail_done', 'guide'), context);
    expect(done.primaryLabel).toBeNull();
    expect(done.title).toBe('Trilha concluída!');
  });

  it('pergunta e revisão usam as artes e os textos do protótipo', () => {
    const question = momentContent(decisionOf('question'), context);
    expect(question.title).toBe('A sua IA tem uma pergunta');
    expect(question.art.src).toBe('/guia/pergunta.webp');
    expect(question.point).toBe('Responda no terminal');
    const revising = momentContent(decisionOf('revising', 'ai'), context);
    expect(revising.art.src).toBe('/guia/revisao.webp');
    expect(revising.turnLabel).toBe('Vez da sua IA');
  });

  it('nenhum texto novo cita uma ferramenta de IA específica (requisito 16)', () => {
    const moments: Moment[] = ['question', 'review', 'approve', 'revising', 'conclusion'];
    const all = moments
      .map((moment) => JSON.stringify(momentContent(decisionOf(moment), context)))
      .join(' ');
    expect(all).not.toMatch(/claude|codex|copilot|cursor|gemini/i);
  });
});

describe('IA parada', () => {
  it('mostra os minutos e nunca afirma que a IA parou (BR3.2)', () => {
    const text = idleNoticeText(12);
    expect(text).toContain('12 minutos');
    expect(text).toContain('pode ter parado');
    expect(text).not.toMatch(/\ba sua IA parou\b(?! retome)/i);
    expect(text).toContain('limite de uso');
  });
});

describe('aviso ao reabrir', () => {
  it('descreve antes e agora, com a Unidade, sem afirmar aprovação de Unidade', () => {
    const text = seenChangeText(
      { name: 'Projeto funcional', unit: '', mark: 'in_progress' },
      { name: 'Geração de código', unit: 'u2-guide-flow', mark: 'in_progress' },
    );
    expect(text).toContain('Projeto funcional (em andamento)');
    expect(text).toContain('u2-guide-flow · Geração de código');
    expect(text).not.toContain('aprovada');
  });

  it('uma marca desconhecida não vira afirmação', () => {
    const text = seenChangeText(
      { name: 'A', unit: '', mark: 'unknown' },
      { name: 'B', unit: '', mark: 'approved' },
    );
    expect(text).toContain('situação desconhecida');
    expect(text).toContain('B (concluída)');
  });
});

describe('nota da conclusão (BR6.1)', () => {
  it('avisa quando faltou revisar, sem bloquear', () => {
    expect(conclusionNote('X', 1, 3)).toMatchObject({ isWarning: true });
    expect(conclusionNote('X', 1, 3).note).toContain('1 de 3');
  });

  it('não avisa com tudo revisado nem sem artefatos', () => {
    expect(conclusionNote('X', 3, 3)).toMatchObject({ isWarning: false });
    expect(conclusionNote('X', 1, 1).note).toContain('1 artefato antes');
    expect(conclusionNote('X', 0, 0).note).toContain('não gravou');
  });
});

describe('ReviewChecklist', () => {
  it('um artefato conhecido tem a própria lista', () => {
    const list = reviewChecklist('inception/requirements-analysis/requirements.md');
    expect(list.artifactName).toBe('requirements');
    expect(list.items.length).toBeGreaterThan(0);
  });

  it('um artefato desconhecido recebe a lista genérica', () => {
    expect(reviewChecklist('a/qualquer-coisa.md').artifactName).toBe('generic');
    expect(reviewChecklist('sem-extensao').artifactName).toBe('generic');
  });

  it('um nome que coincide com propriedade do objeto também recebe a genérica', () => {
    expect(reviewChecklist('constructor.md').artifactName).toBe('generic');
    expect(reviewChecklist('__proto__.md').artifactName).toBe('generic');
  });

  it('toda lista tem pelo menos um item', () => {
    for (const name of ['intent-statement', 'functional-spec', 'stories', 'x']) {
      expect(reviewChecklist(`${name}.md`).items.length).toBeGreaterThan(0);
    }
  });
});
