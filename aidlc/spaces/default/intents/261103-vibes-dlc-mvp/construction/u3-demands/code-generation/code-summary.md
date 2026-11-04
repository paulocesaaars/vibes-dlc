# Resumo do código: u3-demands

## Arquivos criados e alterados

- Banco: `migrations/0003_u3.sql`, `src/db/artifact-note-repo.ts` e `src/db/sent-command-repo.ts`.
- Leitura e regras: `src/aidlc/demand-browser.ts`, `src/aidlc/reader.ts`, `src/triage/suggest-level.ts`.
- Rotas: listagem, nova demanda, ativação, comandos, notas, Unidades e decisões em `src/app/api/demands/`; validação compartilhada com `src/app/api/commands/route.ts`.
- Interface: `src/web/components/demand-hub.tsx`, `guide-app.tsx`, cliente, serviço, esquemas e envio de comandos.
- Testes: `tests/u3/`, ajustes de regressão em `tests/u1/` e prova `scripts/proof-u3.ts`. Configuração ajustada em `eslint.config.mjs` e `package.json`.
- A lista exata de fontes está em `source-manifest.json`.

## Decisões de implementação

A leitura das demandas usa os arquivos do AI-DLC e só mantém cache da demanda aberta. O observador usa uma assinatura leve para preservar o tempo de eco do terminal. O painel apresenta comandos para confirmação antes do envio e trata demandas não ativas em modo de consulta. Notas são persistidas no banco local sem editar artefatos versionados.

## Verificação

`npm run verify` passou: lint, tipos, 576 testes e cobertura de linhas de 95,16%, acima da meta de 80%. `npm run build` passou. As provas reais passaram: U1 29/29, U2 56/56 (eco p95 84,8 ms, meta 150 ms) e U3 17/17 no navegador com Git Bash. `npm audit --audit-level=high` saiu com código 0; há 16 achados moderados em dependências transitivas.

## Testes não executados e desvios

Nenhum teste planejado foi deixado sem execução. A prova U3 exigiu esperar a liberação de arquivos no Windows antes da limpeza da cópia de teste. O observador de demandas foi simplificado após uma medição de eco acima da meta; a nova medição passou. As expectativas de testes U1 foram atualizadas para o novo Início.

Após a revisão, o Início passou a mostrar de quem é a vez; as leituras de Unidades e Decisões passaram a confinar o caminho real; e o modo Outra CLI passou a apresentar comandos apenas como referência, com recusa de envio também nas rotas. Até a preferência de CLI da U4, `VIBES_CLI_KIND=other` seleciona esse modo, com `claude_code` como padrão.
