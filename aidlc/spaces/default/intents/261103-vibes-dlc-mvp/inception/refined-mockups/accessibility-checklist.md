# Lista de acessibilidade: MVP do Vibes DLC

**Meta:** manter o que o protótipo já tem, sem meta formal de WCAG (RM Q5 em `ideation/rough-mockups/rough-mockups-questions.md`, NFR10 em `inception/requirements-analysis/requirements.md`). Esta lista transforma isso em itens verificáveis nas telas de `mockups.md`, com base em `inception/user-stories/stories.md`.

## Verificar em cada tela

- [ ] `lang="pt-BR"` no documento.
- [ ] Um link "Pular para o conteúdo" é o primeiro item do teclado.
- [ ] Todas as ações funcionam só com o teclado, na ordem visual.
- [ ] O foco fica visível, com contorno de 2 pixels.
- [ ] Nenhum estado depende só de cor: a trilha, os avisos e as etapas têm ícone ou texto.
- [ ] Os títulos seguem a ordem, com h1 no título da tela e h2 na instrução ou seção.
- [ ] As regiões `header`, `nav`, `main` e o `section` do terminal estão presentes.
- [ ] As artes têm texto alternativo. As decorativas têm `alt=""` ou `aria-hidden`.
- [ ] Com `prefers-reduced-motion`, animações e vídeos param.
- [ ] O layout continua utilizável com 200% de zoom.

## Verificar por componente

| Componente | Item |
|---|---|
| Instrução do momento | `role="status"`, anunciada ao mudar de momento |
| Cartão de comando | Campo com `label` visível; motivo de bloqueio em `aria-describedby`; Enter não envia |
| Faixa de aviso | `role="status"`, sem roubar o foco e sem repetir o anúncio a cada minuto |
| Alerta de exposição | `role="alert"`, sem receber foco |
| Barra de progresso | `role="img"` com `aria-label`, como "Passo 2 de 5" |
| Abas | `role="tablist"`, com `aria-selected` |
| Trilha | `nav` com `aria-label`, e `aria-current="step"` na atual |
| Opções de nível | `aria-pressed`, ou `radio` nativo |
| Terminal | `aria-label`, modo de leitor de tela do xterm e uma forma informada de sair com o teclado |
| Recolher terminal | `aria-expanded` e rótulo |
| Personalização | Avisos de erro e contraste em `role="alert"`; campos com `label` |

## Contraste

| Par | Valor aproximado | Situação |
|---|---|---|
| `#222222` sobre `#FFFFFF` | 15,9:1 | Atende |
| `#6A6A6A` sobre `#FFFFFF` | 5,4:1 | Atende |
| `#04694A` sobre `#FFFFFF` | 6,7:1 | Atende |
| `#FFFFFF` sobre `#C13515` | 5,5:1 | Atende |
| `#CCCCCC` sobre `#000000` | 13,1:1 | Atende |
| `#FFFFFF` sobre `#FF385C` | 3,5:1 | Risco aceito no `PRD.md` |
| `#FF385C` sobre `#FFFFFF` no título | 3,5:1 | Atende o mínimo de 3:1 para título, conforme `TDD.md` |

Os valores foram calculados pela fórmula de luminância da WCAG. O `PRD.md` e o `TDD.md` citam cerca de 3,3:1 para o botão principal, e o cálculo dá 3,52:1. A conclusão não muda, porque continua abaixo de 4,5:1. As cores personalizadas seguem o aviso de FR10.6.

## Como testar

- **Automático:** verificação com axe no Playwright, nas telas principais, sem bloquear por itens fora da meta.
- **Teclado:** percorrer a jornada da primeira fatia sem mouse.
- **Leitor de tela:** conferência com NVDA nas telas Início, Guia e Terminal.
- **Pessoa nova:** o teste de CP2 observa se a instrução basta.

## Fora da meta

- Conformidade formal com WCAG 2.1 AA.
- Contraste do botão principal padrão.
- O que a CLI de IA desenha no terminal, que é da própria CLI.
- Legendas nos vídeos, porque eles não têm som.

## Assumptions & Open Questions

- [assumption] "Pular para o conteúdo" e o foco de 2 pixels são acréscimos de baixo custo, coerentes com a navegação por teclado do protótipo.
- [open] O uso real do terminal com leitor de tela depende de cada CLI, e não é verificado no MVP.
