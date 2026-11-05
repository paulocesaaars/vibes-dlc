import type { ReactNode } from 'react';

export type ScreenFrameProps = {
  testId: string;
  /** Avisos do guia que valem em qualquer tela. */
  notices?: ReactNode;
  /** Faixa fixa no pé da tela, com as ações. */
  band?: ReactNode;
  busy?: boolean;
  className?: string;
  children: ReactNode;
};

/** Área rolável e faixa inferior, a estrutura de todas as telas em `Main.dc.html`. */
export function ScreenFrame({
  testId,
  notices,
  band,
  busy,
  className,
  children,
}: ScreenFrameProps) {
  return (
    <section
      className={className ? `screen ${className}` : 'screen'}
      data-testid={testId}
      aria-busy={busy || undefined}
    >
      <div className="scroll">
        <div className="scroll-body">
          {notices}
          {children}
        </div>
      </div>
      {band}
    </section>
  );
}
