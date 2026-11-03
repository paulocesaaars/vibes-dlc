# Avaliação de viabilidade: MVP do Vibes DLC

Base: a declaração de intenção (`ideation/intent-capture/intent-statement.md`), as respostas de `feasibility-questions.md` e o que foi observado nesta execução do AI-DLC. Ainda não há código: o que não foi executado está marcado como hipótese.

## Conclusão

O MVP é viável, com duas condições: provar o terminal real no Windows com Git Bash logo na primeira fatia, e aceitar que o guia só sabe das perguntas que o AI-DLC registra.

## Viabilidade por área

| Área | Avaliação | Base |
|---|---|---|
| Saber em que momento a etapa está, sem interpretar o terminal | Viável para etapa em andamento, pergunta registrada, aprovação pendente e aprovação concluída | Confirmado nesta execução: ver `FEEDBACK-AIDLC.md` |
| Saber que um comando colado foi executado | Sem sinal direto; só se percebe pelos arquivos depois | Hipótese |
| Terminal real no navegador, no Windows com Git Bash | Provável, mas ainda não testado | Hipótese; é o primeiro risco a provar |
| Instalação com `npm install` e um comando | Provável nas máquinas previstas, onde Node.js, npm e ferramentas de compilação são permitidos | Resposta Q1 |
| Funcionar com outras CLIs de IA | Parcial: o terminal independe da CLI, mas os comandos do AI-DLC mudam por ferramenta | Documentação oficial: o Codex usa `$aidlc` |
| Capacidade para construir | Viável sem prazo fixo, com uma pessoa e a ajuda da IA; o tempo total não foi estimado | Respostas Q3 e Q4 |

## Principais riscos

Os detalhes e os responsáveis estão em `raid-log.md`.

- O terminal real pode se comportar diferente do esperado no Git Bash, o que atingiria o centro do produto.
- O formato do registro do AI-DLC pode mudar entre versões do framework.
- Com uma só pessoa construindo, a meta de um iniciante concluir uma etapa depende de convidar alguém de fora.

## O que isso muda no plano

- A primeira fatia deve provar o terminal real no Windows antes de qualquer outra tela.
- macOS e Linux ficam fora da verificação do MVP (resposta Q2).
- O guia precisa de uma instrução genérica para os casos sem sinal, como uma pergunta que a IA faça sem registrar.

## Assumptions & Open Questions

- [assumption] Os sinais confirmados em Captura da Intenção continuam valendo nas demais etapas; a Construção ainda não foi observada.
- [assumption] Máquinas de outras pessoas do time e da empresa têm as mesmas permissões das máquinas previstas.
