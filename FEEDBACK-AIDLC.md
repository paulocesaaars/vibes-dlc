# Feedback do AI-DLC para o Vibes DLC

O que aprendemos ao construir o Vibes DLC com o próprio AI-DLC. A regra de uso está no
`CLAUDE.md`. O resultado alimenta o `PRD.md`, o `TDD.md` e o protótipo.

## Perguntas em aberto

O guia precisa saber, sem interpretar o terminal, em que momento a etapa está. Estado:
**hipótese** (só leitura de código), **confirmado** ou **derrubado** (execução real).

| Sinal que o guia precisa | Pista até agora | Estado | Evidência |
|---|---|---|---|
| A IA fez uma pergunta e espera resposta | Evento `QUESTION_ANSWERED` indica a resposta, mas ainda não achei o que marca a pergunta pendente. Há arquivos `*-questions` nas etapas | Hipótese | |
| A etapa está pronta e o gate espera aprovação | `aidlc-lib.ts` define a marca `[?]` (`awaiting-approval`) no `aidlc-state.md` | Hipótese | |
| A etapa está em andamento | Marca `in-progress` no `aidlc-state.md` | Hipótese | |
| O usuário pediu alterações | Marca `revising` e evento `GATE_REJECTED` | Hipótese | |
| A etapa foi aprovada | Evento `GATE_APPROVED` em `<record>/audit/<host>-<clone>.md` | Hipótese | |
| O comando colado foi executado (Enter) | Nenhuma ainda | Hipótese | |
| A etapa foi aprovada com o painel fechado | Mesmos arquivos da aprovação | Hipótese | |

## Outros pontos a verificar

- [ ] Os comandos reais: `/aidlc --scope <nível> "<descrição>"`, `/aidlc --stage <etapa>` e
      `/aidlc compose "<descrição>"`.
- [ ] Em que caminho os artefatos são gravados, e se os nomes batem com o `stage-graph.json`.
- [ ] Quais etapas condicionais são puladas, e como o estado registra isso.
- [ ] Os textos e o idioma das opções nos gates, como `Approve`.
- [ ] Como o `aidlc-state.md` e o `audit/` se comportam ao retomar uma sessão.
- [ ] O que o AI-DLC faz nas etapas de implantação, que ficam para a v2 do guia.

## Registro

Entradas mais recentes primeiro, neste formato:

```markdown
### AAAA-MM-DD · <etapa> · <tipo: sinal | divergência | confusão | ideia>
- **Observado:** o que aconteceu.
- **Evidência:** arquivo, campo e trecho.
- **Efeito no produto:** o que muda no guia, no PRD, no TDD ou no protótipo.
- **Situação:** pendente | aplicado em <arquivo> | aguardando decisão
```

### 2026-11-03 · antes da primeira execução · divergência
- **Observado:** o `aidlc engine orchestrate help` conta 30 etapas no total e 20 no `mvp`.
  O PRD conta 33 e 23, porque inclui as 3 etapas de preparação.
- **Evidência:** saída do `help` e `.claude/tools/data/stage-graph.json`.
- **Efeito no produto:** definir qual contagem o guia mostra ao escolher o nível.
- **Situação:** pendente

### 2026-11-03 · antes da primeira execução · sinal
- **Observado:** a documentação oficial diz que o Codex CLI usa `$aidlc` no lugar de `/aidlc`.
- **Evidência:** `README.md` de `awslabs/aidlc-workflows`.
- **Efeito no produto:** o modelo de comando por CLI do TDD precisa trocar pelo menos esse
  prefixo.
- **Situação:** pendente
