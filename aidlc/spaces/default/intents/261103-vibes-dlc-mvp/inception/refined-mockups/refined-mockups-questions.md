# Telas detalhadas: perguntas

O protótipo (`design/prototipo/Main.dc.html`) já define telas, textos, cores e interações, e as etapas anteriores definiram acessibilidade (Q5) e tamanhos de tela (Q4). As perguntas abaixo tratam só do que surgiu depois dele: casos que o protótipo não tem.

## Q1. [Design] Como aparece o aviso de que a IA pode ter parado?

O aviso surge depois de 10 minutos sem mudança nos arquivos, mas a IA pode só estar em um trabalho longo. Ele não pode assustar nem dizer que a etapa travou.

A. Uma faixa dentro de Acompanhar, sem mudar de momento, que continua "Vez da sua IA" e oferece a ação de retomar
B. Muda para um momento próprio "Sua vez", com arte e terminal reaberto
C. Uma notificação passageira no canto da tela
X. Other (please specify)

[Answer]: A

## Q2. [Design] Que arte usam as telas que o protótipo não tem?

A falha no repositório e a IA parada não têm arte própria, e o escopo diz para usar as artes aprovadas, sem gerar novas.

A. Reaproveitar `pergunta.webp`, a Nix curiosa em uma bifurcação, que já é usada em "sessão encerrada" no protótipo
B. Essas telas ficam sem arte, só com texto
C. Gerar artes novas para esses casos, mudando essa regra do escopo
X. Other (please specify)

[Answer]: A

## Q3. [Design] Como fica o guia de uma demanda que não é a ativa?

Só a demanda ativa recebe comandos, e as outras podem ser consultadas. A pessoa precisa perceber isso antes de chegar ao passo Enviar.

A. Uma faixa fixa no topo da demanda: "Esta não é a demanda ativa", com a ação de torná-la ativa. A trilha e as abas continuam, e o passo Enviar fica desativado com o motivo
B. A demanda abre direto nas abas de consulta, sem os passos do guia, com a mesma ação
C. Só o passo Enviar avisa, sem faixa no topo
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **IA parada:** uma faixa dentro de Acompanhar, sem mudar de momento, que continua "Vez da sua IA" e oferece a ação de retomar.
- **Artes:** as telas que o protótipo não tem reaproveitam `pergunta.webp`, sem gerar artes novas.
- **Demanda não ativa:** uma faixa fixa no topo, com a ação de torná-la ativa. A trilha e as abas continuam, e o passo Enviar fica desativado com o motivo.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
