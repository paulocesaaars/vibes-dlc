# Personas: MVP do Vibes DLC

As personas são por comportamento, porque o guia age igual para engenharia, Tech Leads, Arquitetos e Product Owners (`PRD.md`). O que muda o guia é conhecer ou não o AI-DLC e usar ou não o Claude Code. Todas já usam IA por linha de comando, e os nomes abaixo são descritivos.

## P1. Quem está conhecendo o AI-DLC

- **Papel:** qualquer um dos papéis do `PRD.md`, no primeiro contato com o framework.
- **Objetivos:** concluir uma etapa sem ajuda; entender o que cada etapa faz e o que precisa decidir.
- **Dificuldades:** não sabe quando é a sua vez nem o que os artefatos significam; depende de documentação longa.
- **Familiaridade técnica:** alta com a linha de comando, baixa com o AI-DLC.
- **Frequência:** primeiras demandas.
- **Critério de pronto ligado:** CP2 de `requirements.md`.

## P2. Quem conduz demandas reais

- **Papel:** quem já conhece o AI-DLC e o usa no dia a dia. Inclui quem desenvolve o Vibes DLC.
- **Objetivos:** levar uma demanda real até o código gerado sem sair da ferramenta; retomar o trabalho de onde parou; revisar antes de aprovar.
- **Dificuldades:** perde o fio entre sessões; aprovações podem virar formalidade; os cinco passos podem parecer repetitivos, o que o `PRD.md` aceita.
- **Familiaridade técnica:** alta com a linha de comando e com o AI-DLC.
- **Frequência:** várias vezes por semana.
- **Critérios de pronto ligados:** CP1 e CP3 de `requirements.md`.

## P3. Quem usa outra CLI

- **Papel:** qualquer um dos papéis do `PRD.md`, usando uma CLI de IA que não é o Claude Code.
- **Objetivos:** ter a mesma condução e o mesmo acompanhamento, digitando os próprios comandos.
- **Dificuldades:** os comandos prontos não valem para a CLI dela; precisa descobrir o comando equivalente.
- **Familiaridade técnica:** alta com a linha de comando; com o AI-DLC, varia.
- **Frequência:** como P1 ou P2.
- **Critério de pronto ligado:** nenhum; a escolha é a seção "Sua IA".

## Prioridade e relação

1. **P2** vem primeiro, porque a primeira fatia e o CP1 dependem do fluxo real completo.
2. **P1** vem em seguida: usa os mesmos fluxos, e o CP2 mede se as instruções bastam.
3. **P3** é uma variação do passo Enviar. Quem é P3 também é P1 ou P2 no restante da jornada.
