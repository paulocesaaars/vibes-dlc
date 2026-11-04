# Regras: u3-demands

Base: `inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md`, `inception/refined-mockups/mockups.md` e `inception/contract-design/contract-summary.md`.

```yaml
rules:
  - id: BR1.1
    statement: Continuar fica desativado com a descrição vazia ou só com espaços, com o motivo visível.
    category: validation
    applies_to: NewDemandDraft
    trigger: edição
    logic: IF description.trim() vazio THEN desativar
    violation: não se aplica
    source: FR1.1
  - id: BR1.2
    statement: O nível sugerido vem de regras locais, na ordem do protótipo, com o motivo, sem nenhuma chamada a modelo. Sem regra aplicável, sugere feature.
    category: calculation
    applies_to: LevelSuggestion
    trigger: Continuar no primeiro passo
    logic: a primeira regra que combina vale, sem diferenciar maiúsculas, nesta ordem. security-patch com cve, vulnerab*, segurança. bugfix com bug*, erro*, corrigir, consertar, quebrad*. refactor com refator*, simplificar, limpar. infra com infraestrutura, infra, terraform, implantaç*. poc com poc, prova de conceito, protótipo. mvp com mvp, produto mínimo. workshop com oficina, workshop, treinamento. enterprise com compliance, conformidade, regulad*, auditoria, lgpd. express com ajuste pequeno, expresso. As formas com e sem acento valem igualmente, e bug, erro, infra, poc e mvp só valem no início de uma palavra
    violation: não se aplica
    source: FR1.3
  - id: BR1.3
    statement: Escolher outro nível muda o comando montado.
    category: calculation
    applies_to: NewDemandDraft
    trigger: escolha de nível
    logic: o comando é remontado a partir da descrição e do nível
    violation: não se aplica
    source: FR1.4
  - id: BR1.4
    statement: Cancelar, em qualquer passo, volta ao Início, sem nada enviado ao terminal e sem nada gravado.
    category: policy
    applies_to: NewDemandDraft
    trigger: Cancelar
    logic: descarta o rascunho
    violation: não se aplica
    source: FR1.2
  - id: BR1.5
    statement: O comando usa --new-intent quando existe outra demanda em andamento, e não usa quando não existe. A descrição vira uma linha, com aspas duplas trocadas por simples e caracteres de controle removidos, e o resultado fica visível antes de confirmar.
    category: calculation
    applies_to: NewDemandDraft
    trigger: montar o comando
    logic: IF há demanda em andamento THEN /aidlc --new-intent --scope <nível> "<descrição>" ELSE /aidlc --scope <nível> "<descrição>"
    violation: não se aplica
    source: FR1.5
  - id: BR2.1
    statement: Pedir análise mostra /aidlc compose "<descrição>" para confirmar, e ele só vai ao terminal depois da confirmação. Com Outra CLI, é só uma referência, sem botão de envio.
    category: authorization
    applies_to: SentCommand
    trigger: Pedir análise à sua IA
    logic: usa o mesmo cartão de envio de U1, gravando kind = analysis, com intent_id e stage_slug vazios. IF cliKind = other THEN sem envio
    violation: a rota responde 409 other_cli
    source: FR1.6
  - id: BR3.1
    statement: Confirmar o comando de nova demanda segue o mesmo envio de U1, com commandId, pending, written e failed, sem exigir uma demanda ativa. É gravado com kind = new_demand, com intent_id e stage_slug vazios. Só linhas com kind = stage alimentam commandSent, então nenhum comando desta Unidade muda o momento de uma etapa.
    category: authorization
    applies_to: SentCommand
    trigger: confirmar no terceiro passo
    logic: a rota /api/demands/new/command checa origem, formato, commandId, sessão viva e cliKind. lastWritten filtra por kind = stage
    violation: 409 session_dead ou other_cli
    source: FR1.7
  - id: BR3.2
    statement: Depois de confirmar, enquanto o registro novo não aparece, o guia diz que está esperando a IA criar a demanda e que ela pode perguntar algo no terminal, como se o trabalho é novo ou parte de outro.
    category: policy
    applies_to: tela
    trigger: comando written e nenhum intent novo
    logic: a tela guarda os intents vistos no envio e compara a cada aviso changed
    violation: não se aplica
    source: FR1.8
  - id: BR3.3
    statement: Quando o registro aparece, a demanda surge no Início, lida desse registro, sem cópia no banco.
    category: calculation
    applies_to: DemandRow
    trigger: aviso changed
    logic: a lista é relida dos arquivos
    violation: não se aplica
    source: FR1.8
  - id: BR4.1
    statement: Cada demanda do Início mostra nível, etapa atual, progresso e de quem é a vez.
    category: calculation
    applies_to: DemandRow
    trigger: abrir o Início
    logic: os números vêm do aidlc-state.md de cada registro. Na ativa, a vez usa decideMoment. Nas não ativas, usa só a marca da etapa atual, sem rodar o comando de perguntas. [?] é pessoa, [-] e [R] são ia, [x] é guide, e os demais casos são unknown, mostrado como "abra para ver"
    violation: não se aplica
    source: FR6.1
  - id: BR4.2
    statement: Sem demandas, o Início mostra a instrução e Nova demanda, sem mensagem de erro.
    category: policy
    applies_to: tela
    trigger: lista vazia
    logic: estado vazio próprio
    violation: não se aplica
    source: FR6.2
  - id: BR4.3
    statement: Um registro ilegível de uma demanda que não é a ativa mostra um aviso na própria linha, e as outras continuam utilizáveis.
    category: policy
    applies_to: DemandRow
    trigger: leitura falha
    logic: readable = falso, com failedPath. Nomes de pasta inseguros são ignorados
    violation: não se aplica
    source: FR6.3
  - id: BR5.1
    statement: Abrir uma demanda não ativa permite consultá-la e nunca altera active-intent.
    category: constraint
    applies_to: DemandSummary
    trigger: abrir
    logic: a demanda aberta fica só no estado da tela
    violation: o teste de escrita falha
    source: FR7.1
  - id: BR5.2
    statement: Em uma demanda não ativa, o envio fica desativado, com o motivo, e a rota também recusa. As perguntas abertas não são lidas nela, porque o comando age sobre a ativa.
    category: authorization
    applies_to: GuideDecision
    trigger: decisão e envio
    logic: moment = not_active, canSend = falso, openQuestions = unavailable
    violation: a rota responde 409 not_active
    source: FR7.3
  - id: BR5.3
    statement: Tornar a demanda ativa mostra /aidlc intent switch <nome> para confirmar, e ele só vai ao terminal depois da confirmação. Com Outra CLI, é só uma referência.
    category: authorization
    applies_to: SentCommand
    trigger: Tornar esta demanda ativa
    logic: o nome vem da pasta validada. A rota aceita esse único comando no momento not_active, montado no servidor, gravado com kind = activate, com intent_id da demanda alvo e stage_slug vazio
    violation: a rota responde 409
    source: FR7.4
  - id: BR5.4
    statement: Se a demanda ativa mudar com o painel aberto, o guia relê em até 3 segundos, mostra a faixa de não ativa na demanda aberta, e a rota de envio confere de novo.
    category: calculation
    applies_to: GuideDecision
    trigger: mudança em active-intent
    logic: o observador de U1 inclui o cursor, e stale_screen protege o envio
    violation: nada é enviado à demanda errada
    source: FR7.3
  - id: BR6.1
    statement: A demanda tem as abas Artefatos, Unidades e ciclos, Decisões e Histórico. Trocar de aba não muda o momento, e Voltar ao guia retorna a ele.
    category: policy
    applies_to: tela
    trigger: abrir aba
    logic: a aba é estado da tela
    violation: não se aplica
    source: FR13.1
  - id: BR6.2
    statement: Uma nota sobre um artefato fica em .vibes/, e o arquivo do artefato não muda. Vazia ou acima de 4000 caracteres, é recusada.
    category: validation
    applies_to: ArtifactNote
    trigger: salvar nota
    logic: grava em artifact_note, com o caminho validado pelo resolveArtifactPath de U2
    violation: a rota responde 422 ou 404
    source: FR13.3
  - id: BR6.3
    statement: Unidades e ciclos lista as Unidades de unit-of-work.md, com o estado derivado dos eventos do audit/. Sem o arquivo, a aba fica vazia, com a explicação.
    category: calculation
    applies_to: UnitRow
    trigger: abrir aba
    logic: pending sem evento. in_progress com UNIT_STARTED, UNIT_COMPLETED ou UNIT_SKIPPED de alguma etapa. built com UNIT_COMPLETED de code-generation, sem afirmar aprovação. approved quando o último evento de gate da Unidade é um GATE_APPROVED com a Unidade em Unit e Gate Scope igual a unit-end. Um GATE_REJECTED posterior da mesma Unidade volta a in_progress. O estado vale por Unidade, não por etapa. UNIT_SKIPPED vira só uma lista de etapas puladas, sem estado próprio
    violation: arquivo ilegível mostra qual é e o que fazer
    source: FR13.4
  - id: BR6.4
    statement: Decisões mostra tipo, etapa, data e texto, a partir dos eventos do audit/, sempre como texto, com as mais recentes primeiro e no máximo 500 linhas.
    category: calculation
    applies_to: DecisionRow
    trigger: abrir aba
    logic: DECISION_RECORDED, QUESTION_ANSWERED, GATE_APPROVED, GATE_REJECTED e REVIEW_COMPLETED viram linhas. Entradas ruins são ignoradas
    violation: não se aplica
    source: FR13.2
  - id: BR6.5
    statement: Histórico mostra só os comandos enviados pelo painel, com estado written. Os digitados à mão não aparecem, e o guia deixa isso claro.
    category: calculation
    applies_to: SentCommand
    trigger: abrir aba
    logic: lê sent_command da demanda, com kind stage e activate, cada um com o seu rótulo. Os de new_demand e analysis, sem intent_id, ficam no banco e não aparecem em nenhuma aba no MVP
    violation: não se aplica
    source: FR13.5
  - id: BR6.6
    statement: Uma aba vazia diz o que vai aparecer e em que etapa. Com um arquivo ilegível, diz qual é e o que fazer.
    category: policy
    applies_to: tela
    trigger: aba sem dados
    logic: textos próprios em GuideContent
    violation: não se aplica
    source: FR13.6
  - id: BR7.1
    statement: As rotas novas seguem isRequestAllowed e Zod, como as anteriores, e o produto continua escrevendo só em .vibes/.
    category: authorization
    applies_to: rotas internas
    trigger: cada requisição
    logic: mesma checagem de U1
    violation: 403 origin_rejected
    source: NFR4
```

## Resumo

| Grupo | Regras | Tema |
|---|---|---|
| BR1 | BR1.1 a BR1.5 | Nova demanda |
| BR2 | BR2.1 | Análise pela IA |
| BR3 | BR3.1 a BR3.3 | Depois de confirmar |
| BR4 | BR4.1 a BR4.3 | Início |
| BR5 | BR5.1 a BR5.4 | Demanda não ativa |
| BR6 | BR6.1 a BR6.6 | Abas |
| BR7 | BR7.1 | Segurança |
