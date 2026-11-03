# Entidades: u1-walking-skeleton

Base: `inception/domain-design/components.md` e `inception/contract-design/contract-summary.md`. Esta Unidade modela só o necessário para a fatia de ponta a ponta. U2, U3 e U4 acrescentam as demais entidades.

```yaml
entities:
  - name: AppConfig
    description: Configuração validada no início do processo.
    owner: Config
    attributes:
      - { name: port, type: integer, required: true, default: 3000, min: 1, max: 65535 }
      - { name: host, type: text, required: true, default: "127.0.0.1" }
      - { name: dbPath, type: path, required: true, default: ".vibes/vibes.db" }
      - { name: shellPath, type: path, required: false, constraints: "vazio quando nenhum Git Bash foi encontrado" }
      - { name: repoRoot, type: path, required: false, constraints: "pasta que contém aidlc/, vazio quando nenhuma foi encontrada" }
      - { name: exposed, type: boolean, required: true, constraints: "verdadeiro quando host não é 127.0.0.1" }
      - { name: nodeVersionOk, type: boolean, required: true }
    constraints: ["Existe uma única instância por processo"]
    relationships: []

  - name: TerminalSession
    description: O registro da sessão de shell mantido em memória pelo servidor. Existe no máximo um por processo, e o de uma sessão encerrada fica até abrir outra.
    owner: Terminal
    persisted: false
    attributes:
      - { name: sessionId, type: identifier, required: true, unique: true }
      - { name: status, type: enum, required: true, allowed: [alive, dead, unavailable] }
      - { name: endReason, type: enum, required: false, allowed: [killed, shell_exited, server_stopped] }
      - { name: startedAt, type: instant, required: true }
      - { name: chunks, type: list-of-output-chunks, required: true, constraints: "blocos brutos de saída, cada um com seu seq, e os mais antigos saem quando o total passa de 2000 quebras de linha ou 5 MB" }
      - { name: nextSeq, type: integer, required: true, min: 1, constraints: "numera blocos de saída, não linhas" }
    constraints: ["A sessão termina quando é encerrada, quando o shell acaba ou quando o servidor para"]
    relationships: []

  - name: StageContent
    description: O texto em português do passo Entender de uma etapa. É dado estático do guia e fica ao lado de MomentContent, definida em components.md para os textos de cada momento.
    owner: GuideContent
    persisted: false
    attributes:
      - { name: stageSlug, type: text, required: true, unique: true, constraints: "a entrada genérica usa o valor generic" }
      - { name: whatItDoes, type: text, required: true }
      - { name: howItWorks, type: text, required: true }
    constraints: ["Vem do pacote do produto, sem leitura de rede"]
    relationships: []

  - name: DemandSummary
    description: Leitura da demanda ativa nos arquivos do AI-DLC. Não é guardada no banco.
    owner: AidlcReader
    persisted: false
    attributes:
      - { name: intentId, type: text, required: true, unique: true }
      - { name: title, type: text, required: true }
      - { name: scope, type: text, required: true }
      - { name: currentStage, type: text, required: false }
      - { name: isActive, type: boolean, required: true }
      - { name: readable, type: boolean, required: true }
      - { name: lastChangedAt, type: instant, required: true }
    constraints: ["Sempre relida dos arquivos"]
    relationships:
      - { to: StageState, cardinality: one-to-many, direction: DemandSummary -> StageState }

  - name: StageState
    description: A situação de uma etapa, lida de aidlc-state.md e do grafo de etapas.
    owner: AidlcReader
    persisted: false
    attributes:
      - { name: intentId, type: text, required: true }
      - { name: stageSlug, type: text, required: true }
      - { name: phase, type: text, required: true }
      - { name: mark, type: enum, required: true, allowed: [pending, in_progress, awaiting_approval, revising, approved, skipped, unknown], constraints: "unknown é o valor de leitura para uma marca que o guia não conhece" }
      - { name: artifacts, type: list-of-paths, required: true }
    constraints: ["Identificador composto: intentId + stageSlug"]
    relationships: []

  - name: GuideProgress
    description: O que o guia sabe sobre a etapa e que o AI-DLC não guarda.
    owner: Core
    attributes:
      - { name: intentId, type: text, required: true, references: DemandSummary.intentId }
      - { name: stageSlug, type: text, required: true }
      - { name: currentStep, type: enum, required: true, allowed: [understand, send, follow], default: understand }
      - { name: understoodAt, type: instant, required: false }
    constraints: ["Identificador composto: intentId + stageSlug", "A referência é por valor, sem vínculo no banco"]
    relationships:
      - { to: DemandSummary, cardinality: many-to-one, direction: GuideProgress -> DemandSummary }

  - name: SentCommand
    description: Um comando confirmado pela pessoa.
    owner: Core
    attributes:
      - { name: commandId, type: identifier, required: true, unique: true }
      - { name: intentId, type: text, required: true, references: DemandSummary.intentId }
      - { name: stageSlug, type: text, required: true }
      - { name: text, type: text, required: true, min: 1, max: 8000, constraints: "uma única linha" }
      - { name: mode, type: enum, required: true, allowed: [execute, paste] }
      - { name: status, type: enum, required: true, allowed: [pending, written, failed], default: pending }
      - { name: sentAt, type: instant, required: true }
      - { name: writtenAt, type: instant, required: false, constraints: "relógio do servidor, em milissegundos, gravado na passagem a written" }
    constraints: ["Só linhas written contam como enviadas"]
    relationships:
      - { to: DemandSummary, cardinality: many-to-one, direction: SentCommand -> DemandSummary }

  - name: SignalSnapshot
    description: Valor imutável com os sinais do momento, entregue ao Core a cada decisão. Forma definida em C1.
    owner: Core
    persisted: false
    attributes:
      - { name: repo, type: group, required: true }
      - { name: demand, type: group, required: true }
      - { name: stage, type: group, required: true }
      - { name: signals, type: group, required: true }
      - { name: guide, type: group, required: true }
      - { name: session, type: group, required: true }
      - { name: preferences, type: group, required: true, constraints: "cliKind é claude_code até U4" }
    constraints: []
    relationships: []

  - name: GuideDecision
    description: Valor devolvido pelo Core, com o momento e as ações permitidas.
    owner: Core
    persisted: false
    attributes:
      - { name: moment, type: enum, required: true, allowed: [failure, session_dead, understand, send, pasted, following] }
      - { name: turn, type: enum, required: true, allowed: [person, ai] }
      - { name: primaryAction, type: enum, required: true, allowed: [none, retry, new_session, understood, send] }
      - { name: canSend, type: boolean, required: true }
      - { name: sendBlockedReason, type: enum, required: false, allowed: [repo_failure, not_active, session_dead, other_cli, not_send_moment] }
    constraints: ["U2 e U3 acrescentam momentos, sem mudar estes"]
    relationships: []
```

## Resumo

- **Guardadas no banco:** `GuideProgress` e `SentCommand`. O banco não guarda cópia da demanda.
- **Em memória:** `TerminalSession`, que termina com o processo.
- **Dado estático:** `StageContent`, que vem no pacote do produto.
- **Lidas a cada vez:** `DemandSummary` e `StageState`, dos arquivos do AI-DLC.
- **Valores:** `SignalSnapshot` e `GuideDecision`, entrada e saída da decisão do `Core`.
