# Especificação de interações: MVP do Vibes DLC

Base: `mockups.md`, `ideation/rough-mockups/user-flow.md`, `inception/user-stories/stories.md` e `inception/requirements-analysis/requirements.md`. As animações e os estados visuais comuns seguem o protótipo `design/prototipo/Main.dc.html`.

## Momentos do guia

O guia é uma máquina de estados. Cada momento vem de um sinal, com a seguinte regra de prioridade, de cima para baixo. A primeira condição verdadeira vale.

| Ordem | Condição | Momento | Vez de | Ação principal |
|---|---|---|---|---|
| 1 | Sem AI-DLC, registro ativo ilegível ou sem Git Bash | Falha | Pessoa | Tentar de novo |
| 2 | Demanda aberta não é a ativa | Consulta, com a faixa | Pessoa | Tornar esta demanda ativa |
| 3 | Sessão do terminal encerrada | Sessão encerrada | Pessoa | Nova sessão |
| 4 | Etapa `[x]` com `GATE_APPROVED` | Conclusão | Guia | Ir para a próxima etapa |
| 5 | Etapa `[?]` com artefato não revisado | Revisar | Pessoa | Marcar como revisado |
| 6 | Etapa `[?]` com tudo revisado, ou sem artefatos | Aprovar | Pessoa | Nenhuma: resposta no terminal |
| 7 | `[R]` ou `GATE_REJECTED` | Acompanhar, em revisão | IA | Nenhuma |
| 8 | Pergunta na lista `open` | Pergunta | Pessoa | Nenhuma: resposta no terminal |
| 9 | `[-]` com comando enviado ou arquivos surgindo | Acompanhar | IA | Nenhuma, ou Retomar com a faixa |
| 10 | Comando colado sem sinal nos arquivos | Colado | Pessoa | Nenhuma: pressionar Enter |
| 11 | Etapa atual, com "Entendi" já dado | Enviar | Pessoa | Enviar agora |
| 12 | Etapa atual | Entender | Pessoa | Entendi, continuar |

- **Mudança de momento:** vem de uma mudança nos arquivos, em até 3 segundos (NFR1), ou de uma ação da pessoa.
- **Reabrir o painel:** o guia recalcula o momento pelos arquivos e mostra um aviso do que mudou, com Entendi.
- **Trocar de aba:** não muda o momento. O botão Voltar ao guia retorna a ele.
- **Demanda ativa muda com o painel aberto:** o guia lê `active-intent` de novo, troca a faixa e o estado de envio em até 3 segundos, sem recarregar. Um cartão de confirmação aberto é fechado, com o aviso "A demanda ativa mudou. Confira antes de enviar.", e o texto digitado volta a aparecer ao reabrir.

## Padrões de interação

| Padrão | Onde | Regra |
|---|---|---|
| Assistente em passos | Nova demanda | Uma pergunta por vez. Voltar mantém o que foi digitado. Cancelar volta ao Início, sem confirmação, porque nada foi enviado |
| Confirmação em cartão | Enviar, retomar, tornar ativa, pedir análise | Sem modal. O comando é editável. Nada vai ao terminal antes do clique |
| Revelação gradual | Ver os outros níveis | A lista completa abre na mesma tela |
| Validação | Descrição, mídia, cor | A descrição vazia desativa Continuar, com o motivo visível. Mídia e cor mostram o motivo na hora |
| Confirmação de risco | Restaurar tudo, encerrar sessão | Pede confirmação na própria linha, nomeando o efeito |
| Aviso passageiro | Salvo, copiado | Fica 3 segundos em `aria-live="polite"`, sem levar o foco |

## Componentes

### Cartão de comando

| Campo | Valor |
|---|---|
| Component | `CommandCard` |
| Description | Mostra, permite editar e envia um comando ao terminal |
| Category | input |

| State | Description | Trigger |
|---|---|---|
| default | Comando editável, lembrete e dois botões | Momento Enviar |
| focus | Contorno de 2 pixels no campo ou no botão | Teclado |
| disabled | Envio desativado, com o motivo | Sessão encerrada ou demanda não ativa |
| loading | Botões desativados até o servidor confirmar | Depois do clique |
| error | "Não consegui enviar ao terminal." O texto continua no campo | Falha na rota |
| reference | Sem campo nem botões de envio, com Copiar | Outra CLI |

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `command` | string | yes | — | Texto inicial do comando |
| `mode` | `send` \| `reference` | no | `send` | Vem da escolha em "Sua IA" |
| `disabledReason` | string | no | — | Motivo do bloqueio |
| `onSend` | function | yes | — | Recebe o texto e o modo: executar ou colar |

| Breakpoint | Behaviour |
|---|---|
| A partir de 1180 pixels | Botões na faixa inferior, à direita |
| Abaixo de 1180 pixels | Mesma ordem, com quebra de linha |

| Requirement | Implementation |
|---|---|
| ARIA role | `textarea` com `label` visível; botões nativos |
| Keyboard interaction | Tab percorre campo, Colar e Enviar. Enter no campo quebra a linha e não envia |
| Label / aria-label | "Comando que vai para a sua IA" |
| Contrast ratio | Texto em 4,5:1. O botão principal segue o risco aceito no `PRD.md` |
| Screen reader | O motivo de bloqueio fica ligado por `aria-describedby` |
| Focus management | Depois de enviar, o foco vai à instrução do momento seguinte |

```
<CommandCard command="/aidlc --stage user-stories" mode="send" onSend={send} />
```

