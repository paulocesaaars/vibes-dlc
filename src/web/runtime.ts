import path from 'node:path';
import { AidlcReader } from '@/aidlc/reader';
import { type AppConfig, loadConfig } from '@/config/app-config';
import { findShell } from '@/config/shell-lookup';
import { ArtifactReviewRepo } from '@/db/artifact-review-repo';
import { DemandSeenRepo } from '@/db/demand-seen-repo';
import { GuideProgressRepo } from '@/db/guide-progress-repo';
import { SentCommandRepo } from '@/db/sent-command-repo';
import { prepareStorage } from '@/db/storage';
import { getTerminalManager } from '@/terminal/registry';
import { killProcessTree } from '@/terminal/stale-shell';
import type { TerminalManager } from '@/terminal/terminal-manager';

export type Runtime = {
  config: AppConfig;
  reader: AidlcReader;
  terminal: TerminalManager;
  commands: SentCommandRepo;
  progress: GuideProgressRepo;
  reviews: ArtifactReviewRepo;
  seen: DemandSeenRepo;
};

const RUNTIME_KEY = Symbol.for('vibes-dlc.runtime');

type RuntimeHolder = { [RUNTIME_KEY]?: Runtime };

export function terminalPidFile(config: Pick<AppConfig, 'vibesDir'>): string {
  return path.join(config.vibesDir, 'terminal.pid');
}

function createRuntime(): Runtime {
  const config = loadConfig();
  const db = prepareStorage(config.dbPath);
  process.once('exit', () => db.close());
  return {
    config,
    // O `aidlc` não conhece o `terminal`: quem liga os dois é este ponto de montagem.
    reader: new AidlcReader(
      config.repoRoot,
      Date.now,
      {},
      { env: process.env, killTree: (pid) => killProcessTree(pid) },
    ),
    terminal: getTerminalManager(() => ({
      findShell: () => findShell(),
      cwd: config.repoRoot,
      pidFile: terminalPidFile(config),
    })),
    commands: new SentCommandRepo(db),
    progress: new GuideProgressRepo(db),
    reviews: new ArtifactReviewRepo(db),
    seen: new DemandSeenRepo(db),
  };
}

/** Peças do servidor, uma única instância por processo, compartilhada por todas as rotas. */
export function getRuntime(): Runtime {
  const holder = globalThis as RuntimeHolder;
  holder[RUNTIME_KEY] ??= createRuntime();
  return holder[RUNTIME_KEY];
}

/** Só para testes: instala as peças que o teste montou. */
export function installRuntime(runtime: Runtime | undefined): void {
  (globalThis as RuntimeHolder)[RUNTIME_KEY] = runtime;
}
