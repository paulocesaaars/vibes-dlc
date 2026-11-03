### Comunicação e idioma

- **Português (Brasil):** explicações ao usuário, comentários, docstrings, logs,
  mensagens de erro e textos exibidos ao usuário.
- **Inglês:** nomes de variáveis, funções, classes, módulos, tabelas e ferramentas.

### Feedback do AI-DLC para o produto

O Vibes DLC é um guia do AI-DLC construído com o próprio AI-DLC, então cada execução
é também pesquisa de produto. Sempre que trabalhar com o AI-DLC neste repositório,
registre o que aprender em `FEEDBACK-AIDLC.md`, seguindo o formato do arquivo.

**Prioridade: os sinais do guia.** Em cada etapa, antes de apresentar uma pergunta ou
um gate e logo depois da resposta, leia `aidlc-state.md` e `<record>/audit/` e anote o
que mudou nos arquivos. O objetivo é responder às perguntas em aberto de
`FEEDBACK-AIDLC.md`, com o arquivo, o campo e o trecho como evidência. Leitura de
código é hipótese; só uma execução real confirma.

**Registre também:**
- pontos a validar do `TDD.md` que a execução confirmar ou derrubar;
- diferenças em relação ao protótipo, ao `PRD.md` ou ao `TDD.md`: comandos, nomes de
  artefatos, etapas puladas, textos dos gates e idioma;
- o que confundiria quem nunca usou o AI-DLC, e o que o guia deveria explicar.

**Limites:**
- O registro não pode atrapalhar o fluxo: nunca responda nem aprove um gate para
  coletar um sinal, e nunca adie um gate por causa do registro.
- Nunca edite `aidlc-state.md`, `audit/` nem os diários de etapa à mão. Eles são só
  leitura aqui.
- Não copie segredos, tokens nem dados pessoais para o registro.
- Regras sobre como trabalhar vão pelo ritual de aprendizados do AI-DLC. Aqui entra o
  que muda o produto.

**Como aplicar o que foi aprendido:** ao terminar uma etapa, diga ao usuário em uma
linha o que entrou no registro. Quando houver evidência, atualize os "Pontos a validar"
do `TDD.md`. Mudança de requisito, escopo ou decisão no `PRD.md`, ou no comportamento
do guia, deve ser proposta ao usuário antes de ser feita.

### Dúvidas sobre o AI-DLC

Sempre que não tiver confiança para validar ou responder algo sobre o AI-DLC, pesquise
na documentação oficial, em <https://github.com/awslabs/aidlc-workflows>, antes de
responder. Não responda de memória nem por suposição. Cite o arquivo consultado na
resposta e diga se a dúvida continuar sem resposta. Se a documentação divergir do
framework instalado em `.claude/`, informe a divergência ao usuário e registre-a em
`FEEDBACK-AIDLC.md`.