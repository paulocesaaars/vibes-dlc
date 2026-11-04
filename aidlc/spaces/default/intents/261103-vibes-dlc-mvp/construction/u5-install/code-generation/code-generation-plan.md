# Plano de geração de código: u5-install

## Summary

- Builds: procura da raiz acima da subpasta do produto, armazenamento e terminal sem raiz, Tentar de novo que reavalia sem reiniciar, telas de falha, `README` de instalação e a prova da instalação.
- Touches: `src/config`, `src/terminal`, `src/aidlc`, `src/web` (`runtime`, `bootstrap`, `customization`), `src/app/api/repo/recheck`, `src/app/api/events`, `scripts/run-next.mjs`, `scripts/proof-u5.ts`, `README.md`, `tests/u5`.
- Tests: 5 a 8 casos por componente alterado ou novo, integração de rotas e prova real em repositório temporário com Git Bash.

## Sequência de implementação

- [x] **Step 1 — Estrutura e runner.** Conferir `vitest.config.ts` e os comandos existentes, criar `tests/u5/` e preparar o filtro `tests/u5/`; manter o mínimo global de 80%. Histórias: US1.1, US1.2.
- [x] **Step 2 — Configuração e procura da raiz.** Em `src/config/app-config.ts`: `findRepoRoot(start, productDir)` com `realpathSync.native` e caixa do drive normalizada, ignorando a `productDir` quando ela tem `aidlc/` mas não tem `.git`; `loadConfig` lê `VIBES_PRODUCT_DIR`; sem raiz, `dbPath`, `vibesDir` e `mediaDir` são `null` e `VIBES_DB_PATH` é ignorada com aviso. `scripts/run-next.mjs` grava `VIBES_PRODUCT_DIR` (pasta pai de `scripts/`) antes de iniciar. Histórias: US1.1, US1.2.
- [x] **Step 3 — Testes da configuração.** Cobrir raiz acima da subpasta, `aidlc/` dentro da subpasta sem `.git` ignorado, com `.git` aceito, caixa do drive e junção, sem raiz nenhuma, `VIBES_DB_PATH` sem raiz, e que `loadConfig` e `readDbPath` não criam nada. Histórias: US1.1, US1.2.
- [x] **Step 4 — Início e versão do Node.js.** Em `src/web/bootstrap.ts`, `prepareStart` aceita a versão como argumento, pula `prepareStorage` e `killStaleShell` sem raiz e mantém a mensagem de versão em português no console; `run-next.mjs` passa por `prepareStart` em `dev` e `start`. Histórias: US1.1, US1.2.
- [x] **Step 5 — Testes do início.** Cobrir versões de borda de `isNodeVersionOk` e `nodeVersionMessage`, `prepareStart` com versão antiga sem abrir banco, sem raiz sem criar `.vibes/` e com raiz criando-a só na raiz, e a escuta em `127.0.0.1` com e sem `VIBES_HOST`. Histórias: US1.1, US1.2.
- [x] **Step 6 — Terminal.** Em `src/terminal`, `TerminalManagerOptions` troca `cwd` e `pidFile` por `getCwd` e `getPidFile`, lidos a cada sessão e a cada gravação ou remoção do PID; `pidFile` nulo não grava nem apaga. O PID aberto antes da raiz existir fica sem registro (limite aceito). A sessão guarda o caminho do PID usado na abertura e apaga esse mesmo caminho no fim, o que fecha o resíduo na troca de raiz. Histórias: US1.1, US1.2.
- [x] **Step 7 — Testes do terminal.** Cobrir `getCwd` mudando entre duas sessões, `getPidFile` nulo sem arquivo criado, remoção do PID no caminho da abertura depois da troca de raiz, e o caminho com espaços, acentos e `& ' $ ( )` passado só por `cwd`. Histórias: US1.1, US1.2.
- [x] **Step 8 — Leitor, armazenamento e Personalizar sem raiz.** `AidlcReader` ganha `close()` (para o vigia e encerra as assinaturas). `CustomizationService` aceita `mediaDir: null` e recusa o envio de imagem com 409 e a mensagem em português; textos funcionam em memória. Histórias: US1.2, US7.1.
- [x] **Step 9 — `runtime` e troca.** Em `src/web/runtime.ts`: `createRuntime` aceita raiz nula (banco `:memory:`, sem `.vibes/`, sem varredura); `refreshRuntime()` serializa por promessa, monta o novo antes de trocar, fecha o antigo depois de 5 segundos de folga e registra um só gancho de saída; as funções passadas ao terminal leem o `runtime` atual; o `cwd` do terminal sem raiz é a pasta pai da `productDir`, que é onde o `README` manda copiar a subpasta, e a tela de falha diz isso. Histórias: US1.1, US1.2.
- [x] **Step 10 — Testes do `runtime`.** Cobrir duas chamadas simultâneas gerando um só `runtime` e um só fechamento, falha na montagem mantendo o antigo, troca de `null` para raiz e de volta, banco e vigia antigos encerrados, rota em voo recebendo 503 com mensagem, e envio de imagem sem raiz sem criar nada em `mediaDir` nem no destino de `VIBES_DB_PATH`. Histórias: US1.1, US1.2.
- [x] **Step 11 — Rotas.** Criar `POST /api/repo/recheck` (passa por `isRequestAllowed` antes de ler qualquer coisa, chama `refreshRuntime()` e devolve a saúde do repositório); em `GET /api/events`, a assinatura é encerrada quando o `runtime` troca, para a tela reconectar sozinha ao leitor novo. Histórias: US1.1, US1.2.
- [x] **Step 12 — Testes das rotas.** Cobrir caminho feliz e pelo menos dois erros por rota, `Origin` e `Host` de fora com 403 e nada reavaliado, a rota na lista que percorre todas as rotas, e uma conexão de `/api/events` aberta que recebe eventos do leitor novo depois da troca. Histórias: US1.1, US1.2.
- [x] **Step 13 — Interface.** Tentar de novo chama `POST /api/repo/recheck` e depois relê o guia; as telas de falha (sem AI-DLC, registro ilegível, sem Git Bash) mostram o caminho e o motivo como texto, dizem em que pasta instalar o AI-DLC no terminal, avisam que a sessão aberta ficou na pasta antiga quando a raiz muda, e se alcançam pelo teclado com rótulo e ícone além da cor. `data-testid` nos controles. Histórias: US1.1, US1.2.
- [x] **Step 14 — Testes da interface.** Cobrir `<script>` no nome de uma demanda e no caminho que falhou como texto, navegação só por teclado, Tentar de novo saindo da falha, o aviso da sessão antiga, e que a mensagem não traz variáveis de ambiente nem saída do terminal. Histórias: US1.1, US1.2.
- [x] **Step 15 — `README` e lista de instalação.** Trocar o `README.md` de duas linhas por instruções de instalação em português: pré-requisitos (Node.js 22.13, Git Bash, `node-pty` e ferramentas de compilação se não houver binário), a lista do que copiar para `vibes-dlc/` (constante em `scripts/install-list.ts`, igual à do `README`), `npm install`, `npm run dev` ou `npm run build && npm start`, a linha de `.gitignore` feita à mão, não apagar `.vibes/` ao atualizar, e instalar copiando, não clonando. Teste de que cada item da lista está no `README`. É a única mudança em arquivo existente da pessoa. Histórias: US1.1, US1.2.
- [x] **Step 16 — Prova da instalação.** Criar `scripts/proof-u5.ts`: repositório temporário em pasta com espaços e acentos, com e sem `package.json` próprio; copia a subpasta pela lista, roda `npm install` e inicia no Git Bash real. Confere o painel em `127.0.0.1`, nada alterado fora da subpasta e de `.vibes/` (hashes e `git status`), o terminal abrindo na raiz, a versão do Node.js e a falta do Git Bash, sem `aidlc/` nada criado, criar `aidlc/` pelo terminal real e Tentar de novo sair da falha, apagar `aidlc/` e voltar à falha com o aviso, `aidlc/` dentro da subpasta ignorado, envio de imagem recusado sem raiz, e a rede cortada depois do `npm install`. Falha em qualquer conferência sai com código diferente de zero, inclusive quando o `node-pty` não instala. Incluir a prova em `npm run verify`. Histórias: US1.1, US1.2.
- [x] **Step 17 — Verificação e documentação.** Rodar `tests/u5`, a suíte completa com cobertura, lint, tipos, as provas U1 a U5, build e auditoria de dependências; produzir `code-summary.md`, `traceability.json` e `source-manifest.json`. Registrar lacunas reais, sem reduzir metas. Histórias: todas.

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
