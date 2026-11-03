# Evidências: Practices Discovery

O líder (`aidlc-pipeline-deploy-agent`) preparou e integrou os artefatos. Não houve revisão de apoio neste escopo (`Collaborators: off`), portanto não há arquivos de contribuição. A pessoa decidiu os pontos da entrevista e confirmou o resumo consolidado em `practices-discovery-questions.md`, que é o resultado autoritativo.

## O que foi inspecionado

| Fonte | O que se aproveitou |
|---|---|
| `aidlc/spaces/default/memory/org.md` | As cinco seções usadas como padrões sugeridos |
| `aidlc/active-memory/team.md` e `project.md` | Sem conteúdo afirmado; não é uma nova execução |
| `aidlc-state.md` | Greenfield, escopo `mvp`, profundidade e `Test Strategy` Standard, Operação pulada, `ci-pipeline` como EXECUTE, `Construction Iteration: unit-major`, `Construction Execution: serial` |
| `.claude/scopes/aidlc-mvp.md` | `skeleton: on`, `collaborators: off` |
| `ideation/scope-definition/scope-document.md` | Primeira fatia em quatro itens; fora do MVP: deploy e verificação em macOS e Linux |
| `ideation/feasibility/constraint-register.md` | C5 (verificado no Windows), C7 (uma pessoa desenvolve), C9 (teste com alguém novo no AI-DLC) |
| `PRD.md` | Requisitos, regras de negócio, escopo, decisões tomadas |
| `TDD.md` | Stack, módulos e limites, segurança, pontos a validar |
| `CLAUDE.md` | Idioma, regras do registro em `FEEDBACK-AIDLC.md`, consulta à documentação oficial |
| `git log`, `git branch -a`, `git remote -v` | 7 commits em `main`, nenhum merge, sem outras ramificações, um autor, `origin` no GitHub, HEAD `f9462ec` |
| Raiz do repositório | Sem `package.json`, `tsconfig`, `.github/`, `.gitlab-ci.yml`, `.prettierrc*`, `.eslintrc*`, `eslint.config.*`, `.editorconfig`, `biome.json`, configuração de Vitest ou de Playwright |
| `.gitignore` | Só o bloco do AI-DLC; `.vibes/` ainda não aparece |
| Base de conhecimento do agente | `branching-strategies.md`, `cicd-patterns.md`, `deployment-strategies.md` |
| `.claude/tools/aidlc-state.ts` (`practices-promote`) e `aidlc-testing-posture.ts` | Como os rascunhos são promovidos: toda linha não vazia que não seja comentário em `## Mandated` e `## Forbidden` vira regra, e `Methodology` precisa ter um único valor |
| `.claude/aidlc-common/protocols/stage-protocol-construction.md` e `stages/construction/ci-pipeline.md` | Execução em série e momento em que a verificação automática é criada |
| `practices-discovery-questions.md` | Respostas de Q1 a Q8 e confirmação do resumo consolidado |

## Fatos

- O produto é um app local, sem deploy nesta versão. O `PRD.md` exclui deploy e a fase de Operação está pulada.
- Não há verificação automática configurada. Não há código, testes nem ferramentas de formatação.
- O histórico tem commits direto em `main`. Das 7 mensagens, 5 seguem o Conventional Commits em português. As outras são `Initial commit` e um `WIP`.
- O idioma dos textos e dos identificadores está definido em `CLAUDE.md`.
- O nível `mvp` traz no `org.md` um mínimo de 80% de cobertura de linhas e verificação automática antes do merge.

## O que foi inferido

- **Tronco e histórico linear:** vêm do `git log`, com uma amostra pequena de 7 commits em poucos dias. A resposta Q1 confirmou o jeito de trabalhar.
- **Sem pull request:** vem de C7 e do histórico. O `PRD.md` diz que branches e PRs ficam com a CLI de IA e com o usuário, e também que a revisão no Git é a segunda barreira contra aprovações formais. Por isso, a revisão do diff faz parte da prática. Q1 descartou a opção de pull request por Unidade.
- **Commit após aprovação:** a opção A de Q2 define um commit por Unidade aprovada, enviado a seguir, e não repete "a pedido da pessoa", que constava do rascunho. A integração lê a aprovação da Unidade como o pedido desse commit e desse envio. Fora desse ritmo, o commit continua dependendo de pedido.
- **Limites entre módulos:** vêm do `TDD.md` e foram lidos como prática de código, não como regra rígida.
- **Trabalho em série sem worktree (hipótese):** com `unit-major` e `serial`, o protocolo diz que nunca há swarm, e a menção a worktree aparece no caminho de swarm. Isso vem só da leitura dos arquivos; a execução real é que confirma.

## Decisões da entrevista

