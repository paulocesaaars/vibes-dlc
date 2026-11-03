import { existsSync, type FSWatcher, watch } from 'node:fs';
import { logger } from '@/config/logger';

export type ChangeWatcherOptions = {
  /** Pasta observada por eventos. */
  watchDir: string;
  /** Assinatura atual dos arquivos que importam. Só uma mudança nela vira aviso. */
  readSignature: () => string;
  onChange: () => void;
  pollIntervalMs?: number;
  debounceMs?: number;
};

/**
 * Observa por eventos e confere as datas a cada segundo, como reserva. Vários eventos em sequência
 * viram um único aviso (BR4.7, `performance-design.md`).
 */
export class ChangeWatcher {
  private watcher: FSWatcher | null = null;
  private poll: NodeJS.Timeout | null = null;
  private debounce: NodeJS.Timeout | null = null;
  private lastSignature = '';

  constructor(private readonly options: ChangeWatcherOptions) {}

  start(): void {
    this.lastSignature = this.options.readSignature();
    this.startEventWatch();
    this.poll = setInterval(() => this.check(), this.options.pollIntervalMs ?? 1000);
    this.poll.unref();
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.poll) clearInterval(this.poll);
    if (this.debounce) clearTimeout(this.debounce);
    this.poll = null;
    this.debounce = null;
  }

  private startEventWatch(): void {
    const { watchDir } = this.options;
    if (!existsSync(watchDir)) return;
    try {
      this.watcher = watch(watchDir, { recursive: true }, () => this.check());
      this.watcher.on('error', (error) => {
        logger.warn(
          'aidlc',
          `O observador de ${watchDir} falhou: ${error.message}. Sigo conferindo as datas.`,
        );
        this.watcher?.close();
        this.watcher = null;
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      logger.warn(
        'aidlc',
        `Não foi possível observar ${watchDir}: ${reason}. Sigo conferindo as datas.`,
      );
    }
  }

  private check(): void {
    const signature = this.options.readSignature();
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => {
      this.debounce = null;
      this.options.onChange();
    }, this.options.debounceMs ?? 200);
  }
}
