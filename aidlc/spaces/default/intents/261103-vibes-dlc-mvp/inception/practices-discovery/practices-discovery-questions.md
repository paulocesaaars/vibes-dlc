# Perguntas: Practices Discovery

Cada pergunta define como este projeto vai trabalhar a partir da Construção. Os pontos sem pergunta própria ficam com a sugestão de `team-practices.md`, que você revê na aprovação.

## Q1. [Engenharia de release] Onde o trabalho acontece?

Hoje todos os commits vão direto em `main`, e uma pessoa desenvolve com a ajuda da IA.

A. Direto em `main`, e quando o AI-DLC criar uma ramificação ela volta para `main` em um único commit
B. Uma ramificação por Unidade, sempre
C. Ramificação e pull request por Unidade
X. Other (please specify)

[Answer]: A

## Q2. [Engenharia de release] Quando fazer commit e enviar para o GitHub?

Isso define o tamanho de cada ponto de retorno e o quanto do trabalho fica protegido fora da sua máquina.

A. Um commit por Unidade aprovada, enviado a seguir, com o registro do AI-DLC em commit separado
B. Um commit por Unidade aprovada, enviado só quando você pedir
C. Um commit por etapa, enviado só quando você pedir
X. Other (please specify)

[Answer]: A

## Q3. [Engenharia de release] Como tratar a entrega desta versão?

O `PRD.md` tira o deploy desta versão, e o padrão do framework fala em ambientes de staging e produção.

A. Sem deploy nem ambientes, com uma tag de versão em `main` quando as metas de sucesso e o teste com uma pessoa nova forem cumpridos
B. Sem deploy nem ambientes, e sem tag
C. Criar algum ambiente mesmo assim
X. Other (please specify)

[Answer]: B

## Q4. [Engenharia de release] Construir primeiro uma fatia fina de ponta a ponta?

Um walking skeleton é uma versão mínima que funciona de ponta a ponta, construída primeiro para provar que as partes se conectam antes de entrarem os recursos de verdade. Aqui, seriam os quatro itens da primeira fatia em `scope-document.md`.

A. Sim
B. Não
X. Other (please specify)

[Answer]: A

## Q5. [Qualidade] Como provar que a primeira fatia funciona?

`npm run dev` só abre o painel, e o `scope-document.md` exige provar os quatro itens em uso real. O comando exato é escolhido na Construção.

A. Script automático no navegador, com o painel e o Git Bash reais, mais uma conferência final sua
B. Roteiro manual depois de `npm run dev`
X. Other (please specify)

[Answer]: A

## Q6. [Qualidade] Quando os testes são escritos?

As regras de `core`, `triage` e do leitor do AI-DLC são fáceis de testar antes, e o terminal real é difícil de testar antes de existir.

A. Depois de cada camada (`test-after`)
B. Antes em `core`, `triage` e no leitor do AI-DLC, e depois em `terminal` e `web` (`custom`)
C. Sempre antes do código (`tdd`)
X. Other (please specify)

[Answer]: A

## Q7. [Qualidade] O que protege `main` até a verificação automática existir?

O padrão do framework para este nível pede verificação automática antes do merge, mas ela só é criada no fim da Construção. A opção A é uma exceção temporária a essa regra, e você precisa aceitá-la.

A. Um único comando local antes de cada commit, com lint, tipos e testes, repetido depois pela verificação automática
B. Criar a verificação automática já na primeira Unidade
C. Nada até a verificação automática existir
X. Other (please specify)

[Answer]: A

## Q8. [Desenvolvimento] Quais ferramentas de formatação e lint?

O repositório ainda não tem nenhuma configuração. A escolha vale para todo o código e passa a bloquear o commit.

A. Prettier e ESLint, com TypeScript em modo estrito
B. Biome, com TypeScript em modo estrito
C. Só o que o Next.js gerar
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Trabalho direto em `main`. Quando o AI-DLC criar uma ramificação, ela volta para `main` em um único commit.
- Um commit por Unidade aprovada, enviado em seguida para o GitHub, com o registro do AI-DLC em commit separado.
- Sem deploy, sem ambientes e sem tag de versão.
- Primeiro uma fatia fina de ponta a ponta, provada por um script automático no navegador, com o painel e o Git Bash reais, mais uma conferência final sua.
- Testes escritos depois de cada camada (`test-after`).
- Até a verificação automática existir, um único comando local antes de cada commit, como exceção temporária aceita à regra de verificação antes do merge.
- Prettier e ESLint, com TypeScript em modo estrito.
- Sem pergunta própria, ficam as sugestões do rascunho: Conventional Commits em português; mínimo de 80% de cobertura no projeto todo; testes obrigatórios por risco; Vitest e Playwright; GitHub Actions em runner Windows com `npm audit`; arquivos novos em `kebab-case`; limites entre módulos do `TDD.md` como prática.
- Sem tag, voltar a uma versão anterior passa a ser pelo commit de `main`, com migrações que só avançam e cópia de `.vibes/vibes.db` antes de migrar.
- Como o produto chega ao repositório de outra pessoa fica para a Análise de Requisitos.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
