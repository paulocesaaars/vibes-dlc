# Design de confiabilidade: u4-customization

Base: `nfr-requirements/reliability-requirements.md`, `functional-design/rules.md` (BR4, BR5).

## Fila única de gravação (NFR12.7)

Um `Promise` encadeado no servidor, guardado junto com a visita em `globalThis`, recebe cada operação de escrita (PUT, mídia, Concluir, Cancelar) e as executa uma por vez. Uma operação que falha não trava a fila: o erro volta ao pedido dela, e a próxima segue.

- **Primeiro passo de toda operação na fila:** conferir de novo o `visitId` contra a visita aberta. Se a visita foi fechada ou trocada enquanto esperava, responde 409 `stale_visit` sem escrever nada. Isso cobre a mídia em voo que cruza um Concluir ou Cancelar.
- **O que entra na fila:** só a parte curta de cada operação, depois que o corpo foi lido e validado fora dela. No envio de mídia, a leitura, o multipart e a detecção de tipo ficam fora (ver `security-design.md`), e a fila recebe os bytes prontos: gravar o temporário, renomear e a transação. Um PUT de texto espera, no máximo, uma gravação de 25 MiB em disco, e não a leitura do envio.

## Gravação de mídia (NFR12.4)

```text
1. confere visitId (409 stale_visit)
2. escreve .vibes/media/<mediaId>.tmp
3. rename para <mediaId>.<extensão>
4. transação: grava media.<momento>, e só depois atualiza createdMediaIds e replacedMediaIds
```

Limpeza por passo: falha no passo 2 ou 3, apaga o `.tmp` (ou o arquivo parcial); falha no passo 4, apaga o arquivo final e desfaz a transação. Em todos, responde 500 `save_failed`. As listas da visita só mudam depois da transação.

Um momento trocado duas vezes na mesma visita: o primeiro arquivo novo entra em `createdMediaIds`, e a segunda troca o põe em `replacedMediaIds`. Em Cancelar, `createdMediaIds` cobre os dois novos e o do retrato continua. Em Concluir, `replacedMediaIds` apaga o que nenhuma linha usa, o que inclui o primeiro novo e o original.

## Cancelar (NFR12.5)

O repositório do `Db` expõe uma função de transação sobre texto puro, `replaceAll(rows)`, que apaga todas as linhas de `customization_item` e regrava as do retrato. `Customization` chama essa função e, só depois dela, apaga os arquivos de `createdMediaIds`. Se a transação falhar, nada muda, a resposta é `save_failed` e a visita continua aberta. Se a exclusão de um arquivo falhar depois, ele vira órfão e sai na varredura do próximo início.

## Início do servidor (NFR12.6)

O ponto de montagem do runtime cria `.vibes/media/` se faltar, depois da migração, e roda a varredura uma vez. Ela lê os `mediaId` das linhas `media.*`. Se a leitura falhar, aborta e registra. Se funcionar, apaga cada arquivo cujo UUID não esteja nessa lista e todo `.tmp`.

## Arquivo de mídia ausente (NFR12.6)

`GET /api/customization` não faz `stat` das mídias (ver `performance-design.md`) e devolve a URL de cada uma. Se o arquivo foi apagado à mão, `GET /api/customization/media/{mediaId}` responde 404, e a interface cai na arte original do momento (`onError` da imagem e do vídeo). Nada é gravado no banco por causa disso. O teste apaga um arquivo à mão e confere o 404 da rota e a arte original na tela.

## Migração (NFR12.2)

`0004_u4.sql` só cria `customization_item`, depois da cópia prévia de `.vibes/vibes.db` que o `Db` já faz. Não altera tabelas de U1 a U3.

## Plataforma, idioma, acessibilidade e qualidade (NFR9.1, NFR8.1, NFR10.1, NFR11.1)

- A prova de U4 roda no Windows com Git Bash e no Edge, em Node.js 22.13 ou superior. O Chrome fica para a conferência final, como desvio aceito do NFR9.
- Os textos novos entram em português, e os rótulos de Sua IA são os únicos que citam ferramenta.
- Cada campo tem `label`, o aviso de contraste é texto com ícone e o vídeo da prévia usa `muted`, `loop`, `playsInline` e, com `prefers-reduced-motion`, fica parado no primeiro quadro.
- `npm run verify` mantém o piso de 80%, e os módulos novos cobrem o caminho feliz e dois casos de erro ou de borda.

## Testes do NFR12.7

Dois envios simultâneos (o segundo recebe 429 `busy`); dois envios em sequência para o mesmo momento; mídia em voo que cruza Concluir e outra que cruza Cancelar (409 `stale_visit`, nenhum arquivo sem dono ao fim).
