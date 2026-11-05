# Vibes DLC

Guia local, em português, que conduz uma pessoa pelo AI-DLC passo a passo, com um terminal real ao
lado. O painel acompanha os arquivos do AI-DLC, apresenta artefatos para revisão e mantém as
aprovações no terminal, nos gates do framework.

## Pré-requisitos

- Node.js 22.13 ou superior e npm.
- No Windows, Git para Windows com Git Bash. É possível indicar outro caminho com `VIBES_SHELL`.
- CLI de IA instalada e autenticada na máquina. Os comandos prontos do guia são para Claude Code;
  a opção Outra CLI apresenta esses comandos como referência, sem envio.
- AI-DLC instalado no projeto. O guia também abre sem ele e oferece instruções de preparação.

O terminal usa `node-pty`, um módulo nativo. Se a instalação precisar compilá-lo, serão necessárias
as ferramentas de compilação compatíveis com seu sistema; no Windows, isso pode incluir Python e
Visual Studio Build Tools com C++.

## Instalação no seu projeto

1. Crie uma subpasta `vibes-dlc/` na raiz do projeto.
2. Copie para ela somente os itens abaixo, preservando os caminhos:
   - `src/`
   - `public/`
   - `migrations/`
   - `scripts/run-next.mjs`
   - `scripts/no-network.cjs`
   - `package.json`
   - `package-lock.json`
   - `next.config.ts`
   - `next-env.d.ts`
   - `tsconfig.json`
3. Na subpasta, execute `npm install` e depois `npm run dev`.
4. Abra <http://127.0.0.1:3000>.
5. Inclua `.vibes/` no `.gitignore` do projeto que receber o guia.

Não copie as pastas `aidlc/`, `.claude/`, `.vibes/`, `node_modules/` ou `.next/` do produto para
essa subpasta. O framework deve estar instalado no projeto que você deseja conduzir, incluindo
`.claude/tools/data/stage-graph.json`, usado pelo leitor de etapas.

Para executar uma compilação de produção, use `npm run build` e depois `npm start`.

Sem encontrar `aidlc/`, o terminal abre na pasta pai do produto. A tela oferece o comando
`aidlc config --harness claude --mcp none --yes` e, depois, `claude`. O ícone de copiar fica ao lado
de cada comando; **Enviar ao terminal** cola sem executar. Pressione Enter no terminal e, após a
preparação, clique em **Tentar de novo**. Se `aidlc` não estiver instalado, siga as instruções do
repositório `awslabs/aidlc-workflows` indicadas pelo guia.

## Uso

- Abra uma demanda existente ou selecione **Nova demanda**. Descreva o trabalho, confirme o nível
  sugerido ou escolha outro e confira o comando. Também é possível pedir uma análise à sua IA.
- Na etapa, siga Entender, Enviar, Acompanhar, Revisar e Aprovar. Abra sua CLI de IA no terminal
  antes de enviar os comandos do fluxo.
- Copie as sugestões pelo ícone no canto direito. Nos fluxos com envio habilitado, escolha entre
  executar o comando e apenas colá-lo. Aprovações e respostas continuam no terminal.
- Consulte Artefatos, Unidades e ciclos, Decisões e Comandos nas abas da demanda. Notas em
  artefatos são locais e não são enviadas à IA.
- Em **Personalizar**, altere artes, frases, cores e a opção de CLI. **Cancelar** desfaz as mudanças
  daquela visita; **Concluir** as mantém.

Recarregar a página ou recolher o terminal preserva a sessão enquanto o servidor estiver vivo.
F6 alterna o foco entre guia e terminal.

## Configuração e atualização

As variáveis opcionais e seus limites estão em [Configuração e segurança](docs/TDD.md#configuração-e-segurança).
Por padrão, o painel escuta em `127.0.0.1:3000`, sem autenticação. Expor o servidor à rede permite
que quem acessa o painel use o terminal da máquina.

Para atualizar, substitua os arquivos da subpasta, execute `npm install` e reinicie o guia.
Preserve `.vibes/` na raiz do projeto: ela contém o banco e as mídias personalizadas. As migrações
pendentes são aplicadas automaticamente, com cópia do banco que já possui migrações anteriores.

## Desenvolvimento

- `npm run check`: lint, formatação e checagem de tipos; não executa testes.
- `npm run lint`: ESLint e conferência de formatação com Prettier.
- `npm run typecheck`: TypeScript sem emissão de arquivos.
- `npm run format`: aplica a formatação configurada.
- `npm test` e `npm run test:coverage`: comandos opcionais do Vitest. A árvore atual não contém
  `tests/`; a configuração procura `tests/**/*.test.{ts,tsx}` e exige 80% de linhas na cobertura.
- `npm run verify`: executa `check` e as provas U1–U5. As provas U1–U4 dependem de registros do
  AI-DLC e do grafo instalados no repositório; U5 também depende de `tests/fixtures/aidlc/`, ausente
  na árvore atual. Não é uma verificação autossuficiente desta distribuição.

As skills locais de revisão, versionamento e atualização de documentação ficam em `.agents/skills/`
e `.claude/skills/`. As regras compartilhadas estão em [AGENTS.md](AGENTS.md), e `HARNESS.md` é o
ponto de extensão para regras específicas do projeto.

## Referências

- [Produto e comportamento](docs/PRD.md)
- [Arquitetura e configuração](docs/TDD.md)
- [Design da interface](docs/DESIGN.md)
- [Observações sobre o AI-DLC](docs/FEEDBACK-AIDLC.md)
