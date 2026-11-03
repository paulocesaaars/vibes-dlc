# Histórias de usuário: MVP do Vibes DLC

Base: `inception/requirements-analysis/requirements.md`, `inception/practices-discovery/team-practices.md` e `personas.md`. As histórias seguem a jornada. Todas fazem parte do MVP.

**Prioridades:** Must Have é o que os critérios de pronto CP1, CP2 e CP3 ou uma regra rígida do projeto exigem. Should Have é o restante, e serve para indicar o que cortar primeiro, com decisão sua. O limite final fica para o planejamento de entrega.

**Primeira fatia:** US1.1, US3.1, US3.2, US3.3 e US3.4 cobrem os quatro itens de `scope-document.md`, nos caminhos principais.

| Grupo | Histórias | Must Have | Should Have |
|---|---|---|---|
| 1. Instalar | US1.1 a US1.3 | US1.1, US1.2, US1.3 | |
| 2. Registrar demanda | US2.1 a US2.3 | US2.1, US2.3 | US2.2 |
| 3. Conduzir etapa | US3.1 a US3.7 | US3.1 a US3.5 | US3.6, US3.7 |
| 4. Revisar e aprovar | US4.1 a US4.3 | US4.1, US4.2, US4.3 | |
| 5. Retomar | US5.1, US5.2 | US5.1, US5.2 | |
| 6. Consultar | US6.1 a US6.3 | US6.1 | US6.2, US6.3 |
| 7. Personalizar | US7.1, US7.2 | | US7.1, US7.2 |

## 1. Instalar

### US1.1 Instalar o guia no repositório

Como P2, quero instalar o guia em uma subpasta do meu repositório AI-DLC, para usá-lo sem instalar outros sistemas nem mexer no meu projeto.

**Prioridade:** Must Have. **Dependências:** nenhuma. **Requisitos:** FR12.1, FR12.2, FR12.3, FR12.4, FR12.5, FR12.6, NFR9, NFR12.

- **AC1.1.1** Dado um repositório AI-DLC com Node.js 22.13 ou superior e Git Bash, quando sigo o `README`, copio a subpasta e rodo `npm install` e um comando, então o painel abre em `127.0.0.1` sem erro, mesmo sem `.vibes/`.
- **AC1.1.2** Dado um repositório com `package.json` próprio, quando instalo o guia, então esse `package.json` e os demais arquivos existentes ficam iguais. A única edição é a de `.vibes/` no `.gitignore`, feita à mão por mim, conforme o `README`.
- **AC1.1.3** Dado um repositório em um caminho com espaços e acentos, quando abro o painel, então o guia acha a raiz do repositório, e o terminal abre nela.
- **AC1.1.4** Dado um Node.js anterior ao exigido, quando inicio o produto, então a mensagem mostra a versão exigida.
- **AC1.1.5** Dados salvos em `.vibes/`, quando atualizo o produto, então eles continuam disponíveis, e `.vibes/vibes.db` é copiado antes de migrar.

### US1.2 Saber o que fazer quando o guia não pode funcionar

Como P1, quero uma explicação clara quando o repositório tem um problema, para resolver sem procurar na documentação.

**Prioridade:** Must Have. **Dependências:** US1.1. **Requisitos:** FR11.1, FR11.2, FR11.4, FR11.5.

- **AC1.2.1** Dado um repositório sem o AI-DLC, quando abro o painel, então vejo como instalar, com o terminal disponível.
- **AC1.2.2** Dado um registro ilegível na demanda ativa, quando abro o painel, então vejo qual arquivo falhou e como conferir, com o terminal disponível.
- **AC1.2.3** Dado que o Git Bash não existe, quando abro o painel, então vejo como instalar ou configurar `VIBES_SHELL`, e o terminal não abre em outro shell.
- **AC1.2.4** Dado que corrigi o problema, quando clico em Tentar de novo, então o guia verifica de novo, sem reiniciar o servidor.

### US1.3 Usar o guia com segurança na minha máquina

Como P2, quero que o guia fique restrito à minha máquina e não escreva no meu código, para não abrir um shell à rede nem perder o controle do repositório.

**Prioridade:** Must Have. **Dependências:** US1.1. **Requisitos:** NFR3, NFR4, NFR6, NFR7, NFR13.

