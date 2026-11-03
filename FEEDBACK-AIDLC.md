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

### 2026-11-03 · code-generation · sinal
- **Observado:** na Construção por Unidade, o `aidlc-state.md` não acompanha o trabalho real. Durante a geração de código de U1, ele continuou mostrando a etapa de design funcional, sem atualizar a data.
- **Evidência:** conferido em `aidlc-state.md` depois da construção: `**Current Stage**: functional-design`, `- [-] functional-design` e `- [ ] code-generation`, com `Last Updated` em 2026-11-03T16:12:36Z, antes de começar o código.
- **Efeito no produto:** ler só a marca da etapa pode mostrar a etapa errada durante a Construção. U2 precisa de outro sinal, como os eventos `UNIT_STARTED` e `UNIT_COMPLETED` do `audit/`, e o `TDD.md` deve registrar isso.
- **Situação:** pendente

### 2026-11-03 · functional-design · sinal
- **Observado:** a revisão de U1 parou porque o limite de uso da conta acabou. O estado continuou como se a etapa estivesse rodando, sem nenhum sinal de falha, e o arquivo de revisão não chegou a existir. A retomada só ficou clara ao rodar `next`, que explicou como reabrir o pedido com `--retry-pending`.
- **Evidência:** `**Status**: Running` e o evento `REVIEW_REQUESTED`, sem `REVIEW_COMPLETED`, com o arquivo `.review.md` ausente em `<record>/.aidlc-engine/reviews/`.
- **Efeito no produto:** pelos arquivos, uma IA sem créditos parece igual a uma IA trabalhando. O aviso de 10 minutos sem mudança (requisito 19 do `PRD.md`) é o único sinal disponível, e o texto dele deve citar o limite de uso e explicar que basta enviar `/aidlc` de novo.
- **Situação:** pendente

### 2026-11-03 · functional-design · divergência
- **Observado:** o design funcional precisou acrescentar campos aos contratos aprovados: `status` e `written_at` em `sent_command`, novos motivos em `sendBlockedReason` e `reset` e `afterSeq` no stream do terminal.
- **Evidência:** seção "Acréscimos aos contratos" de `construction/u1-walking-skeleton/functional-design/functional-spec.md`.
- **Efeito no produto:** nenhum para quem usa o guia. O `TDD.md` deve receber esses campos quando U1 for validada na execução.
- **Situação:** pendente

### 2026-11-03 · practices-discovery · confusão
- **Observado:** as instruções sobre o diário da etapa não combinam. O protocolo manda quem conduz manter o `memory.md` à mão durante a etapa, e o próprio arquivo diz para não editá-lo diretamente. Além disso, a etapa promete revisão de qualidade, desenvolvimento e segurança, mas no `mvp` o líder trabalha sozinho.
- **Evidência:** "The diary is the *only* file you maintain by hand" nas instruções de condução, contra "not by editing here directly" no topo de `inception/practices-discovery/memory.md`. A lista `support_agents` veio vazia, com `collaborators: off`, enquanto o arquivo da etapa lista os três agentes.
- **Efeito no produto:** o guia não deve descrever uma etapa pelo arquivo dela sem considerar o nível. Para esta etapa, deve dizer que no `mvp` não há revisão independente, inclusive de segurança.
- **Situação:** pendente

### 2026-11-03 · rough-mockups · sinal
- **Observado:** a sessão parou no meio da etapa quando os créditos acabaram. A revisão já estava gravada, mas sem veredito registrado, e a etapa continuou como em andamento até a retomada com `/aidlc`. Depois de registrar o veredito e abrir a aprovação, a marca mudou de `[-]` para `[?]`.
- **Evidência:** em `aidlc-state.md`, `[-] rough-mockups` antes da retomada e `[?] rough-mockups` depois. O arquivo da revisão tem `Date: 2026-11-03T04:18:54Z`, e `STAGE_AWAITING_APPROVAL` só aparece às 10:35:16Z no `audit/`. Ao retomar, `aidlc engine orchestrate next` informou que a revisão não tinha veredito.
- **Efeito no produto:** a marca `[-]` não prova que a IA está trabalhando. Uma sessão interrompida fica igual a uma ativa nos arquivos, então "A sua IA está trabalhando..." em E3.3 pode ficar errado por horas. O guia deve dizer que a IA pode ter parado e orientar a retomada com `/aidlc`. A execução também confirma `[?]` e `STAGE_AWAITING_APPROVAL` como sinal de aprovação pendente.
- **Situação:** pendente

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
