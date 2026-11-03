# Design funcional de U1: perguntas

Os requisitos, os contratos e a tabela de momentos já respondem à maior parte desta Unidade. Esta pergunta trata do único ponto que muda o comportamento do guia.

## Q1. [Arquitetura] Qual comando o guia oferece no passo Enviar da etapa atual?

Na documentação do framework, `/aidlc` sozinho retoma o trabalho do ponto em que parou, e `/aidlc --stage <etapa>` é um salto para uma etapa, que pode reabrir o que já estava em andamento. O protótipo mostra um comando por etapa, como se cada uma começasse por ele.

A. `/aidlc`, porque o próprio AI-DLC decide qual é a etapa atual e continua dela. O guia mostra o nome da etapa ao lado
B. `/aidlc --stage <etapa>`, como no protótipo, deixando a etapa explícita no comando
C. `/aidlc` na etapa atual, e `/aidlc --stage <etapa>` só quando a pessoa escolher voltar a uma etapa pela trilha
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **Comando:** o passo Enviar oferece `/aidlc`, com o nome da etapa ao lado.
- **Padrões que vou assumir, sem pergunta própria:**
  - o texto enviado é livre, porque a pessoa pode editar o comando. A proteção vem da checagem de origem, do `commandId` e da decisão do `Core`;
  - o comando tem uma linha só, sem quebras no campo;
  - um comando só conta como enviado depois de chegar ao terminal: a linha fica `pending` e passa a `written`;
  - o foco sai do terminal com F6, com um botão na barra como alternativa, e entra com F6 ou um clique;
  - as últimas 2000 linhas reaparecem ao recarregar;
  - sem Git Bash, U1 mostra uma mensagem simples, com o caminho procurado. A tela completa vem em U5;
  - U1 implementa a versão do Node.js e a raiz do repositório, e U5 valida a partir da subpasta;
  - em U1, Acompanhar reage à mudança de arquivos, e os demais momentos ficam em U2;
  - o script de prova usa o Git Bash real e confere o comando chegando ao terminal, sem depender de créditos de IA.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
