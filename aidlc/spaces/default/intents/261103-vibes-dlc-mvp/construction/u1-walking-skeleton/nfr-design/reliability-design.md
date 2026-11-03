# Design de confiabilidade: u1-walking-skeleton

Base: `nfr-requirements/reliability-requirements.md` e `functional-design/functional-spec.md`.

## Isolamento de falhas

| Falha | Efeito | O que continua funcionando |
|---|---|---|
| Leitura do AI-DLC (NFR1.2) | Mantém a última leitura válida e tenta de novo. Depois de 10 segundos, mostra a falha | O terminal |
| Git Bash ausente (BR3.2) | `missing_shell`, com o caminho procurado | A leitura da etapa |
| Shell terminou (NFR2.6) | Registro `dead`, com a oferta de Nova sessão | A leitura da etapa |
| Stream caiu (NFR2.5) | O navegador reconecta sozinho, com `afterSeq` | A sessão, sem interrupção |
| Escrita no terminal falhou | `failed` e 500, com o texto preservado no campo | O guia, que continua no passo Enviar |
| Migração falhou (NFR12.2) | O início é interrompido | Nada: é uma falha fatal, com a cópia preservada |

## Início do processo

Ordem, com a falha de cada passo:

1. Validar a versão do Node.js e as variáveis (NFR9.1). Falha fatal, com a mensagem.
2. Localizar a raiz do repositório. A falta de `aidlc/` não interrompe o início, e o guia mostra a falha.
3. Criar `.vibes/`, copiar o banco se houver migração pendente e migrar (NFR12.1). Falha fatal.
4. Marcar como `failed` os comandos ainda em `pending` (NFR12.3), porque nenhum processo anterior pode concluí-los.
5. Escutar no endereço configurado.

## Envio

Cada estado é gravado em uma transação própria. O envio não usa nova tentativa automática: depois de um `failed`, só uma nova confirmação gera um novo `commandId`. Uma falha entre a escrita no terminal e a gravação de `written` deixa a linha em `pending`, e ela vira `failed` no início seguinte. Se a gravação falhar com o processo vivo, a linha também passa a `failed` no próximo início, e a interface mostra que não sabe se o comando chegou, em vez de oferecer o reenvio como seguro. Nesse caso raro, o comando chegou ao terminal e o histórico não o mostra, o que é preferível a repeti-lo sem aviso.

## Encerramento

Ao parar com aviso, em `dev` ou `start`, o processo trata os sinais de encerramento: encerra o shell com a árvore de processos dele e fecha o banco. Se o processo cair sem aviso, no Windows um `bash.exe` pode continuar vivo. Para limitar isso, o servidor grava em `.vibes/terminal.pid` o PID do shell, o PID dele próprio e o horário em que o shell abriu. No início seguinte, o shell só é encerrado se o servidor dono não existir mais, se o PID ainda for um `bash.exe` e se ele tiver aberto nesse horário. Assim, um segundo `npm run dev` não derruba a sessão do primeiro, e um PID reaproveitado por outro Git Bash da pessoa fica intacto. O início seguinte trata a sessão como `server_stopped`. A conferência no início de U1 confirma esse comportamento no Windows.

## Testes e plataforma

- **NFR11.1:** um comando local único roda lint, tipos e testes com cobertura de linhas, com mínimo de 80%.
- **NFR9.2:** a prova automática usa o Edge já instalado, e a conferência final usa o Chrome.
- **NFR10.1:** as ações são elementos nativos, e a prova cobre F6.
- **NFR8.1:** os textos da interface ficam no módulo `guide`, em português.
