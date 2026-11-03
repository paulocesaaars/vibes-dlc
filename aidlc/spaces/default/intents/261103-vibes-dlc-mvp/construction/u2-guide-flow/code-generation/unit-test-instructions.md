# Instruções de teste: u2-guide-flow

## Ferramentas

As de U1: Vitest, para unidade e integração, e Playwright, com o canal `msedge`, sem baixar navegadores.

## Como rodar os testes desta Unidade

```bash
npx vitest run tests/u2
```

A prova desta Unidade:

```bash
npx tsx scripts/proof-u2.ts
```

## Volume

Estratégia Standard: de 5 a 8 testes por componente alterado (`core`, `aidlc`, `db`, `guide`, rotas e interface). Cada módulo cobre o caminho feliz e pelo menos dois casos de erro ou de borda.

## Cobertura esperada

O mínimo é de 80% de cobertura de linhas no projeto todo, em `vitest.config.ts`. Build and Test confere esse mínimo na suíte completa, com `npm run check`, em um comando próprio. O comando acima, sem `--coverage`, não julga esse mínimo.

## Simulação

- `core` é função pura e não precisa de simulação.
- `db` usa um arquivo SQLite real em uma pasta temporária, partindo de um banco de U1.
- `aidlc` usa cópias reais de `aidlc-state.md` e `audit/` em `tests/fixtures/`, mais casos com entrada cortada e malformada.
- O comando de perguntas tem um substituto nos testes de falha e demora, e também um teste que roda o `aidlc` real no Windows, inclusive de uma pasta com espaço e acento. Se o `aidlc` não estiver instalado, esse teste é pulado com uma mensagem clara, e isso entra em `code-summary.md`.
- As rotas chamam os handlers diretamente, como em U1.

## Dados de teste

Cada teste cria a própria pasta temporária. Nenhum teste escreve no registro real deste intent nem em `.vibes/` deste repositório. As cópias em `tests/fixtures/` não contêm segredos nem dados pessoais.

## Testes obrigatórios por risco

Rejeição de `Origin` e `Host` de fora nas rotas novas, nenhum envio sem confirmação em Retomar, nenhuma chamada de rede do produto e leitura do AI-DLC com exemplos reais de `aidlc-state.md` e `audit/`.
