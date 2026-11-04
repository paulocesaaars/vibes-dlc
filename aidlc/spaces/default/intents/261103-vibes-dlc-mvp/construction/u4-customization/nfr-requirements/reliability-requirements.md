# Confiabilidade: u4-customization

Base: `functional-design/rules.md` e `inception/requirements-analysis/requirements.md`.

| ID | Requisito | Verificação |
|---|---|---|
| NFR12.4 | Cada gravação é inteira ou não acontece: a mídia vai a um arquivo temporário, é renomeada e só então a linha é gravada em transação. Se algo falhar, o arquivo novo é apagado, a personalização anterior continua e a tela mostra `save_failed` (BR5.1) | Teste com falha injetada na escrita do arquivo, no rename e na transação |
| NFR12.5 | Cancelar substitui todas as linhas pelo retrato em uma única transação e só então apaga os arquivos novos. Se falhar, nada muda e a visita continua aberta (BR4.3) | Teste com falha na transação e com mídia trocada na visita |
| NFR12.6 | Ao iniciar, arquivos de `.vibes/media/` sem linha são apagados, e a varredura é abortada sem apagar nada se a leitura do banco falhar. Um arquivo ausente mostra a arte original, sem erro e sem gravar (BR4.5) | Teste com banco ilegível e com arquivo apagado à mão |
| NFR12.7 | As gravações da personalização (PUT, mídia, Concluir e Cancelar) passam por uma fila única, uma por vez. Dois envios simultâneos para o mesmo momento deixam, ao fim da visita, no máximo um arquivo sem linha | Teste com dois envios simultâneos e a visita concluída |
| NFR9.1 | U4 é verificada no Windows com Git Bash, em Node.js 22.13 ou superior (a versão mínima do projeto, conferida pelo teste de versão de U1) e no Edge. A verificação no Chrome, também exigida pelo NFR9, fica para a conferência final do MVP, por decisão de quem desenvolve registrada em U3: é um desvio aceito do NFR9 | Prova de U4 e `npm run verify` |
| NFR8.1 | Os textos novos ficam em português, com "a sua IA" fora do nome das opções de Sua IA, e os comandos ficam no original | Revisão do diff e teste de interface |
| NFR10.1 | Personalizar funciona só com teclado, com rótulos em todos os campos, o aviso de contraste em texto e não só em cor, e vídeo sem som, em repetição e parado com redução de movimento | Teste de interface |
| NFR11.1 | Mínimo de 80% de cobertura de linhas no projeto todo, e cada módulo cobre o caminho feliz e pelo menos dois casos de erro ou de borda | `npm run verify` |
| NFR12.2 | A migração `0004_u4.sql` só avança, com cópia prévia de `.vibes/vibes.db`, e não altera as tabelas de U1 a U3 | Teste do `Db`, partindo de um banco de U3 com dados |
