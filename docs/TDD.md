# TDD — Vibes DLC (Guia do AI-DLC)

## Stack
Stack proposta a partir do PRD. A premissa é não instalar outros sistemas: nada de
banco, fila ou serviço para subir além do próprio app. Pacotes npm são aceitos.

| Camada | Escolha | Por quê |
|--------|---------|---------|
| Linguagem | TypeScript sobre Node.js 22.13 ou superior | Uma só linguagem na interface e no servidor. A versão mínima traz o SQLite embutido. |
| Web e backend | Next.js 16 (App Router) | A interface e as rotas do servidor ficam em uma só aplicação, iniciada pelo próprio Next. |
| Banco de dados | SQLite pelo módulo embutido `node:sqlite`, em um arquivo local | Não precisa de servidor nem de pacote. Se o módulo embutido não atender, `better-sqlite3` é a alternativa. |
| Acesso a dados | SQL direto, com migrações em arquivos `.sql` numerados | O esquema é pequeno, e dispensa ORM. |
| Terminal no navegador | `@xterm/xterm` na interface | É o mesmo componente usado pelo terminal do VS Code. |
| Terminal no servidor | `node-pty` | Abre um pseudo-terminal real com o shell do usuário, o que as CLIs de IA interativas exigem. |
| Fontes | `@fontsource/nunito` e `@fontsource/jetbrains-mono` | Ficam no pacote. O protótipo carrega do Google Fonts, mas o produto não faz chamadas de rede. |
| Validação | Zod | Valida configuração e entrada das rotas. |
| Autenticação | Nenhuma | O app roda na máquina do usuário e escuta somente em `127.0.0.1`. |
| Instalação | `npm install` e `npm run dev` ou `npm run build && npm start` | Atende o requisito 9 do PRD. |

Não há SDK de IA, chave de API, integração com GitHub, deploy nem worker: a IA é a CLI que o usuário
roda no terminal.

## Arquitetura
A aplicação é um único processo Next.js, com um gerenciador de terminal em memória
e um leitor dos arquivos do AI-DLC. O guia fica em uma subpasta própria do repositório
AI-DLC do usuário, e o diretório de trabalho do terminal é a raiz desse repositório.

```
Navegador ──(xterm.js)──> rotas /api/terminal ──> TerminalManager ──> node-pty ──> shell ──> CLI de IA
    │                                                                                          │
    └──> telas ──> núcleo ──> SQLite (.vibes/vibes.db)                                         │
                     ^                                                                         │
                     └── leitor do AI-DLC <──── arquivos em aidlc/spaces/.../intents/ <────────┘
```

O fluxo funciona assim:
1. O guia explica a etapa atual e mostra o comando do AI-DLC dela.
2. O usuário revisa o comando e confirma. O painel o grava no terminal como se
   tivesse sido digitado.
3. A CLI de IA trabalha e conversa com o usuário no próprio terminal. Perguntas e
   decisões acontecem ali.
4. O AI-DLC grava estado e artefatos nos arquivos. O guia os detecta, os apresenta
   para revisão, um por vez, e atualiza o passo.
5. O usuário aprova a etapa no gate do AI-DLC, no terminal. O guia lê o registro
   da aprovação, mostra a conclusão e libera a etapa seguinte.

A fonte da verdade do andamento são os arquivos do AI-DLC, não a saída do
terminal. O painel não interpreta o texto que a CLI imprime, o que o mantém
independente da ferramenta de IA usada.

## Componentes
- **`core`:** máquina de estados das demandas e dos passos do guia, e regra de
  liberação da etapa seguinte. Não conhece Next.js, SQLite nem o terminal.
- **`terminal`:** `TerminalManager`, que mantém as sessões `node-pty` vivas no
  processo, guarda um buffer das últimas linhas para reconectar o navegador e
  expõe `write`, `resize` e `kill`.
- **`aidlc`:** lê o intent ativo (cursor `aidlc/spaces/<space>/intents/active-intent`),
  o `aidlc-state.md` e os artefatos de `<record>/<fase>/<etapa>/`, e traduz o
  conteúdo para o modelo do `core`. A lista de etapas (33, com slug, fase, agent
  líder e artefatos produzidos) e os níveis vêm de
  `.claude/tools/data/stage-graph.json`. Também monta o comando de cada etapa. Só lê
  arquivos e executa comandos de leitura, como `aidlc engine log answers`, e não
  escreve nesses arquivos. Uma demanda do painel corresponde a um intent do AI-DLC.
