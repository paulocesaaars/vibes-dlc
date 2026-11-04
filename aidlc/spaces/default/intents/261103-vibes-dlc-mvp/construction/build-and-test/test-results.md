# Resultados de teste: Vibes DLC

Executado em 2026-11-04, no Windows com Git Bash, Node.js 22 e Edge e Chrome atuais. Os comandos rodaram de verdade; os logs completos ficaram em `.vibes/` (fora do Git): `verify-bt.log`, `verify-chrome.log` e `check-bt.log`.

## Build

| Comando | Resultado |
|---|---|
| `npm run build` | Sucesso, código 0. Lista as rotas, entre elas `/api/repo/recheck` e `/api/events` |
| `npm run typecheck` | Sucesso, sem erros |
| `npm run lint` (ESLint e Prettier) | Sucesso, sem erros |
| `npm audit --audit-level=high` | Nenhum achado de severidade alta ou crítica. 16 achados moderados, abaixo do bloqueio da equipe |

## Testes de unidade e integração

Comando: `npm run check` (lint, tipos e `vitest run --coverage`), código 0.

| Total | Passaram | Falharam | Ignorados |
|---|---|---|---|
| 774 testes em 40 arquivos | 774 | 0 | 0 |

Por Unidade, o filtro `tests/uN`: U1, U2, U3, U4 e U5 passam. U3 ganhou `tests/u3/performance.test.ts` nesta etapa (3 testes, abaixo). `tests/u5` tem 78 testes em 8 arquivos.

## Cobertura (suíte completa do projeto)

| Linhas | Instruções | Ramos | Funções |
|---|---|---|---|
| 95,54% | 94,01% | 90,11% | 92,44% |

O mínimo da equipe é 80% de linhas no projeto todo. Fica acima. Os menores arquivos por linhas: `src/web/bootstrap.ts` (74,19%), `src/web/components/demand-hub.tsx` (79,67%) e `src/db/storage.ts` (84,21%). Nenhum limite de cobertura foi alterado.

## Provas no navegador e no terminal reais

Cada prova sobe o painel, abre o Git Bash e o `node-pty` reais e opera em cópia de teste. Rodaram com saída 0 no Edge (`npm run verify`) e no Chrome (`PROOF_BROWSER_CHANNEL=chrome`).

| Prova | Edge | Chrome | Medidas |
|---|---|---|---|
| `proof-u1.ts` | 29 de 29 | 29 de 29 | Eco de 100 teclas: p95 de 24,6 ms (Edge) e 24,4 ms (Chrome); mudança de arquivo na tela em 257 ms |
| `proof-u2.ts` | 56 de 56 | 56 de 56 | Eco lendo o `audit/` de 51.608 linhas: p95 de 68,6 ms (Edge) e 58,9 ms (Chrome); artefato novo em 316 ms; pergunta aberta em 839 ms; comando real de perguntas, mediana de 307 ms e máximo de 314 ms |
| `proof-u3.ts` | saída 0 | saída 0 | Não imprime resumo |
| `proof-u4.ts` | saída 0 | saída 0 | Envio de 25 MiB: p95 de 279 ms em 10 repetições; salvar uma frase: p95 de 183 ms |
| `proof-u5.ts` | 36 de 36 | 36 de 36 | `npm install` de 25 s a 26 s; rede recusada depois da instalação |

## Metas de desempenho de U3 (verificação criada nesta etapa)

`tests/u3/performance.test.ts`, com 20 demandas e um `audit/` de 12.000 entradas (mais de 70 mil linhas).

| Meta | Limite | Medido |
|---|---|---|
| NFR1.1, Início com 20 demandas | 2 s | 76 ms |
| NFR1.2, aba Decisões (500 linhas, as mais recentes) | 2 s | 26 ms |
| NFR1.3, demanda nova avisada, vigia no ritmo normal | 3 s | 220 ms |

## Falhas encontradas e tratadas nesta etapa

1. **Prova de U2 dependente do registro vivo.** Ela copiava o `audit/` real, e os eventos reais de `code-generation`, `build-and-test` e `ci-pipeline` se misturavam com os que a prova encena (a tela mostrava "Etapa concluída!" no lugar de "Compilação e testes"). Correção em `scripts/proof-repo.ts`: a cópia de teste sai sem os eventos dessas etapas. O `audit/` real não é tocado.
2. **Metas de U3 sem conferência.** Não havia asserção nem medição para NFR1.1 a NFR1.3. Criei `tests/u3/performance.test.ts`.
3. **Chrome sem prova.** Só o Edge rodava as provas. `playwright.config.ts` passou a ler `PROOF_BROWSER_CHANNEL`, e todas as provas rodaram também no Chrome.
4. **Eco acima de 150 ms (nesta máquina, em verificações anteriores desta Unidade).** O código anterior a U5 também estourava o limite sob carga (processos em segundo plano e um `next dev` perdido). Com a máquina calma, o eco ficou em 59 a 69 ms. O limite não mudou.

## Ressalvas

- O que a conferência de interface em jsdom mostra é evidência de integração, não de navegador. O comportamento no navegador vem das provas `proof-u1.ts` a `proof-u5.ts`, em Edge e Chrome reais.
- A conferência manual no Chrome por uma pessoa, decidida em U2 para o fim do MVP junto com o teste com uma pessoa nova no AI-DLC, continua pendente. A prova automática no Chrome não a substitui.

## Loop-Back Log

Nenhum loop-back foi necessário.
