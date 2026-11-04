# Decisões de tecnologia: u4-customization

Base: `functional-design/functional-spec.md`. A stack é a de U1, sem dependência nova.

| Necessidade | Escolha | Motivo |
|---|---|---|
| Tipo da mídia | Checagem própria das assinaturas, com deslocamentos fixos, em `src/customization`: PNG (`89 50 4E 47` no byte 0), JPEG (`FF D8 FF` no 0), GIF (`GIF87a` ou `GIF89a` no 0), WebP (`RIFF` no 0 e `WEBP` no 8), MP4 (`ftyp` no byte 4 e marca `isom`, `iso2`, `mp41`, `mp42` ou `avc1`) e WebM (`1A 45 DF A3` no 0 e o texto `webm` nos primeiros 64 bytes) | Seis assinaturas fixas dispensam biblioteca. A lista de marcas e a busca por `webm` excluem HEIC, AVIF, 3GP, M4A e Matroska |
| Leitura do multipart | Leitura do corpo em partes (`request.body.getReader()`) contando bytes, com aborto em 413 acima do limite, e depois `new Response(corpo, { headers }).formData()` do próprio Node.js para interpretar o multipart | Sem dependência. O limite vale com ou sem `Content-Length`, e `formData()` direto sobre a requisição fica fora porque acumula sem contar |
| Gravações da personalização | Fila única no servidor: uma gravação por vez (PUT, mídia, Concluir, Cancelar) | Evita corrida entre `rename`, linha e listas da visita |
| Identificador da mídia | `crypto.randomUUID()` do Node.js | Sem dependência |
| Gravação do arquivo | `fs` com arquivo temporário e `rename` na mesma pasta | Troca atômica no mesmo volume |
| Contraste e cores derivadas | Funções puras em `src/customization`, com os fatores do protótipo e a fórmula de luminância relativa do WCAG | Testável por tabela, sem biblioteca |
| Persistência | `customization_item` por um repositório de texto puro em `src/db` (BR7.3) | Evita o ciclo de tipos entre `db` e `customization` |
| Visita | Objeto em memória do servidor, guardado em `globalThis` como o runtime | Sobrevive ao recarregamento a quente, como as demais peças |
| Aplicação das cores | Variáveis CSS no elemento raiz | Sem recarregar nem reescrever o CSS |

## Alternativas rejeitadas

- **Biblioteca de tipo de arquivo (`file-type` e semelhantes):** soma uma dependência, a auditar com `npm audit`, para seis assinaturas fixas.
- **Rascunho gravado só em Concluir:** exigiria validar a mídia em outra rota e manter bytes temporários sem destino, sem ganho sobre o desfazer por retrato.
- **Mídia no próprio SQLite:** incharia o banco que é copiado antes de cada migração.
- **Biblioteca de processamento de imagem para remover metadados:** fora do que os requisitos pedem e com dependência nativa.
