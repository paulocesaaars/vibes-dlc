# Definição de escopo: perguntas

As opções partem de `intent-statement.md`, `feasibility-assessment.md`, `constraint-register.md` e dos 17 requisitos do `PRD.md`. Não há prazo fixo (resposta Q4 da viabilidade), então não perguntamos sobre datas.

## Q1. [Produto] O que o MVP precisa entregar?

O PRD lista 17 requisitos, e o desenvolvimento é de uma pessoa. O MVP precisa permitir que alguém leve uma demanda real até o resultado usando o guia.

A. Todos os 17 requisitos do PRD.
B. O guia completo: registrar demanda, terminal, trilha, cinco passos, revisão, conclusão e consultas. A personalização fica conforme a pergunta seguinte.
C. Só a primeira fatia: painel local, terminal real, etapa e passo lidos dos arquivos e envio de comando com confirmação.
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q2. [Produto] A personalização de imagens, frases e cores entra no MVP?

Ela não ajuda a provar as metas de sucesso, mas é um dos pedidos do autor e já existe no protótipo.

A. É obrigatória no MVP.
B. Entra no MVP, mas só depois de o guia funcionar de ponta a ponta. Se atrasar, sai sem bloquear.
C. Fica para depois do MVP.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Produto] Como o MVP trata as outras CLIs de IA?

O terminal aceita qualquer CLI, mas os comandos do AI-DLC mudam por ferramenta (por exemplo, o Codex usa `$aidlc`). Isso é o risco R4 da viabilidade.

A. Comandos prontos só para o Claude Code. Com outra CLI, a pessoa usa o terminal normalmente e digita os comandos.
B. Comandos prontos para Claude Code e Codex.
C. Modelo de comando editável, para funcionar com qualquer CLI.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. [Produto] As demais exclusões do PRD valem para o MVP?

Na intenção, você confirmou três itens fora da primeira versão. O PRD exclui outros: hospedar ou executar a IA, autenticação e contas, deploy e ações em produção, leitura de logs e métricas, integração com hosts de código, vários times na mesma instalação, e gamificação.

A. Sim, todas ficam de fora.
B. Quase todas ficam de fora: informo qual entra.
C. Quero rever essa lista.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. [Engenharia] Em que ordem construir?

Sem prazo fixo, a ordem define o que se aprende primeiro. O maior risco técnico é o terminal real no Windows com Git Bash.

A. Risco primeiro: terminal e leitura dos sinais, depois o guia, depois o restante.
B. Valor primeiro: telas do guia com dados simulados, depois o terminal real.
C. Dependência primeiro: base de dados e configuração, depois as telas e o terminal.
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q6. [Produto] Como conciliar "valor primeiro" com a primeira fatia real?

A resposta da Q5 pede telas com dados simulados antes do terminal real. Já o pedido inicial e a viabilidade aprovada pedem que a primeira fatia prove o caminho real: painel, terminal em Git Bash, etapa lida dos arquivos e comando com confirmação. O plano mvp também exige que a primeira unidade seja verificada de ponta a ponta com o resultado real.

A. Mantém a primeira fatia real e, dentro dela, faz cedo as telas do guia que dão valor; o restante segue por valor.
B. Telas com dados simulados primeiro, e a primeira fatia real logo em seguida, aceitando descobrir mais tarde se o terminal funciona.
C. Risco primeiro em tudo, como na opção A da Q5.
D. Not yet defined
X. Other (please specify)

[Answer]: C

## Consolidated Summary Confirmation

- **O que o MVP entrega (Q1 e Q2):** o guia completo, com a personalização obrigatória. Na prática, os 17 requisitos do PRD.
- **Outras CLIs (Q3):** comandos prontos só para o Claude Code; com outra CLI, a pessoa digita os comandos no terminal.
- **Fora do MVP (Q4):** todas as exclusões do PRD, além dos três itens confirmados na intenção.
- **Ordem (Q6, que substitui a Q5):** risco primeiro: terminal e leitura dos sinais, depois o guia, depois o restante.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
