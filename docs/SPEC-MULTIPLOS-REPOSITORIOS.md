# Especificação — Vibes DLC com seleção de repositório e IA

Data: 6 de novembro de 2026.

Status: escopo autorizado para implementação, com plano em [PLANO-MULTIPLOS-REPOSITORIOS.md](PLANO-MULTIPLOS-REPOSITORIOS.md). Ajuste posterior do usuário: não há instalações existentes a preservar; importação e compatibilidade com bancos antigos foram excluídas.

## 1. Objetivo

Permitir que uma única instalação local do Vibes DLC acompanhe diferentes repositórios com AI-DLC, um por vez. O usuário escolhe o projeto e a IA na tela principal. O andamento compartilhado é reconstruído exclusivamente a partir dos arquivos do AI-DLC; somente preferências pessoais são persistidas pelo Vibes na máquina do usuário.

O produto assume que os projetos e as ferramentas de IA já estão configurados e funcionando. Não instala, autentica nem ensina a configurar AI-DLC ou ferramentas de IA.

## 2. Decisões de escopo

- O Vibes fica em seu próprio repositório, separado dos projetos acompanhados.
- Uma instância do servidor acompanha um único projeto por vez.
- O usuário pode alternar entre projetos sem reiniciar o servidor.
- Claude Code, Devin e GitHub Copilot são as opções de IA.
- O seletor de IA fica no cabeçalho da tela principal, ao lado do seletor de projeto, com acesso direto.
- A IA escolhida é uma preferência local por projeto.
- A leitura do andamento independe da IA escolhida.
- Dados de trabalho que não possam ser reconstruídos pelos arquivos do AI-DLC são removidos do Vibes, salvo preferências do usuário.
- Não haverá banco, JSON ou Markdown adicional do Vibes versionado nos projetos.
- A sincronização entre desenvolvedores continua sendo responsabilidade do Git.
- Sessões de terminal, conexões e proteção temporária contra reenvio são estado operacional em memória, sem histórico persistente de trabalho.

## 3. Fontes da verdade

### 3.1. Arquivos do AI-DLC no projeto

Demandas, nível do fluxo, etapas, unidades, artefatos, decisões e aprovações são apresentados conforme os registros disponíveis e compatíveis do AI-DLC.

O leitor deve considerar tanto o estado quanto os registros de auditoria necessários para determinar a posição real, inclusive na construção por unidade. Não basta ler apenas a etapa principal de `aidlc-state.md`.

Perguntas pendentes somente terão indicador próprio se puderem ser obtidas com segurança dos arquivos. Hoje, o Vibes consulta `aidlc engine log answers`; esse mecanismo não faz parte da nova leitura exclusivamente por arquivos. Sem uma fonte equivalente validada, o indicador será removido, e a interação continuará no terminal.

O Vibes não escreve diretamente no estado, nos artefatos ou nas aprovações do AI-DLC. Os comandos executados pelo usuário e pela ferramenta de IA continuam responsáveis por essas alterações.

### 3.2. Preferências locais

Persistir fora dos repositórios acompanhados:

- lista de projetos recentes;
- IA escolhida para cada projeto;
- cores, frases e mídias personalizadas dos estados que permanecerem no produto;
- preferências de apresentação necessárias, como terminal recolhido.

As preferências visuais serão globais para o usuário; a escolha de IA será específica por projeto. Essa divisão é a proposta consolidada e deve permanecer explícita na implementação.

O formato de armazenamento é uma decisão técnica: o SQLite existente pode continuar para preferências, sem exigência de troca de tecnologia. Banco e mídias ficarão em uma pasta de dados do aplicativo no perfil do usuário. O caminho exato e a eventual substituição de `VIBES_DB_PATH` devem ser definidos na documentação técnica.

Identificar projetos pelo caminho local normalizado e resolvido, evitando duplicações por caminhos equivalentes. Clones e worktrees em diretórios diferentes são projetos distintos para preferências. Não usar apenas o nome da pasta ou a URL remota como identidade.

### 3.3. Estado operacional temporário

Sessão de terminal, buffer de saída, assinaturas de eventos, caches reconstruíveis e identificadores temporários de envio podem existir em memória. Não representam andamento oficial nem serão compartilhados ou persistidos como dados de trabalho.

## 4. Fluxos de uso

### 4.1. Abrir o Vibes

1. O servidor inicia a partir da instalação central do produto.
2. Sem projeto selecionado, a tela apresenta a seleção de caminho local e os projetos recentes.
3. O usuário informa um caminho absoluto ou escolhe um projeto recente.
4. O Vibes verifica a existência da pasta e a compatibilidade dos arquivos necessários do AI-DLC.
5. O painel carrega o andamento e restaura a preferência de IA daquele projeto.
6. O terminal pode ser aberto na raiz do projeto selecionado.

