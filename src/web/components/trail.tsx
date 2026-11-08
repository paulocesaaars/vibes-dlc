'use client';

import { useState } from 'react';
import type { TrailStatus } from '@/core/types';
import type { TrailPhase } from '@/web/workspace-service';

const CHECK_PATH = 'M20 6 9 17l-5-5';
/** Recuos do desenho da trilha no protótipo. */
const WINDING_PADS = [0, 14, 26, 14];

const STATUS_TEXT: Record<TrailStatus, string> = {
  done: 'concluída',
  current: 'etapa atual',
  previous: 'anterior',
  blocked: 'bloqueada',
  skipped: 'pulada',
};

const DOT_CLASS: Record<TrailStatus, string> = {
  done: 'dot d-done',
  current: 'dot d-now',
  previous: 'dot d-prev',
  blocked: 'dot d-lock',
  skipped: 'dot d-skip',
};

const NODE_CLASS: Record<TrailStatus, string> = {
  done: 'node',
  current: 'node n-now',
  previous: 'node n-pend',
  blocked: 'node n-pend',
  skipped: 'node n-skip',
};

function StageDot({ status, number }: { status: TrailStatus; number: string }) {
  return (
    <span className={DOT_CLASS[status]} aria-hidden="true">
      {status === 'done' ? (
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
      ) : null}
      {status === 'current' ? number : null}
      {status === 'blocked' ? (
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
      ) : null}
    </span>
  );
}

type StageButtonProps = {
  stage: TrailPhase['stages'][number];
  index: number;
  onSelect: (slug: string) => void;
};

/**
 * Só a etapa atual e as concluídas abrem. Selecionar nunca oferece comando (BR8.2). `previous` é uma
 * etapa por onde a Unidade já passou: mostra o texto "anterior", sem cadeado e sem afirmar conclusão.
 */
function StageButton({ stage, index, onSelect }: StageButtonProps) {
  const opens = stage.status === 'done' || stage.status === 'current';
  return (
    <button
      type="button"
      className={NODE_CLASS[stage.status]}
      data-testid={`trail-stage-${stage.slug}`}
      data-status={stage.status}
      style={{
        animationDelay: `${Math.min(index * 40, 300)}ms`,
        paddingLeft: WINDING_PADS[index % WINDING_PADS.length],
      }}
      disabled={!opens}
      aria-current={stage.status === 'current' ? 'step' : undefined}
      onClick={() => onSelect(stage.slug)}
    >
      <StageDot status={stage.status} number={stage.number} />
      <span style={{ minWidth: 0 }}>
        {stage.status === 'current' ? <span className="you">Você está aqui</span> : null}
        {stage.name}
        {stage.unit ? (
          <span className="node-unit" data-testid="trail-unit">
            {stage.unit}
          </span>
        ) : null}
        {stage.status === 'previous' ? (
          <span className="node-unit">{STATUS_TEXT.previous}</span>
        ) : (
          <span className="visually-hidden"> ({STATUS_TEXT[stage.status]})</span>
        )}
      </span>
    </button>
  );
}

type TrailProps = { phases: TrailPhase[]; onSelect: (slug: string) => void };

/** A trilha por fase. O status tem ícone e texto, além da cor (BR8.1, NFR10.1). */
export function Trail({ phases, onSelect }: TrailProps) {
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  return (
    <nav
      className="rail"
      aria-label="Trilha de etapas"
      data-testid="guide-trail"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {phases.map((phase) => {
        const open = toggled[phase.name] ?? phase.isCurrent;
        return (
          <div key={phase.name} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button
              type="button"
              className={phase.isCurrent ? 'ph ph-on' : 'ph'}
              data-testid={`trail-phase-${phase.name}`}
              aria-expanded={open}
              onClick={() => setToggled((value) => ({ ...value, [phase.name]: !open }))}
            >
              <span>{phase.label}</span>
              <span>
                {phase.done}/{phase.total}
              </span>
            </button>
            {open ? (
              <div style={{ display: 'flex', flexDirection: 'column', paddingTop: 4 }}>
                {phase.stages.map((stage, index) => (
                  <StageButton key={stage.slug} stage={stage} index={index} onSelect={onSelect} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
