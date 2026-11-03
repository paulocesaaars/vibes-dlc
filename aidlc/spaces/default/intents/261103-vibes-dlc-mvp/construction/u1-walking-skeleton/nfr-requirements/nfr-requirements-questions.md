# Requisitos não funcionais de U1: confirmação

Os requisitos, o `TDD.md` e as práticas da equipe já definem as metas desta Unidade, então não há pergunta aberta. O resumo abaixo reúne o que vou assumir.

## Consolidated Summary Confirmation

- **Desempenho:** eco de tecla em até 150 ms em 95% das teclas e atualização do painel em até 3 segundos, medidos no script de prova. O terminal guarda até 5 MB de saída em memória.
- **Segurança:** escuta em `127.0.0.1`, sem login. As rotas do terminal e de envio rejeitam `Origin` e `Host` de fora, e a saída do terminal nunca vira HTML. Nada de chaves de IA nem de saída completa do terminal no banco.
- **Escala:** uma pessoa, uma sessão de terminal e poucas abas na mesma máquina, sem meta de carga.
- **Confiabilidade:** sem meta de disponibilidade, por ser um app local. A sessão continua ao recarregar, e o banco é copiado antes de migrar.
- **Observabilidade:** logs em português só no console do processo, sem saída do terminal nem texto dos comandos. Sem métricas nem painel de monitoramento.
- **Tecnologia:** a stack do `TDD.md`, com TypeScript, Next.js 16, `node:sqlite`, `@xterm/xterm`, `node-pty`, SSE e Zod. O início de U1 confere no Windows o `node-pty` com Git Bash e o `node:sqlite`. Se o `node:sqlite` falhar, usamos `better-sqlite3`. Se o `node-pty` falhar, paro e trago a decisão, porque a alternativa perde recursos das CLIs interativas.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
