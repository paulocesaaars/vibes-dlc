# Telas detalhadas: MVP do Vibes DLC

Base: `ideation/rough-mockups/wireframes.md`, `ideation/rough-mockups/user-flow.md`, `inception/user-stories/stories.md`, `inception/requirements-analysis/requirements.md`, `inception/practices-discovery/team-practices.md` e o protótipo `design/prototipo/Main.dc.html`.

**O protótipo é a referência visual em alta fidelidade.** Quem constrói segue dele as cores, a fonte, os espaços, os textos e as animações. Este documento cobre o que ele não mostra: o mapa de telas por história, os momentos com o terminal real e as telas novas. Os tokens estão em `design-system-mapping.md`, as interações em `interaction-spec.md` e a acessibilidade em `accessibility-checklist.md`.

## O que muda em relação ao protótipo

| Tela no protótipo | No produto | Origem |
|---|---|---|
| Terminal simulado, com a interface da CLI desenhada | Terminal real com xterm. O que a CLI desenha é dela | FR2.1, `TDD.md` |
| Momento "Abra a sua IA" (`nocli`) | Sai. O passo Enviar traz um lembrete fixo | FR3.5, FR9.4 |
| Personalização sem CLI | Entra a seção "Sua IA" | FR9.1 |
| Sem falha no repositório | Entra a tela de falha | FR11 |
| Sem IA parada | Entra a faixa em Acompanhar | FR8, RF Q1 |
| Sem demanda não ativa | Entra a faixa no topo da demanda | FR7.4, RF Q3 |
| Armazenamento do navegador | Dados em `.vibes/` | FR10.8 |
| Fontes do Google Fonts | Fontes do pacote, sem rede | NFR6 |

`RF Qn` é a pergunta n de `refined-mockups-questions.md`.

## Mapa de telas por história

| Tela | Histórias | Arte padrão |
|---|---|---|
| Início | US6.1 | `boasvindas` |
| Nova demanda, passo 1 | US2.1 | `nix` |
| Nova demanda, passo 2 | US2.1, US2.2 | `pergunta` |
| Nova demanda, passo 3 | US2.3, US3.4 | `comando` |
| Guia: Entender | US3.3 | `entender` |
| Guia: Enviar | US3.4, US3.7 | `comando` |
| Guia: Acompanhar | US3.5, US3.6 | `trabalhando` |
| Guia: pergunta registrada | US3.5 | `pergunta` |
| Guia: Revisar | US4.1 | `revisao` |
| Guia: Aprovar | US4.2 | `aprovar` |
| Guia: Conclusão | US4.3 | `conclusao` |
| Trilha | US5.2 | |
| Abas de consulta | US6.3 | |
| Personalizar | US3.7, US7.1, US7.2 | `nix` |
| Falha no repositório | US1.2 | `pergunta` |
| Sessão encerrada | US3.2 | `pergunta` |
| Alerta de exposição | US1.3 | |
| Terminal | US3.1, US3.2 | |

## Estrutura

Duas colunas: o guia à esquerda, com largura flexível, e o terminal à direita, com no mínimo 400 pixels e 38% da janela. Altura de toda a janela. Abaixo de 1180 pixels, as colunas se empilham. Recolhido, o terminal vira uma faixa de 48 pixels.

```
+---------------------------------------------------------+-----------------------+
| [logo] Vibes DLC                           Personalizar | MINGW64:/c/repo [>]   |
+----------+----------------------------------------------+ Encerrar sessão       |
| TRILHA   | Título da demanda    Guia Artefatos Unidades |                       |
| Fase  3  | Decisões Histórico                           | $ _                   |
|  (v) A   | [==][==][  ][  ][  ]   Passo 2 de 5          |                       |
|  (o) B   +----------------------------------------------+                       |
|  (-) C   | ARTE  | Vez da sua IA                        |                       |
|          |       | Título da instrução                  |                       |
|          |       | Texto da instrução                   |                       |
|          +----------------------------------------------+                       |
|          | Conteúdo do momento                          |                       |
|          +----------------------------------------------+                       |
|          | Texto de apoio                 [AÇÃO ÚNICA]  |                       |
+----------+----------------------------------------------+-----------------------+
```

## Telas novas

Os textos abaixo são a proposta para o que o protótipo não traz.

### Faixa da IA parada (US3.6)

Fica dentro de Acompanhar, entre a instrução e os artefatos. A tag de cima continua "Vez da sua IA", e a arte não muda.

```
+----------------------------------------------------------------------+
| ARTE | [Vez da sua IA]  Pode acompanhar daqui                        |
+----------------------------------------------------------------------+
| (i) Sem novidades nos arquivos há 12 minutos.                        |
|     Sua IA pode estar em um trabalho longo ou pode ter parado.       |
|     Confira o terminal. Se ela tiver parado, retome o trabalho.      |
|                                                [Retomar o trabalho]  |
+----------------------------------------------------------------------+
| Artefatos gravados: [arquivo 1] [arquivo 2] [esqueleto]              |
| Se a sua IA perguntar algo, responda no terminal.                    |
+----------------------------------------------------------------------+
```

- **Retomar o trabalho** abre o mesmo cartão de confirmação do passo Enviar, com `/aidlc`.
- **Outra CLI:** sem botão. O texto termina com "Se ela tiver parado, peça na sua CLI para retomar o AI-DLC."
- **Sessão encerrada:** vale o momento de sessão encerrada, sem faixa, porque o guia já sabe que a IA não está ali.

