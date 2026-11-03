# Decisões de arquitetura: MVP do Vibes DLC

Decisões tomadas sobre os componentes de `components.md`, a partir de `inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md`, `inception/practices-discovery/team-practices.md` e `domain-design-questions.md`.

## ADR-001: Regras do guia isoladas em um Core sem infraestrutura

- **Context:** o momento do guia combina arquivos do AI-DLC, progresso salvo, sessão do terminal e preferência de CLI, com 12 regras de prioridade (`inception/refined-mockups/interaction-spec.md`). O produto precisa de 80% de cobertura, e o `TDD.md` já define que o `core` não conhece Next.js, SQLite nem o terminal.
- **Decision:** o `Core` recebe um retrato dos sinais e devolve o momento e as ações permitidas, sem entrada nem saída. `Web` compõe os demais componentes e entrega o retrato ao `Core`.
- **Consequences:** as regras são testáveis por tabela, sem terminal ou arquivos. Em contrapartida, `Web` concentra a composição e precisa de disciplina para não acumular regras, o que é conferido na revisão do diff. **Segurança:** as regras de confirmação e de demanda ativa ficam em um só lugar e são testadas diretamente.
- **Alternatives Rejected:**
  - Regras nas rotas: mais simples no início, mas exigiria subir o servidor para testar e espalharia a regra de envio.
  - `Core` com interfaces para banco, terminal e arquivos: dá mais isolamento, mas o custo da indireção não se justifica em um app de um único processo.

## ADR-002: Perguntas abertas vêm do comando de leitura do AI-DLC

- **Context:** a lista `open` de `aidlc engine log answers` é o sinal confirmado de pergunta registrada (`FEEDBACK-AIDLC.md`). O comando tem regras próprias, como uma resposta que fecha várias perguntas do mesmo menu. A prática aprovada diz que o módulo `aidlc` só lê arquivos.
- **Decision:** o `AidlcReader` executa esse comando com limite de tempo. Se ele faltar, falhar ou demorar, o sinal fica indisponível, e o guia usa a instrução genérica. A prática passa a ser "só lê arquivos e executa comandos de leitura" (RA Q1 de `domain-design-questions.md`).
- **Consequences:** o guia usa a mesma regra do framework e não a copia. Em contrapartida, depende do comando `aidlc` no ambiente do painel, e cada consulta cria um processo, o que pede consultas só quando os arquivos mudam. **Segurança:** o comando é fixo, sem texto de artefato nos argumentos além do identificador da etapa, validado, e sem shell intermediário.
- **Alternatives Rejected:**
  - Ler o `audit/` diretamente: mantém a prática ao pé da letra, mas copia regras que podem mudar entre versões.
  - Comando com reserva no `audit/`: é mais robusto, mas mantém as duas implementações.

## ADR-003: O banco guarda só o que o AI-DLC não guarda

- **Context:** o `TDD.md` dizia que o banco guarda demandas, nível e estado. Como cada demanda é um intent, uma cópia pode divergir dos arquivos, que são a fonte da verdade.
- **Decision:** o banco guarda passo do guia, artefatos revisados, notas, comandos enviados e personalização, ligados ao identificador do intent. Demanda, etapas e decisões são sempre lidas dos arquivos.
- **Consequences:** não há reconciliação de duas fontes, e reabrir o painel depende só de ler os arquivos. Em contrapartida, a lista de demandas exige ler vários registros, o que deve ser acompanhado na primeira fatia. Um intent apagado deixa dados órfãos no banco, que ficam sem uso. **Segurança:** nenhuma cópia de conteúdo do repositório fica fora do Git.
- **Alternatives Rejected:**
  - Cópia completa da demanda: abre mais rápido, mas pode divergir.
  - Arquivos JSON em `.vibes/`: dispensa essas tabelas, mas mantém dois mecanismos de gravação.

## ADR-004: A escolha da CLI fica em Customization

- **Context:** "Sua IA" fica na tela de personalização (RM Q6) e é a exceção aprovada à regra de que a personalização não muda o conteúdo.
- **Decision:** `Customization` possui `AiCliPreference`. `Core` recebe o valor no retrato de sinais e decide entre enviar e orientar.
- **Consequences:** a tela e a gravação ficam juntas, e a regra de comportamento fica no `Core`. Em contrapartida, `Customization` passa a ter um dado que afeta o comportamento, e essa exceção precisa continuar sendo a única. **Segurança:** a preferência só retira a opção de envio. Não abre nenhum caminho novo ao terminal.
- **Alternatives Rejected:**
  - Componente próprio de preferências: com um único valor, não se justifica.
  - Valor no `Core`: colocaria persistência e tela em um componente que não tem entrada nem saída.

## ADR-005: Os comandos do AI-DLC são montados no AidlcReader

- **Context:** o formato dos comandos depende do framework instalado, como as demais leituras. O `TDD.md` já coloca a montagem no módulo `aidlc`.
- **Decision:** o `AidlcReader` monta os comandos, e o `Core` só decide se eles podem ser oferecidos. `Web` envia o texto confirmado ao `Terminal`.
- **Consequences:** uma mudança no framework fica em um só componente. Em contrapartida, o nome `AidlcReader` cobre também uma função que não é de leitura, o que fica registrado aqui. **Segurança:** o texto sempre passa pelo cartão de confirmação, e nomes vindos de arquivos são validados antes de entrar no comando.
- **Alternatives Rejected:**
  - Montar no `Core`: faria o `Core` conhecer o formato do AI-DLC.
  - Módulo próprio de comandos: pouco código para justificar a separação no MVP.

## ADR-006: Demanda ativa conferida no momento do envio

- **Context:** enviar um comando olhando para outra demanda faria a IA trabalhar na demanda errada, e a demanda ativa pode mudar com o painel aberto (R-05 da revisão das histórias).
- **Decision:** `Web` pede a `AidlcReader` a demanda ativa de novo no momento do envio, e o `Core` recusa o envio se ela for outra. A mudança também chega à tela pelo observador de arquivos.
- **Consequences:** o envio à demanda errada só ocorre se a troca acontecer no intervalo entre a conferência e a escrita, o que é aceito. Em contrapartida, cada envio faz uma leitura a mais. **Segurança:** reforça a supervisão, sem substituir a confirmação da pessoa.
- **Alternatives Rejected:**
  - Confiar só na tela: uma aba antiga poderia enviar à demanda errada.
  - Travar o cursor do AI-DLC: o produto não pode escrever nesses arquivos.

## Assumptions & Open Questions

- [assumption] O limite de tempo do comando de leitura é definido no design funcional.
- [open] A prática "o módulo `aidlc` só lê arquivos" em `team.md` precisa dizer "e executa comandos de leitura". Só a etapa de práticas altera esse arquivo, então a decisão fica registrada aqui até uma nova rodada.
