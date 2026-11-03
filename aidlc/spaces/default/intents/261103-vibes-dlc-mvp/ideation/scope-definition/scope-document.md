# Definição de escopo: MVP do Vibes DLC

Base: `ideation/intent-capture/intent-statement.md`, `ideation/feasibility/feasibility-assessment.md`, `ideation/feasibility/constraint-register.md`, `ideation/feasibility/raid-log.md`, as respostas de `scope-definition-questions.md` e o `PRD.md`.

## Objetivo do escopo

Entregar o guia completo, para atingir as três metas de sucesso de `intent-statement.md`:

- uma pessoa leva uma demanda real até o resultado sem sair da ferramenta;
- uma pessoa que nunca usou o AI-DLC conclui uma etapa seguindo só as instruções do guia;
- o painel passa a rodar com `npm install` e um comando.

## Dentro do MVP

Os 17 requisitos do `PRD.md` (respostas Q1 e Q2):

| Capacidade | Requisitos do PRD |
|---|---|
| Registrar uma demanda, com nível sugerido por regras locais | 1, 5 |
| Terminal real em Git Bash, na lateral direita, com sessão persistente | 2 |
| Envio de comandos somente com confirmação, e histórico do que foi enviado | 3, 7 |
| Leitura do estado, dos artefatos e das decisões do AI-DLC, com reconciliação ao reabrir | 4, 6, 10 |
| Repositórios novos e legados | 8 |
| Instalação com Node.js, `npm install` e um comando | 9 |
| Condução em cinco passos, com trilha das etapas | 11, 12 |
| Revisão de um artefato por vez e tela de conclusão | 13, 14 |
| Personalização de imagens, vídeos, frases e cores, obrigatória no MVP | 15 |
| Textos genéricos quanto à IA e interface em português | 16, 17 |

Também entram:

- as artes e o logo já aprovados, de `public/guia/`, `public/logo.svg` e dos favicons em `public/`, sem gerar novos;
- `design/prototipo/Main.dc.html` como referência de telas, textos, passos e comportamento. O terminal dele é simulado: o produto usa um terminal real e não reproduz a interface da CLI;
- o teste com uma pessoa que nunca usou o AI-DLC, exigido antes de considerar o MVP pronto (C9 em `constraint-register.md`).

## Fora do MVP

Confirmados na intenção (Q8 de `intent-capture`):

- tratamento específico das etapas de implantação, previsto para a v2;
- modo direto, sem os cinco passos;
- qualquer chamada de rede feita pelo produto.

Exclusões do `PRD.md`, confirmadas na resposta Q4:

- hospedar ou executar a IA;
- autenticação, contas e papéis;
- deploy e qualquer ação sobre infraestrutura ou produção;
- leitura de logs e métricas de produção;
- integração com GitHub ou outros hosts de código;
- vários times ou projetos na mesma instalação;
- alterar pela personalização a estrutura do guia, as etapas, os comandos, o terminal ou o desenho do logo;
- gamificação.

Decididos nas etapas anteriores e nesta:

- verificação em macOS e Linux (C5 em `constraint-register.md`);
- comandos prontos para CLIs de IA que não sejam o Claude Code (resposta Q3).

## Limites que orientam a construção

- **Outras CLIs:** o terminal aceita qualquer CLI, mas os comandos prontos são só para o Claude Code. Com outra CLI, a pessoa digita os comandos. Os textos do guia continuam genéricos (requisito 16).
- **Sem interpretar o terminal:** o andamento vem dos arquivos do AI-DLC (C3). Os sinais confirmados estão em `FEEDBACK-AIDLC.md` e no `TDD.md`.
- **Plataforma:** o MVP é verificado no Windows com Git Bash (C1, C5, C6).
- **Sem prazo fixo:** o escopo completo é viável sem data de entrega, com uma pessoa e a ajuda da IA (C7, C8). O tempo total não foi estimado.

## Primeira fatia funcional

A ordem é risco primeiro (resposta Q6). A primeira fatia prova o caminho de ponta a ponta, em uso real, e não só por testes:

1. `npm run dev` abre o painel em `127.0.0.1`.
2. O terminal real abre no Git Bash, ocupa a lateral direita e mantém a sessão ao recarregar a página.
3. O painel lê o intent ativo e mostra a etapa atual e o passo do guia, a partir dos arquivos do AI-DLC.
4. O comando de uma etapa é enviado ao terminal somente depois da confirmação do usuário.

O comando de verificação aprovado para essa fatia precisa abrir o painel e provar os quatro itens.

## Fontes para as próximas etapas

O AI-DLC guardou só a primeira linha do pedido inicial (I1 em `raid-log.md`). O restante fica registrado aqui, em ordem de prioridade:

1. `PRD.md`: requisitos, escopo e "Decisões tomadas". Essas decisões não são reabertas; se algo parecer errado, aponta-se e pergunta-se.
2. `TDD.md`: stack, arquitetura, segurança e "Pontos a validar".
3. `design/prototipo/Main.dc.html`: telas, textos, passos e comportamento.
4. `public/guia/`, `public/logo.svg` e os favicons em `public/`: artes aprovadas.
5. `FEEDBACK-AIDLC.md`: perguntas em aberto e o que for aprendido nesta execução.

Como esses materiais já existem, as etapas de requisitos e telas perguntam só o que eles não respondem.

## Assumptions & Open Questions

- [assumption] A contagem de etapas do PRD para o nível `mvp` (23) difere da observada nesta execução (I2 em `raid-log.md`). O guia não deve fixar essa contagem no código; ele deve ler as etapas dos arquivos do AI-DLC.
- [open] Como o guia sabe qual CLI está em uso para decidir se oferece o comando pronto? A resposta Q3 limita os comandos prontos ao Claude Code, mas não define isso. Fica para Análise de Requisitos.
- [open] A resposta Q3 restringe o requisito 3 do PRD para outras CLIs. A mudança no `PRD.md` ainda precisa ser proposta ao autor.
