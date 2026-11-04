# Requisitos não funcionais de U3: confirmação

Os requisitos e o design de U3 já definem as metas, e a stack é a de U1, então não há pergunta aberta. O resumo abaixo reúne o que vou assumir.

## Consolidated Summary Confirmation

- **Desempenho:** o Início abre em até 2 segundos com 20 demandas, mesmo com um `audit/` grande na ativa. Nas não ativas, lê só o `aidlc-state.md`. Decisões mostra no máximo 500 linhas. A sugestão de nível é instantânea e não usa rede.
- **Segurança:** o comando de ativação é montado no servidor, com o nome da demanda validado, e o de nova demanda vem da tela, editável, com a forma validada no servidor. Texto vindo do `audit/` e notas aparecem só como texto. Rotas novas com `isRequestAllowed` e Zod.
- **Escala:** até 20 demandas e 500 notas por demanda, sem limite imposto. As notas têm no máximo 4000 caracteres.
- **Confiabilidade:** uma demanda ilegível não afeta as demais. A migração `0003_u3.sql` só avança, com cópia prévia, e as linhas antigas ficam com `kind` igual a `stage`.
- **Observabilidade:** o `logger` de U1, sem descrições, notas nem texto de decisões.
- **Tecnologia:** a stack de U1, sem dependência nova.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
