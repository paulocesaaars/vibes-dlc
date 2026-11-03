# Design não funcional de U2: confirmação

Os requisitos de U2 já definem as metas, então não há pergunta aberta. O resumo abaixo reúne como vou atingi-las.

## Consolidated Summary Confirmation

- **Desempenho:** a leitura de `audit/` e o comando de perguntas são assíncronos, e o resultado fica guardado pela assinatura dos arquivos. Um único comando roda por vez.
- **Segurança:** uma função própria valida etapa e Unidade antes de chamar o `cmd.exe`, com argumentos fixos. Outra função resolve o caminho do artefato e recusa o que sair do registro. As rotas novas usam `isRequestAllowed`.
- **Escala:** a leitura do `audit/` só repete quando as datas mudam, e o resultado fica em memória.
- **Confiabilidade:** cada falha cai para a instrução genérica, sem derrubar o painel, e a migração `0002_u2.sql` segue o executor de U1.
- **Observabilidade:** usa o `logger` de U1, sem texto de perguntas, artefatos ou comandos.
- **Componentes:** `AidlcReader` ganha a leitura do `audit/` e dos artefatos, `Core` ganha os momentos e a trilha, `Db` ganha as duas tabelas e `GuideContent` ganha a lista do que conferir. Tudo sem quebrar os limites de U1.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
