export type CustomizableMoment = {
  momentKey: string;
  name: string;
  defaultTitle: string;
  defaultText: string;
  tokens: readonly string[];
  defaultArtSrc: string;
  textEditable: boolean;
};
export const CUSTOMIZABLE_MOMENTS: readonly CustomizableMoment[] = [
  {
    momentKey: 'home',
    name: 'Início',
    defaultTitle: 'Olá! Eu te guio em cada etapa',
    defaultText:
      'Você decide e aprova. A sua IA faz o trabalho no terminal ao lado. Escolha por onde continuar.',
    tokens: [],
    defaultArtSrc: '/guia/boasvindas.webp',
    textEditable: true,
  },
  {
    momentKey: 'following',
    name: 'Acompanhamento',
    defaultTitle: '{etapa}',
    defaultText:
      'O painel mostra o andamento registrado pelo AI-DLC. Continue e responda à sua IA no terminal.',
    tokens: ['etapa'],
    defaultArtSrc: '/guia/trabalhando.webp',
    textEditable: true,
  },
  {
    momentKey: 'approve',
    name: 'Aprovação pendente',
    defaultTitle: 'Aprovação pendente',
    defaultText:
      'Consulte os artefatos antes de decidir. A aprovação ou o pedido de alterações é registrado pelo AI-DLC no terminal.',
    tokens: ['etapa'],
    defaultArtSrc: '/guia/aprovar.webp',
    textEditable: true,
  },
  {
    momentKey: 'revising',
    name: 'Alterações registradas',
    defaultTitle: 'Alterações solicitadas',
    defaultText:
      'O AI-DLC registrou revisão ou rejeição. Consulte os registros e continue pelo terminal.',
    tokens: ['etapa'],
    defaultArtSrc: '/guia/revisao.webp',
    textEditable: true,
  },
  {
    momentKey: 'trail_done',
    name: 'Trilha concluída',
    defaultTitle: 'Trilha concluída',
    defaultText:
      'O AI-DLC registrou a conclusão das etapas planejadas e a aprovação da etapa final.',
    tokens: [],
    defaultArtSrc: '/guia/conclusao.webp',
    textEditable: true,
  },
];
export function findMoment(key: string): CustomizableMoment | undefined {
  return CUSTOMIZABLE_MOMENTS.find((m) => m.momentKey === key);
}
