# Plano de código: u2-guide-flow

## Summary

- Builds: a condução completa de uma etapa: pergunta registrada, IA parada, Revisar, Aprovar, conclusão, reabrir o painel e trilha, com a Unidade real na Construção.
- Touches: `src/core`, `src/aidlc`, `src/db`, `src/guide`, `src/web`, `src/app`, `migrations/0002_u2.sql`, `tests/u2/`, `scripts/proof-u2.ts` e `package.json`.
- Tests: de 5 a 8 testes por componente alterado, em unidade e integração, um teste real no Windows do comando do `aidlc` e a prova no navegador.

## Referência visual

**A interface segue `design/prototipo/Main.dc.html`, o artefato do Claude Design.** Os cartões de Revisar, Aprovar, conclusão, pergunta, a faixa de IA parada, o aviso do que mudou e a trilha com o `.rail` partem da marcação, das classes, dos textos de `SAY_DEF` e `WHAT` e das artes de `SCENE` do protótipo, com os arquivos de `public/guia/`.

**Diferenças deliberadas em relação ao protótipo, exigidas pelos requisitos:**

- os dados vêm dos arquivos do AI-DLC, no lugar da simulação, e o texto das perguntas não é mostrado;
- o guia nunca tem botão de aprovar. As opções aparecem como instrução, para responder no terminal;
- abas de consulta e demandas ficam para U3, e personalização para U4.

## Camadas

- [x] **Step 1.** Criar `tests/u2/` e registrar o comando de U2 em `unit-test-instructions.md`. O executor e a configuração de U1 continuam valendo, com o mínimo de 80% sem alteração.
- [x] **Step 2.** Banco: implementar `migrations/0002_u2.sql`, com `artifact_review` e `demand_seen_state`, incluindo a coluna `unit`. Implementa: US4.1, US5.1 e NFR12.2.
- [x] **Step 3.** Banco: escrever e rodar os testes, partindo de um banco de U1 com dados, com cópia prévia e migração com falha.
- [x] **Step 4.** Acesso a dados: implementar `artifactReviewRepo` e `demandSeenRepo`. Implementa: BR4.4, BR7.1.
- [x] **Step 5.** Acesso a dados: escrever e rodar os testes.
- [x] **Step 6.** Regras: em `src/aidlc`, implementar a leitura tolerante do `audit/`, `readWorkPosition`, `readOpenQuestionCount`, conforme `nfr-design/security-design.md`, `listArtifacts` e `resolveArtifactPath`. Em `src/core`, implementar a tabela de 15 linhas de `functional-spec.md`, `showIdleNotice`, `canSend` e o cálculo da trilha. Em `src/guide`, implementar `ReviewChecklist` e os textos dos momentos novos. Implementa: US3.5, US3.6, US4.1, US4.2, US4.3, US5.1, US5.2.
- [x] **Step 7.** Regras: escrever e rodar os testes, com cópias reais de `audit/` em `tests/fixtures`, entradas cortadas e malformadas, `..` em caminhos e valores inseguros de etapa e Unidade. Um teste no Windows roda o `aidlc` real, inclusive de uma cópia do `aidlc.cmd` em uma pasta com espaço e acento, e um teste confere que o tempo esgotado encerra a árvore de processos.
- [x] **Step 8.** Rotas: implementar `/api/demands/{intentId}/artifacts`, `/artifacts/review`, `/seen` e `/trail`, com `isRequestAllowed` e Zod, e a reação de `/api/commands` ao novo `canSend`. Implementa: US4.1, US5.1, US5.2 e BR9.1.
- [x] **Step 9.** Rotas: escrever e rodar os testes de integração, inclusive `artifact_changed`, caminho de fora e `Origin` de fora.
- [x] **Step 10.** Interface: implementar as telas seguindo a referência visual acima, com o relógio de 30 segundos e os `data-testid`. Implementa: US3.5, US3.6, US4.1, US4.2, US4.3, US5.1, US5.2.
- [x] **Step 11.** Interface: escrever e rodar os testes de comportamento, inclusive artefato com script mostrado como texto, ausência de botão de aprovar, teclado na trilha e estados que não dependem só de cor.
- [x] **Step 12.** Prova: implementar `scripts/proof-u2.ts`, usando uma cópia de teste de um registro real em uma pasta temporária, escrita pelo script, e percorrer os estados de `functional-spec.md`. Medir o comando real, a atualização e o eco durante a leitura de um `audit/` grande. Conferir que `aidlc/` e o `git status` da cópia não mudam depois do comando. Rodar a prova.
- [x] **Step 13.** Verificação: acrescentar a `package.json` o comando `npm run verify`, que roda `npm run check` e as provas de U1 e U2 em sequência. Rodar `npm run verify`, `npm run build` e `npm audit`.
- [x] **Step 14.** Documentação e rastreabilidade: escrever `code-summary.md`, `source-manifest.json` e `traceability.json` deste registro.

## Mapa de histórias

| História | Passos |
|---|---|
| US3.5 | 6, 7, 10, 11, 12 |
| US3.6 | 6, 7, 10, 11, 12 |
| US4.1 | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| US4.2 | 6, 7, 10, 11, 12 |
| US4.3 | 6, 7, 10, 11, 12 |
| US5.1 | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| US5.2 | 6, 7, 8, 9, 10, 11, 12 |

## Limites

- `core` continua puro. Só `db` toca o banco, e `aidlc` só lê arquivos e roda o comando de leitura, sem referência ao `terminal`.
- Nada de botão de aprovar, de leitura da saída do terminal para decidir, nem de oferecer a etapa seguinte antes de `[x]` com `GATE_APPROVED`.
- Nenhum teste escreve no registro real deste intent.
- Textos em português e identificadores em inglês.

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