### Faixa de demanda não ativa (US6.2)

Fixa no topo da demanda, acima das abas, em todas elas.

```
+----------------------------------------------------------------------+
| (i) Esta não é a demanda ativa. Sua IA está trabalhando em "Demanda  |
|     A". Você pode consultar à vontade.      [Tornar esta demanda ativa]|
+----------------------------------------------------------------------+
```

- **Tornar esta demanda ativa** abre o cartão de confirmação com o comando `/aidlc intent <nome>`.
- **Passo Enviar:** o botão fica desativado, com o texto "Só a demanda ativa recebe comandos." visível ao lado.
- **Outra CLI:** sem botão, com o comando como referência.

### Falha no repositório (US1.2)

Substitui o Início. Arte `pergunta`. O terminal continua ao lado, exceto sem o Git Bash.

```
+----------------------------------------------------------------------+
| ARTE | Não consegui abrir o guia neste repositório                   |
|      | O que aconteceu, em uma frase                                 |
+----------------------------------------------------------------------+
| O que fazer:                                                         |
| 1. Primeira ação, com o comando para copiar                          |
| 2. Segunda ação                                                      |
|                                                    [Tentar de novo]  |
+----------------------------------------------------------------------+
```

| Caso | O que aconteceu | O que fazer |
|---|---|---|
| Sem AI-DLC | "Este repositório ainda não tem o AI-DLC." | Instalar o AI-DLC, conforme o `README` |
| Registro ilegível | "Não consegui ler `<caminho>`." | Conferir o arquivo no terminal e no Git |
| Sem Git Bash | "Não encontrei o Git Bash nesta máquina." | Instalar o Git for Windows ou configurar `VIBES_SHELL` |

O guia não envia esses comandos. A pessoa copia e cola, porque esta tela não tem etapa em andamento.

### Sua IA, em Personalizar (US3.7)

Nova seção, entre Cores e a lista do que fica fixo.

```
+----------------------------------------------------------------------+
| Sua IA                                                               |
| Qual CLI você usa no terminal?                                       |
| (o) Claude Code   ( ) Outra CLI                                      |
| Com outra CLI, o guia mostra o que fazer, e você digita os comandos. |
+----------------------------------------------------------------------+
```

### Enviar com outra CLI (US3.7)

Sem o cartão editável. Sem ação principal, e o texto de apoio diz o que o guia está esperando.

```
+----------------------------------------------------------------------+
| Comando do AI-DLC para o Claude Code, como referência                |
| /aidlc --stage <etapa>                              [Copiar]         |
| Na sua CLI, peça a mesma etapa com o comando equivalente.            |
+----------------------------------------------------------------------+
| O guia acompanha pelos arquivos e avança sozinho.                    |
+----------------------------------------------------------------------+
```

### Esperando a demanda ser criada (US2.3)

Depois de enviar o comando da nova demanda. Arte `trabalhando`, com a instrução "A sua IA está criando a demanda" e o apoio "Ela aparece aqui quando o AI-DLC gravar o registro." Se o comando foi só colado, vale a instrução de pressionar Enter.

### Etapa pronta sem artefatos (AC4.1.1)

Quando a etapa tem `[?]` e não há nenhum artefato para listar, Revisar é pulado, e o guia vai direto a Aprovar, com "Esta etapa não gravou artefatos para revisar." A conclusão mostra "0 de 0" sem aviso. Um artefato que surge durante a revisão entra na lista e aumenta o total.

## Estados por tela

| Tela | Carregando | Vazio | Erro | Parcial |
|---|---|---|---|---|
| Início | Linhas em esqueleto | Instrução e Nova demanda | Tela de falha | Demanda com aviso na linha |
| Guia | Esqueleto no conteúdo | Sem etapa: instrução para aguardar a IA | Tela de falha, se for a demanda ativa | Sem sinal: instrução genérica |
| Acompanhar | Esqueleto nos arquivos ainda não gravados | "Nada gravado ainda" | Aviso do arquivo ilegível | Arquivos surgindo um a um |
| Revisar | Esqueleto no texto | Vai a Aprovar | Qual arquivo falhou, sem contar como revisado | Artefato novo entra na lista |
| Abas | Esqueleto | O que vai aparecer e em que etapa | Qual arquivo falhou e o que fazer | O que foi lido aparece, com aviso do resto |
| Personalizar | Prévia em esqueleto | Valores originais | Motivo, mantendo o anterior | |
| Terminal | "Abrindo o terminal..." | | Tela de falha ou sessão encerrada | Reconexão reexibe as últimas linhas |

## Conteúdo longo e casos de borda

- **Título de demanda longo:** quebra em até duas linhas e termina com reticências. O texto completo fica disponível em `title`.
- **Artefato grande:** o texto rola dentro do cartão, e o botão de ação fica fixo na faixa inferior.
- **Caminho longo:** quebra em qualquer caractere, em JetBrains Mono.
- **Uma etapa ou uma demanda:** o singular é usado em "1 etapa" e "1 de 1".
- **Muitas demandas:** a lista rola, na ordem de atualização mais recente, com a ativa primeiro.

## Assumptions & Open Questions

- [assumption] Os textos das telas novas são propostas, e o teste com uma pessoa nova (CP2) pode ajustá-los.
- [assumption] O comando `/aidlc intent <nome>` foi citado a partir da documentação do framework instalado e deve ser confirmado na primeira fatia.
- [open] O sinal de pedido de alterações ainda é hipótese, e a tela segue AC4.2.4 enquanto isso.
