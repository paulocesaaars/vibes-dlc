# Resumo do código: u5-install

## Arquivos criados e alterados

**Criados:** `src/app/api/repo/recheck/route.ts`, `src/web/runtime-guard.ts`, `scripts/install-list.ts`, `scripts/proof-u5.ts` e `tests/u5/` (`config`, `start`, `terminal`, `runtime`, `routes`, `reader`, `web-ui`, `readme` e `no-stray-aidlc.ts`).

**Alterados:** `src/config/app-config.ts`, `src/terminal/terminal-manager.ts`, `src/aidlc/reader.ts`, `src/customization/customization-service.ts`, `src/db/database.ts`, `src/db/storage.ts`, `src/web/bootstrap.ts`, `src/web/runtime.ts`, `src/web/client/api.ts`, `src/web/client/use-guide.ts`, `src/web/components/guide-app.tsx`, `src/guide/moment-content.ts`, `src/app/api/events/route.ts`, `src/app/api/customization/media/route.ts`, `src/app/api/demands/route.ts`, `src/app/api/demands/[intentId]/guide/route.ts`, `scripts/run-next.mjs`, `package.json` (a prova de U5 entrou em `verify`), `README.md` (única edição em arquivo existente da pessoa, prevista no plano) e testes de U1 e U4 ajustados às novas assinaturas.

## Decisões de implementação

- A raiz do repositório é a pasta mais próxima com `aidlc/`, acima de `productDir` (gravada em `VIBES_PRODUCT_DIR` por `scripts/run-next.mjs`). Os caminhos são comparados depois de `realpath` e da caixa do drive.
- Sem raiz, `dbPath`, `vibesDir` e `mediaDir` são `null`, o banco é `:memory:`, `VIBES_DB_PATH` é ignorada e nada é criado em disco.
- O terminal lê `getCwd` e `getPidFile` na hora. Sem raiz, abre na pasta pai da subpasta do produto.
- `refreshRuntime()` é serializado, monta o novo antes de trocar e fecha o antigo depois da folga. `GET /api/events` encerra a assinatura na troca, e a tela reconecta sozinha.
- `POST /api/repo/recheck` passa por `isRequestAllowed` antes de qualquer leitura.

## Cobertura de testes

63 testes novos em `tests/u5` (7 arquivos de teste mais um auxiliar). Suíte completa: 39 arquivos e 771 testes, 95,44% de linhas no projeto (mínimo de 80%). Lint, tipos, Prettier e build limpos. `npm audit`: nenhum achado alto ou crítico. `scripts/proof-u5.ts`: 36 de 36 conferências, com Git Bash, `node-pty` e Edge reais, e Node.js 20.18.0 real para a mensagem de versão.

## Testes escritos e não executados nesta etapa

Nenhum. A verificação automática em CI ainda não existe (`ci-pipeline` vem depois), então nada ficou "para o CI".

## Desvios do plano e lacunas

1. **Terminal sem demanda:** `use-guide` ganhou `looseSession`, para o terminal das telas de falha receber a sessão.
2. **Aviso de sessão antiga:** `recheck` devolve `staleSessionFolder`, e `TerminalManager` ganhou `aliveSessionCwd()`. O aviso oferece "Encerrar e abrir nova sessão".
3. **503 na troca:** `DatabaseClosedError` e `guardRuntimeChange` cobrem `/api/customization/media`, `/api/demands` e `/api/demands/[intentId]/guide`. As demais rotas não têm esse tratamento.
4. **`VIBES_DB_PATH` absoluto fora de `.vibes/`** vira erro 500 no recheck quando a raiz aparece. É o comportamento esperado; a prova usa `.vibes/custom/x.db`.
5. **Pasta de trabalho da prova:** há um `aidlc/` perdido em `C:\Users\paulo\AppData\Local\aidlc`, que a busca tomaria por raiz. A prova usa `C:\vibes-proof-<id>`, e os testes o escondem via `tests/u5/no-stray-aidlc.ts`.
6. **Lista de cópia:** só `scripts/run-next.mjs` e `scripts/no-network.cjs` entram, porque o `package.json` os usa.
7. **Lacuna aberta, `scripts/proof-u2.ts`:** falha em 1 de 33 conferências (o passo "pessoa foi em frente pelo terminal" mostra "A sua IA tem uma pergunta" em vez de "Requisitos não funcionais"), e a falha se repete. A prova copia o `audit/` real, que já tem eventos de `nfr-requirements` de U5, então é provável que dependa do estado do registro vivo. Não foi confirmado que não é regressão de U5. As provas U1, U3 e U4 saíram com 0. Build and Test deve rodar a prova U2 no estado anterior ao de U5 para decidir.
