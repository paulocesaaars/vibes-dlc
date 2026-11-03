# Mapa do sistema de design: MVP do Vibes DLC

O projeto não usa uma biblioteca de componentes. A fonte é o protótipo `design/prototipo/Main.dc.html`, com as cores de `TDD.md` e `PRD.md`. Base também em `mockups.md`, `inception/user-stories/stories.md` e `inception/requirements-analysis/requirements.md`.

## Tokens de cor

Variáveis CSS na raiz da aplicação. A coluna "Personalizável" corresponde às cores da tela Personalizar.

| Token | Valor | Uso | Personalizável |
|---|---|---|---|
| `--brand` | `#FF385C` | Fundo do logo e nome Vibes DLC | Logo e título |
| `--green`, `--furDark` | `#FF385C` | Botões, progresso e destaques | Cor principal |
| `--green2`, `--greenText` | `#E00B41` | Ao passar o mouse e texto de destaque | Derivada da principal |
| `--leaf` | `#FFD1DA` | Fundo suave de destaque | Derivada da principal |
| `--onAccent` | `#FFFFFF` | Texto sobre a cor principal | Derivada por contraste |
| `--ink`, `--night`, `--blue`, `--blueText` | `#222222` | Títulos e texto principal | Texto |
| `--gray` | `#6A6A6A` | Rótulos e descrições | Texto de apoio |
| `--paper` | `#FFFFFF` | Página e cartões | Fundo |
| `--wash`, `--mint`, `--furLight` | `#F7F7F7`, `#F2F2F2`, `#F2F2F2` | Áreas leves e fase atual | Preenchimentos |
| `--line`, `--faded` | `#DDDDDD` | Linhas e divisórias | Bordas |
| `--ok` | `#04694A` | Etapas concluídas | Sucesso |
| `--okSoft` | `#E3F3EB` | Fundo de sucesso | Derivada de sucesso |

O protótipo usa nomes herdados, como `--green` para a cor principal e `--furDark` para o progresso. Na construção, os tokens recebem nomes em inglês pelo significado, como `--color-primary`, seguindo `team-practices.md`.

**Cor de erro:** `#C13515` com texto `#FFFFFF`, como no alerta do protótipo. Não é personalizável, para o alerta de exposição continuar reconhecível.

**Terminal:** fundo `#000000`, texto `#CCCCCC`, cores ANSI do mintty e fonte Consolas. Não acompanha a personalização.

## Tipografia

| Uso | Fonte | Tamanho e peso |
|---|---|---|
| Interface | Nunito, de `@fontsource/nunito` | 17 pixels, 500 |
| Rótulos e abas | Nunito | 13 a 15 pixels, 800 |
| Marca | Nunito | 21 pixels, 900 |
| Botões | Nunito | 15 pixels, 800, em maiúsculas |
| Código e caminhos | JetBrains Mono, de `@fontsource/jetbrains-mono` | 14 pixels |
| Terminal | Consolas | 14 pixels |

## Forma e espaço

- **Bordas:** 2 pixels.
- **Cantos:** 12 pixels, com círculo nos marcadores da trilha.
- **Altura mínima:** 48 pixels nos botões principais e secundários, e 36 pixels nas abas.
- **Espaços:** seguem o protótipo, com passos de 4, 8, 12, 16 e 24 pixels.

## Componentes

| Componente | Classe no protótipo | Histórias |
|---|---|---|
| Botão principal | `.cta` | US3.4, US4.1 |
| Botão secundário | `.btn2` | US3.4 |
| Etiqueta de vez | `.tag`, `.point` | US3.3 |
| Barra de progresso | `.seg`, `.track` | US3.3, US4.3 |
| Abas | `.ctab` | US6.3 |
| Marcadores da trilha | `.dot`, `.d-now`, `.d-skip` | US5.2 |
| Linha de demanda | `.row` | US6.1 |
| Opção de nível | `.scope` | US2.1 |
| Cartão | `.card` | Todas |
| Campo | `.field` | US2.1, US3.4 |
| Esqueleto | `.skel` | US3.5 |
| Instrução | `.say` | US3.3 |
| Aviso passageiro | `.toast` | US7.1 |
| Faixa do terminal recolhido | `.term-strip` | US3.2 |
| Faixa de aviso | Nova, com `.card` e ícone | US3.6, US6.2 |
| Tela de falha | Nova, com `.say` e `.card` | US1.2 |
| Seção Sua IA | Nova, com `.card` e `.field` | US3.7 |

## Artes

Ficam em `public/guia/`, em WebP. Os originais estão em `design/guia/`. O logo é `public/logo.svg`, e os favicons são fixos.

| Arte | Momentos |
|---|---|
| `boasvindas` | Início |
| `nix` | Nova demanda, passo 1; Personalizar |
| `pergunta` | Nova demanda, passo 2; pergunta; sessão encerrada; falha no repositório |
| `comando` | Nova demanda, passo 3; Enviar; colado |
| `entender` | Entender |
| `trabalhando` | Acompanhar, inclusive com a faixa de IA parada; esperando a demanda |
| `revisao` | Revisar; pedido de alterações |
| `aprovar` | Aprovar |
| `conclusao` | Conclusão; trilha concluída; demanda concluída |

## Regra de contraste na personalização

Texto do botão principal: alterna entre `#FFFFFF` e `#222222` pelo maior contraste quando a cor principal é personalizada. O padrão fica em branco, com o risco aceito no `PRD.md`. O guia avisa, sem bloquear, abaixo de 4,5:1 nos textos e de 3:1 no título (FR10.6).

## Assumptions & Open Questions

- [assumption] A divisão dos tokens em nomes novos não muda nenhum valor do protótipo.
- [open] A faixa de aviso usa a cor de destaque suave ou a cor neutra: fica para a construção, com a regra de não depender só de cor.