- **AC1.3.1** Dada a configuração padrão, quando o servidor inicia, então ele escuta só em `127.0.0.1`.
- **AC1.3.2** Dado `VIBES_HOST` com outro endereço, quando abro o painel, então vejo um alerta em todas as telas, que não pode ser fechado.
- **AC1.3.3** Dada uma requisição às rotas do terminal ou de personalização com `Origin` ou `Host` de fora, quando ela chega, então é rejeitada, e nada vai ao terminal.
- **AC1.3.4** Dado que a rede está desligada, quando uso o painel, então ele abre e funciona por completo, sem nenhuma chamada de rede do produto.
- **AC1.3.5** Dado o uso do produto, quando confiro o Git, então o produto não alterou arquivos versionados. Ele escreve só em `.vibes/`, sem chaves de IA nem a saída completa do terminal.

## 2. Registrar demanda

### US2.1 Descrever a demanda e escolher o nível

Como P1, quero descrever o que preciso e receber uma sugestão de nível com o motivo, para começar sem conhecer todos os níveis.

**Prioridade:** Must Have. **Dependências:** US1.1. **Requisitos:** FR1.1, FR1.2, FR1.3, FR1.4, FR1.7.

- **AC2.1.1** Dado o passo de descrição vazio ou só com espaços, quando olho para Continuar, então ele está desativado, com o motivo visível.
- **AC2.1.2** Dada a descrição "corrigir erro no login", quando continuo, então o guia sugere `bugfix` e mostra o motivo, sem nenhuma chamada a modelo. As demais regras e exemplos são fixados na construção, em uma tabela de descrições com o nível esperado.
- **AC2.1.3** Dado um nível sugerido, quando escolho outro, então o comando passa a usar o nível escolhido.
- **AC2.1.4** Dado qualquer passo, quando clico em Cancelar, então volto ao Início, e nada foi enviado ao terminal.

### US2.2 Pedir à IA uma análise do nível

Como P2, quero pedir à minha IA uma análise do nível, para ter uma segunda opinião em demandas ambíguas.

**Prioridade:** Should Have. **Dependências:** US2.1, US3.4. **Requisitos:** FR1.5, FR1.6.

- **AC2.2.1** Dado Claude Code em "Sua IA", quando clico em Pedir análise à sua IA, então vejo o comando para confirmar, e ele só vai ao terminal depois da confirmação.
- **AC2.2.2** Dada Outra CLI em "Sua IA", quando chego a esse passo, então vejo o pedido como referência para digitar, sem botão de envio.

### US2.3 Confirmar o comando e ver a demanda criada

Como P2, quero confirmar o comando da nova demanda e vê-la aparecer no Início, para saber que o trabalho começou.

**Prioridade:** Must Have. **Dependências:** US2.1, US3.4. **Requisitos:** FR1.1, FR1.8.

- **AC2.3.1** Dado o comando montado, quando confirmo, então o envio segue US3.4.
- **AC2.3.2** Dado que o AI-DLC ainda não gravou o registro, quando estou no guia, então ele diz que está esperando a IA criar a demanda.
- **AC2.3.3** Dado que o AI-DLC gravou o registro, quando ele aparece, então a demanda surge no Início, lida desse registro.

## 3. Conduzir etapa

### US3.1 Usar um terminal real ao lado do guia

Como P2, quero um terminal real no navegador, ao lado do guia, para usar a minha CLI de IA sem sair da ferramenta.

**Prioridade:** Must Have. **Dependências:** US1.1. **Requisitos:** FR2.1, FR2.2, FR2.4, NFR2.

- **AC3.1.1** Dado o Git Bash instalado, quando abro o painel, então o terminal roda o Git Bash, na raiz do repositório, e aceita uma CLI interativa.
- **AC3.1.2** Dado `VIBES_SHELL` configurado, quando abro o terminal, então ele usa esse shell. Sem essa variável, usa o `bash.exe` da instalação do Git.
- **AC3.1.3** Dada uma janela com pelo menos 1180 pixels de largura, quando vejo o painel, então o terminal ocupa toda a lateral direita. Abaixo disso, ele fica embaixo do guia.
- **AC3.1.4** Dado o terminal aberto na mesma máquina, quando digito, então o eco leva até 150 ms em 95% das teclas.

