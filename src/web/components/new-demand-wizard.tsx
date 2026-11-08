'use client';

import { useEffect, type ReactNode } from 'react';
import { ScreenFrame } from './screen-frame';
import { LEVELS } from '@/guide/levels';
import { suggestLevel, type Level } from '@/triage/suggest-level';
import { Say } from './guide-parts';

export type DemandDraft = { step: 1 | 2 | 3; description: string; level: Level; showAll: boolean };

export function NewDemandWizard({
  draft,
  onDraftChange,
  notices,
  preview,
  disabled,
  onCancel,
  onChange,
  onPrepare,
  onAnalyze,
}: {
  draft: DemandDraft;
  onDraftChange: (draft: DemandDraft) => void;
  notices: ReactNode;
  preview: ReactNode;
  disabled: boolean;
  onCancel: () => void;
  onChange: () => void;
  onPrepare: (description: string, level: Level) => void;
  onAnalyze: (description: string) => void;
}) {
  const { step, description, level, showAll } = draft;
  const update = (changes: Partial<DemandDraft>) => onDraftChange({ ...draft, ...changes });
  const suggestion = suggestLevel(description);
  const selected = LEVELS.find((item) => item.name === level)!;

  useEffect(() => {
    document.getElementById(step === 1 ? 'demand-description' : 'guide-instruction')?.focus();
  }, [step]);

  return (
    <ScreenFrame
      testId="new-demand-wizard"
      notices={notices}
      band={
        <div className="band">
          <button
            className="btn2"
            disabled={disabled}
            onClick={() => {
              if (step === 1) onCancel();
              else {
                update({ step: step === 3 ? 2 : 1 });
                onChange();
              }
            }}
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < 3 ? (
            <button
              className="cta"
              disabled={disabled || !description.trim()}
              onClick={() => {
                if (step === 1) update({ step: 2 });
                else {
                  update({ step: 3 });
                  onPrepare(description, level);
                }
              }}
            >
              {step === 1 ? 'Continuar' : `Usar ${selected.label}`}
            </button>
          ) : (
            <button
              className="cta"
              disabled={disabled}
              onClick={() => onPrepare(description, level)}
            >
              Conferir comando
            </button>
          )}
          {step > 1 ? (
            <button className="btn2" disabled={disabled} onClick={onCancel}>
              Cancelar demanda
            </button>
          ) : null}
        </div>
      }
    >
      <Say
        art={{
          src:
            step === 1
              ? '/guia/nix-base.webp'
              : step === 2
                ? '/guia/pergunta.webp'
                : '/guia/comando.webp',
          alt: 'Nix orientando a nova demanda',
        }}
        eyebrow={`Nova demanda · ${step} de 3`}
        title={
          step === 1
            ? 'Conte o que precisa ser feito'
            : step === 2
              ? `Sugiro o nível ${LEVELS.find((item) => item.name === suggestion.scope)!.label}`
              : 'Confira antes de começar'
        }
        text={
          step === 1
            ? 'Uma ou duas frases bastam. Com isso eu sugiro o tamanho certo do fluxo.'
            : step === 2
              ? `${suggestion.reason} A escolha é sua: confirme ou veja os outros níveis.`
              : 'Confira a descrição e o nível. O comando só será enviado após sua confirmação.'
        }
      />
      {step === 1 ? (
        <div className="stack-8">
          <label htmlFor="demand-description">O que precisa ser feito?</label>
          <textarea
            id="demand-description"
            className="field"
            rows={5}
            maxLength={4000}
            value={description}
            disabled={disabled}
            onChange={(event) => {
              update({
                description: event.target.value,
                level: suggestLevel(event.target.value).scope,
              });
              onChange();
            }}
          />
        </div>
      ) : step === 2 ? (
        <div className="stack-10">
          {(showAll ? LEVELS : LEVELS.filter((item) => item.name === level)).map((item) => (
            <button
              key={item.name}
              type="button"
              className={item.name === level ? 'scope scope-on' : 'scope'}
              aria-pressed={item.name === level}
              disabled={disabled}
              onClick={() => {
                update({ level: item.name });
                onChange();
              }}
            >
              <span className="scope-head">
                <strong>{item.label}</strong>
                {item.name === suggestion.scope ? <span className="eyebrow">Sugerido</span> : null}
              </span>
              <span>{item.description}</span>
              <span className="row-meta">Profundidade {item.depth}</span>
            </button>
          ))}
          <div className="workspace-actions">
            <button className="btn2" onClick={() => update({ showAll: !showAll })}>
              {showAll ? 'Ver somente a escolha' : 'Ver todos os níveis'}
            </button>
            <button className="btn2" disabled={disabled} onClick={() => onAnalyze(description)}>
              Pedir análise à sua IA
            </button>
          </div>
        </div>
      ) : (
        <div className="card card-pad stack-8">
          <strong>{selected.label}</strong>
          <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{description}</p>
          <p>{selected.description}</p>
        </div>
      )}
      {preview}
    </ScreenFrame>
  );
}
