# Requisitos: MVP do Vibes DLC

Base: `ideation/intent-capture/intent-statement.md`, `ideation/scope-definition/scope-document.md`, `ideation/rough-mockups/wireframes.md`, `ideation/rough-mockups/user-flow.md`, `inception/practices-discovery/team-practices.md`, `PRD.md`, `TDD.md`, `design/prototipo/Main.dc.html` e as respostas de `requirements-analysis-questions.md`.

Nas fontes, `PRD n` é o requisito n do `PRD.md`, `RA Qn` é a pergunta n desta etapa e `RM Qn` é a pergunta n de `rough-mockups-questions.md`. As telas E0 a E7 estão em `wireframes.md`.

## Análise da intenção

Quem começa no AI-DLC não sabe o que cada etapa faz, o que precisa decidir nem quando é a sua vez (`intent-statement.md`). O objetivo é um guia local, em português, que conduz uma tarefa por vez e diz sempre o que fazer agora e de quem é a vez, enquanto a IA trabalha em um terminal real ao lado.

O maior risco técnico é o guia saber em que momento a etapa está sem interpretar o terminal. Por isso, o andamento vem só dos arquivos do AI-DLC, e os sinais ainda não confirmados têm comportamento de reserva.

## Critérios de pronto do MVP

- **CP1.** Quem desenvolve conclui uma demanda real, do registro ao código gerado, usando só o guia e o terminal integrado (RA Q1).
- **CP2.** Uma pessoa que nunca usou o AI-DLC conclui uma etapa sem ajuda e sem consultar a documentação do framework (RA Q1, C9 em `constraint-register.md`).
- **CP3.** Em um repositório AI-DLC, o painel passa a rodar seguindo as instruções do `README`, com `npm install` e um comando (`PRD.md`, Como saber que funcionou).

## Requisitos funcionais

### FR1. Registrar uma demanda (PRD 1, PRD 5)

- **FR1.1** O registro tem três passos, com uma pergunta por vez: descrever a demanda, escolher o nível e confirmar o comando.
- **FR1.2** Com a descrição vazia ou só com espaços, Continuar fica desativado, e o motivo aparece na tela.
- **FR1.3** O guia sugere um nível a partir de regras locais sobre a descrição e mostra o motivo, sem consultar nenhum modelo.
- **FR1.4** A pessoa pode confirmar o nível sugerido ou trocar por qualquer outro nível disponível.
- **FR1.5** A pessoa pode pedir uma análise do nível à sua IA, enviada como comando, sujeita a FR3.1.
- **FR1.6** Com outra CLI escolhida, o botão de FR1.5 vira uma orientação, com o pedido como referência para digitar, sem envio (RA Q3).
- **FR1.7** Cancelar, em qualquer passo, volta ao Início e não envia nada ao terminal.
- **FR1.8** A demanda aparece no Início depois que o AI-DLC grava o registro dela, lida desse registro. Antes disso, o guia diz que está esperando a IA criar a demanda.

### FR2. Terminal integrado (PRD 2)

- **FR2.1** O painel oferece um terminal real no navegador, com um pseudo-terminal que executa o Git Bash, com o diretório de trabalho na raiz do repositório.
- **FR2.2** O shell é escolhido na ordem `VIBES_SHELL` e depois `bash.exe` da instalação do Git, sem cair para PowerShell ou `cmd`.
- **FR2.3** Recarregar a página mantém a sessão e reexibe as últimas linhas da saída.
- **FR2.4** O terminal ocupa toda a lateral direita. Abaixo de 1180 pixels de largura, fica embaixo do guia (RM Q4).
- **FR2.5** O terminal pode ser recolhido e expandido sem encerrar a sessão, e reabre ao enviar um comando.
- **FR2.6** A pessoa pode encerrar a sessão e abrir uma nova. Com a sessão encerrada, o envio fica desativado e o guia instrui a abrir uma nova.
- **FR2.7** Duas abas do painel mostram a mesma sessão, e a saída e a entrada valem para ambas.
- **FR2.8** Quando o servidor para, a sessão termina. Ao voltar, o guia informa que a sessão anterior acabou e oferece abrir uma nova.

