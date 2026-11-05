/**
 * Como criar a pasta `aidlc/` com o Claude Code, conforme o `README.md` do AI-DLC (Quick Start).
 * É a única exceção, pedida por quem desenvolve, à regra de textos genéricos quanto à IA (`PRD.md`,
 * requisito 16). A pessoa pode copiar ou enviar o comando sem Enter ao terminal.
 */
export const REPO_SETUP_TITLE = 'Como criar a pasta do AI-DLC com o Claude Code';

export const REPO_SETUP_STEPS = [
  {
    text: 'No terminal ao lado, rode este comando. Ele cria a pasta do AI-DLC no seu projeto.',
    code: 'aidlc config --harness claude --mcp none --yes',
  },
  'Clique em Tentar de novo. O guia sai desta tela e abre o Início.',
  { text: 'Abra o Claude Code no terminal. Depois, escolha Nova demanda no guia.', code: 'claude' },
  'Se o terminal disser que o comando aidlc não existe, instale o AI-DLC uma vez, seguindo o README do repositório awslabs/aidlc-workflows, no GitHub. Depois, abra uma nova sessão do terminal.',
];
