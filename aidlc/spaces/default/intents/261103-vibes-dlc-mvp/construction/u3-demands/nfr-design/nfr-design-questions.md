# Design não funcional de U3: confirmação

Os requisitos de U3 já definem as metas, então não há pergunta aberta. O resumo abaixo reúne como vou atingi-las.

## Consolidated Summary Confirmation

- **Desempenho:** o Início lê os registros de forma assíncrona, com um limite de leituras ao mesmo tempo. Na ativa, usa a contagem guardada, e a tela completa a vez depois. Decisões lê a partir da leitura de `audit/` de U2 e corta em 500 linhas.
- **Segurança:** uma função valida os nomes de pasta. A rota de nova demanda e de análise define `kind` no servidor e valida a forma do texto. A rota de ativação monta o comando e não aceita texto do cliente.
- **Escala:** a lista só é relida quando as datas dos arquivos mudam.
- **Confiabilidade:** falhas ficam na própria linha ou aba, e a migração `0003_u3.sql` segue o executor de U1.
- **Observabilidade:** o `logger` de U1, sem conteúdo escrito pela pessoa.
- **Componentes:** novo módulo `src/triage`, sem dependências. `AidlcReader` ganha a lista, as Unidades e as decisões. `Db` ganha `artifact_note` e `kind`. `Web` ganha as telas. Os limites continuam os de U1.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
