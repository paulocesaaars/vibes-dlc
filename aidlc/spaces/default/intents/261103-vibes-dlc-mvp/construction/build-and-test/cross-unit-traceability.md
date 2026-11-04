# Rastreabilidade entre Unidades: Vibes DLC

Gerado por `aidlc engine sensor-traceability --stage build-and-test`, lido em 2026-11-04 depois de U1 a U5.

**Veredito: FALHA em 1 item, `NFR9`.** Todos os outros itens que o sensor lista estão cobertos: os requisitos funcionais `FR1.1` a `FR13.6`, os requisitos não funcionais `NFR1` a `NFR13` (exceto `NFR9`) e os critérios de aceitação `AC1.1.1` a `AC7.2.4`.

Cada `FRn.m` é rastreado pelos critérios de aceitação das histórias que o cumprem, e cada `NFRn` pelos `NFRn.m` detalhados nas Unidades.

## Critérios de aceitação por Unidade

| Unidade | Critérios | Alvo principal |
|---|---|---|
| U1 `u1-walking-skeleton` | AC1.3.1 a AC1.3.5, AC3.1.1 a AC3.4.5 (terminal, envio, guia da etapa) | `src/terminal/terminal-manager.ts`, `src/aidlc/reader.ts`, `src/app/api/commands/route.ts`, `scripts/proof-u1.ts` |
| U2 `u2-guide-flow` | AC3.5.1 a AC3.6.5, AC4.1.1 a AC4.3.4, AC5.1.1 a AC5.2.3 (condução, revisão, conclusão, trilha) | `src/core/decide-moment.ts`, `src/aidlc/work-signals.ts`, `src/web/components/trail.tsx`, `scripts/proof-u2.ts` |
| U3 `u3-demands` | AC2.1.1 a AC2.3.3, AC6.1.1 a AC6.3.5 (Início, ativação, notas, abas) | `src/aidlc/demand-browser.ts`, `src/web/components/demand-hub.tsx`, `src/db/artifact-note-repo.ts` |
| U4 `u4-customization` | AC3.7.1 a AC3.7.4, AC7.1.1 a AC7.2.4 (Personalizar) | `src/customization/customization-service.ts`, `src/web/components/customize.tsx`, `scripts/proof-u4.ts` |
| U5 `u5-install` | AC1.1.1 a AC1.1.5, AC1.2.1 a AC1.2.4 (instalação, telas de falha) | `scripts/proof-u5.ts`, `src/app/api/repo/recheck/route.ts`, `tests/u5/web-ui.test.tsx` |

## Itens não cobertos

| Item | Motivo | Dono | O que falta |
|---|---|---|---|
| `NFR9` (plataforma: Windows, Git Bash, Node.js 22.13+, Chrome e Edge) | `u2-guide-flow: NFR9.1` está como `Deferred` em `construction/u2-guide-flow/code-generation/traceability.json`: "Conferência manual no Chrome, decidida para a conferência final do MVP, junto com o teste com uma pessoa nova". O sensor lê esse `Deferred` como "não construído" | Conferência final do MVP, fora deste plano | Conferência manual no Chrome por uma pessoa |

Evidência automática que existe para `NFR9` (ver `test-results.md`, `BT-17`):

- Provas de U1 a U5 com saída 0 no Edge e no Chrome atuais, no Windows com Git Bash.
- Prova de U5 com um Node.js 20.18.0 real, que para com a mensagem de versão.
- `NFR9.1` e `NFR9.2` de U1, `NFR9.1` de U3 e U4, e `NFR9.1`, `NFR9.2` e `NFR9.3` de U5 estão construídos.

O registro de U2 não foi alterado por esta etapa. Este item é um achado de Build and Test e aparece no portão.

## Requisitos não funcionais por Unidade (itens construídos)

| NFR | U1 | U2 | U3 | U4 | U5 |
|---|---|---|---|---|---|
| NFR1 Desempenho | 1.1, 1.2 | 1.1 a 1.6 | 1.1 a 1.6 | 1.1 a 1.5 | n/a |
| NFR2 Terminal | 2.1 a 2.6 | n/a | n/a | n/a | n/a |
| NFR3 Escuta | 3.1, 3.2 | n/a | n/a | n/a | 3.1 |
| NFR4 Origem | 4.1 a 4.7 | 4.1 | 4.1 a 4.4 | 4.1, 4.2 | 4.1 |
| NFR5 Entrada e conteúdo | 5.1 | 5.1 a 5.4 | 5.1 a 5.3 | 5.1 a 5.7 | 5.1 a 5.3 |
| NFR6 Rede | 6.1 | 6.1 | 6.1 | 6.1 | 6.1 |
| NFR7 Escrita | 7.1 | 7.1 | 7.1 | 7.1 | 7.1 a 7.3 |
| NFR8 Idioma | 8.1 | 8.1 | 8.1 | 8.1 | 8.1 |
| NFR9 Plataforma | 9.1, 9.2 | 9.1 (Deferred) | 9.1 | 9.1 | 9.1 a 9.3 |
| NFR10 Acessibilidade | 10.1 | 10.1 | 10.1 | 10.1 | 10.1 |
| NFR11 Qualidade | 11.1 | 11.1 | 11.1 | 11.1 | 11.1 |
| NFR12 Dados locais | 12.1 a 12.3 | 12.1, 12.2 | 12.1, 12.2 | 12.1 a 12.7 | 12.1 |
| NFR13 Logs | 13.1, 13.2 | n/a | n/a | n/a | 13.1 |
