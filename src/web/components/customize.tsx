'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { MomentArt } from './moment-art';

const SAMPLE_VALUES = {
  etapa: 'Projeto funcional',
  descricao: 'Desenha as regras do trabalho antes do código.',
  nivel: 'feature',
  motivo: 'É uma mudança de tamanho médio.',
};

const FIXED_ITEMS = [
  'O texto de apoio e os rótulos dos botões',
  'Os comandos, os passos e as etapas do AI-DLC',
  'As instruções para quando o guia não funciona',
  'O desenho do logo e o ícone da aba',
];

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
    <li className="cz-row" data-testid={`color-row-${colorKey}`}>
      <label htmlFor={`color-text-${colorKey}`}>{COLOR_LABELS[colorKey]}</label>
      <input
        type="color"
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
      <input
        id={`color-text-${colorKey}`}
        type="text"
        className="mono"
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
      <button
        type="button"
        className="btn2"
        data-testid={`color-reset-${colorKey}`}
        disabled={disabled || !customized}
        onClick={() => onSave(colorKey, null)}
      >
        Voltar ao original
      </button>
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
    </li>
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
    <div className="cz-field">
      <label htmlFor={props.testId}>{props.label}</label>
      {props.multiline ? (
        <textarea rows={3} {...common} onChange={(event) => setDraft(event.target.value)} />
      ) : (
        <input type="text" {...common} onChange={(event) => setDraft(event.target.value)} />
      )}
    </div>
  );
}

export type CustomizeProps = {
  /** Chamada a cada mudança, para o guia aplicar cores e mídia na hora. */
  onChange: (state: CustomizationState) => void;
  /** Concluir e Cancelar voltam à tela anterior. */
  onClose: () => void;
};

/** A tela Personalizar: uma visita com Concluir, Cancelar e Restaurar tudo (BR4). */
export function Customize({ onChange, onClose }: CustomizeProps) {
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

  if (!state) {
    return (
      <section data-testid="customize-screen" aria-busy="true">
        <h1>Personalizar</h1>
        {error ? (
          <p role="alert" className="notice-error" data-testid="customize-error">
            {error}
          </p>
        ) : (
          <div className="cz-skeleton" data-testid="customize-skeleton" role="status">
            Abrindo a personalização…
          </div>
        )}
      </section>
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
    <section data-testid="customize-screen" className="customize">
      <h1>Personalizar</h1>
      <p>As mudanças valem na hora. Concluir mantém tudo, e Cancelar desfaz o que mudou aqui.</p>
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

      <h2>Imagens e vídeos</h2>
      <div className="cz-columns">
        <ul className="cz-moments" aria-label="Momentos">
          {CUSTOMIZABLE_MOMENTS.map((entry) => (
            <li key={entry.momentKey}>
              <button
                type="button"
                data-testid={`moment-${entry.momentKey}`}
                aria-pressed={entry.momentKey === moment.momentKey}
                onClick={() => setSelected(entry.momentKey)}
              >
                {entry.name}
                {state.media[entry.momentKey] ? ' · com mídia' : ''}
              </button>
            </li>
          ))}
        </ul>
        <div className="cz-preview" data-testid="customize-preview">
          <MomentArt art={previewArt(moment, state)} size={160} />
          <strong data-testid="preview-title">{previewTitle}</strong>
          <span data-testid="preview-text">{previewText}</span>
          {media ? (
            <small data-testid="media-size">
              Mídia personalizada: {formatMediaSize(media.sizeBytes)}
            </small>
          ) : null}
        </div>
      </div>
      <div className="cz-field">
        <label htmlFor="media-file">Escolher imagem ou vídeo para {moment.name}</label>
        <input
          id="media-file"
          type="file"
          data-testid="media-file"
          accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void run((id) => uploadCustomMedia(id, moment.momentKey, file));
          }}
        />
        <small>PNG, JPEG, GIF, WebP, MP4 ou WebM, até 25 MB. SVG não é aceito.</small>
      </div>
      <button
        type="button"
        className="btn2"
        data-testid="media-reset"
        disabled={disabled || !media}
        onClick={() => save({ media: { [moment.momentKey]: null } })}
      >
        Voltar ao original
      </button>

      <h2>Frases</h2>
      {moment.textEditable ? (
        <>
          <p data-testid="tokens-hint">
            {tokensHint
              ? `Marcações aceitas neste momento: ${tokensHint}.`
              : 'Este momento não tem marcações.'}
          </p>
          <SayField
            label="Título"
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
            label="Texto"
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
        </>
      ) : (
        <p data-testid="art-only-note">
          Este momento aceita só a imagem ou o vídeo, porque o título dele é a instrução do que
          fazer para destravar o guia.
        </p>
      )}

      <h2>Cores</h2>
      <ul className="cz-colors">
        {COLOR_KEYS.map((key) => (
          <ColorRow
            key={key}
            colorKey={key}
            state={state}
            disabled={disabled}
            onSave={(colorKey, value) => save({ colors: { [colorKey]: value } })}
          />
        ))}
      </ul>

      <h2>Sua IA</h2>
      <fieldset className="cz-field" disabled={disabled}>
        <legend>Qual CLI você usa no terminal?</legend>
        <label>
          <input
            type="radio"
            name="cli-kind"
            data-testid="cli-claude_code"
            checked={state.cliKind === 'claude_code'}
            onChange={() => save({ cliKind: 'claude_code' })}
          />{' '}
          Claude Code
        </label>
        <label>
          <input
            type="radio"
            name="cli-kind"
            data-testid="cli-other"
            checked={state.cliKind === 'other'}
            onChange={() => save({ cliKind: 'other' })}
          />{' '}
          Outra CLI
        </label>
        {state.cliKind === 'other' ? (
          <p data-testid="cli-other-note">
            Com Outra CLI, o guia mostra o comando como referência, sem botão de envio. Você digita
            o equivalente na sua IA.
          </p>
        ) : null}
      </fieldset>

      <h2>O que fica fixo</h2>
      <ul data-testid="fixed-list">
        {FIXED_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {confirmReset ? (
        <div role="alertdialog" aria-label="Confirmar restauração" data-testid="reset-confirm-box">
          <p>Voltar todas as imagens, frases e cores ao original? Sua IA não muda.</p>
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
          <button
            type="button"
            className="btn2"
            data-testid="customize-reset-cancel"
            onClick={() => setConfirmReset(false)}
          >
            Não
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn2"
          data-testid="customize-reset"
          disabled={disabled}
          onClick={() => setConfirmReset(true)}
        >
          Restaurar tudo
        </button>
      )}
      <div className="cz-actions">
        <button
          type="button"
          className="cta"
          data-testid="customize-done"
          disabled={disabled}
          onClick={() => void finish('done')}
        >
          Concluir
        </button>
        <button
          type="button"
          className="btn2"
          data-testid="customize-cancel"
          disabled={busy || !visitId}
          onClick={() => void finish('cancel')}
        >
          Cancelar
        </button>
      </div>
    </section>
  );
}
