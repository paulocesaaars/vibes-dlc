# Unidades: perguntas

**Já decidido:** um único processo Next.js, sem implantação separada (`TDD.md`), trabalho em série (`aidlc-state.md`) e primeira Unidade como fatia fina de ponta a ponta (`team-practices.md`). A ordem de construção das demais fica para o planejamento de entrega.

## Q1. [Arquitetura] Como dividir o MVP em Unidades?

Cada Unidade passa por design, código e testes, e é aprovada e enviada ao GitHub ao terminar. Unidades menores dão mais pontos de retorno, mas repetem esse ciclo mais vezes.

A. Cinco Unidades pela jornada: fatia de ponta a ponta, condução completa da etapa, demandas e consulta, personalização, e instalação e falhas
B. Uma Unidade por componente, nove no total, cada uma sem a jornada completa
C. Duas Unidades: fatia de ponta a ponta e todo o restante
X. Other (please specify)

[Answer]: A

## Q2. [Arquitetura] A proteção do terminal entra já na primeira Unidade?

A primeira Unidade já abre um shell real no navegador. Escutar só em `127.0.0.1` e rejeitar `Origin` e `Host` de fora (US1.3) é o que impede uma página aberta em outra aba de enviar comandos a esse shell.

A. Sim, já na primeira Unidade, junto com o terminal
B. Só a escuta em `127.0.0.1` na primeira, e a checagem de origem depois
C. Tudo na Unidade de instalação e falhas
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- **`u1-walking-skeleton` (`service`):** a fatia de ponta a ponta, com o terminal real, a proteção de origem, a leitura da etapa e o envio com confirmação. Não depende de nenhuma.
- **`u2-guide-flow` (`service`):** a condução completa da etapa, com acompanhamento, IA parada, revisão, aprovação, conclusão, retomada e trilha. Depende de U1.
- **`u3-demands` (`service`):** nova demanda, sugestão de nível, Início, demanda não ativa e abas de consulta. Depende de U1.
- **`u4-customization` (`service`):** personalização e Sua IA. Depende de U1.
- **`u5-install` (`packaging`):** instalação em subpasta, `README` e telas de falha. Depende de U1.
- **Implantação:** um único processo, sem implantação separada. A proteção do terminal entra em U1. U2, U3, U4 e U5 não dependem entre si, e a ordem delas fica para o planejamento de entrega.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
