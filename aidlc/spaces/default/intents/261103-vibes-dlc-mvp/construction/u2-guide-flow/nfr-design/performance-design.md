# Design de desempenho: u2-guide-flow

Base: `nfr-requirements/` de U2, `functional-design/functional-spec.md` e `inception/contract-design/contract-summary.md`.

## Caminho de uma mudança (NFR1.1)

| Trecho | Tempo máximo |
|---|---|
| Detectar a mudança, com a conferência de reserva de U1 | 1 s |
| Agrupar e avisar a interface | 200 ms |
| Ler `audit/` e rodar o comando de perguntas (NFR1.3) | 1,5 s |
| Montar a decisão e a tela | 300 ms |
| **Total** | **3 s** |

Esse é o pior caso, com o comando no limite. Com o tempo medido de 0,35 s, o total fica perto de 1,5 s.

## Sem bloquear o terminal (NFR1.2)

A leitura de `audit/` e o comando de perguntas são assíncronos e não usam funções síncronas de arquivo no caminho do pedido, então a saída do terminal continua fluindo. A prova mede o eco durante a leitura de um `audit/` de mais de 10 mil linhas.

## Resultado guardado (NFR1.3)

O `AidlcReader` guarda em memória os eventos e a contagem de perguntas, com a assinatura dos arquivos como chave. Pedidos de decisão sem mudança, como o relógio de 30 segundos da faixa de IA parada, usam o valor guardado. Só um comando de perguntas roda por vez, e os pedidos que chegam nesse intervalo esperam o mesmo resultado.
