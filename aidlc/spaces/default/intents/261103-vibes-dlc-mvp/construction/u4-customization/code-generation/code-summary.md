# Resumo do código: u4-customization

## Arquivos criados e alterados

A lista exata está em `source-manifest.json`.

- Banco: `migrations/0004_u4.sql` e `src/db/customization-item-repo.ts`.
- Regras: `src/customization/` (`media-type.ts`, `colors.ts`, `tokens.ts` e `customization-service.ts`) e `src/guide/customizable-moments.ts`.
- Configuração: `mediaDir` em `src/config/app-config.ts` e `runtime` com a varredura do início.
- Rotas: `GET` e `PUT /api/customization`, `POST /visit`, `/visit/done`, `/visit/cancel`, `POST /media` e `GET /media/{mediaId}`, com `src/web/media-upload.ts`, `multipart.ts`, `media-serve.ts`, `customization-http.ts` e os esquemas em `schemas.ts`.
- Interface: `customize.tsx`, `moment-art.tsx`, `compose-moment.ts`, `apply-colors.ts`, `customization-api.ts`, `use-customization.ts` e os ajustes em `guide-app.tsx`, `guide-band.tsx`, `guide-body.tsx`, `guide-parts.tsx`, `demand-hub.tsx` e `globals.css`.
- Sua IA: `VIBES_CLI_KIND` deixou de existir, e `readCliKind` é a única fonte, nas rotas e no retrato do guia.
- Testes: `tests/u4/` e regressões em `tests/u1/core.test.ts`, `tests/u1/routes-harness.ts`, `tests/u1/routes.test.ts`, `tests/u2/web-ui.test.tsx` e `tests/u3/routes.test.ts`.
- Prova: `scripts/proof-u4.ts`, incluída em `npm run verify`.

## Decisões de implementação

- **Multipart próprio.** O plano e `tech-stack-decisions.md` previam `Response.formData()`. O `FormData` do Node.js copia o conteúdo mais de uma vez e estourava os 100 MB de memória do NFR5.5, então `src/web/multipart.ts` lê o corpo já limitado e devolve o arquivo como uma janela do próprio `Buffer`.
- **Corpo lido em partes com contagem** (`readLimitedBody`), com 27262976 bytes de limite. `Content-Length` ausente ou menor que o corpo real não escapa da contagem.
- **Tamanho na tela.** `MediaView` passou a trazer `sizeBytes`, e a prévia mostra "Mídia personalizada: 25,0 MB" (NFR12.1).

## Limite de corpo do Next.js

Confirmado, e a pergunta aberta em `functional-spec.md` está respondida: uma rota de aplicação sem `proxy` não tem limite efetivo abaixo de 25 MB.

- Em `next@16.4.4`, `proxyClientMaxBodySize` (padrão de 10 MB) é passado a `getCloneableBody` em toda requisição (`dist/server/lib/router-utils/resolve-routes.js:125`), mas o corte só acontece em `cloneBodyStream()` (`dist/server/body-streams.js:80`), que clona o corpo para um `proxy`. O projeto não tem `src/proxy.ts` nem `middleware`.
- Medido em `next start`, sobre o build, em cópia de teste: 11534336 bytes deram HTTP 200, 26214400 bytes deram HTTP 200, e 26214401 bytes deram HTTP 413. Os arquivos ficaram em disco com 11534336 e 26214400 bytes, ou seja, inteiros. Essa medição foi feita com um script avulso, já apagado. Em `next dev`, a prova de U4 confere o mesmo limite pelo navegador.
- **Risco para o futuro:** se alguém criar um `proxy`, o corpo passa a ser cortado em 10 MB. A prova de U4 pegaria isso.

## Verificação

Tudo rodou em Git Bash no Windows. O `npm run verify` encadeia lint, tipos, testes com cobertura e as quatro provas, e terminou com código 0 sobre a versão final do produto e dos testes. Depois dele, só uma checagem de `scripts/proof-u4.ts` mudou, e lint, tipos e a prova de U4 foram repetidos, também com código 0. O `npm run build` rodou antes do `verify`, sobre o mesmo código do produto.

| Comando | Resultado |
|---|---|
| `npx vitest run tests/u4` | 6 arquivos, 100 testes passaram, nenhum falhou |
| `npm run test:coverage` (dentro de `verify`) | 31 arquivos, 687 testes passaram, nenhum falhou |
| Cobertura do projeto | Linhas 95,28% (2829/2969), comandos 93,67%, ramos 89,64%, funções 92,02%. Mínimo de 80% de linhas |
| `npm run lint` (dentro de `verify`) | ESLint sem achados, e "All matched files use Prettier code style!" |
| `npm run typecheck` (dentro de `verify`) | `tsc --noEmit` sem erros |
| `tsx scripts/proof-u1.ts` | 29 de 29 conferências. Eco p95 de 50,6 ms |
| `tsx scripts/proof-u2.ts` | 56 de 56 conferências. Eco p95 de 93,8 ms com `audit/` de 50335 linhas |
| `tsx scripts/proof-u3.ts` | 17 de 17 conferências |
| `tsx scripts/proof-u4.ts` | 30 de 30 conferências, no Edge e com Git Bash reais |
| `npm run build` | Código 0, "Compiled successfully", com 3 avisos do Turbopack (ver Lacunas) |
| `npm audit --audit-level=high` | Código 0. 16 achados moderados, todos em `minimatch` por dependências de ESLint e `typescript-eslint`, nenhum alto ou crítico. A correção sugerida rebaixaria o `eslint` para a 4.0.0, então não foi aplicada |

