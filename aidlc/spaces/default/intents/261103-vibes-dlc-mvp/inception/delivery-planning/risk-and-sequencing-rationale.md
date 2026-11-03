# Riscos e motivo da sequência: MVP do Vibes DLC

Um Bolt é uma passada de construção sobre uma parte do trabalho, que termina em algo que funciona. Um walking skeleton é a versão mínima que funciona de ponta a ponta, construída primeiro para provar que as partes se conectam.

Base: `inception/units-generation/unit-of-work-dependency.md`, `inception/contract-design/contract-summary.md`, `inception/requirements-analysis/requirements.md` e `delivery-planning-questions.md`.

## Método

Risco primeiro, com o walking skeleton na frente (Q6 da definição de escopo, `team-practices.md`). Não usamos um modelo formal de pontuação como o WSJF, que ordena por valor e urgência sobre tamanho, porque as cinco Unidades têm dependência simples e a decisão coube em poucos critérios.

## Sequência

| Ordem | Unidade | Motivo |
|---|---|---|
| 1 | U1 | Todas dependem dela, e concentra os riscos técnicos do `TDD.md` |
| 2 | U2 | Valida o maior risco do produto: conduzir uma etapa só pelos arquivos do AI-DLC. Permite testar com uma pessoa nova |
| 3 | U3 | Completa o fluxo real de CP1, com a criação de demandas |
| 4 | U5 | Exigida por CP3, e fica depois que há produto útil para instalar |
| 5 | U4 | Should Have, sem exigência dos critérios de pronto. É o primeiro candidato a corte, com decisão de quem desenvolve |

A sequência respeita o grafo: U2 a U5 dependem só de U1, sem desvio da ordem topológica.

**Pontos aceitos como risco:** cada um é resolvido no design funcional da Unidade afetada, antes do código dela, conforme a lista em `bolt-plan.md`. Isso evita parar a construção para reescrever documentos, e mantém a resolução perto de quem a usa.

**Teste com uma pessoa nova logo depois de U2:** os textos do guia são o que esse teste avalia, e corrigi-los antes de U3, U4 e U5 custa menos.

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| `node-pty` não instala ou não funciona com Git Bash | Média | Crítico | Validar primeiro em U1. Alternativa do `TDD.md`: `child_process`, com perda de recursos |
| `node:sqlite` experimental ou instável | Média | Médio | Validar em U1. Alternativa: `better-sqlite3` |
| Latência do SSE acima de 150 ms | Baixa | Médio | Medir em U1. A troca fica isolada em `Terminal` |
| Sinais do AI-DLC incompletos, como `[R]` | Média | Alto | Comportamento de reserva, com confirmação em U2 |
| Formato do AI-DLC muda entre versões | Média | Alto | Só o módulo `aidlc` conhece o formato, com testes sobre exemplos reais |
| Lacunas aceitas nos contratos geram retrabalho | Alta | Médio | Resolver no design de cada Unidade, conforme `bolt-plan.md` |
| U1 grande atrasa as demais | Média | Alto | Manter o foco nos quatro itens da fatia e adiar o resto para U2 |
| Pessoa nova não conclui a etapa | Média | Alto | Testar depois de U2, com tempo para corrigir textos e fluxo |
| Cobertura de 80% difícil no código de terminal | Média | Baixo | Testar pelo caminho real, medindo no projeto todo |
| Ordem real diferente desta por causa do grafo | Média | Baixo | Avisar quando ocorrer. A troca é um ajuste no grafo |

## Assumptions & Open Questions

- [assumption] As probabilidades e impactos são estimativas desta etapa, sem medição.
- [open] Nenhuma.
