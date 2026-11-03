import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

export type SqlParam = SQLInputValue;
export type Row = Record<string, SqlParam>;

/** Acesso genérico ao SQLite (contrato C3). Cada módulo mapeia as próprias linhas. */
export class Database {
  private readonly connection: DatabaseSync;

  constructor(path: string) {
    this.connection = new DatabaseSync(path);
    this.connection.exec('PRAGMA busy_timeout = 3000');
    this.connection.exec('PRAGMA journal_mode = WAL');
  }

  exec(sql: string): void {
    this.connection.exec(sql);
  }

  run(sql: string, params: SqlParam[] = []): { changes: number } {
    const result = this.connection.prepare(sql).run(...params);
    return { changes: Number(result.changes) };
  }

  all<T = Row>(sql: string, params: SqlParam[] = []): T[] {
    return this.connection.prepare(sql).all(...params) as T[];
  }

  transaction<T>(work: () => T): T {
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

  close(): void {
    this.connection.close();
  }
}
