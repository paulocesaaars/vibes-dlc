import { randomUUID } from 'node:crypto';
import { existsSync, realpathSync, statSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { AidlcReader } from '@/aidlc/reader';
import { resolveAidlcPaths } from '@/aidlc/paths';
import { readStageGraph } from '@/aidlc/stage-graph';
import { loadConfig, type AppConfig } from '@/config/app-config';
import { CustomizationService } from '@/customization/customization-service';
import { CustomizationItemRepo } from '@/db/customization-item-repo';
import { ProjectPreferenceRepo } from '@/db/project-preference-repo';
import { prepareStorage } from '@/db/storage';
import { getTerminalManager } from '@/terminal/registry';
import type { TerminalManager } from '@/terminal/terminal-manager';

export class WorkspaceError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export type Runtime = {
  config: AppConfig;
  contextId: string;
  reader: AidlcReader;
  terminal: TerminalManager;
  customization: CustomizationService;
  projects: ProjectPreferenceRepo;
  deliveries: Map<string, { fingerprint: string; uncertain: boolean }>;
};
const KEY = Symbol.for('vibes-dlc.workspace');
export function terminalPidFile(config: Pick<AppConfig, 'vibesDir' | 'port'>): string {
  return path.join(config.vibesDir, `terminal-${config.port}.pid`);
}
export function getRuntime(): Runtime {
  const holder = globalThis as { [KEY]?: Runtime };
  if (holder[KEY]) return holder[KEY];
  const config = loadConfig();
  const db = prepareStorage(config.dbPath);
  mkdirSync(config.mediaDir, { recursive: true });
  const state: Runtime = {
    config,
    contextId: randomUUID(),
    reader: new AidlcReader(null),
    projects: new ProjectPreferenceRepo(db),
    deliveries: new Map(),
    customization: new CustomizationService({
      repo: new CustomizationItemRepo(db),
      mediaDir: config.mediaDir,
    }),
    terminal: getTerminalManager(() => ({
      findShell: () => config.shell,
      getCwd: () => holder[KEY]?.config.repoRoot ?? null,
      getPidFile: () => terminalPidFile(config),
    })),
  };
  holder[KEY] = state;
  process.once('exit', () => {
    state.reader.close();
    db.close();
  });
  void state.customization.sweep().catch(() => undefined);
  return state;
}
export function assertContext(runtime: Runtime, contextId: string): void {
  if (runtime.contextId !== contextId) {
    throw new WorkspaceError(
      409,
      'context_changed',
      'O projeto ou a IA mudou. Atualize a tela antes de continuar.',
    );
  }
}
export function advanceContext(runtime: Runtime): void {
  runtime.contextId = randomUUID();
  runtime.deliveries.clear();
}
/** A troca é síncrona após a leitura do corpo; envios não intercalam sua ativação. */
export function selectProject(
  runtime: Runtime,
  target: string,
  confirmedSession: string | null,
): void {
  if (!path.isAbsolute(target))
    throw new WorkspaceError(422, 'invalid_path', 'Informe um caminho local absoluto.');
  let root: string;
  try {
    root = realpathSync.native(target);
    if (!statSync(root).isDirectory()) throw new Error('O caminho não é uma pasta.');
    const data = realpathSync.native(runtime.config.vibesDir);
    const relative = path.relative(root, data);
    if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
      throw new Error('O armazenamento de preferências deve ficar fora do projeto.');
    }
    const paths = resolveAidlcPaths(root);
    if (!existsSync(paths.aidlcDir)) throw new Error(`Pasta ausente: ${paths.aidlcDir}`);
    readStageGraph(paths.graphPath);
  } catch (error) {
    throw new WorkspaceError(
      422,
      'incompatible_project',
      `Não foi possível abrir o projeto. ${error instanceof Error ? error.message : 'Pasta ou arquivos do AI-DLC indisponíveis.'}`,
    );
  }
  if (runtime.config.repoRoot === root) {
    runtime.projects.open(root);
    return;
  }
  const session = runtime.terminal.view();
  if (session?.status === 'alive' && confirmedSession !== session.sessionId) {
    throw new WorkspaceError(
      409,
      'confirm_session',
      'A troca encerrará o terminal e interromperá o trabalho em execução.',
    );
  }
  const next = new AidlcReader(root);
  runtime.projects.open(root);
  runtime.terminal.resetForProject();
  runtime.reader.close();
  runtime.config.repoRoot = root;
  runtime.reader = next;
  advanceContext(runtime);
}
