# Design de domínio: perguntas

Os módulos já estão definidos no `TDD.md` e confirmados em `team-practices.md`: `core`, `terminal`, `aidlc`, `guide`, `triage`, `customization`, `db`, `config` e `web`. As perguntas abaixo tratam só das duas fronteiras que eles não resolvem.

## Q1. [Arquitetura] Como o guia descobre que há uma pergunta registrada?

O sinal confirmado é a lista `open` de `aidlc engine log answers`, que é um comando, enquanto `team-practices.md` diz que o módulo `aidlc` só lê arquivos. O comando tem regras próprias para decidir o que continua em aberto, como uma resposta que fecha várias perguntas de um mesmo menu. Essas regras teriam de ser copiadas para ler o `audit/` diretamente.

A. Executar esse comando de leitura, com limite de tempo. Se ele faltar ou falhar, o guia usa a instrução genérica
B. Ler o `audit/` diretamente e reproduzir essas regras no produto
C. Usar os dois: comando quando existir, e leitura do `audit/` como reserva
X. Other (please specify)

[Answer]: A

## Q2. [Arquitetura] O que o banco local guarda sobre uma demanda?

Cada demanda é um intent do AI-DLC, e o `TDD.md` diz que o banco guarda demandas, nível e estado no ciclo. Uma cópia desses dados pode divergir dos arquivos, que são a fonte da verdade.

A. Só o que o AI-DLC não guarda: passo do guia, artefatos revisados, notas e comandos enviados, ligados ao identificador do intent. O restante é sempre lido dos arquivos
B. Uma cópia completa da demanda, atualizada a partir dos arquivos, para abrir mais rápido
C. Nada de demanda no banco, com o progresso do guia em arquivos JSON em `.vibes/`
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **Pergunta registrada:** o guia executa `aidlc engine log answers`, com limite de tempo. Se o comando faltar ou falhar, usa a instrução genérica. A prática passa a ser "o módulo `aidlc` só lê arquivos e executa comandos de leitura".
- **Banco local:** guarda só o que o AI-DLC não guarda: passo do guia, artefatos revisados, notas e comandos enviados, ligados ao identificador do intent. O restante é sempre lido dos arquivos, o que ajusta o texto de "Dados" no `TDD.md`.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