- **`guide`:** conteúdo do guia em português: nomes das fases, etapas, artefatos e
  agentes, descrição de cada etapa, lista do que conferir por fase e frases padrão
  de cada momento. É dado estático, sem acesso a arquivos do AI-DLC.
- **`triage`:** sugere o nível do fluxo a partir de regras locais (palavras-chave na
  descrição), com o motivo, e gera o comando que pede à CLI de IA a análise da
  demanda. Não chama modelo.
- **`customization`:** valida, salva e restaura as personalizações, e calcula as
  cores derivadas e os avisos de contraste.
- **`db`:** esquema, migrações e acesso ao SQLite. É o único módulo que toca o
  banco.
- **`config`:** leitura e validação da configuração, com Zod.
- **`web`:** telas e rotas. Faz entrada, saída e delegação ao `core`.

## Guia
O layout tem duas colunas. A da esquerda traz o título, a trilha e o conteúdo do
guia. A da direita é o terminal, de cima a baixo. Abaixo de 1180 px, as colunas se
empilham.

**Telas:** início, nova demanda (três passos), guia da demanda e personalizar. O guia
da demanda tem as abas de consulta Artefatos, Unidades e ciclos, Decisões e Histórico,
com um botão para voltar ao guia.

**Passos de cada etapa e de onde vem cada sinal:**

| Passo | Momento | Sinal | Confiança |
|-------|---------|-------|-----------|
| Entender | `intro` | Etapa atual no AI-DLC, e o usuário ainda não seguiu adiante | Arquivos e SQLite |
| Enviar | `ready`, `pasted` | Comando ainda não enviado, ou só colado | SQLite |
| Acompanhar | `running` | Comando enviado e artefatos surgindo no diretório da etapa | Arquivos |
| Acompanhar | `question` | `aidlc engine log answers --stage <etapa>` lista a pergunta em `open` | Confirmado, para perguntas que o AI-DLC registra |
| Revisar | `review` | Marca `[?]` na etapa e evento `STAGE_AWAITING_APPROVAL`, com artefatos não abertos | Confirmado; os artefatos abertos vêm do SQLite |
| Aprovar | `approve`, `revising` | Marca `[?]` com todos os artefatos abertos, ou marca `[R]` | `[?]` confirmado; `[R]` a validar |
| Conclusão | `syncing`, `celebrate` | Aprovação gravada em `<record>/audit/` | Arquivos |

**Momentos do guia:** são 17, cada um com imagem ou vídeo e frases: início, os três
passos de nova demanda, os da tabela acima, trilha concluída, demanda já concluída
e sessão encerrada. A faixa inferior tem uma ação principal por momento, ou
diz o que está sendo aguardado.

**Revisão:** um artefato é exibido por vez, como texto, com a lista do que conferir
da fase. Marcar como revisado grava no SQLite. Se o hash do arquivo mudar, a marcação
cai e o artefato volta a pedir revisão.

**Movimento:** entradas suaves, barras de progresso e blocos de carregamento nos
arquivos ainda não gravados. A interface usa `transform` e `opacity` e respeita
`prefers-reduced-motion`.

## Terminal
- **Transporte:** a saída do terminal chega ao navegador por Server-Sent Events, e
  a entrada (teclas, redimensionamento) vai por `POST`. Isso evita servidor
  customizado e WebSocket, e o app inicia com o `next` padrão.
- **Ciclo de vida:** o processo `node-pty` pertence ao servidor, e não à página.
  Recarregar o navegador ou recolher o terminal mantém a sessão, e reconectar reexibe
  o buffer. A sessão termina quando o usuário a encerra ou o servidor para.
- **Shell:** usa o Git Bash no Windows e `$SHELL` nos demais sistemas, com `cwd` na
  raiz do repositório. A ordem é `VIBES_SHELL` e depois o `bash.exe` da instalação do
  Git. Sem Git Bash, o painel mostra como instalar ou configurar o `VIBES_SHELL`, sem
  cair para PowerShell ou `cmd`, porque há ambientes corporativos que só permitem o
  Git Bash.
