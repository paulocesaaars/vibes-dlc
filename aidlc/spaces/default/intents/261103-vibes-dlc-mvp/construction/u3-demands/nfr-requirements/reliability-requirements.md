# Confiabilidade: u3-demands

Base: `functional-design/rules.md` e `inception/requirements-analysis/requirements.md`.

| ID | Requisito | Verificação |
|---|---|---|
| NFR1.5 | Um registro ilegível não afeta as demais demandas (BR4.3). Com `intents.json` ausente ou malformado, a lista vem das pastas | Teste e prova com um registro corrompido e um `intents.json` malformado |
| NFR1.6 | Sem `unit-of-work.md`, ou com um arquivo ilegível, a aba diz qual é e o que fazer (BR6.6) | Teste do `AidlcReader` |
| NFR12.2 | A migração `0003_u3.sql` só avança, com cópia prévia, e as linhas antigas ficam com `kind` igual a `stage` | Teste do `Db`, partindo de um banco de U2 com dados |
| NFR9.1 | U3 é verificada no Windows com Git Bash, no Edge. A conferência no Chrome fica para a conferência final do MVP, conforme decisão de quem desenvolve | Prova de U3 |
| NFR8.1 | Os textos novos ficam em português, com "a sua IA", e os comandos ficam no original | Revisão do diff e teste de interface |
| NFR10.1 | O Início, os três passos e as abas funcionam só com teclado, e os estados têm texto ou ícone além da cor | Teste de interface |
| NFR11.1 | Mínimo de 80% de cobertura de linhas no projeto todo, e cada módulo cobre o caminho feliz e pelo menos dois casos de erro ou de borda | `npm run verify` |
