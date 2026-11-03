# Contratos: perguntas

**Já decidido:** o produto não tem API pública (`TDD.md`). As rotas internas atendem só a própria interface, e as Unidades ficam no mesmo processo e no mesmo repositório (`unit-of-work-dependency.md`). A transmissão usa SSE para saída e `POST` para entrada.

## Q1. [Arquitetura] Em que formato os contratos entre módulos e rotas ficam definidos?

U2, U3, U4 e U5 dependem de U1. O contrato principal é o retrato de sinais que o `Core` recebe e o momento que ele devolve, além das rotas internas usadas pela interface. O `TDD.md` já usa Zod para validar a entrada das rotas.

A. Tipos TypeScript entre módulos e esquemas Zod nas rotas, sem documento OpenAPI gerado
B. O mesmo, com um documento OpenAPI gerado a partir dos esquemas
C. Só tipos TypeScript, sem validar a entrada em tempo de execução
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **Formato:** tipos TypeScript entre módulos e esquemas Zod nas rotas, sem documento OpenAPI gerado.
- **Padrões que vou assumir, sem pergunta própria:** como tudo fica no mesmo repositório, uma mudança incompatível é feita no mesmo commit que ajusta os consumidores, sem versionar as rotas. Consumidores ignoram campos desconhecidos. O comando de leitura do AI-DLC tem limite de 5 segundos. A interface reconecta o SSE sozinha, sem repetir nenhum envio.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
