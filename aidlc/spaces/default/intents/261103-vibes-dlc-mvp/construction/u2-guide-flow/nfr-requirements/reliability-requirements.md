# Confiabilidade: u2-guide-flow

| ID | Requisito | Verificação |
|---|---|---|
| NFR1.5 | Uma entrada incompleta ou malformada no `audit/`, ou um campo desconhecido, é ignorada, e o restante é usado (BR1.3) | Teste com entradas boas, ruins e cortadas |
| NFR1.6 | Um comando de perguntas que falha ou demora mantém a instrução genérica, sem erro na tela (BR2.2) | Teste do `AidlcReader` com falha e demora |
| NFR12.2 | A migração `0002_u2.sql` só avança, com cópia prévia do banco, como em U1 | Teste do `Db` partindo de um banco de U1 |
| NFR9.1 | U2 é verificada no Windows com Git Bash, no Edge, e a conferência final usa o Chrome | Prova de U2 e conferência |
| NFR8.1 | Os textos novos ficam em português, com "a sua IA", e `Approve` e `Request Changes` ficam no original | Revisão do diff e teste de interface |
| NFR10.1 | A trilha, Revisar e os avisos funcionam só com teclado, e os estados têm texto ou ícone além da cor (BR8.1) | Teste de interface |
| NFR11.1 | Mínimo de 80% de cobertura de linhas no projeto todo, e cada módulo cobre o caminho feliz e pelo menos dois casos de erro ou de borda | Comando local único |
