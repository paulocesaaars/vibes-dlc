import {
  IDLE_OTHER_CLI_TEXT,
  idleNoticeText,
  STEP_LABELS,
  type GuideArt,
} from '@/guide/moment-content';
import type { GuideView } from '@/web/guide-service';

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
      <img
        className={art.animated ? 'art' : 'art art-still'}
        src={art.src}
        alt={art.alt}
        width={216}
        height={216}
      />
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
            <span className="point" data-testid="guide-point">
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

function WarningIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: 'none', marginTop: 3 }}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

/** Aviso ao reabrir o painel, com Entendi, e o momento atual logo abaixo (BR7.1). */
export function ChangedNotice({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div
      className="card pop"
      role="status"
      data-testid="guide-changed-notice"
      style={{
        padding: '12px 14px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px 14px',
        background: 'var(--wash)',
      }}
    >
      <span style={{ flex: '1 1 260px' }}>
        <strong style={{ fontWeight: 900 }}>Enquanto o painel estava fechado:</strong> {text}
      </span>
      <button
        className="btn2"
        type="button"
        data-testid="guide-changed-dismiss-button"
        onClick={onDismiss}
      >
        Entendi
      </button>
    </div>
  );
}

type IdleNoticeProps = {
  minutes: number;
  canResume: boolean;
  resuming: boolean;
  onResume: () => void;
};

/** Faixa de IA parada. Nunca reabre o terminal sozinha nem envia nada (BR3.3). */
export function IdleNotice({ minutes, canResume, resuming, onResume }: IdleNoticeProps) {
  return (
    <div
      className="card pop"
      role="status"
      data-testid="guide-idle-notice"
      style={{
        padding: '12px 14px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px 14px',
        background: 'var(--wash)',
      }}
    >
      <span style={{ flex: '1 1 260px', display: 'flex', gap: 8 }}>
        <WarningIcon />
        <span data-testid="guide-idle-text">
          {idleNoticeText(minutes)}
          {canResume ? null : ` ${IDLE_OTHER_CLI_TEXT}`}
        </span>
      </span>
      {canResume && !resuming ? (
        <button className="btn2" type="button" data-testid="guide-resume-button" onClick={onResume}>
          Retomar
        </button>
      ) : null}
    </div>
  );
}

const RAY_COLORS = ['#FF385C', '#FFD1DA', '#E00B41', '#FFF1B8'];
const RAYS = Array.from({ length: 14 }, (_, index) => ({
  angle: Math.round((index * 360) / 14),
  color: RAY_COLORS[index % 4],
  delay: `${(index % 4) * 40}ms`,
}));

/** Conclusão e trilha concluída: progresso, artefatos revisados e, se faltou algum, um aviso (BR6.1). */
export function ConclusionCard({ view }: { view: GuideView }) {
  const { content, progress, conclusion } = view;
  const scale = progress.total > 0 ? (progress.done / progress.total).toFixed(3) : '0';
  return (
    <div
      data-testid="guide-conclusion"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        paddingTop: 12,
        textAlign: 'center',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="art-cele" src={content.art.src} alt={content.art.alt} />
      <div className="burst" aria-hidden="true" style={{ width: '100%', top: -160 }}>
        {RAYS.map((ray) => (
          <span key={ray.angle} className="b-ray" style={{ transform: `rotate(${ray.angle}deg)` }}>
            <span className="b-bit" style={{ background: ray.color, animationDelay: ray.delay }} />
          </span>
        ))}
      </div>
      <h2 id="guide-instruction" className="big pop" tabIndex={-1} data-testid="guide-instruction">
        {content.title}
      </h2>
      <p data-testid="guide-text" style={{ margin: 0 }}>
        {content.text}
      </p>
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <span className="track">
          <span className="track-fill" style={{ transform: `scaleX(${scale})` }} />
        </span>
        <span data-testid="guide-progress" style={{ fontWeight: 800 }}>
          {progress.done} de {progress.total} etapas aprovadas nesta demanda
        </span>
      </div>
      {conclusion ? (
        <div
          className="card pop"
          style={{
            padding: '14px 18px',
            textAlign: 'left',
            width: '100%',
            maxWidth: 520,
            boxSizing: 'border-box',
            animationDelay: '180ms',
          }}
        >
          <strong style={{ fontWeight: 900, display: 'block' }}>{conclusion.review}</strong>
          <span
            data-testid="guide-conclusion-note"
            data-warning={conclusion.isWarning}
            style={{ color: 'var(--gray)' }}
          >
            {conclusion.note}
          </span>
        </div>
      ) : null}
    </div>
  );
}

const MODE_TEXT = { execute: 'executado', paste: 'colado' } as const;

/** O histórico de U2: a aba própria vem em U3. O texto do comando aparece como texto. */
export function SentCommands({ commands }: { commands: GuideView['sentCommands'] }) {
  return (
    <section
      className="fade"
      data-testid="guide-sent-commands"
      style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <h2 className="eyebrow" style={{ margin: '0 0 8px' }}>
        Comandos enviados pelo painel
      </h2>
      {commands.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--gray)' }}>Nenhum comando enviado pelo painel.</p>
      ) : null}
      {commands.map((command) => (
        <div
          key={command.commandId}
          className="fade"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            padding: '10px 0',
            borderTop: '2px solid var(--line)',
          }}
        >
          <span style={{ fontSize: 14, color: 'var(--gray)' }}>
            {new Date(command.sentAt).toLocaleString('pt-BR')} · {command.stageName} ·{' '}
            {MODE_TEXT[command.mode]}
          </span>
          <code className="mono" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
            {command.text}
          </code>
        </div>
      ))}
    </section>
  );
}
