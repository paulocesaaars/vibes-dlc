<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-11-04T01:55:00Z — u4-customization: nenhuma pergunta aberta, porque requisitos, protótipo e contratos já respondem. As escolhas de projeto (mudança gravada na hora com retrato da visita, Restaurar tudo sem mexer em Sua IA, 16 momentos personalizáveis) ficaram como suposições no functional-spec.
- 2026-11-04T01:55:00Z — u4-customization: o ciclo Db↔Customization foi resolvido com um repositório de texto puro em db (BR7.3), seguindo C3, em vez de inverter a dependência com uma porta.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-11-04T01:55:00Z — u4-customization: a lista de momentos do protótipo (18) difere da do Core (13 momentos mais telas). Ficou a lista real de 16, sem syncing, nocli e done, que não existem no código.
- 2026-11-04T01:55:00Z — u4-customization: nenhum critério de stories.md cobre as frases (FR10.1), então BR2.1 entra em traceability.json como regra sem critério.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-11-04T01:55:00Z — u4-customization: gravar na hora e desfazer pelo retrato (como o protótipo) em vez de rascunho gravado só em Concluir. Custa um estado de visita no servidor e a limpeza de arquivos órfãos, mas a prévia e a validação de mídia acontecem ao enviar, como pedem AC7.1.1 e AC7.1.2.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-11-04T01:55:00Z — u4-customization: o Next.js impõe limite de corpo às rotas sem proxy? Conferir na geração de código (C4).
- 2026-11-04T01:55:00Z — u4-customization: detecção de assinatura de MP4 e WebM sem biblioteca, decisão para o NFR Requirements.
