import type { GuideDecision, Moment, RepoHealth, SendBlockedReason, Turn } from '@/core/types';

export type GuideArt = { src: string; alt: string; animated?: boolean };

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
  revisao: {
    src: '/guia/revisao.webp',
    alt: 'A mãe lendo um documento com uma lupa, ao lado da Nix',
  },
  trabalhando: {
    src: '/guia/trabalhando.webp',
    alt: 'Nix observando documentos e engrenagens saírem de um notebook',
    animated: true,
  },
  aprovar: {
    src: '/guia/aprovar.webp',
    alt: 'A filha mostrando um papel com um visto verde, ao lado da família e da Nix',
    animated: true,
  },
  conclusao: {
    src: '/guia/conclusao.webp',
    alt: 'A família pulando de alegria entre confetes, com a Nix sentada à frente',
    animated: true,
  },
  boasvindas: {
    src: '/guia/boasvindas.webp',
    alt: 'A família acenando, com a Nix abanando o rabo',
    animated: true,
  },
} satisfies Record<string, GuideArt>;

export const STEP_LABELS = ['Entender', 'Enviar', 'Acompanhar', 'Revisar', 'Aprovar'];

const STEP_BY_MOMENT: Record<Moment, number> = {
  failure: 0,
  not_active: 0,
  conclusion: 0,
  trail_done: 0,
  understand: 1,
  send: 2,
  session_dead: 2,
  pasted: 2,
  following: 3,
  question: 3,
  review: 4,
  approve: 5,
  revising: 5,
};

const TURN_LABELS: Record<Turn, string> = {
  person: 'Sua vez',
  ai: 'Vez da sua IA',
  guide: 'Vez do guia',
};

const FOLLOWING_AI = 'Se a sua IA perguntar algo, responda no terminal.';
const FOLLOWING_PERSON = 'Confira o terminal: a sua IA pode estar esperando por você.';

export type MomentContext = {
  stageName: string;
  stageNumber: string;
  stageDescription: string;
  health: RepoHealth;
  failedPath: string | null;
  artifactsTotal?: number;
  artifactsReviewed?: number;
  nextStageName?: string | null;
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

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Faltar artefato não impede a aprovação, e a tela diz isso (BR5.1). */
function reviewText(context: MomentContext): MomentText {
  const reviewed = context.artifactsReviewed ?? 0;
  const total = context.artifactsTotal ?? 0;
  const missing = plural(total - reviewed, 'artefato', 'artefatos');
  return {
    eyebrow: `Sua vez · ${reviewed} de ${total} revisados`,
    title: 'Leia antes de aprovar',
    text: 'Esta é a parte mais importante: é aqui que você garante a qualidade. Se algo estiver errado, peça alterações no terminal.',
    point: null,
    art: ARTS.revisao,
    bandText: `Falta revisar ${missing}. Se preferir, você pode responder no terminal mesmo assim.`,
    bandWaiting: false,
    primaryLabel: 'Marcar como revisado',
  };
}

function approveText(context: MomentContext): MomentText {
  const hasArtifacts = (context.artifactsTotal ?? 0) > 0;
  return {
    eyebrow: 'Sua vez',
    title: 'Agora é só aprovar',
    text: `${hasArtifacts ? 'Tudo foi revisado.' : 'Esta etapa não gravou artefatos para revisar.'} Quem registra a aprovação é o AI-DLC, então ela é dada no terminal.`,
    point: 'Responda no terminal: Approve ou Request Changes',
    art: ARTS.aprovar,
    bandText: 'Aguardando a sua aprovação no terminal.',
    bandWaiting: true,
    primaryLabel: null,
  };
}

function conclusionText(moment: 'conclusion' | 'trail_done', context: MomentContext): MomentText {
  if (moment === 'trail_done') {
    return {
      eyebrow: 'Tudo certo',
      title: 'Trilha concluída!',
      text: 'Todas as etapas foram aprovadas. Os comandos enviados pelo painel estão logo abaixo.',
      point: null,
      art: ARTS.conclusao,
      bandText: 'Demanda concluída.',
      bandWaiting: false,
      primaryLabel: null,
    };
  }
  return {
    eyebrow: '',
    title: 'Etapa concluída!',
    text: 'Mais uma parte da trilha foi aprovada.',
    point: null,
    art: ARTS.conclusao,
    bandText: context.nextStageName ? `Próxima: ${context.nextStageName}` : '',
    bandWaiting: false,
    primaryLabel: 'Ir para a próxima etapa',
  };
}

function waitingText(moment: 'question' | 'revising' | 'not_active'): MomentText {
  if (moment === 'question') {
    return {
      eyebrow: 'Sua vez',
      title: 'A sua IA tem uma pergunta',
      text: 'Ela precisa de uma decisão sua para continuar.',
      point: 'Responda no terminal',
      art: ARTS.pergunta,
      bandText: 'Aguardando a sua resposta no terminal.',
      bandWaiting: true,
      primaryLabel: null,
    };
  }
  if (moment === 'revising') {
    return {
      eyebrow: 'Vez da sua IA',
      title: 'A sua IA está refazendo',
      text: 'A sua IA refaz o artefato e pede a sua aprovação de novo.',
      point: null,
      art: ARTS.revisao,
      bandText: FOLLOWING_AI,
      bandWaiting: true,
      primaryLabel: null,
    };
  }
  return {
    eyebrow: 'Antes de continuar',
    title: 'Esta não é a demanda ativa',
    text: 'O AI-DLC está com outra demanda ativa, então nada pode ser enviado a partir desta.',
    point: null,
    art: ARTS.pergunta,
    bandText: '',
    bandWaiting: false,
    primaryLabel: null,
  };
}

function followingText(turn: Turn): MomentText {
  return turn === 'ai'
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
      return followingText(decision.turn);
    case 'review':
      return reviewText(context);
    case 'approve':
      return approveText(context);
    case 'conclusion':
    case 'trail_done':
      return conclusionText(decision.moment, context);
    case 'question':
    case 'revising':
    case 'not_active':
      return waitingText(decision.moment);
  }
}

