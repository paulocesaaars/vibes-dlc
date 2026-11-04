# Instruções de teste de integração: Vibes DLC

Estratégia Standard: testes de integração nas fronteiras entre as Unidades e entre o produto e o que ele toca (disco, banco, rotas e terminal real).

## Fronteiras cobertas

| Fronteira | Unidades | Onde |
|---|---|---|
| Rotas HTTP com `Origin` e `Host`, banco SQLite real e leitor do AI-DLC | U1 a U5 | `tests/u1/routes.test.ts`, `tests/u2/routes.test.ts`, `tests/u3/routes.test.ts`, `tests/u4/routes.test.ts`, `tests/u5/routes.test.ts` |
| Leitor do AI-DLC sobre arquivos reais (`aidlc-state.md`, `audit/`) | U1 a U3, U5 | `tests/u1/aidlc.test.ts`, `tests/u2/aidlc-*.test.ts`, `tests/u3/browser.test.ts`, `tests/u5/reader.test.ts` |
| Banco e migrações a partir de bancos antigos | U1 a U4 | `tests/u1/db-migrations.test.ts`, `tests/u1/db-repos.test.ts`, `tests/u2/db-migration.test.ts`, `tests/u3/db.test.ts`, `tests/u4/db.test.ts` |
| Troca do `runtime` (raiz que aparece e some) e fluxo SSE | U5 | `tests/u5/runtime.test.ts`, `tests/u5/routes.test.ts` |
| Terminal real com `node-pty` e Git Bash, painel real e arquivos reais | U1 a U5 | `scripts/proof-u1.ts` a `scripts/proof-u5.ts` |
| Metas de desempenho de U3 com 20 demandas e `audit/` de 12.000 entradas | U3 | `tests/u3/performance.test.ts` |

## Como rodar

```bash
npx vitest run tests/u1 tests/u2 tests/u3 tests/u4 tests/u5   # integração e unidade, sem navegador
npx tsx scripts/proof-u1.ts                                    # e as demais, u2 a u5, uma por vez
PROOF_BROWSER_CHANNEL=chrome npx tsx scripts/proof-u2.ts       # a mesma prova no Chrome
```

As provas precisam de Git Bash, `node-pty` e um navegador (Edge por padrão). A prova de U5 também usa a rede, só durante o `npm install` do repositório de teste e para baixar um Node.js 20 que prova a mensagem de versão.

## Cobertura esperada

O mínimo de 80% de linhas vale para o projeto inteiro e é medido por `npm run test:coverage`, não por um teste isolado. Cada módulo cobre o caminho feliz e pelo menos dois casos de erro ou de borda.

## Dados e ambiente de teste

- Testes de unidade e de rota usam pastas temporárias e bancos próprios por teste.
- As provas montam uma cópia de teste do registro real em `.vibes/proof-*`. A cópia do `audit/` sai sem os eventos das etapas que as provas encenam (`code-generation`, `build-and-test`, `ci-pipeline`), para o registro real, que cresce com a construção, não misturar eventos reais com os da encenação.
- Nenhuma prova escreve no registro real do AI-DLC nem em arquivo versionado fora de `.vibes/`.
