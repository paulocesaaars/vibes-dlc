import { STEP_LABELS, type GuideArt } from '@/guide/moment-content';
import type { TrailPhase } from '@/web/guide-service';

const CHECK_PATH = 'M20 6 9 17l-5-5';

function StageDot({
  status,
  number,
}: {
  status: TrailPhase['stages'][number]['status'];
  number: string;
}) {
  if (status === 'done') {
    return (
      <span className="dot d-done" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={CHECK_PATH} />
        </svg>
      </span>
    );
  }
  if (status === 'now') {
    return (
      <span className="dot d-now" aria-hidden="true">
        {number}
      </span>
    );
  }
  if (status === 'skipped') return <span className="dot d-skip" aria-hidden="true" />;
  return (
    <span className="dot d-lock" aria-hidden="true">
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5 7V5a3 3 0 0 1 6 0v2" />
      </svg>
    </span>
  );
}

const STATUS_TEXT = {
  done: 'concluída',
  now: 'etapa atual',
  pending: 'ainda não aberta',
  skipped: 'fora do plano',
} as const;

/** Trilha mínima de U1, com a aparência do protótipo. A trilha completa vem em U2. */
export function Trail({ phases }: { phases: TrailPhase[] }) {
  return (
    <nav
      className="rail"
      aria-label="Trilha de etapas"
      data-testid="guide-trail"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {phases.map((phase) => (
        <div key={phase.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div className={phase.isCurrent ? 'ph ph-on' : 'ph'}>
            <span>{phase.label}</span>
            <span>
              {phase.done}/{phase.total}
            </span>
          </div>
          {phase.isCurrent ? (
            <ul style={{ margin: 0, padding: '4px 0 0', listStyle: 'none' }}>
              {phase.stages.map((stage) => (
                <li
                  key={stage.slug}
                  className="node"
                  aria-current={stage.status === 'now' ? 'step' : undefined}
                >
                  <StageDot status={stage.status} number={stage.number} />
                  <span
                    className={
                      stage.status === 'now'
                        ? 'n-now'
                        : stage.status === 'skipped'
                          ? 'n-skip'
                          : stage.status === 'pending'
                            ? 'n-pend'
                            : undefined
                    }
                    style={{ minWidth: 0 }}
                  >
                    {stage.status === 'now' ? <span className="you">Você está aqui</span> : null}
                    {stage.name}
                    <span style={{ position: 'absolute', left: -9999 }}>
                      {' '}
                      ({STATUS_TEXT[stage.status]})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </nav>
  );
}

export function StepBar({ stepNumber }: { stepNumber: number }) {
  if (stepNumber === 0) return null;
  const label = `Passo ${stepNumber} de ${STEP_LABELS.length}: ${STEP_LABELS[stepNumber - 1]}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div className="seg-wrap" role="img" aria-label={label}>
        {STEP_LABELS.map((step, index) => {
          const position = index + 1;
          const state =
            position < stepNumber ? ' seg-on' : position === stepNumber ? ' seg-now' : '';
          return (
            <span key={step} className={`seg${state}`}>
              <span className="seg-fill" />
            </span>
          );
        })}
      </div>
      <span
        data-testid="guide-step-label"
        style={{ fontSize: 13, fontWeight: 800, color: 'var(--gray)' }}
      >
        {label}
      </span>
    </div>
  );
}

export type SayProps = {
  art: GuideArt;
  eyebrow: string;
  title: string;
  text: string;
  point?: string | null;
};

/** O balão do guia. Os textos são renderizados como texto, nunca como HTML (NFR5.1). */
export function Say({ art, eyebrow, title, text, point }: SayProps) {
  return (
    <div className="say" role="status">
      {/* As artes são arquivos locais em WebP animado, sem a otimização de imagem do Next. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="art art-still" src={art.src} alt={art.alt} width={216} height={216} />
      <div className="bubble">
        <div className="eyebrow">{eyebrow}</div>
        <strong
          id="guide-instruction"
          className="b-title"
          tabIndex={-1}
          data-testid="guide-instruction"
        >
          {title}
        </strong>
        <span data-testid="guide-text">{text}</span>
        {point ? (
          <div>
            <span className="point">
              {point}
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function UnderstandCard({ steps }: { steps: string[] }) {
  return (
    <div
      className="card fade"
      data-testid="guide-understand-card"
      style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      <div className="eyebrow">Como esta etapa funciona</div>
      {steps.map((step, index) => (
        <div
          key={step}
          className="pop"
          style={{
            animationDelay: `${index * 90}ms`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <span className="num" aria-hidden="true">
            {index + 1}
          </span>
          <span style={{ paddingTop: 3 }}>{step}</span>
        </div>
      ))}
    </div>
  );
}

type SendCardProps = {
  stageName: string;
  value: string;
  original: string;
  issue: string | null;
  failure: string | null;
  onChange: (value: string) => void;
  onReset: () => void;
};

/** Campo editável do comando, com o lembrete de BR5.6. Só uma linha é aceita (BR5.5). */
export function SendCard(props: SendCardProps) {
  return (
    <div
      className="card fade"
      data-testid="guide-send-card"
      style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', alignItems: 'baseline' }}>
        <label htmlFor="cmd" style={{ fontWeight: 800 }}>
          Comando que vai para a sua IA
        </label>
        <span data-testid="guide-send-stage" style={{ fontSize: 14, color: 'var(--gray)' }}>
          {props.stageName}
        </span>
      </div>
      <textarea
        id="cmd"
        className="field mono"
        data-testid="guide-command-input"
        rows={2}
        style={{ fontSize: 14 }}
        value={props.value}
        aria-invalid={props.issue !== null}
        onChange={(event) => props.onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
      />
      {props.issue ? (
        <p role="alert" className="notice-error" data-testid="guide-command-issue">
          {props.issue}
        </p>
      ) : null}
      {props.failure ? (
        <p role="alert" className="notice-error" data-testid="guide-send-failure">
          {props.failure}
        </p>
      ) : null}
      <p
        data-testid="guide-send-reminder"
        style={{ margin: 0, fontSize: 15, color: 'var(--gray)' }}
      >
        A sua IA precisa estar aberta no terminal para receber este comando.
      </p>
      {props.value !== props.original ? (
        <div>
          <button
            className="btn2"
            type="button"
            data-testid="guide-command-reset-button"
            onClick={props.onReset}
          >
            Restaurar original
          </button>
        </div>
      ) : null}
    </div>
  );
}
