# Design de observabilidade: u2-guide-flow

Base: `nfr-requirements/observability-requirements.md` de U2.

- **NFR13.1:** usa o `logger` de U1. Registra `warn` quando o comando de perguntas falha ou não é encontrado, uma vez por motivo enquanto ele não mudar, para não encher o console. Registra o motivo e o nome da etapa validado, sem a saída do comando, o texto de artefatos nem o de comandos.
- Sem métricas nem painéis. A prova publica as medidas de tempo do comando e da atualização.