### US3.2 Manter a sessão do terminal

Como P2, quero que a sessão continue quando recarrego a página ou recolho o terminal, para não perder o trabalho da IA.

**Prioridade:** Must Have. **Dependências:** US3.1. **Requisitos:** FR2.3, FR2.5, FR2.6, FR2.7, FR2.8.

- **AC3.2.1** Dada uma sessão com a CLI em execução, quando recarrego a página, então a sessão continua, e as últimas linhas da saída reaparecem.
- **AC3.2.2** Dado o terminal aberto, quando o recolho e expando, então a sessão continua. Enviar um comando também reabre o terminal.
- **AC3.2.3** Dadas duas abas do painel, quando digito em uma, então a saída aparece nas duas, na mesma sessão.
- **AC3.2.4** Dada uma sessão encerrada por mim, quando chego ao passo Enviar, então o envio está desativado, e o guia pede para abrir uma nova sessão.
- **AC3.2.5** Dado que o servidor parou, quando ele volta, então o guia informa que a sessão anterior acabou e oferece abrir uma nova.

### US3.3 Ver em que etapa estou e o que ela faz

Como P1, quero ver a etapa atual, de quem é a vez e o que ela faz, para saber o que fazer agora sem ler a documentação.

**Prioridade:** Must Have. **Dependências:** US1.1. **Requisitos:** FR4.1, FR4.2, FR4.3, FR4.5, FR5.1, FR5.2, FR5.3, NFR8, NFR10.

- **AC3.3.1** Dado um intent ativo em `rough-mockups` com `[-]`, quando abro a demanda, então o guia mostra essa etapa e o passo, sem ler a saída do terminal.
- **AC3.3.2** Dado qualquer momento, quando olho o guia, então vejo uma instrução, de quem é a vez e, no máximo, uma ação principal.
- **AC3.3.3** Dado o passo Entender, quando abro a etapa, então vejo em português o que ela faz e como funciona.
- **AC3.3.4** Dado um nível com etapas puladas, quando vejo a barra e a contagem, então os números vêm dos arquivos do AI-DLC.
- **AC3.3.5** Dado o painel, quando o uso só com o teclado, então chego a todas as ações, e os estados não dependem só de cor.

### US3.4 Enviar o comando da etapa com confirmação

Como P2, quero ver, editar e confirmar o comando antes do envio, para manter a supervisão sobre o que a IA recebe.

**Prioridade:** Must Have. **Dependências:** US3.1, US3.3. **Requisitos:** FR3.1, FR3.2, FR3.3, FR3.4, FR3.5, FR3.6, FR3.8.

- **AC3.4.1** Dado o passo Enviar, quando não confirmo, então nada é escrito no terminal.
- **AC3.4.2** Dado um comando editado, quando clico em Enviar agora, então o texto editado é enviado com Enter e registrado com data, demanda, etapa e modo.
- **AC3.4.3** Dado um comando, quando clico em Colar sem executar, então o texto vai sem Enter, e o guia pede para pressionar Enter, sem afirmar que o comando foi executado.
- **AC3.4.4** Dado um duplo clique na confirmação, quando ele ocorre, então o comando é enviado uma vez e registrado uma vez.
- **AC3.4.5** Dado o passo Enviar, quando o vejo, então há um lembrete de que a minha IA precisa estar aberta no terminal.

### US3.5 Acompanhar a etapa enquanto a IA trabalha

Como P1, quero ver os artefatos surgirem e saber quando é a minha vez, para responder só quando preciso.

**Prioridade:** Must Have. **Dependências:** US3.3. **Requisitos:** FR4.4, FR4.7, FR5.4, FR5.5, FR5.9, NFR1.

- **AC3.5.1** Dado o painel aberto, quando um artefato é gravado, então ele aparece em até 3 segundos, sem recarregar a página.
- **AC3.5.2** Dada uma pergunta na lista `open` de `aidlc engine log answers`, quando o guia a lê, então indica que é a minha vez e pede a resposta no terminal.
- **AC3.5.3** Dada uma pergunta que a IA faz sem registrar, quando estou em Acompanhar, então a instrução "Se a sua IA perguntar algo, responda no terminal" continua visível.
- **AC3.5.4** Dado um resumo aguardando confirmação sem sinal confirmado, quando estou em Acompanhar, então o guia mantém a instrução genérica e não afirma nada que não possa confirmar.
- **AC3.5.5** Dado que o AI-DLC mostra opções fixas em inglês, como `Approve`, quando sigo a instrução do guia, então ela continua correta.

