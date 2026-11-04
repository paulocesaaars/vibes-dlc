import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

export type SqlParam = SQLInputValue;
export type Row = Record<string, SqlParam>;

/** O banco já foi fechado: uma rota em voo segurava as peças de uma raiz que foi trocada. */
export class DatabaseClosedError extends Error {
  constructor() {
    super('O banco foi fechado porque a raiz do AI-DLC mudou.');
    this.name = 'DatabaseClosedError';
  }
}

/** Acesso genérico ao SQLite (contrato C3). Cada módulo mapeia as próprias linhas. */
export class Database {
  private readonly connection: DatabaseSync;
  private closed = false;

  constructor(path: string) {
    this.connection = new DatabaseSync(path);
    this.connection.exec('PRAGMA busy_timeout = 3000');
    this.connection.exec('PRAGMA journal_mode = WAL');
  }

  exec(sql: string): void {
    this.assertOpen();
    this.connection.exec(sql);
  }

  run(sql: string, params: SqlParam[] = []): { changes: number } {
    this.assertOpen();
    const result = this.connection.prepare(sql).run(...params);
    return { changes: Number(result.changes) };
  }

  all<T = Row>(sql: string, params: SqlParam[] = []): T[] {
    this.assertOpen();
    return this.connection.prepare(sql).all(...params) as T[];
  }

  transaction<T>(work: () => T): T {
    this.assertOpen();
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      this.connection.exec('COMMIT');
      return result;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }

  /** Fechar duas vezes é inofensivo: a troca da raiz e a saída do processo podem se cruzar. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.connection.close();
  }

  private assertOpen(): void {
    if (this.closed) throw new DatabaseClosedError();
  }
}
