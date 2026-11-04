# Plano de geração de código: u3-demands

## Summary

- Builds: Início com várias demandas, criação guiada, consulta e ativação, notas e quatro abas.
- Touches: `src/aidlc`, `src/triage`, `src/db`, `src/web`, `src/app`, `migrations/0003_u3.sql`, `tests` e `scripts/proof-u3.ts`.
- Tests: 5 a 8 casos por componente novo, integração de rotas e prova real no navegador e Git Bash.

## Sequência de implementação

- [x] **Step 1 — Estrutura e runner.** Conferir `vitest.config.ts`, os comandos existentes e preparar testes de U3 com filtro `tests/u3/`; manter o mínimo global de 80%. Histórias: US2.1–US2.3, US6.1–US6.3.
- [x] **Step 2 — Modelo e migração.** Criar `0003_u3.sql`: `artifact_note` e `sent_command.kind` com padrão `stage`; preservar dados existentes e migração incremental. Histórias: US6.2, US6.3.
- [x] **Step 3 — Testes do modelo.** Testar migração, padrão `stage`, notas e casos inválidos após a implementação. Histórias: US6.2, US6.3.
- [x] **Step 4 — Acesso a dados.** Implementar repositório de notas e consultas de histórico com `kind`; `lastWritten` filtra `stage`. Histórias: US2.2, US6.2, US6.3.
- [x] **Step 5 — Testes de acesso a dados.** Cobrir persistência, filtro, ordenação e erros com banco temporário. Histórias: US2.2, US6.2, US6.3.
- [x] **Step 6 — Leitura e regras.** Ampliar leitor para listar demandas com `realpath` e concorrência máxima de 5, tolerar `intents.json` ausente ou inválido, ler Unidades e decisões com limite de 500, cache só da demanda aberta; implementar sugestão local de nível e montagem segura de comandos. Não executar o comando de perguntas para demandas não ativas. Histórias: US2.1–US2.3, US6.1, US6.3.
- [x] **Step 7 — Testes de regras.** Cobrir tabela de 10 sugestões, precedência, registros ilegíveis, junção de diretório, mudança de ativa, eventos de aprovação/rejeição de Unidade, limites de memória e comandos. Histórias: US2.1–US2.3, US6.1, US6.3.
- [x] **Step 8 — Rotas.** Acrescentar listagem, comando de nova demanda/análise, ativação, notas, Unidades, decisões e histórico; compartilhar validação de linha única, até 8000 caracteres e sem controles entre todas as rotas de comando. Validar origem, sessão, CLI, `commandId` e estado atual antes da escrita. Histórias: US2.1–US2.3, US6.2, US6.3.
- [x] **Step 9 — Testes de rotas.** Cobrir caminho feliz e pelo menos dois erros/bordas por rota, inclusive `Origin`/`Host`, Ctrl-O, sessão morta, `stale_screen`, `not_active` e ausência de escrita no cursor. Histórias: US2.2, US2.3, US6.2.
- [x] **Step 10 — Interface.** Implementar Início, fluxo de três passos, cartão de confirmação, espera, faixa de consulta e abas. Preservar o guia de U1/U2 e usar `data-testid` nos controles. Renderizar conteúdo de arquivos só como texto. Histórias: US2.1–US2.3, US6.1–US6.3.
- [x] **Step 11 — Testes da interface.** Testar estados vazio/ilegível, cancelamento, troca de nível, confirmação, consulta, ativação, abas e recarga; usar 5 a 8 casos por componente. Histórias: US2.1–US2.3, US6.1–US6.3.
- [x] **Step 12 — Prova e configuração.** Criar `scripts/proof-u3.ts` com navegador e Git Bash reais em cópia de teste: lista, sugestão, envio, espera, ativação, troca de cursor, nota e quatro abas; conferir cursor, `git status` e datas de `aidlc/`. Ajustar `npm run verify` para incluir a prova. Histórias: US2.1–US2.3, US6.1–US6.3.
- [x] **Step 13 — Verificação e documentação.** Rodar teste de U3, suíte completa com cobertura, lint, tipos, prova U1/U2/U3, build e auditoria de dependências; produzir `code-summary.md`, `traceability.json` e `source-manifest.json`. Registrar lacunas reais, sem reduzir metas. Histórias: todas.

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
