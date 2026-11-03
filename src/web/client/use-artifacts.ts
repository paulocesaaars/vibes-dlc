'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ArtifactList } from '@/web/artifact-service';
import { fetchArtifacts, postReview } from './api';

export type ArtifactQuery = {
  intentId: string;
  stage: string;
  unit: string | null;
  consult: boolean;
  /** Muda a cada alteração nos arquivos, e a lista é relida (BR1.1). */
  version: string | null;
};

export type ArtifactsState = {
  list: ArtifactList | null;
  notice: string | null;
  busy: boolean;
  select: (path: string) => void;
  markReviewed: () => Promise<void>;
};

const GONE_NOTICE = 'Este arquivo não está mais disponível. A lista foi relida.';

/** Lista da etapa e o artefato mostrado. A revisão é uma anotação do guia e não aprova nada. */
export function useArtifacts(query: ArtifactQuery | null, onReviewed: () => void): ArtifactsState {
  const [list, setList] = useState<ArtifactList | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloads, setReloads] = useState(0);

  const intentId = query?.intentId ?? null;
  const stage = query?.stage ?? null;
  const unit = query?.unit ?? null;
  const consult = query?.consult ?? false;
  const version = query?.version ?? null;

  useEffect(() => {
    if (!intentId || !stage) return;
    let cancelled = false;
    const load = async () => {
      const result = await fetchArtifacts({ intentId, stage, unit, consult, path: selectedPath });
      // Uma resposta antiga não pode trocar o que está na tela.
      if (cancelled) return;
      if (result.kind === 'gone') {
        setNotice(GONE_NOTICE);
        setSelectedPath(null);
      } else if (result.kind === 'failed') {
        setNotice(result.message);
      } else {
        setList(result.list);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [intentId, stage, unit, consult, version, selectedPath, reloads]);

  const select = useCallback((path: string) => {
    setNotice(null);
    setSelectedPath(path);
  }, []);

  const markReviewed = useCallback(async () => {
    const shown = list?.selected;
    if (!intentId || !shown) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await postReview(intentId, shown.path, shown.contentHash);
      if (result.kind === 'changed') {
        setNotice(result.message);
        setList((previous) => previous && { ...previous, selected: result.artifact });
      } else if (result.kind === 'failed') {
        setNotice(result.message);
      } else {
        setSelectedPath(null);
        setReloads((value) => value + 1);
        onReviewed();
      }
    } finally {
      setBusy(false);
    }
  }, [intentId, list, onReviewed]);

  return { list: stage ? list : null, notice, busy, select, markReviewed };
}
