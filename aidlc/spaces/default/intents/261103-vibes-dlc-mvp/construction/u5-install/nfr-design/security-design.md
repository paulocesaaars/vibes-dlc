# Design de segurança e instalação: u5-install

Base: `nfr-requirements/security-requirements.md`, `nfr-requirements/tech-stack-decisions.md` e `inception/contract-design/contract-summary.md`. U5 é do tipo `packaging`: o design não cria camada nova, e sim muda três pontos de montagem que hoje assumem que existe um repositório com AI-DLC (a procura da raiz, o armazenamento e o `runtime`) e acrescenta uma rota de verificação.

U5 não tem `functional-spec`, porque o design funcional não gera esse arquivo para o tipo `packaging`. O comportamento vem de `FR11` e `FR12` e do que `tech-stack-decisions.md` fixou.

Os outros arquivos de design (desempenho, escala, confiabilidade, observabilidade e componentes lógicos) não se aplicam a este tipo de Unidade. O que seria confiabilidade aqui, a saída de uma falha sem reiniciar, está em "Verificar de novo" abaixo.

## Procura da raiz (NFR5.3, NFR7.2)

`findRepoRoot` passa a receber duas coisas: o ponto de partida (`cwd`) e a pasta do próprio produto (`productDir`).

**Como `productDir` é achado:** sob o Next, `import.meta.url` aponta para `.next/server/...` e não serve. Por isso `scripts/run-next.mjs`, que sabe onde está (a pasta pai de `scripts/`), grava `VIBES_PRODUCT_DIR` no ambiente do processo do Next, e `loadConfig` lê essa variável interna. Sem a variável (testes de unidade), `productDir` é passado como argumento.

**Como os caminhos são comparados:** os dois lados passam por `realpathSync.native` (resolve junções e nomes curtos) e, no Windows, pela caixa normalizada da letra do drive, antes da igualdade. Assim `c:\x` e `C:\x` são a mesma pasta.

1. Sobe a partir do `cwd`, uma pasta por vez, procurando `aidlc/`.
2. Se a pasta com `aidlc/` for a `productDir`, ela só vale como raiz se tiver `.git`. Sem `.git`, é uma cópia da subpasta com um `aidlc/` dentro, e a procura continua para cima.
3. Chegando à raiz do disco sem achar, devolve `null` e vale a falha de FR11.1.

Isso preserva o uso em desenvolvimento neste repositório, onde o produto e o `aidlc/` estão na mesma pasta e há `.git`, e cumpre a regra de que a subpasta instalada nunca é a raiz. A subpasta instalada vem da cópia dos arquivos, sem `.git` e sem `aidlc/` (lista de `tech-stack-decisions.md`).

**Risco aceito (clone do produto):** quem clona o repositório do produto dentro de um projeto traz `.git` e `aidlc/` na subpasta, e ela seria tomada pela raiz. O `README` manda instalar copiando os arquivos, não clonando.

**Suposição [assumption]:** usar `.git` como sinal de "esta pasta é um repositório de verdade". A alternativa é uma variável `VIBES_REPO_ROOT`, rejeitada por obrigar quem desenvolve o produto a configurá-la.

## Armazenamento sem raiz (NFR7.3)

Hoje `loadConfig` calcula `.vibes/` a partir de `repoRoot ?? cwd`, e `prepareStart` prepara o armazenamento antes de qualquer tela. Com `repoRoot === null` o design muda assim:

| Peça | Com raiz | Sem raiz |
|---|---|---|
| `dbPath` | `<raiz>/.vibes/vibes.db` | `null`. `readDbPath` deixa de usar `cwd` como base |
| `vibesDir` e `mediaDir` | `<raiz>/.vibes` e `<raiz>/.vibes/media`, criadas | `null`. Nada é criado e a varredura de mídia não roda |
| `VIBES_DB_PATH` | Vale como hoje | Ignorada, com aviso no log: sem raiz não há base para o caminho, e NFR7.3 proíbe criar arquivo |
| Banco | `prepareStorage(dbPath)` | `prepareStorage(':memory:')`: as migrações rodam num banco de memória, nada vai ao disco e nada persiste |
| `terminal.pid` e `killStaleShell` | Em `.vibes/` | `pidFile` é `null`: nada é gravado nem apagado |
| Envio de mídia em Personalizar | Grava em `mediaDir` | `CustomizationService` recebe `mediaDir: null` e recusa o envio com 409 e a mensagem "Sem o AI-DLC no projeto não há onde guardar a imagem. Instale o AI-DLC e tente de novo." Os textos de Personalizar funcionam, só em memória |

