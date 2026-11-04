# Design de segurança: u3-demands

Base: `nfr-requirements/security-requirements.md` e `nfr-requirements/tech-stack-decisions.md` de U3, `functional-design/functional-spec.md` e `inception/contract-design/contract-summary.md`.

## Comandos (NFR4.2, NFR4.3, NFR4.4)

| Rota | Origem do texto | Validação | `kind` |
|---|---|---|---|
| `/api/demands/new/command` | Tela, editável | Uma linha, até 8000 caracteres, sem caracteres de controle, sessão viva e `claude_code` | `new_demand` ou `analysis`, escolhido por um campo validado e gravado pelo servidor |
| `/api/demands/{intentId}/activate` | Servidor, a partir do nome validado | `isSafeName` no nome, demanda existente e diferente da ativa, sessão viva e `claude_code` | `activate` |
| `/api/commands` | Tela, editável, como em U1 | As de U1 e U2 | `stage`, sempre |

As três rotas exigem `commandId` novo, gravam `pending` antes de escrever e seguem `written` e `failed`, como em U1. Uma função comum faz esse envio e valida o texto, com uma linha só, até 8000 caracteres e sem caracteres de controle, nas três rotas, porque um Ctrl-O invisível poderia executar um comando colado. Há um teste em cada rota. `lastWritten` filtra por `kind` igual a `stage`, então os comandos desta Unidade nunca mudam o momento de uma etapa.

## Dados não confiáveis (NFR5.1, NFR5.2, NFR5.3)

- Títulos de demanda, textos do `audit/`, notas e descrições aparecem como texto comum, sem HTML.
- `listDemands` ignora pastas que não passem por `isSafeName`. Antes de ler, confere cada pasta com `realpath` dentro de `intents/`, como `resolveArtifactPath` faz em U2, e um teste cobre isso com uma junção de diretório.
- A rota de notas valida o caminho com `resolveArtifactPath`, de U2, e grava só em `artifact_note`. O arquivo nunca é aberto para escrita.

## Rede e escrita (NFR4.1, NFR6.1, NFR7.1)

As rotas novas chamam `isRequestAllowed` e validam a entrada com Zod, e o teste que percorre os `route.ts` passa a cobri-las. `src/triage` é uma função pura, sem importar nada de rede. O produto nunca escreve em `active-intent`: tornar ativa é feito pela CLI, depois da confirmação. A prova confere o `git status`, o cursor e as datas de `aidlc/` da cópia de teste.

## Riscos aceitos

Os riscos de `nfr-requirements/security-requirements.md` continuam: a descrição dentro de um comando pode ter `$` e crases, que a pessoa vê antes de confirmar, e as notas ficam em texto puro em `.vibes/`.
