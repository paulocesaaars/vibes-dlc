# Confiabilidade: u1-walking-skeleton

Sem meta de disponibilidade, por ser um app local que a própria pessoa inicia. O que importa é não perder trabalho nem afirmar algo falso quando uma parte falha.

| ID | Requisito | Verificação |
|---|---|---|
| NFR12.1 | As migrações só avançam, cada uma em uma transação, e `.vibes/vibes.db` é copiado antes de migrar (BR6.1) | Teste do `Db`, inclusive com uma migração que falha |
| NFR12.2 | Uma falha de migração interrompe o início, mantém a cópia e mostra o arquivo que falhou | Teste do `Db` |
| NFR12.3 | Um comando em `pending` que sobrou de um processo interrompido vira `failed` no início seguinte | Teste do `Db` |
| NFR9.1 | Um Node.js anterior a 22.13 impede o início, com a versão exigida na mensagem (BR1.3) | Teste de `Config` |
| NFR9.2 | O MVP é verificado no Windows com Git Bash, nas versões atuais do Chrome e do Edge. A prova automática usa o Edge, que vem com o Windows, e a conferência final de quem desenvolve usa o Chrome | Prova da fatia e conferência |
| NFR1.2 | Uma leitura de arquivo que falha mantém a última válida. Depois de 10 segundos falhando, o guia mostra a falha (BR4.7) | Teste do `AidlcReader` com arquivo incompleto |
| NFR2.5 | Recarregar a página não encerra a sessão, e reconectar não repete um envio (BR3.3, BR5.3) | Passo 2 da prova e teste de integração |
| NFR2.6 | Sessão encerrada ou servidor reiniciado levam a Nova sessão, sem abrir nada sozinho (BR3.6, BR3.7) | Passo 10 da prova e teste de integração |

## Limites conhecidos

- A saída do terminal fica em memória e se perde quando o servidor para. É uma escolha, conforme NFR13.
- O shell termina com o servidor. Uma CLI em execução é interrompida junto, e o AI-DLC continua do seu próprio registro na sessão seguinte.

## Qualidade dos testes

| ID | Requisito | Verificação |
|---|---|---|
| NFR11.1 | Mínimo de 80% de cobertura de linhas no projeto todo, e cada módulo cobre o caminho feliz e pelo menos dois casos de erro ou de borda | Comando local único, que roda lint, tipos e testes com cobertura |
| NFR10.1 | Todas as ações funcionam só com teclado, com F6 ou botão para sair do terminal, e os estados não dependem só de cor (BR3.10, BR4.5) | Passo 9 da prova e teste de interface |
| NFR8.1 | A interface fica em português, com "a sua IA" nos textos do guia | Revisão do diff e teste de interface nos textos principais |
