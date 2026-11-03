# Contratos: MVP do Vibes DLC

Base: `inception/units-generation/unit-of-work.md`, `inception/units-generation/unit-of-work-dependency.md`, `inception/domain-design/components.md`, `inception/requirements-analysis/requirements.md` e `contract-design-questions.md`.

O produto não tem API pública. Todas as Unidades ficam no mesmo processo, então os contratos são tipos TypeScript entre módulos e esquemas Zod nas rotas internas. Os blocos abaixo descrevem a forma dos dados. O código é a versão executável, sem documento OpenAPI gerado.

## Contratos

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| C1 | U1 (`Core`) | U2, U3, U4, U5 | Tipos TypeScript | U1 |
| C2 | U1 (`AidlcReader`) | U2, U3, U5 | Tipos TypeScript | U1 |
| C3 | U1 (`Db`) | U2, U3, U4 | Tipos TypeScript e migrações | U1 |
| C4 | U1 (`Web`, rotas) | Interface, U2, U3, U4 | HTTP interno com Zod | U1 |
| C5 | U1 (`Web`, SSE) | Interface | Server-Sent Events | U1 |
| C6 | U1 (`Config`) | U2, U3, U4, U5 | Tipos TypeScript | U1 |
| C7 | U4 (`Customization`) | U1 (`Core`, pelo retrato) | Tipos TypeScript | U4 |
| C8 | External: AI-DLC | U1, U2, U3 | Arquivos e comando de leitura | AI-DLC, com adaptação em U1 |

## C1. Decisão do guia

Função pura: `decideMoment(snapshot) -> decision`. O `Core` não faz entrada nem saída. Cada Unidade acrescenta campos e momentos, sem mudar os existentes.

```yaml
SignalSnapshot:
  repo:
    health: ok | missing_aidlc | unreadable_record | missing_shell
    failedPath: string | null
  demand:
    intentId: string
    isActive: boolean
    activeIntentId: string | null
  stage:
    slug: string
    mark: pending | in_progress | awaiting_approval | revising | approved | skipped
    lastEvent: string | null
    hasNextStage: boolean
  signals:
    openQuestions: number | unavailable
    minutesSinceLastChange: number
  guide:
    understood: boolean
    commandSent: none | pasted | executed
    artifactsTotal: number
    artifactsReviewed: number
  session:
    status: alive | dead | unavailable
  preferences:
    cliKind: claude_code | other
GuideDecision:
  moment: failure | not_active | session_dead | conclusion | trail_done | review | approve | revising | question | following | pasted | send | understand
  turn: person | ai | guide
  primaryAction: none | retry | activate | new_session | next_stage | mark_reviewed | send | understood
  canSend: boolean
  sendBlockedReason: not_active | session_dead | other_cli | null
  showIdleNotice: boolean
```

**Falhas:** `unavailable` em `openQuestions` mantém a instrução genérica. Marca desconhecida vira `following`, sem afirmar aprovação.

## C2. Leitura do AI-DLC

```yaml
AidlcReader:
  listDemands: () -> DemandSummary[]
  readDemand: (intentId) -> DemandDetail | ReadFailure
  readArtifact: (intentId, path) -> ArtifactContent | ReadFailure
  readOpenQuestions: (stageSlug) -> { count: number } | unavailable
  buildCommand: (kind, args) -> string
  subscribe: (listener) -> unsubscribe
DemandSummary:
  intentId: string
  title: string
  scope: string
  currentStage: string | null
  isActive: boolean
  readable: boolean
  lastChangedAt: iso8601
DemandDetail:
  summary: DemandSummary
  phases: [{ name: string, stages: [{ slug: string, mark: string, artifacts: string[] }] }]
ArtifactContent:
  path: string
  content: string
  contentHash: string
ReadFailure:
  code: not_found | unreadable | outside_root
  path: string
```

**Regras:** caminhos são resolvidos dentro de `<record>/`, e `outside_root` recusa `..` e links que saiam dele. Conteúdo lido é dado não confiável. `buildCommand` valida nomes com um padrão de letras, números e hífens antes de montá-los.

## C3. Banco local

