# Histórias de usuário: plano e perguntas

## Plano

- **Formato:** "Como [persona], quero [objetivo], para [benefício]", seguindo INVEST, com critérios em Given/When/Then.
- **Identificadores:** `US{grupo}.{seq}` nas histórias e `AC{grupo}.{seq}.{critério}` nos critérios.
- **Prioridade:** MoSCoW em cada história. O limite final do MVP é decidido no planejamento de entrega.
- **Base:** `inception/requirements-analysis/requirements.md`, com cada FR e NFR ligado a uma história ou a uma etapa posterior.

## Q1. [Produto] Quem são as personas das histórias?

O `PRD.md` cita engenharia, Tech Leads, Arquitetos e Product Owners que já usam IA por linha de comando. Na prática, o que muda o comportamento do guia é conhecer ou não o AI-DLC, e usar ou não o Claude Code.

A. Três personas: quem está conhecendo o AI-DLC, quem já conhece e conduz demandas reais, e quem usa outra CLI
B. Uma persona por papel: engenharia, Tech Lead, Arquiteto e Product Owner
C. Só duas personas: quem está conhecendo o AI-DLC e quem já conhece
X. Other (please specify)

[Answer]: A

## Q2. [Produto] Como agrupar as histórias?

O agrupamento define como você lê as histórias e como as Unidades de construção se formam depois.

A. Pela jornada: instalar, registrar demanda, conduzir etapa, revisar e aprovar, retomar, consultar e personalizar
B. Por capacidade, na mesma ordem dos grupos FR1 a FR13
C. Por persona
X. Other (please specify)

[Answer]: A

## Q3. [Produto] Como aplicar as prioridades, se todo o `PRD.md` está dentro do MVP?

Na definição de escopo, você manteve os 17 requisitos no MVP, mas o planejamento de entrega precisa saber o que cortar primeiro se o trabalho ficar maior que o esperado.

A. Must Have para o que os três critérios de pronto exigem, e Should Have para o restante, sem tirar nada do MVP
B. Tudo como Must Have
C. Must Have só para a primeira fatia, e Should Have para todo o resto
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **Personas:** três, por comportamento: quem está conhecendo o AI-DLC, quem já conhece e conduz demandas reais, e quem usa outra CLI.
- **Agrupamento:** pela jornada: instalar, registrar demanda, conduzir etapa, revisar e aprovar, retomar, consultar e personalizar.
- **Prioridades:** Must Have para o que os três critérios de pronto exigem e Should Have para o restante, sem tirar nada do MVP.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
