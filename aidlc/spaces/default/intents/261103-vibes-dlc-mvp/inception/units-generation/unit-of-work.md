# Unidades de trabalho: MVP do Vibes DLC

Base: `inception/domain-design/components.md`, `inception/domain-design/decisions.md`, `inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md` e as respostas de `units-generation-questions.md`.

**Implantação:** um único processo Next.js, sem implantação separada. As Unidades são fatias de construção do mesmo app. Todas são `shared`, exceto a instalação, que é a forma de entrega.

| Unit ID | Directory | Kind | Deployment model | Complexity |
|---|---|---|---|---|
| U1 | `u1-walking-skeleton` | `service` | shared | L |
| U2 | `u2-guide-flow` | `service` | shared | L |
| U3 | `u3-demands` | `service` | shared | M |
| U4 | `u4-customization` | `service` | shared | M |
| U5 | `u5-install` | `packaging` | standalone | S |

## U1. `u1-walking-skeleton`

- **Descrição:** a menor fatia integrada, em uso real, com os quatro itens de `scope-document.md`.
- **Limites:** cobre o caminho principal de uma etapa, até o comando chegar ao terminal e o guia reagir aos arquivos. Os demais momentos do guia usam a instrução genérica até U2.
- **Responsabilidades:**
  - base do projeto: Next.js, TypeScript, lint, testes e o comando único de verificação;
  - `Config` e a escuta em `127.0.0.1`, com a rejeição de `Origin` e `Host` de fora e o alerta de exposição;
  - `Terminal`: Git Bash real, sessão que sobrevive ao recarregar, recolher e encerrar;
  - `AidlcReader`: cursores, `aidlc-state.md`, grafo de etapas e observador de arquivos;
  - `Core`: momentos de Entender, Enviar e Acompanhar, e a regra de envio;
  - `Db`: banco, migrações e `SentCommand`;
  - `Web`: estrutura de duas colunas, guia da etapa e cartão de comando.
- **Componentes:** `Config`, `Terminal`, `AidlcReader`, `Core`, `Db`, `Web` e a parte necessária de `GuideContent`.
- **Notas:** a verificação é um script automático no navegador, com o painel e o Git Bash reais, mais uma conferência de quem desenvolve (`team-practices.md`). Esta Unidade valida os riscos do `TDD.md`: `node-pty` com Git Bash, `node:sqlite` e latência do SSE.

## U2. `u2-guide-flow`

- **Descrição:** a condução completa de uma etapa, do acompanhamento à conclusão.
- **Limites:** todos os momentos da tabela de `inception/refined-mockups/interaction-spec.md`, exceto falha e demanda não ativa.
- **Responsabilidades:**
  - pergunta registrada, com `aidlc engine log answers` e a reserva;
  - faixa de IA parada;
  - Revisar, com hash e lista do que conferir;
  - Aprovar, conclusão e liberação da etapa seguinte;
  - reabrir o painel e avisar o que mudou;
  - trilha das etapas.
- **Componentes:** `Core`, `AidlcReader`, `GuideContent`, `Db` e `Web`.
- **Notas:** confirma nesta execução os sinais ainda em hipótese, como `[R]`, conforme `FEEDBACK-AIDLC.md`.

## U3. `u3-demands`

- **Descrição:** criar demandas, escolher entre elas e consultar o que foi produzido.
- **Limites:** não muda a condução da etapa.
- **Responsabilidades:**
  - Início e lista de demandas, com estados vazio e parcial;
  - nova demanda em três passos e `Triage`;
  - demanda não ativa, com a faixa e o comando de ativação;
  - abas Artefatos, Unidades e ciclos, Decisões e Histórico, com notas.
- **Componentes:** `Triage`, `AidlcReader`, `Core`, `Db` e `Web`.
- **Notas:** a tabela de descrições e níveis de AC2.1.2 é fixada no design funcional desta Unidade.

## U4. `u4-customization`

- **Descrição:** a tela Personalizar e a escolha da CLI.
- **Limites:** nunca muda estrutura, etapas, comandos, terminal ou desenho do logo.
- **Responsabilidades:**
  - imagens, vídeos e frases por momento;
  - cores, derivadas e avisos de contraste;
  - seção Sua IA, e o passo Enviar para outra CLI.
- **Componentes:** `Customization`, `Db`, `Core` e `Web`.
- **Notas:** o ciclo de tipos entre `Db` e `Customization`, apontado na revisão do design de domínio e aceito como risco, é resolvido no design funcional desta Unidade.

## U5. `u5-install`

- **Descrição:** o que leva o produto ao repositório de outra pessoa e explica quando ele não pode funcionar.
- **Limites:** não muda arquivos existentes do repositório do usuário.
- **Responsabilidades:**
  - execução a partir de uma subpasta própria, localizando a raiz do repositório;
  - `README` de instalação;
  - verificação da versão do Node.js;
  - tela de falha: sem AI-DLC, registro ilegível e sem Git Bash.
- **Componentes:** `Config`, `AidlcReader` e `Web`.
- **Notas:** o teste da instalação em um repositório limpo, com espaços no caminho, faz parte desta Unidade. O U1 já roda neste repositório, sem as instruções de instalação.

## Assumptions & Open Questions

- [assumption] `u5-install` é `packaging` por entregar principalmente a forma de instalação, embora a tela de falha tenha um pouco de interface.
- [open] O nome da subpasta de instalação é definido no design de U5.
