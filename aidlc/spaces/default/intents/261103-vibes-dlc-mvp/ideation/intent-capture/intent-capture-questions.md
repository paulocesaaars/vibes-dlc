# Captura da intenção: perguntas

## Sources

- [desc] Initial description: "Construir o MVP do Vibes DLC: um guia local, em português, que conduz uma pessoa pelo AI-DLC, uma tarefa por vez, com um terminal integrado onde ela usa a CLI de IA que preferir. Use o escopo mvp."
- [scope] Workflow-selected scope: `mvp`.

O conteúdo do `PRD.md` serviu de base para as opções abaixo, mas só vale como intenção depois de confirmado nas respostas.

## Q1. [Produto] Qual problema este MVP resolve?

O PRD descreve dois problemas ligados. Esta resposta define o problema central da intenção.

A. O AI-DLC tem muitas etapas e níveis, e quem começa não sabe o que cada etapa faz, o que precisa decidir nem quando é a sua vez de agir.
B. Times usam a IA como um autocompletar avançado e geram código sem contexto arquitetural, com gargalos de governança.
C. As duas anteriores: times aproveitam mal a IA, e o AI-DLC, que ajudaria, é difícil de seguir sem um guia.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Produto] Para quem é este MVP?

Isso define para quem o guia precisa ser claro em primeiro lugar.

A. Pessoas de engenharia, Tech Leads, Arquitetos e Product Owners que já usam IA por linha de comando, como descreve o PRD.
B. Só pessoas de engenharia que já usam IA por linha de comando.
C. Primeiro o próprio autor e o time dele, e depois os demais públicos do PRD.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Produto] Como saberemos que o MVP deu certo?

O PRD traz três critérios. Metas medidas precisam ser verificáveis, então a opção C pede só o que dá para testar agora.

A. Os três critérios do PRD: uma pessoa leva uma demanda real até o resultado sem sair da ferramenta; quem nunca usou o AI-DLC conclui uma etapa só com as instruções do guia; o painel roda com `npm install` e um comando.
B. Os três critérios do PRD, mais a prova de que o guia identifica pelos arquivos do AI-DLC em que momento a etapa está, sem interpretar o terminal.
C. Só a primeira fatia funcional: painel em 127.0.0.1, terminal real em Git Bash que sobrevive a recarregar, etapa e passo lidos dos arquivos, e comando enviado só após confirmação.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. [Produto] Por que fazer isso agora?

O PRD não diz o que motivou a iniciativa neste momento. Esta é a resposta que os documentos não trazem.

A. Uso próprio: o autor quer conduzir o AI-DLC com mais estrutura nos próprios projetos.
B. Adoção no trabalho: há interesse em levar o AI-DLC ao time ou à empresa, e falta um caminho fácil de seguir.
C. Oportunidade: um produto para outras pessoas e times que adotam o AI-DLC.
D. Not yet defined
X. Other (please specify)

[Answer]: B

## Q5. [Negócio] Quem são as partes interessadas?

Isso preenche o mapa de partes interessadas sem inventar nomes ou papéis.

A. Só o autor do projeto, que também é o usuário principal.
B. O autor e o time dele, que usaria o guia e compartilharia o histórico pelo Git.
C. O autor, o time e a empresa, que define o que pode ser usado (por exemplo, só o Git Bash no Windows).
D. Not identified
X. Other (please specify)

[Answer]: C

## Q6. [Negócio] Quem decide escopo e prioridade?

Isso define quem tem a palavra final nas aprovações deste trabalho.

A. O autor decide sozinho.
B. O autor decide, ouvindo o time.
C. Outra pessoa da empresa decide, e o autor influencia.
D. Not identified
X. Other (please specify)

[Answer]: B

## Q7. [Negócio] Há alguma comunicação ou relatório a manter?

Isso define se o trabalho precisa de atualizações para alguém além das aprovações de cada etapa.

A. Nenhuma: as aprovações e o histórico no Git bastam.
B. Só o registro em `FEEDBACK-AIDLC.md`, a cada etapa.
C. Atualizações periódicas para outras pessoas.
D. Not applicable
X. Other (please specify)

[Answer]: A

## Q8. [Produto] O que fica de fora desta primeira versão do produto?

O seu pedido já cita três itens. O plano mvp já foi escolhido; esta pergunta é só sobre o produto.

A. Os três itens do pedido: tratamento específico das etapas de implantação, modo direto e qualquer chamada de rede feita pelo produto.
B. Os três itens do pedido, mais o que o PRD já exclui: hospedar ou executar a IA, autenticação e contas, deploy e ações em produção, leitura de logs e métricas, integração com hosts de código, vários times na mesma instalação, e gamificação.
C. Os itens da opção B, e também a personalização, que ficaria para depois do MVP.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **Problema (Q1):** o AI-DLC tem muitas etapas e níveis, e quem começa não sabe o que cada etapa faz, o que precisa decidir nem quando é a sua vez de agir.
- **Público (Q2):** pessoas de engenharia, Tech Leads, Arquitetos e Product Owners que já usam IA por linha de comando.
- **Sucesso (Q3):** uma pessoa leva uma demanda real até o resultado sem sair da ferramenta; quem nunca usou o AI-DLC conclui uma etapa só com as instruções do guia; o painel roda com `npm install` e um comando.
- **Por que agora (Q4):** há interesse em levar o AI-DLC ao time ou à empresa, e falta um caminho fácil de seguir.
- **Partes interessadas (Q5):** o autor, o time e a empresa, que define o que pode ser usado.
- **Decisão (Q6):** o autor decide, ouvindo o time.
- **Comunicação (Q7):** nenhuma; as aprovações e o histórico no Git bastam.
- **Fora da primeira versão (Q8):** tratamento específico das etapas de implantação, modo direto e qualquer chamada de rede feita pelo produto.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
