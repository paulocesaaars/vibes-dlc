## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-04T01:17:16Z
**Iteration:** 2
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | src/web/components/demand-hub.tsx > Home | A linha do Início mostra título, nível, etapa e progresso, mas omite de quem é a vez, exigido por BR4.1. Além disso, listDemandRows fixa a vez da demanda ativa como unknown, mesmo quando há marca da etapa. | Mostrar a vez em cada linha e calcular a vez da ativa com o estado disponível, usando a indicação de consulta quando faltar informação. | Resolved (reviewer) |
| R-02 | Major | src/aidlc/demand-browser.ts > readUnits e readDecisions | Esses leitores aceitam um nome seguro, mas não conferem o realpath do registro antes de abrir unit-of-work.md e audit/. Uma junção de diretório com nome seguro pode apontar para fora de intents/ e expor arquivos locais pelas rotas de Unidades e Decisões. | Aplicar aos dois leitores a verificação de confinamento usada em listDemandRows antes de abrir qualquer arquivo do registro e testar uma junção externa. | Resolved (reviewer) |
| R-03 | Major | src/web/components/demand-hub.tsx > NewDemand e Activation | Os botões de envio aparecem e chamam as rotas independentemente do tipo de CLI. O fluxo especifica que, com Outra CLI, o comando é apenas referência. A rota de ativação também não verifica esse tipo antes de enviar. | Propagar o tipo de CLI à tela e às rotas; no modo Outra CLI, mostrar só o comando para copiar e recusar o envio no servidor. | Resolved (reviewer) |
| R-04 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u3-demands/code-generation/traceability.json > coverage BR6.5 | BR6.5 aponta para src/aidlc/reader.ts, mas o histórico de comandos é lido de sent_command por src/db/sent-command-repo.ts e pela rota commands. O alvo indicado não comprova essa regra. | Corrigir o alvo para o arquivo que implementa o histórico e conferir os demais vínculos do mapa. | Resolved (reviewer) |
| R-05 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/construction/u3-demands/code-generation/traceability.json > coverage BR6.3, BR6.4 e BR7.1 | Esses três vínculos ainda apontam para reader.ts ou send-command.ts; Unidades e decisões são lidas em demand-browser.ts, enquanto a checagem de origem de BR7.1 fica nas rotas via request-guard. Os alvos atuais não demonstram as regras. | Atualizar os alvos dessas linhas para as implementações correspondentes e conferir as demais linhas de segurança. | New |

> R-01 Reviewer note: Home mostra TURN_TEXT e listDemandRows deriva a vez da marca da etapa também na demanda ativa.

> R-02 Reviewer note: safeRecord valida o realpath do registro; readUnits valida o arquivo e readEvents valida audit/ e cada arquivo antes da leitura.

> R-03 Reviewer note: A interface usa cliKind para ocultar os botões de envio em Outra CLI, e ambas as rotas recusam esse modo.

> R-04 Reviewer note: BR6.5 agora aponta para src/db/sent-command-repo.ts, que implementa a consulta do histórico.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| npx vitest run tests/u3 | PASS: 4 arquivos, 52 testes | A suíte cobre os reparos, inclusive o modo Outra CLI e as junções externas. |
| npx tsx scripts/proof-u3.ts | PASS: 17 verificações; código 0 | A prova real no navegador e Git Bash terminou corretamente. |

### Summary

Os três problemas funcionais e de segurança da revisão anterior foram corrigidos. Resta um ajuste de precisão em alguns alvos da rastreabilidade, sem impedir a execução do produto.
