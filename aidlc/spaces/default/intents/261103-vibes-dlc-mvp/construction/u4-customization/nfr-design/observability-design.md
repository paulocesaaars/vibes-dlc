# Design de observabilidade: u4-customization

Base: `nfr-requirements/observability-requirements.md`.

Sem métricas nem painéis, como nas Unidades anteriores.

## Logs (NFR13.1)

O módulo `config/logger` de U1 recebe os eventos da Unidade, com código e caminho dentro de `.vibes/`:

| Evento | Nível | Campos |
|---|---|---|
| `save_failed` | erro | código, operação (`media`, `put`, `cancel` e `done`) e caminho em `.vibes/` |
| `read_failed` | erro | código e caminho em `.vibes/`, quando a leitura da personalização ou de um arquivo de mídia falha por outro motivo que não ausência |
| `upload_busy` | aviso | rota |
| `stale_visit` | aviso | rota |
| `media_sweep_aborted` | aviso | motivo da leitura |
| `media_sweep_removed` | informação | quantidade de arquivos apagados |

Nunca entram frases, nomes de arquivos enviados, conteúdo da mídia nem o valor de Sua IA. Um teste coloca marcadores nas frases e nos nomes e confere que nenhuma saída os contém.

## Dados guardados (NFR13.2)

`customization_item` só guarda cor, frase, referência de mídia (`mediaId`, tipo e tamanho) e `claude_code` ou `other`. Não há campo para chave, token, nome ou caminho de CLI. Um teste do `Db` percorre o conjunto completo de linhas e confere os valores.
