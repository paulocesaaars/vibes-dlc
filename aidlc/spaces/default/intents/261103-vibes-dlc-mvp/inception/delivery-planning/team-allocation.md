# Alocação: MVP do Vibes DLC

Um Bolt é uma passada de construção sobre uma parte do trabalho, que termina em algo que funciona. Um mob é o grupo responsável por essa passada. Neste nível, não há etapa de formação de time, então todos os Bolts são executados pela IA, com o agente `aidlc-developer-agent`, e quem desenvolve aprova cada um.

Base: `inception/units-generation/unit-of-work.md` e `inception/practices-discovery/team-practices.md`.

| Bolt | Unidade | Executa | Aprova |
|---|---|---|---|
| B1 | U1, `u1-walking-skeleton` | `aidlc-developer-agent` | Quem desenvolve |
| B2 | U2, `u2-guide-flow` | `aidlc-developer-agent` | Quem desenvolve |
| B3 | U3, `u3-demands` | `aidlc-developer-agent` | Quem desenvolve |
| B4 | U5, `u5-install` | `aidlc-developer-agent` | Quem desenvolve |
| B5 | U4, `u4-customization` | `aidlc-developer-agent` | Quem desenvolve |

**Papel de quem desenvolve:** aprovar planos e etapas, conferir a demonstração de cada Bolt e organizar o teste com uma pessoa nova no AI-DLC.

**Execução:** em série, um Bolt por vez, sem trabalho em paralelo.

## Assumptions & Open Questions

- [assumption] Uma única pessoa desenvolve, conforme C7 em `constraint-register.md`.
- [open] Quem será a pessoa nova no AI-DLC ainda não foi definido. Veja `external-dependency-map.md`.
