# Desempenho: u1-walking-skeleton

Base: `inception/requirements-analysis/requirements.md` e `functional-design/rules.md`.

| ID | Requisito | Meta | Como é medido |
|---|---|---|---|
| NFR1.1 | Uma mudança em `aidlc/` aparece no painel aberto (BR4.7) | Até 3 segundos | Prova da fatia: altera um arquivo observado e mede até a tela mudar |
| NFR2.1 | Eco de uma tecla no terminal (BR3.9) | Até 150 ms em 95% das teclas | Prova da fatia: 100 teclas, com app e navegador na mesma máquina |
| NFR2.2 | Memória usada pela saída do terminal (BR3.4) | Até 5 MB ou 2000 quebras de linha, o que vier primeiro | Teste do `Terminal`: gera mais saída que o limite e confere a janela |

A reaplicação da saída ao recarregar não tem meta própria. A prova registra o tempo com a janela cheia, e quem desenvolve avalia na conferência.

Os limites de 3 segundos e 150 ms são padrões sem medição anterior. Se o eco não atingir a meta, a troca de transporte fica isolada no módulo `terminal`, e quem desenvolve decide.
