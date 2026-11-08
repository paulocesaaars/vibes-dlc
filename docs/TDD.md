# TDD — Vibes DLC

## Stack

Next.js App Router, React, TypeScript, Zod, SQLite embutido de Node.js, xterm e node-pty.
Fontes locais Nunito e JetBrains Mono. Node.js mínimo 22.13. Não há SDK de IA, API de modelos
ou serviço externo de banco. Não foram adicionadas dependências para seleção de projetos.

## Arquitetura

Uma instância do servidor mantém um contexto de projeto ativo e uma sessão de terminal.
O diretório do produto é independente do projeto e do armazenamento pessoal.

- `config`: endereço, porta, shell e diretório pessoal.
- `db`: preferências visuais e recentes/IA por caminho de projeto.
- `aidlc`: leitura de estado, auditoria, unidades, decisões e artefatos.
- `core`: tipos, progresso da trilha e adaptação do prefixo dos comandos.
- `guide`: nomes, explicações de etapas, níveis e estados personalizáveis.
- `customization`: cores, frases e mídias pessoais.
- `terminal`: sessão PTY e buffer em memória, transporte de saída por SSE e entrada por POST.
- `web/runtime.ts`: instância compartilhada em `globalThis`, seleção e identidade de contexto.
- `web/workspace-service.ts`: retrato do projeto reconstruído a partir dos arquivos.
- `app/api/workspace`: leitura e ações do painel, com contexto validado no servidor.

O navegador consulta o retrato a cada dois segundos, sem sobrepor suas próprias consultas.
Conexões de terminal continuam usando SSE. O leitor não executa comandos auxiliares do AI-DLC.

## Navegação e estado da interface

`web/components/guide-app.tsx` mantém a navegação entre início, acompanhamento, nova demanda
e personalização. O início é exibido ao abrir o painel com um projeto selecionado. A listagem
recebe de `workspace-service.ts` a etapa, a condição de leitura e o progresso de cada demanda.
O cálculo usa `core/trail.ts`: conta etapas aprovadas entre as planejadas para execução,
excluindo as puladas. A condição `stale` acompanha o progresso e é indicada na lista.

`new-demand-wizard.tsx` apresenta as três etapas do assistente e recebe o `DemandDraft`
controlado pelo componente principal: etapa, descrição, nível e expansão da lista de níveis.
Isso preserva o preenchimento ao desmontar o assistente durante a visita à personalização.
O rascunho fica somente na memória do navegador; cancelar a demanda ou observar a troca para
outro projeto limpa esse estado. Não é gravado no banco nem nos arquivos do projeto.
`screen-frame.tsx` separa o conteúdo rolável da faixa inferior de ações.

`triage/suggest-level.ts` concentra a sugestão por regras locais e a montagem dos comandos.
A descrição é normalizada para comparação, e a primeira regra correspondente define a sugestão;
sem correspondência, usa `feature`. Pedir análise prepara `/aidlc compose`, sem consultar um
modelo pelo painel. Criar usa `/aidlc --scope` e inclui `--new-intent` quando há demanda ativa.
O prefixo é adaptado à IA selecionada por `core/commands.ts` antes de exibir a prévia.
Alterar descrição ou nível e voltar de etapa invalidam a prévia existente.

## Contrato de arquivos

A raiz selecionada contém `aidlc/`. Os cursores são `aidlc/active-space` (padrão `default`)
e `aidlc/spaces/<space>/intents/active-intent`. Cada demanda tem seu `aidlc-state.md`
na pasta do intent. O leitor interpreta os campos Project, Scope e Current Stage e a seção
Stage Progress, incluindo marcas de andamento e etapas puladas.

O grafo é uma lista JSON de objetos com `slug`, `number`, `phase` e `lead_agent` opcional.
Slugs e fases aceitam somente nomes seguros. O grafo não pode estar vazio ou ter slugs repetidos.

A resolução usa primeiro `.claude/tools/data/stage-graph.json`. Se ausente, procura um arquivo
com esse nome nas pastas de configuração ocultas e em `aidlc/`, com limites de profundidade
e quantidade de diretórios. Não segue diretórios simbólicos nessa descoberta nem vasculha
o código do projeto. A preferência de IA não define o caminho. Outros formatos são rejeitados
com mensagem; não são inventados layouts específicos de Devin ou Copilot.

A posição de construção por unidade considera os eventos do `audit/`, inclusive aprovação
de plano por unidade. O último gate válido da tentativa é usado para confirmar aprovação.
A leitura do estado rejeita conflitos de merge. Uma leitura incompleta pode mostrar o último
estado válido por até dez segundos, identificado como desatualizado e sem liberar envio.
O cache é identificado pelo caminho completo do estado, isolando demandas homônimas de espaços diferentes.
A listagem omite demandas com `status: archived` no `intents.json` do espaço atual.
Se o registro estiver ausente ou inválido, as pastas continuam sendo a fonte da listagem.

Artefatos são lidos das pastas de fase/etapa e unidade. Conteúdo é texto puro, com limite de
2 MB para exibição e identificação de binários. Caminhos de leitura são validados.
Se o artefato selecionado desaparecer ou deixar a etapa/unidade atual, a seleção é recuperada
com aviso, sem bloquear o acompanhamento. O navegador remove o caminho antigo da consulta.

