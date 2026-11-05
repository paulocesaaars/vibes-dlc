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

### 2026-11-04 · depois da construção · sinal
- **Observado:** a instalação documentada no `README.md` oficial (`aidlc config --harness claude`) para em perguntas quando roda num terminal real: `MCP [2]:` e `Fix the 2 sections that need you now? [Y/n]`. `--yes` não pula a pergunta de MCP (`--yes confirms but never implies MCP consent`). Quem cria a pasta sem perguntar é `aidlc config --harness claude --mcp none --yes`. O comando cria `aidlc/`, `.claude/` e `.gitignore`, e `aidlc doctor` dá 0 problemas. Sem terminal (entrada fechada), as perguntas passam sozinhas, o que esconde o problema num teste por script.
- **Evidência:** execução real no terminal do guia em uma pasta limpa, com "Tentar de novo" saindo da falha e `.vibes/` nascendo na raiz. `aidlc config project --help`.
- **Efeito no produto:** a tela de falha agora mostra esse comando (`src/guide/repo-setup.ts`). Citar o Claude Code é uma exceção pedida ao requisito 16 do `PRD.md`.
- **Situação:** aplicado em `src/guide/repo-setup.ts`; a exceção no `PRD.md` aguarda decisão

### 2026-11-04 · depois da construção · confusão
- **Observado:** o gancho `runtime-integrity` do AI-DLC recusou duas gravações de código do produto (`guide-parts.tsx` e um componente novo) como se fossem registros do AI-DLC, com a mensagem "AIDLC runtime records and hooks belong to the harness". O conteúdo era um componente React que cita o comando `aidlc`. A causa exata da recusa não foi identificada.
- **Evidência:** mensagem do gancho, com `Matched: src/web/components/guide-parts.tsx`, e `.claude/hooks/runtime-integrity.ts`, `protectedContentWrite`.
- **Efeito no produto:** um projeto que fala do próprio AI-DLC, como este guia, pode ter edições legítimas barradas sem explicação. Reaproveitamos o cartão existente em vez de criar um novo.
- **Situação:** pendente

### 2026-11-04 · depois da construção · divergência
- **Observado:** a pessoa notou, ao usar o produto, que o design não segue o protótipo. As telas de Início, Nova demanda, abas da demanda e Personalizar saíram quase sem o estilo do protótipo: `src/web/components/demand-hub.tsx` não tem nenhum `className`, e as classes `.row`, `.scope`, `.ctab`, `.skel` e `.toast`, mapeadas em `design-system-mapping.md`, não existem em `src/app/globals.css`. Todas as revisões deram READY, os 774 testes e as provas passaram, e o Build and Test aprovou, porque nenhuma dessas checagens compara a aparência com o protótipo. O `traceability.json` de U3 marca como `OK` só a existência do arquivo.
- **Evidência:** fotos lado a lado em `.vibes/compare/` (fora do Git), `design/prototipo/Main.dc.html` e `inception/refined-mockups/design-system-mapping.md`.
- **Efeito no produto:** gates verdes não dizem nada sobre fidelidade visual. O guia não deveria apresentar a etapa como conferida nesse ponto, e cada Unidade com tela deveria ter uma comparação com o protótipo no gate. Vale também como aviso a quem usa o AI-DLC para interface. A mesma comparação revelou que a aba Decisões mostrava `GATE_APPROVED` no lugar do conteúdo, porque o leitor não conhecia os campos reais `Decision` e `User Input`, embora o teste passasse com um `audit/` de exemplo inventado.
- **Situação:** telas corrigidas fora do fluxo do AI-DLC, a pedido da pessoa; o aviso no gate aguarda decisão

### 2026-11-04 · ci-pipeline · divergência
- **Observado:** a etapa `ci-pipeline` foi pulada a pedido da pessoa, que respondeu "esteira ainda nao foi construida" e "nao se aplica" às perguntas e, depois de uma pergunta de esclarecimento, escolheu "Não criar agora". O `team.md` dizia que essa etapa cria a verificação automática e encerra a exceção temporária de proteção de `main`; com o pulo, a exceção continua valendo. O pulo também deixou sem escrever `verification/phase-check-construction.md`, que é o Passo 5 da etapa (verificação da fronteira Construção → Operação).
- **Evidência:** `aidlc engine status` ("Completed (CI Pipeline skipped)"); `verification/` só tem `phase-check-inception.md`; `ci-pipeline.md`, Passo 5; `team.md`, Testing Posture ("Exceção temporária...").
- **Efeito no produto:** o guia deve explicar, antes das perguntas de uma etapa, o que ela cria e o que deixa de existir se for pulada. A pessoa respondeu "não se aplica" a perguntas cuja etapa é justamente a que cria a esteira. Pular uma etapa não deveria dispensar a verificação de fronteira de fase. Proposta ao `PRD.md`/`TDD.md`: nenhuma ainda; o `team.md` precisa registrar que a exceção continua.
- **Situação:** aguardando decisão

