## Way of Working

- `main` é o tronco, com histórico linear e sem ramificações de longa duração.
- Uma pessoa desenvolve com a ajuda da IA, e o trabalho acontece direto em `main`.
- Quando o AI-DLC criar uma ramificação para um Bolt, a base e o destino são `main`, e ela volta com squash em um único commit.
- Fazemos um commit por Unidade aprovada e o enviamos em seguida para `origin/main`. O registro do AI-DLC (`aidlc/`) vai em um commit separado, do tipo `chore(aidlc)`.
- Fora desse ritmo, só fazemos commit a pedido de quem desenvolve, na ramificação em que a pessoa estiver.
- As mensagens de commit seguem o Conventional Commits, em português: `tipo(área): descrição`. Isso vale também para o commit de squash de um Bolt, que recebe a mensagem explicitamente em vez de só o slug.
- Não exigimos pull request no MVP. A revisão acontece nos gates do AI-DLC e no diff do Git antes do commit.

## Walking Skeleton

- Construímos primeiro uma fatia fina de ponta a ponta. A primeira Unidade é a menor fatia integrada que funciona, e ela fica pronta antes das demais.
- No MVP do Vibes DLC, a fatia é a definida em `scope-document.md`: o painel abre em `127.0.0.1`, o terminal real abre no Git Bash e mantém a sessão ao recarregar, o painel mostra a etapa e o passo a partir dos arquivos do AI-DLC, e o comando só é enviado depois da confirmação.
- Provamos a fatia com um script automático no navegador, usando o painel e o Git Bash reais, mais uma conferência final de quem desenvolve. O comando exato é escolhido na Construção.
- A fatia só conta como pronta depois dessa prova e da aprovação de quem desenvolve. Testes isolados e revisão de design não bastam.

## Testing Posture

- **Methodology**: test-after
- **Methodology evidence**: Escolha de quem desenvolve na entrevista desta etapa (Q6), entre `test-after`, `custom` e `tdd`.
- **Ordering**: Implementamos cada camada testável e, em seguida, escrevemos e rodamos os testes dessa camada, antes de passar para a próxima.
- **Volume**: a `Test Strategy` deste fluxo é Standard.
- **Cobertura**: mínimo de 80% de cobertura de linhas, medido no projeto todo. Esse mínimo não é reduzido para fazer uma etapa passar.
- **Casos**: cada módulo cobre o caminho feliz e pelo menos dois casos de erro ou de borda.
- **Antes de cada commit**: um único comando local roda lint, checagem de tipos e testes com cobertura.
- **Exceção temporária à verificação automática antes do merge**: até a etapa `ci-pipeline` criar a verificação automática, o comando local é a proteção de `main`. Quem desenvolve aceitou essa exceção (Q7), e ela termina quando a verificação existir. O mínimo de 80% continua valendo durante a exceção.
- **Verificação automática**: a etapa `ci-pipeline` cria a verificação no fim da Construção, com GitHub Actions em runner Windows, a plataforma que o MVP verifica. Ela roda o mesmo comando local. Os detalhes são confirmados nessa etapa.
- **Ferramentas**: Vitest para unidade e integração, e Playwright para o caminho completo no navegador, sem baixar navegadores no `npm install` do usuário.
- **Testes obrigatórios por risco**: escuta em `127.0.0.1`, rejeição de `Origin` e `Host` de fora, recusa de SVG, nenhum envio ao terminal sem confirmação, nenhuma chamada de rede do produto e leitura do AI-DLC com exemplos reais de `aidlc-state.md` e `audit/`.
- **Terminal**: o caminho real com `node-pty` e Git Bash é testado no Windows, sem substituir o pseudo-terminal por simulação nos testes de ponta a ponta.
- **Dependências**: o `package-lock.json` é versionado, e a verificação automática bloqueia achados de severidade alta ou crítica em `npm audit`.
- **Antes de declarar o MVP pronto**: uma pessoa que nunca usou o AI-DLC testa o guia.

## Deployment

- Esta versão não tem deploy, ambiente de staging nem produção. O produto é um app local que escuta em `127.0.0.1`, e a fase de Operação está fora do escopo.
- O padrão de deploy no merge para staging não se aplica enquanto não houver ambiente para receber o deploy.
- O app roda com `npm install` e `npm run dev`, ou `npm run build && npm start`.
- O MVP fica pronto quando as metas de sucesso e o teste com uma pessoa nova no AI-DLC forem cumpridos. Não há outro marco de entrega.
- Para voltar a uma versão anterior, usamos o commit de `main`. As migrações em `.sql` numeradas só avançam, e o arquivo `.vibes/vibes.db` é copiado antes de migrar.
- O tratamento das etapas de implantação fica para a v2. Revemos estas práticas quando isso entrar no escopo.

## Code Style

- Textos em português (Brasil): explicações, comentários, docstrings, logs, mensagens de erro e textos exibidos ao usuário.
- Identificadores em inglês: variáveis, funções, classes, módulos, tabelas e ferramentas.
- TypeScript em modo estrito, formatado com Prettier e verificado com ESLint, com as configurações na raiz do repositório. Falha de lint bloqueia o commit e, depois, a verificação automática.
- Convenções de TypeScript: `camelCase` em variáveis e funções, `PascalCase` em tipos e componentes, e `kebab-case` em nomes de arquivo novos. As pastas já citadas no `TDD.md`, como `public/guia/` e `design/prototipo/`, ficam como estão.
- Os módulos seguem o `TDD.md`: `core`, `terminal`, `aidlc`, `guide`, `triage`, `customization`, `db`, `config` e `web`.
- Os limites entre módulos valem como prática, conferida na revisão do diff. O `core` não conhece Next.js, SQLite nem o terminal. Só o `db` toca o banco. O `aidlc` só lê arquivos. O `guide` é dado estático. O `web` faz entrada, saída e delegação ao `core`.
- Quando há configuração de linter, ela prevalece sobre sugestões de estilo da IA.
