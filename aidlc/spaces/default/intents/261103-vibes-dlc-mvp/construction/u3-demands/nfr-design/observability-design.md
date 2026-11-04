# Design de observabilidade: u3-demands

Base: `nfr-requirements/observability-requirements.md` de U3.

- **NFR13.1:** usa o `logger` de U1. Falhas de leitura registram o caminho e o motivo, uma vez por motivo enquanto ele não mudar. Descrições, notas, texto de decisões e comandos não entram nos logs.
- Sem métricas nem painéis. A prova publica os tempos de abertura do Início e de Decisões.
