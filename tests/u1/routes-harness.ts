import path from 'node:path';
import { AidlcReader } from '@/aidlc/reader';
import type { AppConfig } from '@/config/app-config';
import { findShell, type ShellLookup } from '@/config/shell-lookup';
import {
  CustomizationService,
  createCustomizationState,
} from '@/customization/customization-service';
import { CustomizationItemRepo } from '@/db/customization-item-repo';
import { ArtifactReviewRepo } from '@/db/artifact-review-repo';
import { ArtifactNoteRepo } from '@/db/artifact-note-repo';
import type { Database } from '@/db/database';
import { DemandSeenRepo } from '@/db/demand-seen-repo';
import { GuideProgressRepo } from '@/db/guide-progress-repo';
import { SentCommandRepo } from '@/db/sent-command-repo';
import { prepareStorage } from '@/db/storage';
import { TerminalManager, type PtyProcess } from '@/terminal/terminal-manager';
import { installRuntime, type Runtime } from '@/web/runtime';
import { type AidlcRepo, createAidlcRepo } from './aidlc-fixture';
import { tempDir } from './helpers';

export const PORT = 3456;
export const APP_HOST = `127.0.0.1:${PORT}`;
export const APP_ORIGIN = `http://${APP_HOST}`;

export type Harness = {
  runtime: Runtime;
  repo: AidlcRepo;
  db: Database;
  dispose: () => void;
  /** Salva a escolha de Sua IA como a tela faz: dentro de uma visita. */
  setCliKind: (kind: 'claude_code' | 'other') => Promise<void>;
};

type HarnessOptions = {
  shell?: ShellLookup;
  spawnPty?: () => PtyProcess;
  configOverrides?: Partial<AppConfig>;
};

/** Monta o runtime real com arquivos do AI-DLC, banco e gerenciador em pastas temporárias. */
export function createHarness(options: HarnessOptions = {}): Harness {
  const repo = createAidlcRepo();
  const vibesDir = path.join(tempDir(), '.vibes');
  const dbPath = path.join(vibesDir, 'vibes.db');
  const db = prepareStorage(dbPath);
  const shell = options.shell ?? findShell();
  const config: AppConfig = {
    port: PORT,
    host: '127.0.0.1',
    publicHost: null,
    dbPath,
    vibesDir,
    mediaDir: path.join(vibesDir, 'media'),
    shell,
    repoRoot: repo.root,
    exposed: false,
    nodeVersionOk: true,
    ...options.configOverrides,
  };
  const terminal = new TerminalManager({
    findShell: () => shell,
    getCwd: () => repo.root,
    getPidFile: () => path.join(vibesDir, 'terminal.pid'),
    spawnPty: options.spawnPty,
  });
  const runtime: Runtime = {
    customization: new CustomizationService({
      repo: new CustomizationItemRepo(db),
      mediaDir: path.join(vibesDir, 'media'),
      state: createCustomizationState(),
    }),
    config,
    reader: new AidlcReader(repo.root, Date.now, { pollIntervalMs: 50, debounceMs: 10 }),
    terminal,
    commands: new SentCommandRepo(db),
    progress: new GuideProgressRepo(db),
    reviews: new ArtifactReviewRepo(db),
    notes: new ArtifactNoteRepo(db),
    seen: new DemandSeenRepo(db),
  };
  installRuntime(runtime);
  return {
    runtime,
    repo,
    db,
    setCliKind: async (kind) => {
      const { visitId } = await runtime.customization.openVisit();
      await runtime.customization.put(visitId, { cliKind: kind });
      await runtime.customization.done(visitId);
    },
    dispose: () => {
      terminal.shutdown();
      db.close();
      installRuntime(undefined);
    },
  };
}

/** Pseudo-terminal substituto, para casos que tratam só de origem ou formato. */
export function fakePty(overrides: Partial<PtyProcess> = {}) {
  const written: string[] = [];
  const pty: PtyProcess = {
    pid: 999_999,
    write: (data: string) => {
      written.push(data);
    },
    resize: () => {},
    kill: () => {},
    onData: () => ({ dispose: () => {} }),
    onExit: () => ({ dispose: () => {} }),
    ...overrides,
  };
  return { pty, written };
}

export function appRequest(
  route: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Request {
  const method = init.method ?? 'POST';
  const headers = new Headers({ host: APP_HOST, ...init.headers });
  if (method !== 'GET' && !headers.has('origin') && !init.headers?.['x-no-origin']) {
    headers.set('origin', APP_ORIGIN);
  }
  headers.delete('x-no-origin');
  const body =
    init.body === undefined
      ? undefined
      : typeof init.body === 'string'
        ? init.body
        : JSON.stringify(init.body);
  return new Request(`${APP_ORIGIN}${route}`, { method, headers, body });
}

export function paramsOf(intentId: string) {
  return { params: Promise.resolve({ intentId }) };
}

/** Lê eventos de uma resposta SSE até a condição ser atendida. */
export async function readSse(
  response: Response,
  until: (events: { event: string; data: Record<string, unknown> }[]) => boolean,
  timeoutMs = 15_000,
) {
  const reader = (response.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  const events: { event: string; data: Record<string, unknown> }[] = [];
  let buffer = '';
  const deadline = Date.now() + timeoutMs;

  while (!until(events)) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const next = await Promise.race([
      reader.read(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), remaining)),
    ]);
    if (next === null || next.done) break;
    buffer += decoder.decode(next.value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const event = /^event: (.+)$/m.exec(block)?.[1];
      const data = /^data: (.+)$/m.exec(block)?.[1];
      if (event && data) events.push({ event, data: JSON.parse(data) });
    }
  }
  await reader.cancel().catch(() => {});
  return events;
}
