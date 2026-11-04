# Segurança: u5-install

U5 leva o produto ao repositório de outra pessoa e mostra as telas de falha. O risco novo desta Unidade não está no uso do painel, e sim em onde o produto acha que está: qual pasta vira a raiz do repositório, onde o terminal abre, onde `.vibes/` é criada e o que o produto escreve fora da própria subpasta. O uso é local e de uma pessoa, mas o repositório, o caminho e o texto dos arquivos do AI-DLC são tratados como não confiáveis.

U5 é do tipo `packaging`, e o design funcional não gera `functional-spec` nem `rules` para esse tipo. Por isso as regras vêm direto de `requirements.md` (`FR11` e `FR12`) e de `unit-of-work.md`.

Os requisitos abaixo detalham os `NFR` de inception que U5 cumpre. Os `NFR1` e `NFR2` não se aplicam a U5 (ver `traceability.json`). Estes requisitos vêm de `FR11`, `FR12` e dos `NFR3` a `NFR13` de `requirements.md`.

| ID | Requisito | Verificação |
|---|---|---|
| NFR3.1 | Em qualquer instalação, o servidor escuta só em `127.0.0.1`, e `VIBES_HOST` em outro endereço mantém o aviso permanente. A instalação em subpasta e as telas de falha não mudam isso | Teste da instalação em repositório limpo, que confere o endereço de escuta com e sem `VIBES_HOST` |
| NFR4.1 | A rota de Tentar de novo (FR11.5) e qualquer rota nova de U5 passam por `isRequestAllowed` (`Origin` e `Host` do próprio app). Uma requisição de fora não refaz a verificação nem lê o repositório | Teste de rota com `Origin` e `Host` de fora, ao lado do teste que percorre todas as rotas |
| NFR5.1 | As telas de falha mostram como texto, sem executar HTML nem script, o caminho do arquivo ilegível e qualquer trecho vindo do repositório (nome de demanda, mensagem de erro do leitor) | Teste de interface com `<script>` no nome de uma demanda e no caminho do arquivo que falhou |
| NFR5.2 | O caminho do repositório e da subpasta nunca é montado em uma linha de comando de shell. O terminal abre na raiz pelo `cwd` do `node-pty`, e o `bash.exe` é chamado com argumentos separados. Espaços, acentos, `&`, `'` e `$` no caminho funcionam sem escapar nada | Teste da instalação em uma pasta com espaços, acentos e os caracteres `& ' $ ( )`, que confere o `pwd` do terminal real |
| NFR5.3 | A raiz do repositório é a pasta mais próxima, acima do produto, que contém `aidlc/`. A pasta do próprio produto nunca é a raiz, mesmo que alguém a copie com um `aidlc/` dentro. Sem raiz acima dela, vale a tela de falha de FR11.1 | Teste com um `aidlc/` dentro da subpasta do produto e outro no repositório pai, e teste sem nenhum |
| NFR6.1 | Depois do `npm install`, o produto não baixa nada e não faz chamada de rede ao iniciar, nem nas telas de falha. O `README` não pede nenhum download em tempo de execução | Prova da instalação com a rede desligada depois do `npm install`, registrando as requisições |
| NFR7.1 | A instalação só acrescenta a subpasta do produto. Nenhum arquivo existente do repositório muda, em particular o `package.json` e o `.gitignore`. A única edição é a de `.vibes/` no `.gitignore`, feita à mão por quem instala, como diz o `README` | Teste da instalação em um repositório com `package.json` próprio, que compara o `git status` e os hashes antes e depois |
| NFR7.2 | Depois da primeira execução, a única criação fora da subpasta do produto é `.vibes/`, na raiz do repositório (FR12.6). O produto nunca escreve em `aidlc/`, em `public/` nem em arquivo versionado | A mesma prova, conferindo cada caminho novo fora da subpasta |
| NFR7.3 | Sem raiz de repositório (falha de FR11.1), o produto não cria `.vibes/` nem abre o banco em lugar nenhum, nem dentro da subpasta do produto. Os dados só nascem quando a raiz existe, e ficam sempre num único lugar. Hoje `loadConfig` usa `repoRoot ?? cwd` e `prepareStart` prepara o armazenamento antes da tela de falha, então isso é trabalho novo de U5 | Teste da instalação sem `aidlc/` acima, que lista o que foi criado e confere que nada de dados do usuário ficou na subpasta. Depois cria `aidlc/`, usa Tentar de novo e confere que `.vibes/` nasce só na raiz |
| NFR8.1 | As telas de falha, a mensagem de versão do Node.js e o `README` ficam em português (Brasil). Ficam no original os comandos, os caminhos e o que a CLI imprime | Teste de interface e revisão do `README` |
| NFR9.1 | Com Node.js anterior a 22.13, o início mostra a versão exigida e a versão encontrada, em português, antes de qualquer outra falha, e não abre o painel. A conferência já está ligada ao início em `prepareStart` (`src/web/bootstrap.ts`) e a mensagem sai no console do processo, não em tela do painel, porque o painel não chega a abrir. O trabalho de U5 é confirmar que `npm run dev` e `npm start` passam por esse caminho | Teste de unidade de `isNodeVersionOk` e `nodeVersionMessage` com versões de borda, e teste de `prepareStart` com a versão passada como argumento, sem trocar o Node.js real. A prova usa o Node.js real e não simula versão |
| NFR9.2 | Sem o Git Bash, a tela de falha mostra como instalar ou configurar `VIBES_SHELL`. O terminal não abre PowerShell nem `cmd` em nenhum caso (FR11.4) | Teste com `VIBES_SHELL` inexistente e sem Git no caminho, que confere a tela e a ausência de sessão |
| NFR9.3 | Tentar de novo (FR11.5) reavalia, sem reiniciar o processo, a raiz do repositório (`findRepoRoot`), o `AidlcReader` e o diretório de partida do terminal. Hoje `createRuntime()` roda uma vez por processo e fixa essas três coisas, e o botão só relê pelo mesmo leitor, então depois de instalar o AI-DLC a tela continuaria em falha. O `runtime` deixa de ser fixo na partida para essas três | Teste que inicia sem `aidlc/`, cria `aidlc/` depois da partida, usa Tentar de novo e confere que a tela sai da falha e que o terminal real abre na raiz |
| NFR12.1 | Instalar de novo ou atualizar o produto mantém `.vibes/`, e o `README` diz para não apagá-la. `.vibes/vibes.db` é copiado antes de migrar (NFR12) | Teste da atualização sobre uma `.vibes/` com dados de U1 a U4 |
| NFR13.1 | Os logs e as telas de falha não imprimem variáveis de ambiente, chaves nem a saída do terminal. A mensagem traz só o caminho do arquivo que falhou e o motivo | Teste que procura valores de variáveis de ambiente nos logs e nas telas de falha |

