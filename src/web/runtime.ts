import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { AidlcReader } from '@/aidlc/reader';
import { type AppConfig, loadConfig } from '@/config/app-config';
import { findShell } from '@/config/shell-lookup';
import { CustomizationService } from '@/customization/customization-service';
import { CustomizationItemRepo } from '@/db/customization-item-repo';
import { ArtifactReviewRepo } from '@/db/artifact-review-repo';
import { ArtifactNoteRepo } from '@/db/artifact-note-repo';
import type { Database } from '@/db/database';
import { DemandSeenRepo } from '@/db/demand-seen-repo';
import { GuideProgressRepo } from '@/db/guide-progress-repo';
import { SentCommandRepo } from '@/db/sent-command-repo';
import { IN_MEMORY, prepareStorage } from '@/db/storage';
import { getTerminalManager } from '@/terminal/registry';
import { killProcessTree } from '@/terminal/stale-shell';
import type { TerminalManager } from '@/terminal/terminal-manager';
import { logger } from '@/config/logger';

export type Runtime = {
  customization: CustomizationService;
  config: AppConfig;
  reader: AidlcReader;
  terminal: TerminalManager;
  commands: SentCommandRepo;
  progress: GuideProgressRepo;
  reviews: ArtifactReviewRepo;
  notes: ArtifactNoteRepo;
  seen: DemandSeenRepo;
  /** Encerra o vigia e o banco. Os testes que montam um `Runtime` à mão podem omitir. */
  dispose?: () => void;
};

/** Folga entre trocar o `runtime` e fechar o banco antigo, para as rotas em voo terminarem. */
export const DISPOSE_DELAY_MS = 5000;

const RUNTIME_KEY = Symbol.for('vibes-dlc.runtime');
const CONTROL_KEY = Symbol.for('vibes-dlc.runtime-control');

type Control = {
  refreshing: Promise<Runtime> | null;
  exitHookRegistered: boolean;
  changeListeners: Set<() => void>;
};

type RuntimeHolder = {
  [RUNTIME_KEY]?: Runtime;
  [CONTROL_KEY]?: Control;
};

function holder(): RuntimeHolder {
  return globalThis as RuntimeHolder;
}

function control(): Control {
  return (holder()[CONTROL_KEY] ??= {
    refreshing: null,
    exitHookRegistered: false,
    changeListeners: new Set(),
  });
}

export function terminalPidFile(config: Pick<AppConfig, 'vibesDir'>): string | null {
  return config.vibesDir ? path.join(config.vibesDir, 'terminal.pid') : null;
}

/**
 * Pasta onde o terminal abre. Com raiz, é a raiz. Sem raiz, é a pasta pai do produto, que é onde o
 * `README` manda copiar a subpasta e, portanto, onde a pessoa vai instalar o AI-DLC.
 */
export function terminalCwd(): string | null {
  const root = holder()[RUNTIME_KEY]?.config.repoRoot;
  if (root) return root;
  const productDir = process.env.VIBES_PRODUCT_DIR?.trim();
  return productDir ? path.dirname(productDir) : null;
}

/** Um só gancho de saída por processo, que fecha o banco do `runtime` que estiver valendo. */
function registerExitHook(): void {
  const state = control();
  if (state.exitHookRegistered) return;
  state.exitHookRegistered = true;
  process.once('exit', () => holder()[RUNTIME_KEY]?.dispose?.());
}

function createRuntime(config: AppConfig = loadConfig()): Runtime {
  // Sem raiz, as migrações rodam num banco em memória: nada vai ao disco (NFR7.3).
  const db = prepareStorage(config.dbPath ?? IN_MEMORY);
  try {
    return assembleRuntime(config, db);
  } catch (error) {
    db.close();
    throw error;
  }
}

function assembleRuntime(config: AppConfig, db: Database): Runtime {
  registerExitHook();
  const customization = new CustomizationService({
    repo: new CustomizationItemRepo(db),
    mediaDir: config.mediaDir,
  });
  if (config.mediaDir) {
    // A pasta de mídia nasce depois da migração, e a varredura apaga o que nenhuma linha usa (BR4.5).
    mkdirSync(config.mediaDir, { recursive: true });
    void customization.sweep().catch((error: unknown) => {
      logger.warn('personalização', `media_sweep_aborted motivo=${String(error)}`);
    });
  }
  // O `aidlc` não conhece o `terminal`: quem liga os dois é este ponto de montagem.
  const reader = new AidlcReader(
    config.repoRoot,
    Date.now,
    {},
    { env: process.env, killTree: (pid) => killProcessTree(pid) },
  );
  return {
    customization,
    config,
    reader,
    // A fábrica roda uma vez; as funções leem o `runtime` atual e seguem certas depois da troca.
    terminal: getTerminalManager(() => ({
      findShell: () => findShell(),
      getCwd: terminalCwd,
      getPidFile: () => {
        const current = holder()[RUNTIME_KEY];
        return current ? terminalPidFile(current.config) : null;
      },
    })),
    commands: new SentCommandRepo(db),
    progress: new GuideProgressRepo(db),
    reviews: new ArtifactReviewRepo(db),
    notes: new ArtifactNoteRepo(db),
    seen: new DemandSeenRepo(db),
    dispose: () => {
      reader.close();
      db.close();
    },
  };
}

/** Peças do servidor, uma única instância por processo, compartilhada por todas as rotas. */
export function getRuntime(): Runtime {
  const state = holder();
  state[RUNTIME_KEY] ??= createRuntime();
  return state[RUNTIME_KEY];
}

/** Só para testes: instala as peças que o teste montou. */
export function installRuntime(runtime: Runtime | undefined): void {
  holder()[RUNTIME_KEY] = runtime;
}

/** Avisa quando o `runtime` é trocado (a raiz mudou). Devolve a função que cancela o aviso. */
export function onRuntimeChange(listener: () => void): () => void {
  const listeners = control().changeListeners;
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function swapRuntime(): Promise<Runtime> {
  const old = holder()[RUNTIME_KEY];
  const config = loadConfig();
  // Mesma raiz: só relê o estado. Montar tudo de novo não muda nada para a pessoa.
  if (old && old.config.repoRoot === config.repoRoot) return old;

  // Monta o novo inteiro antes de trocar: se falhar, o antigo continua valendo (e o erro sobe).
  const next = createRuntime(config);
  holder()[RUNTIME_KEY] = next;
  if (!old) return next;

  logger.info(
    'runtime',
    `A raiz do AI-DLC mudou de ${old.config.repoRoot ?? '(nenhuma)'} para ${config.repoRoot ?? '(nenhuma)'}.`,
  );
  // O vigia antigo para já; as assinaturas abertas recebem o aviso e a tela reconecta ao leitor novo.
  old.reader.close();
  for (const listener of [...control().changeListeners]) listener();
  // O banco antigo fecha depois da folga. O `unref` impede que isso segure o processo aberto.
  setTimeout(() => old.dispose?.(), DISPOSE_DELAY_MS).unref();
  return next;
}

/**
 * Reavalia a raiz sem reiniciar o servidor. Uma troca por vez: chamadas simultâneas esperam a mesma
 * promessa e recebem o mesmo resultado.
 */
export function refreshRuntime(): Promise<Runtime> {
  const state = control();
  state.refreshing ??= swapRuntime().finally(() => {
    state.refreshing = null;
  });
  return state.refreshing;
}
