# Desempenho: u2-guide-flow

Base: `inception/requirements-analysis/requirements.md`, `functional-design/functional-spec.md` e `functional-design/rules.md`.

| ID | Requisito | Meta | Como é medido |
|---|---|---|---|
| NFR1.1 | Artefato novo ou pergunta aberta aparece no painel (BR1.1, BR2.1) | Até 3 segundos | Prova de U2, alterando os arquivos da cópia de teste |
| NFR1.2 | Ler o `audit/` só depois de uma mudança, sem bloquear o processo | O eco do terminal continua em até 150 ms em 95% das teclas durante a leitura | Prova de U2, com um `audit/` de mais de 10 mil linhas |
| NFR1.3 | Limite do comando `aidlc engine log answers` | 1,5 segundo, porque a meta de 3 segundos inclui a detecção de 1 segundo. Depois disso, conta como `unavailable`. O comando real levou 0,35 segundo nesta máquina. A contagem fica guardada até as datas dos arquivos mudarem, então roda no máximo uma vez por mudança | Teste do `AidlcReader` com um comando lento, e a prova mede o comando real |
