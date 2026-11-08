'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { AI_OPTIONS, type AiKind } from '@/core/commands';

const OPTIONS = Object.entries(AI_OPTIONS) as [AiKind, string][];
const LOGOS: Record<AiKind, string> = {
  claude_code: '/ai/claude.svg',
  devin: '/ai/devin.svg',
  copilot: '/ai/copilot.svg',
};

export function PickerChevron() {
  return (
    <svg
      className="picker-chevron"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function AiLogo({ ai }: { ai: AiKind }) {
  return <Image src={LOGOS[ai]} width={22} height={22} alt="" aria-hidden="true" unoptimized />;
}

/** Lista com identidade visual local, seleção por teclado e foco mantido no controle. */
export function AiPicker({
  value,
  disabled,
  onChange,
}: {
  value: AiKind;
  disabled: boolean;
  onChange: (value: AiKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const search = useRef({ text: '', at: 0 });
  const expanded = open && !disabled;

  useEffect(() => {
    if (disabled || !restoreFocus.current) return;
    restoreFocus.current = false;
    if (document.activeElement === document.body) trigger.current?.focus();
  }, [disabled]);

  useEffect(() => {
    if (!expanded) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [expanded]);

  function choose(index: number) {
    const option = OPTIONS[index];
    if (!option || disabled) return;
    setOpen(false);
    trigger.current?.focus();
    if (option[0] !== value) {
      restoreFocus.current = true;
      onChange(option[0]);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    const selected = OPTIONS.findIndex(([ai]) => ai === value);
    if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false);
      if (event.key === 'Escape' && expanded) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (expanded) choose(active);
      else {
        setActive(selected);
        setOpen(true);
      }
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? OPTIONS.length - 1
            : !expanded
              ? selected
              : (active + (event.key === 'ArrowDown' ? 1 : -1) + OPTIONS.length) % OPTIONS.length;
      setActive(next);
      setOpen(true);
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const now = Date.now();
      search.current = {
        text: (now - search.current.at < 700 ? search.current.text : '') + event.key.toLowerCase(),
        at: now,
      };
      const match = OPTIONS.findIndex(([, label]) =>
        label.toLowerCase().startsWith(search.current.text),
      );
      if (match >= 0) {
        event.preventDefault();
        setActive(match);
        setOpen(true);
      }
    }
  }

  return (
    <div
      className="ai-picker"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="context-picker"
        role="combobox"
        aria-label={`IA do projeto: ${AI_OPTIONS[value]}`}
        aria-haspopup="listbox"
        aria-expanded={expanded}
        aria-controls={id}
        aria-activedescendant={expanded ? `${id}-${active}` : undefined}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onClick={() => {
          setActive(OPTIONS.findIndex(([ai]) => ai === value));
          setOpen((current) => !current);
        }}
      >
        <span>IA:</span>
        <AiLogo ai={value} />
        <span className="picker-label">{AI_OPTIONS[value]}</span>
        <PickerChevron />
      </button>
      {expanded ? (
        <div id={id} className="ai-options" role="listbox" aria-label="Ferramentas de IA">
          {OPTIONS.map(([ai, label], index) => (
            <div
              key={ai}
              id={`${id}-${index}`}
              role="option"
              aria-selected={ai === value}
              className={`ai-option${active === index ? ' ai-option-active' : ''}`}
              onPointerMove={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <AiLogo ai={ai} />
              <span className="picker-label">{label}</span>
              <span className="picker-check" aria-hidden="true">
                {ai === value ? '✓' : ''}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
