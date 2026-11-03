# Plano de código: u1-walking-skeleton

## Summary

- Builds: a fatia de ponta a ponta com a interface do protótipo, o terminal real no Git Bash, a leitura da etapa nos arquivos do AI-DLC e o envio confirmado.
- Touches: `package.json`, `src/`, `migrations/`, `tests/`, `scripts/` e configurações na raiz, além de `.vibes/`, `node_modules/` e `.next/` no `.gitignore`.
- Tests: cerca de 35 a 45 testes de unidade e integração com Vitest, mais a prova no navegador com Playwright e o Git Bash real.

## Referência visual

**A interface segue `design/prototipo/Main.dc.html`, o artefato do Claude Design.** Todo componente visual de U1 parte dele:

- os tokens de cor, tipografia, bordas e cantos do CSS do `.app` são copiados para `src/app/globals.css`;
- as classes e a estrutura de `.app`, `.top`, `.brand`, `.tag`, `.left`, `.main`, `.card`, `.cta`, `.btn2`, `.band`, `.term-*` e `.term-strip` são mantidas;
- a barra do terminal, com o caminho, Encerrar sessão, Nova sessão e o botão de recolher, segue o protótipo;
- os textos dos momentos vêm de `SAY_DEF` e `WHAT`, e as artes vêm de `SCENE`, com os arquivos de `public/guia/`;
- a trilha mínima de U1 usa a aparência da trilha do protótipo, e os cinco passos usam `SEG_LABELS`.

**Diferenças deliberadas em relação ao protótipo, todas exigidas pelos requisitos:**

- o terminal é o `@xterm/xterm` real, no lugar da simulação, com o tema de `TDD.md`;
- as fontes vêm de `@fontsource`, porque o produto não faz chamadas de rede;
- o protótipo usa `$ claude` e nomes de ferramenta no terminal simulado, e o guia diz "a sua IA";
- telas de outras Unidades ficam de fora: trilha completa, abas e revisão (U2), demandas (U3), personalização (U4) e telas completas de falha (U5).

## Conferências iniciais

Se uma conferência falhar, aplica-se o que `nfr-requirements/tech-stack-decisions.md` define.

- [x] **Step 1.** Criar `package.json` e `tsconfig.json`, instalar as dependências e conferir no Windows: `node-pty` abre o Git Bash, `node:sqlite` grava dentro do servidor do Next, e o registro em `globalThis` é o mesmo entre rotas, em `dev` e em `start`. Acrescentar `.vibes/`, `node_modules/` e `.next/` ao `.gitignore`, que é a única mudança em um arquivo que já existia. Implementa: base de US1.1.

## Estrutura e testes

- [x] **Step 2.** Estrutura de pastas e configurações de produção: `next.config.ts`, com `node-pty` em `serverExternalPackages`, Prettier, ESLint e `src/config`, `src/core`, `src/terminal`, `src/aidlc`, `src/guide`, `src/db` e `src/web`. Implementa: US1.3.
- [x] **Step 3.** Configurar Vitest com cobertura de linhas de 80% no projeto todo e Playwright com o canal `msedge`, sem baixar navegadores. Registrar o comando de U1 em `unit-test-instructions.md`, e o comando único `npm run check`, que roda lint, tipos e testes com cobertura.

## Camadas

- [x] **Step 4.** Banco: implementar `migrations/0001_u1.sql`, com `guide_progress` e `sent_command`, e o executor de migrações, com a cópia do banco antes de migrar. Implementa: BR6.1, NFR12.1, NFR12.2.
- [x] **Step 5.** Banco: escrever e rodar os testes, inclusive migração com falha, `.vibes/` ausente e cópia prévia.
- [x] **Step 6.** Acesso a dados: implementar `guideProgressRepo` e `sentCommandRepo`, com `pending`, `written`, `failed`, `commandId` repetido e a passagem de `pending` a `failed` no início. Implementa: BR5.2, BR5.3, NFR12.3.
- [x] **Step 7.** Acesso a dados: escrever e rodar os testes.
- [x] **Step 8.** Regras: implementar `src/config`, com a versão do Node.js, as variáveis, a raiz, a busca do shell e o `logger`. Implementar `src/core`, com `decideMoment` e `deriveCommandSent`. Implementar `src/aidlc`, com a leitura de cursores, `aidlc-state.md` e grafo, marcas desconhecidas e observador. Implementar `src/terminal`, com `TerminalManager` em `globalThis`, janela de blocos, ouvintes, `seq`, `afterSeq` e PID do shell. Implementar `src/guide`, com `StageContent` e os textos de cada momento. Implementa: US3.1, US3.2, US3.3 e BR1, BR3, BR4.
- [x] **Step 9.** Regras: escrever e rodar os testes. `src/aidlc` usa exemplos reais de `aidlc-state.md` deste intent, copiados para `tests/fixtures`, e `src/terminal` usa o `node-pty` e o Git Bash reais.
- [x] **Step 10.** Rotas: implementar `isRequestAllowed` e os esquemas Zod, além de `/api/terminal/{session,stream,input,resize}`, `/api/commands`, `/api/demands`, `/api/demands/{intentId}/guide`, `/api/demands/{intentId}/understood` e `/api/events`. Implementa: US1.3, US3.4 e BR2, BR5.
- [x] **Step 11.** Rotas: escrever e rodar os testes de integração. Inclui rejeição de `Origin` e `Host` em todas as rotas, cada motivo de bloqueio, `stale_screen`, envio duplicado e entrada malformada.
- [x] **Step 12.** Interface: implementar as telas seguindo a referência visual acima: cabeçalho, alerta de exposição, trilha mínima, cartão de Entender, cartão de Enviar, com campo, lembrete, Enviar agora e Colar sem executar, Acompanhar, colado, falha simples, sessão encerrada e terminal com `xterm`, F6, recolher e expandir. Colocar `data-testid` nos elementos interativos. Implementa: US3.1, US3.2, US3.3, US3.4.
- [x] **Step 13.** Interface: escrever e rodar os testes de comportamento, inclusive texto com etiqueta de script mostrado como texto, teclado e alerta permanente.
- [x] **Step 14.** Prova da fatia: implementar `scripts/proof-u1.ts` com os 10 passos de `functional-spec.md`, com o painel, o Edge e o Git Bash reais, publicando as medidas de eco e atualização. Rodar a prova. Implementa: DoD de B1.
- [x] **Step 15.** Configuração de build: conferir `npm run dev` e `npm run build && npm start`. Rodar `npm run check` e `npm audit`.
- [x] **Step 16.** Documentação e rastreabilidade: escrever `code-summary.md`, `source-manifest.json` e `traceability.json` deste registro. O `README.md` fica como está, porque a instalação é assunto de U5.

## Mapa de histórias

| História | Passos |
|---|---|
| US1.1 (base) | 1, 4, 5, 8, 9 |
| US1.3 | 2, 8, 9, 10, 11, 14 |
| US3.1 | 8, 9, 12, 13, 14 |
| US3.2 | 8, 9, 10, 11, 12, 13, 14 |
| US3.3 | 8, 9, 10, 11, 12, 13, 14 |
| US3.4 | 6, 7, 10, 11, 12, 13, 14 |

## Limites

- `core` não conhece Next.js, SQLite nem o terminal. Só `db` toca o banco. `aidlc` só lê, e não recebe referência ao `terminal`.
- Nada de botão de aprovar, leitura da saída do terminal para decidir, chamada de rede, nem queda para PowerShell ou `cmd`.
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
