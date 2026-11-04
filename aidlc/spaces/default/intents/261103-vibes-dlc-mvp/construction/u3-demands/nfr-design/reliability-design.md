# Design de confiabilidade: u3-demands

Base: `nfr-requirements/reliability-requirements.md` de U3 e `functional-design/functional-spec.md`.

| Falha | Efeito | O que continua funcionando |
|---|---|---|
| Registro ilegível (NFR1.5) | Aviso na própria linha | As outras demandas |
| `intents.json` ausente ou malformado (NFR1.5) | A lista vem das pastas | O Início |
| `unit-of-work.md` ausente ou ilegível (NFR1.6) | A aba diz qual é o arquivo e o que fazer | As outras abas |
| Falha ao gravar uma nota | Erro na própria área, com o texto preservado | A aba |
| Envio com falha | `failed`, como em U1, com o comando ainda na tela | O passo atual |
| IA não cria a demanda | A espera continua, com a instrução de conferir o terminal | O terminal e o Início |

## Migração (NFR12.2)

`0003_u3.sql` segue o executor de U1, com cópia prévia e uma transação. Ela cria `artifact_note` e acrescenta `kind` a `sent_command`, com `NOT NULL DEFAULT 'stage'`, então as linhas antigas ficam corretas sem reescrita.

## Plataforma e qualidade

- **NFR9.1:** a prova usa o Edge, no Windows com Git Bash. A conferência no Chrome fica para o fim do MVP.
- **NFR8.1:** os textos novos ficam em `guide`, em português, com os comandos no original.
- **NFR10.1:** o Início, os três passos e as abas usam elementos nativos, com o estado em texto ou ícone.
- **NFR11.1:** `npm run verify` confere o mínimo de 80% de cobertura de linhas.
