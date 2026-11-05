import type { Level } from '@/triage/suggest-level';

/** Níveis do AI-DLC como `design/prototipo/Main.dc.html` os apresenta. */
export type LevelInfo = { name: Level; label: string; description: string; depth: string };

export const LEVELS: readonly LevelInfo[] = [
  {
    name: 'express',
    label: 'Expressa',
    depth: 'mínima',
    description: 'O caminho mais leve: de requisitos à entrega, sem etapa de projeto.',
  },
  {
    name: 'bugfix',
    label: 'Correção de erro',
    depth: 'mínima',
    description: 'Para corrigir um erro específico.',
  },
  {
    name: 'security-patch',
    label: 'Correção de segurança',
    depth: 'mínima',
    description: 'Para responder a uma vulnerabilidade conhecida.',
  },
  {
    name: 'refactor',
    label: 'Refatoração',
    depth: 'mínima',
    description: 'Para limpar código existente.',
  },
  {
    name: 'poc',
    label: 'Prova de conceito',
    depth: 'mínima',
    description: 'Para provar a viabilidade rapidamente.',
  },
  {
    name: 'infra',
    label: 'Infraestrutura',
    depth: 'padrão',
    description: 'Para mudanças de infraestrutura.',
  },
  {
    name: 'mvp',
    label: 'Produto mínimo',
    depth: 'padrão',
    description: 'Entrega o núcleo, sem a fase de operação.',
  },
  {
    name: 'classic',
    label: 'Clássica',
    depth: 'padrão',
    description: 'Cerimônia completa de concepção e construção.',
  },
  {
    name: 'workshop',
    label: 'Oficina',
    depth: 'padrão',
    description: 'Sessão em grupo facilitada, com aprovações obrigatórias.',
  },
  {
    name: 'feature',
    label: 'Funcionalidade',
    depth: 'padrão',
    description: 'Ciclo completo para novas funcionalidades.',
  },
  {
    name: 'enterprise',
    label: 'Corporativa',
    depth: 'completa',
    description: 'Funcionalidade regulada, com trilha de auditoria completa.',
  },
];

/** Nome do nível em português. Um nível que o guia não conhece aparece como o AI-DLC o escreve. */
export function levelLabel(name: string): string {
  return LEVELS.find((level) => level.name === name)?.label ?? name;
}
