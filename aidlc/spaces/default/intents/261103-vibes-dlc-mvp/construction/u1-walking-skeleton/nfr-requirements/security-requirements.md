# Segurança: u1-walking-skeleton

Base: `inception/requirements-analysis/requirements.md`, `inception/contract-design/contract-summary.md`, `functional-design/rules.md` e as regras de `project.md`.

## O que é protegido

O terminal é o ativo mais sensível: quem escreve nele executa comandos com as permissões da pessoa. O produto não tem login, porque escuta só na própria máquina. Por isso, o risco principal é uma página aberta no navegador tentar acionar as rotas locais.

## Requisitos

| ID | Requisito | Verificação |
|---|---|---|
| NFR3.1 | Por padrão, o servidor escuta só em `127.0.0.1` (BR1.1) | Teste de integração confere o endereço de escuta |
| NFR3.2 | Com `VIBES_HOST` em outro endereço, registra um aviso e mostra um alerta permanente em todas as telas (BR1.2) | Teste de interface inicia com outro endereço e confere o alerta |
| NFR4.1 | Toda rota de U1 que escreve ou abre o terminal rejeita `Origin` ou `Host` de fora com 403, sem efeito (BR2.1): `session`, `input`, `resize`, `commands` e `understood` | Teste de integração por rota, mais o passo 6 da prova |
| NFR4.2 | O stream do terminal também rejeita `Origin` e `Host` de fora, porque expõe a saída | Teste de integração |
| NFR5.1 | A saída do terminal é interpretada só pelo terminal, e os textos dos arquivos do AI-DLC são mostrados como texto, sem HTML nem scripts | Teste de interface com texto contendo uma etiqueta de script |
| NFR6.1 | O produto não faz chamadas de rede, e as fontes vêm do pacote (BR2.2) | Prova da fatia registra as requisições do navegador e só aceita a origem do app |
| NFR7.1 | O produto escreve só em `.vibes/` (BR2.3), que fica no `.gitignore` deste repositório | Teste confere `git status` depois da prova, sem mudança de arquivos versionados pelo produto |
| NFR13.1 | Nenhuma chave de IA nem saída do terminal é gravada no banco ou nos logs (BR2.4). A exceção é o texto que a pessoa confirma, descrito em NFR13.2 | Teste procura um marcador da saída em `.vibes/` depois da prova |
| NFR13.2 | O texto confirmado fica em `sent_command`, sem prazo de remoção no MVP, para alimentar o Histórico. Os logs não o incluem, porque a pessoa pode digitar um segredo | Teste de logs com um marcador no comando |

## Envio ao terminal

| ID | Requisito | Verificação |
|---|---|---|
| NFR4.6 | `Host` e `Origin` aceitos: `127.0.0.1` e `localhost`, na porta configurada, e o valor de `VIBES_HOST` quando definido. `Host` ausente é rejeitado. `Origin` ausente é aceito só em `GET` do stream, e os `POST` exigem `Origin` | Teste de integração com cada combinação |
| NFR4.7 | `input` aceita até 64 KB por requisição, e `resize` aceita de 1 a 500 colunas e de 1 a 200 linhas | Teste de integração com valores fora da faixa |
| NFR4.3 | Sem um `commandId` novo gerado pelo clique de confirmação, nada é escrito (BR5.1, BR5.3) | Teste de integração e passo 3 da prova |
| NFR4.4 | A rota relê a demanda e só escreve com `canSend` verdadeiro (BR5.7) | Teste de integração para cada motivo de bloqueio |
| NFR4.5 | A entrada das rotas é validada com Zod, e o texto do comando tem no máximo 8000 caracteres, sem quebra de linha (BR5.5) | Teste de integração com entrada malformada |

## Riscos aceitos

- Sem login: qualquer programa local pode chamar as rotas sem `Origin`. A checagem de `Host` não impede isso. O produto roda na máquina da própria pessoa, e esse programa já teria as mesmas permissões.
- A linha `/api/terminal/input` envia ao shell o que a pessoa digita, por ser um terminal real. A confirmação vale para os comandos oferecidos pelo guia, não para a digitação.
- Com `VIBES_HOST` fora de `127.0.0.1`, a proteção depende da rede da pessoa, e o alerta permanente deixa isso claro.
