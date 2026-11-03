import type { GuideView } from '@/web/guide-service';

export const CONSULT_BAND_TEXT = 'Você está consultando. O guia continua de onde parou.';

export type BandProps = {
  view: GuideView;
  /** A pessoa pediu para retomar, e os botões de envio aparecem com o cartão. */
  resuming: boolean;
  /** Há um problema no texto do comando, ou um envio em andamento. */
  sendBlocked: boolean;
  /** Marcar como revisado: `null` quando não há artefato na tela. */
  canMarkReviewed: boolean;
  consulting: boolean;
  onUnderstood: () => void;
  onSend: (mode: 'execute' | 'paste') => void;
  onNewSession: () => void;
  onRetry: () => void;
  onMarkReviewed: () => void;
  onNextStage: () => void;
  onBackToGuide: () => void;
};

function bandClass(view: GuideView): string {
  const { moment } = view.decision;
  if (moment === 'conclusion' || moment === 'trail_done') return 'band band-ok';
  return view.content.bandWaiting ? 'band band-wait' : 'band';
}

/**
 * Faixa inferior: uma ação principal por momento, ou o que está sendo aguardado (BR4.4). Não existe
 * botão de aprovar: quem registra a aprovação é o AI-DLC, no terminal (BR5.1).
 */
export function GuideBand(props: BandProps) {
  const { view, resuming, sendBlocked, consulting } = props;
  const { content, decision } = view;

  if (consulting) {
    return (
      <div className="band" data-testid="guide-band">
        <span className="band-txt" data-testid="guide-band-text">
          {CONSULT_BAND_TEXT}
        </span>
        <button
          className="cta"
          type="button"
          data-testid="guide-back-button"
          onClick={props.onBackToGuide}
        >
          Voltar ao guia
        </button>
      </div>
    );
  }

  const offersSend = decision.primaryAction === 'send' || resuming;
  const blocked = sendBlocked || !decision.canSend;
  return (
    <div className={bandClass(view)} data-testid="guide-band">
      {content.bandText ? (
        <span className="band-txt" data-testid="guide-band-text">
          {content.bandText}
        </span>
      ) : null}
      {offersSend ? (
        <button
          className="btn2"
          type="button"
          data-testid="guide-paste-button"
          disabled={blocked}
          onClick={() => props.onSend('paste')}
        >
          Colar sem executar
        </button>
      ) : null}
      {offersSend ? (
        <button
          className="cta"
          type="button"
          data-testid="guide-send-button"
          disabled={blocked}
          onClick={() => props.onSend('execute')}
        >
          {resuming ? 'Enviar agora' : content.primaryLabel}
        </button>
      ) : null}
      {decision.primaryAction === 'understood' ? (
        <button
          className="cta"
          type="button"
          data-testid="guide-understood-button"
          onClick={props.onUnderstood}
        >
          {content.primaryLabel}
        </button>
      ) : null}
      {decision.primaryAction === 'new_session' ? (
        <button
          className="cta"
          type="button"
          data-testid="guide-new-session-button"
          onClick={props.onNewSession}
        >
          {content.primaryLabel}
        </button>
      ) : null}
      {decision.primaryAction === 'retry' ? (
        <button
          className="cta"
          type="button"
          data-testid="guide-retry-button"
          onClick={props.onRetry}
        >
          {content.primaryLabel}
        </button>
      ) : null}
      {decision.primaryAction === 'mark_reviewed' ? (
        <button
          className="cta"
          type="button"
          data-testid="guide-mark-reviewed-button"
          disabled={!props.canMarkReviewed}
          onClick={props.onMarkReviewed}
        >
          {content.primaryLabel}
        </button>
      ) : null}
      {decision.primaryAction === 'next_stage' ? (
        <button
          className="cta"
          type="button"
          data-testid="guide-next-stage-button"
          onClick={props.onNextStage}
        >
          {content.primaryLabel}
        </button>
      ) : null}
    </div>
  );
}
