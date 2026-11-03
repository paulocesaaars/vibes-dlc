# Escala: u1-walking-skeleton

O produto é um app local, usado por uma pessoa de cada vez. Não há meta de carga nem plano de crescimento.

| ID | Requisito | Meta | Verificação |
|---|---|---|---|
| NFR2.3 | Sessões de terminal por processo | Uma, em um único registro em `globalThis`, compartilhado por todas as rotas e mantido no recarregamento a quente do `npm run dev` | Teste do `Terminal`: um segundo pedido entra na sessão viva. A prova roda em `npm run dev` e confere o mesmo `sessionId` em `session`, `input` e `stream` |
| NFR2.4 | Abas conectadas à mesma sessão | Duas abas verificadas, sem limite imposto | Teste de integração com duas conexões (BR3.5) |

A saída do terminal fica limitada pela janela de NFR2.2. As tabelas `guide_progress` e `sent_command` crescem pouco, com algumas linhas por etapa, e não precisam de limpeza no MVP.
