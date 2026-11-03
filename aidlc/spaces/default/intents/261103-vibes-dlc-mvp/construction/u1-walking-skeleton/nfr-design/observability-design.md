# Design de observabilidade: u1-walking-skeleton

Base: `nfr-requirements/observability-requirements.md`.

Um único módulo de registro, `logger`, escreve no console em português, com nível, área e mensagem. Os demais módulos usam só esse módulo.

| Nível | Quando | Exemplo |
|---|---|---|
| `info` | Início, com o endereço de escuta (NFR3.3) | Painel em `http://127.0.0.1:3000` |
| `warn` | `VIBES_HOST` fora de `127.0.0.1`, ou leitura falhando | Painel exposto em outro endereço |
| `error` | Falha ao ler, abrir o shell ou migrar, com o caminho e o motivo (NFR1.3) | Não foi possível abrir o Git Bash em `<caminho>` |

- **NFR13.3:** o `logger` recebe só texto montado pelos módulos, sem parâmetro para a saída do terminal. Nas falhas de envio, registra o `commandId`, sem o texto do comando.
- Sem métricas, alertas nem painéis. As medidas de eco e atualização ficam na saída do script de prova.