- **Aparência:** tema do xterm próximo do Git Bash: fundo `#000000`, texto `#CCCCCC`,
  cores ANSI do mintty e fonte Consolas. A barra de título mostra
  `MINGW64:/c/caminho/do/repo`. O que a CLI desenha, como caixas, cores e menus, é da
  própria CLI: o produto não reproduz essa interface, como o protótipo faz para
  simular.
- **Recolher e expandir:** um botão reduz o terminal a uma faixa de 48 px, sem afetar
  a sessão. Ele reabre sozinho ao enviar um comando e quando o guia precisa da ação
  do usuário no terminal.
- **Envio de comando:** o painel só escreve no terminal depois da confirmação do
  usuário, e registra o texto enviado. "Confirmar e executar" envia com `Enter`;
  "Colar sem executar" envia sem `Enter`, e o usuário o pressiona no terminal. O
  histórico contém só o que o painel enviou, porque os comandos digitados à mão
  exigiriam interpretar o terminal.
- **Dev e HMR:** o `TerminalManager` fica em `globalThis` para sobreviver ao
  recarregamento a quente do Next.
- **Empacotamento:** `node-pty` é módulo nativo e entra em
  `serverExternalPackages` no `next.config`.

## Identidade visual
As cores padrão vêm da interface do projeto Nix (`docs/DESIGN.md` do repositório
`paulocesaaars/nix`).

| Cor personalizável | Padrão | Uso |
|--------------------|--------|-----|
| Logo e título | `#FF385C` | Fundo do logo e nome Vibes DLC |
| Cor principal | `#FF385C` | Botões, progresso e destaques |
| Texto | `#222222` | Títulos e texto principal |
| Texto de apoio | `#6A6A6A` | Rótulos e descrições |
| Fundo | `#FFFFFF` | Página e cartões |
| Preenchimentos | `#F7F7F7` | Áreas leves e fase atual |
| Bordas | `#DDDDDD` | Linhas e divisórias |
| Sucesso | `#04694A` | Etapas concluídas |

As cores viram variáveis CSS na raiz da aplicação. A paleta personalizável não afeta o
terminal. O tom ao passar o mouse e os fundos suaves são derivados da cor escolhida.

O texto do botão principal é branco por padrão, com contraste de cerca de 3,3:1 sobre
`#FF385C`, abaixo de 4,5:1, por decisão registrada no PRD. Quando a cor principal é
personalizada, ele alterna entre branco e `#222222` pelo maior contraste.

**Fonte e formatos:** Nunito na interface e JetBrains Mono em código e caminhos, com
bordas de 2px e cantos de 12px, como no protótipo. O projeto Nix é a referência só das
cores.

**Logo:** `public/logo.svg`, em três camadas: fundo, branco e traços escuros. Na
interface, o SVG fica embutido em um componente, com o fundo na cor "Logo e título".
O favicon usa arquivos fixos (`public/favicon.ico` e `public/favicon-32.png`), que não
acompanham a personalização.

**Artes padrão:** ilustrações e animações em `public/guia/`, em WebP, e são as que o
protótipo usa, com a Nix e a família do autor, que autorizou o uso. Os originais em PNG
e MP4 ficam em `design/guia/`, fora do que o app serve, para gerar novas versões.

## Personalização
Salva em `.vibes/`, individual e fora do Git. O protótipo usa o armazenamento do
navegador, mas o produto usa SQLite e arquivos, porque esse armazenamento tem pouco
espaço para imagens e vídeos.

- **Frases:** título (até 90 caracteres) e frase (até 240) por momento. Texto vazio
  volta ao padrão. Marcações como `{etapa}`, `{descricao}`, `{nivel}` e `{motivo}` são
  trocadas ao exibir, e as frases são sempre renderizadas como texto.
- **Mídia:** PNG, JPEG, GIF, WebP, MP4 ou WebM, até 25 MB, em `.vibes/media/`. SVG não é
  aceito, porque pode conter script. O servidor confere o tipo pelo conteúdo do arquivo
  e o serve com `X-Content-Type-Options: nosniff`.
- **Cores:** valor hexadecimal `#rrggbb`. O produto avisa quando o contraste com o fundo
  fica abaixo de 4,5:1 nos textos e de 3:1 no título, mas não bloqueia.
