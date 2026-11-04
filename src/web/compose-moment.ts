import type { GuideDecision } from '@/core/types';
import type { CustomizationState } from '@/customization/customization-service';
import { applyTokens } from '@/customization/tokens';
import { findMoment } from '@/guide/customizable-moments';
import type { GuideArt, MomentContent } from '@/guide/moment-content';

/** Chave do momento na lista de personalização, ou `null` quando o momento não é personalizável. */
export function momentKeyOf(decision: GuideDecision): string | null {
  if (decision.moment === 'failure') return null;
  // Na vez da pessoa, o texto de "following" é outro e fica fixo.
  if (decision.moment === 'following' && decision.turn !== 'ai') return null;
  return decision.moment;
}

/** Arte personalizada: a mídia do momento no lugar da original, que fica como reserva. */
export function customArt(
  original: GuideArt,
  media: { url: string; contentType: string } | undefined,
): GuideArt {
  if (!media) return original;
  return {
    src: media.url,
    alt: 'Mídia personalizada',
    animated: true,
    kind: media.contentType.startsWith('video/') ? 'video' : 'image',
    fallback: original,
  };
}

/**
 * Monta o conteúdo com a personalização: troca título e texto pelas frases e as marcações pelos
 * valores do contexto, e a arte pela mídia. `GuideContent` continua estático (`functional-spec.md`).
 */
export function composeContent(
  content: MomentContent,
  momentKey: string | null,
  custom: CustomizationState | null,
  values: Readonly<Record<string, string | undefined>>,
): MomentContent {
  const moment = momentKey ? findMoment(momentKey) : undefined;
  if (!custom || !moment || !momentKey) return content;
  const says = moment.textEditable ? custom.says[momentKey] : undefined;
  return {
    ...content,
    title: says?.title ? applyTokens(says.title, moment.tokens, values) : content.title,
    text: says?.text ? applyTokens(says.text, moment.tokens, values) : content.text,
    art: customArt(content.art, custom.media[momentKey]),
  };
}
