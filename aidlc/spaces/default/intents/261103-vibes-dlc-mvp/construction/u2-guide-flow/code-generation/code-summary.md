# Resumo do código: u2-guide-flow

U2 constrói a condução completa de uma etapa: pergunta registrada, IA parada, Revisar, Aprovar, conclusão, reabrir o painel e trilha, com a Unidade real na Construção. Os dados vêm dos arquivos do AI-DLC, e a aparência segue `design/prototipo/Main.dc.html`.

## Arquivos

| Módulo | Arquivos novos | Arquivos alterados |
|---|---|---|
| `core` | `trail.ts` | `types.ts`, `decide-moment.ts` (tabela de 15 linhas, `showIdleNotice` e `canSend`) |
| `aidlc` | `audit-events.ts`, `open-questions.ts`, `artifacts.ts`, `work-signals.ts` | `reader.ts` |
| `db` | `artifact-review-repo.ts`, `demand-seen-repo.ts` | `sent-command-repo.ts` (`listWritten`) |
| `guide` | `review-checklist.ts` | `moment-content.ts` |
| `web` | `artifact-service.ts`, `client/use-artifacts.ts`, `components/trail.tsx`, `components/artifact-panel.tsx`, `components/guide-band.tsx`, `components/guide-body.tsx` | `guide-service.ts`, `runtime.ts`, `schemas.ts`, `client/api.ts`, `client/use-guide.ts`, `components/guide-app.tsx`, `components/guide-parts.tsx`, `components/terminal-panel.tsx` |
| `app` | `api/demands/[intentId]/artifacts`, `artifacts/review`, `seen` e `trail` | `api/commands`, `demands/[intentId]/guide`, `demands/[intentId]/understood`, `globals.css` |
| Banco | `migrations/0002_u2.sql` | |
| Provas | `scripts/proof-u2.ts`, `scripts/proof-repo.ts` | `scripts/proof-u1.ts` |
| Testes | `tests/u2/*`, `tests/fixtures/aidlc/audit-construction.md` | Os de U1 listados em "Testes de U1 ajustados" |

`package.json` ganhou `npm run verify`, que roda `npm run check` e as provas de U1 e U2 em sequência.

## Decisões

- **`killProcessTree` chega ao `aidlc` por injeção.** O design pede a função de U1, e o limite entre módulos proíbe `aidlc` de conhecer `terminal`. Quem liga os dois é `web/runtime.ts`.
- **O comando de perguntas recebe um ambiente próprio.** A execução mostrou que `aidlc engine log answers` grava `aidlc/.aidlc-sessions/<id>.binding.json` quando herda a identificação de um chat (`CLAUDE_CODE_SESSION_ID` com `CLAUDE_PID`). Isso violaria NFR7.1 se a pessoa abrisse o painel de dentro da CLI de IA. Por isso `open-questions.ts` monta o ambiente por lista permitida, com o mínimo para o `aidlc` rodar. Também fixa `AIDLC_PROJECT_DIR` no repositório lido, porque um valor herdado faria o guia contar as perguntas de outro projeto.
- **Um gate com `Unit` não aprova a etapa.** `GATE_APPROVED` de checkpoint de Unidade traz `Stage` e `Stages`, mas é ignorado no gate da etapa, para o guia não afirmar aprovação (`functional-spec.md`, Na Construção).
- **A conclusão é da etapa anterior.** Ver "Depois da revisão".
- **Consulta na trilha lê também as pastas das Unidades.** Na Construção, os artefatos ficam em `construction/<unidade>/<etapa>/`, e a pasta `construction/<etapa>/` só tem o diário. Sem isso, AC5.2.2 ficaria vazio nessas etapas. Em Revisar continua valendo só `<fase>/<etapa>/`, como na especificação. Acompanhar dentro de uma Unidade lê a pasta dela.
- **O hash vai por fluxo.** Um arquivo acima de 2 MB não é carregado na memória, mas continua com hash, então pode ser marcado como revisado.
- **A etapa anterior não abre na trilha.** O estado `previous` fica como um botão desabilitado, como o bloqueado. A decisão pedia só que ele não oferecesse comando, e abrir os artefatos dele ficou de fora para não acrescentar comportamento.

## Depois da revisão

Mudanças pedidas em `reviews/review-01.md` e nas decisões de quem desenvolve.

