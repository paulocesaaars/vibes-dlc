# Design funcional de U3: confirmação

Os requisitos, o protótipo e o framework instalado já respondem a esta Unidade, então não há pergunta aberta. O resumo abaixo reúne o que vou assumir.

## Consolidated Summary Confirmation

- **Sugestão de nível:** usa a tabela de regras de `design/prototipo/Main.dc.html` (`RULES` e `triage`), sem modelo de IA, com o motivo visível. Sem regra aplicável, sugere `feature`. A tabela de descrições com o nível esperado vira teste.
- **Nova demanda:** três passos, com Cancelar em qualquer um. O comando é `/aidlc --new-intent --scope <nível> "<descrição>"` com outra demanda em andamento, e `/aidlc --scope <nível> "<descrição>"` sem nenhuma. A descrição fica em uma linha, e aspas duplas viram simples no comando, visível antes de confirmar.
- **Pedir análise à sua IA:** envia um pedido com `/aidlc compose "<descrição>"`, com confirmação. Com outra CLI, vira referência, sem botão.
- **Depois de confirmar:** o guia diz que está esperando a IA criar a demanda, e ela surge no Início quando o registro aparecer.
- **Início:** cada demanda mostra nível, etapa atual, progresso e de quem é a vez, com o aviso na própria linha se o registro estiver ilegível. Sem demandas, mostra a instrução e Nova demanda.
- **Demanda não ativa:** dá para consultar sem mudar `active-intent`, e o envio fica desativado, com o motivo. Tornar ativa oferece `/aidlc intent switch <nome>`, com confirmação. As perguntas abertas não são lidas nessa demanda, porque o comando age sobre a ativa.
- **Ativa mudou com o painel aberto:** o observador percebe, o guia relê e mostra a faixa. A rota de envio confere de novo, então nada vai para a demanda errada.
- **Abas:** Artefatos, com notas em `.vibes/`, na migração `0003_u3.sql`, sem mudar o arquivo. Unidades e ciclos, a partir de `unit-of-work.md` e dos eventos do `audit/`. Decisões, a partir dos eventos do `audit/`, com tipo, etapa, data e texto, sempre como texto. Histórico, só com os comandos enviados pelo painel. Aba vazia diz o que vai aparecer e em que etapa.
- **Aparência:** tudo segue `design/prototipo/Main.dc.html`.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
