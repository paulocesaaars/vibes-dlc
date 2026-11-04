# Design de escala: u3-demands

Base: `nfr-requirements/scalability-requirements.md` de U3.

- **NFR1.4:** a lista de demandas só é relida quando as datas mudam, com no máximo 5 leituras ao mesmo tempo. A prova verifica 20 demandas.
- **NFR12.1:** `artifact_note` usa um índice em `intent_id` e `artifact_path`, com 500 notas verificadas por demanda.