### US3.6 Saber que a IA pode ter parado

Como P2, quero um aviso quando os arquivos ficam muito tempo sem mudar, para não esperar à toa por uma sessão que parou.

**Prioridade:** Should Have. **Dependências:** US3.5. **Requisitos:** FR8.1, FR8.2, FR8.3, FR8.4.

- **AC3.6.1** Dada uma etapa com `[-]` e nenhuma mudança nos arquivos do AI-DLC por 10 minutos, quando estou em Acompanhar, então vejo o aviso de que a IA pode ter parado, com a orientação de conferir o terminal e retomar.
- **AC3.6.2** Dados 9 minutos sem mudança, quando estou em Acompanhar, então o aviso não aparece.
- **AC3.6.3** Dado o aviso visível, quando um arquivo muda, então ele some, e o texto nunca afirma que a IA parou.
- **AC3.6.4** Dado que recarrego a página aos 12 minutos sem mudança, quando ela abre, então o aviso continua, porque a contagem vem da data dos arquivos.
- **AC3.6.5** Dado o aviso, quando peço para retomar, então o comando só vai ao terminal depois da confirmação. Com outra CLI, vejo só a orientação.

### US3.7 Conduzir a etapa com outra CLI

Como P3, quero escolher que uso outra CLI e receber a orientação do que digitar, para seguir o guia sem o envio automático.

**Prioridade:** Should Have. **Dependências:** US3.3. **Requisitos:** FR9.1, FR9.2, FR9.3, FR9.4.

- **AC3.7.1** Dada a seção "Sua IA", quando a abro pela primeira vez, então Claude Code está selecionado.
- **AC3.7.2** Dada Outra CLI salva, quando chego a Enviar, então vejo o comando para o Claude Code como referência e a orientação, sem botão de envio.
- **AC3.7.3** Dada Outra CLI, quando o AI-DLC grava os arquivos, então o guia acompanha como no fluxo principal.
- **AC3.7.4** Dada qualquer escolha, quando uso o guia, então não há botão "Abrir a sua IA", e o guia não tenta detectar a CLI em uso.

## 4. Revisar e aprovar

### US4.1 Revisar um artefato por vez

Como P2, quero revisar os artefatos um a um, com o que conferir, para que a aprovação não vire formalidade.

**Prioridade:** Must Have. **Dependências:** US3.5. **Requisitos:** FR6.1, FR6.2, NFR5.

- **AC4.1.1** Dada uma etapa com `[?]`, quando entro em Revisar, então vejo um artefato por vez, com o caminho, a lista do que conferir e a contagem de revisados.
- **AC4.1.2** Dado um artefato com HTML ou script, quando ele é exibido, então aparece como texto, sem executar nada.
- **AC4.1.3** Dado um artefato revisado, quando o conteúdo dele muda, então ele volta a pedir revisão, com um aviso.

### US4.2 Aprovar ou pedir alterações no terminal

Como P1, quero saber que a aprovação é dada no terminal e ver o guia reagir, para não procurar um botão que não existe.

**Prioridade:** Must Have. **Dependências:** US4.1. **Requisitos:** FR4.6, FR5.6, FR6.3.

- **AC4.2.1** Dado o passo Aprovar, quando o vejo, então a instrução é responder no terminal, e não há botão de aprovar.
- **AC4.2.2** Dado que falta revisar um artefato, quando estou em Aprovar, então o guia diz quantos faltam, sem me impedir de aprovar.
- **AC4.2.3** Dado `GATE_APPROVED` e `[x]` no registro, quando o guia os lê, então passa à conclusão.
- **AC4.2.4** Dado um pedido de alterações, com a marca `[R]` ou `GATE_REJECTED` no registro, quando o guia o lê, então volta a Acompanhar, e a aprovação é pedida de novo. Esse sinal é confirmado na primeira fatia. Sem ele, o guia segue FR4.4 até a marca `[?]` voltar, sem afirmar que a etapa foi aprovada.

