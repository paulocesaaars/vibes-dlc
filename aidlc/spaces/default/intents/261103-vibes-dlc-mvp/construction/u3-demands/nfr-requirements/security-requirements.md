# Segurança: u3-demands

U3 acrescenta comandos sem etapa e a leitura de vários registros, que podem vir de commits de outras pessoas. A descrição é escrita pela própria pessoa, e os nomes de pasta e os textos do `audit/` são dados não confiáveis.

| ID | Requisito | Verificação |
|---|---|---|
| NFR4.1 | As rotas novas passam por `isRequestAllowed` e por validação com Zod (BR7.1) | O teste que percorre todas as rotas inclui as novas |
| NFR4.2 | A rota de ativação monta o comando no servidor, a partir de um nome de pasta validado, e só aceita a demanda alvo no momento `not_active`. O cliente não envia o texto (BR5.3) | Teste com nome inseguro e com a demanda já ativa |
| NFR4.3 | Nenhum comando vai ao terminal sem o `commandId` gerado pela confirmação, inclusive os de nova demanda e análise (BR2.1, BR3.1). Nesses dois, o texto vem da tela, porque a pessoa pode editá-lo. A rota exige uma linha só, até 8000 caracteres, sem caracteres de controle, e define `kind` no servidor, nunca a partir do cliente | Teste de integração com cada caso e prova |
| NFR4.4 | Só linhas com `kind` igual a `stage` alimentam `commandSent` (BR3.1) | Teste do `Db` e do cálculo |
| NFR5.1 | Texto do `audit/`, títulos de demanda, notas e descrições aparecem como texto, sem HTML nem scripts | Teste de interface com uma etiqueta de script em cada um |
| NFR5.2 | Nomes de pasta inseguros em `intents/` ficam fora da lista (BR4.3) | Teste com `..` e caracteres de shell |
| NFR5.3 | A nota só aceita um caminho de artefato resolvido dentro do registro, e o arquivo nunca muda (BR6.2) | Teste com caminho de fora, conferindo o hash do arquivo |
| NFR6.1 | A sugestão de nível não usa rede nem modelo de IA (BR1.2) | Prova registra as requisições durante a sugestão |
| NFR7.1 | O produto escreve só em `.vibes/`, nunca em `active-intent`. Tornar ativa é feito pela CLI, no terminal | Prova confere o `git status`, o cursor e as datas dos arquivos em `aidlc/` da cópia de teste |

## Riscos aceitos

- A descrição vai dentro de um comando no terminal, e o shell pode interpretar caracteres como `$` e crases dentro de aspas duplas. A CLI de IA é quem recebe o texto, depois da confirmação, e a pessoa vê o comando antes. Como o terminal é um shell real, o texto também pode ser editado pela pessoa, como em U1.
- Uma nota fica em texto puro em `.vibes/`, que o Git ignora.