### FR3. Envio de comandos (PRD 3, PRD 7)

- **FR3.1** Nenhum texto vai ao terminal sem a confirmação explícita da pessoa, inclusive texto vindo de artefatos.
- **FR3.2** A pessoa vê o comando e pode editá-lo antes de confirmar.
- **FR3.3** A pessoa escolhe entre enviar e executar, ou colar sem executar, para pressionar Enter no terminal.
- **FR3.4** Depois de colar, o guia instrui a pressionar Enter e passa a acompanhar pelos arquivos, sem afirmar que o comando foi executado.
- **FR3.5** O passo de envio sempre lembra que a sua IA precisa estar aberta no terminal, porque o guia não detecta isso (RM Q1).
- **FR3.6** Um duplo clique na confirmação envia o comando uma única vez.
- **FR3.7** O guia só oferece o comando da etapa seguinte depois que o AI-DLC registra a etapa atual como aprovada.
- **FR3.8** O histórico guarda cada comando enviado pelo painel, com data, demanda, etapa e modo (executar ou colar). Comandos digitados à mão não entram.

### FR4. Leitura do AI-DLC (PRD 4, PRD 6, PRD 10)

- **FR4.1** O guia descobre a demanda ativa pelos cursores `aidlc/active-space` e `aidlc/spaces/<space>/intents/active-intent` e lê `aidlc-state.md`, `audit/` e os artefatos dela, sem escrever nesses arquivos.
- **FR4.2** O guia determina o momento da etapa só por esses arquivos e pelos comandos de leitura do AI-DLC, sem interpretar a saída do terminal.
- **FR4.3** Os momentos seguem a tabela "De onde vem cada momento" de `user-flow.md`: `[-]` é etapa em andamento, a lista `open` de `aidlc engine log answers` é pergunta registrada, `[?]` é aprovação pendente e `[x]` com `GATE_APPROVED` é aprovada.
- **FR4.4** Os sinais ainda não confirmados têm reserva: sem o sinal do resumo aguardando confirmação ou de `[R]`, o guia mantém a instrução genérica "Se a sua IA perguntar algo, responda no terminal" e não afirma nada que não possa confirmar.
- **FR4.5** A lista de etapas, as fases e a contagem de cada nível vêm dos arquivos do AI-DLC, sem número fixo no código (I2 em `raid-log.md`).
- **FR4.6** As decisões e aprovações são exibidas a partir do registro do AI-DLC, ligadas à demanda. O produto não tem botão de aprovar.
- **FR4.7** Uma mudança nos arquivos atualiza o painel aberto sem recarregar a página (ver NFR1).
- **FR4.8** Ao abrir o painel depois de trabalhar sem ele, o guia compara o que sabia com os arquivos, avisa o que mudou e mostra o momento atual.
- **FR4.9** Um arquivo sendo gravado, com a última entrada incompleta, não é tratado como erro: o guia mantém o último estado válido e lê de novo na próxima mudança.
- **FR4.10** Campos desconhecidos no registro são ignorados, e uma entrada malformada entre entradas boas é pulada, sem derrubar a leitura do restante.

### FR5. Condução da etapa (PRD 11, PRD 12)

- **FR5.1** Cada etapa é conduzida em cinco passos, com barra de progresso: Entender, Enviar, Acompanhar, Revisar e Aprovar.
- **FR5.2** Cada momento mostra uma instrução, de quem é a vez e, no máximo, uma ação principal.
- **FR5.3** Entender explica o que a etapa faz e como ela funciona, em português, a partir do conteúdo do guia.
- **FR5.4** Acompanhar mostra os artefatos conforme são gravados e deixa sempre visível que, se a IA perguntar algo, a resposta é dada no terminal.
- **FR5.5** Com uma pergunta registrada, o guia indica que é a vez da pessoa e pede a resposta no terminal.
- **FR5.6** Com um pedido de alterações registrado, o guia volta a Acompanhar, e a aprovação é pedida de novo.
- **FR5.7** A trilha mostra as etapas da demanda por fase e distingue as concluídas, a atual, as bloqueadas e as puladas.
- **FR5.8** Abrir uma etapa concluída na trilha mostra os artefatos dela.
- **FR5.9** As instruções continuam corretas quando o AI-DLC mostra opções fixas em inglês, como `Approve`.

