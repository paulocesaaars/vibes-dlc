# Design não funcional de U1: confirmação

Os requisitos de U1 já definem as metas, e a stack está fechada, então não há pergunta aberta. O resumo abaixo reúne como vou atingi-las.

## Consolidated Summary Confirmation

- **Desempenho:** a saída do terminal vai direto ao stream, sem esperar o banco. A entrada usa POST com poucas teclas agrupadas. O observador usa eventos de arquivo, com conferência a cada 2 segundos como reserva.
- **Segurança:** uma única checagem de `Host` e `Origin`, usada por todas as rotas do terminal e de envio, sem exceções por rota. A entrada é validada com Zod antes de qualquer efeito.
- **Escala:** um único gerenciador de terminal em `globalThis`, compartilhado por todas as rotas, e uma conexão de stream por aba.
- **Confiabilidade:** falhas ficam isoladas por módulo. O terminal continua funcionando se o leitor do AI-DLC falhar, e o guia mostra a falha. O banco é copiado antes de migrar.
- **Observabilidade:** um único registrador em português, que só recebe mensagens sem saída do terminal nem texto de comandos.
- **Componentes:** os módulos do `TDD.md`, com `web` chamando `core`, `aidlc`, `terminal` e `db`. O `core` continua sem depender de nada externo.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
