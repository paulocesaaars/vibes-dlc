# Instruções de build: Vibes DLC

## Pré-requisitos

- Windows com Git Bash. O produto não abre PowerShell nem `cmd`.
- Node.js 22.13 ou superior (`engines.node` em `package.json`; o início para com a versão exigida e a encontrada quando é menor).
- Chrome ou Edge atuais para as provas no navegador. O Edge já vem com o Windows, e nenhum navegador é baixado.
- Ferramentas de compilação do Windows só se o `node-pty` não tiver binário pronto para a versão do Node.js em uso.

## Instalação das dependências

```bash
npm install
```

O `package-lock.json` é versionado. Depois do `npm install` o produto não faz nenhuma chamada de rede.

## Ambiente

Nenhuma variável é obrigatória. As opcionais, todas lidas por `src/config/app-config.ts`:

| Variável | Efeito |
|---|---|
| `PORT` | Porta do painel (padrão 3000) |
| `VIBES_HOST` | Endereço de escuta (padrão `127.0.0.1`); outro valor mostra o alerta permanente |
| `VIBES_PUBLIC_HOST` | Nome público aceito quando o endereço é `0.0.0.0` |
| `VIBES_SHELL` | Caminho do `bash.exe`, antes da procura na instalação do Git |
| `VIBES_DB_PATH` | Caminho do banco, sempre dentro de `.vibes/` da raiz do repositório |
| `PROOF_BROWSER_CHANNEL` | Só para as provas: `msedge` (padrão) ou `chrome` |

## Comandos de build

```bash
npm run build      # build de produção do Next.js
npm run dev        # desenvolvimento em 127.0.0.1:3000
npm start          # versão compilada (depois do build)
```

## Verificação do build

1. `npm run build` termina com código 0 e lista as rotas, entre elas `/api/repo/recheck`.
2. `npm run typecheck` e `npm run lint` (ESLint e Prettier) terminam com código 0.
3. `npm run verify` termina com código 0: roda `npm run check` (lint, tipos e testes com cobertura) e as provas `scripts/proof-u1.ts` a `scripts/proof-u5.ts`.

## Problemas comuns

- **`Another next dev server is already running`:** há um `next dev` aberto nesta pasta. Encerre o processo antes de rodar as provas, porque elas sobem o próprio painel.
- **`node-pty` não carrega:** falta binário para a versão do Node.js ou falta ferramenta de compilação. A prova da instalação falha com essa causa, e o `README` lista o pré-requisito.
- **O Git Bash não foi encontrado:** instale o Git para Windows ou defina `VIBES_SHELL`.
- **Eco do terminal acima de 150 ms na prova de U2:** a medição é sensível à carga da máquina. Feche o que consome CPU em segundo plano e repita; o limite não muda.
- **Aviso `MaxListenersExceededWarning` (11 ouvintes de `exit`):** aparece nas provas e nos testes, sem efeito no resultado. Fica como pendência.
