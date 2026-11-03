# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER enviar comando ao terminal sem confirmação explícita do usuário, inclusive texto vindo de artefatos. (`PRD.md`, Regras de negócio; `TDD.md`, Configuração e segurança) (affirmed 2026-11-03)

- NEVER interpretar a saída do terminal para saber o andamento. (`TDD.md`, Arquitetura) (affirmed 2026-11-03)

- NEVER colocar botão de aprovar no produto, nem impedir ou substituir o gate do AI-DLC. (`PRD.md`, requisito 6 e Regras de negócio) (affirmed 2026-11-03)

- NEVER oferecer o comando da etapa seguinte antes que o AI-DLC registre a etapa atual como aprovada. (`PRD.md`, Regras de negócio) (affirmed 2026-11-03)

- NEVER fazer chamadas de rede a partir do produto, nem para fontes; a rede é usada apenas pela CLI de IA dentro do terminal. (`TDD.md`, Interfaces) (affirmed 2026-11-03)

- NEVER chamar APIs de modelos nem manter chaves de IA no produto. (`PRD.md`, Escopo) (affirmed 2026-11-03)

- NEVER depender de banco, fila ou serviço externo que precise ser instalado à parte. (`PRD.md`, requisito 9 e Suposições) (affirmed 2026-11-03)

- NEVER escrever nos arquivos versionados do repositório a partir do produto; ele escreve só em `.vibes/`. (`TDD.md`, Configuração e segurança) (affirmed 2026-11-03)

- NEVER cair para PowerShell ou `cmd` quando o Git Bash não estiver disponível. (`TDD.md`, Terminal) (affirmed 2026-11-03)

- NEVER aceitar SVG como mídia enviada pelo usuário. (`TDD.md`, Personalização) (affirmed 2026-11-03)

- NEVER editar à mão `aidlc-state.md`, `audit/` nem os diários de etapa. (`CLAUDE.md`) (affirmed 2026-11-03)

- NEVER responder ou aprovar um gate para coletar um sinal, nem adiar um gate por causa do registro em `FEEDBACK-AIDLC.md`. (`CLAUDE.md`) (affirmed 2026-11-03)

- NEVER copiar segredos, tokens ou dados pessoais para `FEEDBACK-AIDLC.md`. (`CLAUDE.md`) (affirmed 2026-11-03)

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS escrever em português (Brasil) explicações, comentários, docstrings, logs, mensagens de erro e textos exibidos ao usuário. (`CLAUDE.md`) (affirmed 2026-11-03)

- ALWAYS usar inglês em nomes de variáveis, funções, classes, módulos, tabelas e ferramentas. (`CLAUDE.md`) (affirmed 2026-11-03)

- ALWAYS manter a interface em português (Brasil), deixando no original apenas os comandos do AI-DLC, os caminhos de arquivo e o que a CLI de IA imprime. (`PRD.md`, requisito 17) (affirmed 2026-11-03)

- ALWAYS escrever os textos do guia de forma genérica quanto à IA, como "a sua IA", sem citar uma ferramenta específica. (`PRD.md`, requisito 16) (affirmed 2026-11-03)

- ALWAYS usar os arquivos do AI-DLC como fonte da verdade do andamento. (`TDD.md`, Arquitetura) (affirmed 2026-11-03)

- ALWAYS escutar em `127.0.0.1` por padrão e, se `VIBES_HOST` apontar para outro endereço, registrar um aviso claro e mostrar um alerta permanente na interface. (`TDD.md`, Configuração e segurança) (affirmed 2026-11-03)

- ALWAYS rejeitar, nas rotas do terminal e de personalização, requisições cujo `Origin` ou `Host` não seja o do próprio app. (`TDD.md`, Configuração e segurança) (affirmed 2026-11-03)

- ALWAYS exibir os artefatos como texto, sem executar HTML nem scripts. (`TDD.md`, Configuração e segurança) (affirmed 2026-11-03)

- ALWAYS usar o Git Bash como shell no Windows, na ordem `VIBES_SHELL` e depois o `bash.exe` da instalação do Git. (`PRD.md`, requisito 2; `TDD.md`, Terminal) (affirmed 2026-11-03)

- ALWAYS manter a instalação em Node.js, `npm install` e a execução do Next, além do Git Bash no Windows. (`PRD.md`, requisito 9) (affirmed 2026-11-03)

- ALWAYS registrar em `FEEDBACK-AIDLC.md` o que for aprendido ao trabalhar com o AI-DLC neste repositório, seguindo o formato do arquivo. (`CLAUDE.md`) (affirmed 2026-11-03)

- ALWAYS propor ao usuário, antes de fazer, qualquer mudança de requisito, escopo ou decisão no `PRD.md`, ou no comportamento do guia. (`CLAUDE.md`) (affirmed 2026-11-03)

- ALWAYS pesquisar a documentação oficial em <https://github.com/awslabs/aidlc-workflows> quando não houver confiança para responder sobre o AI-DLC, citar o arquivo consultado e informar qualquer divergência em relação ao framework instalado. (`CLAUDE.md`) (affirmed 2026-11-03)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
