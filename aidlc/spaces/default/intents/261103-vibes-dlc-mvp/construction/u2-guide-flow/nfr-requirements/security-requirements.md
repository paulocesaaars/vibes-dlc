# Segurança: u2-guide-flow

U2 traz duas superfícies novas: um comando externo rodado pelo produto e a leitura de arquivos escolhidos pela interface. Os arquivos do registro podem vir de um commit de outra pessoa, então o conteúdo deles é dado não confiável.

| ID | Requisito | Verificação |
|---|---|---|
| NFR4.1 | As rotas novas (`artifacts`, `artifacts/review`, `seen` e `trail`) passam por `isRequestAllowed` e por validação com Zod (BR9.1) | O teste que percorre todas as rotas, de U1, inclui as novas |
| NFR5.1 | Artefatos são mostrados como texto, sem HTML, scripts nem recursos externos (BR4.2) | Teste de interface com uma etiqueta de script e uma imagem externa |
| NFR5.2 | O comando de perguntas usa `--stage` e, na Construção, `--unit`. Etapa e Unidade só passam se seguirem o padrão `^[a-z0-9][a-z0-9-]*$`, inclusive os valores vindos do `audit/`, e nenhum outro texto de arquivo vira argumento (BR2.3) | Teste com caracteres de shell e com valor iniciado em `-`, que viram `unavailable` sem executar nada. Um teste no Windows roda o comando real |
| NFR5.3 | O texto das perguntas não é mostrado, e o guia usa só a contagem | Teste com uma pergunta contendo uma instrução |
| NFR5.4 | A leitura de artefatos só aceita caminhos dentro do registro do intent, resolvendo `..` e links, até 2 MB (BR4.3) | Teste com `..`, caminho absoluto e arquivo grande |
| NFR6.1 | O produto continua sem chamadas de rede. A prova cobre o navegador e o servidor, e o comando de perguntas é uma ferramenta externa, que a prova não intercepta | Prova de U2 registra as requisições do navegador e do servidor. O comando é tratado como risco aceito |
| NFR7.1 | O produto escreve só em `.vibes/`, inclusive nas novas tabelas, e nunca em `aidlc/`. O comando de perguntas também não pode mudar `aidlc/` | Prova de U2 confere o `git status` e as datas de `aidlc/` da cópia de teste antes e depois do comando |

## Riscos aceitos

- O produto executa o `aidlc` de `VIBES_AIDLC` ou do `PATH` da pessoa, que é a mesma ferramenta que ela já usa no terminal. O produto não confere o que essa ferramenta faz em rede. Se o comando não existir, o guia usa a instrução genérica.
- O hash de revisão confere o conteúdo, não a autoria. Marcar como revisado é uma anotação do guia e não aprova nada no AI-DLC.
