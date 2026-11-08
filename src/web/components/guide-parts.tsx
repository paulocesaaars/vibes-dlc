import type { GuideArt } from '@/guide/moment-content';
import { MomentArt } from './moment-art';

export function Say({
  art,
  eyebrow,
  title,
  text,
}: {
  art: GuideArt;
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="say" role="status">
      <MomentArt art={art} />
      <div className="bubble">
        <div className="eyebrow">{eyebrow}</div>
        <strong id="guide-instruction" className="b-title" tabIndex={-1}>
          {title}
        </strong>
        <span>{text}</span>
      </div>
    </div>
  );
}
