# Instruções de teste: u5-install

## Preparação

O runner Vitest e `vitest.config.ts` já existem. Os testes novos desta Unidade ficam sob `tests/u5/`; o script `scripts/proof-u5.ts` executa a prova da instalação em um repositório temporário, com Git Bash real no Windows. A prova precisa de rede só durante o `npm install` do repositório de teste; depois disso a rede é cortada. Não substituir o pseudo-terminal nem a versão do Node.js por simulação na prova.

## Execução desta Unidade

```bash
npx vitest run tests/u5
npx tsx scripts/proof-u5.ts
```

Os comandos são independentes. O primeiro funciona antes do primeiro teste novo. A prova requer Node.js 22.13 ou superior e Git Bash, e falha, sem ser ignorada, se o `node-pty` não instalar.

## Cobertura esperada

Estratégia Standard: 5 a 8 testes por componente alterado ou novo (configuração, início, terminal, `runtime`, leitor, Personalizar sem raiz, rotas e interface), com testes de integração nas fronteiras de disco, rota e terminal. Cada módulo cobre o caminho feliz e dois casos de erro ou de borda. O mínimo de 80% de linhas vale para o projeto inteiro; Build and Test o confere com a suíte completa, por `npm run test:coverage`. O teste filtrado desta Unidade não julga o mínimo global.

## Isolamento

Usar pastas temporárias por teste, com espaços e acentos no nome, e banco temporário ou `:memory:`. Falhas de disco e de montagem são injetadas por substituição de módulo, só nos testes de unidade. A concorrência de `refreshRuntime()` usa promessas controladas pelo teste, sem temporizadores reais. Na prova, usar `node-pty` e Git Bash reais, e comparar os hashes de todo arquivo do repositório de teste fora da subpasta e de `.vibes/`. A prova não altera o registro real do AI-DLC deste repositório.
