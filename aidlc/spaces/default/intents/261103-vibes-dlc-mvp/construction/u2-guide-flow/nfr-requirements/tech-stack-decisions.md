# Decisões de tecnologia: u2-guide-flow

A stack é a de U1, sem dependência nova.

| Necessidade | Escolha | Motivo |
|---|---|---|
| Rodar o comando de perguntas | `execFile` do Node.js, com `cmd.exe /d /s /c aidlc.cmd`, argumentos validados e limite de tempo | No Windows, o `aidlc` é um `.cmd`: `execFile('aidlc')` termina com `ENOENT`, e `execFile('aidlc.cmd')` com `EINVAL`, porque o Node recusa `.cmd` sem shell. Por isso o `cmd.exe` é chamado de forma explícita, e só passam argumentos que seguem o padrão seguro de NFR5.2 |
| Hash de artefato | `node:crypto`, com SHA-256 | Já vem com o Node.js |
| Mostrar artefato | Texto comum em um elemento `pre` | Nenhum HTML é interpretado |
| Ler o `audit/` | Leitura direta dos arquivos, sem o comando `audit history` | Evita um processo a cada mudança e mantém a tolerância a entradas ruins |

**Ordem de busca:** `VIBES_AIDLC`, se definida, e depois `aidlc.cmd` no `PATH` herdado. Sem encontrar, a contagem é `unavailable`, com um aviso no console, e o guia usa a instrução genérica. A forma exata da chamada, que funciona com espaços e acentos no caminho, está em `nfr-design/security-design.md`. Isso vale só para este comando de leitura. O terminal continua só no Git Bash.

## Alternativas rejeitadas

- **Mostrar artefatos em Markdown formatado:** exigiria uma biblioteca e um sanitizador, e o requisito é mostrar como texto.
- **`aidlc engine audit history` no lugar de ler os arquivos:** um processo a cada mudança, e o formato de saída também é externo ao produto.
