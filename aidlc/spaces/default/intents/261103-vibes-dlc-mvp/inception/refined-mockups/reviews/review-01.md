## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-11-03T11:39:05Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/refined-mockups/interaction-spec.md > Componentes > Terminal (Keyboard interaction) e Assumptions & Open Questions | A especificação decide que Shift+Tab sai do terminal para o guia, mas a pendência final diz que a tecla de saída ainda depende das CLIs. O Claude Code, a CLI padrão do produto, usa Shift+Tab para trocar de modo, então a saída decidida pode não funcionar. Também não há dito como o teclado entra no terminal. Sem isso, quem usa só o teclado pode ficar preso no xterm, e a lista de acessibilidade afirma que tudo funciona só com teclado. | Trocar Shift+Tab por uma saída que não conflite com as CLIs, ou marcá-la como provisória na primeira fatia. Registrar também como o foco entra no terminal e como volta ao guia, e como isso é informado na barra do terminal. | New |
| R-02 | Major | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/refined-mockups/interaction-spec.md > Momentos do guia (tabela de prioridade) | A tabela promete cobrir todo caso, mas deixa lacunas. (a) Etapa `[x]` sem `GATE_APPROVED` não tem linha. (b) Demanda com todas as etapas concluídas e o aguardo da demanda recém-criada não são momentos da tabela. (c) A linha 3, sessão encerrada, vence as linhas 5 e 6, então a pessoa perde Revisar e Aprovar, que só leem arquivos, quando o terminal cai. (d) A linha 2 vence a linha 1 em alguns casos, sem regra dita. Um desenvolvedor teria de adivinhar esses casos. | Completar a tabela com os casos faltantes e dizer, por linha, se Revisar e Aprovar continuam acessíveis com a sessão encerrada. Se a linha 3 deve mesmo vencer, dizer por quê. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/refined-mockups/accessibility-checklist.md > Contraste | A tabela omite pares de texto definidos no mapa de tokens. Por exemplo, `#E00B41` (`--greenText`, texto de destaque) sobre `#FFD1DA` (`--leaf`) dá cerca de 3,6:1, abaixo de 4,5:1 para texto. Os pares já listados estão corretos, mas o conjunto está incompleto. | Calcular todos os pares texto/fundo de `design-system-mapping.md` e listar os que ficam abaixo da meta, aceitando-os de forma explícita ou trocando a cor. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/refined-mockups/mockups.md > Faixa de demanda não ativa e Assumptions & Open Questions | A ação "Tornar esta demanda ativa" depende do comando `/aidlc intent <nome>`, que o próprio documento admite não estar confirmado. A US6.2 fica sem caminho garantido de ativação. | Confirmar o comando na documentação oficial do AI-DLC antes de aprovar, ou registrar o plano de contingência se ele não existir. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/refined-mockups/interaction-spec.md > Cartão de comando | O campo é uma `textarea` em que Enter quebra a linha, mas não está dito o que acontece com um comando de várias linhas ao executar: cada linha pode virar um comando separado no shell. O cartão de confirmação mitiga, mas o comportamento não é especificado. | Definir se o comando é de uma linha só, se as quebras são bloqueadas ou avisadas, e como o modo "colar" difere de "executar". | New |
| R-06 | Minor | aidlc/spaces/default/intents/261103-vibes-dlc-mvp/inception/refined-mockups/mockups.md > Estrutura e interaction-spec.md > Terminal | Abaixo de 1180 pixels o terminal fica embaixo do guia, mas os momentos Aprovar e Pergunta mandam a pessoa responder no terminal. Não está dito se o terminal reaberto rola para a vista ou se há um indicador de que a resposta está lá embaixo. | Dizer como a pessoa é levada ao terminal empilhado, por exemplo com rolagem ou uma indicação no instruções do momento. | New |

### Summary

O pacote cobre bem os casos novos (IA parada, demanda não ativa, falha no repositório, outra CLI) e depende do protótipo para o resto, com rastreio claro às histórias e contas de contraste corretas. Antes da construção, pesar a saída do terminal pelo teclado e as lacunas da tabela de momentos, que um desenvolvedor teria de adivinhar.
