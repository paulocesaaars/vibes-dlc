## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-03T18:02:53Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u2-guide-flow/functional-design/functional-spec.md > Momentos (linhas 9 e 10 da tabela) e W2, e rules.md > BR3.1 | A linha 9 (`revising`) vem antes da linha 10 (`question`). Depois de um pedido de alterações, a IA trabalha e pode perguntar; como `gateRejected` continua verdadeiro, o guia mostra `revising` com a vez da IA, e a pessoa não vê que há pergunta aberta. Além disso, o aviso de IA parada só existe em `following` (BR3.1), então a fase de revisão, que é longa, nunca recebe o aviso, e `canSend` fica falso nela. | Colocar `question` antes de `revising`, ou dizer por que não. Definir se o aviso de IA parada vale também em `revising`, e ajustar BR3.1 e a regra de `canSend` de acordo. | New |
| R-02 | Major | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u2-guide-flow/functional-design/entities.md > DemandSeenState, "Acréscimos ao retrato de sinais"; functional-spec.md > Na Construção | Na Construção, a mesma etapa (por exemplo `functional-design`) roda uma vez por Unidade. As tabelas existentes de U1 (`guide_progress`, `sent_command`) têm chave por `intentId` e `stageSlug` (conferi `src/db/guide-progress-repo.ts` e a migração de U1), e `DemandSeenState` nasce com a mesma chave. O `understood` e o `commandSent` da Unidade anterior passam para a seguinte, e o guia pularia Entender e Enviar, ou cairia em `following`. O design acrescenta `stage.unit` ao retrato, mas não a usa em nenhuma chave nem em nenhuma consulta. | Incluir a Unidade na chave de progresso, de comandos enviados e de estado visto (com migração para os dados de U1), ou definir outra regra que isole cada Unidade. Descrever isso em entities.md e em BR7.1. | New |
| R-03 | Major | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u2-guide-flow/functional-design/rules.md > BR1.2, BR5.2; entities.md > WorkPosition | Na Construção, a etapa e a Unidade vêm do `audit/`, mas todas as linhas 4 a 14 da tabela dependem de `mark`, `gateApproved`, `hasNextStage` e `artifactsTotal`, que vêm do `aidlc-state.md`, onde o design mesmo diz (Q1) que a marca fica parada na primeira etapa da Unidade. Não está dito de onde vem a marca da etapa real da Unidade, nem o que `hasNextStage` significa dentro de uma Unidade (próxima etapa da Unidade, ou da demanda), nem quando vale `trail_done`. Um desenvolvedor teria de adivinhar, e o resultado pode afirmar uma marca que não é da etapa mostrada. | Definir, para a posição vinda do `audit/`, a fonte de `mark`, `hasNextStage` e dos artefatos (ou dizer que só valem `following`, `question` e `send`), e escrever o comportamento de `conclusion` e `trail_done` na Construção. | New |
| R-04 | Minor | rules.md > BR2.1, BR5.3; functional-spec.md > Momentos | A lógica de BR2.1 (`openQuestions > 0` leva a `question`) não menciona que as linhas 4 a 9 têm precedência, e o gate em `[?]` é ele mesmo uma pergunta em aberto. BR5.3 diz `gateRejected` e marca diferente de `awaiting_approval`, enquanto a linha 9 diz só `gateRejected`. `gateRejected` é definido como "último evento de gate da tentativa atual", e "tentativa atual" não é definida. | Alinhar o texto das regras com a tabela, dizer expressamente que a pergunta do gate não conta em `question`, e definir como uma nova tentativa zera `gateRejected`. | New |
| R-05 | Minor | functional-spec.md > Acréscimos aos contratos; entities.md > ArtifactReview, DemandSeenState | As duas entidades são guardadas no banco, mas não há menção à migração (por exemplo `0002`), à cópia prévia nem aos índices. Também não está dito como se descobre quais arquivos do registro são os artefatos de uma etapa ("a partir do grafo de etapas e dos arquivos do registro"). | Registrar a migração das duas tabelas e a regra que liga etapa a artefatos (campo do grafo ou pasta), com o que fazer quando o grafo não informar. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `aidlc engine sensor-traceability --stage functional-design --output-path .../u2-guide-flow/functional-design/traceability.json` | PASS: `gaps`, `orphans`, `missing_from_table`, `invalid_entries` e `invalid_targets` vazios, `findings_count` 0 | A rastreabilidade das regras e histórias está íntegra. Não detecta os problemas de precedência e de chave acima. |

### Summary

O design cobre as histórias e a rastreabilidade passa, mas há três lacunas que levariam a erro na construção: perguntas escondidas durante `revising` e sem aviso de IA parada, colisão de progresso entre Unidades que repetem a mesma etapa, e uma tabela de momentos que depende de marcas do `aidlc-state.md` que, na Construção, não pertencem à etapa mostrada. Corrigidas essas três, o restante é implementável.