- **Restaurar e cancelar:** cada item volta ao padrão, e "Restaurar tudo" pede
  confirmação. As mudanças valem na hora e são salvas; "Cancelar" volta ao estado de
  quando a tela foi aberta. "Concluir" e sair por outro caminho mantêm as mudanças.

## Dados
O banco é o arquivo `.vibes/vibes.db`, dentro do repositório, e o `.vibes/` fica no
`.gitignore`. O que precisa ser compartilhado com o time já está nos arquivos do
AI-DLC versionados no Git.

**Guarda:**
- passo atual do guia em cada demanda e artefatos marcados como revisados, ligados
  ao identificador do intent;
- notas e marcações do usuário sobre artefatos em revisão;
- comandos enviados ao terminal, com data e etapa;
- índice dos artefatos lidos, com o hash do conteúdo para detectar mudanças;
- personalização: cores, frases e referências às mídias em `.vibes/media/`.

**Não guarda:**
- o código do repositório, cuja fonte é o Git;
- a saída completa do terminal;
- chaves ou tokens de IA, que ficam com a CLI;
- usuários, senhas ou papéis;
- a demanda, seu nível e seu estado, que são sempre lidos dos arquivos do AI-DLC;
- aprovações e decisões, que ficam no registro do próprio AI-DLC e são apenas lidas.

## Interfaces
- **Interface web:** única interface do produto, em português (Brasil). Telas de início,
  nova demanda, guia da demanda e personalizar, com o terminal sempre ao lado.
- **Rotas HTTP internas:** `/api/terminal/*` (stream, entrada, redimensionar),
  `/api/demands/*`, `/api/aidlc/*` e `/api/customization/*` (cores, frases e mídia).
  Atendem somente a interface e não formam uma API pública.
- **Atualizações:** o servidor observa o diretório do AI-DLC e avisa o navegador
  por SSE quando o estado ou algum artefato muda.
- **Saídas:** nenhuma chamada de rede feita pelo produto, nem para fontes. A rede é
  usada apenas pela CLI de IA dentro do terminal.

## Configuração e segurança
- **Variáveis de ambiente:** todas opcionais, com padrão: `PORT` (3000),
  `VIBES_HOST` (`127.0.0.1`), `VIBES_DB_PATH` (`.vibes/vibes.db`) e `VIBES_SHELL`.
  Não há segredos.
- **Escuta local:** o servidor escuta somente em `127.0.0.1`. Esse é o único
  controle de acesso, já que não há autenticação. Mudar `VIBES_HOST` para outro
  endereço expõe um shell à rede: o app deve registrar um aviso claro e mostrar um
  alerta permanente na interface.
- **Origem das requisições:** as rotas do terminal e de personalização rejeitam
  requisições cujo `Origin` ou `Host` não seja o do próprio app. Isso impede que uma
  página aberta em outra aba dispare comandos no terminal (CSRF e DNS rebinding).
- **Confirmação:** nenhum comando vai ao terminal sem ação explícita do usuário.
- **Aprovação:** o gate é do AI-DLC. O `core` só libera o comando da etapa
  seguinte quando o registro do AI-DLC mostra a etapa atual aprovada.
- **Conteúdo não confiável:** os artefatos podem conter texto malicioso vindo do
  repositório. O painel os exibe como texto, sem executar HTML nem scripts, e
  nunca os envia ao terminal sem passar pela confirmação.
- **Limite de escrita da IA:** o produto não escreve nos arquivos versionados do
  repositório, só em `.vibes/`. A escrita é da CLI de IA, sob o controle e as
  permissões que o usuário configurou nela. A proteção de branch e a revisão de PR
  ficam no Git do time.