Assim a falha de FR11.1 não deixa nada na subpasta do produto, e os dados do usuário só nascem num lugar, a raiz. O `README` avisa que os dados vão para `.vibes/` na raiz e que ela deve ir para o `.gitignore`.

O teste de NFR7.3 vai além do início: sem raiz, tenta um envio de imagem e um `VIBES_DB_PATH` apontando para uma pasta de teste, e confere que nada foi criado, nem na subpasta nem no destino do `VIBES_DB_PATH`.

## Verificar de novo (NFR9.3, NFR4.1)

Tentar de novo (FR11.5) passa a chamar uma rota nova, `POST /api/repo/recheck`:

- Passa por `isRequestAllowed` (`Origin` e `Host` do próprio app) antes de qualquer leitura. Uma requisição de fora recebe 403 e nada é reavaliado.
- Chama `refreshRuntime()`, que roda `findRepoRoot` de novo. Se a raiz continua igual, só relê o estado. Se a raiz mudou (de `null` para uma pasta, ou o contrário), monta um `runtime` novo e troca o objeto guardado em `globalThis`.
- Devolve a saúde do repositório que a tela já mostra, sem dado novo.

### Mudança no módulo `terminal`

O gerenciador do terminal é um só por processo (`getTerminalManager` só chama a fábrica na primeira vez) e hoje guarda `cwd` e `pidFile` como valores fixos, então trocar o `runtime` não os mudaria. Por isso:

- `TerminalManagerOptions` troca `cwd: string | null` e `pidFile: string` por `getCwd: () => string | null` e `getPidFile: () => string | null`.
- `spawnSession` chama `getCwd()` ao abrir cada sessão. A gravação e a remoção do arquivo de PID chamam `getPidFile()` na hora e, com `null`, não fazem nada.
- O ponto de montagem em `runtime.ts` passa funções que leem o `runtime` atual de `globalThis`. A fábrica roda uma vez e continua certa depois da troca. Sem raiz, `getCwd()` devolve o `cwd` do processo, para a pessoa rodar a instalação do AI-DLC no terminal que a tela de falha oferece (AC1.2.1).
- **PID de sessão aberta antes de existir raiz:** não foi gravado, porque não havia `pidFile`. Depois da troca, essa sessão fica sem registro até acabar. Se o servidor cair nesse intervalo, `killStaleShell` não a encontra. É um limite aceito: a janela é curta e o `shutdown` normal a fecha.
- **Testes de unidade:** o gerenciador abre uma sessão, `getCwd` passa a devolver outra pasta e a sessão seguinte nasce na pasta nova; com `getPidFile` devolvendo `null`, nenhum arquivo é criado.

### Ciclo da troca do `runtime`

- **Uma troca por vez:** `refreshRuntime()` guarda a promessa da troca em andamento. Uma segunda chamada (duplo clique, outra aba) espera essa promessa e devolve o mesmo resultado, sem montar um segundo `runtime`.
- **Ordem:** monta o `runtime` novo inteiro, troca o objeto em `globalThis` e só então encerra o antigo. Se a montagem falhar, o antigo continua valendo e a rota devolve o erro em português.
- **Encerramento do antigo:** `AidlcReader` ganha `close()`, que chama `watcher.stop()`, e o banco antigo é fechado depois de uma folga de 5 segundos para as rotas em voo terminarem.
- **Um só gancho de saída:** o `process.once('exit')` que fecha o banco é registrado uma vez por processo e fecha o banco do `runtime` atual, em vez de um gancho por `runtime`.
- **Rota em voo:** ela segurou o `runtime` antigo e termina com ele. Se o banco já tiver fechado, o erro cai no tratamento da rota e devolve 503 com "A raiz mudou. Tente de novo.". Nenhuma escrita se perde sem aviso, porque a pessoa vê o erro.
- **Testes:** duas chamadas simultâneas de `refreshRuntime()` produzem um só `runtime` novo e um só fechamento do antigo; uma troca com uma rota em voo termina sem deixar banco aberto nem vigia ativo do `runtime` antigo.

