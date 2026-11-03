# Registro de riscos, premissas, problemas e dependências: MVP do Vibes DLC

Referência: `ideation/intent-capture/intent-statement.md`. Responsável por todos os itens: o autor (resposta Q3). Impacto e probabilidade são estimativas qualitativas.

## Riscos

| ID | Risco | Impacto | Probabilidade | Resposta |
|---|---|---|---|---|
| R1 | O terminal real falhar ou se comportar mal com o Git Bash no Windows | Alto | Média | Provar na primeira fatia, antes das demais telas |
| R2 | O formato do registro do AI-DLC mudar entre versões | Alto | Média | Concentrar a leitura em um só módulo e preferir os comandos de leitura do AI-DLC |
| R3 | A IA fazer uma pergunta sem registrá-la, e o guia não perceber | Médio | Média | Instrução genérica para olhar o terminal quando não houver sinal |
| R4 | Os comandos do AI-DLC mudarem por CLI de IA, e o guia só funcionar bem com uma | Médio | Alta | Definir o modelo de comando por CLI antes da construção |
| R5 | Aprovações sem revisão real | Médio | Média | Passo Revisar, com aviso quando faltar revisar algo |
| R6 | Artes com imagens da família publicadas em repositório público | Médio | Alta | Decisão do autor, que autorizou o uso; o repositório ainda não recebeu o envio |
| R7 | Contraste do botão principal abaixo do recomendado | Baixo | Alta | Risco aceito no PRD |

## Premissas

| ID | Premissa | Como confirmar |
|---|---|---|
| A1 | Os sinais observados em Captura da Intenção valem nas demais etapas | Registrar em `FEEDBACK-AIDLC.md` a cada etapa |
| A2 | Outras máquinas do time e da empresa têm as permissões das máquinas previstas | Testar a instalação na máquina de quem for testar o guia |
| A3 | A pessoa já tem a CLI de IA instalada e autenticada | Tratar a falta dela como um momento do guia |

## Problemas

| ID | Problema | Situação |
|---|---|---|
| I1 | O AI-DLC guardou só a primeira linha do pedido inicial | Fontes e primeira fatia precisam entrar nos artefatos das próximas etapas |
| I2 | A contagem de etapas difere entre o plano, o estado, o `help` e o PRD | Registrado em `FEEDBACK-AIDLC.md` |

## Dependências

| ID | Dependência | Observação |
|---|---|---|
| D1 | AI-DLC instalado no repositório | O guia depende dos arquivos e comandos dele |
| D2 | Git Bash no Windows | Exigido para o terminal |
| D3 | Node.js e pacotes npm, incluindo um com parte nativa | Permitidos nas máquinas previstas (resposta Q1) |
| D4 | Uma pessoa disposta a testar o guia sem conhecer o AI-DLC | A convidar antes de concluir o MVP (resposta Q7) |

## Assumptions & Open Questions

- [assumption] A probabilidade e o impacto acima são estimativas sem dados de medição.
