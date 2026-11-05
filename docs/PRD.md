# PRD — Vibes DLC (Guia do AI-DLC)

## Problema
Times de engenharia tentam encaixar a IA em métodos tradicionais, como o Scrum
clássico, e a usam apenas como um autocompletar avançado. O resultado é código
sem contexto arquitetural profundo ("cimento rápido": rígido e difícil de
manter), gargalos de governança e compliance e pouco aproveitamento da
autonomia da IA. Falta um fluxo em que a máquina lidere a geração estruturada
de artefatos, com supervisão humana contínua e adaptada ao tamanho do desafio.

O AI-DLC resolve parte disso, mas tem várias etapas e níveis de fluxo. Quem
começa não sabe o que cada etapa faz, o que precisa decidir nem quando é a sua
vez de agir.

## Objetivo
Guiar as pessoas, na prática, pelo framework AI-DLC (AI-Driven Development
Lifecycle) em um ambiente interativo, no lugar de wikis estáticas e manuais
teóricos. A IA orquestra o ciclo, e a pessoa supervisiona, aprova e toma as
decisões críticas de arquitetura.

O produto é um guia local, que vive dentro do repositório AI-DLC do usuário, e
não um painel de consulta: ele conduz uma tarefa por vez e diz sempre o que fazer
agora e de quem é a vez. Não executa a IA por conta própria: oferece um terminal
integrado, onde o usuário chama a CLI de IA de sua preferência (Claude Code,
Codex, Devin ou outra). A cada etapa do ciclo, o guia envia ao terminal os
comandos do AI-DLC correspondentes e mostra o andamento e os artefatos gerados.

A aparência implementada está descrita em [DESIGN.md](DESIGN.md). O terminal
integrado é real; as funções disponíveis são as descritas neste documento.

## Para quem
Pessoas de engenharia de software, Tech Leads, Arquitetos e Product Owners que
já usam IA por linha de comando e querem conduzir o AI-DLC com mais estrutura e
rastreabilidade, sem perder o controle da qualidade da arquitetura.

## Escopo
- **Inclui:**
  - as fases do AI-DLC, exibidas em português: Preparação, Ideação, Concepção,
    Construção e Operação;
  - condução passo a passo de cada etapa, com trilha, instruções e explicação do
    que a etapa faz;
  - consulta das Unidades e de seu estado a partir dos registros do AI-DLC;
  - revisão guiada dos artefatos gerados (TDDs, Domain Designs e testes);
  - terminal integrado, com sessão persistente, onde o usuário executa a CLI de
    IA que escolher;
  - envio dos comandos do AI-DLC ao terminal, etapa por etapa, com confirmação
    do usuário;
  - fluxo adaptado ao tamanho da demanda;
  - personalização de imagens, vídeos, frases e cores;
  - instalação dentro do repositório AI-DLC do usuário, sem serviços externos;
  - uso local por uma pessoa. O time compartilha o histórico pelo Git do
    repositório.
- **Fora de escopo:**
  - hospedar ou executar a IA: o produto não chama APIs de modelos nem mantém
    chaves de IA;
  - autenticação, contas e papéis: o app roda na máquina do usuário, e os
    papéis do ciclo já são representados pelos agents do AI-DLC;
  - automação própria de deploy ou acesso a produção: o produto oferece um shell
    local, e os efeitos dos comandos da CLI dependem das permissões dessa CLI;
  - leitura de logs e métricas de produção;
  - integração com GitHub ou outros hosts de código: branches e pull requests
    ficam por conta da CLI de IA e do próprio usuário;
  - vários times ou projetos na mesma instalação;
  - alterar pela personalização a estrutura do guia, as etapas, os comandos, o
    terminal ou o desenho do logo;
  - gamificação, como pontos, sequências ou vidas: aprovar é uma decisão, não um
    jogo;
  - modo direto, sem os cinco passos do guia;
  - tratamento específico das etapas de implantação.

## Requisitos
1. O produto deve permitir registrar uma demanda e acompanhar seu estado ao longo
   das fases do ciclo. O registro tem três passos, com uma pergunta por vez:
   descrever a demanda, escolher o nível e confirmar o comando.