## Acessibilidade e qualidade

Como U5 é de empacotamento, estes requisitos não têm arquivo próprio: ficam aqui, ao lado dos de segurança.

| ID | Requisito | Verificação |
|---|---|---|
| NFR10.1 | Nas telas de falha, Tentar de novo e os links de ajuda se alcançam e se acionam pelo teclado, têm rótulo e não dependem só de cor para dizer que há uma falha | Teste de interface que percorre as telas só com o teclado |
| NFR11.1 | O teste da instalação roda em um repositório limpo, em um caminho com espaços e acentos, com e sem `package.json` próprio, e cada módulo novo cobre o caminho feliz e pelo menos dois casos de erro ou de borda. O mínimo de 80% de linhas do projeto todo continua valendo e é conferido na suíte completa | `scripts/proof-u5.ts` e a suíte de `tests/u5/`, com o relatório de cobertura do projeto. A prova passa só se todas as conferências derem OK e sai com código diferente de zero em qualquer falha. Se o `node-pty` não instalar na máquina limpa, a prova falha com essa causa, e o `README` passa a listar o pré-requisito. Ela nunca é ignorada nem substituída por simulação |

## Riscos aceitos

- A subpasta é copiada à mão, então quem instala pode copiar arquivos a mais ou a menos. O `README` lista o que copiar, e NFR5.3 impede o dano maior, que é tomar a própria pasta pela raiz.
- A edição do `.gitignore` é manual (FR12.2). Quem esquecer verá `.vibes/` no `git status`, sem perda de dados.
- O produto não confere se `aidlc/` é um AI-DLC completo, só se existe. Um `aidlc/` vazio cai na falha de registro ilegível, não na de instalação.