`Db` expõe acesso genérico e não conhece os tipos dos outros módulos. Cada módulo mapeia as próprias linhas, o que evita dependência circular entre `Db` e `Customization`.

```yaml
Db:
  run: (sql, params) -> { changes: number }
  all: (sql, params) -> Row[]
  transaction: (fn) -> result
Migrations:
  location: db/migrations
  name: NNNN-unit-description.sql
  rule: só avançam; uma cópia de .vibes/vibes.db é feita antes de migrar
Tables:
  guide_progress: [intent_id, stage_slug, current_step, understood_at]
  sent_command: [command_id, intent_id, stage_slug, text, mode, sent_at]
  demand_seen_state: [intent_id, stage_slug, mark, seen_at]
  artifact_review: [intent_id, artifact_path, content_hash, reviewed_at]
  artifact_note: [note_id, intent_id, artifact_path, text, created_at]
  customization_item: [item_key, kind, value, updated_at]
```

- U1 cria `guide_progress` e `sent_command`. U2 cria `demand_seen_state` e `artifact_review`. U3 cria `artifact_note`. U4 cria `customization_item`.
- `demand_seen_state` guarda o último estado visto, usado para avisar o que mudou ao reabrir o painel.
- `intent_id` é uma referência por valor, sem chave estrangeira. Linhas de um intent apagado ficam sem uso e não são mostradas.
- Um intent renomeado começa com progresso novo, porque o identificador é o nome da pasta.

## C4. Rotas internas

Todas ficam em `127.0.0.1` e atendem só a própria interface. As rotas que escrevem no terminal ou na personalização rejeitam `Origin` ou `Host` de fora.

```yaml
openapi: 3.1.0
info: { title: Vibes DLC interno, version: 0.1.0 }
paths:
  /api/terminal/session:
    post:
      summary: Abre ou retoma a sessão
      responses:
        '200': { description: 'sessionId e últimas linhas' }
        '503': { description: 'shell_unavailable, sem Git Bash' }
    delete:
      summary: Encerra a sessão
      responses: { '204': { description: Encerrada } }
  /api/terminal/stream:
    get:
      summary: Saída da sessão por SSE
      responses: { '200': { description: text/event-stream } }
  /api/terminal/input:
    post:
      summary: Teclas digitadas no terminal
      responses: { '204': { description: Aceita }, '409': { description: session_dead } }
  /api/terminal/resize:
    post:
      summary: Redimensiona a sessão
      responses: { '204': { description: Aceita } }
  /api/commands:
    post:
      summary: Envia um comando confirmado
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [commandId, intentId, stageSlug, text, mode]
              properties:
                commandId: { type: string, format: uuid }
                intentId: { type: string }
                stageSlug: { type: string }
                text: { type: string, minLength: 1, maxLength: 8000 }
                mode: { enum: [execute, paste] }
      responses:
        '200': { description: 'Enviado, ou já enviado com o mesmo commandId, sem repetir' }
        '409': { description: 'not_active, session_dead ou other_cli' }
  /api/demands:
    get:
      summary: Lista as demandas
      responses: { '200': { description: DemandSummary[] } }
  /api/demands/{intentId}/guide:
    get:
      summary: Momento atual da demanda
      responses: { '200': { description: GuideDecision e detalhes } }
  /api/events:
    get:
      summary: Avisos de mudança por SSE
      responses: { '200': { description: text/event-stream } }
  /api/customization:
    get:
      summary: Lê a personalização
      responses: { '200': { description: Valores atuais } }
    put:
      summary: Altera valores e a preferência Sua IA
      responses: { '200': { description: Salvo }, '422': { description: invalid_value } }
  /api/customization/media:
    post:
      summary: Envia mídia
      responses: { '200': { description: Salvo }, '413': { description: too_large }, '415': { description: unsupported_type } }
```

**Erro padrão:** `{ code, message }`, com `message` em português, e `403 origin_rejected` para origem de fora.

**Envio único:** a interface gera `commandId` ao confirmar. A rota grava em `sent_command` antes de escrever no terminal. Se o `commandId` já existe, responde 200 sem escrever de novo. Se a escrita falhar depois da gravação, responde 500, e a pessoa confirma de novo, com um novo `commandId`.

