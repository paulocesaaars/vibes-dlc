/** Alerta permanente, em todas as telas e sem botão de fechar (BR1.2). */
export function ExposureAlert({ host }: { host: string }) {
  return (
    <div role="alert" data-testid="exposure-alert" className="exposure-alert">
      Risco: o painel está escutando em {host}. Qualquer pessoa na sua rede pode executar comandos
      nesta máquina. Volte VIBES_HOST para 127.0.0.1.
    </div>
  );
}