| Pergunta | Resposta | Efeito nas práticas |
|---|---|---|
| Q1. Onde o trabalho acontece | A | Direto em `main`; uma ramificação criada pelo AI-DLC volta para `main` em um único commit |
| Q2. Commit e envio | A | Um commit por Unidade aprovada, enviado a seguir, com o registro do AI-DLC em commit separado |
| Q3. Entrega desta versão | B | Sem deploy, sem ambientes e sem tag de versão; o MVP fica pronto ao cumprir as metas de sucesso e o teste com uma pessoa nova; voltar atrás é pelo commit de `main`, com migrações que só avançam e cópia de `.vibes/vibes.db` antes de migrar |
| Q4. Fatia fina primeiro | A | Primeira Unidade é a fatia de ponta a ponta do `scope-document.md` |
| Q5. Prova da fatia | A | Script automático no navegador, com o painel e o Git Bash reais, mais uma conferência final da pessoa; o comando exato é escolhido na Construção |
| Q6. Quando escrever testes | A | `test-after`, escolha da pessoa |
| Q7. Proteção de `main` até a verificação automática | A | Um único comando local antes de cada commit, como exceção temporária aceita à regra de verificação antes do merge, válida até a etapa `ci-pipeline` criar a verificação; o mínimo de 80% continua |
| Q8. Formatação e lint | A | Prettier e ESLint, com TypeScript em modo estrito |

## Pontos que ficaram com a sugestão

Estes pontos não tiveram pergunta própria. Ficaram com a sugestão do rascunho, listada no resumo que a pessoa confirmou, e podem ser revistos na aprovação da etapa:

- Conventional Commits em português, inclusive nos commits de squash.
- Mínimo de 80% de cobertura no projeto todo, não por módulo.
- Testes obrigatórios por risco, conforme `team-practices.md`.
- Vitest e Playwright.
- GitHub Actions em runner Windows, com `npm audit` bloqueando severidade alta ou crítica.
- Arquivos novos em `kebab-case`.
- Limites entre módulos do `TDD.md` como prática, conferidos na revisão do diff.

## O que continua incerto

- **Como o produto chega ao repositório de outra pessoa:** o `PRD.md` diz que ele vive dentro do repositório AI-DLC do usuário, e fala em "versão distribuída", mas nenhum documento define o mecanismo. A decisão vai para a Análise de Requisitos.
- **Verificação automática com trabalho direto em `main`:** sem pull request nem merge, a verificação da etapa `ci-pipeline` rodaria depois do envio, não antes de o código chegar a `main`. O que ela passa a bloquear, e como isso atende à regra de verificação antes do merge, precisa ser definido nessa etapa.
- **Se as práticas valem além deste intent:** a promoção escreve em `team.md` e `project.md`, que valem para todo o espaço. Por isso, as regras rígidas ficaram sem itens que a v2 pode mudar. Deploy e implantação devem ser revistos quando entrarem no escopo; esta etapa roda de novo nos fluxos cujo escopo a inclui.
- **Se a promoção compara com `org.md`:** no trecho lido de `practices-promote`, as cinco seções substituem as de `team.md` sem comparação com `org.md`. O texto de `org.md` diz que regras contraditórias são rejeitadas. Não foi testado o que acontece com a seção Deployment e com a exceção de Q7, que se afastam do padrão.
- **Comando de verificação da primeira fatia:** ainda não existe. A escolha final é da pessoa, na Construção.
- **Runner Windows:** falta confirmar o Git Bash e a instalação do `node-pty` no ambiente escolhido.
- **Peso das ferramentas de teste na instalação:** o `npm install` no repositório do usuário também instala as dependências de desenvolvimento por padrão. O efeito de Vitest e Playwright na meta de instalação simples é conferido na etapa de Build and Test.
- **Medição de 80% no módulo `terminal`:** falta ver se o código que abre o pseudo-terminal real é medido corretamente pela ferramenta de cobertura.
- **Verificações de segurança:** com `Collaborators: off`, ninguém avaliou de forma independente as verificações de dependências, segredos e análise estática. As práticas cobrem só `npm audit`.
- **Como achar o commit de retorno:** sem marcação em `main`, voltar a uma versão anterior depende de identificar o commit certo no histórico.
- **`TDD.md` desatualizado:** o ponto "o repositório ainda não tem nenhum intent" já não vale, porque este intent existe.

## Regras deixadas de fora de `discovered-rules.md`

- **Stack do `TDD.md`** (Next.js, `node:sqlite`, `node-pty`, SSE): o próprio documento a chama de proposta e traz alternativas nos pontos a validar.
- **Itens de escopo do `PRD.md`** (autenticação, gamificação, modo direto, integração com GitHub): já estão no `PRD.md`, valem para o produto e podem mudar em versões futuras.
- **C9 e C5:** estão em `constraint-register.md`, não nas três fontes indicadas. Aparecem em `team-practices.md` como prática.
- **Decisões visuais** (cores, fonte, contraste aceito): ficam no `PRD.md` e no `TDD.md`.
- **Respostas da entrevista:** são escolhas de prática e ficam em `team-practices.md`, não como restrições rígidas.
