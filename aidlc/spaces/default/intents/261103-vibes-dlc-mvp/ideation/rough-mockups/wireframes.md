# Esboços de tela: MVP do Vibes DLC

Base: `ideation/intent-capture/intent-statement.md`, `ideation/scope-definition/scope-document.md`, `ideation/scope-definition/intent-backlog.md`, `PRD.md` e o protótipo `design/prototipo/Main.dc.html`.

O protótipo continua sendo a referência de textos, cores, artes e comportamento. Estes esboços registram a estrutura de cada tela e o que muda em relação a ele. O fluxo está em `user-flow.md`.

## O que muda em relação ao protótipo

| Mudança | Motivo |
|---|---|
| Sai o momento "Abra a sua IA" e o botão para abri-la. O passo Enviar traz um lembrete fixo | O painel não sabe se a IA está aberta sem interpretar o terminal (Q1) |
| Entra a seção "Sua IA" na personalização | A pessoa informa se usa outra CLI (Q2 e Q6) |
| Entra o passo Enviar para outra CLI, com orientação e sem envio | Os comandos prontos são só para o Claude Code (Q3 de `scope-definition-questions.md`) |
| Entra a tela de falha no repositório, com o terminal disponível | O protótipo não mostra esses casos (Q3) |
| O terminal simulado vira um terminal real | Ele não reproduz a interface da CLI (`scope-document.md`) |

## Organização das telas

```
Início
  +-- Nova demanda (descrever > escolher o nível > confirmar o comando)
  +-- Demanda
  |     +-- Guia (Entender > Enviar > Acompanhar > Revisar > Aprovar > Conclusão)
  |     +-- Artefatos
  |     +-- Unidades e ciclos
  |     +-- Decisões
  |     +-- Histórico
  +-- Personalizar (imagens, vídeos e frases > cores > Sua IA)
  +-- Falha no repositório (substitui o Início quando o guia não pode funcionar)
```

## E0. Estrutura geral

O terminal ocupa toda a lateral direita, do topo ao rodapé, e pode ser recolhido sem encerrar a sessão. A trilha aparece só dentro de uma demanda.

```
+----------------------------------------------------+---------------------+
| logo vibes dlc                        Personalizar | MINGW64:/c/repo     |
+----------------+-----------------------------------+ [<] Encerrar sessão |
| TRILHA         | Título da demanda   Guia Artefatos|                     |
| Preparação   3 | Unidades  Decisões  Histórico     | $ claude            |
| Ideação      5 | [==][==][  ][  ][  ] Passo 2 de 5 |                     |
|  ok Intenção   +-----------------------------------+ saída real da CLI   |
|  >> Você está  | ARTE | Vez de quem                |                     |
|     aqui       |      | Título da instrução        |                     |
|  -- Bloqueada  |      | Texto da instrução         |                     |
|                +-----------------------------------+                     |
|                | Conteúdo do momento               |                     |
|                |                                   |                     |
|                +-----------------------------------+                     |
|                | Texto de apoio      [Ação única]  | $ _                 |
+----------------+-----------------------------------+---------------------+
```

Com a janela abaixo de 1180 pixels de largura, o terminal fica embaixo do guia (Q4). Recolhido, ele vira uma faixa com o nome "Terminal".

Acessibilidade: h1 é o título da demanda; regiões header, nav, main e section do terminal; o teclado começa no logo.

## E1. Início

```
+--------------------------------------------------------------------+
| ARTE | Olá! Eu te guio em cada etapa                               |
|      | Você decide e aprova. A sua IA faz o trabalho no terminal.  |
+--------------------------------------------------------------------+
| Demanda A                                         Revisar e aprovar|
| Produto mínimo - Esboços de tela  [=======     ]                   |
+--------------------------------------------------------------------+
| Demanda B                                            IA trabalhando|
| Correção de erro - Análise de requisitos  [==    ]                 |
+--------------------------------------------------------------------+
|                                                   [Nova demanda]   |
+--------------------------------------------------------------------+
```

- **Vazio:** sem demandas, só a instrução e o botão Nova demanda.
- **Carregando:** linhas em esqueleto enquanto os arquivos são lidos.
- **Parcial:** uma demanda cujo registro não pode ser lido aparece com o aviso e o que fazer.

Acessibilidade: h1 é a instrução; região main com a lista de botões; o teclado começa no logo.

## E2. Nova demanda

Três passos, com uma pergunta por vez. Cancelar volta ao Início.

