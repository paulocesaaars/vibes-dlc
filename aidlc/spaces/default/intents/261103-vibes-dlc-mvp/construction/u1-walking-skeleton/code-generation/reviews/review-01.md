## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-03T17:03:24Z
**Iteration:** 1
**Verdict Dictated:** no

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | src/terminal/stale-shell.ts > killStaleShell, e src/web/bootstrap.ts > prepareStart | O início lê `.vibes/terminal.pid` e encerra, com `taskkill /T /F`, qualquer processo com esse PID cujo nome seja `bash.exe`. Isso roda antes de o Next escutar. Se já houver outro painel vivo no mesmo repositório (por exemplo `npm run dev` executado duas vezes), o `bash.exe` do primeiro painel é um `bash.exe` de verdade, e o segundo início o encerra junto com a CLI de IA aberta nele, mesmo que o segundo painel falhe logo em seguida por porta ocupada. O mesmo vale para um PID reaproveitado pelo Windows por outro Git Bash da pessoa (a própria CLI de IA costuma abrir `bash.exe`). A conferência só olha o nome da imagem, e nenhum teste cobre esse caso. Isso é o risco de encerrar um processo alheio. | Gravar no arquivo de PID também quem é o dono (PID do servidor e hora de criação do shell) e só encerrar o shell quando o dono não existir mais e o PID ainda tiver a mesma hora de criação. Alternativa mínima: tentar escutar a porta antes de encerrar o que sobrou. Acrescentar um teste de dois inícios no mesmo `.vibes/` e um de PID reaproveitado por outro `bash.exe`. | New |
| R-02 | Minor | src/web/schemas.ts > commandSchema (e `commandIssue` em src/web/components/guide-app.tsx) | O envio recusa só `r` e `n`. Outros caracteres de controle passam e vão ao terminal sem aparecer no campo. Em `paste`, um Ctrl-O (`x0f`) ou outra tecla de controle do readline pode aceitar a linha e executá-la sem a pessoa apertar Enter, o que contradiz a promessa de "Colar sem executar". Em U1 o texto vem do campo, mas a regra de "nada sem confirmação" vale também para o que a pessoa não consegue ver. | Recusar caracteres de controle C0 (exceto tab) e DEL no esquema do servidor e na validação da tela, com a mensagem em português, e cobrir com um caso de teste. | New |
| R-03 | Minor | scripts/no-network.cjs; scripts/proof-u1.ts > checkDataAndNetwork | A recusa de rede troca só `globalThis.fetch` no processo do Next. `http`, `https`, `net` e `dns` seguem livres, e a prova só enxerga o que passou pelo `fetch` (`VIBES_NETWORK_DEBUG`). O código do produto está limpo (conferi `src/` e o teste de arquitetura), mas "nenhuma chamada de rede do servidor" é afirmada sem prova de que um acesso por outro caminho seria visto. | Registrar no `code-summary.md` que a proteção cobre apenas `fetch` e o código do produto, ou estender o preload para `http.request`/`https.request` e `dns.lookup` e conferir isso na prova. | New |
| R-04 | Minor | scripts/proof-u1.ts > stepAddressAndStage, stepSessionSurvivesReload, checkDataAndNetwork | Três conferências da prova são mais fracas do que o nome sugere. (1) "Escuta só em 127.0.0.1" passa sem ter testado nada quando a máquina não tem endereço de rede externo. (2) A queda do stream é simulada na página (`close()` mais um evento `error` falso), o que exercita a reconexão do cliente, e não uma queda real de conexão. (3) O filtro de "o produto não mudou arquivos versionados" ignora `aidlc-state.md`, `audit/` e `memory.md`, justamente onde uma escrita indevida do produto apareceria. Não derrubam a prova, mas ela pode passar sem provar esses pontos. | Falhar ou marcar "não verificado" quando não houver endereço externo; derrubar o stream por uma rota ou proxy de teste, ou registrar a limitação; comparar o conteúdo (hash) desses arquivos antes e depois, em vez de excluí-los do filtro. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `npx vitest run tests/u1` | PASS: 11 arquivos, 260 testes passaram (9,4 s) | Confirma a afirmação do autor. Os testes de terminal usam `node-pty` e Git Bash reais, e a lista de rotas do teste de Origin e Host é conferida contra todos os `route.ts`. Não encontrei teste que passe sem provar nada. |
| `aidlc engine sensor-traceability --stage code-generation --output-path .../code-generation/traceability.json` | PASS: `gaps`, `orphans`, `missing_from_table`, `invalid_entries` e `invalid_targets` vazios, `findings_count` 0 | A rastreabilidade de histórias para passos está íntegra. |
| `npm run check` (rodado por mim, além do pedido) | PASS: lint, Prettier, tipos e testes com cobertura. Linhas 96,26% no projeto todo (mínimo 80%) | Confirma a afirmação de cobertura do `code-summary.md`. Cobertura baixa só em `bootstrap.ts` (71% das linhas, por causa de `runNext`, coberto pela prova) e em `change-watcher.ts` (84%). |
| `scripts/proof-u1.ts` | NÃO EXECUTADO, por instrução. Li o script | Cobre os 10 passos de `functional-spec.md`, com painel, Edge e Git Bash reais, e mede eco e atualização. Os números do `code-summary.md` (p95 de 24,8 ms, 300 ms, 28 de 28) são afirmações do autor. As fragilidades estão no achado Minor sobre a prova. |

### Summary

Com o que li, a Unidade se sustenta: `isRequestAllowed` abre todas as rotas, o envio relê a demanda e só escreve com `canSend`, a tabela de momentos bate com `functional-spec.md`, o `core` é puro, as escritas ficam em `.vibes/`, os tokens visuais batem com o protótipo e os limites entre módulos são vigiados por teste. O ponto que mais merece atenção antes de aprovar é o encerramento do shell que sobrou, que pode derrubar o terminal de outro painel vivo ou um `bash.exe` alheio; os demais achados são menores. Todos os caminhos de `source-manifest.json` têm relação com a Unidade.
