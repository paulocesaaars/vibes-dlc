'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { COLOR_KEYS, COLOR_LABELS, type ColorKey, validateColor } from '@/customization/colors';
import { applyTokens, MAX_TEXT_LENGTH, MAX_TITLE_LENGTH } from '@/customization/tokens';
import { CUSTOMIZABLE_MOMENTS, type CustomizableMoment } from '@/guide/customizable-moments';
import type { GuideArt } from '@/guide/moment-content';
import {
  type CustomizationPutBody,
  type CustomizationResult,
  type CustomizationState,
  finishCustomizationVisit,
  openCustomizationVisit,
  putCustomization,
  uploadCustomMedia,
} from '@/web/client/customization-api';
import { Say } from './guide-parts';
import { MomentArt } from './moment-art';
import { ScreenFrame } from './screen-frame';

const SAMPLE_VALUES = {
  etapa: 'Projeto funcional',
  descricao: 'Desenha as regras do trabalho antes do código.',
  nivel: 'Funcionalidade',
  motivo: 'É uma mudança de tamanho médio.',
};

const COLOR_HINTS: Record<ColorKey, string> = {
  brand: 'Fundo do logo e nome Vibes DLC',
  accent: 'Botões, progresso e destaques',
  text: 'Títulos e texto principal',
  muted: 'Rótulos e descrições',
  bg: 'Página e cartões',
  soft: 'Áreas leves e fase atual',
  line: 'Linhas e divisórias',
  ok: 'Etapas concluídas',
};

const cardStack = { display: 'flex', flexDirection: 'column', gap: 14 } as const;

const INTRO_ART: GuideArt = { src: '/guia/nix-base.webp', alt: 'Nix, a lulu da pomerânia' };
const INTRO_TITLE = 'Deixe o guia do seu jeito';
const INTRO_TEXT =
  'Troque as imagens, as cores e as frases. A trilha do AI-DLC, as etapas e o logo do Vibes DLC continuam iguais.';

