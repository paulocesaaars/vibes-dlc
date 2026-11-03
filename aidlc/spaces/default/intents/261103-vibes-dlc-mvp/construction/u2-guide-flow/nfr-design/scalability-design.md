# Design de escala: u2-guide-flow

Base: `nfr-requirements/scalability-requirements.md` de U2.

- **NFR1.4:** a leitura do `audit/` percorre os arquivos uma vez por mudança e guarda em memória só o necessário: o último evento de gate por etapa, o último evento de Unidade e a última data. O restante do texto é descartado.
- **NFR12.1:** `artifact_review` e `demand_seen_state` têm chave primária e poucas linhas, sem índice extra nem limpeza no MVP.