## Decisões técnicas
| Decisão | Alternativa afastada | Motivo |
|---------|----------------------|--------|
| A IA roda como CLI no terminal do usuário | Managed Agents ou API da Anthropic | Funciona com qualquer IA, dispensa chave de API no produto e reaproveita a assinatura que o usuário já tem. |
| SQLite embutido (`node:sqlite`) | PostgreSQL | Elimina o serviço externo e cabe em um arquivo local. O volume de uma pessoa não exige mais. |
| Sem autenticação, escuta em `127.0.0.1` | Auth.js com GitHub | O app roda na máquina do usuário. O risco passa a ser exposição de rede, tratado por escuta local e checagem de origem. |
| Saída do terminal por SSE e entrada por `POST` | WebSocket com servidor customizado | Mantém o `next` padrão como comando de execução. Se a latência incomodar, a troca fica isolada no módulo `terminal`. |
| Estado lido dos arquivos do AI-DLC | Interpretar a saída do terminal | A saída varia por ferramenta e versão. Os arquivos são estáveis e versionados. |
| Confirmação humana antes de cada comando | Envio automático | Mantém a supervisão do PRD e evita executar texto vindo de artefatos não confiáveis. |
| Sem integração com GitHub | GitHub App | O PR e a branch são feitos pela CLI de IA. Reduz a superfície e a configuração. |
| Sem worker nem fila | Processo de segundo plano | Não há mais consulta a sessões remotas nem a pipelines. O observador de arquivos roda no próprio processo web. |
| Guia passo a passo | Painel com abas | Quem começa não sabe o que fazer em cada etapa. As abas continuam para consulta. |
| Git Bash no Windows, sem alternativa automática | `COMSPEC` ou PowerShell | Há ambientes corporativos que só permitem o Git Bash, e os comandos do fluxo ficam iguais nos sistemas. |
| Personalização em `.vibes/` | Armazenamento do navegador | Comporta vídeos e sobrevive à limpeza de dados do navegador. |
| Logo em SVG embutido | Imagem fixa | Permite trocar a cor do logo por variável CSS, sem gerar arquivos. |
| Mídia enviada sem SVG | Aceitar qualquer imagem | SVG pode conter script. O logo é o único SVG, e vem do próprio produto. |

## Pontos a validar
- **Sinais do guia:** em execução real (`FEEDBACK-AIDLC.md`), a pergunta registrada, o
  gate aberto, a etapa em andamento e a aprovação têm sinal nos arquivos e nos comandos
  de leitura do AI-DLC. Com o gate aberto, `**Status**` continua `Running`, então o
  passo vem da marca da etapa, não desse campo. Falta confirmar `[R]`, o comportamento
  na Construção e a retomada de sessão. Quando a IA perguntar sem registrar, o guia usa
  uma instrução genérica, como "Se a sua IA perguntar algo, responda no terminal", e
  esse momento não reabre o terminal sozinho.
- **Comando colado:** o painel não sabe quando o usuário pressiona Enter, e só percebe
  a execução pelos arquivos. "Retirar do terminal" depende de como cada CLI trata a
  linha de entrada (por exemplo, `Ctrl+U`). Se isso não for confiável, a opção sai do
  produto.
- **Git Bash com `node-pty`:** confirmar no Windows o funcionamento com ConPTY, os
  argumentos de inicialização, o caminho do `bash.exe` e as CLIs interativas.
- O `node-pty` é um pacote npm com parte nativa. Confirmar que o `npm install`
  funciona sem compilação manual, primeiro no Windows com Git Bash, que é o que o MVP
  verifica; macOS e Linux ficam para depois do MVP. Se falhar, a
  alternativa é o `child_process` sem PTY, com perda de recursos das CLIs
  interativas.
- O `node:sqlite` pode estar marcado como experimental na versão de Node suportada.
  É preciso confirmar o estado e, se necessário, adotar o `better-sqlite3`.
- Mapear as mudanças de formato do estado, do registro de auditoria
  (`<record>/audit/`) e dos artefatos, com base no intent em execução, para o leitor
  `aidlc` não quebrar com mudanças do framework.
- Os comandos mudam por CLI de IA: `/aidlc` e `/aidlc-<etapa>` são comandos do
  Claude Code, e o guia promete funcionar com outras. Definir um modelo de comando por
  CLI, para Codex, Devin e outras, e a escolha da CLI no guia. O protótipo ainda não
  tem essa escolha. No MVP, os comandos prontos são só para o Claude Code.
- **Idioma:** o AI-DLC pode mostrar opções fixas em inglês nos gates, como `Approve`.
  O guia deve usar instruções que continuem corretas nesse caso.
- Se o SSE para a saída do terminal der atraso perceptível com CLIs de saída
  intensa, migrar o transporte para WebSocket.
