# Observabilidade: u1-walking-skeleton

O produto roda na máquina da pessoa, sem servidor para monitorar. Não há métricas, alertas, painel nem rastreamento distribuído.

| ID | Requisito | Verificação |
|---|---|---|
| NFR13.3 | Os logs vão só ao console do processo, em português, e não guardam a saída do terminal nem o texto dos comandos | Teste de logs com marcadores |
| NFR3.3 | O início registra o endereço de escuta e, fora de `127.0.0.1`, o aviso de exposição | Teste de `Config` |
| NFR1.3 | Falhas ao ler arquivos, abrir o shell ou migrar o banco são registradas com o caminho e o motivo | Testes dos módulos, nos casos de erro |

O que a pessoa precisa saber aparece na tela do guia, não nos logs. A execução da prova da fatia guarda as medidas de eco e de atualização na saída do script.
