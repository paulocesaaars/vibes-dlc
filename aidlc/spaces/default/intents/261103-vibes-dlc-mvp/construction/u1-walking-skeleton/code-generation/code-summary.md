# Resumo do código: u1-walking-skeleton

**Correções depois da revisão:**

- `killStaleShell` agora só encerra o shell se o servidor dono não existir mais, se o PID ainda for um `bash.exe` e se o horário de abertura conferir. Antes, um segundo `npm run dev` derrubava a sessão do primeiro.
- `commandSchema` também recusa caracteres de controle.

Depois das correções: 272 testes passaram, a cobertura de linhas ficou em 96,23%, e a prova passou com 28 de 28 conferências.

**Pontos da revisão ainda abertos, de severidade menor:**

- `scripts/no-network.cjs` troca só o `fetch`, então a prova não enxerga `http`, `https` nem `dns`.
- Três conferências da prova são fracas: a escuta só em `127.0.0.1` passa sem testar nada em uma máquina sem endereço externo, a queda do stream é simulada na página, e o filtro de arquivos versionados ignora `aidlc-state.md`, `audit/` e `memory.md`.

A fatia de ponta a ponta funciona em `npm run dev` e em `npm run build && npm start`: o painel abre em `127.0.0.1`, o terminal real roda no Git Bash e mantém a sessão ao recarregar, o guia mostra a etapa a partir dos arquivos do AI-DLC, e o comando só vai ao terminal depois da confirmação.

## Como rodar

| Objetivo | Comando |
|---|---|
| Abrir o painel | `npm run dev`, ou `npm run build && npm start` |
| Testes desta Unidade | `npx vitest run tests/u1` |
| Prova da fatia | `npx tsx scripts/proof-u1.ts` |
| Verificação antes do commit | `npm run check` |

Node.js 22.13 ou superior, e Git Bash no Windows.

## Arquivos

Só `.gitignore` já existia: recebeu `.vibes/`, `node_modules/` e `.next/`, fora do bloco do AI-DLC. Os demais são novos.

| Área | Arquivos |
|---|---|
| Configuração | `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`, `playwright.config.ts` |
| Início | `scripts/run-next.mjs`, `scripts/no-network.cjs`, `src/web/bootstrap.ts` |
| `db` | `migrations/0001_u1.sql`, `src/db/` |
| `config` | `src/config/` |
| `core` | `src/core/` |
| `aidlc` | `src/aidlc/` |
| `terminal` | `src/terminal/` |
| `guide` | `src/guide/` |
| `web`, servidor | `src/app/api/**/route.ts`, `src/web/request-guard.ts`, `src/web/schemas.ts`, `src/web/sse.ts`, `src/web/guide-service.ts`, `src/web/runtime.ts`, `src/web/responses.ts` |
| `web`, interface | `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/web/client/`, `src/web/components/` |
| Testes e prova | `tests/u1/`, `tests/fixtures/aidlc/`, `scripts/proof-u1.ts` |

## Conferências do início de U1

| Ponto | Resultado |
|---|---|
| `node-pty` instala sem compilação e abre o Git Bash com ConPTY | Confirmado. O pacote traz binários prontos para Windows. Node.js 26.7 nesta máquina |
| `node:sqlite` dentro do servidor do Next | Confirmado, em `dev` e em `start` |
| Registro em `globalThis` igual entre rotas | Confirmado, em `dev` e em `start` |
| SSE entrega sem acumular | Confirmado na prova, com `compress: false` no `next.config.ts` |
| Shell órfão no Windows | Com o `taskkill /F` no processo do Next, o `/T` leva o shell. O caso de queda sem aviso é coberto por `.vibes/terminal.pid` |

## Decisões principais

- **Início por um script próprio.** `npm run dev` passa por `scripts/run-next.mjs`, que valida o Node.js e as variáveis, prepara o banco, encerra o shell que sobrou e só então inicia o Next com o endereço da `Config`. Assim, a ordem de `reliability-design.md` vale antes de escutar.
- **Rede.** O `next dev` tem duas chamadas de rede que não fazem parte do código do produto: telemetria e consulta da versão mais nova no registro do npm. A telemetria é desligada por variável. A consulta não tem opção, então `scripts/no-network.cjs` recusa o `fetch` para fora da máquina no processo do Next, e ele trata isso como versão desconhecida. A prova confere que só essa tentativa aconteceu.
- **`AGENTS.md`.** O `next dev` grava esse arquivo na raiz do repositório. `agentRules: false` impede isso, porque o produto só escreve em `.vibes/`.
- **`VIBES_DB_PATH` só dentro de `.vibes/`.** Outro caminho interrompe o início, para manter BR2.3. O `terminal.pid` fica na mesma pasta do banco.
- **`VIBES_SHELL` definido vale sozinho.** Com um caminho inexistente, a sessão fica `unavailable`, sem procurar outro shell, como pede `unit-test-instructions.md`.
- **Ambiente do shell.** Herda o da pessoa, sem `NODE_ENV`, `NODE_OPTIONS`, `PORT`, `VIBES_*` e `NEXT_*`, para que a recusa de rede e as variáveis do servidor não afetem os comandos dela. `CHERE_INVOKING=1` mantém o Git Bash na raiz do repositório.
- **Encerramento no Windows.** Usa `taskkill /T`, que leva junto a CLI aberta e funciona dentro do evento `exit`. Um erro do `taskkill` por um filho que já está saindo não conta como falha, se o processo não existe mais.
- **Leitura antiga não libera envio.** Enquanto o estado está sendo gravado, a tela mostra a última leitura válida, mas `/api/commands` responde `stale_screen`.
- **Mudança na tela.** A faixa do cabeçalho mostra "Última mudança nos arquivos", que é o que a prova mede no passo 8.

