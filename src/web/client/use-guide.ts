'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RepoHealth } from '@/core/types';
import type { GuideView } from '@/web/guide-service';
import {
  fetchDemands,
  fetchGuide,
  killSession,
  postCommand,
  postUnderstood,
  requestSession,
  type SendResult,
} from './api';
import { newCommandId, readStoredSessionId, storeSessionId } from './terminal-io';

const STALE_RETRY_MS = 2000;

export type GuideState =
  | { kind: 'loading' }
  | { kind: 'no_intent' }
  | { kind: 'repo_failure'; health: RepoHealth; failedPath: string | null }
  | { kind: 'guide'; view: GuideView };

export type GuideActions = {
  refresh: () => Promise<void>;
  understood: () => Promise<void>;
  send: (text: string, mode: 'execute' | 'paste') => Promise<SendResult>;
  openNewSession: () => Promise<void>;
  endSession: () => Promise<void>;
};

/** Estado da tela. Toda decisão vem do servidor, a partir dos arquivos do AI-DLC (BR4.2). */
export function useGuide(): { state: GuideState; actions: GuideActions; loadError: string | null } {
  const [state, setState] = useState<GuideState>({ kind: 'loading' });
  const [loadError, setLoadError] = useState<string | null>(null);
  const viewRef = useRef<GuideView | null>(null);

  const refresh = useCallback(async () => {
    try {
      const demands = await fetchDemands();
      if (!demands.activeIntentId) {
        viewRef.current = null;
        setState(
          demands.repo.health === 'ok'
            ? { kind: 'no_intent' }
            : { kind: 'repo_failure', ...demands.repo },
        );
        setLoadError(null);
        return;
      }
      const view = await fetchGuide(demands.activeIntentId);
      viewRef.current = view;
      if (view.session.sessionId) storeSessionId(view.session.sessionId);
      setState({ kind: 'guide', view });
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  // Com a leitura falhando, a tela mostra a anterior e tenta de novo (BR4.7).
  const isStale = state.kind === 'guide' && state.view.stale;
  useEffect(() => {
    if (!isStale) return;
    const timer = setInterval(() => void refresh(), STALE_RETRY_MS);
    return () => clearInterval(timer);
  }, [isStale, refresh]);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      // O painel pede a sessão antes da decisão, informando o `sessionId` da aba (W2.1).
      try {
        const session = await requestSession({ sessionId: readStoredSessionId() });
        if (session) storeSessionId(session.sessionId);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : String(error));
      }
      if (!cancelled) await refresh();
    };
    void start();

    const events = new EventSource('/api/events');
    events.addEventListener('changed', () => void refresh());
    return () => {
      cancelled = true;
      events.close();
    };
  }, [refresh]);

  const understood = useCallback(async () => {
    const view = viewRef.current;
    if (!view) return;
    const updated = await postUnderstood(view.intentId, view.stage.slug);
    if (updated) {
      viewRef.current = updated;
      setState({ kind: 'guide', view: updated });
    } else {
      await refresh();
    }
  }, [refresh]);

  const send = useCallback(
    async (text: string, mode: 'execute' | 'paste'): Promise<SendResult> => {
      const view = viewRef.current;
      if (!view)
        return { ok: false, status: 0, code: 'not_ready', message: 'O guia ainda não abriu.' };
      // O `commandId` nasce aqui, no clique de confirmação, e em nenhum outro lugar (BR5.1).
      const result = await postCommand({
        commandId: newCommandId(),
        intentId: view.intentId,
        stageSlug: view.stage.slug,
        text,
        mode,
      });
      await refresh();
      return result;
    },
    [refresh],
  );

  const openNewSession = useCallback(async () => {
    const session = await requestSession({ newSession: true });
    if (session) storeSessionId(session.sessionId);
    await refresh();
  }, [refresh]);

  const endSession = useCallback(async () => {
    await killSession();
    await refresh();
  }, [refresh]);

  return { state, loadError, actions: { refresh, understood, send, openNewSession, endSession } };
}
