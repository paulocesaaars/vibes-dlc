import type { StageMark } from '@/core/types';

const MARKS: Record<string, StageMark> = {
  ' ': 'pending',
  '-': 'in_progress',
  '?': 'awaiting_approval',
  R: 'revising',
  x: 'approved',
  S: 'skipped',
};

export type StateStage = { slug: string; mark: StageMark; planned: 'execute' | 'skip' };

export type ParsedState = {
  project: string;
  scope: string;
  currentStage: string | null;
  stages: StateStage[];
};

/** O arquivo não está completo, em geral porque o AI-DLC está gravando. */
export class StateParseError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'StateParseError';
  }
}

function field(text: string, label: string): string | null {
  const match = new RegExp(`^- \\*\\*${label}\\*\\*:[ \\t]*(.*)$`, 'm').exec(text);
  return match?.[1]?.trim() ?? null;
}

function parseStages(text: string): StateStage[] {
  const start = text.indexOf('## Stage Progress');
  const end = start === -1 ? -1 : text.indexOf('\n## ', start);
  const section = start === -1 ? '' : text.slice(start, end === -1 ? undefined : end);
  const stages: StateStage[] = [];
  for (const line of section.split(/\r?\n/)) {
    const match = /^- \[(.)\] ([a-z0-9-]+)(?:\s+\S+\s+(\w+))?/.exec(line);
    if (!match) continue;
    const planned = match[3] === 'SKIP' ? 'skip' : 'execute';
    const mark = MARKS[match[1] as string] ?? 'unknown';
    // Uma etapa fora do plano aparece com `[ ]`, mas não vai acontecer.
    stages.push({
      slug: match[2] as string,
      mark: planned === 'skip' && mark === 'pending' ? 'skipped' : mark,
      planned,
    });
  }
  return stages;
}

/** Traduz `aidlc-state.md` (C8). Este módulo é a única camada que conhece o formato. */
export function parseState(text: string): ParsedState {
  if (/^(?:<{7} |={7}$|>{7} )/m.test(text)) {
    throw new StateParseError('o arquivo contém um conflito de merge');
  }
  const stages = parseStages(text);
  if (stages.length === 0)
    throw new StateParseError('a seção Stage Progress está vazia ou faltando');

  const currentStage = field(text, 'Current Stage');
  if (currentStage === null) throw new StateParseError('o campo Current Stage está faltando');

  return {
    project: field(text, 'Project') ?? '',
    scope: field(text, 'Scope') ?? '',
    currentStage: stages.some((stage) => stage.slug === currentStage) ? currentStage : null,
    stages,
  };
}