Não abrir automaticamente um terminal na pasta do produto ou em sua pasta pai quando nenhum projeto estiver selecionado. Projetos recentes indisponíveis devem permitir nova seleção, sem impedir o uso da aplicação.

Para um projeto sem preferência de IA, usar Claude Code como seleção inicial, preservando o comportamento padrão atual. O valor precisa estar visível antes de qualquer envio.

### 4.2. Cabeçalho e seleção de IA

O cabeçalho mostra os controles “Projeto” e “IA”, próximos entre si. O projeto exibe seu nome e oferece acesso ao caminho completo para distinguir pastas com nomes iguais. O seletor de IA não fica escondido em Personalizar.

As opções são Claude Code, Devin e GitHub Copilot. A escolha é salva localmente por projeto e altera o formato dos próximos comandos exibidos, copiados ou enviados.

Trocar a seleção não inicia, encerra nem substitui automaticamente a ferramenta aberta no terminal. A interface deve explicar esse comportamento junto à seleção. O usuário abre a ferramenta que deseja usar; o Vibes não identifica a ferramenta pelo texto do terminal.

Os controles devem continuar acessíveis nas telas de acompanhamento e consulta, com adaptação ao layout estreito. Preservar tokens, tipografia, componentes e acessibilidade do DESIGN vigente; o fluxo e os elementos removidos serão atualizados na documentação durante a implementação.

### 4.3. Trocar de projeto

1. Validar o destino antes de alterar o projeto atual.
2. Havendo sessão de terminal viva, avisar que a troca interromperá o shell e a ferramenta em execução, pedindo confirmação.
3. Ao cancelar, preservar integralmente o contexto atual.
4. Ao confirmar, bloquear novos envios, encerrar o terminal anterior e invalidar sua sessão.
5. Encerrar observadores e consultas do projeto anterior e ativar o novo contexto.
6. Limpar o buffer visual do terminal anterior e atualizar as telas e conexões.
7. Liberar uma nova sessão na raiz do projeto escolhido.

Se a validação do destino falhar, manter o projeto atual. Se uma falha ocorrer depois do encerramento confirmado do terminal, informar o erro e permitir recuperação, sem prometer restaurar a conversa ou o processo encerrado.

Não permitir ativação do novo contexto com um terminal anterior cujo encerramento não tenha sido confirmado pelo sistema. Todas as abas conectadas ao mesmo servidor acompanham a troca; requisições de abas desatualizadas devem ser rejeitadas.

### 4.4. Retomar com outro desenvolvedor

1. O primeiro desenvolvedor registra alterações do AI-DLC e do código com `commit` e `push`.
2. O próximo desenvolvedor atualiza seu clone com `pull`.
3. Seleciona o projeto em sua instalação do Vibes.
4. O painel reconstrói a posição registrada e permite continuar pelo terminal.

Mesmos arquivos compatíveis devem produzir o mesmo andamento, independentemente de preferências, histórico local ou IA escolhida. A conversa interna da ferramenta e a sessão de terminal anterior não são transferidas. Não há sincronização em tempo real nem operações automáticas de Git.

## 5. Comandos e terminal

### 5.1. Formato por IA

Aplicar a regra relatada pelo usuário em seus testes:

- Claude Code: `/aidlc ...`.
- GitHub Copilot: `/aidlc ...`.
- Devin: `aidlc ...`, sem a barra inicial.

Essa equivalência é uma premissa de produto baseada no teste informado, não uma garantia de compatibilidade universal entre versões das ferramentas. Validar na implementação os comandos oferecidos pelo Vibes, inclusive criação, continuidade e troca de demanda.

A adaptação deve remover somente a barra inicial do comando AI-DLC gerado para Devin. Não alterar barras de caminhos, argumentos, URLs ou comandos comuns do shell. O formato mostrado, copiado e enviado deve coincidir.

### 5.2. Envio

- Preservar a prévia e a confirmação explícita antes de escrever no terminal.
- Preservar executar com Enter e colar sem executar, sem deduzir andamento a partir dessas ações.
- O usuário deve estar com a IA escolhida aberta e pronta para receber a mensagem.
- O Vibes não interpreta a saída do terminal para descobrir qual IA está ativa ou se ela terminou o trabalho.
- Comando enviado significa somente escrita no terminal, nunca execução concluída ou aprovação.
- Manter proteção temporária contra duplo clique e repetição de requisição, sem histórico persistido.
- Em entrega incerta, avisar que o comando pode ter chegado e não reenviar automaticamente.
- Vincular envios ao projeto e à sessão atuais; rejeitar contexto antigo após a troca.

Não implementar automação para instalar, autenticar ou iniciar cada ferramenta de IA. Comandos comuns digitados no terminal continuam sob responsabilidade do usuário.

## 6. Acompanhamento simplificado