### 2026-11-04 · ci-pipeline · confusão
- **Observado:** `aidlc engine orchestrate next --skip ci-pipeline` e `aidlc engine log ...` falharam com "requires an installed project harness or recognized project directory" porque o terminal tinha ficado em uma subpasta de `aidlc/` por um `cd` anterior. Passar `--project-dir` resolveu. Para pular uma etapa já iniciada, `next --skip` não pula: devolve o comando `report --result skipped --reason ...` para rodar em seguida.
- **Evidência:** saídas dos dois comandos na etapa `ci-pipeline`.
- **Efeito no produto:** quem usa o guia a partir de um terminal que mudou de pasta pode ver erros sem relação com o que fez. O guia deveria sempre mandar o `--project-dir` nos comandos que ele oferece.
- **Situação:** pendente

### 2026-11-04 · build-and-test · sinal
- **Observado:** as provas `scripts/proof-u*.ts` copiam o `audit/` e o `aidlc-state.md` reais do registro vivo. À medida que a construção avançou, o registro real passou a conter eventos das etapas que as provas encenam (`nfr-requirements`, `code-generation`, `build-and-test`), e a prova de U2 quebrou três vezes por isso, sem nenhuma regressão no produto. A tela mostrava "Etapa concluída!" no lugar de "Compilação e testes".
- **Evidência:** `scripts/proof-repo.ts` (`dropStagedEvents`) e `scripts/proof-u2.ts`; saída de `npm run verify` antes e depois da correção.
- **Efeito no produto:** isso também vale para o guia: a decisão da etapa depende dos eventos do `audit/`, e a ordem e a presença deles mudam o que a tela mostra. Qualquer teste do guia que use o registro real herda esse risco. O `TDD.md` deveria mandar testar com registros de exemplo congelados e deixar o registro vivo só para a prova final.
- **Situação:** aplicado em `scripts/proof-repo.ts`; o ponto do `TDD.md` aguarda decisão

### 2026-11-04 · build-and-test · confusão
- **Observado:** o sensor de rastreabilidade entre Unidades reprovou `NFR9` porque `NFR9.1` de U2 está como `Deferred` no registro de U2 (a conferência manual no Chrome, deixada para o fim do MVP). O sensor lê `Deferred` como "não construído" e nenhuma etapa do plano é dona da conferência manual. Foi preciso decidir se a conferência entrava na matriz de metas (e reprovava a etapa) ou ficava fora, dita no gate.
- **Evidência:** `aidlc engine sensor-traceability --stage build-and-test` (`uncovered: ["NFR9"]`, `not_built: ["u2-guide-flow: NFR9.1"]`) e `construction/u2-guide-flow/code-generation/traceability.json`, linha de `NFR9.1`.
- **Efeito no produto:** o guia deveria distinguir "não construído" de "adiado por decisão da pessoa", e dizer quem é dono do que foi adiado.
- **Situação:** pendente

### 2026-11-04 · code-generation · sinal
- **Observado:** a revisão do design de NFR de U5 deu `READY` na segunda passada com dois achados `Major` novos (uma conexão SSE presa ao leitor antigo e a pasta em que se instala o AI-DLC sem raiz). `READY` com `Major` aberto é regra do revisor (até dois), mas é fácil entender "pronto" como "sem pendência". Levei os dois pontos para o plano de código para não perdê-los.
- **Evidência:** `.aidlc-engine/reviews/nfr-design/units/u5-install/*/2.*.review.md`, veredito e tabela "New findings".
- **Efeito no produto:** o guia deve mostrar achados `Major` abertos junto de um `READY`, e não só o veredito.
- **Situação:** pendente

