# Instruções de teste: u3-demands

## Preparação

O runner Vitest e `vitest.config.ts` já existem. Os testes novos desta Unidade ficam sob `tests/u3/`; o script `scripts/proof-u3.ts` executa a prova no navegador com Git Bash real no Windows e uma cópia isolada do registro. Não substituir o pseudo-terminal por simulação na prova.

## Execução desta Unidade

```powershell
npx vitest run tests/u3
tsx scripts/proof-u3.ts
```

Os comandos são independentes. O primeiro deve funcionar antes do primeiro teste novo. A prova requer navegador disponível e Git Bash, conforme as provas U1 e U2.

## Cobertura esperada

Estratégia Standard: 5 a 8 testes por componente novo, testes de integração nas fronteiras de arquivo, banco, rota e terminal. Cada módulo cobre o caminho feliz e dois casos de erro ou borda. O mínimo de 80% de linhas vale para o projeto inteiro; Build and Test o confere com a suíte completa, por `npm run test:coverage`. O teste filtrado desta Unidade não julga o mínimo global.

## Isolamento

Usar diretórios e banco temporários por teste. Simular apenas dados e fronteiras nos testes de unidade; na prova, usar `node-pty` e Git Bash reais. Restaurar estado somente na cópia de teste, sem alterar registros da pessoa. Cobrir exemplos reais de `aidlc-state.md` e `audit/`, incluindo `Gate Scope: unit-end` e rejeição posterior. Verificar que artefatos não são editados ao salvar notas.
