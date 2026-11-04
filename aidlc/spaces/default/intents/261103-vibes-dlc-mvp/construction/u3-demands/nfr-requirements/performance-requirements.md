# Desempenho: u3-demands

Base: `inception/requirements-analysis/requirements.md`, `functional-design/functional-spec.md` e `functional-design/rules.md`.

| ID | Requisito | Meta | Como é medido |
|---|---|---|---|
| NFR1.1 | Abrir o Início com 20 demandas, com um `audit/` grande na ativa | Até 2 segundos. Nas não ativas, lê só o `aidlc-state.md`. Na ativa, usa a contagem de perguntas já guardada e nunca espera o comando, completando a vez depois, se preciso | Prova de U3, com 20 registros na cópia de teste |
| NFR1.2 | Aba Decisões | No máximo 500 linhas, as mais recentes, em até 2 segundos | Prova de U3, com um `audit/` de mais de 10 mil linhas |
| NFR1.3 | Mudança no cursor ou uma demanda nova aparece no painel | Até 3 segundos | Prova de U3 |
