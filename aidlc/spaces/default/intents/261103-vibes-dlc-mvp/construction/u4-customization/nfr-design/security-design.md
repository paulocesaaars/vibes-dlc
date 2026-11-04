# Design de segurança: u4-customization

Base: `nfr-requirements/security-requirements.md`, `nfr-requirements/tech-stack-decisions.md`, `functional-design/functional-spec.md` e `inception/contract-design/contract-summary.md`.

**Unidades dos limites:** todos em bytes. Arquivo de mídia: 26214400 (25 MiB). Corpo da requisição: 27262976 (26 MiB), que inclui 1 MiB de margem do multipart.

## Rotas (NFR4.1, NFR4.2)

| Rota | Entrada | Validação |
|---|---|---|
| `GET /api/customization` | Nada | `isRequestAllowed` |
| `PUT /api/customization` | JSON com `visitId` e os grupos | `isRequestAllowed`, esquema Zod `strict` (BR7.2) e, na fila, `visitId` da visita aberta |
| `POST /api/customization/visit` | Nada | `isRequestAllowed`. Abre a visita e devolve `visitId` |
| `POST /api/customization/visit/done` e `/cancel` | `visitId` | `isRequestAllowed` e, na fila, `visitId` da visita aberta |
| `POST /api/customization/media` | multipart com `file`, `momentKey` e `visitId` | Abaixo |
| `GET /api/customization/media/{mediaId}` | `mediaId` | UUID, existente em algum `media.*` |

A rota `Web` valida `momentKey` contra `CUSTOMIZABLE_MOMENTS` (`GuideContent`) e `textEditable` antes de chamar `Customization`, que recebe só chaves já validadas. Assim `Customization` não depende de `GuideContent`. O teste que percorre os `route.ts` cobre as novas rotas, com `Origin` de fora e com chave desconhecida.

**Regra da fila:** a primeira coisa que cada operação faz dentro da fila (`reliability-design.md`) é conferir de novo o `visitId`. Se a visita foi fechada ou trocada enquanto a operação esperava, responde 409 `stale_visit` sem escrever nada.

## Recebimento da mídia (NFR5.1, NFR5.5)

1. **Semáforo de upload:** só um envio de mídia lê o corpo por vez. Um segundo, enquanto o primeiro lê, recebe 429 `busy` na hora, sem ler o corpo. O semáforo é solto no `finally`.
2. Se `Content-Length` existe e passa de 27262976, responde 413 sem ler.
3. Lê `request.body` com `getReader()`, guardando os pedaços e somando os bytes. Ao passar de 27262976, cancela a leitura e responde 413. Ao terminar, concatena num único `Buffer` e **solta a lista de pedaços**.
4. Interpreta o multipart com `new Response(buffer, { headers: { 'content-type': ... } }).formData()` e **solta o `Buffer` do corpo**. O `file` não pode passar de 26214400 nem ter menos de 1 byte.
5. Obtém os bytes uma única vez, com `await file.arrayBuffer()`, e usa essa vista para `detectMediaType` e, depois, para a gravação. Nenhuma outra cópia é feita.
6. `detectMediaType(bytes)` decide o tipo pelas assinaturas de `tech-stack-decisions.md`. Sem assinatura aceita: 415, e nada vai ao disco.
7. Entra na fila de gravação (`reliability-design.md`) só com os bytes já validados.

**Pico de memória por envio:** no passo 3, a lista de pedaços e o `Buffer` concatenado coexistem (até 2 × 26 MiB, 52 MiB). Soltada a lista, o passo 4 mantém o `Buffer` do corpo e o `File` (até 26 + 25 MiB, 51 MiB). Soltado o `Buffer`, o passo 5 mantém o `File` e o `ArrayBuffer` (até 50 MiB). O pico é de cerca de 52 MiB mais a sobrecarga do Node.js, abaixo de 100 MB, e o semáforo do passo 1 impede que dois envios somem seus picos. O teste de NFR5.5 amostra `process.memoryUsage().rss` a cada 10 ms durante um envio de 25 MiB e confere o pico contra 100 MB acima da linha de base, e também confere que um segundo envio simultâneo recebe 429.

## Servir a mídia (NFR5.2)

Cabeçalhos fixos: `Content-Type` do tipo guardado, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox` e `Content-Disposition: inline`. O arquivo é aberto por `path.join(mediaDir, mediaId + extensão)`, com `mediaId` já validado como UUID e a extensão tirada do tipo guardado. Nada do pedido entra no caminho além do UUID. O `mediaDir` é `vibesDir/media`, acrescentado ao `AppConfig` por U4 e criado no início, antes da varredura.

## Texto e cores (NFR5.3, NFR5.4, NFR5.6)

- Frases e nomes de arquivo são nós de texto na interface. A troca de marcações opera sobre texto puro, e o resultado vai como texto.
- Cada cor passa por `^#[0-9a-fA-F]{6}$`, vai a minúsculas e só então a `style.setProperty` como valor. As cores derivadas são calculadas a partir de números, não de texto.
- `CUSTOMIZABLE_MOMENTS` é a única lista aceita em `says` e `media`. `session_dead` e `not_active` têm `textEditable` falso, e `failure` não está nela.

## Rede e escrita (NFR6.1, NFR7.1, NFR5.7)

- Nenhum módulo da personalização importa cliente de rede. A prova registra as requisições.
- A única pasta escrita é `.vibes/`: o banco, pela `Db`, e `.vibes/media/`, por `fs`.
- Um teste de arquitetura confere que nenhum arquivo de `src/db/` importa de `src/customization/`, e que `src/customization/` não importa `node:sqlite`.

## Riscos aceitos

Os de `nfr-requirements/security-requirements.md` continuam: mídia grande e lenta de decodificar, e metadados da mídia mantidos em `.vibes/media/`.
