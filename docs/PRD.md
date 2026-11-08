# PRD — Vibes DLC

## Objetivo

Permitir acompanhar e conduzir trabalhos de AI-DLC em diferentes repositórios locais, com uma
instalação central do Vibes e um terminal real ao lado. A pessoa escolhe o projeto e a IA;
o framework registra o andamento e as aprovações, e o painel apresenta esses arquivos.

## Público e premissas

Pessoas de engenharia que já usam AI-DLC e ferramentas de IA por terminal. Os projetos estão
preparados e as ferramentas instaladas e autenticadas. O Vibes não instala, configura ou
autentica AI-DLC, harnesses ou ferramentas de IA.

## Requisitos

1. Uma instalação acompanha um repositório por vez, selecionado pelo caminho local absoluto.
   A seleção oferece uma janela para navegar pelas pastas locais. A lista de recentes permite
   reabrir projetos e remover atalhos, preservando a preferência de IA e a sessão ativa.
2. Os seletores Projeto e IA ficam no cabeçalho principal e permanecem acessíveis nas consultas.
   Projeto exibe nome e caminho; IA oferece Claude Code, Devin e GitHub Copilot.
3. A escolha de IA é local por projeto. Claude Code é o padrão para projetos novos.
   Trocar a escolha altera os comandos seguintes e não substitui a ferramenta aberta.
4. O terminal abre na raiz do projeto e aceita qualquer comando digitado pela pessoa.
   Abrir a ferramenta de IA é uma ação manual.
5. Criar, analisar, continuar e ativar demandas oferece prévia e confirmação explícita.
   Há execução com Enter e colagem sem Enter. O envio não avança o estado do painel.
6. Comandos de Claude Code e Copilot começam com `/aidlc`; de Devin, com `aidlc`.
   Essa regra segue os testes informados pelo usuário e pressupõe a integração já funcionando.
7. Demandas, etapas, unidades, artefatos, decisões e aprovações vêm exclusivamente dos registros
   compatíveis do AI-DLC. A preferência de IA não participa da leitura.
8. O painel consulta os arquivos a cada dois segundos e também permite atualização manual.
   Trabalho feito com o painel fechado é apresentado na próxima leitura.
9. A trilha usa as marcas do estado; a posição por unidade considera a auditoria.
   A aprovação confirmada exige o evento correspondente, sem confundir gate de unidade com etapa.
10. Artefatos são consultados como texto, sem execução de HTML. Arquivos binários e maiores
    que 2 MB são identificados para abertura no editor.
11. Somente a demanda ativa recebe continuidade. Outras demandas podem ser consultadas e
    ativadas por comando confirmado.
12. Perguntas e respostas continuam no terminal e podem aparecer como registros nas decisões.
    Não há contador de perguntas pendentes obtido por execução de comandos.
13. Preferências visuais são globais por usuário: cores, frases e mídias dos estados disponíveis.
    Cancelar reverte a visita atual; Concluir mantém suas alterações.
14. Somente preferências são persistidas no perfil local do usuário. Não há dados próprios
    gravados nos projetos nem banco para compartilhar pelo Git.
15. Uma troca de projeto valida o destino antes de alterar o contexto. Com terminal vivo,
    exige confirmação para interrompê-lo. Falha de encerramento impede a troca.
16. Todas as abas do servidor acompanham o mesmo projeto; comandos de contexto ou sessão antigos
    são rejeitados. A troca de IA invalida prévias anteriores.
17. O painel informa falhas de leitura e dados desatualizados e suspende envio dependente de
    estado inválido. Ausência de mudança não prova atividade nem inatividade da IA.
18. A interface está em português do Brasil; comandos, caminhos e saída da CLI preservam o original.
19. O servidor escuta localmente por padrão. Sua exposição à rede é configurável, com alerta,
    e dá acesso ao shell da máquina a quem alcançar o painel.

## Continuidade compartilhada

Depois de compartilhar os arquivos do AI-DLC pelo Git, outro desenvolvedor abre seu clone no
Vibes e acompanha o estado registrado. Conversas, sessões de terminal e alterações não enviadas
ao Git não são transferidas. O Vibes não executa operações de Git automaticamente.

## Recursos pessoais excluídos

Não existem notas próprias sobre artefatos, marcações de revisão, histórico persistido de
comandos, reconhecimento de conclusões ou progresso dos cinco passos. Não há inferência de
execução a partir de colagem ou envio. A consulta humana de artefatos permanece disponível,
e as aprovações continuam nos gates do AI-DLC.

## Fora de escopo

- Múltiplos projetos simultâneos na mesma instância.
- Contas, autenticação, serviço central e sincronização em tempo real.
- Configuração de ambientes, instalação e tutoriais de preparação.
- APIs de modelos, conexão com versões web ou ambientes remotos das ferramentas de IA.
- Abertura automática ou transferência de conversa entre ferramentas.
- Importação ou compatibilidade com bancos antigos do Vibes.
- Notas ou arquivos de trabalho compartilhados próprios do painel.
- Deploy, métricas de produção, operações no host de código e automação de Git.

## Limitações

O leitor suporta o contrato de arquivos descrito no TDD. Um projeto pode funcionar na CLI e
usar um formato ainda não reconhecido pelo painel. A IA escolhida no seletor deve corresponder
à ferramenta aberta manualmente no terminal; o Vibes não identifica a CLI pela saída.

As datas de alteração são datas locais dos arquivos e podem mudar em um clone ou pull.
A retomada entre desenvolvedores é do estado registrado pelo framework, sem a conversa da IA.

## Referências

[Arquitetura](TDD.md), [design](DESIGN.md) e [especificação](SPEC-MULTIPLOS-REPOSITORIOS.md).