### FR6. Revisão e conclusão (PRD 13, PRD 14)

- **FR6.1** Revisar apresenta um artefato por vez, como texto, com a lista do que conferir, e conta quantos foram revisados.
- **FR6.2** Quando o conteúdo de um artefato muda depois de revisado, ele volta a pedir revisão, com um aviso.
- **FR6.3** A revisão não bloqueia a aprovação: o gate é do AI-DLC. Aprovar tem instrução para responder no terminal e diz quantos artefatos faltam revisar.
- **FR6.4** Ao concluir uma etapa, o guia mostra o progresso da demanda e quantos artefatos foram revisados, e avisa se a aprovação ocorreu sem revisar todos.
- **FR6.5** Quando não há próxima etapa, a tela mostra a trilha concluída, com acesso ao histórico.

### FR7. Várias demandas (RA Q5)

- **FR7.1** O Início lista as demandas lidas dos arquivos do AI-DLC, com nível, etapa atual, progresso e de quem é a vez. Sem demandas, mostra só a instrução e Nova demanda.
- **FR7.2** Qualquer demanda pode ser aberta para consulta.
- **FR7.3** Só a demanda ativa no AI-DLC recebe comandos.
- **FR7.4** Em uma demanda que não é a ativa, o guia desativa o envio da etapa, diz o motivo e oferece o comando para torná-la ativa, com a confirmação de FR3.1.
- **FR7.5** Abrir ou navegar por uma demanda nunca muda a demanda ativa por conta própria.

### FR8. IA parada (RA Q4)

- **FR8.1** Com a etapa em andamento e nenhuma mudança nos arquivos do AI-DLC por 10 minutos, o guia avisa que a IA pode ter parado e orienta a conferir o terminal e retomar com o comando do AI-DLC.
- **FR8.2** O aviso nunca afirma que a IA parou, porque um trabalho longo também fica sem gravar arquivos. Ele some assim que algum arquivo muda.
- **FR8.3** O comando de retomada segue FR3.1. Com outra CLI, o guia só orienta.
- **FR8.4** A contagem de 10 minutos usa a data de modificação dos arquivos, então continua correta depois de recarregar a página ou reabrir o painel.

### FR9. Sua IA (RM Q2, RM Q6)

- **FR9.1** A tela de personalização tem a seção "Sua IA", com Claude Code como padrão e a opção Outra CLI.
- **FR9.2** Com outra CLI, o passo Enviar mostra o comando do AI-DLC para o Claude Code como referência e a orientação para digitá-lo, sem envio pelo painel.
- **FR9.3** Com outra CLI, o guia continua acompanhando pelos arquivos do AI-DLC, como no fluxo principal.
- **FR9.4** O guia não oferece o botão "Abrir a sua IA" nem detecta qual CLI está em uso (RM Q1, RM Q2).

### FR10. Personalização (PRD 15)

- **FR10.1** A pessoa troca, por momento do guia, a imagem ou o vídeo e as frases, e troca as cores da interface.
- **FR10.2** Cada item pode voltar ao original.
- **FR10.3** Cancelar desfaz o que mudou naquela visita.
- **FR10.4** A mídia aceita PNG, JPEG, GIF, WebP, MP4 ou WebM, até 25 MB, com o tipo conferido pelo conteúdo. Arquivo inválido ou acima do limite mostra o motivo e mantém o anterior.
- **FR10.5** SVG é recusado.
- **FR10.6** O guia avisa, sem bloquear, quando o contraste com o fundo fica abaixo de 4,5:1 nos textos e de 3:1 no título.
- **FR10.7** O desenho do logo, a estrutura do guia, as etapas, os comandos e o terminal não mudam pela personalização. O favicon mantém a cor original.
- **FR10.8** A personalização fica em `.vibes/`, fora do Git, e vale só para aquela máquina.
- **FR10.9** Se gravar falhar, por exemplo com o disco cheio, o guia avisa, e a personalização anterior continua valendo.

### FR11. Falhas no repositório (RM Q3)

