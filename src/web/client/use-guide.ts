'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RepoHealth } from '@/core/types';
import type { GuideView } from '@/web/guide-service';
import {
  fetchDemands,
  fetchGuide,
  fetchSeen,
  killSession,
  postCommand,
  postRecheck,
  postConclusionSeen,
  postSeen,
  postUnderstood,
  requestSession,
  type SendResult,
  type SessionResponse,
} from './api';
import { newCommandId, readStoredSessionId, storeSessionId } from './terminal-io';

const STALE_RETRY_MS = 2000;
/** Relógio da faixa de IA parada (BR3.1). A contagem vem da data dos arquivos, no servidor. */
const FOLLOWING_TICK_MS = 30_000;

export type GuideState =
  | { kind: 'loading' }
  | { kind: 'no_intent' }
  | { kind: 'repo_failure'; health: RepoHealth; failedPath: string | null }
  | { kind: 'guide'; view: GuideView };

/** A sessão do terminal fora de uma demanda: a pessoa precisa dela para instalar o AI-DLC (AC1.2.1). */
export type LooseSession = {
  sessionId: string | null;
  status: 'alive' | 'dead' | 'unavailable';
  terminalTitle: string | null;
};

const UNAVAILABLE_SESSION: LooseSession = {
  sessionId: null,
  status: 'unavailable',
  terminalTitle: null,
};

function toLoose(session: SessionResponse | null): LooseSession {
  if (!session) return UNAVAILABLE_SESSION;
  return {
    sessionId: session.sessionId,
    status: session.status,
    terminalTitle: session.terminalTitle ?? null,
  };
}

export type GuideActions = {
  refresh: () => Promise<void>;
  /** Tentar de novo: reavalia onde está o AI-DLC no servidor e relê o guia. */
  recheck: () => Promise<void>;
  openDemand: (intentId: string) => Promise<void>;
  understood: () => Promise<void>;
  send: (text: string, mode: 'execute' | 'paste') => Promise<SendResult>;
  openNewSession: () => Promise<void>;
  endSession: () => Promise<void>;
  restartSession: () => Promise<void>;
  goToNextStage: () => Promise<void>;
  dismissChanged: () => void;
};

function seenStateOf(view: GuideView) {
  return { stageSlug: view.stage.slug, unit: view.stage.unit ?? '', mark: view.stage.mark };
}

function seenKeyOf(view: GuideView): string {
  const { stageSlug, unit, mark } = seenStateOf(view);
  return [view.intentId, stageSlug, unit, mark].join('|');
}