### 2026-11-04 · code-generation · confusão
- **Observado:** a verificação da Unidade (`npm run verify`) falhou quatro vezes por causas diferentes antes de passar: um passo da prova de U2 dependente do registro vivo; o eco do terminal acima de 150 ms sob carga da máquina (o código anterior a U5 também estourava); um `next dev` esquecido na porta 3000 que impediu as provas de subir; e um aviso do vigia de arquivos que não chega quando a própria pasta `aidlc/` some. Só a última é comportamento do produto.
- **Evidência:** campo `verification.stdout_tail` de `.aidlc-construction-checkpoints/u5-install/unit.json` em cada tentativa.
- **Efeito no produto:** (1) a tela do guia não percebe sozinha que o `aidlc/` foi apagado com o painel aberto, e só recarregar mostra a falha; (2) uma falha de verificação que vem do ambiente deveria ser separável de uma falha do código, e hoje o AI-DLC só mostra a cauda da saída.
- **Situação:** pendente

### 2026-11-04 · code-generation · confusão
- **Observado:** no modo automático do Claude Code, o envio do agente desenvolvedor foi recusado três vezes. Um gancho do projeto altera o pedido depois da checagem do modo, e o texto alterado é longo demais para ser reavaliado. Só passou com a pessoa fora do modo automático, aprovando à mão.
- **Evidência:** mensagem de erro da chamada de `Agent` ("a hook changed this call's input after auto mode reviewed it"), repetida em U4. A construção também parou por isso em dois pontos do passo 12.
- **Efeito no produto:** quem usa o guia em modo automático pode ver a construção travar sem causa aparente. O guia deveria avisar que o envio do agente pode pedir aprovação manual, e a documentação do AI-DLC deveria dizer isso.
- **Situação:** pendente

### 2026-11-04 · code-generation · sinal
- **Observado:** as caixas marcadas no plano de código são o que o desenvolvedor declara, não prova. O passo 11 estava marcado com um teste que não cobria o passo Enviar, e a prova de U4 nunca tinha passado quando a construção foi interrompida no passo 12. Ao refazer a prova, apareceu um defeito real de BR6.2: com Outra CLI, o passo Enviar mostrava botões desabilitados.
- **Evidência:** `next` devolve "Picking up ... at step 12 of 13 (1-11 done)" a partir das caixas do plano; o relatório final do passo 12 e `code-summary.md` de U4 (seção de desvios).
- **Efeito no produto:** o guia não deve tratar caixas marcadas como evidência de andamento real nem de qualidade. Só as provas e as revisões contam.
- **Situação:** pendente

### 2026-11-04 · code-generation · divergência
- **Observado:** o plano de U4 previa `Response.formData()` para o multipart do envio. A construção usou um leitor próprio (`src/web/multipart.ts`), porque o primeiro não cabia na meta de memória do envio de 25 MiB. O plano aprovado não foi reaberto, e o desvio só aparece em `code-summary.md`.
- **Evidência:** `construction/u4-customization/code-generation/code-summary.md`, seção de desvios, e `code-generation-plan.md`, Step 8.
- **Efeito no produto:** um plano aprovado pode ser descumprido por um motivo técnico válido sem nova aprovação, e a pessoa só vê isso depois. O guia pode mostrar os desvios no gate da Unidade.
- **Situação:** pendente

### 2026-11-04 · code-generation · confusão
- **Observado:** ao pedir a revisão do código de U4, `change_notices` listou dezenas de arquivos de U1, U2 e U3 como "alterados depois da revisão" dessas Unidades. Em uma Construção por Unidade, uma Unidade nova mexe, de forma legítima, em arquivos de Unidades anteriores. A mesma chamada de revisão também foi interrompida uma vez por um achado do sensor de rastreabilidade (o `GAP` do AC3.7.3), antes de abrir o pedido.
- **Evidência:** saída de `aidlc engine log review --stage code-generation --unit u4-customization --iteration 1` e a mensagem do sensor em `.aidlc-engine/sensors/code-generation/`.
- **Efeito no produto:** quem lê o aviso pode achar que as Unidades anteriores perderam a aprovação, quando o aviso só diz "carrying on". O guia deveria explicar isso em uma linha, e a lacuna do sensor deveria ser chamada de decisão pendente da pessoa.
- **Situação:** pendente

### 2026-11-04 · code-generation · sinal
- **Observado:** o `fingerprint` do checkpoint da Unidade foi o mesmo (`sha256:e81e7d14...`) antes e depois de uma mudança de código (`src/core/decide-moment.ts`) e de ajustes em `rules.md` e `traceability.json`. A verificação rodou de novo e passou, mas não está claro o que o `fingerprint` cobre.
- **Evidência:** saídas de `aidlc engine bolt checkpoint --action verify` e `--action approve` de U4, no campo `fingerprint`.
- **Efeito no produto:** hipótese, não confirmada: o `fingerprint` cobre os artefatos de design e de código registrados, e não o código-fonte. Falta confirmar com uma execução controlada, antes de o guia afirmar que a aprovação vale para o código atual.
- **Situação:** pendente

