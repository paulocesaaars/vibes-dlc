# Instruções de teste: u1-walking-skeleton

## Ferramentas

- **Vitest**, para unidade e integração, configurado em `vitest.config.ts`.
- **Playwright**, para o caminho completo, com o canal `msedge`, sem baixar navegadores.
- **Windows com Git Bash**, para os testes do terminal, porque o pseudo-terminal não é simulado nos testes de ponta a ponta.

## Como rodar os testes desta Unidade

Os testes de U1 ficam em `tests/u1/`:

```bash
npx vitest run tests/u1
```

A prova da fatia, com o painel, o Edge e o Git Bash reais:

```bash
npx tsx scripts/proof-u1.ts
```

## Volume

Estratégia Standard: de 5 a 8 testes por componente (`config`, `core`, `aidlc`, `terminal`, `guide`, `db`, rotas e interface). Cada módulo cobre o caminho feliz e pelo menos dois casos de erro ou de borda.

## Cobertura esperada

O mínimo é de 80% de cobertura de linhas no projeto todo, configurado em `vitest.config.ts`. Build and Test confere esse mínimo na suíte completa, com `npm run check`, em um comando próprio. O comando acima, sem `--coverage`, não julga esse mínimo.

## Simulação

- `core` é função pura e não precisa de simulação.
- `db` usa um arquivo SQLite real em uma pasta temporária.
- `aidlc` usa cópias reais de `aidlc-state.md` e do grafo em `tests/fixtures/`, mais casos com arquivo incompleto e marca desconhecida.
- `terminal` usa o `node-pty` e o Git Bash reais. O caso sem shell usa um caminho inexistente em `VIBES_SHELL`.
- As rotas chamam os handlers diretamente, com um `TerminalManager` real ou um substituto simples quando o assunto é só a origem ou o formato.

## Dados de teste

Cada teste cria a própria pasta temporária para `.vibes/`, e nada é gravado no repositório. As cópias em `tests/fixtures/` não contêm segredos nem dados pessoais. A prova usa um marcador único em cada execução.

## Testes obrigatórios por risco

Escuta em `127.0.0.1`, rejeição de `Origin` e `Host` de fora, nenhum envio sem confirmação, nenhuma chamada de rede do produto e leitura do AI-DLC com exemplos reais. A recusa de SVG fica para U4, onde existe envio de mídia.