## Testes e cobertura

Metodologia test-after, camada por camada, conforme o Testing Contract.

| Medida | Resultado |
|---|---|
| `npx vitest run tests/u1` | 260 testes passaram, em 11 arquivos. Rodado 3 vezes seguidas, sem falha |
| `npm run check` | Passou: lint, Prettier, tipos e testes |
| Cobertura de linhas no projeto todo | 96,26% (mínimo de 80%, sem alteração no limite) |
| `npm audit` | 0 altas ou críticas. 16 moderadas, todas em ferramentas de lint (`eslint`, `eslint-config-next`, `typescript-eslint`), sem correção sem quebra |

**O terminal é real nos testes.** `tests/u1/terminal.test.ts` e o caso de SSE em `routes.test.ts` usam o `node-pty` e o Git Bash reais. O substituto só aparece nos casos que tratam de origem, formato ou falha de escrita.

## Prova da fatia

`npx tsx scripts/proof-u1.ts`, com o painel em `npm run dev`, o Edge e o Git Bash reais: **28 de 28 conferências passaram**, cobrindo os 10 passos de `functional-spec.md`.

| Medida | Resultado | Meta |
|---|---|---|
| Eco de 100 teclas | p95 de 24,8 ms, mediana de 22,8 ms, máximo de 28,5 ms | Até 150 ms em 95% das teclas |
| Atualização depois de mudar um arquivo | 300 ms | Até 3 segundos |
| Reaplicar a saída ao recarregar | 251 ms, sem a janela cheia | Sem meta |

A prova usa um banco à parte (`.vibes/proof-<id>/`), removido no fim, e um arquivo de teste ignorado pelo Git no registro observado, também removido. Ela limpa `sent_command` nesse banco entre os passos 4 e 5, porque BR4.1 fecha o envio depois do primeiro comando da etapa.

Em `npm run build && npm start`, um script temporário conferiu o terminal, o guia, o empilhamento abaixo de 1180 px e a ausência de requisições externas. Com `VIBES_HOST=127.0.0.2`, o alerta aparece na página, o aviso sai no início, e a porta não responde em `127.0.0.1`.

## Testes escritos, mas não executados aqui

Nenhum teste escrito deixou de rodar. Ainda falta o que não é automático:

| Item | Motivo |
|---|---|
| Conferência de quem desenvolve com a CLI de IA aberta (AC3.1.1, comparação com o comando real) | Faz parte da definição da fatia e não usa a prova, que roda sem créditos de IA |
| Conferência final no Chrome (NFR9.2) | É de quem desenvolve. A prova usa o Edge |
| Reaplicar a saída com a janela cheia | A prova mede com pouca saída. A avaliação fica para a conferência |
| CI antes do merge | A etapa `ci-pipeline` vem no fim da Construção. Até lá, `npm run check` é a proteção, conforme a exceção de `team.md` |

## Desvios do plano

| Desvio | Motivo |
|---|---|
| Mais testes que os 35 a 45 estimados (260) | Os casos por rota, marca e motivo de bloqueio são parametrizados |
| Dependências que o plano não cita pelo nome: `@xterm/addon-fit`, `tsx` em `dependencies`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/user-event` e `@types/*` | São necessárias para o que o plano pede: ajustar o terminal à tela, iniciar pelo script, medir cobertura e testar a interface |
| `typescript` fixado em 5.9 e `eslint` em 9 | Escolha por cautela: as versões mais novas (7 e 10) não foram testadas com o `next build` e o `eslint-config-next` |
| Arquivos não previstos: `scripts/run-next.mjs`, `scripts/no-network.cjs`, `.prettierignore` | Ver as decisões acima. `.prettierignore` protege os arquivos da pessoa do formatador |
| `src/app/` além de `src/web/` | O App Router exige essa pasta. Só tem rotas finas, layout e página |
| `/api/demands` devolve também `repo` e `activeIntentId` | A interface precisa disso antes de ter uma demanda, nas telas sem `aidlc/` e sem intent ativo. É aditivo em C4 |
| `readArtifact`, `readOpenQuestions` e `stage.lastEvent` de C2 e C1 não foram implementados | São de U2. `openQuestions` vai como `unavailable` e `lastEvent` como `null` |
| Aparência: a faixa inferior não reserva espaço para texto vazio | Com o espaço vazio do protótipo, os dois botões de Enviar quebravam em duas linhas |
| Textos: "Enviar agora" no lugar de "Confirmar e executar" do protótipo | É o texto de AC3.4.2 e do plano |
| Barra do terminal fixa em `MINGW64:/c/...` | É o formato do `TDD.md`. Nesta máquina, o prompt do Git Bash mostra `UCRT64`, porque vem do ambiente da pessoa |

## Limites conhecidos

- **Etapa mostrada durante a Construção.** O guia lê `Current Stage` de `aidlc-state.md`. Nesta execução, esse campo continua em `functional-design` com `[-]` enquanto a Unidade está em Geração de código. O painel mostra o que o arquivo diz. U2 precisa tratar a Construção por Unidade.
- **Depois do primeiro comando, a etapa fica em Acompanhar.** Se o comando foi enviado sem a IA aberta, o Git Bash o recebe, e o guia segue em `following`. É o que a tabela de momentos define em U1.
- **`npm install` avisa sobre scripts de instalação.** Com o npm 11 desta máquina, `node-pty` e `esbuild` aparecem como não aprovados em `allowScripts`. Nada precisou ser aprovado aqui, porque o `node-pty` traz binários prontos. U5 deve conferir isso em um repositório limpo.
