# Design de confiabilidade: u2-guide-flow

Base: `nfr-requirements/reliability-requirements.md` de U2 e `functional-design/functional-spec.md`.

| Falha | Efeito | O que continua funcionando |
|---|---|---|
| Entrada ruim no `audit/` (NFR1.5) | É ignorada | O restante do registro |
| `audit/` ilegível | A posição volta ao `aidlc-state.md` | O guia, com a etapa do estado |
| Comando de perguntas falhou ou demorou (NFR1.6) | `unavailable` e instrução genérica | Todos os outros momentos |
| Artefato sumiu durante a revisão | A lista é relida, com aviso | O restante da revisão |
| Conteúdo mudou ao marcar como revisado | 409 `artifact_changed`, com o novo conteúdo | A revisão dos demais |
| Falha ao gravar a revisão | Erro na própria linha, e nada é marcado | O guia |

## Migração (NFR12.2)

`0002_u2.sql` segue o executor de U1, com a cópia prévia e uma transação por migração. A migração só cria tabelas novas, então os dados de U1 ficam intactos.

## Plataforma e qualidade

- **NFR9.1:** a prova usa o Edge, e a conferência final usa o Chrome, no Windows com Git Bash.
- **NFR8.1:** os textos novos ficam em `guide`, em português, com `Approve` e `Request Changes` no original.
- **NFR10.1:** a trilha e Revisar usam elementos nativos, com estado em texto ou ícone.
- **NFR11.1:** o comando local único confere o mínimo de 80% de cobertura de linhas.
