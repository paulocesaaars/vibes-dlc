# Design de escala: u1-walking-skeleton

Base: `nfr-requirements/scalability-requirements.md`.

- **NFR2.3, sessão única:** o `TerminalManager` fica em `globalThis`, sob uma chave própria. Cada rota obtém o mesmo objeto, inclusive depois do recarregamento a quente do `npm run dev`. Pedidos simultâneos de abertura ficam em fila, e só o primeiro abre o shell.
- **NFR2.4, várias abas:** cada aba abre uma conexão de stream, e o gerenciador mantém a lista de ouvintes. Um ouvinte que cai sai da lista, sem afetar os demais. Todas recebem os mesmos blocos, com o mesmo `seq`.
- **Tamanho do terminal com duas abas:** vale o último `resize` recebido. As duas abas mostram a mesma sessão, então a menor pode ver a tela cortada.

Não há outra medida de escala, por ser um app local de uma pessoa.
