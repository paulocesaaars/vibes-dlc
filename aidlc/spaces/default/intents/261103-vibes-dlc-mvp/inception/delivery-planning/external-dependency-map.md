# Dependências externas: MVP do Vibes DLC

Um Bolt é uma passada de construção sobre uma parte do trabalho, que termina em algo que funciona. O produto não usa serviços externos em execução (`TDD.md`). Estas são as dependências de fora da construção, com base em `bolt-plan.md` e `inception/contract-design/contract-summary.md`.

| Dependência | Dono | Bolt | Prazo | Se atrasar |
|---|---|---|---|---|
| Uma pessoa que nunca usou o AI-DLC, para o teste | Quem desenvolve | Depois de B2 | A combinar | O teste passa para depois de B3, e os textos ficam sem validação por mais tempo |
| Framework AI-DLC instalado neste repositório | awslabs/aidlc-workflows | Todos | Já disponível | Fixar a versão atual, porque o leitor depende do formato dela |
| Comando `aidlc` acessível ao servidor do painel | Ambiente de quem usa | B1, B2 | Validado em B1 | O guia usa a instrução genérica para perguntas |
| Git Bash no Windows | Ambiente de quem usa | B1 | Já disponível aqui | A tela de falha orienta a instalar |
| Pacotes npm: `next`, `node-pty`, `@xterm/xterm`, Zod, Vitest e Playwright | Registro npm | B1 | Na instalação | Sem rede, o `npm install` não roda. O produto em si não precisa de rede |
| CLI de IA instalada e autenticada | Pessoa que usa | B2 em diante | Já disponível aqui | Sem ela, o teste não acontece. Créditos esgotados interrompem o trabalho, como já ocorreu nesta execução |
| Segundo repositório AI-DLC para testar a instalação | Quem desenvolve | B4 | Criado em B4 | Sem bloqueio: basta um repositório novo |

## Assumptions & Open Questions

- [assumption] Nenhuma aprovação de terceiros é necessária, porque uma pessoa desenvolve e o `PRD.md` registra a autorização de uso das artes.
- [open] Quem será a pessoa nova no AI-DLC e quando ela está disponível.
