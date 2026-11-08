export type GuideArt = {
  src: string;
  alt: string;
  animated?: boolean;
  kind?: 'image' | 'video';
  fallback?: GuideArt;
};
