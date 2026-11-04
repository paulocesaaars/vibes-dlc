## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-03T22:21:51Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u3-demands/nfr-design/security-design.md > Comandos (tabela, linha de `/api/commands`) | A rota nova de nova demanda e análise recusa caracteres de controle e limita o tamanho, mas `/api/commands` fica com "as de U1 e U2", que só recusam quebras de linha. O texto diz que "uma função comum faz esse envio", sem dizer se a validação do texto também é comum. Assim, o mesmo texto com um caractere de controle invisível (por exemplo Ctrl-O, que o readline do Bash trata como Enter) é recusado numa rota e aceito na outra, e "Colar sem executar" pode executar. | Pôr a validação do texto (linha única, tamanho, sem caracteres de controle) na função comum, valendo para as três rotas, e cobrir com um teste em cada rota. | New |
| R-02 | Minor | security-design.md > Dados não confiáveis; reliability-design.md | `listDemands` "ignora pastas que não passem por `isSafeName`, sem seguir links para fora de `intents/`", mas não diz como. Uma junção ou link dentro de `intents/` com nome seguro apontaria para fora, e o `aidlc-state.md` de lá seria lido e mostrado. | Dizer que cada pasta é conferida com `realpath` dentro de `intents/` (como `resolveArtifactPath` faz em U2) antes de ler, e testar com uma junção. | New |
| R-03 | Minor | performance-design.md > Decisões e Unidades; scalability-design.md | As abas "ampliam o que é guardado por registro" a partir da leitura de `audit/` de U2, que em U2 guardava só o mínimo (último gate, última Unidade, última data) para limitar memória. As demandas não ativas também têm aba, então até 20 `audit/` podem ficar em memória com todos os eventos, sem limite nem descarte. | Guardar só as últimas 500 linhas de decisão e o resumo por Unidade por registro, e descartar o guardado de registros que não são abertos. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `aidlc engine sensor-traceability --stage nfr-design --output-path .../u3-demands/nfr-design/traceability.json` | PASS: `gaps`, `orphans`, `missing_from_table`, `invalid_entries` e `invalid_targets` vazios, `findings_count` 0 | A rastreabilidade está íntegra. |

### Summary

O design de segurança cobre bem as três rotas de comando (texto validado, `kind` gravado pelo servidor, ativação montada no servidor com nome seguro), isola os comandos de `commandSent` e mantém as dependências sem ciclo. Conferi que o `aidlc` aceita o nome da pasta do registro no `intent switch`, então o comando montado vale. Restam três ajustes: validação comum do texto, contenção de links em `intents/` e limite de memória das abas.
