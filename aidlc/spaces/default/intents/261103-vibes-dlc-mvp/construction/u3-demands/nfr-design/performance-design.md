# Design de desempenho: u3-demands

Base: `nfr-requirements/` de U3, `functional-design/functional-spec.md` e `inception/contract-design/contract-summary.md`.

## Início (NFR1.1)

`listDemands` lê o `aidlc-state.md` de cada registro de forma assíncrona, com no máximo 5 leituras ao mesmo tempo. Nas não ativas, nada mais é lido. Na ativa, a linha usa a posição e a contagem de perguntas já guardadas por U2. Sem valor guardado, a vez fica como "abra para ver", e o guia da demanda atualiza quando o comando responder. A lista fica em memória, com a assinatura das datas como chave.

## Decisões e Unidades (NFR1.2)

As duas abas usam a mesma leitura tolerante de `audit/` de U2, só quando são abertas. Guardam em memória no máximo as 500 linhas de decisão mais recentes e o resumo por Unidade, só da demanda aberta. Trocar de demanda descarta o que foi guardado da anterior, então os 20 registros nunca ficam todos em memória.

## Atualização (NFR1.3)

O observador de U1 passa a incluir o cursor `active-intent`, `intents.json` e a pasta `intents/`, com o aviso `changed` já existente. O orçamento de 3 segundos segue o de U2.
