# Esboços de tela: perguntas

O protótipo (`design/prototipo/Main.dc.html`) já responde às telas, ao fluxo principal, à hierarquia e à identidade visual, e esses pontos não são perguntados de novo. As perguntas abaixo tratam só do que ele e o `PRD.md` não resolvem. As opções partem de `intent-statement.md`, `scope-document.md` e `intent-backlog.md`.

## Q1. [Produto] O que o guia faz quando a sua IA pode não estar aberta no terminal?

O protótipo tem o momento "Abra a sua IA", mas o painel não consegue saber se ela está aberta sem interpretar o terminal ("Pontos a validar" do `TDD.md`). Se o comando for enviado com a IA fechada, ele vai para o Git Bash.

A. Mostrar sempre, no passo Enviar, um lembrete de que a IA precisa estar aberta. A pessoa decide e confirma o envio.
B. Mostrar um botão "Abrir a sua IA" no início da sessão do terminal, que envia o comando da CLI depois de confirmação, além do lembrete.
C. Perguntar antes de cada envio se a IA está aberta.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Produto] Como o guia lida com uma CLI que não seja o Claude Code?

Na definição de escopo, você decidiu que os comandos prontos são só para o Claude Code e que, com outra CLI, a pessoa digita os comandos. Falta definir como o guia sabe disso, sem interpretar o terminal.

A. Perguntar uma vez, no primeiro uso, qual CLI a pessoa usa. Com outra CLI, o passo Enviar explica o que fazer, sem oferecer o envio.
B. Não perguntar: o comando aparece sempre e pode ser editado, e a pessoa com outra CLI o adapta.
C. Oferecer uma preferência na tela de personalização, com Claude Code como padrão.
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Q3. [Produto] O que o guia mostra quando não consegue funcionar no repositório?

O `TDD.md` já define a tela para a falta do Git Bash. O protótipo não mostra o caso de um repositório sem o AI-DLC instalado, nem o de um registro que o guia não consegue ler.

A. Tela de instrução com o problema e o que fazer, e o terminal continua disponível para resolver.
B. Tela de instrução com o problema e o que fazer, sem abrir o terminal.
C. Só um aviso no topo do início, e o restante continua visível.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. [Design] Em que tamanhos de tela o MVP precisa funcionar?

O requisito 2 do PRD pede o terminal em toda a lateral direita. O protótipo faz isso em telas largas e, abaixo de 1180 pixels de largura, empilha o terminal embaixo do guia.

A. Computador como foco, mantendo o empilhamento do protótipo abaixo de 1180 pixels.
B. Só computador: abaixo de uma largura mínima, mostrar um aviso para aumentar a janela.
C. Computador e celular, com ajustes específicos para telas pequenas.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. [Design] Qual é a meta de acessibilidade do MVP?

O PRD aceita o contraste do botão principal abaixo do mínimo, mas não define uma meta geral. O protótipo já tem navegação por teclado, rótulos e redução de movimento.

A. WCAG 2.1 AA, com a exceção já aceita do botão principal.
B. Manter o que o protótipo já tem, sem uma meta formal.
C. WCAG 2.1 AA sem exceção, o que reabre a decisão sobre o botão principal.
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q6. [Produto] Onde fica a escolha da CLI, se a personalização não pode mudar o comportamento?

Na Q2, você escolheu uma preferência na tela de personalização. Mas o PRD diz que a personalização muda a aparência e as frases, nunca o conteúdo nem a estrutura, e o protótipo informa nessa tela que os comandos ficam fixos. A preferência mudaria o passo Enviar: com outra CLI, o guia explica o que fazer, sem oferecer o envio.

A. Manter na mesma tela, em uma seção separada "Sua IA", e ajustar essa regra do PRD para permitir essa exceção.
B. Tirar da personalização e colocar em um acesso próprio no início, sem mudar a regra do PRD.
C. Mudar a resposta da Q2: o guia não pergunta, o comando aparece sempre e pode ser editado.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **IA aberta (Q1):** o passo Enviar sempre lembra que a IA precisa estar aberta. A pessoa decide e confirma o envio. O guia não oferece o botão "Abrir a sua IA".
- **Outra CLI (Q2 e Q6):** uma seção "Sua IA" na tela de personalização, com Claude Code como padrão. Com outra CLI, o passo Enviar explica o que fazer, sem oferecer o envio. Isso exige ajustar no PRD a regra de que a personalização não muda o conteúdo.
- **Falhas no repositório (Q3):** uma tela com o problema e o que fazer, com o terminal disponível para resolver.
- **Tamanhos de tela (Q4):** o foco é o computador, e o terminal fica embaixo do guia abaixo de 1180 pixels de largura.
- **Acessibilidade (Q5):** mantém o que o protótipo já tem, sem uma meta formal.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
