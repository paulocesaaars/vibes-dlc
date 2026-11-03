import type { ArtifactContent } from '@/aidlc/artifacts';
import { reviewChecklist } from '@/guide/review-checklist';
import type { ArtifactsState } from '@/web/client/use-artifacts';
import type { ArtifactView } from '@/web/artifact-service';

const OMITTED_TEXT: Record<NonNullable<ArtifactContent['omittedReason']>, string> = {
  too_large:
    'Este arquivo passa de 2 MB, então o guia não o mostra aqui. Abra-o pelo caminho acima.',
  binary: 'Este arquivo não é texto, então o guia não o mostra aqui. Abra-o pelo caminho acima.',
};

const CHANGED_TEXT = 'Este artefato mudou depois da sua revisão. Confira de novo.';

type PillProps = {
  item: ArtifactView;
  isOn: boolean;
  onPick: ((path: string) => void) | null;
};

function ArtifactPill({ item, isOn, onPick }: PillProps) {
  const isReviewed = item.reviewStatus === 'reviewed';
  const classes = ['pillb', isReviewed ? 'pillb-ok' : '', isOn ? 'pillb-on' : ''];
  return (
    <button
      type="button"
      className={classes.filter(Boolean).join(' ')}
      data-testid="artifact-pill"
      data-path={item.path}
      data-status={item.reviewStatus}
      aria-pressed={isOn}
      disabled={!onPick}
      onClick={() => onPick?.(item.path)}
    >
      {isReviewed ? (
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : null}
      <span>{item.name}</span>
      {item.reviewStatus === 'changed' ? <span>· mudou</span> : null}
      {isReviewed ? <span className="visually-hidden"> (revisado)</span> : null}
    </button>
  );
}

type ListProps = {
  title: string;
  state: ArtifactsState;
  items: ArtifactView[];
  selectedPath: string | null;
  canPick: boolean;
};

export function ArtifactList({ title, state, items, selectedPath, canPick }: ListProps) {
  return (
    <section
      className="fade"
      data-testid="artifact-list"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <h2 className="eyebrow" style={{ margin: 0 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map((item) => (
          <ArtifactPill
            key={item.path}
            item={item}
            isOn={item.path === selectedPath}
            onPick={canPick ? state.select : null}
          />
        ))}
      </div>
    </section>
  );
}

/** O conteúdo vai em um `pre`, como texto: o React não interpreta HTML nem carrega nada (BR4.2). */
export function ArtifactCard({ artifact }: { artifact: ArtifactContent }) {
  const name = artifact.path.split('/').at(-1);
  return (
    <div className="card pop" style={{ minWidth: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '2px solid var(--line)' }}>
        <strong style={{ fontWeight: 900 }}>{name}</strong>
        <div
          className="mono"
          data-testid="artifact-path"
          style={{ fontSize: 11, color: 'var(--gray)', overflowWrap: 'anywhere' }}
        >
          {artifact.path}
        </div>
      </div>
      {artifact.content === null ? (
        <p data-testid="artifact-omitted" style={{ margin: 0, padding: 16 }}>
          {artifact.omittedReason ? OMITTED_TEXT[artifact.omittedReason] : ''}
        </p>
      ) : (
        <pre
          className="mono"
          data-testid="artifact-content"
          style={{
            margin: 0,
            padding: 16,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          {artifact.content}
        </pre>
      )}
    </div>
  );
}

export function ArtifactChecklist({ path }: { path: string }) {
  return (
    <div className="fade" data-testid="artifact-checklist">
      <div className="eyebrow" style={{ paddingBottom: 6 }}>
        O que conferir
      </div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {reviewChecklist(path).items.map((item) => (
          <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6A6A6A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flex: 'none', marginTop: 3 }}
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type ReviewPanelProps = { state: ArtifactsState; title: string; showChecklist: boolean };

/** Revisar: a lista, um artefato por vez e o que conferir (BR4.1). */
export function ReviewPanel({ state, title, showChecklist }: ReviewPanelProps) {
  const { list, notice } = state;
  const selected = list?.selected ?? null;
  const shownItem = list?.items.find((item) => item.path === selected?.path);
  const isChanged = shownItem?.reviewStatus === 'changed';
  return (
    <>
      {notice ? (
        <p role="alert" className="notice-error" data-testid="artifact-notice">
          {notice}
        </p>
      ) : null}
      {list && list.items.length > 0 ? (
        <ArtifactList
          title={title}
          state={state}
          items={list.items}
          selectedPath={selected?.path ?? null}
          canPick
        />
      ) : null}
      {isChanged ? (
        <p role="status" className="notice-warn" data-testid="artifact-changed-notice">
          {CHANGED_TEXT}
        </p>
      ) : null}
      {selected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ArtifactCard artifact={selected} />
          {showChecklist ? <ArtifactChecklist path={selected.path} /> : null}
        </div>
      ) : null}
    </>
  );
}