2. O produto deve oferecer um terminal integrado, no navegador, que execute o
   shell da máquina do usuário: Git Bash no Windows. Nele o usuário chama qualquer
   CLI de IA, e a sessão sobrevive a recarregar a página. O terminal ocupa toda a
   lateral direita e pode ser recolhido e expandido sem encerrar a sessão.
3. O produto deve enviar ao terminal os comandos do AI-DLC de cada etapa. O
   usuário vê o comando e confirma antes do envio, e pode editá-lo. Pode executar
   na hora ou só colar o comando, para pressionar Enter no terminal. Os comandos
   prontos são para o Claude Code. Com outra CLI, o guia mostra o comando como
   referência e permite copiá-lo, sem envio. As sugestões de comando têm um ícone
   de copiar no canto direito; o histórico de comandos enviados não tem essa ação.
4. O produto deve ler o estado e os artefatos que o AI-DLC grava no repositório e
   exibi-los para revisão (plano, Units, Bolts, TDDs, Domain Designs e testes).
5. O produto deve sugerir o nível do fluxo por regras locais, mostrando o motivo.
   O usuário confirma ou troca, e pode pedir uma análise à CLI de IA, enviada como
   comando. O produto não consulta modelo algum. Com outra CLI, o pedido de análise
   aparece como referência, para a pessoa digitar.
6. As perguntas, decisões de arquitetura e aprovações de etapa acontecem no
   terminal, nos gates do próprio AI-DLC. O produto não tem botão de aprovar. Deve
   exibir essas decisões e aprovações, lidas do registro do AI-DLC, ligadas à
   demanda.
7. O produto deve manter o histórico dos comandos que enviou ao terminal, ligado
   à demanda e à etapa.
8. O produto deve funcionar com repositórios novos e legados.
9. A instalação deve exigir apenas Node.js, `npm install` e a execução do Next.
   Não pode depender de banco, fila ou serviço externo. No Windows, exige também o
   Git Bash. O produto é instalado copiando os arquivos para uma subpasta própria do
   repositório, sem alterar o `package.json` existente. Sem AI-DLC, a tela oferece
   comandos de preparação que podem ser copiados ou colados sem Enter no terminal.
10. O produto deve aceitar a execução de uma etapa no terminal sem o painel
    aberto: ao reabrir, deve reconciliar o estado a partir dos arquivos do
    AI-DLC e avisar o usuário do que mudou.
11. O produto deve conduzir cada etapa em cinco passos, com uma barra de progresso:
    Entender, Enviar, Acompanhar, Revisar e Aprovar. Cada momento mostra uma
    instrução, de quem é a vez e, no máximo, uma ação principal.
12. O produto deve mostrar a trilha das etapas da demanda, por fase, distinguindo
    as concluídas, a atual, as bloqueadas e as puladas. Abrir uma etapa concluída
    mostra seus artefatos.
13. O passo Revisar deve apresentar um artefato por vez, com uma lista do que
    conferir, e contar quantos foram revisados. Quando um artefato mudar depois de
    revisado, ele volta a pedir revisão.
14. Ao concluir uma etapa, o produto deve mostrar o progresso da demanda e quantos
    artefatos foram revisados, e avisar se a aprovação ocorreu sem revisar todos.
15. O produto deve oferecer uma tela de personalização, em que o usuário troca, por
    momento do guia, a imagem ou o vídeo e as frases, e troca as cores da interface.
    Cada item pode voltar ao original, e sair com Cancelar desfaz o que foi mudado
    naquela visita.
16. Os textos do fluxo usam "a sua IA". A preparação do repositório cita Claude Code
    e apresenta os comandos para configurar seu harness e abrir essa CLI.
17. Toda a interface deve estar em português (Brasil). Ficam no original apenas os
    comandos do AI-DLC, os caminhos de arquivo e o que a CLI de IA imprime.
18. Só a demanda ativa no AI-DLC recebe comandos. As outras podem ser consultadas, e o
    guia oferece o comando para torná-la ativa, com confirmação.
19. Depois de 10 minutos sem mudança nos arquivos do AI-DLC, com a etapa em andamento,
    o guia avisa que a IA pode ter parado e orienta a retomar.

## Níveis do fluxo
Os 11 níveis selecionáveis são Expressa (`express`), Correção de erro (`bugfix`),
Correção de segurança (`security-patch`), Refatoração (`refactor`), Prova de conceito
(`poc`), Infraestrutura (`infra`), Produto mínimo (`mvp`), Clássica (`classic`),
Oficina (`workshop`), Funcionalidade (`feature`) e Corporativa (`enterprise`).

