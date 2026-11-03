import type { GuideDecision, Moment, RepoHealth, SendBlockedReason } from '@/core/types';

export type GuideArt = { src: string; alt: string };

export type MomentContent = {
  eyebrow: string;
  title: string;
  text: string;
  point: string | null;
  art: GuideArt;
  stepNumber: number;
  stepLabel: string | null;
  turnLabel: string;
  bandText: string;
  bandWaiting: boolean;
  primaryLabel: string | null;
};

const ARTS = {
  entender: {
    src: '/guia/entender.webp',
    alt: 'Nix apontando para um mapa com uma trilha e bandeiras',
  },
  comando: {
    src: '/guia/comando.webp',
    alt: 'O pai digitando no notebook, com a Nix sentada na mesa ao lado de um botão verde',
  },
  pergunta: {
    src: '/guia/pergunta.webp',
    alt: 'Nix curiosa em uma bifurcação, com um ponto de interrogação',
  },
  trabalhando: {
    src: '/guia/trabalhando.webp',
    alt: 'Nix observando documentos e engrenagens saírem de um notebook',
  },
  boasvindas: {
    src: '/guia/boasvindas.webp',
    alt: 'A família acenando, com a Nix abanando o rabo',
  },
} satisfies Record<string, GuideArt>;

export const STEP_LABELS = ['Entender', 'Enviar', 'Acompanhar', 'Revisar', 'Aprovar'];

const STEP_BY_MOMENT: Record<Moment, number> = {
  failure: 0,
  understand: 1,
  send: 2,
  session_dead: 2,
  pasted: 2,
  following: 3,
};

const FOLLOWING_AI = 'Se a sua IA perguntar algo, responda no terminal.';
const FOLLOWING_PERSON = 'Confira o terminal: a sua IA pode estar esperando por você.';

export type MomentContext = {
  stageName: string;
  stageNumber: string;
  stageDescription: string;
  health: RepoHealth;
  failedPath: string | null;
};

function failureText(context: MomentContext): string {
  const where = context.failedPath ?? 'caminho desconhecido';
  if (context.health === 'missing_shell') {
    return `O Git Bash não foi encontrado. Procurei em: ${where}. Instale o Git para Windows ou defina VIBES_SHELL com o caminho do bash.exe.`;
  }
  if (context.health === 'missing_aidlc') {
    return `Não encontrei a pasta do AI-DLC: ${where}. Inicie o guia dentro de um repositório que use o AI-DLC.`;
  }
  return `Não consegui ler o registro do AI-DLC: ${where}. O terminal continua funcionando.`;
}

type MomentText = Pick<
  MomentContent,
  'eyebrow' | 'title' | 'text' | 'point' | 'art' | 'bandText' | 'bandWaiting' | 'primaryLabel'
>;

function momentText(decision: GuideDecision, context: MomentContext): MomentText {
  const stageEyebrow = context.stageNumber ? `Etapa ${context.stageNumber}` : 'Etapa atual';
  switch (decision.moment) {
    case 'failure':
      return {
        eyebrow: 'Antes de continuar',
        title: 'Algo impede o guia de seguir',
        text: failureText(context),
        point: null,
        art: ARTS.pergunta,
        bandText: '',
        bandWaiting: false,
        primaryLabel: 'Tentar de novo',
      };
    case 'session_dead':
      return {
        eyebrow: 'Antes de continuar',
        title: 'Abra uma nova sessão do terminal',
        text: 'A sessão foi encerrada, então nenhum comando pode ser enviado agora.',
        point: null,
        art: ARTS.pergunta,
        bandText: '',
        bandWaiting: false,
        primaryLabel: 'Nova sessão',
      };
    case 'understand':
      return {
        eyebrow: stageEyebrow,
        title: context.stageName,
        text: context.stageDescription,
        point: null,
        art: ARTS.entender,
        bandText: '',
        bandWaiting: false,
        primaryLabel: 'Entendi, continuar',
      };
    case 'send':
      return {
        eyebrow: stageEyebrow,
        title: 'Confira o comando',
        text: 'Só vai para a sua IA quando você confirmar. Se precisar, edite aqui mesmo.',
        point: null,
        art: ARTS.comando,
        bandText: '',
        bandWaiting: false,
        primaryLabel: 'Enviar agora',
      };
    case 'pasted':
      return {
        eyebrow: 'Sua vez',
        title: 'Pressione Enter no terminal',
        text: 'O comando já está na linha do terminal, mas ainda não rodou. Ajuste lá se quiser.',
        point: 'Vá para o terminal',
        art: ARTS.comando,
        bandText: 'Aguardando o seu Enter no terminal.',
        bandWaiting: true,
        primaryLabel: null,
      };
    case 'following':
      return decision.turn === 'ai'
        ? {
            eyebrow: 'Vez da sua IA',
            title: 'Pode acompanhar daqui',
            text: FOLLOWING_AI,
            point: null,
            art: ARTS.trabalhando,
            bandText: FOLLOWING_AI,
            bandWaiting: true,
            primaryLabel: null,
          }
        : {
            eyebrow: 'Sua vez',
            title: 'Confira o terminal',
            text: FOLLOWING_PERSON,
            point: 'Vá para o terminal',
            art: ARTS.pergunta,
            bandText: FOLLOWING_PERSON,
            bandWaiting: true,
            primaryLabel: null,
          };
  }
}

/** Monta o texto de cada momento: uma instrução, de quem é a vez e, no máximo, uma ação (BR4.4). */
export function momentContent(decision: GuideDecision, context: MomentContext): MomentContent {
  const stepNumber = STEP_BY_MOMENT[decision.moment];
  return {
    ...momentText(decision, context),
    stepNumber,
    stepLabel: stepNumber > 0 ? (STEP_LABELS[stepNumber - 1] as string) : null,
    turnLabel: decision.turn === 'ai' ? 'Vez da sua IA' : 'Sua vez',
  };
}

export const NO_ACTIVE_INTENT_CONTENT = {
  eyebrow: 'Antes de continuar',
  title: 'Crie uma demanda no terminal',
  text: 'Ainda não há uma demanda ativa neste repositório. Abra a sua IA no terminal e digite /aidlc, seguido do que você precisa fazer.',
  art: ARTS.boasvindas,
} as const;

const BLOCK_MESSAGES: Record<SendBlockedReason, string> = {
  repo_failure: 'Não dá para enviar agora: o guia não conseguiu ler os arquivos do AI-DLC.',
  not_active: 'Esta demanda não é a ativa no AI-DLC, então nada foi enviado.',
  session_dead: 'A sessão do terminal foi encerrada. Abra uma nova sessão para enviar.',
  other_cli: 'Com outra CLI, o guia só mostra o comando, sem enviá-lo.',
  not_send_moment: 'Este não é o momento de enviar um comando nesta etapa.',
};

export function sendBlockedMessage(reason: SendBlockedReason): string {
  return BLOCK_MESSAGES[reason];
}
