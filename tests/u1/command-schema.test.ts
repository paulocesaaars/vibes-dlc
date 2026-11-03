import { describe, expect, it } from 'vitest';
import { commandSchema } from '@/web/schemas';

const base = {
  commandId: '6f1d2c3a-1b2c-4d3e-8f90-123456789abc',
  intentId: '261103-vibes-dlc-mvp',
  stageSlug: 'functional-design',
  mode: 'paste',
};

describe('commandSchema', () => {
  it('aceita um comando de uma linha, com acentos e espaços', () => {
    expect(commandSchema.safeParse({ ...base, text: '/aidlc --stage ação 1' }).success).toBe(true);
  });

  it.each([
    ['quebra de linha', '/aidlc\nrm -rf x'],
    ['retorno de carro', '/aidlc\r'],
    ['Ctrl-O, que pode executar a linha sem Enter', '/aidlc\u000f'],
    ['ESC, que inicia sequências de controle', '/aidlc\u001b[A'],
    ['tabulação', '/aidlc\tx'],
    ['DEL', '/aidlc\u007f'],
    ['NUL', '\u0000/aidlc'],
  ])('recusa %s', (_name, text) => {
    expect(commandSchema.safeParse({ ...base, text }).success).toBe(false);
  });

  it('recusa texto só com espaços', () => {
    expect(commandSchema.safeParse({ ...base, text: '   ' }).success).toBe(false);
  });
});
