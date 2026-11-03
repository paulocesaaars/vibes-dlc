# Feedback do AI-DLC para o Vibes DLC

O que aprendemos ao construir o Vibes DLC com o próprio AI-DLC. A regra de uso está no
`CLAUDE.md`. O resultado alimenta o `PRD.md`, o `TDD.md` e o protótipo.

## Perguntas em aberto

O guia precisa saber, sem interpretar o terminal, em que momento a etapa está. Estado:
**hipótese** (só leitura de código), **confirmado** ou **derrubado** (execução real).

| Sinal que o guia precisa | Pista até agora | Estado | Evidência |
|---|---|---|---|
| A IA fez uma pergunta e espera resposta | `aidlc engine log answers --stage <etapa>` lista em `open` a pergunta registrada e ainda sem resposta. Vale para perguntas que o agente registra antes de mostrar | Confirmado | Execução real em `intent-capture`: `open` trouxe a pergunta, as opções e `askedAt` depois do evento `DECISION_RECORDED` |
| A etapa está pronta e o gate espera aprovação | Marca `[?]` no `aidlc-state.md` e evento `STAGE_AWAITING_APPROVAL`, que traz a próxima etapa e o estado das checagens. **Cuidado:** `**Status**` continua `Running` e `**Next Action**` continua `Execute <etapa>` | Confirmado | Execução real em `intent-capture`: `[?] intent-capture` e evento às 03:54:32Z |
| A etapa está em andamento | Marca `[-]` e `**Status**: Running` no `aidlc-state.md`, e evento `STAGE_STARTED` | Confirmado | Execução real em `intent-capture` |
| O usuário pediu alterações | Marca `revising` e evento `GATE_REJECTED` | Hipótese | |
| A etapa foi aprovada | Evento `GATE_APPROVED`, com a resposta da pessoa e o destino de cada achado da revisão, marca `[x]` na etapa e `[-]` na seguinte, e `**Current Stage**` atualizado | Confirmado | Execução real em `intent-capture`: `GATE_APPROVED` às 03:55:48Z com os achados como `Accepted risk` |
| O comando colado foi executado (Enter) | Nenhuma ainda | Hipótese | |
| A etapa foi aprovada com o painel fechado | Mesmos arquivos da aprovação | Hipótese | |

## Outros pontos a verificar

- [ ] Os comandos reais: `/aidlc --scope <nível> "<descrição>"`, `/aidlc --stage <etapa>` e
      `/aidlc compose "<descrição>"`.
- [ ] Em que caminho os artefatos são gravados, e se os nomes batem com o `stage-graph.json`.
- [ ] Quais etapas condicionais são puladas, e como o estado registra isso.
- [ ] Os textos e o idioma das opções nos gates, como `Approve`.
- [ ] Como o `aidlc-state.md` e o `audit/` se comportam ao retomar uma sessão.
- [ ] O que o AI-DLC faz nas etapas de implantação, que ficam para a v2 do guia.

## Registro

Entradas mais recentes primeiro, neste formato:

```markdown
### AAAA-MM-DD · <etapa> · <tipo: sinal | divergência | confusão | ideia>
- **Observado:** o que aconteceu.
- **Evidência:** arquivo, campo e trecho.
- **Efeito no produto:** o que muda no guia, no PRD, no TDD ou no protótipo.
- **Situação:** pendente | aplicado em <arquivo> | aguardando decisão
```

### 2026-11-03 · scope-definition · sinal
- **Observado:** a confirmação do resumo tem evento próprio e não aparece em `answered` no `log answers`, mesmo depois de registrada. Uma pergunta acrescentada no meio da etapa (Q6, para resolver uma contradição) entrou normalmente no registro.
- **Evidência:** `SUMMARY_CONFIRMATION_RECORDED` na resposta de `aidlc engine log answer --checkpoint summary-confirmation`; em `aidlc engine log answers --stage scope-definition`, consultado depois disso, `answered` traz só Q1 a Q6 e `open` está vazia. Em `rough-mockups`, com a confirmação registrada e ainda sem resposta, `open` também veio vazia.
- **Efeito no produto:** a confirmação do resumo é um momento em que a vez é da pessoa, e `open` não o cobre. O guia precisa de outro sinal, como o `[Answer]:` em branco em `## Consolidated Summary Confirmation` no arquivo de perguntas da etapa. Esse sinal ainda precisa ser testado na construção.
- **Situação:** pendente

