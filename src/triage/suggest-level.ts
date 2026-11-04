export type Level =
  | 'express'
  | 'bugfix'
  | 'security-patch'
  | 'refactor'
  | 'poc'
  | 'infra'
  | 'mvp'
  | 'classic'
  | 'workshop'
  | 'feature'
  | 'enterprise';

export type LevelSuggestion = { scope: Level; reason: string };

const RULES: { scope: Level; expression: RegExp; reason: string }[] = [
  {
    scope: 'security-patch',
    expression: /\b(cve|vulnerab\w*|seguranca)\b/i,
    reason: 'A descrição indica uma correção de segurança.',
  },
  {
    scope: 'bugfix',
    expression: /\b(bug\w*|erro\w*|corrigir|consertar|quebrad\w*)\b/i,
    reason: 'A descrição indica a correção de um erro.',
  },
  {
    scope: 'refactor',
    expression: /\b(refator\w*|simplificar|limpar)\b/i,
    reason: 'A descrição indica reorganização do código.',
  },
  {
    scope: 'infra',
    expression: /\b(infraestrutura|infra|terraform|implantac\w*)\b/i,
    reason: 'A descrição indica trabalho de infraestrutura.',
  },
  {
    scope: 'poc',
    expression: /\b(poc|prova de conceito|prototipo)\b/i,
    reason: 'A descrição indica uma prova de conceito.',
  },
  {
    scope: 'mvp',
    expression: /\b(mvp|produto minimo)\b/i,
    reason: 'A descrição indica um produto mínimo.',
  },
  {
    scope: 'workshop',
    expression: /\b(oficina|workshop|treinamento)\b/i,
    reason: 'A descrição indica uma oficina.',
  },
  {
    scope: 'enterprise',
    expression: /\b(compliance|conformidade|regulad\w*|auditoria|lgpd)\b/i,
    reason: 'A descrição indica requisitos empresariais.',
  },
  {
    scope: 'express',
    expression: /\b(ajuste pequeno|expresso)\b/i,
    reason: 'A descrição indica uma mudança pequena.',
  },
];

export function suggestLevel(description: string): LevelSuggestion {
  const normalized = description
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const rule = RULES.find((candidate) => candidate.expression.test(normalized));
  return rule
    ? { scope: rule.scope, reason: rule.reason }
    : { scope: 'feature', reason: 'Nenhuma regra específica combinou com a descrição.' };
}

export function cleanDescription(description: string): string {
  // Caracteres de controle são removidos e a linha fica visível antes de confirmar.
  return description
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replaceAll('"', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildDemandCommand(
  description: string,
  scope: Level,
  hasActiveWork: boolean,
): string {
  const command = hasActiveWork ? '/aidlc --new-intent' : '/aidlc';
  return `${command} --scope ${scope} "${cleanDescription(description)}"`;
}

export function buildAnalysisCommand(description: string): string {
  return `/aidlc compose "${cleanDescription(description)}"`;
}
