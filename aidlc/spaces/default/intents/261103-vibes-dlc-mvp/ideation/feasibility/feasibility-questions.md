# Viabilidade e restrições: perguntas

As opções partem da declaração de intenção (`intent-statement.md`), do `PRD.md` e do `TDD.md`. Só perguntamos o que esses documentos não respondem.

## Q1. [Engenharia] As máquinas onde o guia vai rodar permitem instalar o que ele precisa?

O guia depende de Node.js e de um pacote de terminal com parte nativa, que pode exigir compilação na instalação. Só se sabe que a empresa permite o Git Bash. Se a instalação for bloqueada, a meta de rodar com `npm install` e um comando não se cumpre.

A. Sim: Node.js, npm e ferramentas de compilação são permitidos.
B. Node.js e npm são permitidos, mas ferramentas de compilação não.
C. Ainda não sei: preciso verificar antes de contar com isso.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q2. [Engenharia] Em quais sistemas o MVP precisa funcionar?

O TDD cita Windows, macOS e Linux, e isso multiplica o que precisa ser testado no terminal real.

A. Windows com Git Bash primeiro; macOS e Linux depois do MVP.
B. Windows, macOS e Linux, todos no MVP.
C. Só Windows com Git Bash, sem previsão para os outros.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q3. [Engenharia] Quem desenvolve e testa o MVP?

Isso define a capacidade disponível e quem pode avaliar a meta de uma pessoa nova concluir uma etapa só com o guia.

A. O autor sozinho, com ajuda da IA.
B. O autor com ajuda da IA, e pessoas do time testam.
C. O autor e outras pessoas do time desenvolvem juntos.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q4. [Gestão] Há prazo ou orçamento que limite o MVP?

Isso define se partes como a personalização precisam ser cortadas para caber no tempo disponível.

A. Sem prazo fixo nem orçamento específico.
B. Há um prazo: informo a data.
C. Há um limite de orçamento, por exemplo com IA: informo o valor.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Q5. [Conformidade] Há exigência regulatória ou política da empresa além do uso do Git Bash?

O guia roda localmente e não envia dados, mas exibe arquivos do repositório e dá acesso ao shell. Isso pode ter regras próprias em um ambiente corporativo.

A. Nenhuma conhecida além do Git Bash.
B. Existem políticas de segurança da empresa que precisam ser consultadas.
C. Existem exigências regulatórias específicas: informo quais.
D. Not identified
X. Other (please specify)

[Answer]: A

## Q6. [Gestão] Algo na organização pode travar o trabalho?

Por exemplo, uma aprovação para usar a ferramenta na empresa ou prioridades concorrentes.

A. Nada conhecido.
B. É preciso aprovação da empresa antes de usar com o time.
C. Há outras prioridades concorrentes que podem atrasar.
D. Not identified
X. Other (please specify)

[Answer]: A

## Q7. [Produto] Quem vai testar a meta de uma pessoa nova concluir uma etapa só com o guia?

Você respondeu que desenvolve sozinho, mas essa meta precisa de alguém que nunca usou o AI-DLC, e o autor não serve para isso. Sem essa pessoa, a meta não pode ser comprovada.

A. Convido alguém do time ou da empresa para testar antes de considerar o MVP pronto.
B. Testo eu mesmo, seguindo só as instruções, e aceito a prova mais fraca.
C. Essa meta fica para depois do MVP.
D. Not yet defined
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **Instalação (Q1):** Node.js, npm e ferramentas de compilação são permitidos nas máquinas.
- **Sistemas (Q2):** Windows com Git Bash primeiro; macOS e Linux depois do MVP.
- **Equipe (Q3):** o autor desenvolve sozinho, com ajuda da IA.
- **Limites (Q4):** sem prazo fixo nem orçamento específico.
- **Regras (Q5):** nenhuma exigência conhecida além do Git Bash.
- **Bloqueios (Q6):** nada conhecido na organização.
- **Teste com pessoa nova (Q7):** o autor convida alguém do time ou da empresa antes de considerar o MVP pronto.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
