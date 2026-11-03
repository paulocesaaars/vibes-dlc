## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-03T12:06:07Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/contract-design/contract-summary.md > C4. Rotas internas | A lista de rotas não cobre ações que C1 e as Unidades exigem: `primaryAction` inclui `understood`, `mark_reviewed` e `next_stage`, e U2/U3 gravam `guide_progress`, `artifact_review` e `artifact_note`. Também faltam leitura de artefato (`readArtifact`), criação de demanda com `Triage`, ativação de demanda e o pedido de novo terminal (`new_session`). Quem implementa U2 e U3 teria que inventar rotas e esquemas Zod. | Acrescentar a C4 as rotas (ou declarar que são Server Actions) com corpo, respostas e erros para cada `primaryAction`, leitura de artefato, notas, nova demanda e sugestão de nível. Dizer qual Unidade é dona de cada uma. | New |
| R-02 | Major | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/contract-design/contract-summary.md > C4 "Envio único" e C3 `sent_command` | A rota grava em `sent_command` antes de escrever no terminal. Se a escrita falha (500) ou o processo cai entre os dois passos, fica uma linha de comando "enviado" que nunca chegou ao terminal. `guide.commandSent` (C1) e o histórico podem então mostrar `pasted` ou `executed` sem ter ocorrido. Além disso, o servidor aceita `text` livre (até 8000 caracteres): a regra de só enviar com confirmação depende só da interface, e nada prende `text` ao resultado de `buildCommand`. | Definir um estado na linha (por exemplo `pending`/`written`) ou apagar a linha quando a escrita falha, e derivar `commandSent` só de linhas escritas. Dizer se o servidor valida `text` contra o comando esperado da etapa ou se aceita texto livre por decisão, registrando o risco. | New |
| R-03 | Major | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/contract-design/contract-summary.md > C2 `readOpenQuestions` e C8 `Command` | `readOpenQuestions(stageSlug)` não recebe `intentId`, e o comando `aidlc engine log answers --stage <slug>` age sobre o intent ativo do repositório. Para uma demanda não ativa (U3), a contagem seria a de outra demanda, e o contrato não diz que deve devolver `unavailable`. O comando existe em `.claude/tools/aidlc.ts`, mas o formato de saída citado em C8 não foi conferido na execução real. | Declarar que `readOpenQuestions` só vale para a demanda ativa e devolve `unavailable` nas demais, ou incluir `intentId` e provar que o comando o aceita. Confirmar o formato `{stage, answered, open, ambiguous}` contra uma saída real antes de U1. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/contract-design/contract-summary.md > C3 `Tables` | `MediaAsset` (`mediaId`, `momentKey`, `filePath`, `contentType`, `sizeBytes`) e `AiCliPreference` existem em `components.md`, mas C3 só tem `customization_item [item_key, kind, value]`. Não há dito como as mídias e a preferência são mapeadas, nem onde fica o tipo e o tamanho. | Dizer em C3 que `MediaAsset` e `AiCliPreference` são codificados em `customization_item` (com o formato de `value`) ou acrescentar tabelas. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/contract-design/contract-summary.md > C3 (texto inicial) e C6 `AppConfig` | C3 diz que `Db` não conhece tipos de outros módulos, mas `components.md` ainda lista `Db` dependendo de `Core` ("usa os tipos das entidades"). C6 inclui `nodeVersionOk`, que não está em `AppConfig` de `components.md`. Os dois documentos de origem ficam divergentes do contrato. | Registrar que C3 e C6 substituem esses pontos de `components.md`, ou ajustar a origem. | New |
| R-06 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/contract-design/contract-summary.md > Contratos (tabela) | `Terminal`, `GuideContent` e `Triage` são usados entre Unidades (U1/U2 para `GuideContent`, U3 para `Triage`, `Terminal` por `Web`), mas não há contrato C com a forma das funções. A reconexão em C5 também não diz se usa `Last-Event-ID` ou se o cliente guarda o último `seq`. | Acrescentar contratos mínimos para esses módulos e dizer como `seq` é reenviado na reconexão. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Nenhuma ferramenta de validação listada para a etapa | Não executada | Conferência manual dos contratos contra `unit-of-work.md` e `components.md`. A existência do comando `log answers` foi checada por busca em `.claude/tools`. |

### Summary

Os contratos C1 a C8 são coerentes e sem ciclos, mas C4 está incompleto para as ações de U2 e U3, o fluxo de envio único pode registrar comandos que não chegaram ao terminal, e a leitura de perguntas abertas não trata demandas não ativas. A pessoa deve pesar esses três pontos antes de aprovar.