### 2026-11-03 · intent-capture · sinal
- **Observado:** com o gate aberto, só a marca da etapa muda para `[?]`. Os campos `**Status**` e `**Next Action**` não refletem a espera, e o guia que olhasse para eles mostraria a etapa ainda em execução.
- **Evidência:** `<record>/aidlc-state.md`, linhas de `[?] intent-capture` e `**Status**: Running`, e `aidlc engine audit history --event STAGE_AWAITING_APPROVAL`.
- **Efeito no produto:** o passo do guia deve vir da marca da etapa e dos eventos, não de `**Status**`. Atualizar a tabela de sinais do TDD quando os demais forem confirmados.
- **Situação:** pendente

### 2026-11-03 · intent-capture · divergência
- **Observado:** o verificador `claim-sources` exige o cabeçalho `## Initial Scope Signal` em inglês, mesmo em um documento em português. A revisão recusou o cabeçalho traduzido.
- **Evidência:** achado em `.aidlc-engine/sensors/intent-capture/claim-sources-aa8a0917.md`.
- **Efeito no produto:** ao exibir artefatos, o guia não pode presumir títulos traduzidos, e parte dos títulos fica em inglês mesmo com a conversa em português.
- **Situação:** pendente

### 2026-11-03 · intent-capture · divergência
- **Observado:** o pedido tinha várias linhas, mas o AI-DLC guardou só a primeira, e o restante (fontes, prioridade técnica e primeira fatia) não entrou no registro.
- **Evidência:** campo `description` de `aidlc engine workspace project-description` e `**Project**` em `aidlc-state.md`.
- **Efeito no produto:** o comando de nova demanda deve mandar uma descrição de uma linha, e referências como documentos devem ir para arquivos do repositório. O protótipo já usa só a primeira linha.
- **Situação:** pendente

### 2026-11-03 · intent-capture · sinal
- **Observado:** em execução real, a etapa em andamento aparece de três formas consistentes: `[-]` na lista, `**Current Stage**` com `**Status**: Running` e o evento `STAGE_STARTED`. O próprio arquivo traz a legenda das marcas: `[ ]`, `[-]`, `[?]`, `[R]`, `[x]` e `[S]`.
- **Evidência:** `<record>/aidlc-state.md` (`## Stage Progress` e `## Current Status`) e `aidlc engine audit history`, que devolve JSON sem alterar nada.
- **Efeito no produto:** o sinal de etapa em andamento fica confirmado. O leitor pode usar os comandos de leitura do AI-DLC em vez de interpretar os arquivos do registro.
- **Situação:** aguardando decisão

### 2026-11-03 · intent-capture · divergência
- **Observado:** a contagem de etapas muda conforme a fonte. O plano diz 19, o `aidlc-state.md` diz 22 no total e 3 concluídas, o `help` diz 20 e o PRD diz 23.
- **Evidência:** pergunta de confirmação do plano, `**Total Stages**` em `aidlc-state.md`, `aidlc engine orchestrate help` e `PRD.md`. Pelo estado, 3 são de preparação e 19 são as demais.
- **Efeito no produto:** o guia deve contar as etapas pelo `aidlc-state.md` da demanda, e o PRD deve deixar de citar um total fixo.
- **Situação:** pendente

### 2026-11-03 · antes da primeira execução · divergência
- **Observado:** o `aidlc engine orchestrate help` conta 30 etapas no total e 20 no `mvp`.
  O PRD conta 33 e 23, porque inclui as 3 etapas de preparação.
- **Evidência:** saída do `help` e `.claude/tools/data/stage-graph.json`.
- **Efeito no produto:** definir qual contagem o guia mostra ao escolher o nível.
- **Situação:** pendente

### 2026-11-03 · antes da primeira execução · sinal
- **Observado:** a documentação oficial diz que o Codex CLI usa `$aidlc` no lugar de `/aidlc`.
- **Evidência:** `README.md` de `awslabs/aidlc-workflows`.
- **Efeito no produto:** o modelo de comando por CLI do TDD precisa trocar pelo menos esse
  prefixo.
- **Situação:** pendente
