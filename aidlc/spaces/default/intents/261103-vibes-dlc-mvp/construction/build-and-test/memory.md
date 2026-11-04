<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-04T13:20:00Z — A conferência manual no Chrome por uma pessoa (NFR9.1 de U2, Deferred) foi tratada como prática do time, fora da matriz de metas, porque Build and Test não consegue executá-la. Ela fica dita nas limitações e no portão.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-04T13:20:00Z — As metas de desempenho de U3 (NFR1.1 a NFR1.3) não tinham nenhuma conferência; criei tests/u3/performance.test.ts dentro desta etapa em vez de deixá-las Unverified.
- 2026-11-04T13:20:00Z — Só o Edge rodava as provas; playwright.config.ts passou a aceitar PROOF_BROWSER_CHANNEL, e as provas U1 a U5 rodaram também no Chrome.
- 2026-11-04T13:20:00Z — scripts/proof-repo.ts passou a cortar da cópia do audit os eventos de code-generation, build-and-test e ci-pipeline; sem isso a prova de U2 lia eventos reais misturados com os que ela encena.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-04T13:20:00Z — Editei provas (proof-u2, proof-u5, proof-repo) em vez de aceitar falhas: o limite de 150 ms de eco não mudou, e a causa da oscilação foi a carga da máquina, medida contra o código anterior a U5.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-04T13:20:00Z — Quem é dono da conferência manual no Chrome? Nenhuma etapa do plano a assume.
