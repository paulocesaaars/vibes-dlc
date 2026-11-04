# Entidades: u4-customization

Base: `inception/domain-design/components.md`, `inception/contract-design/contract-summary.md` e `inception/units-generation/unit-of-work.md`. Esta Unidade acrescenta entidades às de U1 a U3, sem mudar as existentes.

```yaml
entities:
  - name: CustomizationItem
    description: Um valor personalizado, guardado em customization_item, em .vibes/. Uma linha por item; o item original é a ausência da linha.
    owner: Customization
    persisted: true
    attributes:
      - { name: itemKey, type: text, required: true, unique: true, constraints: "color.<colorKey>, say.<momentKey>.title, say.<momentKey>.text, media.<momentKey> ou ai_cli" }
      - { name: kind, type: enum, required: true, allowed: [color, say, media, cli] }
      - { name: value, type: text, required: true, constraints: "color: #rrggbb em minúsculas; say: texto de 1 a 120 (título) ou 1 a 600 (texto) caracteres; media: JSON de MediaAsset; cli: claude_code ou other" }
      - { name: updatedAt, type: instant, required: true }
    constraints:
      - "Só o módulo customization interpreta kind e value. O db guarda os quatro campos como texto, sem importar tipos de customization (BR7.3)"
      - "Voltar ao original apaga a linha, não grava o valor padrão (BR4.1)"
    relationships: []

  - name: MediaAsset
    description: A imagem ou o vídeo que substitui a arte de um momento. Mora no value de media.<momentKey>, e o arquivo fica em .vibes/media/.
    owner: Customization
    persisted: true
    attributes:
      - { name: mediaId, type: identifier, required: true, unique: true, constraints: "UUID gerado pelo servidor" }
      - { name: momentKey, type: enum, required: true, constraints: "um dos momentos personalizáveis" }
      - { name: contentType, type: enum, required: true, allowed: [image/png, image/jpeg, image/gif, image/webp, video/mp4, video/webm], constraints: "decidido pelo conteúdo do arquivo, nunca pelo nome nem pelo tipo declarado" }
      - { name: sizeBytes, type: integer, required: true, min: 1, max: 26214400 }
      - { name: filePath, type: path, required: true, constraints: "derivado: .vibes/media/<mediaId>.<extensão do tipo>; nunca vem de quem envia" }
    constraints:
      - "No máximo uma mídia por momento"
      - "SVG nunca é aceito, em nenhuma forma (BR1.2)"
    relationships:
      - { entity: CustomizationItem, cardinality: "1:1", direction: "MediaAsset vive no value do item media.<momentKey>" }

  - name: AiCliPreference
    description: A escolha da seção Sua IA. Guardada no item ai_cli.
    owner: Customization
    persisted: true
    attributes:
      - { name: preferenceKey, type: text, required: true, unique: true, constraints: "sempre ai_cli" }
      - { name: cliKind, type: enum, required: true, allowed: [claude_code, other], default: claude_code }
    constraints:
      - "Sem linha, vale claude_code (BR6.1)"
      - "Não guarda nome, caminho nem versão de CLI, e o guia nunca tenta detectar a CLI em uso (BR6.4)"
    relationships:
      - { entity: CustomizationItem, cardinality: "1:1", direction: "AiCliPreference vive no item ai_cli" }

  - name: ColorPalette
    description: As oito cores configuráveis, com os valores originais e as cores derivadas. É calculada a cada leitura, sem ser guardada.
    owner: Customization
    persisted: false
    attributes:
      - { name: brand, type: text, required: true, default: "#ff385c", constraints: "título do Vibes DLC e logo" }
      - { name: accent, type: text, required: true, default: "#ff385c", constraints: "botão principal e destaques" }
      - { name: text, type: text, required: true, default: "#222222" }
      - { name: muted, type: text, required: true, default: "#6a6a6a" }
      - { name: bg, type: text, required: true, default: "#ffffff" }
      - { name: soft, type: text, required: true, default: "#f7f7f7" }
      - { name: line, type: text, required: true, default: "#dddddd" }
      - { name: ok, type: text, required: true, default: "#04694a" }
      - { name: derived, type: record, required: true, constraints: "accentHover, accentSoft, onAccent e okSoft, calculados por BR3.2" }
    constraints: ["Cada cor é #rrggbb. Qualquer outro formato é recusado (BR3.1)"]
    relationships: []

  - name: ContrastWarning
    description: Um aviso de contraste baixo. Informa, não bloqueia.
    owner: Customization
    persisted: false
    attributes:
      - { name: colorKey, type: enum, required: true, allowed: [brand, text, muted] }
      - { name: ratio, type: decimal, required: true, min: 1, max: 21 }
      - { name: minimum, type: decimal, required: true, allowed: [3, 4.5] }
      - { name: message, type: text, required: true }
    constraints: ["Existe só enquanto a cor continua abaixo do mínimo"]
    relationships: []

  - name: CustomizableMoment
    description: Um momento do guia ou da navegação cuja arte, título e texto podem ser trocados. A lista é fixa e vive em GuideContent.
    owner: GuideContent
    persisted: false
    attributes:
      - { name: momentKey, type: text, required: true, unique: true }
      - { name: name, type: text, required: true }
      - { name: defaultTitle, type: text, required: true }
      - { name: defaultText, type: text, required: true }
      - { name: tokens, type: list-of-text, required: true, constraints: "marcações aceitas no título e no texto deste momento" }
      - { name: defaultArtKey, type: text, required: true }
      - { name: textEditable, type: boolean, required: true, constraints: "falso em session_dead e not_active, que aceitam só a arte" }
    constraints: ["failure fica fora da lista, e os momentos de recuperação não aceitam frase: a instrução de falha não pode ser escondida (BR2.2)"]
    relationships: []

  - name: CustomizationVisit
    description: Uma visita à tela Personalizar. Guarda, na memória do servidor, o retrato inicial para Cancelar desfazer.
    owner: Customization
    persisted: false
    attributes:
      - { name: visitId, type: identifier, required: true, unique: true }
      - { name: snapshot, type: list-of-CustomizationItem, required: true, constraints: "as linhas no momento em que a visita começou" }
      - { name: createdMediaIds, type: list-of-identifier, required: true, constraints: "arquivos gravados durante a visita" }
      - { name: replacedMediaIds, type: list-of-identifier, required: true, constraints: "arquivos que a visita deixou sem uso e que só saem em Concluir" }
    constraints:
      - "Há no máximo uma visita aberta. Abrir outra descarta os dados de desfazer da anterior (BR4.4)"
      - "Reiniciar o servidor descarta a visita, e o que já foi salvo permanece (BR4.5)"
    relationships:
      - { entity: CustomizationItem, cardinality: "1:N", direction: "a visita guarda cópia das linhas" }
```

## Resumo

- **Guardadas no banco:** `CustomizationItem`, na migração `0004_u4.sql`, que cria `customization_item` conforme C3. `MediaAsset` e `AiCliPreference` usam essa mesma tabela, então não há tabela nova além dela.
- **No disco:** os arquivos de mídia, em `.vibes/media/`.
- **Calculadas a cada vez:** `ColorPalette` e `ContrastWarning`.
- **Estáticas:** `CustomizableMoment`, em `GuideContent`.
- **Só na memória do servidor:** `CustomizationVisit`.
