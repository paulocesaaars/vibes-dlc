# Instruções de teste: u4-customization

## Preparação

O runner Vitest e `vitest.config.ts` já existem. Os testes novos desta Unidade ficam sob `tests/u4/`; o script `scripts/proof-u4.ts` executa a prova no navegador com Git Bash real no Windows e uma cópia isolada do projeto. Não substituir o pseudo-terminal por simulação na prova.

## Execução desta Unidade

```powershell
npx vitest run tests/u4
tsx scripts/proof-u4.ts
```

Os comandos são independentes. O primeiro deve funcionar antes do primeiro teste novo. A prova requer navegador disponível e Git Bash, conforme as provas U1 a U3.

## Cobertura esperada

Estratégia Standard: 5 a 8 testes por componente novo, testes de integração nas fronteiras de banco, disco e rota. Cada módulo cobre o caminho feliz e dois casos de erro ou borda. O mínimo de 80% de linhas vale para o projeto inteiro; Build and Test o confere com a suíte completa, por `npm run test:coverage`. O teste filtrado desta Unidade não julga o mínimo global.

## Isolamento

Usar diretórios e banco temporários por teste, inclusive para `.vibes/media/`. Mídias de teste são geradas em memória (bytes de assinatura com preenchimento), sem arquivos versionados grandes; o envio de 25 MiB é gerado no teste. Falhas de disco e de transação são injetadas por substituição do módulo `fs` e do repositório, apenas nos testes de unidade. Na prova, usar `node-pty` e Git Bash reais. A medição de memória amostra `process.memoryUsage().rss` durante um envio de 25 MiB. Restaurar estado somente na cópia de teste, sem alterar registros da pessoa. Conferir que nada muda fora de `.vibes/`.
