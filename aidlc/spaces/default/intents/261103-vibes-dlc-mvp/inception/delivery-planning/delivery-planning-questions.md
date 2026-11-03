# Planejamento de entrega: perguntas

**Já decidido:** a ordem começa pelo maior risco (Q6 da definição de escopo), a primeira Unidade é a fatia fina de ponta a ponta (`team-practices.md`) e o trabalho é em série (`aidlc-state.md`). Um Bolt é uma passada de construção sobre uma parte do trabalho, que termina em algo que funciona. Cada Unidade será um Bolt, e todos ficam com a IA, porque esta etapa não tem formação de time neste nível.

## Q1. [Entrega] Em que ordem vêm as Unidades depois da primeira?

U2, U3, U4 e U5 só dependem de U1, então qualquer ordem é possível. Os critérios de pronto exigem U2, U3 e U5. A personalização (U4) está no MVP, mas é Should Have.

A. U2 condução, U3 demandas, U5 instalação e U4 personalização, com o que os critérios exigem primeiro
B. U2 condução, U3 demandas, U4 personalização e U5 instalação, deixando a instalação do produto pronto por último
C. U5 instalação logo depois de U1, para testar cedo em outro repositório, seguida de U2, U3 e U4
X. Other (please specify)

[Answer]: A

## Q2. [Entrega] Quando acontece o teste com uma pessoa nova no AI-DLC?

O critério de pronto exige que uma pessoa que nunca usou o AI-DLC conclua uma etapa sem ajuda. Testar cedo permite corrigir os textos do guia antes do fim, mas exige a condução completa.

A. Logo depois de U2, com a condução completa, e de novo no fim, se os textos mudarem muito
B. Só no fim, com o produto completo
C. Depois de U5, com a instalação pronta
X. Other (please specify)

[Answer]: A

## Q3. [Entrega] Quando tratar os pontos de revisão aceitos como risco?

Nas etapas anteriores, você aceitou como risco pontos como rotas faltando nos contratos, envio registrado antes de acontecer e lacunas na tabela de momentos. Eles voltam a pesar quando cada Unidade for construída.

A. No design funcional da Unidade afetada, antes do código dela
B. Todos de uma vez, em uma revisão dos documentos antes de U1
C. Só se causarem problema durante a construção
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **Ordem:** U1 fatia de ponta a ponta, U2 condução, U3 demandas, U5 instalação e U4 personalização. Cada Unidade é um Bolt, em série, com a IA.
- **Teste com uma pessoa nova:** logo depois de U2, e de novo no fim, se os textos mudarem muito.
- **Pontos aceitos como risco:** resolvidos no design funcional da Unidade afetada, antes do código dela.
- **Atenção:** a ordem real de construção vem do grafo de Unidades, onde U2 a U5 não dependem entre si. Se o fluxo propuser U4 antes de U5, eu aviso, e a troca é um ajuste no grafo.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
