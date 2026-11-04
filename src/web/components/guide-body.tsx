import { stageName } from '@/guide/stage-content';
import type { ArtifactsState } from '@/web/client/use-artifacts';
import type { GuideView } from '@/web/guide-service';
import { ArtifactList, ReviewPanel } from './artifact-panel';
import {
  ChangedNotice,
  ConclusionCard,
  IdleNotice,
  Say,
  SendCard,
  SentCommands,
  UnderstandCard,
} from './guide-parts';

const NEXT_TEXT_MOMENTS = new Set(['understand', 'send']);

function NextStageHint({ name }: { name: string }) {
  return (
    <div
      data-testid="guide-next-hint"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        color: 'var(--gray)',
        fontSize: 15,
      }}
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{ flex: 'none', marginTop: 3 }}
      >
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5 7V5a3 3 0 0 1 6 0v2" />
      </svg>
      <span>
        Depois vem <strong style={{ fontWeight: 800, color: 'var(--ink)' }}>{name}</strong>. Ela
        abre quando o AI-DLC registrar a aprovação desta etapa.
      </span>
    </div>
  );
}

function ArtifactsOfMoment({ view, artifacts }: { view: GuideView; artifacts: ArtifactsState }) {
  const { moment } = view.decision;
  if (moment === 'review') {
    return <ReviewPanel state={artifacts} title="Arquivos para revisar" showChecklist />;
  }
  const items = artifacts.list?.items ?? [];
  if (moment === 'approve') {
    return items.length > 0 ? (
      <ReviewPanel state={artifacts} title="Arquivos revisados" showChecklist={false} />
    ) : null;
  }
  if (items.length === 0) return null;
  // Em Acompanhar, a lista só mostra o que já foi gravado (BR1.1): a revisão vem depois.
  return (
    <ArtifactList
      title="Arquivos gravados até agora"
      state={artifacts}
      items={items}
      selectedPath={null}
      canPick={false}
    />
  );
}

export type GuideBodyProps = {
  view: GuideView;
  draft: string;
  commandIssue: string | null;
  failure: string | null;
  resuming: boolean;
  changedNotice: string | null;
  artifacts: ArtifactsState;
  onDraft: (value: string) => void;
  onResetDraft: () => void;
  onResume: () => void;
  onDismissChanged: () => void;
};

/** O que o guia mostra em cada momento, a partir de `design/prototipo/Main.dc.html`. */
export function GuideBody(props: GuideBodyProps) {
  const { view, draft, commandIssue, failure, resuming, artifacts } = props;
  const { content, decision } = view;
  const isConcluded = decision.moment === 'conclusion' || decision.moment === 'trail_done';
  const showsSendCard = decision.moment === 'send' || resuming;
  return (
    <>
      {props.changedNotice ? (
        <ChangedNotice text={props.changedNotice} onDismiss={props.onDismissChanged} />
      ) : null}
      {isConcluded ? (
        <ConclusionCard view={view} />
      ) : (
        <Say
          art={content.art}
          eyebrow={content.eyebrow}
          title={content.title}
          text={content.text}
          point={content.point}
        />
      )}
      {decision.moment === 'trail_done' ? <SentCommands commands={view.sentCommands} /> : null}
      {decision.showIdleNotice ? (
        <IdleNotice
          minutes={view.minutesSinceLastChange}
          canResume={decision.sendBlockedReason !== 'other_cli'}
          resuming={resuming}
          onResume={props.onResume}
        />
      ) : null}
      {decision.moment === 'understand' ? (
        <UnderstandCard steps={view.stageContent.howItWorks} />
      ) : null}
      {showsSendCard ? (
        <SendCard
          stageName={stageName(view.stage.stateSlug)}
          value={draft}
          original={view.command}
          issue={commandIssue}
          failure={failure}
          referenceOnly={decision.sendBlockedReason === 'other_cli'}
          onChange={props.onDraft}
          onReset={props.onResetDraft}
        />
      ) : null}
      <ArtifactsOfMoment view={view} artifacts={artifacts} />
      {NEXT_TEXT_MOMENTS.has(decision.moment) && view.nextStage ? (
        <NextStageHint name={view.nextStage.name} />
      ) : null}
    </>
  );
}

export type ConsultBodyProps = {
  stageSlug: string;
  artifacts: ArtifactsState;
};

/** Consulta de uma etapa concluída. Não muda o momento nem o cursor do AI-DLC (BR8.2). */
export function ConsultBody({ stageSlug, artifacts }: ConsultBodyProps) {
  const isEmpty = artifacts.list !== null && artifacts.list.items.length === 0;
  return (
    <div data-testid="guide-consult" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{stageName(stageSlug)}</h2>
      {isEmpty ? (
        <p data-testid="guide-consult-empty" style={{ margin: 0, color: 'var(--gray)' }}>
          Esta etapa não tem artefatos gravados.
        </p>
      ) : null}
      <ReviewPanel state={artifacts} title="Arquivos desta etapa" showChecklist={false} />
    </div>
  );
}
