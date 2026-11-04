# Entidades: u3-demands

Base: `inception/domain-design/components.md` e `inception/contract-design/contract-summary.md`. Esta Unidade acrescenta entidades às de U1 e U2, sem mudar as existentes.

```yaml
entities:
  - name: DemandRow
    description: Uma linha do Início, lida de um registro em aidlc/spaces/<espaço>/intents/.
    owner: AidlcReader
    persisted: false
    attributes:
      - { name: intentId, type: text, required: true, unique: true }
      - { name: title, type: text, required: true }
      - { name: scope, type: text, required: true }
      - { name: stageLabel, type: text, required: false }
      - { name: doneCount, type: integer, required: true, min: 0 }
      - { name: totalCount, type: integer, required: true, min: 0 }
      - { name: turn, type: enum, required: true, allowed: [person, ai, guide, unknown] }
      - { name: isActive, type: boolean, required: true }
      - { name: readable, type: boolean, required: true }
      - { name: failedPath, type: path, required: false }
    constraints: ["Um registro ilegível vira uma linha com aviso, sem afetar as demais", "Nas não ativas, turn vem só da marca da etapa, sem rodar o comando de perguntas"]
    relationships: []

  - name: LevelSuggestion
    description: O nível sugerido para uma descrição, com o motivo.
    owner: Triage
    persisted: false
    attributes:
      - { name: scope, type: enum, required: true, allowed: [express, bugfix, security-patch, refactor, poc, infra, mvp, classic, workshop, feature, enterprise] }
      - { name: reason, type: text, required: true }
    constraints: ["É uma função pura, sem rede nem modelo de IA"]
    relationships: []

  - name: NewDemandDraft
    description: O rascunho dos três passos, mantido só na tela até a confirmação.
    owner: Web
    persisted: false
    attributes:
      - { name: description, type: text, required: true, max: 2000 }
      - { name: scope, type: text, required: true }
      - { name: command, type: text, required: true, max: 8000, constraints: "uma única linha" }
    constraints: ["Cancelar descarta o rascunho, sem nada no terminal nem no banco"]
    relationships: []

  - name: ArtifactNote
    description: Uma nota de quem usa o guia sobre um artefato. Fica em artifact_note, em .vibes/.
    owner: Core
    attributes:
      - { name: noteId, type: identifier, required: true, unique: true }
      - { name: intentId, type: text, required: true }
      - { name: artifactPath, type: path, required: true }
      - { name: text, type: text, required: true, min: 1, max: 4000 }
      - { name: createdAt, type: instant, required: true }
    constraints: ["O arquivo do artefato nunca muda"]
    relationships: []

  - name: UnitRow
    description: Uma Unidade na aba Unidades e ciclos, lida de unit-of-work.md e dos eventos do audit/.
    owner: AidlcReader
    persisted: false
    attributes:
      - { name: unitName, type: text, required: true, unique: true }
      - { name: description, type: text, required: false }
      - { name: status, type: enum, required: true, allowed: [pending, in_progress, built, approved] }
      - { name: lastStage, type: text, required: false }
      - { name: skippedStages, type: list-of-text, required: true, constraints: "etapas com UNIT_SKIPPED" }
    constraints: ["approved só vem de um GATE_APPROVED que traga essa Unidade em Unit", "built vem do UNIT_COMPLETED de code-generation, sem afirmar aprovação"]
    relationships: []

  - name: DecisionRow
    description: Uma decisão na aba Decisões, lida de eventos do audit/. O texto é dado não confiável, mostrado como texto.
    owner: AidlcReader
    persisted: false
    attributes:
      - { name: kind, type: enum, required: true, allowed: [question, answer, approval, rejection, review] }
      - { name: stage, type: text, required: false }
      - { name: at, type: instant, required: true }
      - { name: text, type: text, required: true }
    constraints: []
    relationships: []
```

## Resumo

- **Guardada no banco:** `ArtifactNote`, na migração `0003_u3.sql`. A mesma migração acrescenta a `sent_command` a coluna `kind`, com os valores `stage`, `new_demand`, `analysis` e `activate`, e as linhas de U1 e U2 ficam com `stage`.
- **Lidas a cada vez:** `DemandRow`, `UnitRow` e `DecisionRow`.
- **Valores:** `LevelSuggestion` e `NewDemandDraft`.