### US4.3 Ver a conclusão e seguir para a próxima etapa

Como P1, quero ver o progresso ao concluir e só então receber a próxima etapa, para saber que nada foi pulado.

**Prioridade:** Must Have. **Dependências:** US4.2. **Requisitos:** FR3.7, FR6.4, FR6.5.

- **AC4.3.1** Dada uma etapa aprovada, quando vejo a conclusão, então ela mostra o progresso da demanda e quantos artefatos foram revisados.
- **AC4.3.2** Dada uma aprovação sem revisar todos, quando vejo a conclusão, então há um aviso, sem bloquear.
- **AC4.3.3** Dada uma etapa ainda não aprovada, quando procuro o comando da seguinte, então ele não é oferecido.
- **AC4.3.4** Dada a última etapa, quando ela é aprovada, então vejo a trilha concluída, com acesso ao histórico.

## 5. Retomar

### US5.1 Reabrir o painel e continuar

Como P2, quero que o guia entenda o que mudou com o painel fechado, para continuar de onde a etapa está.

**Prioridade:** Must Have. **Dependências:** US3.3. **Requisitos:** FR4.8, FR4.9, FR4.10.

- **AC5.1.1** Dada uma etapa aprovada com o painel fechado, quando abro o painel, então o guia avisa o que mudou e mostra o momento atual.
- **AC5.1.2** Dado um arquivo sendo gravado, com a última entrada incompleta, quando o guia o lê, então mantém o último estado válido e lê de novo na próxima mudança, sem mostrar erro.
- **AC5.1.3** Dada uma entrada malformada entre entradas boas, ou um campo desconhecido, quando o guia lê o registro, então usa o restante e não cai.

### US5.2 Ver a trilha das etapas

Como P1, quero ver todas as etapas por fase, para entender onde estou no caminho.

**Prioridade:** Must Have. **Dependências:** US3.3. **Requisitos:** FR5.7, FR5.8.

- **AC5.2.1** Dada uma demanda, quando vejo a trilha, então as etapas aparecem por fase e se distinguem como concluída, atual, bloqueada ou pulada, sem depender só de cor.
- **AC5.2.2** Dada uma etapa concluída, quando a abro na trilha, então vejo os artefatos dela.
- **AC5.2.3** Dada uma etapa bloqueada, quando a seleciono, então ela não oferece nenhum comando.

## 6. Consultar

### US6.1 Ver minhas demandas no Início

Como P2, quero ver todas as demandas, com a etapa e de quem é a vez, para escolher onde continuar.

**Prioridade:** Must Have. **Dependências:** US3.3. **Requisitos:** FR7.1, FR11.3, FR11.6.

- **AC6.1.1** Dadas demandas no repositório, quando abro o Início, então cada uma mostra nível, etapa atual, progresso e de quem é a vez.
- **AC6.1.2** Dado um repositório sem demandas, quando abro o Início, então vejo a instrução e Nova demanda, sem mensagem de erro.
- **AC6.1.3** Dado o registro ilegível de uma demanda que não é a ativa, quando abro o Início, então ela mostra um aviso na própria linha, e as outras continuam utilizáveis.

### US6.2 Consultar outra demanda sem mudar a ativa

Como P2, quero abrir outra demanda sem que a IA mude de trabalho, para não enviar um comando à demanda errada.

**Prioridade:** Should Have. **Dependências:** US6.1, US3.4. **Requisitos:** FR7.2, FR7.3, FR7.4, FR7.5.

- **AC6.2.1** Dada uma demanda que não é a ativa, quando a abro, então posso consultá-la, e `active-intent` não muda.
- **AC6.2.2** Dada essa demanda, quando chego ao envio, então ele está desativado, com o motivo.
- **AC6.2.3** Dada essa demanda, quando peço para torná-la ativa, então vejo o comando para confirmar, e ele só vai ao terminal depois da confirmação.

### US6.3 Consultar artefatos, unidades, decisões e histórico

Como P2, quero consultar o que foi produzido e decidido, para encontrar uma informação sem refazer o caminho.

**Prioridade:** Should Have. **Dependências:** US3.3. **Requisitos:** FR13.1, FR13.2, FR13.3, FR13.4, FR13.5, FR13.6.