**Conferência no envio:** a rota relê a demanda ativa e chama `decideMoment`. Se `canSend` for falso, responde 409, sem escrever no terminal.

## C5. Eventos

```yaml
asyncapi: 3.0.0
info: { title: Eventos internos, version: 0.1.0 }
channels:
  terminalOutput:
    address: /api/terminal/stream
    messages:
      output: { payload: { data: string, seq: integer } }
      ended: { payload: { reason: killed | server_stopped } }
  aidlcChanges:
    address: /api/events
    messages:
      changed: { payload: { intentId: string | null, at: iso8601 } }
```

- **Reconexão:** o navegador reconecta sozinho. O terminal reenvia as últimas linhas, e `seq` evita duplicar na tela. Reconectar nunca repete um envio.
- **Aviso de mudança:** `changed` não traz o estado. A interface pede a decisão de novo, o que mantém uma única fonte.

## C6. Configuração

```yaml
AppConfig:
  port: integer
  host: string
  dbPath: string
  shellPath: string | null
  repoRoot: string
  exposed: boolean
  nodeVersionOk: boolean
```

Variáveis inválidas interrompem o início, com a chave e a forma esperada. U1 implementa a leitura e a raiz do repositório, procurando `aidlc/` a partir da pasta atual e subindo. U5 apenas valida isso a partir da subpasta instalada.

## C7. Preferência Sua IA

`Customization` expõe `readCliKind() -> claude_code | other`, com `claude_code` como padrão. U1 define o campo `preferences.cliKind` de C1 e usa o padrão até U4 existir. O `Core` não conhece `Customization`: `Web` lê o valor e o coloca no retrato.

## C8. AI-DLC, externo

O produto consome o que o AI-DLC grava, e não controla esse formato. O módulo `aidlc` é a única camada que o conhece.

```yaml
Files:
  activeSpace: aidlc/active-space
  activeIntent: aidlc/spaces/<space>/intents/active-intent
  state: <record>/aidlc-state.md
  audit: <record>/audit/*.md
  stageGraph: .claude/tools/data/stage-graph.json
Command:
  run: aidlc engine log answers --stage <slug>
  timeout: 5 segundos
  cwd: raiz do repositório
  shell: nenhum; argumentos em lista
  output: { stage: string, answered: array, open: array, ambiguous: array }
  use: conta os itens de open; o conteúdo é dado não confiável
  onFailure: readOpenQuestions devolve unavailable
Marks:
  '[ ]': pending
  '[-]': in_progress
  '[?]': awaiting_approval
  '[R]': revising
  '[x]': approved
  '[S]': skipped
```

O comando é consultado só quando os arquivos mudam, nunca em um ciclo de tempo. `[R]` é documentado no próprio `aidlc-state.md`, mas seu uso real ainda é confirmado em U2.

## Regras de propriedade

- **Dono:** a Unidade provedora é dona do contrato. Depois de U1, quem precisa acrescentar um campo em C1 a C6 o faz na própria Unidade, mantendo os testes de U1.
- **Mudança aditiva:** é segura, porque consumidores ignoram campos desconhecidos.
- **Mudança incompatível:** é feita no mesmo commit que ajusta todos os consumidores, porque tudo fica no mesmo repositório. As rotas não são versionadas.
- **Mudança no AI-DLC:** fica restrita ao módulo `aidlc`. Os testes usam exemplos reais de `aidlc-state.md` e `audit/`, para detectar a quebra.

## Open questions

| Contract | Question | Blocks |
|---|---|---|
| C2 | O comando exato para tornar uma demanda ativa precisa ser confirmado na execução real | U3 |
| C8 | O uso real da marca `[R]` e do evento `GATE_REJECTED` em um pedido de alterações | U2 |
| C8 | Se o comando `aidlc` está acessível no ambiente do painel, ou se precisa de caminho configurável | U1 |
| C4 | Limite de corpo e formato de envio da mídia, para o limite de 25 MB no Next.js | U4 |
