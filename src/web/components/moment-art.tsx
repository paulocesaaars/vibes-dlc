'use client';

import { useEffect, useRef, useState } from 'react';
import type { GuideArt } from '@/guide/moment-content';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

function ArtView({ art, size }: { art: GuideArt; size: number }) {
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const shown = failed && art.fallback ? art.fallback : art;
  const isVideo = shown.kind === 'video';
  useEffect(() => {
    // Com redução de movimento, o vídeo fica parado no primeiro quadro.
    if (isVideo && prefersReducedMotion()) video.current?.pause();
  }, [isVideo]);
  const onError = () => setFailed(true);
  if (isVideo) {
    return (
      <video
        ref={video}
        className="art"
        data-testid="moment-art"
        src={shown.src}
        aria-label={shown.alt}
        width={size}
        muted
        loop
        playsInline
        autoPlay={!prefersReducedMotion()}
        onError={onError}
      />
    );
  }
  return (
    // As artes são arquivos locais, sem a otimização de imagem do Next.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={shown.animated ? 'art' : 'art art-still'}
      data-testid="moment-art"
      src={shown.src}
      alt={shown.alt}
      width={size}
      height={size}
      onError={onError}
    />
  );
}

/**
 * A arte de um momento: imagem ou vídeo. Se a mídia personalizada não carregar, por exemplo
 * porque o arquivo foi apagado à mão, volta à arte original (`reliability-design.md`).
 */
export function MomentArt({ art, size = 216 }: { art: GuideArt; size?: number }) {
  return <ArtView key={art.src} art={art} size={size} />;
}
