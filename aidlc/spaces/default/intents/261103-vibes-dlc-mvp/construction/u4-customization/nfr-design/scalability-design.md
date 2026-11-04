# Design de escala: u4-customization

Base: `nfr-requirements/scalability-requirements.md`.

## Linhas (NFR12.3)

`customization_item` guarda até 53 linhas, com `item_key` como chave primária. A leitura é uma varredura da tabela inteira, sem índice extra. A conferência contra `CUSTOMIZABLE_MOMENTS` no teste mantém a conta honesta: 8 cores, 28 frases (14 momentos editáveis com título e texto), 16 mídias e Sua IA.

## Disco (NFR12.1)

Cada momento guarda no máximo uma mídia, então o teto teórico é de 16 arquivos de 25 MB (400 MB). Trocar a mídia de um momento deixa o arquivo antigo até Concluir, depois o apaga. A tela mostra o tamanho de cada mídia, para a pessoa saber o que ocupa o disco. Não há limite além do de cada arquivo.

## O que não escala, por decisão

Uma visita, uma fila de gravação e um servidor, porque o uso é local e de uma pessoa. Nenhum cache de mídia no servidor.
