/** Textos em português de cada etapa. É dado estático, sem acesso a arquivos do AI-DLC. */

export type StageContent = {
  stageSlug: string;
  whatItDoes: string;
  howItWorks: string[];
};

const PHASE_NAMES: Record<string, string> = {
  initialization: 'Preparação',
  ideation: 'Ideação',
  inception: 'Concepção',
  construction: 'Construção',
  operation: 'Operação',
};

const STAGE_NAMES: Record<string, string> = {
  'workspace-scaffold': 'Estrutura do espaço',
  'workspace-detection': 'Detecção do espaço',
  'state-init': 'Início do estado',
  'intent-capture': 'Captura da intenção',
  'market-research': 'Pesquisa de mercado',
  feasibility: 'Viabilidade e restrições',
  'scope-definition': 'Definição de escopo',
  'team-formation': 'Formação do time',
  'rough-mockups': 'Esboços de tela',
  'approval-handoff': 'Aprovação e passagem',
  'reverse-engineering': 'Engenharia reversa',
  'practices-discovery': 'Descoberta de práticas',
  'requirements-analysis': 'Análise de requisitos',
  'user-stories': 'Histórias de usuário',
  'refined-mockups': 'Telas detalhadas',
  'domain-design': 'Projeto de domínio',
  'units-generation': 'Geração de unidades',
  'contract-design': 'Projeto de contratos',
  'delivery-planning': 'Planejamento de entrega',
  'functional-design': 'Projeto funcional',
  'nfr-requirements': 'Requisitos não funcionais',
  'nfr-design': 'Projeto não funcional',
  'infrastructure-design': 'Projeto de infraestrutura',
  'code-generation': 'Geração de código',
  'build-and-test': 'Compilação e testes',
  'ci-pipeline': 'Esteira de integração',
  'deployment-pipeline': 'Esteira de implantação',
  'environment-provisioning': 'Preparo de ambientes',
  'deployment-execution': 'Execução da implantação',
  'observability-setup': 'Observabilidade',
  'incident-response': 'Resposta a incidentes',
  'performance-validation': 'Validação de desempenho',
  'feedback-optimization': 'Retorno e otimização',
};

const AGENT_NAMES: Record<string, string> = {
  orchestrator: 'orquestrador',
  product: 'agente de produto',
  architect: 'agente de arquitetura',
  delivery: 'agente de entrega',
  design: 'agente de design',
  developer: 'agente de desenvolvimento',
  'pipeline-deploy': 'agente de esteira e implantação',
  quality: 'agente de qualidade',
  'aws-platform': 'agente de plataforma',
  operations: 'agente de operações',
};

const WHAT_IT_DOES: Record<string, string> = {
  'intent-capture':
    'A sua IA transforma a sua ideia em uma declaração clara do que se quer alcançar.',
  'market-research':
    'Aqui são comparadas as alternativas que já existem, para decidir entre construir ou comprar.',
  feasibility: 'Aqui se avalia se dá para fazer, com quais restrições e quais riscos.',
  'scope-definition': 'Aqui se define o que entra neste trabalho e o que fica de fora.',
  'team-formation': 'Aqui se avalia o time e as habilidades que o trabalho pede.',
  'rough-mockups': 'Aqui surgem os primeiros esboços de tela e o fluxo do usuário.',
  'approval-handoff':
    'Aqui a iniciativa é resumida e as decisões são registradas para seguir adiante.',
  'reverse-engineering': 'A sua IA lê o código que já existe e documenta como ele funciona.',
  'practices-discovery':
    'Aqui se descobre como o time já trabalha, com evidências do próprio repositório.',
  'requirements-analysis':
    'Aqui a demanda vira uma lista de requisitos, cada um com um critério claro de aceite.',
  'user-stories': 'Os requisitos viram histórias: quem faz o quê, e por quê.',
  'refined-mockups': 'Os esboços viram telas detalhadas, com interação e acessibilidade.',
  'domain-design':
    'Aqui o sistema é dividido em componentes e as decisões de arquitetura são registradas.',
  'units-generation': 'O trabalho é dividido em unidades que podem ser construídas separadamente.',
  'contract-design': 'Aqui se define como as unidades conversam entre si.',
  'delivery-planning': 'As unidades são organizadas em ciclos de entrega, na ordem certa.',
  'functional-design': 'Cada unidade ganha suas entidades e regras de negócio.',
  'nfr-requirements': 'Aqui se definem metas de desempenho, segurança, escala e confiabilidade.',
  'nfr-design': 'Aqui se decide como o sistema vai atingir essas metas.',
  'infrastructure-design':
    'Aqui se descreve a infraestrutura necessária, em arquivos no repositório.',
  'code-generation': 'A sua IA escreve o código de cada unidade, com os testes.',
  'build-and-test': 'O projeto é compilado e os testes são executados.',
  'ci-pipeline': 'Aqui se configura a integração contínua e os critérios de qualidade.',
  'deployment-pipeline':
    'Aqui se preparam os arquivos da esteira de implantação e o roteiro de reversão.',
  'environment-provisioning': 'Aqui os ambientes são descritos e validados.',
  'deployment-execution': 'Aqui a implantação é executada e verificada.',
  'observability-setup': 'Aqui se configuram painéis, alarmes e metas de serviço.',
  'incident-response': 'Aqui se escrevem os roteiros para quando algo der errado.',
  'performance-validation': 'Aqui se verifica se o sistema aguenta a carga esperada.',
  'feedback-optimization': 'Aqui o que foi aprendido em operação volta como melhoria.',
};

const GENERIC_WHAT_IT_DOES =
  'Nesta etapa, a sua IA avança o trabalho e grava o resultado em arquivos.';

export function phaseName(phase: string): string {
  return PHASE_NAMES[phase] ?? phase;
}

export function stageName(slug: string): string {
  return STAGE_NAMES[slug] ?? slug;
}

function agentName(leadAgent: string): string {
  const key = leadAgent.replace(/^aidlc-/, '').replace(/-agent$/, '');
  return AGENT_NAMES[key] ?? 'agente desta etapa';
}

/** Texto de Entender. Uma etapa sem texto próprio recebe o genérico (BR4.6). */
export function stageContent(slug: string, leadAgent: string): StageContent {
  const whatItDoes = WHAT_IT_DOES[slug];
  return {
    stageSlug: whatItDoes ? slug : 'generic',
    whatItDoes: whatItDoes ?? GENERIC_WHAT_IT_DOES,
    howItWorks: [
      'Você confere e confirma um comando.',
      `O ${agentName(leadAgent)} trabalha na sua IA e grava os arquivos. Se precisar, ele pergunta no terminal.`,
      'Você lê os arquivos e aprova no terminal.',
    ],
  };
}
