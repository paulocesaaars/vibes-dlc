# Regras: u1-walking-skeleton

Base: `inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md` e `inception/contract-design/contract-summary.md`.

```yaml
rules:
  - id: BR1.1
    statement: O servidor escuta em 127.0.0.1 quando VIBES_HOST não foi definido.
    category: constraint
    applies_to: AppConfig
    trigger: início do processo
    logic: IF VIBES_HOST está vazio THEN host = 127.0.0.1
    violation: não se aplica
    source: NFR3
  - id: BR1.2
    statement: Com host fora de 127.0.0.1, o guia registra um aviso e mostra um alerta permanente em todas as telas.
    category: policy
    applies_to: AppConfig
    trigger: início do processo e cada tela
    logic: IF exposed THEN mostrar o alerta, que não pode ser fechado
    violation: não se aplica
    source: NFR3
  - id: BR1.3
    statement: Um Node.js anterior a 22.13 impede o início, com a versão exigida na mensagem.
    category: validation
    applies_to: AppConfig
    trigger: início do processo
    logic: IF a versão é anterior a 22.13 THEN encerrar com a mensagem
    violation: o processo não inicia
    source: NFR9
  - id: BR1.4
    statement: A raiz do repositório é a pasta mais próxima, subindo a partir da atual, que contém aidlc/, inclusive em caminhos com espaços e acentos.
    category: calculation
    applies_to: AppConfig
    trigger: início do processo
    logic: IF nenhuma pasta contém aidlc/ THEN repoRoot fica vazio. Ao montar o retrato de sinais, AidlcReader calcula repo.health a cada leitura, e esse valor não é guardado
    violation: guia mostra a mensagem de falha com missing_aidlc
    source: FR12.4
  - id: BR1.5
    statement: Sem .vibes/, o produto cria a pasta e o banco na primeira execução, sem erro.
    category: policy
    applies_to: AppConfig
    trigger: início do processo
    logic: IF .vibes/ não existe THEN criar
    violation: uma falha ao criar mostra o caminho e o motivo
    source: FR12.6
  - id: BR1.6
    statement: Uma variável de ambiente inválida interrompe o início, com a chave e a forma esperada.
    category: validation
    applies_to: AppConfig
    trigger: início do processo
    logic: IF PORT ou outra variável é inválida THEN encerrar com a mensagem
    violation: o processo não inicia
    source: NFR3
  - id: BR2.1
    statement: As rotas do terminal e de envio rejeitam requisições cujo Origin ou Host não seja o do próprio app.
    category: authorization
    applies_to: rotas internas
    trigger: cada requisição
    logic: IF Origin ou Host difere do app THEN responder 403 origin_rejected, sem efeito
    violation: nada chega ao terminal
    source: NFR4
  - id: BR2.2
    statement: O produto não faz chamadas de rede, nem para fontes.
    category: constraint
    applies_to: produto
    trigger: sempre
    logic: fontes e recursos vêm do próprio pacote
    violation: o teste de rede falha
    source: NFR6
  - id: BR2.3
    statement: O produto escreve só em .vibes/, nunca em arquivos versionados nem no registro do AI-DLC.
    category: constraint
    applies_to: produto
    trigger: toda escrita
    logic: toda escrita do produto fica sob .vibes/
    violation: o teste de escrita falha
    source: NFR7
  - id: BR2.4
    statement: O produto não guarda chaves de IA nem a saída completa do terminal.
    category: constraint
    applies_to: Db e Terminal
    trigger: toda gravação
    logic: a saída fica só no buffer em memória
    violation: o teste do banco falha
    source: NFR13
  - id: BR3.1
    statement: O shell é escolhido na ordem VIBES_SHELL e depois bash.exe da instalação do Git, na raiz do repositório. O servidor abre a sessão sozinho só no primeiro pedido depois de iniciar, quando o cliente não informa um sessionId antigo.
    category: calculation
    applies_to: TerminalSession
    trigger: pedido de sessão sem registro em memória, ou Nova sessão
    logic: IF VIBES_SHELL existe THEN usar ELSE procurar o bash.exe do Git
    violation: ver BR3.2
    source: FR2.2
  - id: BR3.2
    statement: Sem Git Bash, a sessão fica indisponível e não cai para PowerShell ou cmd. Em U1, a tela mostra uma mensagem simples com o caminho procurado.
    category: constraint
    applies_to: TerminalSession
    trigger: abrir a sessão
    logic: IF nenhum shell foi encontrado THEN status = unavailable e repo.health = missing_shell
    violation: responder 503 shell_unavailable
    source: FR2.2
  - id: BR3.3
    statement: Recarregar a página, recolher ou expandir o terminal não encerra a sessão.
    category: policy
    applies_to: TerminalSession
    trigger: recarregar, recolher ou expandir
    logic: a sessão pertence ao servidor, não à página
    violation: não se aplica
    source: FR2.3
  - id: BR3.4
    statement: seq numera os blocos brutos de saída. Ao recarregar, a tela vazia recebe todos os blocos guardados, equivalentes às últimas 2000 linhas. Na reconexão sem recarregar, recebe só os blocos depois do último seq, sem duplicar.
    category: calculation
    applies_to: TerminalSession
    trigger: abrir o stream com sessionId e, se houver, afterSeq
    logic: IF afterSeq está na janela guardada THEN enviar seq maior que afterSeq ELSE enviar reset e todos os blocos. O cliente ignora seq menor ou igual ao último aplicado. Como os blocos são brutos, o próprio terminal recompõe linhas parciais e sequências de controle
    violation: uma CLI que redesenha a tela pode aparecer incompleta até o próximo desenho, então o cliente envia um resize depois de reaplicar os blocos
    source: FR2.3
  - id: BR3.5
    statement: Duas abas mostram a mesma sessão, com a saída e a entrada valendo para ambas.
    category: policy
    applies_to: TerminalSession
    trigger: várias conexões
    logic: a saída vai a todas as conexões
    violation: não se aplica
    source: FR2.7
  - id: BR3.6
    statement: Depois de encerrar ou de o shell acabar, o registro fica dead em memória, nada abre sozinho, o envio fica desativado e o guia pede para abrir uma nova sessão. O retrato de sinais lê o status desse registro, e a falta de registro é lida como dead.
    category: constraint
    applies_to: GuideDecision
    trigger: sessão dead
    logic: IF session.status = dead THEN moment = session_dead, canSend = falso. Só Nova sessão abre outra
    violation: a rota responde 409 session_dead
    source: FR2.6
  - id: BR3.7
    statement: Depois que o servidor reinicia, o guia informa que a sessão anterior acabou e oferece abrir uma nova.
    category: policy
    applies_to: TerminalSession
    trigger: pedido de sessão com um sessionId que o servidor desconhece
    logic: O cliente guarda o sessionId na aba. IF o servidor não tem registro THEN cria um registro dead, com endReason = server_stopped, sem abrir shell. IF já há sessão viva THEN a aba entra nela, como em BR3.5
    violation: não se aplica
    source: FR2.8
  - id: BR3.8
    statement: A partir de 1180 pixels, o terminal ocupa toda a lateral direita. Abaixo disso, fica embaixo do guia.
    category: constraint
    applies_to: tela
    trigger: largura da janela
    logic: IF largura >= 1180 THEN duas colunas ELSE empilhado
    violation: não se aplica
    source: FR2.4
  - id: BR3.9
    statement: O eco de uma tecla leva até 150 ms em 95% das teclas, medido no script de prova, entre enviar a tecla e vê-la na tela.
    category: constraint
    applies_to: Terminal
    trigger: digitação
    logic: medição em 100 teclas na mesma máquina
    violation: a prova falha, e a troca de transporte fica isolada em Terminal
    source: NFR2
  - id: BR3.10
    statement: O foco alterna entre guia e terminal com F6 ou com um botão na barra, e um clique também leva ao terminal.
    category: policy
    applies_to: tela
    trigger: F6, botão ou clique
    logic: A página captura F6 antes de a tecla chegar à CLI e impede o atalho do navegador. A prova automática confere isso no navegador usado
    violation: se um navegador não deixar capturar F6, o botão continua sendo a saída pelo teclado
    source: NFR10
  - id: BR3.11
    statement: Enviar um comando reabre o terminal recolhido, sem mover o foco para ele.
    category: policy
    applies_to: tela
    trigger: envio
    logic: IF recolhido THEN expandir
    violation: não se aplica
    source: FR2.5
  - id: BR4.1
    statement: Em U1, o momento segue a tabela de functional-spec.md, escrita com campos do retrato de sinais. Marcas approved, skipped e desconhecidas, assim como comandos executados, ficam em following, sem afirmar aprovação.
    category: calculation
    applies_to: GuideDecision
    trigger: cada decisão
    logic: a primeira condição verdadeira vale. commandSent vem do último comando written da etapa. execute dá executed. paste dá pasted até o aidlc-state.md mudar depois de writtenAt, e aí dá executed
    violation: uma marca desconhecida vira following, sem afirmar aprovação
    source: FR4.3
  - id: BR4.2
    statement: O andamento vem só dos arquivos do AI-DLC, nunca da saída do terminal.
    category: constraint
    applies_to: AidlcReader
    trigger: cada leitura
    logic: nenhum componente lê o buffer do terminal para decidir o momento
    violation: o teste de arquitetura falha
    source: FR4.2
  - id: BR4.3
    statement: Etapas, fases e contagens vêm dos arquivos do AI-DLC, sem número fixo no código.
    category: calculation
    applies_to: StageState
    trigger: cada leitura
    logic: contar a partir de aidlc-state.md e do grafo de etapas
    violation: não se aplica
    source: FR4.5
  - id: BR4.4
    statement: Cada momento mostra uma instrução, de quem é a vez e, no máximo, uma ação principal.
    category: constraint
    applies_to: GuideDecision
    trigger: cada tela
    logic: primaryAction tem um único valor
    violation: não se aplica
    source: FR5.2
  - id: BR4.5
    statement: Todas as ações funcionam só com teclado, e os estados não dependem só de cor.
    category: constraint
    applies_to: tela
    trigger: sempre
    logic: ações em elementos nativos, com texto ou ícone além da cor
    violation: a verificação de teclado falha
    source: NFR10
  - id: BR4.6
    statement: Entender mostra em português o que a etapa faz e como funciona. Uma etapa sem texto próprio recebe um texto genérico.
    category: policy
    applies_to: StageContent
    trigger: momento understand
    logic: buscar o texto pelo slug da etapa
    violation: usar o texto genérico
    source: FR5.3
  - id: BR4.7
    statement: Uma mudança em aidlc/ aparece no painel aberto em até 3 segundos, medidos na prova da fatia.
    category: constraint
    applies_to: AidlcReader
    trigger: mudança nos cursores ou nos arquivos do intent ativo
    logic: AidlcReader observa a pasta por eventos e confere as datas a cada 1 segundo, como reserva. Só o aviso changed sai, e a interface pede a decisão de novo
    violation: uma leitura falha mantém a última válida e tenta de novo. Depois de 10 segundos falhando, repo.health = unreadable_record
    source: NFR1
  - id: BR5.1
    statement: Nenhum texto vai ao terminal por esta rota sem a confirmação explícita da pessoa.
    category: authorization
    applies_to: SentCommand
    trigger: envio
    logic: só um clique em Enviar agora ou Colar sem executar gera um commandId
    violation: sem commandId, a rota responde 422
    source: FR3.1
  - id: BR5.2
    statement: O comando é gravado como pending, passa a written depois de chegar ao terminal e a failed se a escrita falhar. Só written conta como enviado e aparece no histórico.
    category: policy
    applies_to: SentCommand
    trigger: envio
    logic: gravar pending, escrever, atualizar para written com writtenAt ou para failed
    violation: failed responde 500, e a pessoa confirma de novo, com um novo commandId
    source: FR3.8
  - id: BR5.3
    statement: Um commandId repetido não escreve de novo no terminal.
    category: constraint
    applies_to: SentCommand
    trigger: envio
    logic: IF commandId já existe THEN responder 200 com o status atual, sem escrever
    violation: não se aplica
    source: FR3.6
  - id: BR5.4
    statement: Enviar agora escreve o texto com Enter. Colar sem executar escreve sem Enter, e o guia pede para pressionar Enter, sem afirmar que o comando foi executado.
    category: policy
    applies_to: SentCommand
    trigger: envio
    logic: mode decide se o Enter é acrescentado
    violation: não se aplica
    source: FR3.3
  - id: BR5.5
    statement: O comando tem uma linha só. O campo não aceita quebras, e colar um texto com quebras mostra o motivo e mantém o envio desativado.
    category: validation
    applies_to: SentCommand
    trigger: edição e envio
    logic: IF o texto tem quebra de linha ou está vazio THEN recusar
    violation: a rota responde 422 invalid_command
    source: FR3.2
  - id: BR5.6
    statement: O passo Enviar sempre lembra que a sua IA precisa estar aberta no terminal.
    category: policy
    applies_to: tela
    trigger: momento send
    logic: o lembrete faz parte do cartão
    violation: não se aplica
    source: FR3.5
  - id: BR5.7
    statement: No envio, a rota relê a demanda ativa e pede a decisão ao Core. canSend só é verdadeiro no momento send, com repositório ok, demanda ativa, sessão alive e cliKind igual a claude_code. Se a demanda ou a etapa da tela diferirem da releitura, ou se canSend for falso, nada é escrito.
    category: authorization
    applies_to: SentCommand
    trigger: envio
    logic: IF intentId ou stageSlug diferem da releitura THEN responder 409 stale_screen. IF canSend = falso THEN responder 409 com sendBlockedReason. Os valores gravados são os da releitura
    violation: nada chega ao terminal
    source: FR7.3
  - id: BR5.8
    statement: O comando oferecido na etapa atual é /aidlc, com o nome da etapa ao lado, e a pessoa pode editá-lo. O texto é livre, e o servidor não o compara com o comando esperado.
    category: policy
    applies_to: SentCommand
    trigger: momento send
    logic: AidlcReader monta /aidlc
    violation: não se aplica
    source: FR3.2
  - id: BR6.1
    statement: As migrações só avançam, e uma cópia do banco é feita antes de migrar. Os dados de .vibes/ continuam depois de atualizar.
    category: policy
    applies_to: Db
    trigger: início com migração pendente
    logic: copiar .vibes/vibes.db, aplicar em ordem, numa transação por migração
    violation: uma falha interrompe o início, mantém a cópia e mostra o arquivo que falhou
    source: NFR12
```

## Resumo

| Grupo | Regras | Tema |
|---|---|---|
| BR1 | BR1.1 a BR1.6 | Configuração e início |
| BR2 | BR2.1 a BR2.4 | Segurança e escrita |
| BR3 | BR3.1 a BR3.11 | Terminal |
| BR4 | BR4.1 a BR4.7 | Momento do guia |
| BR5 | BR5.1 a BR5.8 | Envio de comandos |
| BR6 | BR6.1 | Migrações |
