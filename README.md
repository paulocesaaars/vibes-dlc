# Vibes DLC

Painel local, em português, para acompanhar projetos com AI-DLC, com um terminal real ao lado.
Uma instalação abre diferentes repositórios, um por vez. O estado compartilhado vem dos arquivos
do AI-DLC; somente as preferências pessoais ficam na máquina do usuário.

## Pré-requisitos

- Node.js 22.13 ou superior e npm.
- No Windows, Git para Windows com Git Bash; `VIBES_SHELL` permite indicar outro caminho.
- Projetos com AI-DLC já configurado e com arquivos compatíveis com o leitor.
- Claude Code, Devin ou GitHub Copilot já instalado, autenticado e funcionando no terminal.

O terminal usa o módulo nativo `node-pty`. Sua instalação pode exigir Python e ferramentas
de compilação C++, conforme o sistema.

## Instalação central

1. Mantenha este repositório em uma pasta própria, separada dos projetos acompanhados.
2. Execute `npm install` e `npm run dev`.
3. Abra <http://127.0.0.1:3000>.
4. Informe o caminho absoluto de um projeto local com AI-DLC.

Não copie o produto para cada projeto. O Vibes não cria `.vibes/` nem arquivos próprios nos
repositórios acompanhados. Não há importação de instalações antigas.

Para produção, execute `npm run build` e `npm start`.

## Uso

- Selecione o **Projeto** no cabeçalho ou abra um dos projetos recentes.
  Use **Escolher pasta** para navegar pelos diretórios. O × de cada recente remove o atalho
  e aparece ao passar o mouse ou focar pelo teclado; em telas de toque, permanece visível.
- Escolha **Claude Code**, **Devin** ou **GitHub Copilot** no seletor **IA**, ao lado do projeto.
  A escolha é lembrada localmente por projeto.
- Abra uma sessão no terminal e inicie manualmente a IA escolhida.
- Consulte demandas, trilha, artefatos, unidades e decisões registradas no AI-DLC.
- Para criar, analisar, continuar ou ativar uma demanda, confira o comando antes de confirmar.
  É possível executá-lo com Enter ou apenas colar.
- Para Devin, o comando começa com `aidlc`; para Claude Code e Copilot, com `/aidlc`.
  Trocar a seleção ajusta os próximos comandos e não substitui a ferramenta aberta.
- Aprove e responda no terminal, nos gates do próprio AI-DLC.
- Em **Personalizar**, altere cores, frases e mídias globais. Cancelar desfaz as mudanças da visita.
- Trocar de projeto com terminal vivo pede confirmação e encerra essa sessão.
  Todas as abas do mesmo servidor passam a acompanhar o projeto escolhido.

O painel consulta os arquivos a cada dois segundos enquanto estiver aberto. Enviar um comando
não comprova sua execução. O painel não interpreta a saída da IA nem afirma que ela está
trabalhando a partir da ausência de mudanças.

Recarregar a página preserva a sessão enquanto o servidor estiver vivo. F6 alterna o foco entre
painel e terminal. O projeto deve ser selecionado novamente após reiniciar o servidor.

## Continuidade entre desenvolvedores

Versione e compartilhe os arquivos do AI-DLC junto com o trabalho do projeto. Depois de
`commit`, `push` e `pull`, outro dev abre o clone dele no Vibes e vê o andamento registrado.

Preferências, sessões de terminal e conversas internas das ferramentas não são compartilhadas.
Não há notas, marcações de revisão, histórico persistido de comandos ou progresso pessoal
dos antigos cinco passos.

## Preferências locais

O banco `preferences.db` e a pasta `media/` ficam em:

- Windows: `%LOCALAPPDATA%/vibes-dlc/`.
- macOS: `~/Library/Application Support/vibes-dlc/`.
- Linux: `${XDG_DATA_HOME:-~/.local/share}/vibes-dlc/`.

`VIBES_DATA_DIR` permite indicar uma pasta absoluta alternativa, fora dos projetos acompanhados.
Somente projetos recentes, IA por projeto e personalizações são persistidos. Não existe banco
compartilhado ou arquivo adicional do Vibes para versionar no Git.

## Configuração e limites

`PORT` tem padrão 3000 e `VIBES_HOST` tem padrão `127.0.0.1`. Não há autenticação.
Quem acessa o painel pode operar o terminal da máquina; mantenha a escuta local.
Outras opções e o contrato de arquivos estão no [TDD](docs/TDD.md).

O grafo `stage-graph.json` é procurado na localização conhecida de Claude e, na ausência dela,
nas pastas de configuração ocultas e em `aidlc/`. A preferência de IA não define esse caminho.
Formatos incompatíveis geram um diagnóstico; o painel não oferece instalação ou configuração.

## Desenvolvimento

- `npm run check`: lint, formatação e tipos.
- `npm run lint`: ESLint e conferência de formatação.
- `npm run typecheck`: TypeScript sem emissão.
- `npm run format`: aplica Prettier.
- `npm run verify`: executa `check`; não há suíte de testes no projeto.

## Referências

- [Produto](docs/PRD.md).
- [Arquitetura](docs/TDD.md).
- [Design](docs/DESIGN.md).
- [Especificação](docs/SPEC-MULTIPLOS-REPOSITORIOS.md).
- [Plano](docs/PLANO-MULTIPLOS-REPOSITORIOS.md).
