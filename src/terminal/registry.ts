import { TerminalManager, type TerminalManagerOptions } from './terminal-manager';

const REGISTRY_KEY = Symbol.for('vibes-dlc.terminal-manager');

type Registry = { [REGISTRY_KEY]?: TerminalManager };

/**
 * Único registro por processo (NFR2.3). Fica em `globalThis` para ser o mesmo em todas as rotas e
 * sobreviver ao recarregamento a quente do `npm run dev`.
 */
export function getTerminalManager(createOptions: () => TerminalManagerOptions): TerminalManager {
  const registry = globalThis as Registry;
  let manager = registry[REGISTRY_KEY];
  if (!manager) {
    const created = new TerminalManager(createOptions());
    registry[REGISTRY_KEY] = created;
    process.once('exit', () => created.shutdown());
    manager = created;
  }
  return manager;
}

/** Só para testes: troca ou limpa o registro. */
export function replaceTerminalManager(manager: TerminalManager | undefined): void {
  (globalThis as Registry)[REGISTRY_KEY] = manager;
}
