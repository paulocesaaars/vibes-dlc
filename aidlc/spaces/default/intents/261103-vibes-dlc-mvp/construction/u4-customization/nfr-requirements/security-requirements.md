# Segurança: u4-customization

U4 é a única Unidade que recebe arquivos de quem usa o guia e os serve de volta ao navegador. Uma mídia disfarçada, um SVG com script ou uma frase com HTML são os caminhos de ataque a fechar. O uso é local e de uma pessoa, e os dados do usuário são tratados como não confiáveis mesmo assim.

| ID | Requisito | Verificação |
|---|---|---|
| NFR4.1 | Todas as rotas de `/api/customization/*` passam por `isRequestAllowed` (`Origin` e `Host` do próprio app) e validam o corpo com Zod em esquema fechado (BR7.2) | O teste que percorre todas as rotas inclui as novas, com `Origin` de fora e com chave desconhecida |
| NFR4.2 | O PUT, o envio de mídia, Concluir e Cancelar exigem o `visitId` da visita aberta, e um `visitId` antigo ou ausente responde 409 `stale_visit` sem gravar (BR4.4, BR7.4) | Teste com duas visitas e com servidor reiniciado |
| NFR5.1 | O tipo da mídia é decidido pelos primeiros bytes. SVG, XML e qualquer arquivo sem assinatura aceita são recusados, mesmo com nome ou tipo declarado de imagem (BR1.1, BR1.2) | Testes com SVG renomeado `.png`, HTML com `Content-Type: image/png`, PNG renomeado `.svg`, arquivo vazio, arquivo truncado menor que a assinatura, RIFF/WAV, `ftyp` de marca não aceita, e um PNG legítimo com XMP embutido, que é aceito |
| NFR5.2 | A mídia é servida só por `mediaId` em formato de UUID, com o `Content-Type` guardado, `X-Content-Type-Options: nosniff` e `Content-Security-Policy: default-src 'none'; sandbox`. O nome do arquivo em disco é `<mediaId>.<extensão>`, sem nenhuma parte vinda de quem envia (BR1.4, BR7.1) | Teste de integração com `mediaId` malformado, com `..` e com `mediaId` inexistente, conferindo os cabeçalhos |
| NFR5.3 | Frases e nomes de arquivo aparecem como texto, sem HTML nem script (BR2.3) | Teste de interface com uma etiqueta de script no título, no texto e no nome do arquivo |
| NFR5.4 | Uma cor só entra no CSS depois de passar por `^#[0-9a-fA-F]{6}$` e ser gravada em minúsculas. Nenhum texto livre vira valor de estilo (BR3.1) | Teste com `red`, `#fff`, `url(...)` e `#12345g`, e com `#ABCDEF` salvo como `#abcdef` |
| NFR5.5 | O limite do envio é de 25 MB de arquivo mais 1 MB de margem do multipart (BR7.4). A rota recusa pelo `Content-Length` quando ele existe e, em qualquer caso, lê o corpo em partes, contando os bytes, e aborta com 413 ao passar do limite. `Content-Length` ausente (chunked) ou menor que o corpo real não escapa da contagem. Só depois o corpo, já limitado, é interpretado como multipart. A memória por envio fica abaixo de 100 MB | Testes com corpo chunked acima do limite, com `Content-Length` menor que o corpo, com 25 MB mais 1 byte de arquivo e com um envio válido de 25 MB, medindo a memória |
| NFR5.6 | Só os momentos de `CUSTOMIZABLE_MOMENTS` com `textEditable` aceitam frase, e `failure` nunca aparece (BR2.2) | Teste de `session_dead` e `not_active` com frase (422) e de `failure` em qualquer rota |
| NFR5.7 | Nenhum arquivo de `src/db/` importa de `src/customization/` (BR7.3) | Teste de arquitetura ao lado do de `tests/u1/architecture.test.ts` |
| NFR6.1 | A personalização não faz nenhuma chamada de rede, e a mídia e as cores vêm só do disco local | Prova registra as requisições durante todo o fluxo |
| NFR7.1 | O produto escreve só em `.vibes/` (banco e `.vibes/media/`). Nada muda em `aidlc/`, `public/` nem em arquivos versionados (BR7.1, BR3.4) | Prova confere o `git status` e as datas dos arquivos fora de `.vibes/` na cópia de teste |

## Riscos aceitos

- Um arquivo de mídia válido (por exemplo, um GIF) pode ser grande e lento de decodificar no navegador. Não há limite de dimensão, só de 25 MB.
- A mídia não é reprocessada nem tem metadados removidos. Ela fica em `.vibes/media/`, que o Git ignora, e só volta ao navegador da mesma máquina.
