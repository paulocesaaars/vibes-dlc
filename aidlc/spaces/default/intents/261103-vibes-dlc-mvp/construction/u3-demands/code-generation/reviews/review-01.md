## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-04T01:06:57Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | src/web/components/demand-hub.tsx > Home | A linha do Início mostra título, nível, etapa e progresso, mas omite de quem é a vez, exigido por BR4.1. Além disso, listDemandRows fixa a vez da demanda ativa como unknown, mesmo quando há marca da etapa. | Mostrar a vez em cada linha e calcular a vez da ativa com o estado disponível, usando a indicação de consulta quando faltar informação. | New |
| R-02 | Major | src/aidlc/demand-browser.ts > readUnits e readDecisions | Esses leitores aceitam um nome seguro, mas não conferem o realpath do registro antes de abrir unit-of-work.md e audit/. Uma junção de diretório com nome seguro pode apontar para fora de intents/ e expor arquivos locais pelas rotas de Unidades e Decisões. | Aplicar aos dois leitores a verificação de confinamento usada em listDemandRows antes de abrir qualquer arquivo do registro e testar uma junção externa. | New |
| R-03 | Major | src/web/components/demand-hub.tsx > NewDemand e Activation | Os botões de envio aparecem e chamam as rotas independentemente do tipo de CLI. O fluxo especifica que, com Outra CLI, o comando é apenas referência. A rota de ativação também não verifica esse tipo antes de enviar. | Propagar o tipo de CLI à tela e às rotas; no modo Outra CLI, mostrar só o comando para copiar e recusar o envio no servidor. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u3-demands/code-generation/traceability.json > coverage BR6.5 | BR6.5 aponta para src/aidlc/reader.ts, mas o histórico de comandos é lido de sent_command por src/db/sent-command-repo.ts e pela rota commands. O alvo indicado não comprova essa regra. | Corrigir o alvo para o arquivo que implementa o histórico e conferir os demais vínculos do mapa. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| npx vitest run tests/u3 | PASS: 4 arquivos, 46 testes | A suíte da Unidade passa, mas não cobre os pontos acima. |
| tsx scripts/proof-u3.ts | Não executou: tsx não está no PATH desta sessão | A prova declarada no resumo não foi reproduzida com o comando literal das instruções. |

### Summary

A Unidade executa os testes locais, mas o Início omite um dado requerido e os leitores de abas permitem atravessar uma junção de diretório. O modo Outra CLI também ainda permite envio, contrariando o fluxo aprovado.
