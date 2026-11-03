# Mapa de histórias por Unidade: MVP do Vibes DLC

Base: `unit-of-work.md` e `inception/user-stories/stories.md`.

| Story | Unit ID | Directory |
|---|---|---|
| US1.1 | U1; U5 | u1-walking-skeleton; u5-install |
| US1.2 | U5 | u5-install |
| US1.3 | U1 | u1-walking-skeleton |
| US2.1 | U3 | u3-demands |
| US2.2 | U3 | u3-demands |
| US2.3 | U3 | u3-demands |
| US3.1 | U1 | u1-walking-skeleton |
| US3.2 | U1 | u1-walking-skeleton |
| US3.3 | U1 | u1-walking-skeleton |
| US3.4 | U1 | u1-walking-skeleton |
| US3.5 | U2 | u2-guide-flow |
| US3.6 | U2 | u2-guide-flow |
| US3.7 | U4 | u4-customization |
| US4.1 | U2 | u2-guide-flow |
| US4.2 | U2 | u2-guide-flow |
| US4.3 | U2 | u2-guide-flow |
| US5.1 | U2 | u2-guide-flow |
| US5.2 | U2 | u2-guide-flow |
| US6.1 | U3 | u3-demands |
| US6.2 | U3 | u3-demands |
| US6.3 | U3 | u3-demands |
| US7.1 | U4 | u4-customization |
| US7.2 | U4 | u4-customization |

## Histórias em mais de uma Unidade

- **US1.1:** U1 entrega a base com o painel rodando neste repositório, inclusive a versão do Node.js e a primeira execução sem `.vibes/`. U5 entrega a instalação em subpasta, a preservação dos arquivos existentes e o `README`.

## Ordem dentro de cada Unidade

- **U1:** US3.1, US1.3, US3.2, US3.3, US3.4 e a parte de US1.1.
- **U2:** US3.5, US4.1, US4.2, US4.3, US5.2, US5.1 e US3.6.
- **U3:** US6.1, US2.1, US2.3, US2.2, US6.2 e US6.3.
- **U4:** US7.1, US7.2 e US3.7.
- **U5:** a parte de US1.1 e US1.2.

## Conferência

- As 23 histórias de `stories.md` têm uma Unidade.
- As cinco Unidades têm histórias.
- A meta de cobertura, NFR11, vale para todas as Unidades e é conferida em Build and Test.
