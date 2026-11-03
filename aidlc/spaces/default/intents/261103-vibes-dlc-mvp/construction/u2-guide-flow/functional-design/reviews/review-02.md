## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-03T18:04:59Z
**Iteration:** 2
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u2-guide-flow/functional-design/functional-spec.md > Momentos (linhas 9 e 10 da tabela) e W2, e rules.md > BR3.1 | A linha 9 (`revising`) vem antes da linha 10 (`question`). Depois de um pedido de alterações, a IA trabalha e pode perguntar; como `gateRejected` continua verdadeiro, o guia mostra `revising` com a vez da IA, e a pessoa não vê que há pergunta aberta. Além disso, o aviso de IA parada só existe em `following` (BR3.1), então a fase de revisão, que é longa, nunca recebe o aviso, e `canSend` fica falso nela. | Colocar `question` antes de `revising`, ou dizer por que não. Definir se o aviso de IA parada vale também em `revising`, e ajustar BR3.1 e a regra de `canSend` de acordo. | Resolved (reviewer) |
| R-02 | Major | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u2-guide-flow/functional-design/entities.md > DemandSeenState, "Acréscimos ao retrato de sinais"; functional-spec.md > Na Construção | Na Construção, a mesma etapa (por exemplo `functional-design`) roda uma vez por Unidade. As tabelas existentes de U1 (`guide_progress`, `sent_command`) têm chave por `intentId` e `stageSlug` (conferi `src/db/guide-progress-repo.ts` e a migração de U1), e `DemandSeenState` nasce com a mesma chave. O `understood` e o `commandSent` da Unidade anterior passam para a seguinte, e o guia pularia Entender e Enviar, ou cairia em `following`. O design acrescenta `stage.unit` ao retrato, mas não a usa em nenhuma chave nem em nenhuma consulta. | Incluir a Unidade na chave de progresso, de comandos enviados e de estado visto (com migração para os dados de U1), ou definir outra regra que isole cada Unidade. Descrever isso em entities.md e em BR7.1. | Resolved (reviewer) |
| R-03 | Major | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u2-guide-flow/functional-design/rules.md > BR1.2, BR5.2; entities.md > WorkPosition | Na Construção, a etapa e a Unidade vêm do `audit/`, mas todas as linhas 4 a 14 da tabela dependem de `mark`, `gateApproved`, `hasNextStage` e `artifactsTotal`, que vêm do `aidlc-state.md`, onde o design mesmo diz (Q1) que a marca fica parada na primeira etapa da Unidade. Não está dito de onde vem a marca da etapa real da Unidade, nem o que `hasNextStage` significa dentro de uma Unidade (próxima etapa da Unidade, ou da demanda), nem quando vale `trail_done`. Um desenvolvedor teria de adivinhar, e o resultado pode afirmar uma marca que não é da etapa mostrada. | Definir, para a posição vinda do `audit/`, a fonte de `mark`, `hasNextStage` e dos artefatos (ou dizer que só valem `following`, `question` e `send`), e escrever o comportamento de `conclusion` e `trail_done` na Construção. | Resolved (reviewer) |
| R-04 | Minor | rules.md > BR2.1, BR5.3; functional-spec.md > Momentos | A lógica de BR2.1 (`openQuestions > 0` leva a `question`) não menciona que as linhas 4 a 9 têm precedência, e o gate em `[?]` é ele mesmo uma pergunta em aberto. BR5.3 diz `gateRejected` e marca diferente de `awaiting_approval`, enquanto a linha 9 diz só `gateRejected`. `gateRejected` é definido como "último evento de gate da tentativa atual", e "tentativa atual" não é definida. | Alinhar o texto das regras com a tabela, dizer expressamente que a pergunta do gate não conta em `question`, e definir como uma nova tentativa zera `gateRejected`. | Resolved (reviewer) |
| R-05 | Minor | functional-spec.md > Acréscimos aos contratos; entities.md > ArtifactReview, DemandSeenState | As duas entidades são guardadas no banco, mas não há menção à migração (por exemplo `0002`), à cópia prévia nem aos índices. Também não está dito como se descobre quais arquivos do registro são os artefatos de uma etapa ("a partir do grafo de etapas e dos arquivos do registro"). | Registrar a migração das duas tabelas e a regra que liga etapa a artefatos (campo do grafo ou pasta), com o que fazer quando o grafo não informar. | Resolved (reviewer) |
| R-06 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u2-guide-flow/functional-design/rules.md > BR3.1 (statement) e BR1.2 | O enunciado de BR3.1 ainda diz "Com a etapa em [-]", enquanto a lógica passou a incluir `revising` e "em revisão". BR1.2 diz que, com `source` igual a `audit`, "só valem question e following", mas as linhas 1 a 3 (falha, não ativa, sessão encerrada) continuam valendo pela tabela. Também não está definido o que é "evento de Unidade da execução atual". | Alinhar o enunciado de BR3.1 com a lógica, escrever em BR1.2 que as linhas 1 a 3 também valem, e definir "execução atual" (por exemplo, eventos depois do último início da sessão ou da etapa). | New |
| R-07 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u2-guide-flow/functional-design/functional-spec.md > Tentativa atual e artefatos; Assumptions & Open Questions | `gateRejected` só volta a falso com um novo `STAGE_STARTED`. As suposições registram que `GATE_REJECTED` e `[R]` não apareceram numa execução real, mas não registram que o AI-DLC emite `STAGE_STARTED` ao refazer a etapa. Se não emitir, `revising` fica até o gate seguinte, o que a precedência das linhas 7 e 8 limita, mas não elimina fora de `[?]`. | Acrescentar essa suposição às pendências, para ser conferida na primeira execução real, e dizer o efeito se ela falhar. | New |

