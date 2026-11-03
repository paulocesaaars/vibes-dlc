# Análise de requisitos: perguntas

O `PRD.md`, o `TDD.md`, o protótipo e as etapas anteriores já respondem à maior parte dos requisitos, e esses pontos não são perguntados de novo. As perguntas abaixo tratam só do que continua em aberto.

## Q1. [Produto] Como saber que as metas de sucesso foram cumpridas?

O `PRD.md` diz que uma pessoa leva "uma demanda real" até o resultado e que quem nunca usou o AI-DLC conclui uma etapa só com o guia, mas não diz quantas pessoas nem o que conta como resultado. A revisão da intenção apontou essa falta. É isso que define quando o MVP está pronto, já que não haverá tag de versão.

A. Uma demanda real concluída por você, do registro até o código gerado, usando só o guia e o terminal integrado, e uma pessoa nova que conclui uma etapa sem ajuda nem documentação
B. O mesmo, com três pessoas novas no lugar de uma
C. O mesmo da opção A, e essa pessoa nova também conclui a demanda inteira
X. Other (please specify)

[Answer]: A

## Q2. [Produto] Como o produto chega ao repositório de outra pessoa?

O `PRD.md` diz que o guia vive dentro do repositório AI-DLC do usuário e roda com `npm install` e um comando, mas nenhum documento define como ele chega lá. Um repositório legado pode já ter o próprio `package.json`.

A. Copiando os arquivos para uma subpasta própria do repositório, com instruções no `README`, sem mexer no `package.json` existente
B. Publicando um pacote npm, que a pessoa instala e executa no repositório
C. Só funciona neste repositório no MVP, e a distribuição fica para depois
X. Other (please specify)

[Answer]: A

## Q3. [Produto] O que acontece com o botão "Pedir análise à sua IA" quando a pessoa usa outra CLI?

Com outra CLI, o guia não oferece envio de comandos, mas esse botão, no passo de escolher o nível da nova demanda, depende de enviar um. A revisão dos esboços apontou essa falta.

A. O botão vira uma orientação: mostra o pedido como referência, para a pessoa digitar na própria CLI
B. O botão some
C. O botão fica desativado, com o motivo visível
X. Other (please specify)

[Answer]: A

## Q4. [Produto] O que o guia faz quando a sua IA parece ter parado?

Nesta execução, a sessão parou quando os créditos acabaram, e nos arquivos a etapa continuou igual a uma etapa em andamento. O guia diria "A sua IA está trabalhando..." sem isso ser verdade, e ele não pode interpretar o terminal.

A. Depois de 10 minutos sem mudança nos arquivos do AI-DLC, avisar que a IA pode ter parado e orientar a conferir o terminal e retomar com o comando do AI-DLC
B. Não medir tempo: deixar sempre visível uma instrução de que, se a IA parar, a pessoa retoma com o comando do AI-DLC
C. Não tratar esse caso no MVP
X. Other (please specify)

[Answer]: A

## Q5. [Produto] O que o guia faz com uma demanda que não é a ativa no AI-DLC?

Cada demanda é um intent, e o AI-DLC trabalha em um intent ativo por vez. Enviar um comando olhando para outra demanda faria a IA trabalhar na demanda errada.

A. Qualquer demanda pode ser consultada, mas só a ativa recebe comandos. Nas outras, o guia oferece o comando para tornar aquela demanda ativa, com confirmação
B. O guia mostra só a demanda ativa
C. Ao abrir outra demanda, o guia a torna ativa automaticamente
X. Other (please specify)

[Answer]: A

## Q6. [Produto] Posso propor agora os ajustes no `PRD.md` e no `TDD.md` que as decisões anteriores pedem?

As respostas das etapas anteriores contrariam o texto atual: a seção "Sua IA" é uma exceção à regra de que a personalização não muda o conteúdo; o requisito 3 passa a valer só para o Claude Code; e o momento "Abrir a sua IA" sai do produto. Os requisitos desta etapa já seguem essas decisões.

A. Sim: ao fim desta etapa, me mostre o texto proposto para eu aprovar, antes de alterar os arquivos
B. Sim: altere os arquivos e eu vejo no diff
C. Não altere: os requisitos desta etapa prevalecem e o `PRD.md` fica como está
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **Pronto para o MVP (Q1):** você conclui uma demanda real, do registro ao código gerado, só com o guia e o terminal integrado, e uma pessoa nova conclui uma etapa sem ajuda nem documentação.
- **Instalação (Q2):** os arquivos são copiados para uma subpasta própria do repositório, com instruções no `README`, sem mexer no `package.json` existente.
- **Outra CLI (Q3):** o botão "Pedir análise à sua IA" vira uma orientação, com o pedido como referência para digitar.
- **IA parada (Q4):** depois de 10 minutos sem mudança nos arquivos do AI-DLC, o guia avisa que a IA pode ter parado e orienta a conferir o terminal e retomar.
- **Demandas (Q5):** qualquer demanda pode ser consultada, mas só a ativa recebe comandos. Nas outras, o guia oferece o comando para torná-la ativa, com confirmação.
- **Documentos (Q6):** ao fim desta etapa, mostro o texto proposto para o `PRD.md` e o `TDD.md`, e só altero depois da sua aprovação.
- **Padrões que vou assumir, sem pergunta própria:** o painel reflete uma mudança nos arquivos em até 3 segundos; o eco de uma tecla no terminal leva até 150 ms; Chrome e Edge atuais são os navegadores verificados; o registro ilegível da demanda ativa, ou a falta do AI-DLC ou do Git Bash, abre a tela de falha, e o registro ilegível de outra demanda vira aviso na linha dela.

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