**Sessão aberta na troca:** a sessão do terminal aberta antes de existir raiz continua no `cwd` antigo até a pessoa abrir outra. A tela diz isso quando a raiz muda. É um limite aceito, porque encerrar uma sessão que a pessoa está usando é pior.

## Caminhos com caracteres especiais (NFR5.2)

O caminho do repositório nunca entra numa linha de comando. O terminal usa `cwd` do `node-pty`, e o shell é chamado como arquivo executável com argumentos separados. Os logs e as mensagens tratam o caminho como dado. O teste cria a pasta com espaços, acentos e `& ' $ ( )`, abre o terminal real e confere o `pwd`.

## Telas de falha (NFR5.1, NFR8.1, NFR9.2, NFR10.1, NFR13.1)

As telas de falha são a tela E6 de U1 e U2. O React escreve os textos como texto, então o caminho do arquivo e os trechos vindos do repositório não executam nada. A mensagem traz só o caminho que falhou e o motivo, sem variáveis de ambiente, sem chaves e sem a saída do terminal. Sem o Git Bash, a tela mostra como instalar ou usar `VIBES_SHELL`, e o terminal não abre. O teclado já alcança Tentar de novo e os links de ajuda, e o estado de falha tem texto e ícone, além da cor.

## Rede, escrita e atualização (NFR3.1, NFR6.1, NFR7.1, NFR12.1)

- **Escuta:** `buildNextArgs` continua usando `config.host`, `127.0.0.1` por padrão. A instalação não muda isso, e o teste confere com e sem `VIBES_HOST`.
- **Rede:** o `npm install` é o único momento com rede. Depois dele, `scripts/no-network.cjs` continua carregado pelo `NODE_OPTIONS` do Next.js e a prova registra as requisições.
- **Escrita:** a instalação é só a cópia da subpasta. O `README` é o único lugar que pede uma edição, o `.gitignore`, e quem a faz é a pessoa. A prova compara os hashes de todo arquivo do repositório de teste fora da subpasta e de `.vibes/`.
- **Atualização:** `.vibes/` fica fora da subpasta, então copiar a subpasta por cima não a toca. O `README` manda não apagá-la. Antes de migrar, `.vibes/vibes.db` é copiado (U1).

## Versão do Node.js (NFR9.1)

`prepareStart` já interrompe o início com `nodeVersionMessage()`, que sai no console. U5 não muda isso. Acrescenta um teste de `prepareStart` com a versão passada como argumento, e a conferência de que `scripts/run-next.mjs` passa por `prepareStart` nos modos `dev` e `start`.

## Prova da instalação (NFR11.1)

`scripts/proof-u5.ts` cria um repositório temporário em uma pasta com espaços e acentos, com `aidlc/` mínimo, copia a subpasta pela lista do `README`, roda `npm install` e inicia o produto no Git Bash real. Confere, nesta ordem: o painel abre em `127.0.0.1`; nada fora da subpasta e de `.vibes/` mudou; o `package.json` do repositório de teste ficou igual; o terminal abre na raiz; a versão do Node.js e o Git Bash ausente mostram a falha certa; sem `aidlc/` o produto não cria `.vibes/` e, criada a pasta, Tentar de novo tira a tela da falha; um `aidlc/` dentro da subpasta é ignorado; apagada a pasta `aidlc/` da raiz, Tentar de novo volta à tela de falha e a tela avisa que a sessão aberta ficou na pasta antiga; um envio de imagem sem raiz é recusado e não cria nada. Qualquer conferência com falha faz a prova sair com código diferente de zero. Se o `node-pty` não instalar, a prova falha com essa causa.