**Regra de envio:** o clique desativa os botões na hora, e o servidor rejeita um segundo envio com o mesmo identificador (AC3.4.4).

### Faixa de aviso

| Campo | Valor |
|---|---|
| Component | `NoticeBand` |
| Description | Aviso persistente dentro de uma tela, com uma ação opcional |
| Category | feedback |

| State | Description | Trigger |
|---|---|---|
| idle-warning | IA pode ter parado, com os minutos sem novidade | 10 minutos sem mudança |
| not-active | Esta não é a demanda ativa | Demanda aberta difere de `active-intent` |
| changed | O que mudou com o painel fechado | Reabrir o painel |

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `variant` | `idle` \| `notActive` \| `changed` | yes | — | Define texto e ícone |
| `action` | object | no | — | Rótulo e ação do botão |

| Breakpoint | Behaviour |
|---|---|
| Todos | Largura do conteúdo. O botão desce para baixo do texto em colunas estreitas |

| Requirement | Implementation |
|---|---|
| ARIA role | `role="status"` |
| Keyboard interaction | O botão entra na ordem normal de Tab |
| Label / aria-label | O próprio texto |
| Contrast ratio | 4,5:1, com ícone além da cor |
| Screen reader | Anuncia uma vez ao surgir. Os minutos só são reanunciados se o valor mudar de faixa, para não repetir |
| Focus management | Não rouba o foco |

**IA parada:** a contagem vem da data de modificação mais recente em `<record>/`. O texto mostra os minutos, atualizados a cada minuto. Mudou um arquivo, a faixa some. A faixa nunca reabre o terminal sozinha.

### Terminal

| Campo | Valor |
|---|---|
| Component | `TerminalPane` |
| Description | Terminal real, com barra de título e recolhimento |
| Category | layout |

| State | Description | Trigger |
|---|---|---|
| open | Terminal visível | Padrão |
| collapsed | Faixa de 48 pixels com o nome Terminal | Recolher |
| reconnecting | Mostra as últimas linhas e reconecta | Recarregar a página |
| dead | Sem sessão, com Nova sessão | Encerrar sessão, ou servidor reiniciado |
| unavailable | Sem Git Bash | Falha no início |

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `sessionId` | string | no | — | Sessão no servidor |
| `collapsed` | boolean | no | false | Estado da faixa |

| Breakpoint | Behaviour |
|---|---|
| A partir de 1180 pixels | Lateral direita, de cima a baixo |
| Abaixo de 1180 pixels | Embaixo do guia, com altura mínima de 320 pixels |

| Requirement | Implementation |
|---|---|
| ARIA role | `section` com `aria-label="Terminal integrado"`; recolher usa `aria-expanded` |
| Keyboard interaction | O xterm captura o teclado. Shift+Tab sai para o guia, e o atalho é informado na barra |
| Label / aria-label | "Terminal integrado" |
| Contrast ratio | Tema do Git Bash: `#CCCCCC` sobre `#000000` |
| Screen reader | Modo de leitor de tela do xterm ligado por padrão |
| Focus management | Reabrir por envio não move o foco para o terminal |

**Reabrir sozinho:** ao enviar um comando, e quando há pergunta registrada ou aprovação pendente. Não reabre com a faixa de IA parada nem com a instrução genérica.

### Etapa na trilha

| Campo | Valor |
|---|---|
| Component | `StageRail` |
| Description | Lista as etapas por fase, com a situação de cada uma |
| Category | navigation |

| State | Description | Trigger |
|---|---|---|
| done | Concluída, com ícone de visto | `[x]` |
| current | Atual, com o texto "Você está aqui" | `[-]`, `[?]` ou `[R]` |
| blocked | Bloqueada, sem ação | Etapa futura |
| skipped | Pulada, com tracejado e riscado | `SKIP` no plano |

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `phases` | array | yes | — | Fases e etapas lidas do AI-DLC |
| `onOpen` | function | yes | — | Abre uma etapa concluída ou a atual |

| Breakpoint | Behaviour |
|---|---|
| A partir de 1180 pixels | Coluna à esquerda do guia |
| Abaixo de 1180 pixels | Acima do guia, com as fases recolhidas |

| Requirement | Implementation |
|---|---|
| ARIA role | `nav` com `aria-label="Trilha de etapas"` |
| Keyboard interaction | Enter abre a etapa. Bloqueadas ficam `disabled` |
| Label / aria-label | Nome da etapa e situação |
| Contrast ratio | 4,5:1 no texto, com ícone além da cor |
| Screen reader | `aria-current="step"` na atual |
| Focus management | Ao abrir uma etapa, o foco vai ao título dela |

## Responsividade

- **A partir de 1180 pixels:** duas colunas, com a trilha dentro do guia.
- **Abaixo de 1180 pixels:** uma coluna, na ordem guia e terminal.
- **Celular:** não é foco do MVP (RM Q4). A tela não quebra, mas o uso não é verificado.

## Movimento

- Entradas e barras seguem o protótipo, com `transform` e `opacity`.
- `prefers-reduced-motion: reduce` desliga animações e transições, e o vídeo das artes para no primeiro quadro.
- Os vídeos têm texto alternativo e não têm som.

## Assumptions & Open Questions

- [assumption] Fechar o cartão quando a demanda ativa muda evita enviar à demanda errada, e o texto digitado é preservado.
- [assumption] O modo de leitor de tela do xterm é suficiente para o MVP, sem meta formal de acessibilidade.
- [open] A sequência exata de tecla para sair do terminal depende do comportamento das CLIs, e é validada na primeira fatia.
