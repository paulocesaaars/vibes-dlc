/**
 * Momentos do guia e da navegação cuja arte, título e texto podem ser trocados (BR2.2). A lista é
 * dado estático: quem a lê decide o que aceitar, e o `failure` fica de fora para a instrução de
 * falha nunca ser escondida.
 */
export type CustomizableMoment = {
  momentKey: string;
  /** Nome mostrado na tela Personalizar. */
  name: string;
  defaultTitle: string;
  defaultText: string;
  /** Marcações aceitas no título e no texto, sem as chaves. */
  tokens: readonly string[];
  /** Arte original do momento, usada quando não há mídia personalizada. */
  defaultArtSrc: string;
  /** Falso nos momentos de recuperação, que aceitam só a arte. */
  textEditable: boolean;
};

const ART = {
  boasvindas: '/guia/boasvindas.webp',
  entender: '/guia/entender.webp',
  comando: '/guia/comando.webp',
  pergunta: '/guia/pergunta.webp',
  revisao: '/guia/revisao.webp',
  trabalhando: '/guia/trabalhando.webp',
  aprovar: '/guia/aprovar.webp',
  conclusao: '/guia/conclusao.webp',
} as const;

function moment(
  momentKey: string,
  name: string,
  defaults: [title: string, text: string],
  defaultArtSrc: string,
  tokens: readonly string[] = [],
  textEditable = true,
): CustomizableMoment {
  return {
    momentKey,
    name,
    defaultTitle: defaults[0],
    defaultText: defaults[1],
    tokens,
    defaultArtSrc,
    textEditable,
  };
}

export const CUSTOMIZABLE_MOMENTS: readonly CustomizableMoment[] = [
  moment(
    'home',
    'Início',
    ['Início', 'Escolha uma demanda para continuar ou consultar.'],
    ART.boasvindas,
  ),
  moment(
    'new_describe',
    'Nova demanda, passo 1',
    ['Conte o que você precisa', 'Descreva a mudança com as suas palavras.'],
    ART.boasvindas,
  ),
  moment(
    'new_level',
    'Nova demanda, passo 2',
    ['Escolha o tamanho do trabalho', 'Sugestão: {nivel}. {motivo}'],
    ART.entender,
    ['nivel', 'motivo'],
  ),
  moment(
    'new_confirm',
    'Nova demanda, passo 3',
    ['Confira o comando', 'Só vai para a sua IA quando você confirmar.'],
    ART.comando,
  ),
  moment('understand', 'Entender a etapa', ['{etapa}', '{descricao}'], ART.entender, [
    'etapa',
    'descricao',
  ]),
  moment(
    'send',
    'Confirmar o comando',
    [
      'Confira o comando',
      'Só vai para a sua IA quando você confirmar. Se precisar, edite aqui mesmo.',
    ],
    ART.comando,
  ),
  moment(
    'pasted',
    'Comando colado',
    [
      'Pressione Enter no terminal',
      'O comando já está na linha do terminal, mas ainda não rodou. Ajuste lá se quiser.',
    ],
    ART.comando,
  ),
  moment(
    'following',
    'IA trabalhando',
    ['Pode acompanhar daqui', 'Se a sua IA perguntar algo, responda no terminal.'],
    ART.trabalhando,
    ['etapa'],
  ),
  moment(
    'question',
    'Pergunta da IA',
    ['A sua IA tem uma pergunta', 'Ela precisa de uma decisão sua para continuar.'],
    ART.pergunta,
  ),
  moment(
    'review',
    'Revisar os artefatos',
    [
      'Leia antes de aprovar',
      'Esta é a parte mais importante: é aqui que você garante a qualidade. Se algo estiver errado, peça alterações no terminal.',
    ],
    ART.revisao,
  ),
  moment(
    'approve',
    'Aprovar',
    ['Agora é só aprovar', 'Quem registra a aprovação é o AI-DLC, então ela é dada no terminal.'],
    ART.aprovar,
  ),
  moment(
    'revising',
    'Pedir alterações',
    ['A sua IA está refazendo', 'A sua IA refaz o artefato e pede a sua aprovação de novo.'],
    ART.revisao,
  ),
  moment(
    'conclusion',
    'Etapa concluída',
    ['Etapa concluída!', 'Mais uma parte da trilha foi aprovada.'],
    ART.conclusao,
  ),
  moment(
    'trail_done',
    'Trilha concluída',
    [
      'Trilha concluída!',
      'Todas as etapas foram aprovadas. Os comandos enviados pelo painel estão logo abaixo.',
    ],
    ART.conclusao,
  ),
  moment(
    'session_dead',
    'Sessão encerrada (só a arte)',
    ['Abra uma nova sessão do terminal', 'A sessão foi encerrada.'],
    ART.pergunta,
    [],
    false,
  ),
  moment(
    'not_active',
    'Demanda não ativa (só a arte)',
    ['Esta não é a demanda ativa', 'O AI-DLC está com outra demanda ativa.'],
    ART.pergunta,
    [],
    false,
  ),
];

export function findMoment(momentKey: string): CustomizableMoment | undefined {
  return CUSTOMIZABLE_MOMENTS.find((entry) => entry.momentKey === momentKey);
}
