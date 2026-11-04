# Regras: u4-customization

Base: `inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md`, `inception/refined-mockups/mockups.md`, `inception/contract-design/contract-summary.md` e `design/prototipo/Main.dc.html`.

```yaml
rules:
  - id: BR1.1
    statement: A mídia de um momento aceita PNG, JPEG, GIF, WebP, MP4 e WebM, com até 25 MB (26214400 bytes). O tipo é decidido pelos primeiros bytes do arquivo, nunca pelo nome nem pelo tipo declarado.
    category: validation
    applies_to: MediaAsset
    trigger: envio de mídia
    logic: IF os bytes iniciais combinam com a assinatura de um dos seis tipos E o tamanho é de 1 byte a 25 MB THEN aceita e guarda o contentType detectado
    violation: 415 unsupported_type ou 413 too_large, com o motivo em português, e a mídia anterior continua
    source: FR10.4
  - id: BR1.2
    statement: SVG é recusado em qualquer forma, inclusive com outro nome ou outro tipo declarado. Um arquivo que não combina com nenhuma assinatura aceita é recusado.
    category: constraint
    applies_to: MediaAsset
    trigger: envio de mídia
    logic: só a assinatura dos primeiros bytes decide. SVG não tem assinatura binária, então qualquer arquivo sem assinatura aceita, inclusive XML e SVG, é recusado como unsupported_type. Um PNG ou JPEG legítimo com XML embutido (como XMP) é aceito, porque a assinatura combina. A serialização é sempre o arquivo original, sem reprocessar
    violation: 415 unsupported_type, e a mídia anterior continua. Nenhum arquivo fica em .vibes/media/
    source: FR10.5
  - id: BR1.3
    statement: Enviar uma mídia válida substitui a do momento e passa a aparecer nele. O arquivo novo ganha um mediaId novo, e o anterior fica no disco até a visita acabar.
    category: calculation
    applies_to: MediaAsset
    trigger: envio de mídia válida
    logic: grava .vibes/media/<mediaId>.<extensão>, troca o value de media.<momentKey> e registra o mediaId anterior em replacedMediaIds da visita. Imagem e vídeo ocupam o mesmo lugar da arte
    violation: não se aplica
    source: FR10.1
  - id: BR1.4
    statement: A mídia é servida só por mediaId, com o tipo guardado, X-Content-Type-Options nosniff e uma política que impede scripts. Nunca por nome de arquivo vindo de fora.
    category: constraint
    applies_to: MediaAsset
    trigger: GET da mídia
    logic: aceita Range para vídeo (206). IF mediaId não casa com o formato de UUID OU não existe em nenhum item media.* THEN 404. ELSE devolve os bytes com Content-Type igual ao contentType guardado, nosniff e Content-Security-Policy default-src 'none'; sandbox
    violation: 404 not_found
    source: NFR5
  - id: BR2.1
    statement: Cada momento personalizável tem um título de até 120 caracteres e um texto de até 600. Valor vazio ou só com espaços volta ao original. As marcações do momento, como {etapa} e {nivel}, são trocadas pelos valores reais.
    category: validation
    applies_to: CustomizationItem
    trigger: salvar frase
    logic: aplica trim. IF vazio THEN apaga a linha say.<momentKey>.<campo>. IF maior que o limite THEN recusa. Na exibição, cada marcação listada em tokens do momento é trocada pelo valor atual, e uma marcação desconhecida fica como foi escrita
    violation: 422 invalid_value, com o limite no motivo
    source: FR10.1
  - id: BR2.2
    statement: Só o título e o texto de momentos da lista fixa podem mudar. Texto de apoio, rótulos de botão, comandos, passos, etapas e as instruções de recuperação ficam fixos. Os momentos de recuperação (failure, session_dead e not_active) aceitam no máximo a arte, nunca a frase, porque o título deles é a instrução do que fazer.
    category: constraint
    applies_to: CustomizableMoment
    trigger: salvar frase
    logic: aceita momentKey em says só se estiver em CUSTOMIZABLE_MOMENTS com textEditable verdadeiro, e o campo só se for title ou text. failure não está na lista, e session_dead e not_active estão com textEditable falso, aceitando só media
    violation: 422 invalid_value
    source: FR10.7
  - id: BR2.3
    statement: Frases e nomes de arquivo personalizados são exibidos como texto. Nenhum HTML nem script digitado ou enviado tem efeito.
    category: constraint
    applies_to: tela
    trigger: exibir frase
    logic: a interface renderiza o valor como texto de nó, sem HTML interpretado, e a troca de marcações é feita sobre texto puro
    violation: não se aplica
    source: NFR5
  - id: BR3.1
    statement: Há oito cores configuráveis (brand, accent, text, muted, bg, soft, line, ok). Cada valor é #rrggbb. Qualquer outro formato é recusado.
    category: validation
    applies_to: ColorPalette
    trigger: salvar cor
    logic: IF o valor casa com ^#[0-9a-fA-F]{6}$ THEN guarda em minúsculas. ELSE recusa. Uma chave que não é uma das oito é recusada
    violation: 422 invalid_value
    source: FR10.1
  - id: BR3.2
    statement: As cores derivadas são calculadas, nunca digitadas. O hover do destaque mistura accent com preto em 12%. O preenchimento do destaque mistura accent com branco em 75%. A cor sobre o destaque é branca ou #222222, a que tiver mais contraste com accent. O fundo do sucesso mistura ok com branco em 88%.
    category: calculation
    applies_to: ColorPalette
    trigger: ler a personalização
    logic: derived = { accentHover, accentSoft, onAccent, okSoft } a partir das oito cores, com os mesmos fatores do protótipo
    violation: não se aplica
    source: FR10.1
  - id: BR3.3
    statement: O guia avisa, sem bloquear, quando brand tem menos de 3:1 de contraste com bg e quando text ou muted têm menos de 4,5:1. O aviso aparece ao escolher a cor, e a cor é salva mesmo assim.
    category: calculation
    applies_to: ContrastWarning
    trigger: ler a personalização
    logic: razão de luminância relativa (WCAG) entre cada cor e bg. IF abaixo do mínimo THEN gera ContrastWarning com mensagem em português. O resultado vem junto da leitura, sem impedir o PUT
    violation: não se aplica
    source: FR10.6
  - id: BR3.4
    statement: Uma nova cor de brand muda a cor do logo, mas o desenho dele e o favicon continuam como estão. Nenhuma cor muda a estrutura do guia.
    category: constraint
    applies_to: ColorPalette
    trigger: aplicar cores
    logic: brand vira a variável --brand, que já pinta o fundo do logo em SVG embutido (logo.tsx) e o título. O desenho em branco e preto do logo é fixo. O favicon vem de arquivo estático em public/ e não lê a personalização
    violation: não se aplica
    source: FR10.7
  - id: BR4.1
    statement: Cada item pode voltar ao original individualmente: mídia, título, texto, cor ou Sua IA.
    category: policy
    applies_to: CustomizationItem
    trigger: Voltar ao original
    logic: o PUT recebe null para o item (colors.<chave>, says.<momento>.title ou text, media.<momento>, cliKind) e apaga a linha. Frase vazia faz o mesmo (BR2.1). No caso da mídia, o arquivo vai para replacedMediaIds e sai quando a visita acabar. Voltar ao original de um item que já é original não faz nada
    violation: não se aplica
    source: FR10.2
  - id: BR4.2
    statement: Restaurar tudo volta imagens, vídeos, frases e cores ao original, depois de uma confirmação na própria tela. Não muda a escolha de Sua IA.
    category: policy
    applies_to: CustomizationItem
    trigger: Restaurar tudo, confirmado
    logic: apaga todas as linhas color.*, say.* e media.* e deixa ai_cli. Os arquivos de mídia vão para replacedMediaIds
    violation: não se aplica
    source: FR10.2
  - id: BR4.3
    statement: Abrir Personalizar começa uma visita. Cancelar desfaz tudo o que mudou nela, inclusive Sua IA, e Concluir mantém. Cada mudança já fica salva quando é feita, para a prévia valer na hora.
    category: policy
    applies_to: CustomizationVisit
    trigger: Cancelar ou Concluir
    logic: ao abrir, guarda snapshot das linhas. Cancelar substitui todo o conjunto de linhas de customization_item pelo snapshot, inclusive apagando as criadas depois, em uma única transação, e só então apaga os arquivos de createdMediaIds. Se a transação falhar, nada muda, a tela avisa save_failed e a visita continua aberta para tentar de novo. Concluir apaga os arquivos de replacedMediaIds que nenhuma linha usa e descarta a visita
    violation: não se aplica
    source: FR10.3
  - id: BR4.4
    statement: Só uma visita fica aberta. Abrir Personalizar de novo, em outra aba, começa uma visita nova, e a anterior perde o desfazer, sem desfazer nada. Uma ação com o visitId antigo recebe 409 stale_visit.
    category: constraint
    applies_to: CustomizationVisit
    trigger: abrir Personalizar ou agir com visitId
    logic: guarda um único currentVisit. Ao abrir, apaga os arquivos de replacedMediaIds da visita anterior que nenhuma linha usa e mantém os de createdMediaIds, que já valem
    violation: 409 stale_visit, e a tela relê a personalização
    source: FR10.3
  - id: BR4.5
    statement: Se o servidor reiniciar com uma visita aberta, o que já foi salvo permanece, e não há mais o que desfazer. Ao iniciar, os arquivos de .vibes/media/ que nenhuma linha usa são apagados.
    category: policy
    applies_to: CustomizationVisit
    trigger: início do servidor
    logic: lê os itens media.* e, só se a leitura funcionar, varre .vibes/media/ e apaga o arquivo cujo mediaId não aparece neles. Se a leitura do banco falhar, a varredura é abortada sem apagar nada. Uma falha ao apagar é registrada e não impede o início. Uma referência cujo arquivo sumiu é ignorada na leitura (a arte original aparece), sem gravar no banco
    violation: não se aplica
    source: FR10.8
  - id: BR5.1
    statement: Cada gravação é inteira ou não acontece. Se gravar falhar, por exemplo com o disco cheio, a tela mostra o aviso e a personalização anterior continua valendo.
    category: constraint
    applies_to: CustomizationItem
    trigger: qualquer gravação
    logic: a mídia vai primeiro para um arquivo temporário em .vibes/media/ e só então é renomeada para o mediaId. A linha é gravada em uma transação do db. IF qualquer passo falha THEN apaga o arquivo novo, desfaz a transação e responde 500 save_failed
    violation: 500 save_failed, com o motivo em português
    source: FR10.9
  - id: BR6.1
    statement: Na primeira vez, Sua IA mostra Claude Code selecionado. Sem a linha ai_cli, vale claude_code.
    category: policy
    applies_to: AiCliPreference
    trigger: ler a personalização
    logic: readCliKind devolve o value de ai_cli ou claude_code
    violation: não se aplica
    source: FR9.1
  - id: BR6.2
    statement: Com Outra CLI salva, Enviar mostra o comando do AI-DLC para o Claude Code como referência, com a orientação de digitar o equivalente, e sem botão de envio. As rotas de envio respondem 409 other_cli.
    category: authorization
    applies_to: GuideDecision
    trigger: decisão e envio
    logic: Web lê readCliKind e o coloca em preferences.cliKind do retrato (C7). O Core já decide canSend falso e sendBlockedReason other_cli
    violation: 409 other_cli
    source: FR9.2
  - id: BR6.3
    statement: Com Outra CLI, o guia acompanha pelos arquivos do AI-DLC como no fluxo principal. Como o guia não envia o comando, ele passa a Acompanhar quando a etapa grava o primeiro artefato. Trocar a escolha muda só o que Enviar mostra e esse sinal de início.
    category: policy
    applies_to: GuideDecision
    trigger: decisão
    logic: com cliKind diferente de claude_code e artifactsTotal maior que 0, a etapa fica em following, depois das linhas de pergunta, revisão, comando enviado e comando colado. Fora isso, os sinais de andamento não dependem de cliKind. canSend e sendBlockedReason dependem
    violation: não se aplica
    source: FR9.3
  - id: BR6.4
    statement: O guia não oferece o botão Abrir a sua IA nem tenta detectar qual CLI está em uso. A escolha de Sua IA é a única fonte, e só aceita claude_code ou other.
    category: constraint
    applies_to: AiCliPreference
    trigger: salvar Sua IA e montar telas
    logic: o PUT aceita apenas cliKind em {claude_code, other}, ou null para voltar ao padrão. Nenhum módulo consulta processos, saída do terminal ou variáveis para inferir a CLI. A variável VIBES_CLI_KIND, usada até U3, deixa de existir
    violation: 422 invalid_value
    source: FR9.4
  - id: BR7.1
    statement: A personalização só escreve em .vibes/, no banco e em .vibes/media/. Nada muda fora dessa pasta, que o Git ignora.
    category: constraint
    applies_to: Customization
    trigger: qualquer gravação
    logic: o caminho da pasta vem de AppConfig.vibesDir. O nome do arquivo é <mediaId>.<extensão do tipo detectado>, sem nenhuma parte vinda de quem envia
    violation: o teste de escrita falha
    source: FR10.8
  - id: BR7.2
    statement: As rotas de personalização rejeitam Origin e Host de fora e validam o corpo com Zod. Só as chaves conhecidas são aceitas, então não há como mudar estrutura, etapas, comandos ou terminal por elas.
    category: authorization
    applies_to: rotas internas
    trigger: cada requisição
    logic: usa isRequestAllowed como as demais rotas. O esquema é fechado (strict) e exige visitId: colors com as oito chaves (valor #rrggbb ou null), says com momentKeys da lista e campos title e text (texto ou null), media com momentKeys da lista (só null, para voltar ao original), cliKind (valor ou null) e resetAll. A resposta do PUT traz a personalização lida de novo, com os avisos de contraste Chave desconhecida é recusada
    violation: 403 origin_rejected ou 422 invalid_value
    source: NFR4
  - id: BR7.3
    statement: O db não importa tipos de customization. O repositório de customization_item trabalha com texto puro (itemKey, kind, value, updatedAt), e customization interpreta e valida esses textos. A dependência vai só de customization para db.
    category: constraint
    applies_to: Customization
    trigger: construção
    logic: o repositório fica em db, com tipos primitivos. A validação, o JSON de MediaAsset e as chaves ficam em customization. Um teste de arquitetura confere que nenhum arquivo de src/db/ importa de src/customization/
    violation: o teste de arquitetura falha
    source: unit-of-work.md, nota de U4
  - id: BR7.4
    statement: O envio de mídia usa multipart/form-data com os campos file, momentKey e visitId, uma mídia por requisição. A rota recusa pelo Content-Length e confere o tamanho de novo ao ler. Sem visita aberta ou com visitId antigo, responde 409 stale_visit e não grava nada.
    category: constraint
    applies_to: rotas internas
    trigger: POST /api/customization/media
    logic: IF visitId não é o da visita aberta THEN 409 stale_visit. IF Content-Length maior que 25 MB mais 1 MB de margem do multipart THEN 413 too_large sem ler o corpo. Com ou sem Content-Length, o corpo é lido em partes com contagem de bytes e abortado em 413 ao passar do limite (NFR5.5). Depois de ler, confere sizeBytes contra 25 MB. O arquivo entra em createdMediaIds, e a mídia anterior do momento, em replacedMediaIds
    violation: 413 too_large
    source: FR10.4
```

## Resumo

| Grupo | Regras | Tema |
|---|---|---|
| BR1 | BR1.1 a BR1.4 | Imagens e vídeos |
| BR2 | BR2.1 a BR2.3 | Frases |
| BR3 | BR3.1 a BR3.4 | Cores |
| BR4 | BR4.1 a BR4.5 | Restaurar, visita e Cancelar |
| BR5 | BR5.1 | Falha ao gravar |
| BR6 | BR6.1 a BR6.4 | Sua IA |
| BR7 | BR7.1 a BR7.4 | Escrita, rotas, ciclo de tipos e envio |