### 2026-11-03 · code-generation · sinal
- **Observado:** `aidlc engine log answers` não é só de leitura. Quando herda a identificação de um chat, ele cria `aidlc/.aidlc-sessions/<id>.binding.json`. O comando também prefere `AIDLC_PROJECT_DIR` e `CLAUDE_PROJECT_DIR` à pasta atual.
- **Evidência:** a prova de U2 falhou com esse arquivo no `git status` da cópia de teste. Relatado em `.claude/tools/aidlc-lib.ts` (`writeSessionBinding`, `claudeNamedChat` e `resolveProjectDir`).
- **Efeito no produto:** o guia chama o comando com uma lista permitida de variáveis, e com `AIDLC_PROJECT_DIR` fixo. A resolução de sessão do `aidlc` também olha `CODEX_THREAD_ID`, `CODEX_SESSION_ID`, `AIDLC_SESSION_OVERRIDE` e a ancestralidade de processos. Com a lista permitida, a prova não viu nada gravado em `aidlc/`. O `TDD.md` deve registrar isso.
- **Situação:** pendente

### 2026-11-03 · code-generation · sinal
- **Observado:** `aidlc engine log answers --stage inexistente` devolve `"open":[]`, igual a uma etapa real sem perguntas. `open` vem de `DECISION_RECORDED` sem `QUESTION_ANSWERED`, o que a prova confirmou com o `aidlc` real, em 820 ms.
- **Evidência:** relato da construção de U2 e `handleAnswers` em `aidlc-log.ts`.
- **Efeito no produto:** um nome de etapa errado parece "sem perguntas". O guia deve usar só etapas lidas do registro.
- **Situação:** aplicado em `src/aidlc/open-questions.ts`, conforme o resumo de U2

### 2026-11-03 · code-generation · sinal
- **Observado:** o `UNIT_STARTED` de `code-generation` só é gravado depois da construção, em vez de no início. Enquanto o código é gerado, o último evento de Unidade é o da etapa anterior. Um `GATE_APPROVED` de checkpoint traz `**Unit**` e `**Stages**`, e não aprova a etapa.
- **Evidência:** `audit/`: em U1, `PLAN_APPROVAL_RECORDED` vem cerca de 500 linhas antes do `UNIT_STARTED`. Em U2, o último evento de Unidade antes da construção foi `UNIT_SKIPPED` de `infrastructure-design`.
- **Efeito no produto:** durante a geração de código, o guia mostra a etapa anterior. Um sinal melhor pode ser `PLAN_APPROVAL_RECORDED`. Isso pede uma decisão.
- **Situação:** aguardando decisão

### 2026-11-03 · code-generation · divergência
- **Observado:** a aprovação de um gate marca `[x]`, põe `[-]` na etapa seguinte e atualiza `**Current Stage**` de uma vez. Por isso, a etapa atual quase nunca está em `[x]`, e a conclusão descrita em AC4.3.1 e AC4.3.2 quase nunca apareceria.
- **Evidência:** tabela de momentos de `construction/u2-guide-flow/functional-design/functional-spec.md`, linha 4, e o sinal de aprovação registrado na tabela de perguntas em aberto deste arquivo.
- **Efeito no produto:** por decisão da pessoa, a conclusão vem da etapa anterior: `[x]` com `GATE_APPROVED`, e a etapa atual sem comando, sem artefatos e sem pergunta. Falta ver na próxima etapa real se a conclusão aparece a tempo quando a IA segue sozinha. O efeito ainda precisa entrar no `PRD.md`, com o aval da pessoa.
- **Situação:** aplicado em `functional-spec.md` de U2 e em `src/core/decide-moment.ts`; confirmação em execução real pendente

### 2026-11-03 · nfr-requirements · sinal
- **Observado:** no Windows, o `aidlc` instalado é um `aidlc.cmd`, que o Node.js não executa sem passar pelo `cmd.exe`. Um leitor que chame `aidlc engine log answers` de forma direta falha sempre, sem erro visível.
- **Evidência:** revisão de U2, com `execFile('aidlc')` terminando em `ENOENT` e `execFile('aidlc.cmd')` em `EINVAL`. O mesmo comando leva 0,35 s no Git Bash.
- **Efeito no produto:** o `TDD.md` deve registrar como o guia chama os comandos de leitura do AI-DLC, em `nfr-requirements/tech-stack-decisions.md` de U2.
- **Situação:** pendente

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
