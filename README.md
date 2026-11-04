# Vibes DLC

Guia local, em português, que conduz uma pessoa pelo AI-DLC passo a passo, com um terminal real ao
lado. O painel só lê os arquivos do AI-DLC do seu projeto e escreve apenas em `.vibes/`. Ele não faz
chamadas de rede, e quem aprova cada etapa continua sendo o gate do AI-DLC, no terminal.

## Pré-requisitos

- **Node.js 22.13 ou superior.** Em uma versão mais antiga, o guia não abre e diz qual é a versão
  encontrada.
- **Windows com o Git para Windows instalado.** O terminal do guia é o Git Bash (`bash.exe`). Se o Git
  estiver em outra pasta, aponte para o `bash.exe` com a variável `VIBES_SHELL`.
- **`node-pty`**, o módulo nativo do terminal. O `npm install` baixa um binário pronto. Se não houver
  um para a sua versão do Node.js, ele compila o módulo e precisa das
  ferramentas de compilação do Windows (Visual Studio Build Tools com a carga de trabalho de C++ e o
  Python).
- Um projeto que use, ou vá usar, o AI-DLC. Se ainda não tiver a pasta `aidlc/`, o guia abre mesmo
  assim, explica o que fazer e deixa o terminal pronto para você instalar o AI-DLC.

## Instalação

Instale **copiando** os arquivos, e não clonando este repositório dentro do seu projeto.

1. Na raiz do seu projeto (a pasta que tem ou terá `aidlc/`), crie a pasta `vibes-dlc/`.
2. Copie para `vibes-dlc/` somente estes itens, mantendo as pastas:
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

   Não copie `aidlc/`, `.claude/`, `.vibes/`, `node_modules/`, `.next/`, `tests/`, `design/` nem os
   outros scripts de `scripts/`. Se a subpasta tiver um `aidlc/` e nenhum `.git`, o guia a ignora e
   procura o AI-DLC na pasta de cima.
3. Dentro de `vibes-dlc/`, rode `npm install`. Este é o único passo que usa a rede.
4. Adicione `.vibes/` ao `.gitignore` do seu projeto, **à mão**. O guia não altera nenhum arquivo do
   seu projeto.
5. Inicie o guia, ainda dentro de `vibes-dlc/`:
   - para desenvolver: `npm run dev`
   - para uso normal: `npm run build && npm start`
6. Abra <http://127.0.0.1:3000> no navegador.

O guia procura a pasta `aidlc/` subindo a partir de `vibes-dlc/`. A primeira pasta que tiver `aidlc/` é
a raiz do projeto, e é nela que o guia cria `.vibes/` com o banco e as imagens da sua personalização.
Sem `aidlc/`, o guia não cria nada: o terminal abre na pasta do seu projeto (a pasta de cima de
`vibes-dlc/`), você instala o AI-DLC por ele e clica em **Tentar de novo**, sem reiniciar o guia.

## Atualização

Copie a subpasta de novo por cima da anterior, rode `npm install` e inicie o guia. **Não apague
`.vibes/`**: ela fica na raiz do projeto, fora de `vibes-dlc/`, e guarda o seu progresso e a sua
personalização. Antes de migrar o banco, o guia copia `.vibes/vibes.db`.

## Configuração

| Variável | Para que serve |
|---|---|
| `PORT` | Porta do painel. Padrão: `3000`. |
| `VIBES_HOST` | Endereço de escuta. Padrão: `127.0.0.1`. Outro valor expõe o terminal e mostra um alerta permanente. |
| `VIBES_PUBLIC_HOST` | Nome aceito como endereço do painel quando `VIBES_HOST` é `0.0.0.0`. |
| `VIBES_SHELL` | Caminho do `bash.exe` do Git Bash, se ele não estiver na instalação padrão. |
| `VIBES_DB_PATH` | Caminho do banco dentro de `.vibes/`. Ignorada se o guia não achar o AI-DLC. |

## Para quem desenvolve o produto

`npm run check` roda lint, checagem de tipos e testes com cobertura (mínimo de 80% de linhas).
`npm run verify` roda também as provas de ponta a ponta de U1 a U5, no navegador e no Git Bash reais.
