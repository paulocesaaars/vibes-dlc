# Resumo de Build and Test: Vibes DLC

## Estado do build e pré-requisitos

Build de produção, tipos, lint e auditoria de dependências passam. Pré-requisitos: Windows com Git Bash, Node.js 22.13 ou superior, e Chrome ou Edge para as provas. Detalhes em `build-instructions.md`.

## Inventário dos tipos de teste

| Tipo | Onde | Resultado |
|---|---|---|
| Unidade | `tests/u1` a `tests/u5` | 774 de 774 passam |
| Integração (rotas, banco, leitor, troca do `runtime`) | os mesmos arquivos e `integration-test-instructions.md` | Passam |
| Desempenho de U3 | `tests/u3/performance.test.ts` | Passa, criado nesta etapa |
| Prova no navegador e no terminal reais | `scripts/proof-u1.ts` a `scripts/proof-u5.ts` | Passam no Edge e no Chrome |
| Segurança | testes de rota (`Origin` e `Host`), SVG, rede bloqueada, escrita fora de `.vibes/` | Passam; `security-test-instructions.md` não é gerado em Standard |
| Desempenho de carga e SAST/DAST | Não se aplica à estratégia Standard | Não gerados |

## Expectativas de cobertura

Mínimo de 80% de linhas no projeto todo. Medido: 95,54% de linhas, 94,01% de instruções, 90,11% de ramos e 92,44% de funções. Nenhum limite foi alterado.

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| BT-01 | Testing Contract; NFR11.1 de U1 a U5 | Cobertura de linhas de 80% ou mais no projeto todo | 95,54% de linhas | `npm run check` (`vitest run --coverage`), código 0; `.vibes/check-bt.log` | build-and-test | Met |
| BT-02 | NFR11.1 de U1 a U5 | Cada módulo cobre o caminho feliz e ao menos dois casos de erro ou de borda | 774 testes em 40 arquivos; cada Unidade tem testes dos módulos novos | Suíte `tests/u1` a `tests/u5` e revisões READY de cada Unidade. Verificado por revisão, sem ferramenta que meça isso | build-and-test | Met |
| BT-03 | NFR2.1 de U1 | Eco de uma tecla em até 150 ms em 95% das teclas | p95 de 24,6 ms (Edge) e 24,4 ms (Chrome) | `proof-u1.ts`, 100 teclas | build-and-test | Met |
| BT-04 | NFR1.2 de U2 | Eco em até 150 ms em 95% das teclas durante a leitura do `audit/` | p95 de 68,6 ms (Edge) e 58,9 ms (Chrome), 51.608 linhas | `proof-u2.ts`, 60 amostras | build-and-test | Met |
| BT-05 | NFR2.2 de U1 | Saída do terminal limitada a 5 MB ou 2000 quebras de linha | Limites aplicados | `tests/u1/terminal.test.ts` (2000 quebras e `MAX_BYTES`) | build-and-test | Met |
| BT-06 | NFR1.1 de U1; NFR1.1 de U2 | Mudança em `aidlc/`, artefato novo ou pergunta aberta aparecem em até 3 s | 257 ms (arquivo), 316 ms (artefato), 839 ms (pergunta) | `proof-u1.ts` e `proof-u2.ts` | build-and-test | Met |
| BT-07 | NFR1.3 de U2 | `aidlc engine log answers` em até 1,5 s | Mediana de 307 ms, máximo de 314 ms | `proof-u2.ts`, 5 execuções | build-and-test | Met |
| BT-08 | NFR1.1 de U3 | Início com 20 demandas e `audit/` grande em até 2 s | 76 ms | `tests/u3/performance.test.ts` | build-and-test | Met |
| BT-09 | NFR1.2 de U3 | Aba Decisões, 500 linhas mais recentes, em até 2 s | 26 ms, 500 linhas | `tests/u3/performance.test.ts` | build-and-test | Met |
| BT-10 | NFR1.3 de U3 | Demanda nova ou mudança de cursor na tela em até 3 s | 220 ms | `tests/u3/performance.test.ts`, vigia no ritmo normal | build-and-test | Met |
| BT-11 | NFR1.1 de U4 | Ler a personalização em até 300 ms | Abaixo de 300 ms (p95) | `tests/u4/routes.test.ts` | build-and-test | Met |
| BT-12 | NFR1.2 de U4 | Salvar e a prévia refletir em até 500 ms | p95 de 183 ms | `proof-u4.ts`, 10 repetições | build-and-test | Met |
| BT-13 | NFR1.3 de U4 | Enviar 25 MB e ver na prévia em até 5 s | p95 de 279 ms | `proof-u4.ts`, 10 repetições | build-and-test | Met |
| BT-14 | NFR1.4 de U4 | Mídia começa a responder em até 200 ms e aceita `Range` | Abaixo de 200 ms; `Range` com 206, sufixo e 416 | `tests/u4/routes.test.ts` | build-and-test | Met |
| BT-15 | NFR12.1 de U4 | Até 16 arquivos de 25 MB, sem limite além do de cada arquivo | O código só limita cada arquivo (`MAX_MEDIA_BYTES`); 3 mídias de 25 MiB gravadas na prova | Inspeção de `src/customization/customization-service.ts` e `proof-u4.ts`. Os 16 arquivos não foram gravados | build-and-test | Met |
| BT-16 | NFR4.7 de U1; NFR5.4 de U2; NFR5.5 de U4 | Limites de entrada: 64 KB no terminal, 2 MB por artefato, 25 MB por mídia | Limites aplicados, com recusa acima | `tests/u1/routes.test.ts`, `tests/u2/routes.test.ts` e `proof-u4.ts` (413 acima de 25 MiB) | build-and-test | Met |
| BT-17 | NFR9 de `requirements.md`; NFR9.1 de U2 | MVP verificado no Windows com Git Bash, Node.js 22.13 ou superior, Chrome e Edge | Provas U1 a U5 com saída 0 nos dois navegadores; Node.js 20 real para a mensagem de versão | `.vibes/verify-bt.log` (Edge) e `.vibes/verify-chrome.log` (Chrome) | build-and-test | Met |
| BT-18 | Equipe (`team.md`) | Nenhum achado de severidade alta ou crítica no `npm audit` | 0 altos ou críticos, 16 moderados | `npm audit --audit-level=high` | build-and-test | Met |
| BT-19 | NFR3.1, NFR6.1, NFR7.x, NFR13.1 de U1 a U5 | Escuta só em `127.0.0.1`, nenhuma chamada de rede do produto, escrita só em `.vibes/` | Cumprido | Provas U1 a U5 ("O servidor não saiu da máquina", "Produto não escreve fora de .vibes/", "A rede é recusada...") | build-and-test | Met |
| BT-20 | Testing Contract (CI antes do merge) | Rodar os testes selecionados na CI antes do merge | Ainda sem CI | A etapa `ci-pipeline` vem depois neste plano e cria a verificação | ci-pipeline | N/A (CI Pipeline, mais adiante neste plano, configura a CI para rodar estes testes antes do merge) |