Substituir os cinco passos pessoais “Entender, Enviar, Acompanhar, Revisar e Aprovar” por uma apresentação do estado registrado no AI-DLC e das ações disponíveis.

Manter:

- listagem e consulta de demandas;
- indicação da demanda ativa e orientação/comando para troca;
- trilha e progresso derivados das etapas registradas;
- consulta de unidades e artefatos;
- decisões e aprovações comprovadas pelos registros do framework;
- criação e continuidade por comandos, sem guardar rascunhos ou progresso de criação como dados de trabalho persistidos;
- terminal integrado, reconexão enquanto o servidor estiver vivo e personalização dos estados restantes.

Pode haver navegação e confirmação transitórias para criar ou enviar uma demanda. O que deixa de existir é seu registro como progresso pessoal persistido, não a confirmação de comandos.

Não apresentar artefato existente como “revisado”, etapa em andamento como “IA executando” ou comando enviado como “etapa iniciada”. Mostrar somente o que os registros permitirem afirmar. Artefatos continuam disponíveis para leitura e revisão humana, sem marcação persistida de revisão pelo painel.

Datas de modificação podem alimentar um aviso “sem atualização registrada”, mas não comprovar que a IA parou. Após clone ou `pull`, datas de arquivos também podem mudar sem representar uma nova execução.

## 7. Recursos removidos

- Notas próprias do Vibes sobre artefatos.
- Marcações pessoais de revisão, contadores de revisados e invalidação por hash.
- Histórico persistido e aba de comandos enviados pelo painel.
- Progresso pessoal nos cinco passos e confirmações de entendimento.
- Registro de conclusões e demandas já vistas.
- Inferência de início ou execução a partir de envio, colagem ou Enter.
- Conclusões que dependam de quantidade de artefatos revisados pelo usuário.
- Telas, textos e comandos para instalar ou configurar AI-DLC, harness ou ferramentas de IA.
- Opção genérica “Outra CLI”, substituída pelas três opções acordadas.
- Gravação de dados próprios do Vibes em `.vibes/` nos projetos acompanhados.

Remover também rotas, modelos, acessos ao banco e componentes que se tornarem exclusivos desses recursos. Não apagar dados ou arquivos do usuário durante essa limpeza.

## 8. Compatibilidade e falhas

Um projeto funcional para uma IA não é automaticamente legível pelo Vibes. Validar o contrato de arquivos suportado e informar o arquivo ausente, ilegível ou incompatível, com ações para tentar novamente ou selecionar outro projeto.

O leitor atual procura o grafo em `.claude/tools/data/stage-graph.json`. A nova resolução precisa ser independente da preferência de IA. Caminhos alternativos só devem ser definidos após verificar os arquivos reais produzidos pelas instalações suportadas; não inventar caminhos de Devin ou Copilot. Enquanto um formato não for suportado, declarar a incompatibilidade.

Conflitos de merge, arquivos incompletos durante gravação ou mudança de branch não podem gerar aprovações falsas. Exibir indisponibilidade ou dados anteriores explicitamente desatualizados, suspendendo ações dependentes de um estado válido.

O acompanhamento deve reagir a mudanças feitas fora do painel, inclusive `pull` e troca de branch. Não reutilizar posição de outro projeto, espaço ou demanda. Sem demanda ainda criada, apresentar estado vazio de projeto válido, sem tutorial de instalação.

## 9. Armazenamento de preferências

- Criar preferências e mídias no perfil local do usuário, mesmo antes de selecionar um projeto.
- Não criar `.vibes/` nos projetos.
- Não persistir novos dados de trabalho removidos nesta especificação.
- Iniciar um banco novo contendo somente preferências.
- Não implementar importação de `.vibes/` ou compatibilidade com bancos antigos.
- Não ler, converter ou apagar pastas antigas de dados nos projetos.
- Personalizações são oferecidas somente para estados que permanecerem no produto.

Os caminhos do armazenamento pessoal e sua configuração são descritos no TDD. A estrutura inicial do banco não precisa manter as tabelas dos recursos removidos.

## 10. Proteções técnicas

- Resolver e validar caminhos locais no servidor; não interpolá-los em comandos de shell.
- Manter validação de origem e host, confirmação de envio e escuta local por padrão.
- Tratar seleção de projeto como operação sensível: ela muda o diretório do shell e os arquivos acessíveis ao painel.
- Usar identificação de contexto de projeto e sessão para bloquear requisições antigas, inclusive em múltiplas abas.
- Serializar trocas de projeto e impedir envios durante a transição.
- Encerrar processos e observadores antigos e descartar respostas assíncronas de contextos anteriores.
- Manter o conteúdo dos artefatos como texto não executável.
- Excluir caminhos de projeto e preferências locais de qualquer compartilhamento automático.

## 11. Áreas afetadas