| Item | O que mudou |
|---|---|
| R-01, decisão 1 | `conclusion` agora vale pela etapa anterior na ordem do plano: `[x]` com `GATE_APPROVED` na tentativa dela, posição de `state` e etapa atual em `[ ]` ou `[-]`, sem `GATE_REJECTED`, Entendi, comando `written`, artefatos nem pergunta aberta. Ir para a próxima etapa grava `guide_progress.conclusion_seen_at` em `.vibes/`, pela rota nova `/api/demands/{intentId}/conclusion`, dentro de `0002_u2.sql`, que ainda não saiu em commit. `advanceFrom` e `resolveRequestedStage` foram removidos, e `understood` e `commands` voltaram à conferência de U1. O progresso e a contagem da conclusão são da etapa anterior. `[x]` na etapa atual com etapa seguinte passa a `following`, sem afirmar nada |
| R-03, decisão 2 | Estado `previous` em `TrailStage`, com o texto "anterior", sem cadeado, só com a posição do `audit/`. `done` continua vindo só de `[x]` |
| Decisão 3 | NFR9.1 ficou `Deferred` em `traceability.json`, para a conferência final do MVP |
| R-02 | As duas provas conferem o `git status` da cópia antes e depois de tudo, sem ignorar `aidlc/`. As escritas do script são registradas com o hash do conteúdo, então um arquivo do script que o produto sobrescreva também aparece. No repositório real, a conferência continua só para as ferramentas, como o `next dev`, com o filtro restrito ao que o AI-DLC grava: `aidlc-state.md`, `audit/`, diários e `.aidlc-*` |
| R-04 | O ambiente do comando de perguntas é uma lista permitida de 12 nomes, sem caixa, com `AIDLC_PROJECT_DIR` fixo. Teste com variáveis de sessão de várias CLIs e um segredo. A prova roda o comando real com o ambiente desta sessão e confere que nada muda em `aidlc/` |
| R-05 | O teste de link usa junção de diretório (`mklink /J`), sem modo desenvolvedor, para fora e para dentro do registro. Nenhum teste é pulado agora |

A prova percorre o estado que o AI-DLC grava: etapa anterior em `[x]`, atual em `[-]` e `**Current Stage**` atualizado. Percorre também a pessoa que seguiu pelo terminal, com artefato já gravado, e a última etapa em `[x]`.

**O que continua sem confirmação real:**

- O estado do AI-DLC na última etapa: a prova escreve `[x]` com `GATE_APPROVED` e `**Current Stage**` nela, e nenhuma execução real chegou lá.
- Se a IA gravar um artefato ou registrar uma pergunta logo depois da aprovação, a conclusão some sozinha, inclusive com a pessoa olhando. É o comportamento decidido, mas o tempo real entre os dois ainda não foi visto no guia.
- Refazer uma etapa já reconhecida não mostra a conclusão de novo, porque o reconhecimento é por etapa, e não por tentativa.

## Testes de U1 ajustados

Cada ajuste veio de uma mudança pedida pela tabela nova ou pelas entidades de U2.

| Arquivo | Ajuste | Motivo |
|---|---|---|
| `tests/u1/core.test.ts` | `executado com gate aberto` agora espera `approve`, e `demanda não ativa` espera o momento `not_active` | Linhas 2 e 8 da tabela |
| `tests/u1/core.test.ts`, `guide.test.ts`, `web-fakes.tsx` | Campos novos do retrato, da decisão e de `GuideView` | C1, acréscimos de `functional-spec.md` |
| `tests/u1/web-fakes.tsx`, `routes.test.ts`, `web-ui.test.tsx` | Status `current`, `blocked`, e o texto "pulada" no lugar de "fora do plano" | `entities.md` e BR8.1 |
| `tests/u1/routes.test.ts` | A lista de rotas passa a incluir as 5 rotas novas, nos 6 métodos | O teste exige que a lista cubra todos os `route.ts`. O design dizia "sem alteração", mas a lista é escrita à mão |
| `tests/u1/db-repos.test.ts` | `conclusionSeenAt` em `GuideProgress` | Decisão 1 |
| `tests/u1/routes-harness.ts` | Repositórios novos no `Runtime` | Contrato do `Runtime` |
| `tests/u1/db-migrations.test.ts` | A quantidade de migrações vem da pasta, não de um número fixo | `0002_u2.sql` |

## Prova de U1 alterada

