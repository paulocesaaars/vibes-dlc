# Regras: u2-guide-flow

Base: `inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md`, `inception/refined-mockups/interaction-spec.md` e `inception/contract-design/contract-summary.md`.

```yaml
rules:
  - id: BR1.1
    statement: Um artefato gravado aparece no painel aberto em até 3 segundos, sem recarregar a página.
    category: constraint
    applies_to: ArtifactItem
    trigger: mudança nos arquivos do intent
    logic: o aviso changed de U1 faz a interface pedir a decisão e a lista de artefatos de novo
    violation: não se aplica
    source: FR4.1
  - id: BR1.2
    statement: Na Construção, a posição do trabalho vem do último evento de Unidade no audit/, e a tela mostra a Unidade e a etapa.
    category: calculation
    applies_to: WorkPosition
    trigger: cada leitura, com a fase construction
    logic: IF a etapa atual do aidlc-state.md está em [-] AND há evento de Unidade da execução atual THEN source = audit, e o último UNIT_STARTED dá a etapa e a Unidade. Depois de UNIT_COMPLETED, a posição fica nele até o próximo evento. Execução atual são os eventos depois do último STAGE_STARTED da etapa atual do aidlc-state.md. Com source = audit, além de falha, demanda não ativa e sessão encerrada, só valem question e following. Nos demais casos, vale o aidlc-state.md
    violation: um audit ilegível volta ao aidlc-state.md
    source: FR4.2
  - id: BR1.3
    statement: Uma entrada incompleta ou malformada no audit/, ou um campo desconhecido, é ignorada, e o restante é usado, sem erro na tela.
    category: validation
    applies_to: AuditEvent
    trigger: cada leitura
    logic: IF a entrada não tem event ou timestamp válido THEN ignorar
    violation: não se aplica
    source: FR4.10
  - id: BR1.4
    statement: Um arquivo sendo gravado mantém o último estado válido, que é lido de novo na próxima mudança.
    category: policy
    applies_to: WorkPosition
    trigger: leitura falha
    logic: mesma tolerância do observador de U1
    violation: não se aplica
    source: FR4.10
  - id: BR2.1
    statement: Com uma pergunta em open, a vez é da pessoa, e o guia pede a resposta no terminal.
    category: calculation
    applies_to: GuideDecision
    trigger: cada decisão
    logic: Depois das linhas de falha, sessão, conclusão e gate da tabela, IF signals.openQuestions > 0 THEN moment = question. A pergunta do próprio gate não conta, porque a marca [?] vem antes
    violation: não se aplica
    source: FR4.6
  - id: BR2.2
    statement: Se a leitura das perguntas falhar, ou a IA perguntar sem registrar, a instrução genérica continua visível, e o guia não afirma nada que não possa confirmar.
    category: policy
    applies_to: OpenQuestion
    trigger: comando falhou ou lista vazia
    logic: IF openQuestions = unavailable THEN seguir a tabela, sem o momento question
    violation: não se aplica
    source: FR4.7
  - id: BR2.3
    statement: O comando de perguntas é só de leitura, usa o aidlc de VIBES_AIDLC ou do PATH, com argumentos validados, e roda só para a demanda ativa, no máximo uma vez a cada mudança.
    category: constraint
    applies_to: AidlcReader
    trigger: leitura de perguntas
    logic: etapa e Unidade são validadas antes de virar argumento, e a contagem fica guardada até as datas dos arquivos mudarem
    violation: valor inválido vira unavailable
    source: NFR5
  - id: BR2.4
    statement: As instruções continuam corretas com as opções fixas em inglês, como Approve, que aparecem como estão.
    category: policy
    applies_to: MomentContent
    trigger: momentos question e approve
    logic: os textos citam as opções no original
    violation: não se aplica
    source: NFR8
  - id: BR3.1
    statement: Com a etapa em andamento ou em revisão e nenhuma mudança nos arquivos do AI-DLC por 10 minutos, o guia mostra o aviso de que a IA pode ter parado, com a orientação de conferir o terminal e retomar. Com menos que isso, não mostra.
    category: calculation
    applies_to: GuideDecision
    trigger: cada decisão e um relógio de 30 segundos na interface
    logic: IF moment em following ou revising AND a etapa está em andamento ou em revisão AND minutesSinceLastChange >= 10 THEN showIdleNotice
    violation: não se aplica
    source: FR4.8
  - id: BR3.2
    statement: A contagem vem da data dos arquivos, então o aviso continua depois de recarregar e some quando um arquivo muda. O texto nunca afirma que a IA parou.
    category: calculation
    applies_to: GuideDecision
    trigger: cada decisão
    logic: minutesSinceLastChange usa a maior data de modificação entre aidlc-state.md e audit/
    violation: não se aplica
    source: FR4.8
  - id: BR3.3
    statement: Retomar coloca /aidlc no cartão de envio, e nada vai ao terminal sem confirmação. Com outra CLI, só a orientação aparece.
    category: authorization
    applies_to: GuideDecision
    trigger: Retomar
    logic: a ação usa o mesmo envio de U1, com canSend também verdadeiro em following e revising com showIdleNotice
    violation: a rota responde 409
    source: FR3.1
  - id: BR4.1
    statement: Com a etapa em [?], Revisar mostra um artefato por vez, com o caminho, a lista do que conferir e a contagem de revisados. Sem artefato pendente, ou sem artefatos, vai para Aprovar.
    category: calculation
    applies_to: GuideDecision
    trigger: cada decisão
    logic: IF mark = awaiting_approval AND artifactsReviewed < artifactsTotal THEN review ELSE approve
    violation: não se aplica
    source: FR5.4
  - id: BR4.2
    statement: O artefato é exibido como texto, sem executar HTML nem scripts, e sem carregar recursos externos.
    category: constraint
    applies_to: ArtifactItem
    trigger: exibir
    logic: o conteúdo é colocado como texto, sem interpretar HTML
    violation: o teste de interface falha
    source: NFR5
  - id: BR4.3
    statement: Só os caminhos dentro do registro do intent podem ser lidos, com limite de 2 MB. Um caminho de fora é recusado.
    category: authorization
    applies_to: ArtifactItem
    trigger: leitura de artefato
    logic: IF o caminho resolvido sai do registro THEN responder 404. IF passa de 2 MB THEN mostrar o caminho e o motivo
    violation: nada é lido
    source: NFR5
  - id: BR4.4
    statement: Marcar como revisado grava o hash do conteúdo, e um artefato cujo conteúdo mudou volta a pedir revisão, com aviso.
    category: calculation
    applies_to: ArtifactReview
    trigger: mark_reviewed e cada leitura
    logic: reviewed quando o hash confere. changed quando há revisão com outro hash. pending sem revisão
    violation: não se aplica
    source: FR5.5
  - id: BR5.1
    statement: O passo Aprovar pede a resposta no terminal e não tem botão de aprovar. Se faltam artefatos, diz quantos, sem impedir.
    category: constraint
    applies_to: GuideDecision
    trigger: momento approve
    logic: primaryAction = none
    violation: o teste de interface falha
    source: FR5.6
  - id: BR5.2
    statement: GATE_APPROVED com [x] na etapa anterior leva à conclusão, enquanto a etapa atual ainda não andou.
    category: calculation
    applies_to: GuideDecision
    trigger: cada decisão
    logic: IF a etapa anterior na ordem do plano tem [x] e GATE_APPROVED na tentativa dela AND ainda não foi reconhecida AND position.source = state AND a etapa atual está em [ ] ou [-], sem GATE_REJECTED, sem understood, sem comando written, sem artefatos e sem pergunta aberta THEN conclusion. Se a pessoa já foi em frente pelo terminal, o guia não volta à conclusão. Sem o evento, a marca [x] sozinha não afirma aprovação
    violation: não se aplica
    source: FR4.3
  - id: BR5.3
    statement: Um pedido de alterações, com [R] ou GATE_REJECTED, volta a Acompanhar, e a aprovação é pedida de novo quando a marca [?] voltar. Isso é conferido na primeira execução real.
    category: calculation
    applies_to: GuideDecision
    trigger: cada decisão
    logic: Com a marca [?] já tratada antes na tabela e sem pergunta aberta, IF mark = revising OR gateRejected THEN moment = revising, turn = ai. gateRejected olha o último evento de gate depois do último STAGE_STARTED da etapa
    violation: não se aplica
    source: FR4.4
  - id: BR6.1
    statement: A conclusão mostra o progresso da demanda e quantos artefatos da etapa anterior foram revisados. Uma aprovação sem revisar todos gera um aviso, sem bloquear.
    category: policy
    applies_to: GuideDecision
    trigger: momento conclusion
    logic: os números vêm dos artefatos e das revisões da etapa anterior e do estado das etapas. Em trail_done, os artefatos são os da última etapa
    violation: não se aplica
    source: FR5.7
  - id: BR6.2
    statement: O comando da etapa seguinte só é oferecido depois que o AI-DLC registrar a etapa atual como aprovada.
    category: constraint
    applies_to: GuideDecision
    trigger: cada decisão
    logic: IF moment != conclusion THEN nenhuma ação next_stage. Ir para a próxima etapa grava o reconhecimento em .vibes/ e leva ao passo Entender da etapa atual, com /aidlc oferecido no passo Enviar. canSend é falso em conclusion e em trail_done
    violation: a rota responde 409
    source: FR5.8
  - id: BR6.3
    statement: Na última etapa aprovada, o guia mostra a trilha concluída, com acesso ao histórico.
    category: calculation
    applies_to: GuideDecision
    trigger: cada decisão
    logic: IF mark = approved AND gateApproved AND hasNextStage = falso THEN moment = trail_done
    violation: não se aplica
    source: FR5.9
  - id: BR7.1
    statement: Ao abrir uma demanda, o guia compara com o último estado visto e avisa o que mudou, com Entendi, e mostra o momento atual.
    category: calculation
    applies_to: DemandSeenState
    trigger: abrir o painel
    logic: IF etapa, Unidade ou marca diferem de demand_seen_state THEN mostrar o aviso. Entendi grava o estado atual. Na primeira vez, grava sem aviso
    violation: não se aplica
    source: FR6.3
  - id: BR8.1
    statement: A trilha mostra as etapas por fase, como concluída, atual, anterior, bloqueada ou pulada, sem depender só de cor. Os números vêm dos arquivos.
    category: calculation
    applies_to: TrailStage
    trigger: cada leitura
    logic: mark e posição definem o status. done vem só de [x]. Com position.source = audit, a etapa antes da atual sem [x] é previous, com o texto "anterior", sem cadeado e sem afirmar conclusão. Os demais casos sem [x] são blocked
    violation: não se aplica
    source: FR5.1
  - id: BR8.2
    statement: Uma etapa concluída mostra os artefatos dela ao ser aberta, e uma etapa bloqueada ou anterior não oferece nenhum comando.
    category: constraint
    applies_to: TrailStage
    trigger: selecionar na trilha
    logic: selecionar não muda o momento nem o cursor do AI-DLC
    violation: não se aplica
    source: FR5.1
  - id: BR9.1
    statement: As rotas novas seguem isRequestAllowed e Zod, como as de U1, e o produto continua escrevendo só em .vibes/.
    category: authorization
    applies_to: rotas internas
    trigger: cada requisição
    logic: mark_reviewed, seen e leitura de artefato passam pela mesma checagem
    violation: 403 origin_rejected
    source: NFR4
```

## Resumo

| Grupo | Regras | Tema |
|---|---|---|
| BR1 | BR1.1 a BR1.4 | Leitura e posição |
| BR2 | BR2.1 a BR2.4 | Perguntas |
| BR3 | BR3.1 a BR3.3 | IA parada |
| BR4 | BR4.1 a BR4.4 | Revisar |
| BR5 | BR5.1 a BR5.3 | Aprovar e alterações |
| BR6 | BR6.1 a BR6.3 | Conclusão |
| BR7 | BR7.1 | Reabrir o painel |
| BR8 | BR8.1 e BR8.2 | Trilha |
| BR9 | BR9.1 | Segurança |