## Avaliação de prontidão

- **Pronto para build:** sim.
- **Pronto para teste:** sim. Os 774 testes e as provas de U1 a U5 passam.
- **Pronto para implantação:** não se aplica. O MVP não tem ambiente de implantação (`team.md`).

## Limitações e pendências

- **Conferência manual no Chrome por uma pessoa: fora desta matriz.** Foi decidida em U2 para o fim do MVP, junto com o teste com uma pessoa nova no AI-DLC (`team.md`, "Antes de declarar o MVP pronto"). Não é uma meta que Build and Test consiga executar, e nenhuma etapa deste plano é dona dela. As provas automáticas no Chrome (BT-17) não a substituem. Fica registrada aqui e é dita no portão.
- **Cobertura por revisão (BT-02).** "Cada módulo com o caminho feliz e dois casos de erro" não tem ferramenta que meça; vem das revisões das Unidades.
- **`cross-unit-traceability.md` aponta `NFR9` como não coberto** porque `u2-guide-flow: NFR9.1` consta como `Deferred` no registro de U2. O registro de U2 não foi alterado. A evidência automática atual está em BT-17, e a conferência manual está descrita acima.
- **Provas que copiam o registro real** quebraram três vezes enquanto a construção avançava. Foram isoladas em `scripts/proof-repo.ts`, mas qualquer prova nova que leia o registro real herda o risco.
- **Aviso `MaxListenersExceededWarning`** (11 ouvintes de `exit`) nas provas e nos testes. Sem efeito no resultado.
- **Eco do terminal é sensível à carga da máquina.** Já oscilou entre 108 ms e 337 ms com processos em segundo plano, e 24 a 69 ms com a máquina calma.
- **A tela não percebe sozinha que o `aidlc/` foi apagado com o painel aberto**, porque o vigia nem sempre avisa quando a própria pasta vigiada some. Recarregar a página mostra a falha.