- `scripts/proof-u1.ts` rodava no registro real e escrevia nele. Agora usa a cópia de `scripts/proof-repo.ts`, sem `audit/`, porque com a posição vinda do `audit/` o momento Entender não apareceria no registro real.
- A conferência "F6 volta ao terminal" agora espera até 2 segundos pelo foco. Ele é dado em `requestAnimationFrame`, e a conferência olhava antes do quadro seguinte.
- A conferência do Git passou a olhar a cópia, onde o produto roda (ver "Depois da revisão").

## Resultados

| Verificação | Resultado |
|---|---|
Resultados depois das correções da revisão.

| Verificação | Resultado |
|---|---|
| `npm run verify` | Passou. Lint com 1 aviso anterior a U2, tipos sem erro e 517 testes passando, nenhum pulado |
| Cobertura de linhas | 96,88% no projeto todo, com o mínimo de 80% sem alteração |
| `scripts/proof-u1.ts` | 29 de 29 conferências |
| `scripts/proof-u2.ts` | 56 de 56 conferências |
| `npm run build` | Passou |
| `npm audit` | 16 achados moderados e nenhum alto ou crítico (`--audit-level=high` termina com saída 0) |
| Sensor de `code-generation` | `pass: true`, sem lacunas nem órfãos |
| Sensor de `functional-design` | `pass: true`, sem lacunas nem órfãos |

## Medidas

| Medida | Meta | Resultado |
|---|---|---|
| Artefato novo aparece no painel (NFR1.1) | Até 3 s | 320 ms |
| Pergunta aberta aparece no painel (NFR1.1) | Até 3 s | 825 ms |
| Comando real de perguntas (NFR1.3) | Até 1,5 s | Mediana de 322 ms e máximo de 342 ms, em 5 execuções |
| Eco durante a leitura do `audit/`, com 45.319 linhas (NFR1.2) | 150 ms em 95% das teclas | p95 de 73,4 ms e máximo de 111,3 ms, em 60 teclas |
| Eco de 100 teclas, sem leitura | 150 ms em 95% das teclas | p95 de 24,4 ms |

## Testes não executados e metas em aberto

- **Nenhum teste é pulado.** O caso de link agora usa uma junção de diretório.
- **Conferência final no Chrome (NFR9.1):** `Deferred`, por decisão de quem desenvolve, para a conferência final do MVP, junto com o teste com uma pessoa nova. A prova roda no Edge.
- **Teste com uma pessoa nova no AI-DLC:** acontece depois deste Bolt, e a pessoa ainda precisa ser definida.
- **Comando real com pergunta aberta:** a prova escreve um `DECISION_RECORDED` na cópia e confere o painel com o `aidlc` real. `GATE_REJECTED` e `[R]` usam a forma documentada, porque ainda não apareceram em uma execução real.

## Desvios do plano

- `tests/u2/open-questions.test.ts` não usa o prefixo `aidlc-` dos outros testes do módulo. O hook de integridade do AI-DLC recusou a primeira versão do arquivo. A causa provável é uma variável local chamada `aidlc`, que o analisador léxico lê como uma chamada de shell (`.claude/hooks/runtime-integrity.ts`, perto da linha 741). A variável foi renomeada, e o nome do módulo testado ficou no arquivo. O hook não foi alterado nem contornado.
- `scripts/proof-repo.ts` e a mudança em `scripts/proof-u1.ts` não estavam listados no plano, mas vieram da exigência de manter U1 verde sem escrever no registro real.
- `src/db/sent-command-repo.ts` ganhou `listWritten`, para a lista de comandos de `trail_done`, que U2 mostra no lugar da aba Histórico de U3.
- A interface também mostra a dica dentro do terminal (`.hint`) e reabre o terminal recolhido em pergunta e em aprovação, conforme o protótipo e `interaction-spec.md`.
- A rota `/api/demands/{intentId}/conclusion` e a coluna `guide_progress.conclusion_seen_at` vieram da decisão 1, depois da aprovação do plano.

## Pontos em aberto

- **O efeito da decisão 1 no `PRD.md` não foi registrado.** A revisão pede esse registro, e a mudança no `PRD.md` depende de quem desenvolve.
- **`UNIT_STARTED` de `code-generation` chega depois da aprovação do plano.** Até ele chegar, a tela mostra a última etapa com evento de Unidade, como `infrastructure-design`. Uma pergunta registrada em `code-generation` nesse intervalo não é contada, e vale a instrução genérica (BR2.2).
