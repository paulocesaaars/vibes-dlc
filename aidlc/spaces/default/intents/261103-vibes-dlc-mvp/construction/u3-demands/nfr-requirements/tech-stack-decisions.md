# Decisões de tecnologia: u3-demands

Base: `functional-design/functional-spec.md`. A stack é a de U1, sem dependência nova.

| Necessidade | Escolha | Motivo |
|---|---|---|
| Sugestão de nível | Função pura em `src/triage`, com as regras de `functional-design/rules.md` | Sem rede nem modelo de IA |
| Lista de demandas | Leitura direta das pastas e de `intents.json`, sem o comando `aidlc intent list` | Evita um processo por abertura, e a leitura tolerante já existe |
| Decisões e Unidades | Reaproveita a leitura de `audit/` de U2 | Mesma tolerância a entradas ruins |
| Rascunho da nova demanda | Estado da tela | Nada é gravado antes da confirmação |

## Alternativas rejeitadas

- **`aidlc intent list --json`:** é um processo externo por abertura e não traz nível, progresso nem vez.
- **Modelo de IA para sugerir o nível:** proibido pelas regras do projeto. A análise pela IA é um comando opcional, confirmado pela pessoa.
