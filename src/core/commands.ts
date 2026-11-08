export const AI_OPTIONS = {
  claude_code: 'Claude Code',
  devin: 'Devin',
  copilot: 'GitHub Copilot',
} as const;

export type AiKind = keyof typeof AI_OPTIONS;

/** Ajusta somente o prefixo AI-DLC, preservando os argumentos. */
export function formatAiCommand(command: string, ai: AiKind): string {
  return ai === 'devin' ? command.replace(/^\/aidlc(?=\s|$)/, 'aidlc') : command;
}

export function isSafeSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(value);
}
