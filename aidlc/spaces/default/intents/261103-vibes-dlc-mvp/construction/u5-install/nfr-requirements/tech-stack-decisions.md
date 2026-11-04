# Decisões de tecnologia: u5-install

Base: `inception/requirements-analysis/requirements.md` (FR11, FR12) e `inception/units-generation/unit-of-work.md`. A stack é a de U1, sem dependência nova. U5 é do tipo `packaging`, e o design funcional não gera `functional-spec` nem `rules` para esse tipo, então estas decisões também fixam o que esses dois arquivos teriam fixado.

| Necessidade | Escolha | Motivo |
|---|---|---|
| Forma de instalação | Cópia de uma subpasta para o repositório, seguida de `npm install` e de um comando de início, como pede FR12.1. Sem pacote npm nem instalador | Atende FR12.3, sem registro de pacotes nem passo de publicação |
| Nome da subpasta | `vibes-dlc/` [assumption] | O `unit-of-work.md` deixa o nome para esta Unidade. Um nome único e sem espaço evita um segundo caminho com espaço. A pessoa pode trocar no gate de design |
| Conteúdo copiado | O código, `package.json`, `package-lock.json`, `migrations/`, `public/` e os arquivos de configuração do Next.js e do TypeScript. Ficam de fora `aidlc/`, `.claude/`, `.vibes/`, `node_modules/`, `.next/`, `tests/`, `scripts/` de prova e `design/` | A lista fica no `README`. Deixar `aidlc/` de fora, mais NFR5.3, evita que a subpasta seja tomada pela raiz |
| Raiz do repositório | `findRepoRoot` (já em `src/config/app-config.ts`), começando na pasta acima do produto | Já cobre FR12.4. U5 muda o ponto de partida e acrescenta o teste de NFR5.3 |
| Pasta de dados | `.vibes/` na raiz do repositório, não na subpasta. Sem raiz, nenhum dado é criado (NFR7.3) | Com raiz, é o comportamento de U1 (`readDbPath` usa `repoRoot`). Sem raiz, `loadConfig` cai em `cwd` e `prepareStart` prepara o armazenamento antes da tela de falha, o que U5 corrige. O `.gitignore` do repositório recebe uma única linha, à mão |
| Estado fixo na partida | `createRuntime()` deixa de fixar a raiz, o leitor e o diretório de partida do terminal. Tentar de novo os reavalia (NFR9.3) | Sem isso, a falha de FR11.1 não tem saída sem reiniciar o servidor, contra FR11.5 |
| Versão do Node.js | `engines.node` em `>=22.13.0` mais a conferência em tempo de execução com `isNodeVersionOk` e `nodeVersionMessage`, que existem em `src/config/app-config.ts`. `prepareStart` (`src/web/bootstrap.ts`) já as chama e interrompe o início com a mensagem no console | `engines` sozinho só avisa no `npm install`. A mensagem sai no console porque o painel nem abre. O trabalho de U5 é garantir que `npm run dev` e `npm start` passem por esse caminho e testar a mensagem (NFR9.1) |
| Início do produto | `npm run dev` para uso e `npm run build && npm start` para a versão compilada, como diz o `team.md` | Sem comando novo |
| Telas de falha | A tela E6 de U1, estendida: sem AI-DLC, registro ilegível, sem Git Bash e versão do Node.js. Tentar de novo refaz a verificação sem reiniciar o servidor | Reaproveita componentes e a rota de verificação, sem biblioteca nova |
| Teste da instalação | Script de prova em `scripts/proof-u5.ts`, no estilo das provas U1 a U4: cria um repositório temporário limpo em um caminho com espaços e acentos, copia a subpasta, roda `npm install` e inicia o produto no Git Bash | Cobre AC1.1.1 a AC1.1.4 e a nota de U5. Precisa de rede só durante o `npm install` |

## Alternativas rejeitadas

- **Pacote npm ou `npx`:** pedido fora do MVP em `requirements.md` e exigiria publicar o produto.
- **Subpasta que contém a própria `aidlc/`:** deixaria a raiz ambígua e o terminal abriria dentro do produto. NFR5.3 exige que isso nunca aconteça.
- **Gravar `.vibes/` dentro da subpasta:** separaria os dados do repositório e quebraria a regra de U1. Trocar de versão do produto apagaria os dados da pessoa.
- **Verificar a versão do Node.js só com `engines` e `engine-strict`:** a mensagem do `npm` está em inglês e não diz o que fazer, o que contraria NFR8.

## Riscos

- O `node-pty` traz um binário nativo. A instalação em outra máquina Windows pode precisar de ferramentas de compilação se não houver binário pronto para a versão do Node.js. A prova mede isso em uma máquina limpa e, se falhar, o `README` registra o pré-requisito.
- A prova da instalação precisa de rede durante o `npm install`, enquanto o resto das provas roda sem rede. A rede é cortada só depois da instalação.
