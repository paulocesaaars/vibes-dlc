# Design de desempenho: u4-customization

Base: `nfr-requirements/performance-requirements.md`, `functional-design/functional-spec.md`.

## Leitura e prévia (NFR1.1, NFR1.2, NFR1.5)

- `GET /api/customization` lê as linhas de `customization_item` numa consulta só e monta a resposta em memória. Não abre nenhum arquivo de mídia: devolve só a URL `/api/customization/media/{mediaId}` e o tipo.
- O cliente guarda a resposta num estado da tela. Cada `PUT` devolve a personalização relida, e a tela troca o estado sem nova leitura.
- As cores são aplicadas como variáveis CSS no elemento raiz, numa única passagem `style.setProperty`. Nada reescreve folha de estilo nem recarrega a página.
- Os avisos de contraste são calculados no servidor, a partir de oito cores, e viajam na resposta.

## Mídia (NFR1.3, NFR1.4)

- O envio usa leitura em partes com contagem (ver `security-design.md`). O arquivo é gravado com `writeFile` num temporário e renomeado, sem segunda cópia em disco.
- A mídia é servida com `createReadStream`, sem carregar o arquivo inteiro. Para `Range` de uma faixa, a rota calcula `start` e `end` e responde 206 com `Content-Range`; a faixa sufixo (`bytes=-N`) vale; uma faixa fora do arquivo responde 416 com `Content-Range: bytes */tamanho`; várias faixas são ignoradas e respondem 200 com o arquivo inteiro. Sem `Range`, responde 200 com `Content-Length` e `Accept-Ranges: bytes`.
- A leitura não faz `stat` das mídias. Um arquivo apagado à mão dá 404 na rota de servir, e a interface volta à arte original (`reliability-design.md`).
- Um PUT de texto não espera a leitura de um envio de mídia, porque só a gravação final entra na fila (`reliability-design.md`).
- A resposta leva `Cache-Control: private, max-age=31536000, immutable`, porque o `mediaId` muda a cada troca. O navegador não pede de novo a mídia que já tem.

## Orçamento

| Passo | Orçamento |
|---|---|
| Consulta das linhas e montagem | 20 ms |
| Cálculo dos contrastes e das derivadas | 1 ms |
| Resposta HTTP local | 30 ms |
| Sobra até a meta de 300 ms | Renderização da tela e da prévia |

| Passo do envio de 25 MiB (NFR1.3, meta de 5 s) | Orçamento |
|---|---|
| Leitura do corpo em partes e concatenação | 1 s |
| Multipart e `arrayBuffer` | 0,5 s |
| Detecção de tipo (primeiros bytes) | 1 ms |
| Gravação do temporário, `rename` e transação | 1,5 s |
| Resposta e prévia | 0,5 s |
| Folga | 1,5 s |

| Passo de servir a mídia (NFR1.4, meta de 200 ms) | Orçamento |
|---|---|
| Validar o UUID e consultar a linha | 10 ms |
| Abrir o arquivo e enviar os cabeçalhos | 40 ms |
| Folga | 150 ms |