A sugestão usa palavras-chave da descrição e mostra seu motivo. Na ausência de
correspondência, sugere Funcionalidade. O seletor apresenta inicialmente o nível
sugerido e o escolhido; Ver todos os níveis expande as opções. As etapas e sua
quantidade vêm do estado da demanda e do grafo instalado no projeto.

## Regras de negócio
- A aprovação de cada etapa é dada no gate do AI-DLC. O guia só oferece o
  comando da etapa seguinte depois que o AI-DLC registrar a etapa atual como
  aprovada.
- A aprovação registrada no AI-DLC já move a demanda para a etapa seguinte. Por
  isso, a tela de conclusão vem da etapa anterior: ela aparece com essa etapa
  marcada como concluída e com o evento de aprovação registrado, e some assim que
  a IA começar a etapa seguinte.
- O guia sugere o nível do fluxo, e a pessoa confirma ou troca.
- O produto não envia comando ao terminal sem confirmação explícita do usuário.
- A revisão dos artefatos é incentivada, mas não bloqueia a aprovação: o gate é do
  AI-DLC, e o guia não pode impedi-lo.
- A personalização muda a aparência e as frases, nunca o conteúdo nem a estrutura:
  o produto é sempre um guia do AI-DLC. A exceção é a seção "Sua IA", em que a pessoa
  diz se usa outra CLI, o que muda o passo Enviar.
- O logo é a identidade do Vibes DLC: o desenho não muda, e só a cor do logo e do
  título pode ser escolhida, separada da cor principal. O favicon mantém sempre a
  cor original.
- O painel escuta em `127.0.0.1` por padrão; o endereço pode ser configurado.
  Quem acessa o painel tem o mesmo poder do usuário no terminal. O bloqueio de
  `fetch` externo no processo do app não restringe a rede usada pela CLI de IA.

## Riscos
- A IA pode gerar código incoerente com a arquitetura existente, sobretudo em
  sistemas legados.
- As aprovações podem virar uma formalidade, sem revisão real, e esvaziar a
  supervisão humana. O passo Revisar reduz o risco, e a revisão dos artefatos e do
  código no Git continua sendo a segunda barreira.
- O terminal dá acesso total ao shell. Se o servidor for exposto fora de
  `127.0.0.1`, qualquer pessoa na rede executa comandos na máquina. O produto
  mostra um alerta nesse caso.
- A saída das CLIs de IA muda entre versões e entre ferramentas. O guia não
  deve depender de interpretar essa saída; deve se apoiar nos arquivos do AI-DLC.
  Isso limita o que ele sabe sobre o terminal (veja "Limites da integração" no TDD).
- O pacote do terminal (`node-pty`) tem parte nativa e pode exigir compilação em
  alguns sistemas durante o `npm install`.
- Quem já conhece o fluxo pode achar repetitivo passar pelos cinco passos. Isso é
  aceito; a interface atual não oferece modo direto.
- Cores personalizadas podem prejudicar a leitura. O produto avisa quando o
  contraste com o fundo fica baixo.

## Suposições
- O usuário já tem a CLI de IA instalada e autenticada na própria máquina.
- O AI-DLC grava estado e artefatos em arquivos do repositório
  (`aidlc/spaces/<space>/intents/<intent>/`), e o guia os lê.
- "Sem dependência externa" significa não instalar outros sistemas (banco, fila,
  Docker). Pacotes npm instalados pelo `npm install` são aceitos.
- Os papéis do ciclo (produto, arquitetura, desenvolvimento, qualidade e demais)
  já são os agents do AI-DLC, e o produto não os replica.
- A personalização é individual: fica na máquina do usuário e não é compartilhada
  com o time pelo Git.
- O nome do produto é Vibes DLC.

## Decisões tomadas
- **Artes padrão:** a distribuição inclui as ilustrações WebP em `public/guia/`.
- **Modo direto:** a interface oferece os cinco passos de cada etapa.
- **Etapas de implantação:** não têm tratamento específico na interface.
- **Identidade visual:** cores, fontes e formatos estão descritos em
  [DESIGN.md](DESIGN.md), incluindo o contraste do botão principal padrão.
