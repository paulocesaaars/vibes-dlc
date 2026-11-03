# Entidades: u2-guide-flow

Base: `inception/domain-design/components.md` e `inception/contract-design/contract-summary.md`. Esta Unidade acrescenta entidades às de U1, sem mudar as existentes.

```yaml
entities:
  - name: AuditEvent
    description: Uma entrada lida de audit/. Campos desconhecidos são ignorados.
    owner: AidlcReader
    persisted: false
    attributes:
      - { name: event, type: text, required: true }
      - { name: timestamp, type: instant, required: true }
      - { name: stage, type: text, required: false }
      - { name: unit, type: text, required: false }
    constraints: ["Uma entrada sem event ou sem timestamp válido é ignorada"]
    relationships: []

  - name: WorkPosition
    description: Onde o trabalho está de fato. Fora da Construção, vem do aidlc-state.md. Na Construção, vem do último evento de Unidade no audit/.
    owner: AidlcReader
    persisted: false
    attributes:
      - { name: stageSlug, type: text, required: true }
      - { name: unit, type: text, required: false }
      - { name: source, type: enum, required: true, allowed: [state, audit] }
    constraints: []
    relationships: []

  - name: OpenQuestion
    description: A contagem de perguntas abertas da etapa, lida com aidlc engine log answers.
    owner: AidlcReader
    persisted: false
    attributes:
      - { name: count, type: integer-or-unavailable, required: true, min: 0 }
    constraints: ["O texto da pergunta é dado não confiável, e o guia mostra só a contagem"]
    relationships: []

  - name: ArtifactItem
    description: Um artefato da etapa, lido do disco e mostrado como texto.
    owner: AidlcReader
    persisted: false
    attributes:
      - { name: path, type: path, required: true, unique: true, constraints: "dentro do registro do intent" }
      - { name: contentHash, type: text, required: true, constraints: "SHA-256 do conteúdo" }
      - { name: reviewStatus, type: enum, required: true, allowed: [pending, reviewed, changed] }
    constraints: ["reviewStatus vem da comparação entre contentHash e ArtifactReview"]
    relationships:
      - { to: ArtifactReview, cardinality: one-to-zero-or-one, direction: ArtifactItem -> ArtifactReview }

  - name: ArtifactReview
    description: A marca de revisão de um artefato, guardada em artifact_review.
    owner: Core
    attributes:
      - { name: intentId, type: text, required: true }
      - { name: artifactPath, type: path, required: true }
      - { name: contentHash, type: text, required: true }
      - { name: reviewedAt, type: instant, required: true }
    constraints: ["Identificador composto: intentId + artifactPath"]
    relationships: []

  - name: DemandSeenState
    description: O último estado visto da etapa, guardado em demand_seen_state, para avisar o que mudou ao reabrir.
    owner: Core
    attributes:
      - { name: intentId, type: text, required: true, unique: true }
      - { name: stageSlug, type: text, required: true }
      - { name: unit, type: text, required: true, default: "", constraints: "vazio fora da Construção" }
      - { name: mark, type: text, required: true }
      - { name: seenAt, type: instant, required: true }
    constraints: []
    relationships: []

  - name: TrailStage
    description: Uma etapa como aparece na trilha.
    owner: Core
    persisted: false
    attributes:
      - { name: stageSlug, type: text, required: true }
      - { name: phase, type: text, required: true }
      - { name: status, type: enum, required: true, allowed: [done, current, previous, blocked, skipped] }
    constraints: ["O status é mostrado com texto ou ícone, além da cor", "previous só existe com a posição vinda do audit/: é uma etapa antes da atual sem [x], mostrada como anterior, sem cadeado e sem afirmar conclusão"]
    relationships: []

  - name: ReviewChecklist
    description: A lista do que conferir em um artefato. É dado estático do guia.
    owner: GuideContent
    persisted: false
    attributes:
      - { name: artifactName, type: text, required: true, unique: true, constraints: "a entrada genérica usa o valor generic" }
      - { name: items, type: list-of-text, required: true, min: 1 }
    constraints: []
    relationships: []
```

## Resumo

- **Guardadas no banco:** `ArtifactReview` e `DemandSeenState`.
- **Lidas a cada vez:** `AuditEvent`, `WorkPosition`, `OpenQuestion`, `ArtifactItem` e `TrailStage`.
- **Dado estático:** `ReviewChecklist`.

## Acréscimos ao retrato de sinais

- `stage.unit`, com a Unidade, quando houver, e `position.source`, com `state` ou `audit`.
- `stage.gateApproved` e `stage.gateRejected`, verdadeiros quando o último evento de gate da tentativa atual da etapa for esse.
- `previous`, com a etapa anterior à atual na ordem do plano: `slug`, `gateApproved`, verdadeiro com `[x]` e `GATE_APPROVED` na tentativa dela, e `conclusionSeen`, verdadeiro depois de Ir para a próxima etapa.
- A coluna `conclusion_seen_at` em `guide_progress`, na linha da etapa aprovada, guarda esse reconhecimento em `.vibes/`.
- `guide.artifactsTotal` e `guide.artifactsReviewed`, já previstos em C1.
