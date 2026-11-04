# Desempenho: u4-customization

Base: `inception/requirements-analysis/requirements.md`, `functional-design/functional-spec.md` e `functional-design/rules.md`.

Medição das provas de tempo: cronômetro do script do navegador (Playwright), 10 repetições, valendo o percentil 95, no mesmo computador. U4 não muda o observador de arquivos do AI-DLC, então a meta de 3 segundos do NFR1 de `requirements.md` continua a de U1.

| ID | Requisito | Meta | Como é medido |
|---|---|---|---|
| NFR1.1 | Abrir Personalizar e ler a personalização (`GET /api/customization`) | Até 300 ms, com 53 linhas em `customization_item` e sem ler nenhum arquivo de mídia | Teste de integração com o banco cheio |
| NFR1.2 | Salvar uma cor, uma frase ou Sua IA (`PUT /api/customization`) e a prévia refletir | Até 500 ms entre a ação e a prévia atualizada | Prova de U4 |
| NFR1.3 | Enviar uma mídia de 25 MB e vê-la na prévia | Até 5 segundos, sem trazer o arquivo inteiro de volta ao navegador além do que a prévia exibe | Prova de U4 com um arquivo de 25 MB |
| NFR1.4 | Servir a mídia ao guia (`GET /api/customization/media/{mediaId}`) | Começa a responder em até 200 ms e aceita `Range` para vídeo | Teste de integração |
| NFR1.5 | Aplicar as cores | Sem recarregar a página nem piscar o conteúdo, trocando só variáveis CSS | Teste de interface |
