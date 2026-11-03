# Plano de Bolts: MVP do Vibes DLC

Um Bolt é uma passada de construção sobre uma parte do trabalho, que termina em algo que funciona. Aqui, cada Unidade é um Bolt, feito em série, com a sequência abaixo.

Base: `inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md`, `inception/refined-mockups/mockups.md`, `inception/domain-design/components.md`, `inception/units-generation/unit-of-work.md`, `inception/units-generation/unit-of-work-dependency.md`, `inception/units-generation/unit-of-work-story-map.md`, `inception/contract-design/contract-summary.md` e `inception/practices-discovery/team-practices.md`.

**Em toda Unidade:** o design funcional resolve primeiro os pontos aceitos como risco listados nela. Ao aprovar a Unidade, fazemos um commit e o enviamos para `origin/main`, com o registro do AI-DLC em um commit separado.

## B1. Fatia de ponta a ponta

- **Unidade:** U1, `u1-walking-skeleton`.
- **Walking skeleton:** sim. É a versão mínima que funciona de ponta a ponta, construída primeiro para provar que as partes se conectam.
- **Definition of Done:**
  - `npm run dev` abre o painel em `127.0.0.1`;
  - o terminal real abre no Git Bash, ocupa a lateral direita e mantém a sessão ao recarregar;
  - o painel lê o intent ativo e mostra a etapa e o passo, a partir dos arquivos do AI-DLC;
  - o comando só vai ao terminal depois da confirmação;
  - uma requisição com `Origin` de fora é rejeitada;
  - o script automático no navegador prova esses itens, e quem desenvolve confere e aprova.
- **O que prova:** que `node-pty` com Git Bash, `node:sqlite` e SSE funcionam juntos no Windows, e que o guia acompanha a etapa sem interpretar o terminal.
- **Demonstração:** abrir o painel neste repositório, recarregar a página sem perder a sessão, ver a etapa atual deste intent, confirmar um comando e vê-lo chegar ao terminal.
- **Pontos a resolver no design:**
  - `R-01` de Refined Mockups: saída do terminal pelo teclado;
  - `R-01` e `R-03` de Units Generation: partes de `Config` entre U1 e U5, e o mínimo de falha sem Git Bash;
  - `R-02` e `R-03` de Contract Design: envio registrado antes de acontecer e leitura de perguntas da demanda ativa;
  - `R-05` de Refined Mockups: comando de várias linhas.

## B2. Condução completa

- **Unidade:** U2, `u2-guide-flow`.
- **Definition of Done:** uma etapa real é conduzida de Entender à conclusão, com pergunta registrada, revisão, aprovação no terminal e aviso de IA parada. Reabrir o painel avisa o que mudou, e a trilha mostra as etapas por fase.
- **O que prova:** que os sinais do AI-DLC bastam para conduzir uma etapa inteira, inclusive os ainda em hipótese, e que uma pessoa nova consegue seguir as instruções.
- **Demonstração:** conduzir uma etapa deste intent pelo guia até a conclusão.
- **Marco:** o teste com uma pessoa nova no AI-DLC acontece logo depois deste Bolt, em uma demanda já criada. O resultado pode ajustar os textos dos Bolts seguintes.
- **Pontos a resolver no design:**
  - `R-02` de Requirements Analysis e `R-02` de Refined Mockups: pedido de alterações e tabela de momentos;
  - `R-02` de Domain Design: último estado visto;
  - `R-01` e `R-06` de Contract Design: rotas de `understood`, `mark_reviewed` e `next_stage`, e o contrato de `GuideContent`;
  - `R-06` de Refined Mockups: terminal empilhado.

## B3. Demandas e consulta

- **Unidade:** U3, `u3-demands`.
- **Definition of Done:** criar uma demanda pelos três passos, com sugestão de nível e motivo. Listar as demandas no Início, consultar uma que não é a ativa sem mudar o cursor e torná-la ativa com confirmação. As abas Artefatos, Unidades e ciclos, Decisões e Histórico funcionam, com notas.
- **O que prova:** que o guia cobre o início do trabalho e impede o envio à demanda errada, o que completa CP1 de `requirements.md`.
- **Demonstração:** criar uma demanda nova neste repositório e levá-la até o código gerado, pelo guia e pelo terminal integrado.
- **Pontos a resolver no design:**
  - `R-01` de Requirements Analysis e `R-01` de User Stories: regras e tabela de sugestão de nível;
  - `R-05` de User Stories e `R-04` de Refined Mockups: demanda ativa com o painel aberto e comando de ativação;
  - `R-01` e `R-06` de Contract Design: rotas de artefato, notas, nova demanda e o contrato de `Triage`.

## B4. Instalação e falhas

- **Unidade:** U5, `u5-install`.
- **Definition of Done:** em um repositório AI-DLC limpo, com espaços e acentos no caminho, seguir o `README`, copiar a subpasta e rodar `npm install` e um comando. O painel abre, e o terminal abre na raiz. Os arquivos existentes ficam iguais. As três telas de falha aparecem nos casos certos.
- **O que prova:** que o produto funciona fora deste repositório, o que cumpre CP3.
- **Demonstração:** instalar em um segundo repositório e abrir o painel.
- **Pontos a resolver no design:** `R-03` de Requirements Analysis (`.gitignore` editado à mão) e `R-05` de Units Generation (modelo de implantação de U5).

## B5. Personalização

- **Unidade:** U4, `u4-customization`.
- **Definition of Done:** trocar mídia, frases e cores, voltar ao original e cancelar. SVG é recusado, e contraste baixo gera aviso. A seção Sua IA muda o passo Enviar para outra CLI.
- **O que prova:** que a personalização muda só a aparência e as frases, com a exceção de Sua IA.
- **Demonstração:** trocar uma arte e uma cor, escolher Outra CLI e ver o passo Enviar mudar.
- **Pontos a resolver no design:** `R-04` de Contract Design e `R-01` de Domain Design: tabelas de mídia e preferência, e o ciclo de tipos. `R-03` de Refined Mockups: pares de cor que faltam na lista de contraste.

## Encerramento do MVP

- Quem desenvolve conclui uma demanda real (CP1), e uma pessoa nova conclui uma etapa (CP2). Se os textos do guia mudarem muito depois do primeiro teste, ele é repetido.
- Não há tag nem deploy, conforme `team-practices.md`.

## Assumptions & Open Questions

- [assumption] Os códigos `R-NN` vêm das revisões de cada etapa, nas pastas `reviews/` delas.
- [open] A ordem real vem do grafo de Unidades, onde U2 a U5 não dependem entre si. Se o fluxo propuser U4 antes de U5, a troca é um ajuste no grafo.
