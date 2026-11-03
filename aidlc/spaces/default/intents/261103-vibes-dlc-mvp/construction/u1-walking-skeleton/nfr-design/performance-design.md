# Design de desempenho: u1-walking-skeleton

Base: `nfr-requirements/performance-requirements.md` e `functional-design/rules.md`.

## Caminho do eco (NFR2.1)

Uma tecla vai do `@xterm/xterm` por `POST /api/terminal/input`, chega ao `node-pty`, e o eco volta pelo stream SSE.

| Trecho | Decisão |
|---|---|
| Entrada | As teclas digitadas em sequência são agrupadas em uma única requisição por vez. Enquanto uma está em curso, as próximas esperam e seguem juntas |
| Servidor | A rota escreve no pseudo-terminal e responde, sem tocar no banco |
| Saída | Cada bloco vai ao stream assim que chega, sem esperar o banco nem agrupar por tempo |
| Medição | A prova mede 100 teclas, do envio à tela, e publica o percentil 95 |

Se a meta falhar, a troca de transporte fica atrás da interface de `terminal`, sem afetar `core` nem `web`, com o aval de quem desenvolve.

## Janela de saída (NFR2.2)

Os blocos ficam em uma fila em memória, com contadores de quebras de linha e de bytes. Ao passar de 2000 quebras ou 5 MB, os blocos mais antigos saem até voltar ao limite. O custo é proporcional aos blocos removidos, sem varrer a fila inteira.

## Atualização do painel (NFR1.1)

O `AidlcReader` observa os arquivos por eventos e confere as datas a cada 1 segundo. Vários eventos em sequência são agrupados por 200 ms em um único aviso `changed`.

| Trecho | Tempo máximo |
|---|---|
| Detectar pela conferência de reserva, no pior caso | 1 s |
| Agrupar | 200 ms |
| Aviso, nova decisão e tela | 800 ms |
| **Total, com 1 s de folga** | **2 s** |

A releitura só acontece depois do aviso, então um painel parado não fica lendo os arquivos.