Perguntas pendentes não são contadas por `aidlc engine log answers`. Decisões e respostas
registradas nos arquivos continuam disponíveis para consulta; a interação acontece no terminal.

## Armazenamento pessoal

- Windows: `%LOCALAPPDATA%/vibes-dlc/`.
- macOS: `~/Library/Application Support/vibes-dlc/`.
- Linux: `${XDG_DATA_HOME:-~/.local/share}/vibes-dlc/`.
- Alternativa: `VIBES_DATA_DIR`, sempre absoluto e fora do projeto acompanhado.

O banco `preferences.db` contém `customization_item`, `project_preference` e o registro de
migrações. As mídias ficam em `media/`. Não existem tabelas de notas, progresso pessoal,
revisões, histórico de comandos ou conclusões vistas. Não há importação de bancos antigos.

Projetos são identificados pelo caminho real. Clones e worktrees em caminhos diferentes
possuem preferências independentes. Recentes retornam os últimos 30 projetos. Personalizações
visuais são globais. A IA por projeto não participa das visitas de personalização.
Remover dos recentes limpa `opened_at`, preservando a preferência de IA. Reabrir registra uma nova visita.
`GET /api/directories` lista somente subpastas, sem recursão, com a mesma proteção de origem
do workspace. A leitura limita-se a 10 mil entradas e mil pastas por solicitação.

O projeto ativo fica em memória e precisa ser escolhido depois de reiniciar o servidor.
PID do shell é controle operacional local por porta, usado para recuperar processos órfãos.
Não é estado de trabalho compartilhado.

## Troca de projeto e concorrência

A seleção valida o destino e seu grafo antes de alterar o contexto atual. Com terminal vivo,
exige confirmação que contém o identificador da sessão atual. A confirmação de outra sessão
não permite encerrar uma sessão nova. A troca encerra o shell e seus processos antes de ativar
a nova raiz. Falhas de encerramento impedem a ativação.

A alteração síncrona após a leitura do corpo impede intercalar outro envio durante a troca.
Uma identidade aleatória representa a geração do contexto e é renovada ao trocar projeto ou IA.
Requisições de gerações antigas são rejeitadas. Leituras assíncronas conferem a geração novamente
antes de retornar dados. Todas as abas veem o contexto único do servidor na próxima consulta.

Envios exigem também a sessão atual e a mesma demanda/etapa ativa da prévia. Ativação valida
o destino e o comando. Identificadores de envio evitam repetição na memória do servidor.
Não há garantia de entrega exatamente uma vez após reinício do servidor; entrega incerta
é informada e nunca repetida automaticamente.

## Terminal e comandos

Git Bash no Windows, ou shell configurado nas demais plataformas. O shell abre na raiz
selecionada; não há abertura na pasta pai do produto como alternativa de preparação.

A pessoa abre a IA manualmente. Os comandos gerados usam `/aidlc` em Claude Code e Copilot,
e `aidlc` em Devin. Só a barra inicial é adaptada. A escolha da IA não identifica nem troca
o processo que está no terminal.

Envios têm prévia e confirmação, com Enter ou sem Enter. Escrever no terminal não altera
o estado oficial nem comprova execução. A saída é renderizada pelo xterm, sem interpretação
do andamento pelo Vibes. Sessão e buffer sobrevivem ao recarregamento da página enquanto
o servidor estiver vivo, mas terminam na troca de projeto ou parada do servidor.

## Personalização

Cores hexadecimais, frases com limites de 120/600 caracteres e mídias PNG, JPEG, GIF, WebP,
MP4 ou WebM de até 25 MB. Tipo é validado pelo conteúdo. SVG não é aceito. Cancelar restaura
a visita; Concluir mantém as alterações. Troca de projeto não troca o conjunto visual global.
O catálogo contém Início, Acompanhamento, Aprovação pendente, Alterações registradas e Trilha
concluída. Não existem momentos dos cinco passos pessoais ou de preparação do projeto.

## Configuração e segurança

- `PORT`: 1 a 65535, padrão 3000.
- `VIBES_HOST`: padrão 127.0.0.1.
- `VIBES_PUBLIC_HOST`: nome adicional aceito na validação de origem.
- `VIBES_DATA_DIR`: pasta pessoal alternativa.
- `VIBES_SHELL`: caminho do shell.
- `VIBES_PRODUCT_DIR`: definido pelo bootstrap para localizar o produto.
- `VIBES_DB_PATH` deixa de ser usado.

Sem autenticação: manter a escuta local. Exposição à rede mostra alerta permanente.
As rotas validam Host e Origin, sem CORS. Seleção de caminho é operação protegida.
Entrada de terminal é vinculada à sessão. Artefatos não executam HTML ou scripts.
O bootstrap bloqueia fetch externo e desativa telemetria; isso não restringe a rede da CLI.
O Vibes não escreve nos arquivos versionados dos projetos; a IA e os comandos do usuário
mantêm as permissões do próprio shell.

## Verificação

`npm run check` executa ESLint, Prettier e TypeScript; `verify` é equivalente. Build de produção
usa `npm run build`. Não há suíte automatizada nem integração contínua configurada.
O fluxo de validação deste escopo está no [plano](PLANO-MULTIPLOS-REPOSITORIOS.md).

A estrutura visual e os tokens estão em [DESIGN](DESIGN.md). Comportamento de produto está no
[PRD](PRD.md).