- `src/config/`: separar diretório do produto, armazenamento do usuário e projeto selecionado.
- `src/web/runtime.ts` e bootstrap: iniciar sem projeto, montar o contexto e coordenar a troca.
- `src/aidlc/`: validar formatos, resolver arquivos e reconstruir andamento exclusivamente pelos registros.
- `src/core/`: substituir decisões baseadas em progresso pessoal por decisões baseadas no AI-DLC.
- `src/terminal/`: vincular sessão ao projeto e garantir encerramento na troca.
- `src/db/` e `migrations/`: manter apenas preferências persistentes, com esquema inicial novo.
- `src/web/` e `src/app/`: cabeçalho, seleção de projetos e IA, acompanhamento simplificado e remoção das rotas desnecessárias.
- `src/guide/` e personalização: retirar preparação e momentos eliminados, mantendo conteúdo compatível.
- README, PRD, TDD e DESIGN: atualizar para o comportamento final implementado, sem apresentá-lo antecipadamente como disponível.

Esta especificação não ativa BDD nem solicita criação de testes automatizados. Na implementação, executar as verificações existentes e validar manualmente os critérios abaixo, conforme as regras do repositório.

## 12. Critérios de aceite

1. Uma instalação separada abre dois projetos locais alternadamente, sem copiar o Vibes para eles e sem reiniciar o servidor.
2. A seleção de projeto e IA fica acessível no cabeçalho principal, inclusive em layout estreito e por teclado.
3. A preferência de IA é restaurada por projeto; nomes iguais de pastas não misturam preferências.
4. Claude Code e Copilot recebem `/aidlc ...`; Devin recebe `aidlc ...`, preservando argumentos e caminhos.
5. Trocar a IA altera os próximos comandos e não substitui silenciosamente a ferramenta aberta.
6. Dois desenvolvedores com os mesmos arquivos do AI-DLC veem o mesmo andamento oficial, sem compartilhar banco do Vibes.
7. Alterações externas e troca de branch são refletidas sem reaproveitar estado de outro contexto.
8. Trocar de projeto com terminal vivo exige confirmação; cancelar mantém a sessão atual.
9. Nenhuma requisição anterior à troca escreve no terminal do novo projeto.
10. Todas as abas acompanham o projeto ativo do servidor e rejeitam comandos de contexto antigo.
11. Falha de validação do destino preserva o projeto atual; falha após encerramento da sessão é informada sem prometer sua restauração.
12. O produto não cria `.vibes/` nem dados auxiliares próprios no projeto acompanhado.
13. Preferências persistem no perfil local do usuário, sem importação ou alteração de arquivos antigos.
14. Notas, marcas de revisão, histórico persistido, progresso pessoal e preparação do AI-DLC deixam de aparecer e de ser gravados.
15. Ausência ou incompatibilidade de arquivos gera diagnóstico objetivo, sem tutorial e sem declarar andamento ou aprovação não comprovados.
16. O envio mantém confirmação e proteção contra repetição; o painel não apresenta envio como prova de execução.
17. Perguntas só aparecem como indicador se houver fonte em arquivos validada; ausência dessa capacidade não é mostrada como zero perguntas.
18. Permanecem a consulta de artefatos, as aprovações no terminal e as proteções de acesso local existentes.

## 13. Sequência sugerida de implementação

1. Validar o contrato real dos arquivos do AI-DLC e os comandos das três ferramentas nos projetos de referência.
2. Separar preferências locais, projeto selecionado e instalação do produto.
3. Implementar isolamento de contexto, troca segura e atualização das abas.
4. Substituir a lógica dos cinco passos pelo acompanhamento derivado dos arquivos.
5. Adicionar os seletores visíveis e a adaptação de comandos por IA.
6. Remover funcionalidades e persistências excluídas, sem acessar dados antigos.
7. Validar critérios de aceite e atualizar a documentação oficial.

## 14. Fora de escopo

- Configuração, instalação, autenticação ou diagnóstico completo das ferramentas de IA.
- Iniciar ou trocar automaticamente a ferramenta dentro do terminal.
- Transferência de conversa ou sessão entre ferramentas ou desenvolvedores.
- Conectar APIs, interfaces web ou ambientes remotos das ferramentas de IA.
- Sincronização em tempo real, servidor central ou banco compartilhado.
- Executar `commit`, `push`, `pull` ou resolver conflitos de Git automaticamente.
- Executar vários projetos simultaneamente na mesma instância.
- Novos arquivos compartilhados próprios do Vibes para notas, revisões ou histórico.
- Importação e compatibilidade com dados de instalações antigas.

## 15. Referências

- [PRD atual](PRD.md).
- [TDD atual](TDD.md).
- [Design atual](DESIGN.md).
- [Instalação e uso atuais](../README.md).

Essas referências devem acompanhar o comportamento implementado. O plano registra a sequência de execução e a validação realizada.