- **FR11.1** Sem o AI-DLC no repositório, o guia mostra a tela E6 explicando como instalar, com o terminal disponível.
- **FR11.2** Com o registro da demanda ativa ilegível, a tela E6 mostra qual arquivo falhou e como conferir, com o terminal disponível.
- **FR11.3** Com o registro de outra demanda ilegível, ela aparece no Início com um aviso na própria linha, e as demais continuam utilizáveis.
- **FR11.4** Sem o Git Bash, a tela E6 mostra como instalar ou configurar `VIBES_SHELL`, e o terminal fica indisponível.
- **FR11.5** Tentar de novo refaz a verificação sem reiniciar o servidor.
- **FR11.6** Sem nenhuma demanda, o Início mostra o estado vazio, sem confundir com falha de leitura.

### FR12. Instalação e repositórios (PRD 8, PRD 9, RA Q2)

- **FR12.1** O produto é instalado copiando os arquivos para uma subpasta própria do repositório AI-DLC, conforme as instruções do `README`.
- **FR12.2** A instalação não altera o `package.json` nem outros arquivos existentes do repositório. A exceção é acrescentar `.vibes/` ao `.gitignore`, descrita no `README`.
- **FR12.3** O produto exige apenas Node.js, `npm install`, um comando para iniciar e o Git Bash no Windows, sem banco, fila ou serviço externo.
- **FR12.4** Rodando na subpasta, o produto localiza a raiz do repositório AI-DLC, e o terminal abre nessa raiz.
- **FR12.5** O produto funciona em repositórios novos e legados, com ou sem `package.json` próprio, e em caminhos com espaços e acentos.
- **FR12.6** Na primeira execução, sem `.vibes/`, o produto cria o que precisa e abre sem erro.

### FR13. Abas de consulta (PRD 4, PRD 6, PRD 7)

- **FR13.1** A demanda tem as abas Artefatos, Unidades e ciclos, Decisões e Histórico.
- **FR13.2** Artefatos lista os arquivos por etapa e exibe o conteúdo como texto, e a pessoa pode guardar notas em `.vibes/`.
- **FR13.3** Unidades e ciclos mostra nome, tipo, objetivo, dependências e situação, lidos do AI-DLC.
- **FR13.4** Decisões mostra tipo, etapa, data e texto, lidos do registro do AI-DLC.
- **FR13.5** Histórico mostra os comandos de FR3.8.
- **FR13.6** Cada aba vazia diz o que vai aparecer ali e em que etapa. Quando um arquivo não pode ser lido, a aba diz qual é e o que fazer.

## Requisitos não funcionais

- **NFR1. Atualização:** uma mudança nos arquivos do AI-DLC aparece no painel aberto em até 3 segundos, em repositório local.
- **NFR2. Terminal:** o eco de uma tecla leva até 150 ms em 95% das teclas, com o app e o navegador na mesma máquina. Se o transporte não atingir isso, a troca fica isolada no módulo `terminal` (`TDD.md`).
- **NFR3. Rede local:** por padrão, o servidor escuta só em `127.0.0.1`. Com `VIBES_HOST` em outro endereço, registra um aviso e mostra um alerta permanente que não pode ser fechado.
- **NFR4. Origem:** as rotas do terminal e de personalização rejeitam requisições cujo `Origin` ou `Host` não seja o do próprio app.
- **NFR5. Conteúdo não confiável:** artefatos e frases são exibidos como texto, sem executar HTML nem scripts. A mídia enviada é servida com `X-Content-Type-Options: nosniff`.
- **NFR6. Sem rede:** o produto não faz nenhuma chamada de rede, nem para fontes. Com a rede desligada, o painel abre e funciona por completo. A rede é usada só pela CLI de IA no terminal.
- **NFR7. Escrita:** o produto só escreve em `.vibes/`. Nunca escreve nos arquivos versionados nem no registro do AI-DLC.
- **NFR8. Idioma:** toda a interface fica em português (Brasil). Ficam no original só os comandos do AI-DLC, os caminhos de arquivo e o que a CLI imprime. Os textos do guia dizem "a sua IA", sem citar uma ferramenta, com exceção do nome das opções em "Sua IA" (PRD 16, PRD 17).
- **NFR9. Plataforma:** o MVP é verificado no Windows com Git Bash, em Node.js 22.13 ou superior, nas versões atuais do Chrome e do Edge. Com um Node.js anterior, o início mostra a versão exigida.
- **NFR10. Acessibilidade:** mantém o que o protótipo tem: navegação por teclado, rótulos, redução de movimento e estado que não depende só de cor, sem meta formal (RM Q5). O contraste do botão principal é um risco já aceito no `PRD.md`.
- **NFR11. Qualidade:** mínimo de 80% de cobertura de linhas no projeto todo, e cada módulo cobre o caminho feliz e pelo menos dois casos de erro ou de borda, conforme `team-practices.md`.
- **NFR12. Dados locais:** atualizar o produto mantém os dados de `.vibes/`. As migrações só avançam, e `.vibes/vibes.db` é copiado antes de migrar.
- **NFR13. Dados sensíveis:** o produto não guarda chaves nem tokens de IA, nem a saída completa do terminal.