- **AC6.3.1** Dada uma demanda, quando abro as abas, então encontro Artefatos, Unidades e ciclos, Decisões e Histórico.
- **AC6.3.2** Dado um artefato em Artefatos, quando escrevo uma nota, então ela fica em `.vibes/`, e o arquivo do artefato não muda.
- **AC6.3.3** Dadas decisões no registro, quando abro Decisões, então vejo tipo, etapa, data e texto.
- **AC6.3.4** Dados comandos enviados pelo painel, quando abro Histórico, então vejo cada um, e os digitados à mão não aparecem.
- **AC6.3.5** Dada uma aba vazia, quando a abro, então ela diz o que vai aparecer e em que etapa. Com um arquivo ilegível, diz qual é e o que fazer.

## 7. Personalizar

### US7.1 Trocar imagens, vídeos e frases

Como P2, quero trocar a mídia e as frases de cada momento, para adaptar o guia ao meu contexto.

**Prioridade:** Should Have, com a personalização dentro do MVP (`scope-document.md`). **Dependências:** US3.3. **Requisitos:** FR10.1, FR10.2, FR10.3, FR10.4, FR10.5, FR10.8, FR10.9.

- **AC7.1.1** Dado um momento do guia, quando troco a imagem por um PNG válido de até 25 MB, então a nova imagem aparece nesse momento.
- **AC7.1.2** Dado um arquivo SVG, com outro tipo disfarçado ou acima de 25 MB, quando tento enviar, então vejo o motivo, e o anterior continua.
- **AC7.1.3** Dado um item alterado, quando escolho voltar ao original, então o item original volta.
- **AC7.1.4** Dadas mudanças na visita, quando clico em Cancelar, então elas são desfeitas.
- **AC7.1.5** Dada uma falha ao gravar, por exemplo com o disco cheio, quando tento salvar, então vejo o aviso, e a personalização anterior continua.

### US7.2 Trocar as cores sem perder a identidade

Como P2, quero trocar as cores e ser avisado de contraste baixo, para adaptar o visual sem prejudicar a leitura.

**Prioridade:** Should Have, com a personalização dentro do MVP. **Dependências:** US3.3. **Requisitos:** FR10.1, FR10.2, FR10.6, FR10.7, FR10.8.

- **AC7.2.1** Dada uma cor com contraste abaixo de 4,5:1 nos textos ou de 3:1 no título, quando a escolho, então vejo o aviso, sem bloqueio.
- **AC7.2.2** Dada uma nova cor de logo, quando salvo, então o logo muda de cor, o desenho continua, e o favicon mantém a cor original.
- **AC7.2.3** Dada a tela de personalização, quando a uso, então não há como mudar a estrutura do guia, as etapas, os comandos ou o terminal.
- **AC7.2.4** Dada a personalização salva, quando confiro o Git, então nada foi alterado fora de `.vibes/`, que é ignorado.

## Notas de INVEST

- **Independentes:** as dependências acima são de uso do fluxo, sem ordem rígida de construção, exceto a base de US1.1, US3.1 e US3.3.
- **Pequenas:** US3.3 e US6.3 são as maiores, e podem ser divididas por momento ou por aba no planejamento.
- **Testáveis:** cada critério tem um resultado observável. Os limites de tempo seguem `requirements.md`, e os sinais ainda não confirmados têm comportamento de reserva.

## Corners tratados

Cada condição aplicável de `corner-checklist.md` virou critério, suposição em `requirements.md` ou exclusão: duplo clique (AC3.4.4), arquivo incompleto (AC5.1.2), entrada malformada (AC5.1.3), lista vazia (AC6.1.2), caminhos com espaços (AC1.1.3), conteúdo não confiável (AC4.1.2), disco cheio (AC7.1.5), servidor reiniciado (AC3.2.5) e duas abas (AC3.2.3).

## Assumptions & Open Questions

- [assumption] A tabela de descrições e níveis citada em AC2.1.2 é fixada na construção, porque as regras de sugestão não foram definidas nos requisitos.
- [assumption] O número de linhas reexibidas em AC3.2.1 é definido no design do módulo `terminal`.
- [open] O sinal de pedido de alterações em AC4.2.4 ainda é hipótese.