/** Monta o texto de cada momento: uma instrução, de quem é a vez e, no máximo, uma ação (BR4.4). */
export function momentContent(decision: GuideDecision, context: MomentContext): MomentContent {
  const stepNumber = STEP_BY_MOMENT[decision.moment];
  return {
    ...momentText(decision, context),
    stepNumber,
    stepLabel: stepNumber > 0 ? (STEP_LABELS[stepNumber - 1] as string) : null,
    turnLabel: TURN_LABELS[decision.turn],
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

/**
 * Faixa de IA parada. O texto nunca afirma que a IA parou (BR3.2): nos arquivos, uma IA sem limite de
 * uso parece igual a uma IA trabalhando, então cita as duas possibilidades.
 */
export function idleNoticeText(minutes: number): string {
  return `Nenhum arquivo do AI-DLC mudou há ${minutes} minutos. A sua IA pode ter parado, por exemplo porque o limite de uso acabou. Confira o terminal e, se ela parou, retome.`;
}

/** Dica dentro do terminal quando a vez é da pessoa, lá. As opções ficam no original (BR2.4). */
export function terminalHint(moment: Moment): string | null {
  if (moment === 'pasted') return 'Pressione Enter aqui para executar.';
  if (moment === 'question') return 'Responda aqui, no terminal.';
  if (moment === 'approve') return 'Responda aqui: Approve ou Request Changes.';
  return null;
}

export const IDLE_OTHER_CLI_TEXT =
  'Com outra CLI, abra a sua IA no terminal e peça para ela continuar a etapa.';

const MARK_NAMES: Record<string, string> = {
  pending: 'ainda não aberta',
  in_progress: 'em andamento',
  awaiting_approval: 'aguardando a sua aprovação',
  revising: 'em revisão',
  approved: 'concluída',
  skipped: 'fora do plano',
};

export type SeenDescription = { name: string; unit: string; mark: string };

function describeSeen(state: SeenDescription): string {
  const where = state.unit ? `${state.unit} · ${state.name}` : state.name;
  return `${where} (${MARK_NAMES[state.mark] ?? 'situação desconhecida'})`;
}

/** Aviso ao reabrir (BR7.1). Só diz o que os arquivos dizem, sem afirmar que uma Unidade foi aprovada. */
export function seenChangeText(before: SeenDescription, now: SeenDescription): string {
  return `Antes: ${describeSeen(before)}. Agora: ${describeSeen(now)}. Já atualizei a trilha a partir dos arquivos do AI-DLC.`;
}

export type ConclusionNote = { review: string; note: string; isWarning: boolean };

/** Resultado da revisão na conclusão. Revisar menos que tudo gera um aviso, sem bloquear (BR6.1). */
export function conclusionNote(stageName: string, reviewed: number, total: number): ConclusionNote {
  const review = `${stageName} aprovada`;
  if (total === 0) {
    return { review, note: 'Esta etapa não gravou artefatos para revisar.', isWarning: false };
  }
  if (reviewed >= total) {
    return {
      review,
      note: `Você revisou ${plural(total, 'artefato', 'artefatos')} antes de aprovar.`,
      isWarning: false,
    };
  }
  return {
    review,
    note: `Atenção: você revisou ${reviewed} de ${total} artefatos antes de aprovar. Vale abrir o restante na trilha.`,
    isWarning: true,
  };
}