## Restrições

- Sem interpretar a saída do terminal, sem API de modelos e sem chaves de IA (`PRD.md`, `TDD.md`).
- Stack do `TDD.md`: TypeScript, Next.js 16, `node:sqlite`, `@xterm/xterm`, `node-pty` e SSE, sujeita aos "Pontos a validar" desse documento.
- As artes e o logo já aprovados são usados sem gerar novos (`scope-document.md`).
- As regras rígidas de `project.md` e as práticas de `team-practices.md` valem para a construção.

## Suposições

- A pessoa já tem a CLI de IA instalada e autenticada (`PRD.md`). Se não tiver, o terminal mostra o erro da própria CLI, e o guia não trata esse caso.
- Quem usa outra CLI sabe qual é o comando equivalente. O guia dá só a referência do Claude Code (`user-flow.md`).
- O formato dos arquivos do AI-DLC é o observado nesta execução. O leitor segue FR4.10 para tolerar mudanças, e as CLIs mudarem de versão não o afeta.
- Os limites de 3 segundos, 150 ms e 10 minutos são padrões escolhidos nesta etapa, sem medição. Podem ser ajustados na construção, com aval de quem desenvolve.
- Uso local por uma pessoa: nenhuma condição de contas, papéis ou vários usuários se aplica. Duas abas seguem FR2.7.
- Datas de modificação vêm do relógio da própria máquina, e um relógio alterado pode antecipar ou atrasar o aviso de FR8.1, o que é aceito.

## Fora de escopo

- As exclusões de `scope-document.md`: tratamento específico das etapas de implantação, modo direto, chamadas de rede do produto, hospedar ou executar a IA, autenticação, deploy, logs de produção, integração com GitHub, vários times na mesma instalação e gamificação.
- Comandos prontos para outras CLIs e detecção da CLI em uso.
- Verificação em macOS e Linux.
- Detectar que a IA está fechada ou que o Enter foi pressionado.
- Pacote npm ou instalador. A instalação do MVP é a cópia de FR12.1.
- Tag de versão, ambientes e deploy do próprio produto (`team-practices.md`).

## Questões em aberto

- **Sinais a confirmar:** o resumo aguardando confirmação e a marca `[R]` ainda são hipótese. Se o sinal não existir, FR4.4 mantém o guia correto com menos precisão.
- **Sinais na Construção:** falta observar o comportamento dos sinais nas etapas de Construção, que este intent ainda vai executar.
- **Comando colado:** a opção "Retirar do terminal", citada no `TDD.md`, depende de cada CLI. Fica fora destes requisitos até ser validada.
- **Comando enviado com a IA fechada:** o guia não detecta. FR3.5 reduz o risco, e o caso entra no teste de CP2 (R-05 da revisão dos esboços).
- **Riscos técnicos do `TDD.md`:** `node-pty` com Git Bash, `node:sqlite` e latência do SSE são validados na primeira fatia.
- **Subpasta de instalação:** o nome da pasta e como o Next roda a partir dela ficam para a arquitetura.
- **Ajustes em `PRD.md` e `TDD.md`:** a proposta de texto é apresentada a quem desenvolve ao fim desta etapa, antes de alterar os arquivos (RA Q6).