```
+--------------------------------------------------------------------+
| 1. O que precisa ser feito?                                        |
| [ texto livre                                                    ] |
|                                     [Cancelar] [Continuar]         |
+--------------------------------------------------------------------+
| 2. Sugiro o nível Correção de erro, porque a descrição fala em ... |
| ( ) Nível sugerido, com descrição e quantidade máxima de etapas    |
| [Ver os outros níveis]  [Pedir análise à sua IA]                   |
|                                     [Cancelar] [Continuar]         |
+--------------------------------------------------------------------+
| 3. Comando que vai para a sua IA                                   |
| [ comando editável                                               ] |
| Lembrete: a sua IA precisa estar aberta no terminal.               |
|                     [Cancelar] [Colar sem executar] [Enviar agora] |
+--------------------------------------------------------------------+
```

- **Outra CLI:** o passo 3 mostra a orientação de E3.2 no lugar dos botões de envio.
- **Erro:** descrição vazia desativa Continuar, com o motivo visível.

Acessibilidade: h1 é a pergunta do passo; região main com formulário; o teclado começa no campo do passo.

## E3. Etapa da demanda: aba Guia

A barra mostra os cinco passos. Cada momento tem uma instrução, de quem é a vez e, no máximo, uma ação principal.

### E3.1 Entender

```
+--------------------------------------------------------------------+
| Etapa 1.6 | Título e descrição do que a etapa faz                  |
| Como esta etapa funciona: 1. ... 2. ... 3. ...                     |
| Depois vem a próxima etapa, quando o AI-DLC registrar a aprovação. |
|                                          [Entendi, continuar]      |
+--------------------------------------------------------------------+
```

### E3.2 Enviar

```
+--------------------------------------------------------------------+
| Comando que vai para a sua IA                                      |
| [ comando editável                                               ] |
| Lembrete: a sua IA precisa estar aberta no terminal.               |
|                              [Colar sem executar] [Enviar agora]   |
+--------------------------------------------------------------------+

Com outra CLI escolhida em "Sua IA":

+--------------------------------------------------------------------+
| Comando do AI-DLC para o Claude Code, como referência              |
| Na sua CLI, peça a mesma etapa com o comando equivalente.          |
| Digite o comando no terminal. O guia acompanha pelos arquivos.     |
+--------------------------------------------------------------------+
```

- **Comando colado:** instrução para pressionar Enter no terminal, sem ação principal.
- **Sessão encerrada:** instrução para abrir uma nova sessão, e o envio fica desativado.

### E3.3 Acompanhar

```
+--------------------------------------------------------------------+
| Vez da sua IA | Pode acompanhar daqui                              |
| Artefatos gravados: [arquivo 1] [arquivo 2] [esqueleto]            |
| Se a sua IA perguntar algo, responda no terminal.                  |
| A sua IA está trabalhando...                                       |
+--------------------------------------------------------------------+

Com pergunta registrada no AI-DLC:

+--------------------------------------------------------------------+
| Sua vez | A sua IA tem uma pergunta                                |
| Ela precisa de uma decisão sua. Responda no terminal ao lado.      |
+--------------------------------------------------------------------+
```

- **Sem sinal:** a instrução genérica sobre perguntas fica sempre visível, porque a IA pode perguntar sem registrar.
- **Resumo aguardando confirmação:** usa o mesmo momento de pergunta registrada.

### E3.4 Revisar

```
+--------------------------------------------------------------------+
| Sua vez - 1 de 3 revisados | Leia antes de aprovar                 |
| [arquivo 1 ok] [arquivo 2] [arquivo 3]                             |
| caminho/do/artefato.md                                             |
| conteúdo do artefato, com rolagem                                  |
| O que conferir: item 1, item 2, item 3                             |
|                                       [Marcar como revisado]       |
+--------------------------------------------------------------------+
```

- **Artefato alterado depois de revisado:** ele volta a pedir revisão, com o aviso.

### E3.5 Aprovar

```
+--------------------------------------------------------------------+
| Sua vez | Agora é só aprovar                                       |
| Quem registra a aprovação é o AI-DLC, então ela é dada no terminal.|
| Falta revisar 1 artefato. (só quando houver)                       |
| Sem botão de aprovar: a resposta é dada no terminal.               |
+--------------------------------------------------------------------+
```

- **Pedido de alterações:** instrução para dizer no terminal o que deve mudar.
- **Lendo a aprovação:** instrução de espera até o AI-DLC registrar.

### E3.6 Conclusão

