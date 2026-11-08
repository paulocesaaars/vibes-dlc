# Plano de implementação

Referência: [especificação](SPEC-MULTIPLOS-REPOSITORIOS.md).

## Sequência

1. Separar a configuração do servidor e as preferências no perfil do usuário da raiz do projeto. Manter a instalação central e iniciar esquema novo, sem migração de instalações antigas.
2. Implementar contexto de projeto com identidade de geração, validação de arquivos, troca serializada e encerramento confirmado do terminal. Rejeitar requisições de contextos anteriores.
3. Reconstruir o painel por estado e auditoria do AI-DLC. Remover progresso pessoal, notas, revisões, histórico e consultas de perguntas por comando.
4. Adicionar seletores de projeto e IA ao cabeçalho, projetos recentes, prévia de comandos, criação e troca de demanda. Adaptar somente a barra inicial para Devin.
5. Manter personalização global e remover orientações de instalação. Não implementar importação de dados antigos, conforme ajuste de escopo do usuário.
6. Atualizar README, PRD, TDD e DESIGN; executar lint, formatação, tipos e compilação. Validar seleção, troca, isolamento e reconstrução com arquivos locais de referência.

## Decisões e limites

- Não adicionar dependências nem testes automatizados; usar verificações existentes e validações de execução.
- Preferências no diretório de dados local do usuário; nenhum arquivo novo nos projetos acompanhados.
- Um contexto por servidor, compartilhado por todas as abas.
- O grafo será localizado pelo conteúdo real disponível, sem associá-lo à preferência de IA. Formatos ausentes/incompatíveis geram diagnóstico.
- Abertura da IA permanece manual. A confirmação de envio não prova execução.
- Compatibilidade prática com as três CLIs depende dos ambientes já configurados; comandos seguem a regra testada pelo usuário.
- Não realizar commit ou push neste pedido.

## Execução e validação

Implementação concluída em 6 de novembro de 2026, incluindo a retirada da migração de dados antigos solicitada durante a execução.

- `npm run check`: aprovado, sem erros ou avisos de lint, formatação ou tipos.
- Build de produção: aprovado, sem avisos.
- Navegador: abertura e troca de dois projetos de referência com o mesmo identificador de demanda e artefatos diferentes, sem misturar os contextos.
- Grafo: leitura na localização conhecida em `.claude/` e descoberta em outra pasta de configuração oculta, independente da IA escolhida.
- Terminal: cancelar a troca preserva a sessão; confirmar encerra a sessão e descarta sua identidade e saída. Requisições antigas de contexto e sessão foram rejeitadas com `409`.
- Duas abas: a troca de projeto foi refletida na outra aba do mesmo servidor.
- Envio: repetição do mesmo identificador foi reconhecida sem nova escrita; identificador reutilizado com outro texto e prévia de etapa antiga foram rejeitados.
- Comandos: continuidade, criação com trabalho ativo e análise conferidas na interface; Devin sem a barra inicial e Copilot com barra, preservando `/api/v1` nos argumentos. Claude Code mantém o mesmo formato com barra.
- Arquivos: mudança externa para aprovação pendente foi refletida; conflito de merge gerou estado desatualizado e suspensão do envio.
- Construção por unidade: aprovação de plano na auditoria foi refletida como posição em geração de código, unidade em andamento e artefato correspondente, na versão de produção.
- Preferências: Cancelar restaurou a personalização anterior; IA por projeto foi restaurada ao reabrir o contexto.
- Banco novo: somente `customization_item`, `project_preference` e `schema_migrations` foram encontrados. Nenhum dado auxiliar foi criado nos dois projetos acompanhados.
- Layout: seleção de IA e projeto acessível em viewport de 390 px, sem transbordamento horizontal da página.

As verificações de fluxo usaram arquivos locais de referência e um shell real. Não foram criados testes automatizados, nem executadas tarefas dentro de sessões reais de Claude Code, Devin ou Copilot. A compatibilidade dessas sessões segue a premissa do ambiente já configurado e a regra de comandos testada pelo usuário.
