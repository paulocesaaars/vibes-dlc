# Esteira de integração: perguntas

O `team.md` já fixa a ferramenta (GitHub Actions em runner Windows), a ramificação (`main` como tronco, trabalho direto nela) e que a esteira roda o mesmo comando local. O MVP não tem ambiente de implantação, e o produto não é publicado como pacote, então não há repositório de artefatos. Restam quatro pontos que mudam a esteira.

Suposição [assumption]: a esteira usa Node.js 22.13.0, o mínimo que o produto exige, para garantir o piso. Diga se prefere outra versão.

## Q1. [Engenharia] Quando a esteira roda?

O repositório está em `github.com/paulocesaaars/vibes-dlc` e hoje não tem nenhuma esteira.

- A. A cada push em `main` e a cada pull request
- B. Só a cada push em `main`
- C. A cada push em `main`, a cada pull request e uma vez por semana, para pegar novos avisos de segurança nas dependências
- X. Other (please specify)

[Answer]:

## Q2. [Qualidade] O que a esteira roda?

As provas no navegador (`scripts/proof-u1.ts` a `scripts/proof-u5.ts`) usam Git Bash, `node-pty` e o Edge, que o runner Windows do GitHub tem. A prova de U2 também chama o comando `aidlc` do AI-DLC, que não está no repositório nem no runner, então ela não passa lá.

- A. Só o comando local de verificação rápida (`npm run check`: lint, tipos e testes com cobertura de 80%) mais o build e a auditoria de dependências
- B. O de A e as provas de U1, U3, U4 e U5 no runner. A prova de U2 continua só local
- C. O de A e todas as provas, instalando o comando `aidlc` no runner (precisa de um passo novo e de saber como instalá-lo lá)
- X. Other (please specify)

[Answer]:

## Q3. [Segurança] O que acontece com um achado de severidade alta ou crítica no `npm audit`?

O `team.md` diz que a verificação automática bloqueia esses achados. Hoje não há nenhum (só 16 moderados).

- A. A esteira falha
- B. A esteira só avisa, sem falhar
- X. Other (please specify)

[Answer]:

## Q4. [Engenharia] A esteira pode barrar um merge?

A equipe trabalha direto em `main`, sem pull request. Assim, a esteira roda depois do push e só avisa que algo quebrou; ela não impede nada. Isso muda a "exceção temporária" do `team.md`, que dizia que o comando local protege `main` até a esteira existir.

- A. Manter o trabalho direto em `main`. A esteira avisa depois do push, e o comando local continua sendo a proteção antes do commit
- B. Passar a usar pull request, com a esteira obrigatória antes do merge (muda o jeito de trabalhar descrito no `team.md`)
- X. Other (please specify)

[Answer]:
