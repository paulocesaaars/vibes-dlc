# DESIGN — Vibes DLC

Referência visual da interface do guia local do AI-DLC. Este documento descreve o design implementado em `src/app/globals.css` e nos componentes de `src/web/components/`, em conjunto com as decisões de produto do [PRD](PRD.md) e a arquitetura do [TDD](TDD.md).

A paleta tem origem no Nix; tipografia, componentes e organização das telas são próprios do Vibes DLC. A interface tem fundo claro, contornos marcados, cantos arredondados e ilustrações que acompanham as instruções. O terminal mantém um tema escuro independente. Não há alternância de tema claro/escuro.

## Princípios

- Conduzir uma tarefa por vez, mostrando a instrução atual, de quem é a vez e no máximo uma ação principal por momento.
- Manter o guia e o terminal próximos, com a trilha das etapas disponível durante a execução.
- Usar texto e símbolos junto às cores para distinguir estados.
- Usar ilustrações e animações como apoio às instruções e à conclusão de etapas, sem pontos, vidas ou outras mecânicas de gamificação.
- Escrever a interface em português (Brasil). Comandos, caminhos e conteúdo produzido pela CLI preservam o original.

## Cores

As oito cores personalizáveis são definidas em `src/customization/colors.ts` e aplicadas como variáveis CSS no elemento da aplicação.

- **Logo e título:** `brand`, padrão `#FF385C`, variável `--brand`.
- **Destaque:** `accent`, padrão `#FF385C`, variáveis `--green` e `--furDark`. Usada na ação principal, no progresso e nos destaques da etapa atual.
- **Texto:** `text`, padrão `#222222`, variáveis `--ink`, `--night`, `--blue` e `--blueText`.
- **Texto de apoio:** `muted`, padrão `#6A6A6A`, variável `--gray`.
- **Fundo:** `bg`, padrão `#FFFFFF`, variável `--paper`.
- **Preenchimentos:** `soft`, padrão `#F7F7F7`, variável `--wash`.
- **Bordas:** `line`, padrão `#DDDDDD`, variáveis `--line` e `--faded`.
- **Sucesso:** `ok`, padrão `#04694A`, variável `--ok`.

Os nomes históricos como `--green` e `--blue` identificam funções no CSS; não significam que o destaque seja verde ou o texto seja azul.

### Tons auxiliares

Sem personalização, o CSS define:

- `--green2` e `--greenText`: `#E00B41`, para hover da ação principal e textos de destaque.
- `--mint` e `--furLight`: `#F2F2F2`, para preenchimentos suaves e fase selecionada.
- `--leaf`: `#FFD1DA`, tom claro de destaque.
- `--okSoft`: `#E3F3EB`, fundo de sucesso.
- Erros: `#C13515`. Avisos de contraste na personalização: `#8A4B00`.

Quando a cor de origem é personalizada, o hover do destaque mistura 12% de preto; seu tom suave mistura 75% de branco. O fundo de sucesso mistura 88% de branco. A personalização de preenchimentos também alimenta `--mint` e `--furLight`.

Restaurar uma cor remove sua sobrescrita e recupera os valores originais do CSS. As cores do terminal permanecem fixas.

### Contraste

O botão principal mantém texto branco sobre `#FF385C` no padrão, conforme decisão registrada no PRD. O contraste aproximado de 3,3:1 é uma limitação conhecida e aceita; não representa conformidade com o mínimo de 4,5:1 para texto comum.

Ao personalizar o destaque, o texto do botão alterna entre branco e `#222222`, escolhendo o maior contraste. A tela de personalização avisa, sem bloquear, quando logo e título ficam abaixo de 3:1 ou quando texto e texto de apoio ficam abaixo de 4,5:1 em relação ao fundo.

## Tipografia

A interface usa `Nunito, 'Nunito Sans', system-ui, sans-serif`. Código e caminhos usam `'JetBrains Mono', Consolas, monospace`. As fontes são empacotadas localmente por `@fontsource`, sem requisições ao Google Fonts.

- Corpo: 17 px, peso 500, altura de linha 1,4.
- Marca: 21 px, peso 900, espaçamento de letras de -0,02 em.
- Título principal de destaque (`.big`): 48 px, peso 900, linha 1,1; passa a 36 px no layout empilhado.
- Títulos de seção e de balão: 24 px, peso 900. O balão usa linha 1,2.
- Título de demanda em lista: 19 px, peso 900, linha 1,2.
- Botões principais e secundários: 15 px, peso 800, caixa alta, espaçamento de letras de 0,8 px.
- Rótulos de contexto (`.eyebrow`): 13 px, peso 800, caixa alta, espaçamento de 0,8 px.
- Metadados, abas, trilha e seletores compactos: 12 a 14 px, conforme o componente.
- Conteúdo de artefatos: 13 px em monoespaçada, linha 1,55. Caminho no cabeçalho: 11 px.

## Espaçamento, bordas e elevação

- Bordas da interface: 2 px. Raio padrão de cartões, campos, botões, abas e selos: 12 px.
- A composição usa contornos e preenchimentos, sem sombras de elevação nos componentes atuais.
- Conteúdo central (`.scroll-body`): largura máxima de 760 px, margem horizontal automática, padding de 22 px 24 px 28 px e intervalo de 18 px.
- Cartão com conteúdo (`.card-pad`): padding de 18 px.
- Grupos verticais reutilizáveis: intervalos de 2, 6, 8, 10, 14 e 18 px.
- Grupos de botões: intervalo de 8 px, com quebra de linha.
- Cabeçalho: padding de 8 px 20 px. Faixa inferior: 14 px 24 px.
- Botões principal e secundário: altura mínima de 48 px; seletores compactos e abas: 36 px.
- Marcadores de etapa: círculos de 36 px; etapa atual: 46 px; etapa pulada: 28 px.

Os controles próprios do terminal usam dimensões e bordas mais compactas, descritas adiante.

## Layout e responsividade

A aplicação ocupa a altura da janela, com mínimo de 720 px. No desktop, a grade tem duas colunas: guia à esquerda e terminal à direita. O terminal ocupa 38% da largura, com mínimo de 400 px; o guia usa o espaço restante.

O lado do guia contém cabeçalho, área de navegação/conteúdo e faixa inferior de ações. Durante a condução da demanda, a trilha ocupa uma coluna de 232 px à esquerda do conteúdo. Conteúdo e trilha possuem rolagem independente quando necessário.

O terminal recolhido ocupa uma faixa vertical de 48 px, com rótulo girado. Recolher não encerra a sessão.

Em larguras de até 1180 px:

- Guia e terminal ficam empilhados em uma única coluna.
- A trilha fica acima do conteúdo, com altura máxima de 280 px e rolagem.
- O terminal aberto tem altura de 480 px; recolhido, 48 px, com rótulo horizontal.
- A página passa a ter altura automática e a faixa inferior fica aderente ao rodapé durante a rolagem.
- Grupos de ações e textos quebram linha; caminhos e comandos longos podem quebrar dentro da palavra.

## Telas e navegação

As telas principais são Início, Nova demanda, Guia da demanda e Personalizar. Nova demanda conduz descrição, escolha do nível e confirmação do comando. Quando o AI-DLC ainda não está disponível, o início apresenta a orientação de preparação do repositório.

O guia mostra os cinco passos Entender, Enviar, Acompanhar, Revisar e Aprovar. As consultas de Artefatos, Unidades e ciclos, Decisões e Histórico oferecem retorno ao guia. Aprovações de etapa acontecem no terminal, nos gates do AI-DLC; a interface apresenta a orientação correspondente.

## Componentes

### Marca

Logo em SVG no componente `logo.tsx`, com fundo ligado à cor de marca e camadas branca e escura. A marca no cabeçalho permite voltar ao início. Os favicons de `public/` são fixos e não acompanham a personalização.

### Botões

**Principal (`.cta`):** fundo e borda de destaque, texto branco no padrão, raio de 12 px e padding horizontal de 24 px. Hover usa o tom de destaque mais escuro; pressionar desloca o botão 2 px para baixo. Desabilitado usa borda e fundo neutros, texto de apoio e cursor de indisponibilidade.

**Secundário (`.btn2`):** fundo transparente, borda de texto principal, padding horizontal de 18 px. Hover usa preenchimento suave. Desabilitado tem opacidade de 0,6.

**Abas (`.ctab`):** texto de apoio, borda transparente e hover suave. A aba selecionada recebe borda visível e texto principal.

### Cartões e listas

Cartões (`.card`) usam fundo da aplicação, borda neutra e raio de 12 px. Linhas de demanda (`.row`) combinam título, metadados e ações, com padding de 14 px 16 px e hover suave. Seletores de nível (`.scope`) usam padding de 12 px 14 px; a opção selecionada ganha borda de destaque e fundo suave.

### Campos

Campos (`.field`) usam largura total, borda neutra de 2 px, raio de 12 px e padding de 12 px 14 px. O foco muda a borda para a cor do texto. Áreas de texto permitem redimensionamento vertical. Comandos usam fonte monoespaçada.

### Balão do guia

A composição (`.say`) combina ilustração de 216 px com balão flexível. O balão tem contorno neutro, raio de 12 px, padding de 14 px 18 px e ponta lateral. Reúne contexto, título, explicação e, quando necessário, uma indicação de ação em fundo escuro com texto branco.

### Trilha e progresso

Fases usam cabeçalhos arredondados e etapas usam marcadores circulares:

- Concluída: preenchimento verde de sucesso e símbolo branco.
- Atual: círculo escuro maior, texto forte e halo na cor de destaque.
- Bloqueada: preenchimento neutro e texto de apoio.
- Pendente: círculo com contorno neutro.
- Pulada: círculo menor com contorno tracejado e rótulo riscado.

A barra dos cinco passos tem segmentos de 12 px de altura e intervalo de 6 px. Passos alcançados recebem destaque; o atual pulsa. A barra contínua de progresso usa trilha neutra e preenchimento de destaque, com 10 px de altura.

### Artefatos e histórico

Seletores de artefatos (`.pillb`) têm altura mínima de 36 px. O selecionado recebe contorno escuro; o revisado usa fundo suave de sucesso, texto verde e marca de confirmação. Artefatos alterados exibem também o texto “mudou”.

O artefato aparece em cartão com cabeçalho, caminho e conteúdo monoespaçado com quebra de linha. O conteúdo é texto puro, sem renderização de HTML. Comandos de orientação usam fundo suave (`.step-code`), e o histórico usa linhas separadas por bordas neutras.

### Faixas, avisos e carregamento

A faixa inferior (`.band`) apresenta a ação principal ou o estado de espera. Espera usa preenchimento suave; conclusão usa fundo suave de sucesso e texto verde. A orientação junto ao terminal (`.hint`) combina texto forte e ícone direcional.

Erros usam texto `#C13515`; avisos comuns usam texto principal. O alerta de exposição à rede é uma faixa vermelha com texto branco acima da aplicação. Estados vazios usam mensagens explícitas em texto de apoio. Carregamento pode usar blocos neutros de 36 px com brilho animado (`.skel`).

## Terminal integrado

O terminal real usa xterm, com aparência próxima ao Git Bash:

- Fundo `#000000`, texto e cursor `#CCCCCC`, fonte Consolas com alternativas Lucida Console, Cascadia Mono e monoespaçada, tamanho de 14 px.
- Paleta ANSI definida em `terminal-panel.tsx`, independente da personalização do guia.
- Barra superior `#1F1F1F`, fonte Segoe UI de 12 px, título da sessão e ações de recolher, voltar ao guia e encerrar ou criar sessão.
- Controles compactos com borda de 1 px em `#555555`, raio de 3 px e hover `#333333`. A ação principal do terminal usa fundo `#CCCCCC` e texto preto.
- Área interna com padding de 8 px 10 px.
- Quando a ação é do usuário no terminal, um contorno de 2 px na cor de destaque pulsa ao redor dele.

A interface da CLI é desenhada pela própria CLI dentro do terminal. O guia não simula seus menus, caixas ou cores. F6 alterna o foco entre guia e terminal; há também ação visível para voltar ao guia.

## Personalização e mídia

Personalizar reutiliza os mesmos cartões, campos, botões e abas. Cada momento oferece prévia da mídia e campos de texto. As cores usam seletor de 48 × 48 px, campo hexadecimal e restauração individual. A grade de cores adapta o número de colunas à largura disponível, com base de 220 px por item.

Alterações têm efeito imediato. Cancelar recupera o estado do início da visita; Concluir mantém as mudanças. Restaurar tudo exige confirmação.

As artes padrão ficam em `public/guia/`. Imagens e vídeos usam texto alternativo ou nome acessível, preservam proporção e respeitam a largura disponível. As artes do guia usam `mix-blend-mode: multiply`. Falha de mídia personalizada recupera a arte original quando há alternativa definida.

A personalização pode trocar cores, frases e mídias, mas preserva a estrutura do guia, os comandos, o terminal e o desenho do logo. Limites e formatos aceitos pertencem às regras de produto e de validação.

## Movimento e acessibilidade

Entradas usam animações curtas de opacidade e deslocamento: `fade` de 0,3 s e `pop` de 0,42 s. Ilustrações estáticas podem flutuar, e indicadores de etapa e terminal podem pulsar. Interações de pressão usam deslocamento de 2 px.

Com `prefers-reduced-motion: reduce`, animações e transições CSS são desativadas; vídeos não iniciam automaticamente e são pausados. Essa regra não congela imagens animadas, como GIF ou WebP animado.

O foco visível geral tem contorno de 3 px na cor de texto e deslocamento de 2 px; campos usam a mudança de borda. Controles de ícone têm nomes acessíveis; mensagens de estado e erro usam regiões de status ou alerta. Os estados da trilha e da revisão combinam cor, forma, símbolos ou texto.

## Referências de implementação

- `src/app/globals.css`: tokens, layout, componentes, responsividade e animações.
- `src/app/layout.tsx`: fontes locais e idioma da página.
- `src/customization/colors.ts`: cores originais, mapeamento de variáveis, tons derivados e contraste.
- `src/web/client/apply-colors.ts`: aplicação e restauração das cores.
- `src/web/components/`: composição das telas, trilha, artefatos, personalização e terminal.

Ao alterar o design, mantenha este documento alinhado à implementação. Regras de comportamento ficam no PRD e decisões de arquitetura no TDD.
