# Observabilidade: u4-customization

Base: `inception/requirements-analysis/requirements.md`.

Sem métricas nem painéis, como nas Unidades anteriores.

| ID | Requisito | Verificação |
|---|---|---|
| NFR13.1 | Falhas de gravação, de varredura de mídia e de leitura vão ao console com o código (`save_failed`, `stale_visit`) e o caminho em `.vibes/`, sem frases, sem nomes de arquivos enviados e sem o conteúdo da mídia | Teste de logs com marcadores nas frases e nos nomes de arquivo |
| NFR13.2 | A personalização não guarda chaves, tokens nem nome ou caminho da CLI de IA, só `claude_code` ou `other` | Teste do `Db` com o conjunto completo de linhas |