/** Tamanho da mídia em MB, com vírgula, para a pessoa acompanhar o espaço em disco (NFR12.1). */
function formatMediaSize(sizeBytes: number): string {
  return `${(sizeBytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** O contrato de `GuideArt` para a prévia: a mídia personalizada, ou a arte original do momento. */
function previewArt(moment: CustomizableMoment, state: CustomizationState): GuideArt {
  const original: GuideArt = { src: moment.defaultArtSrc, alt: `Arte original de ${moment.name}` };
  const media = state.media[moment.momentKey];
  if (!media) return original;
  return {
    src: media.url,
    alt: 'Mídia personalizada',
    animated: true,
    kind: media.contentType.startsWith('video/') ? 'video' : 'image',
    fallback: original,
  };
}

type ColorRowProps = {
  colorKey: ColorKey;
  state: CustomizationState;
  disabled: boolean;
  onSave: (colorKey: ColorKey, value: string | null) => void;
};

function ColorRow({ colorKey, state, disabled, onSave }: ColorRowProps) {
  const effective = state.colors.effective[colorKey];
  const customized = state.colors.custom[colorKey] !== undefined;
  const [draft, setDraft] = useState(effective);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [seen, setSeen] = useState(effective);
  // Ajuste durante a renderização: uma cor vinda do servidor substitui o rascunho.
  if (seen !== effective) {
    setSeen(effective);
    setDraft(effective);
  }
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const invalid = validateColor(draft) === null;
  const warning = state.warnings.find((entry) => entry.colorKey === colorKey);
  return (
    <div className="cz-color" data-testid={`color-row-${colorKey}`}>
      <input
        type="color"
        className="swatch"
        aria-label={`${COLOR_LABELS[colorKey]}: seletor de cor`}
        data-testid={`color-picker-${colorKey}`}
        value={validateColor(draft) ?? effective}
        disabled={disabled}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => onSave(colorKey, value), 250);
        }}
      />
      <div className="cz-color-info">
        <label htmlFor={`color-text-${colorKey}`}>{COLOR_LABELS[colorKey]}</label>
        <span className="row-meta small">{COLOR_HINTS[colorKey]}</span>
        <input
          id={`color-text-${colorKey}`}
          type="text"
          className="field mono cz-hex"
          data-testid={`color-${colorKey}`}
          value={draft}
          maxLength={7}
          spellCheck={false}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={(event) => {
            setDraft(event.target.value);
            if (validateColor(event.target.value)) onSave(colorKey, event.target.value);
          }}
        />
        {customized ? (
          <button
            type="button"
            className="cz-link"
            data-testid={`color-reset-${colorKey}`}
            disabled={disabled}
            onClick={() => onSave(colorKey, null)}
          >
            Voltar ao original
          </button>
        ) : null}
        {invalid ? (
          <p role="alert" className="cz-note" data-testid={`color-invalid-${colorKey}`}>
            Use o formato #rrggbb, como #ff385c.
          </p>
        ) : null}
        {warning ? (
          <p className="cz-warning" data-testid="contrast-warning" role="status">
            <span aria-hidden="true">⚠ </span>
            {warning.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type SayFieldProps = {
  label: string;
  testId: string;
  momentKey: string;
  field: 'title' | 'text';
  value: string | undefined;
  placeholder: string;
  multiline: boolean;
  maxLength: number;
  disabled: boolean;
  onSave: (value: string | null) => void;
};

function SayField(props: SayFieldProps) {
  const { value, onSave } = props;
  const [draft, setDraft] = useState(value ?? '');
  const [seen, setSeen] = useState(`${props.momentKey}:${value ?? ''}`);
  const identity = `${props.momentKey}:${value ?? ''}`;
  if (seen !== identity) {
    setSeen(identity);
    setDraft(value ?? '');
  }
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === (value ?? '')) return;
    onSave(trimmed === '' ? null : trimmed);
  };
  const common = {
    id: props.testId,
    'data-testid': props.testId,
    value: draft,
    maxLength: props.maxLength,
    placeholder: props.placeholder,
    disabled: props.disabled,
    onBlur: commit,
  };
  return (
    <div className="stack-6">
      <label htmlFor={props.testId} className="field-label">
        {props.label}
      </label>
      {props.multiline ? (
        <textarea
          rows={4}
          className="field"
          {...common}
          onChange={(event) => setDraft(event.target.value)}
        />
      ) : (
        <input
          type="text"
          className="field"
          {...common}
          onChange={(event) => setDraft(event.target.value)}
        />
      )}
    </div>
  );
}

export type CustomizeProps = {
  /** Chamada a cada mudança, para o guia aplicar cores e mídia na hora. */
  onChange: (state: CustomizationState) => void;
  /** Concluir e Cancelar voltam à tela anterior. */
  onClose: () => void;
  notices?: ReactNode;
};

/** A tela Personalizar: uma visita com Concluir, Cancelar e Restaurar tudo (BR4). */
export function Customize({ onChange, onClose, notices }: CustomizeProps) {
  const [state, setState] = useState<CustomizationState | null>(null);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [selected, setSelected] = useState(CUSTOMIZABLE_MOMENTS[0]?.momentKey ?? 'home');
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const started = useRef(false);

  const accept = useCallback(
    (result: CustomizationResult): boolean => {
      if (result.ok) {
        setState(result.state);
        onChange(result.state);
        setError(null);
        return true;
      }
      setError(result.message);
      setStale(result.code === 'stale_visit');
      return false;
    },
    [onChange],
  );

  const begin = useCallback(async () => {
    try {
      const result = await openCustomizationVisit();
      if (accept(result) && result.ok) {
        setVisitId(result.state.visitId);
        setStale(false);
      }
    } catch {
      setError('O painel não respondeu. Tente de novo.');
    }
  }, [accept]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void begin();
  }, [begin]);

  const run = useCallback(
    async (work: (id: string) => Promise<CustomizationResult>) => {
      if (!visitId || busy) return false;
      setBusy(true);
      try {
        return accept(await work(visitId));
      } catch {
        setError('O painel não respondeu. Tente de novo.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [accept, busy, visitId],
  );

  const save = (patch: CustomizationPutBody) => void run((id) => putCustomization(id, patch));
  const finish = async (how: 'done' | 'cancel') => {
    const closed = await run((id) => finishCustomizationVisit(id, how));
    if (closed) onClose();
  };

  const intro = (
    <Say art={INTRO_ART} eyebrow="Personalizar" title={INTRO_TITLE} text={INTRO_TEXT} />
  );

  if (!state) {
    return (
      <ScreenFrame testId="customize-screen" notices={notices} busy>
        {intro}
        {error ? (
          <p role="alert" className="notice-error" data-testid="customize-error">
            {error}
          </p>
        ) : (
          <div className="stack-8" data-testid="customize-skeleton" role="status">
            <span className="visually-hidden">Abrindo a personalização…</span>
            <div className="skel" aria-hidden="true" />
            <div className="skel" aria-hidden="true" />
            <div className="skel" aria-hidden="true" />
          </div>
        )}
      </ScreenFrame>
    );
  }

  const moment =
    CUSTOMIZABLE_MOMENTS.find((entry) => entry.momentKey === selected) ??
    (CUSTOMIZABLE_MOMENTS[0] as CustomizableMoment);
  const says = state.says[moment.momentKey] ?? {};
  const media = state.media[moment.momentKey];
  const previewTitle = applyTokens(says.title ?? moment.defaultTitle, moment.tokens, SAMPLE_VALUES);
  const previewText = applyTokens(says.text ?? moment.defaultText, moment.tokens, SAMPLE_VALUES);
  const disabled = busy || stale || !visitId;
  const tokensHint = moment.tokens.map((token) => `{${token}}`).join(', ');

  return (
    <ScreenFrame
      testId="customize-screen"
      notices={notices}
      band={
        confirmReset ? (
          <div
            className="band"
            role="alertdialog"
            aria-label="Confirmar restauração"
            data-testid="reset-confirm-box"
          >
            <span className="band-txt">
              Voltar todas as imagens, frases e cores ao original? Sua IA não muda.
            </span>
            <button
              type="button"
              className="btn2"
              data-testid="customize-reset-cancel"
              onClick={() => setConfirmReset(false)}
            >
              Não
            </button>
            <button
              type="button"
              className="cta"
              data-testid="customize-reset-confirm"
              disabled={disabled}
              onClick={() => {
                setConfirmReset(false);
                save({ resetAll: true });
              }}
            >
              Sim, restaurar
            </button>
          </div>
        ) : (
          <div className="band" data-testid="customize-band">
            <span className="band-txt">
              Cancelar desfaz o que você mudou agora e volta ao início.
            </span>
            <button
              type="button"
              className="btn2"
              data-testid="customize-cancel"
              disabled={busy || !visitId}
              onClick={() => void finish('cancel')}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn2"
              data-testid="customize-reset"
              disabled={disabled}
              onClick={() => setConfirmReset(true)}
            >
              Restaurar tudo
            </button>
            <button
              type="button"
              className="cta"
              data-testid="customize-done"
              disabled={disabled}
              onClick={() => void finish('done')}
            >
              Concluir
            </button>
          </div>
        )
      }
    >
      {intro}
      {error ? (
        <div role="alert" className="notice-error" data-testid="customize-error">
          {error}
          {stale ? (
            <button
              type="button"
              className="btn2"
              data-testid="customize-reopen"
              onClick={() => void begin()}
            >
              Reabrir a personalização
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section className="card card-pad" style={cardStack}>
          <h2 className="section-title">Imagens, vídeos e frases</h2>
          <div className="stack-6">
            <label htmlFor="moment-select" className="field-label">
              Momento do guia
            </label>
            <select
              id="moment-select"
              className="field"
              data-testid="moment-select"
              value={moment.momentKey}
              onChange={(event) => setSelected(event.target.value)}
            >
              {CUSTOMIZABLE_MOMENTS.map((entry) => (
                <option key={entry.momentKey} value={entry.momentKey}>
                  {entry.name}
                  {state.media[entry.momentKey] ? ' · com mídia' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="cz-media">
            <div className="cz-media-side">
              <div className="cz-preview" data-testid="customize-preview">
                <MomentArt art={previewArt(moment, state)} size={196} />
                <strong data-testid="preview-title">{previewTitle}</strong>
                <span className="row-meta" data-testid="preview-text">
                  {previewText}
                </span>
                {media ? (
                  <small data-testid="media-size">
                    Mídia personalizada: {formatMediaSize(media.sizeBytes)}
                  </small>
                ) : null}
              </div>
              <label htmlFor="media-file" className="field-label" style={{ fontSize: 14 }}>
                Trocar imagem ou vídeo
              </label>
              <input
                id="media-file"
                type="file"
                className="cz-file"
                data-testid="media-file"
                accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm"
                disabled={disabled}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (file) void run((id) => uploadCustomMedia(id, moment.momentKey, file));
                }}
              />
              <small className="row-meta small">
                PNG, JPEG, GIF, WebP, MP4 ou WebM, até 25 MB. SVG não é aceito.
              </small>
              {media ? (
                <button
                  type="button"
                  className="btn2"
                  data-testid="media-reset"
                  disabled={disabled}
                  onClick={() => save({ media: { [moment.momentKey]: null } })}
                >
                  Usar a original
                </button>
              ) : null}
            </div>
            <div className="cz-media-fields">
              {moment.textEditable ? (
                <>
                  <SayField
                    label="Título da frase"
                    testId="say-title"
                    momentKey={moment.momentKey}
                    field="title"
                    value={says.title}
                    placeholder={moment.defaultTitle}
                    multiline={false}
                    maxLength={MAX_TITLE_LENGTH}
                    disabled={disabled}
                    onSave={(value) => save({ says: { [moment.momentKey]: { title: value } } })}
                  />
                  <SayField
                    label="Frase"
                    testId="say-text"
                    momentKey={moment.momentKey}
                    field="text"
                    value={says.text}
                    placeholder={moment.defaultText}
                    multiline
                    maxLength={MAX_TEXT_LENGTH}
                    disabled={disabled}
                    onSave={(value) => save({ says: { [moment.momentKey]: { text: value } } })}
                  />
                  <p className="row-meta" style={{ margin: 0 }} data-testid="tokens-hint">
                    {tokensHint
                      ? `Marcações aceitas neste momento: ${tokensHint}.`
                      : 'Este momento não tem marcações.'}
                  </p>
                </>
              ) : (
                <p className="muted" data-testid="art-only-note">
                  Este momento aceita só a imagem ou o vídeo, porque o título dele é a instrução do
                  que fazer para destravar o guia.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="card card-pad" style={cardStack}>
          <h2 className="section-title">Cores</h2>
          <div className="cz-colors">
            {COLOR_KEYS.map((key) => (
              <ColorRow
                key={key}
                colorKey={key}
                state={state}
                disabled={disabled}
                onSave={(colorKey, value) => save({ colors: { [colorKey]: value } })}
              />
            ))}
          </div>
          <div>
            <button
              type="button"
              className="btn2"
              data-testid="colors-reset"
              disabled={disabled || Object.keys(state.colors.custom).length === 0}
              onClick={() =>
                save({
                  colors: Object.fromEntries(
                    Object.keys(state.colors.custom).map((key) => [key, null]),
                  ),
                })
              }
            >
              Usar as cores originais
            </button>
          </div>
        </section>

        <p className="muted" style={{ fontSize: 15 }} data-testid="fixed-list">
          Ficam fixos: a trilha e as etapas do AI-DLC, os comandos, o logo do Vibes DLC e o
          terminal.
        </p>
      </div>
    </ScreenFrame>
  );
}