/** Estado da tela. Toda decisão vem do servidor, a partir dos arquivos do AI-DLC (BR4.2). */
export function useGuide(): {
  state: GuideState;
  actions: GuideActions;
  loadError: string | null;
  changedNotice: string | null;
  /** Pasta da sessão aberta do terminal, quando a raiz mudou e a sessão ficou para trás. */
  staleSessionFolder: string | null;
  /** Sessão do terminal nas telas sem demanda (falha, início), onde não há `view` para trazê-la. */
  looseSession: LooseSession | null;
} {
  const [state, setState] = useState<GuideState>({ kind: 'loading' });
  const [looseSession, setLooseSession] = useState<LooseSession | null>(null);
  const [staleSessionFolder, setStaleSessionFolder] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [changedNotice, setChangedNotice] = useState<string | null>(null);
  const viewRef = useRef<GuideView | null>(null);
  const checkedSeenRef = useRef<string | null>(null);
  const noticeOpenRef = useRef(false);
  const selectedIntentRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const demands = await fetchDemands();
      const targetIntentId = selectedIntentRef.current ?? demands.activeIntentId;
      if (!targetIntentId) {
        viewRef.current = null;
        // Sem demanda não há `view`, então a sessão vem direto do servidor (junta a existente).
        const session = await requestSession({ sessionId: readStoredSessionId() }).catch(
          () => null,
        );
        if (session) storeSessionId(session.sessionId);
        setLooseSession(toLoose(session));
        setState(
          demands.repo.health === 'ok'
            ? { kind: 'no_intent' }
            : { kind: 'repo_failure', ...demands.repo },
        );
        setLoadError(null);
        return;
      }
      const view = await fetchGuide(targetIntentId);
      viewRef.current = view;
      if (view.session.sessionId) storeSessionId(view.session.sessionId);
      setState({ kind: 'guide', view });
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const recheck = useCallback(async () => {
    try {
      const result = await postRecheck();
      setStaleSessionFolder(result.staleSessionFolder);
      // Sem o AI-DLC não há demanda para manter aberta: a tela volta à falha, e não a uma demanda.
      if (result.repo.health !== 'ok') selectedIntentRef.current = null;
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
      return;
    }
    await refresh();
  }, [refresh]);

  const openDemand = useCallback(
    async (intentId: string) => {
      selectedIntentRef.current = intentId;
      await refresh();
    },
    [refresh],
  );

  // Com a leitura falhando, a tela mostra a anterior e tenta de novo (BR4.7).
  const isStale = state.kind === 'guide' && state.view.stale;
  useEffect(() => {
    if (!isStale) return;
    const timer = setInterval(() => void refresh(), STALE_RETRY_MS);
    return () => clearInterval(timer);
  }, [isStale, refresh]);

  const moment = state.kind === 'guide' ? state.view.decision.moment : null;
  const isFollowing = moment === 'following' || moment === 'revising';
  useEffect(() => {
    if (!isFollowing) return;
    const timer = setInterval(() => void refresh(), FOLLOWING_TICK_MS);
    return () => clearInterval(timer);
  }, [isFollowing, refresh]);

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

  // Compara só uma vez ao abrir. Depois disso, o que a pessoa vê na tela passa a ser o último visto.
  const view = state.kind === 'guide' ? state.view : null;
  const intentId = view?.intentId ?? null;
  const seenKey = view ? seenKeyOf(view) : null;
  useEffect(() => {
    const current = viewRef.current;
    if (!current || !seenKey || !intentId) return;
    if (checkedSeenRef.current !== intentId) {
      checkedSeenRef.current = intentId;
      void fetchSeen(intentId).then((seen) => {
        if (!seen) return;
        if (seen.status === 'first_visit') void postSeen(intentId, seen.current);
        if (seen.status === 'changed') {
          noticeOpenRef.current = true;
          setChangedNotice(seen.text);
        }
      });
      return;
    }
    if (!noticeOpenRef.current) void postSeen(intentId, seenStateOf(current));
  }, [seenKey, intentId]);

  const dismissChanged = useCallback(() => {
    const current = viewRef.current;
    noticeOpenRef.current = false;
    setChangedNotice(null);
    if (current) void postSeen(current.intentId, seenStateOf(current));
  }, []);

  const understood = useCallback(async () => {
    const current = viewRef.current;
    if (!current) return;
    const updated = await postUnderstood(current.intentId, current.stage.stateSlug);
    if (updated) {
      viewRef.current = updated;
      setState({ kind: 'guide', view: updated });
    } else {
      await refresh();
    }
  }, [refresh]);

  const send = useCallback(
    async (text: string, mode: 'execute' | 'paste'): Promise<SendResult> => {
      const current = viewRef.current;
      if (!current)
        return { ok: false, status: 0, code: 'not_ready', message: 'O guia ainda não abriu.' };
      // O `commandId` nasce aqui, no clique de confirmação, e em nenhum outro lugar (BR5.1).
      const result = await postCommand({
        commandId: newCommandId(),
        intentId: current.intentId,
        stageSlug: current.stage.stateSlug,
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
    setLooseSession(toLoose(session));
    // Uma sessão nova abre na pasta certa, então o aviso da antiga deixa de valer.
    setStaleSessionFolder(null);
    await refresh();
  }, [refresh]);

  const endSession = useCallback(async () => {
    await killSession();
    setStaleSessionFolder(null);
    await refresh();
  }, [refresh]);

  /** Encerra a sessão viva e abre outra na pasta certa. Só a pessoa pede isso, no aviso da tela. */
  const restartSession = useCallback(async () => {
    await killSession();
    await openNewSession();
  }, [openNewSession]);

  /** Grava o reconhecimento em `.vibes/`. A etapa seguinte já vem dos arquivos do AI-DLC. */
  const goToNextStage = useCallback(async () => {
    const current = viewRef.current;
    if (!current?.previousStage) return;
    const updated = await postConclusionSeen(current.intentId, current.previousStage.slug);
    if (updated) {
      viewRef.current = updated;
      setState({ kind: 'guide', view: updated });
    } else {
      await refresh();
    }
  }, [refresh]);

  return {
    state,
    loadError,
    changedNotice,
    staleSessionFolder,
    looseSession,
    actions: {
      refresh,
      recheck,
      openDemand,
      understood,
      send,
      openNewSession,
      endSession,
      restartSession,
      goToNextStage,
      dismissChanged,
    },
  };
}