```
+--------------------------------------------------------------------+
|                         ARTE DA CONCLUSÃO                          |
|                         Etapa concluída!                           |
|               [==========        ] 4 de 19 etapas                  |
|     3 de 3 artefatos revisados. Aviso quando faltar algum.         |
|                                     [Ir para a próxima etapa]      |
+--------------------------------------------------------------------+
```

- **Trilha concluída:** a mesma tela, sem próxima etapa, com acesso ao histórico.

Acessibilidade das telas E3: h1 é o título da demanda e h2 é a instrução; região main e aviso em `role="status"`; o teclado começa nas abas.

## E4. Abas de consulta

```
+--------------------------------------------------------------------+
| ARTEFATOS: lista por etapa > conteúdo > suas notas (em .vibes/)    |
| UNIDADES E CICLOS: nome, tipo, objetivo, dependências e situação   |
| DECISÕES: tipo, etapa, data e texto, lidos do registro do AI-DLC   |
| HISTÓRICO: data, etapa, modo e comando enviado pelo painel         |
+--------------------------------------------------------------------+
```

- **Vazio:** cada aba diz o que vai aparecer ali e em que etapa.
- **Erro:** quando um arquivo não pode ser lido, a aba mostra qual é e o que fazer.

Acessibilidade: h2 é o título da aba; abas com `role="tablist"`; o teclado entra pela aba selecionada.

## E5. Personalizar

```
+--------------------------------------------------------------------+
| Imagens, vídeos e frases                                           |
| Momento do guia [ lista ]                                          |
| [prévia] [Trocar imagem ou vídeo]  Título [    ]  Frase [        ] |
|          [Usar a original]         [Usar a frase original]         |
+--------------------------------------------------------------------+
| Cores: principal, logo e título, fundo e demais cores              |
| Aviso quando o contraste ficar baixo    [Usar as cores originais]  |
+--------------------------------------------------------------------+
| Sua IA                                                             |
| ( ) Claude Code (padrão)   ( ) Outra CLI                           |
| Com outra CLI, o guia explica o que fazer, e você digita o comando.|
+--------------------------------------------------------------------+
| Ficam fixos: a trilha e as etapas, os comandos, o logo e o terminal|
|                                         [Cancelar] [Salvar]        |
+--------------------------------------------------------------------+
```

- **Erro:** arquivo em formato inválido ou acima do limite mostra o motivo e mantém o anterior.
- **Cancelar:** desfaz o que mudou naquela visita.

Acessibilidade: h1 é a instrução e h2 nomeia cada seção; região main com formulários; o teclado começa em Momento do guia.

## E6. Falha no repositório

Substitui o Início quando o guia não pode funcionar. O terminal continua ao lado, exceto quando o problema é o próprio Git Bash.

```
+--------------------------------------------------------------------+
| ARTE | Não consegui abrir o guia neste repositório                 |
|      | O que aconteceu, em uma frase                               |
| O que fazer:                                                       |
| 1. Primeira ação, com o comando para colar no terminal             |
| 2. Segunda ação                                                    |
|                                          [Tentar de novo]          |
+--------------------------------------------------------------------+
```

| Caso | O que a tela explica | Terminal |
|---|---|---|
| Repositório sem o AI-DLC | Como instalar o AI-DLC neste repositório | Disponível |
| Registro do AI-DLC que não pode ser lido | Qual arquivo falhou e como conferir | Disponível |
| Git Bash não encontrado | Como instalar ou configurar `VIBES_SHELL` (`TDD.md`) | Indisponível |

Acessibilidade: h1 é o problema; região main; o teclado começa em Tentar de novo.

## E7. Alerta de exposição

Quando o servidor escuta fora de `127.0.0.1`, uma faixa fixa aparece no topo de todas as telas, com o texto do protótipo. Ela não pode ser fechada.

Acessibilidade: `role="alert"`, antes do header; não recebe foco.

## Assumptions & Open Questions

- [assumption] Os textos de E6 e da orientação para outra CLI são provisórios: o protótipo não os traz.
- [assumption] A contagem de etapas em E3.6 vem dos arquivos do AI-DLC, conforme `scope-document.md`.
- [open] A resposta Q6 exige ajustar no `PRD.md` a regra de que a personalização não muda o conteúdo. Essa mudança ainda precisa do aval do autor.
- [open] Sem meta formal de acessibilidade (Q5), o contraste do botão principal continua abaixo do mínimo, como risco já aceito no `PRD.md`.
