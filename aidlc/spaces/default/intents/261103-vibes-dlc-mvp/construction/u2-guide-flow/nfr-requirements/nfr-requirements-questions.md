# Requisitos não funcionais de U2: confirmação

Os requisitos e o design de U2 já definem as metas, e a stack é a de U1, então não há pergunta aberta. O resumo abaixo reúne o que vou assumir.

## Consolidated Summary Confirmation

- **Desempenho:** artefatos e perguntas aparecem em até 3 segundos. O comando de perguntas tem limite de 2 segundos e não trava o painel. O `audit/` é lido só depois de uma mudança, sem atrasar o eco do terminal.
- **Segurança:** o comando de perguntas roda sem shell, com o nome da etapa validado. O texto das perguntas não é mostrado. A leitura de artefatos só aceita caminhos do registro, até 2 MB, e mostra o conteúdo como texto.
- **Escala:** um registro do tamanho deste intent, com mais de 10 mil linhas em `audit/`, sem perda perceptível.
- **Confiabilidade:** uma entrada malformada é ignorada, e um comando que falha vira a instrução genérica. A migração `0002_u2.sql` só avança, com cópia prévia do banco.
- **Observabilidade:** falhas de leitura e do comando de perguntas vão ao console, sem texto de perguntas, artefatos ou comandos.
- **Tecnologia:** a stack de U1, sem dependência nova.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