Medidas da prova de U4 contra as metas:

| NFR | Medido | Meta |
|---|---|---|
| NFR1.2, salvar e ver na prévia | p95 de 45 ms em 10 repetições | 500 ms |
| NFR1.3, 25 MiB até a prévia | p95 de 249 ms em 10 repetições | 5000 ms |
| NFR12.1, três mídias de 25 MiB | Salvas, com "25,0 MB" na tela em cada uma | Três mídias grandes |
| NFR6.1, rede | Navegador só com a origem do app. Servidor: só `registry.npmjs.org`, tentado pelo `next dev` e recusado | Nenhuma chamada do produto |

NFR1.1 (até 300 ms com 53 linhas) e NFR1.4 (até 200 ms para a mídia) são conferidos em `tests/u4/routes.test.ts`, com p95 de 10 repetições. NFR5.5 (memória abaixo de 100 MB por envio) é conferido no mesmo arquivo.

## Defeitos achados pela prova e corrigidos

A retomada encontrou a prova escrita, mas nunca concluída. Ao rodá-la:

1. **Prova adiantada em relação ao painel.** O aviso de erro de um envio anterior continuava visível, a espera terminava antes da hora, e o arquivo seguinte era descartado pela tela, que estava ocupada. A prova agora espera a resposta de cada envio e confere o código HTTP.
2. **Checagem de Outra CLI sem valor.** O registro copiado estava no meio de uma etapa, em que nenhum botão de envio aparece, então "sem botão" passava sempre. A prova agora abre `build-and-test` na cópia, leva o guia até Enviar e confere também o controle: com Claude Code, o mesmo passo oferece o botão.
3. **Defeito real no produto (BR6.2).** Com isso, a prova mostrou que, com Outra CLI, Enviar exibia os botões desabilitados e o texto "Só vai para a sua IA quando você confirmar". O teste da interface do passo 11 só olhava a tela Personalizar. Corrigido em `guide-band.tsx`, `guide-parts.tsx`, `guide-body.tsx` e `moment-content.ts`: sem botões, com "Comando de referência", somente leitura e a orientação de digitar o equivalente.
4. **Ordem do bloqueio no Core.** Com a sessão ainda não viva, `sendBlock` respondia `session_dead` antes de `other_cli`, e os botões voltariam nessa janela. `decide-moment.ts` agora confere Outra CLI primeiro. O Core não estava entre as pastas do plano; a mudança é de duas linhas e tem teste próprio.

Checagens que sempre davam verdadeiro, ou que não mediam o que diziam, foram trocadas por leituras reais. A checagem "O .vibes/media/ da cópia está em uso por ninguém" só lia o `.gitignore` escrito pelo próprio script e foi removida. `git status` limpo é conferido depois da visita, antes de o script escrever na cópia; depois disso, `changesBeyondScript` confere que o produto não mudou nada.

## Testes acrescentados na retomada

Foram 9 casos, além da prova: Outra CLI no passo Enviar (3, em `tests/u2/web-ui.test.tsx`), Outra CLI acima da sessão não viva (`tests/u1/core.test.ts`), NFR1.1 e NFR1.4 (`tests/u4/routes.test.ts`), dois envios simultâneos pela fila para o NFR12.7 (`tests/u4/service.test.ts`), tamanho da mídia e uso só com teclado para o NFR10.1 (`tests/u4/web-ui.test.tsx`).

## Testes escritos e não executados

Nenhum. Todos os testes e todas as provas planejadas rodaram.

## Desvios do plano

- `Response.formData()` deu lugar ao leitor próprio de multipart, pelo motivo acima. Medido e dentro da meta do NFR5.5.
- `src/core/decide-moment.ts`, `tests/u1/core.test.ts`, `tests/u2/web-ui.test.tsx` e `tests/u3/routes.test.ts` foram alterados, embora não estejam entre os caminhos do plano. Os dois primeiros e o de U2 vieram da correção de BR6.2, e o de U3 veio da remoção de `VIBES_CLI_KIND`.

## Lacunas reais

1. **AC3.7.3, coberto com limites.** Por decisão de quem desenvolve, com Outra CLI o guia passa a Acompanhar quando a etapa grava o primeiro artefato (BR6.3, `decide-moment.ts`). Isso muda a tabela de momentos de U2 e foi conferido com testes do `Core` e na prova, simulando a gravação do arquivo, não em uma execução com outra CLI de verdade. Ficam dois limites: entre digitar o comando e gravar o primeiro artefato, o guia segue em "Confira o comando"; e quem digita o comando direto no terminal com Claude Code continua vendo o mesmo, porque a regra só vale para Outra CLI.
2. **Avisos no build.** `npm run build` passa, mas o Turbopack dá 3 avisos de "Dynamic filesystem access causes tracing of the whole project", em `customization-service.ts`, nas linhas de `path.join(this.mediaDir, ...)`. Para um app local sem pacote de deploy, o efeito é só uma análise maior no build. Eles não foram silenciados.
3. **Chrome (NFR9.1).** A prova roda no Edge. A conferência no Chrome fica para o fim do MVP, como desvio já aceito em U3.
4. **Verificação automática.** A exceção do `team.md` segue valendo: até `ci-pipeline`, o comando local protege `main`.

Nenhuma meta foi reduzida, relaxada ou desligada.
