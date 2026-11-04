# Escala: u4-customization

Base: `functional-design/functional-spec.md` e `inception/requirements-analysis/requirements.md`.

| ID | Requisito | Meta | Verificação |
|---|---|---|---|
| NFR12.3 | Linhas em `customization_item` | Até 53: 8 cores, 28 frases (14 momentos com `textEditable`, com título e texto), 16 mídias e Sua IA | Teste do `Db` com o conjunto completo, conferido contra `CUSTOMIZABLE_MOMENTS` |
| NFR12.1 | Espaço em disco da mídia | Até 16 arquivos de 25 MB (400 MB), sem limite imposto além do de cada arquivo. A tela mostra o tamanho de cada mídia | Prova de U4 com 3 mídias grandes |
