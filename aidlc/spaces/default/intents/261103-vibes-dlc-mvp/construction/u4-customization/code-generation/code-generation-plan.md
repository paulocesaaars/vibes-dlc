# Plano de geração de código: u4-customization

## Summary

- Builds: tela Personalizar com imagens, vídeos, frases, cores e Sua IA, com visita, Cancelar e Restaurar tudo.
- Touches: `src/customization`, `src/db`, `src/guide`, `src/config`, `src/web`, `src/app/api/customization`, `migrations/0004_u4.sql`, `tests/u4` e `scripts/proof-u4.ts`.
- Tests: 5 a 8 casos por componente novo, integração de rotas e prova real no navegador e Git Bash.

## Sequência de implementação

- [x] **Step 1 — Estrutura e runner.** Conferir `vitest.config.ts` e os comandos existentes, criar `src/customization/` e `tests/u4/`, e preparar o filtro `tests/u4/`; manter o mínimo global de 80%. Histórias: US3.7, US7.1, US7.2.
- [x] **Step 2 — Modelo e migração.** Criar `0004_u4.sql` com `customization_item` (`item_key` único, `kind` entre `color`, `say`, `media` e `cli`, `value`, `updated_at`), sem tocar as tabelas de U1 a U3. Histórias: US7.1, US7.2, US3.7.
- [x] **Step 3 — Testes do modelo.** Testar a migração a partir de um banco de U3 com dados, a chave única e os valores de `kind` inválidos, depois da implementação. Histórias: US7.1, US7.2, US3.7.
- [x] **Step 4 — Acesso a dados e configuração.** Criar o repositório de texto puro `customization-item-repo` em `src/db` (`all`, `upsert`, `remove` e `replaceAll`, esta em uma transação), sem importar de `src/customization`. Acrescentar `mediaDir = vibesDir/media` ao `AppConfig`. Histórias: US7.1, US7.2, US3.7.
- [x] **Step 5 — Testes de acesso a dados.** Cobrir persistência, substituição em transação com falha injetada, o conjunto completo de 53 linhas e o teste de arquitetura de que `src/db/` não importa de `src/customization/`. Histórias: US7.1, US7.2, US3.7.
- [x] **Step 6 — Regras de Customization.** Implementar `detectMediaType` (assinaturas com deslocamentos fixos), validação e normalização de cores, cores derivadas e avisos de contraste, troca de marcações, frases com limites, a visita em memória, a fila única de gravação, gravação de mídia atômica, Cancelar e Concluir, a varredura de arquivos sem uso e `readCliKind`. Acrescentar `CUSTOMIZABLE_MOMENTS` em `src/guide` (com `tokens` e `textEditable`). Histórias: US7.1, US7.2, US3.7.
- [x] **Step 7 — Testes de regras.** Cobrir os tipos de mídia, SVG disfarçado, PNG com XMP, arquivo truncado, RIFF/WAV e `ftyp` não aceito; as cores em maiúsculas e inválidas; os contrastes; as marcações; a visita, a fila, Cancelar com falha, mídia em voo cruzando Concluir e Cancelar, dois envios para o mesmo momento, a varredura abortada e `readCliKind`. Histórias: US7.1, US7.2, US3.7.
- [x] **Step 8 — Rotas.** Criar `GET` e `PUT /api/customization`, `POST /visit`, `/visit/done`, `/visit/cancel`, `POST /media` (semáforo de upload, leitura em partes com contagem, multipart por `Response.formData()`) e `GET /media/{mediaId}` (cabeçalhos fixos e `Range`). Validar origem e Zod estrito, `momentKey` e `textEditable`. Remover `VIBES_CLI_KIND` e ler a escolha salva no `runtime` e no retrato. Histórias: US7.1, US7.2, US3.7.
- [x] **Step 9 — Testes de rotas.** Cobrir caminho feliz e pelo menos dois erros por rota, inclusive `Origin` de fora, chave desconhecida, `stale_visit`, 413 com `Content-Length` ausente e menor que o corpo, 415, 429 `busy`, `Range` (206, sufixo, 416, várias faixas), cabeçalhos da mídia, mídia apagada à mão e a medição de memória. Histórias: US7.1, US7.2, US3.7.
- [x] **Step 10 — Interface.** Implementar a tela Personalizar (mídia por momento, frases, cores com avisos, Sua IA, Concluir, Cancelar e Restaurar tudo com confirmação), a aplicação das cores por variáveis CSS (inclusive `--onAccent`), a composição de `MomentContent` com frases e mídia, o fallback para a arte original em caso de 404 e `data-testid` nos controles. Histórias: US7.1, US7.2, US3.7.
- [x] **Step 11 — Testes da interface.** Testar estados vazio, erro e aviso de contraste, frases com HTML como texto, vídeo parado com redução de movimento, Outra CLI sem botão de envio nem "Abrir a sua IA", Cancelar e recarga; usar 5 a 8 casos por componente. Histórias: US7.1, US7.2, US3.7.
- [x] **Step 12 — Prova e configuração.** Criar `scripts/proof-u4.ts` com navegador e Git Bash reais em cópia de teste: trocar a arte por PNG e vê-la; recusar SVG, arquivo disfarçado e arquivo acima de 25 MiB; voltar ao original; Cancelar desfazendo uma visita completa; aviso de contraste; logo com nova cor e favicon igual; Outra CLI sem botão de envio; ausência de chamadas de rede; e `git status` limpo fora de `.vibes/`. Ajustar `npm run verify` para incluir a prova. Histórias: US7.1, US7.2, US3.7.
- [x] **Step 13 — Verificação e documentação.** Rodar o teste de U4, a suíte completa com cobertura, lint, tipos, as provas U1 a U4, build e auditoria de dependências; produzir `code-summary.md`, `traceability.json` e `source-manifest.json`. Registrar lacunas reais, sem reduzir metas, e confirmar o limite de corpo do Next.js. Histórias: todas.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "Implementamos cada camada testável e, em seguida, escrevemos e rodamos os testes dessa camada, antes de passar para a próxima.",
  "scope": "mvp",
  "test_strategy": "standard",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Methodology evidence**: Escolha de quem desenvolve na entrevista desta etapa (Q6), entre `test-after`, `custom` e `tdd`.\n- **Ordering**: Implementamos cada camada testável e, em seguida, escrevemos e rodamos os testes dessa camada, antes de passar para a próxima.\n- **Volume**: a `Test Strategy` deste fluxo é Standard.\n- **Cobertura**: mínimo de 80% de cobertura de linhas, medido no projeto todo. Esse mínimo não é reduzido para fazer uma etapa passar.\n- **Casos**: cada módulo cobre o caminho feliz e pelo menos dois casos de erro ou de borda.\n- **Antes de cada commit**: um único comando local roda lint, checagem de tipos e testes com cobertura.\n- **Exceção temporária à verificação automática antes do merge**: até a etapa `ci-pipeline` criar a verificação automática, o comando local é a proteção de `main`. Quem desenvolve aceitou essa exceção (Q7), e ela termina quando a verificação existir. O mínimo de 80% continua valendo durante a exceção.\n- **Verificação automática**: a etapa `ci-pipeline` cria a verificação no fim da Construção, com GitHub Actions em runner Windows, a plataforma que o MVP verifica. Ela roda o mesmo comando local. Os detalhes são confirmados nessa etapa.\n- **Ferramentas**: Vitest para unidade e integração, e Playwright para o caminho completo no navegador, sem baixar navegadores no `npm install` do usuário.\n- **Testes obrigatórios por risco**: escuta em `127.0.0.1`, rejeição de `Origin` e `Host` de fora, recusa de SVG, nenhum envio ao terminal sem confirmação, nenhuma chamada de rede do produto e leitura do AI-DLC com exemplos reais de `aidlc-state.md` e `audit/`.\n- **Terminal**: o caminho real com `node-pty` e Git Bash é testado no Windows, sem substituir o pseudo-terminal por simulação nos testes de ponta a ponta.\n- **Dependências**: o `package-lock.json` é versionado, e a verificação automática bloqueia achados de severidade alta ou crítica em `npm audit`.\n- **Antes de declarar o MVP pronto**: uma pessoa que nunca usou o AI-DLC testa o guia."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Meet an 80% line-coverage floor.",
      "Run the selected tests in CI before merge."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:af44ea4eba9cf297bb7686a3acb338076cba014c642c827975104d48bab21477",
  "contract_sha256": "sha256:300ccfd05dba988a00e8f50d6b7875032511794f4c84777d58ab23595af717e5"
}
```
