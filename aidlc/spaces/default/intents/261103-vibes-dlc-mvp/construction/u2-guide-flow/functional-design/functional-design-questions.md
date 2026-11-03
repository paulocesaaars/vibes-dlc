# Design funcional de U2: perguntas

Os requisitos e a tabela de momentos respondem à maior parte desta Unidade. Esta pergunta veio do que observamos ao construir U1.

## Q1. [Arquitetura] Na Construção, o que o guia mostra como etapa atual?

O `aidlc-state.md` fica parado na primeira etapa da Unidade, e o `audit/` mostra a Unidade e a etapa reais nos eventos `UNIT_STARTED`.

A. Ler o `audit/` e mostrar a Unidade e a etapa reais
B. Usar só o `aidlc-state.md`
C. Mostrar só a fase, com a instrução genérica
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **Construção:** o guia mostra a Unidade e a etapa reais, a partir do último `UNIT_STARTED` do `audit/`.
- **Padrões que vou assumir, sem pergunta própria:**
  - **Pergunta:** o guia roda `aidlc engine log answers` a cada mudança nos arquivos. Com algo em `open`, a vez é da pessoa, que responde no terminal. Se o comando falhar, fica a instrução genérica;
  - **Revisar:** um artefato por vez, com caminho, lista do que conferir e contagem, sempre como texto. A revisão guarda o hash do conteúdo, e um artefato alterado volta a pedir revisão, com aviso;
  - **Aprovar:** sem botão. A instrução é responder no terminal, com as opções em inglês, como `Approve`. O guia diz quantos artefatos faltam revisar, sem impedir;
  - **Pedido de alterações:** `[R]` ou `GATE_REJECTED` voltam a Acompanhar, com a vez da IA, e a aprovação é pedida de novo;
  - **Conclusão:** só com `[x]` e `GATE_APPROVED`, com o progresso e o aviso de artefatos não revisados. A etapa seguinte oferece `/aidlc` só depois disso, e a última mostra a trilha concluída;
  - **IA parada:** com `[-]` e 10 minutos sem mudança nos arquivos, mostra o aviso, sem afirmar que parou. Retomar oferece `/aidlc`, com confirmação. Com outra CLI, só a orientação;
  - **Reabrir o painel:** compara com o último estado visto, guardado em `demand_seen_state`, e avisa o que mudou, com Entendi;
  - **Trilha:** as etapas por fase, como concluída, atual, bloqueada ou pulada, com texto ou ícone além da cor. Etapa concluída mostra os artefatos, e etapa bloqueada não oferece comando;
  - **Leitura tolerante:** uma entrada incompleta ou malformada no `audit/` é ignorada, sem erro na tela;
  - **Terminal empilhado:** abaixo de 1180 pixels, fica embaixo do guia, com altura própria e recolhível;
  - **Aparência:** tudo segue `design/prototipo/Main.dc.html`.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