> R-01 Reviewer note: `question` passou para a linha 9, antes de `revising` (linha 10). O aviso de IA parada vale em `following` e em `revising`, e `canSend` e BR3.3 foram ajustados. Resta só o texto de BR3.1 (ver Minor novo).

> R-02 Reviewer note: `demand_seen_state` ganhou a coluna `unit`, e BR7.1 compara a Unidade. Para `guide_progress` e `sent_command`, o design isola as Unidades porque, com `position.source` igual a `audit`, as linhas 11 em diante da tabela (Entender e Enviar) não são alcançáveis, e o Retomar só grava na etapa real. Conferi que o argumento fecha com a tabela.

> R-03 Reviewer note: A seção "Na Construção" agora define a fonte: com a etapa do `aidlc-state.md` em `[-]` e evento de Unidade, `mark` é `in_progress`, `gateApproved` e `gateRejected` são falsos, não há artefatos, e só valem `question` e `following`. Quando a etapa sai de `[-]`, a fonte volta a ser `state`, com `hasNextStage` e as demais linhas. A linha 11 da tabela, BR1.2 e a entidade `WorkPosition` estão coerentes.

> R-04 Reviewer note: BR2.1 e BR5.3 citam a precedência, dizem que a pergunta do gate não conta, e "tentativa atual" é definida (eventos depois do último `STAGE_STARTED`).

> R-05 Reviewer note: A migração `0002_u2.sql` está em C3, com a cópia prévia, e a regra de artefatos (pasta `<fase>/<etapa>/` com exclusões) está definida, inclusive o caso sem arquivos.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `aidlc engine sensor-traceability --stage functional-design --output-path .../u2-guide-flow/functional-design/traceability.json` | PASS: `gaps`, `orphans`, `missing_from_table`, `invalid_entries` e `invalid_targets` vazios, `findings_count` 0 | A rastreabilidade segue íntegra depois das correções. |

### Summary

As três lacunas Major foram fechadas e não encontrei contradição que as reabra: a tabela de 15 linhas, as regras e as entidades concordam sobre precedência, Construção e chaves. Restam dois ajustes de texto e de suposição, que não bloqueiam a implementação.
