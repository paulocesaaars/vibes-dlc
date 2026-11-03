# Escala: u2-guide-flow

O produto é local e de uma pessoa. O que cresce é o registro do AI-DLC.

| ID | Requisito | Meta | Verificação |
|---|---|---|---|
| NFR1.4 | Tamanho do `audit/` | Um registro do tamanho deste intent, com mais de 10 mil linhas, sem perda perceptível. A leitura é repetida só quando as datas dos arquivos mudam | Teste do `AidlcReader` com uma cópia real do `audit/` |
| NFR12.1 | Linhas em `artifact_review` e `demand_seen_state` | Poucas por etapa, sem limpeza no MVP | Revisão do design |
