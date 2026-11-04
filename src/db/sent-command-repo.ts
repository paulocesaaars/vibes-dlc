import type { Database } from './database';

export type SendMode = 'execute' | 'paste';
export type SentCommandStatus = 'pending' | 'written' | 'failed';
export type SentCommandKind = 'stage' | 'new_demand' | 'analysis' | 'activate';

export type SentCommand = {
  commandId: string;
  intentId: string;
  stageSlug: string;
  text: string;
  mode: SendMode;
  status: SentCommandStatus;
  sentAt: string;
  writtenAt: number | null;
  kind: SentCommandKind;
};

export type NewSentCommand = Pick<
  SentCommand,
  'commandId' | 'intentId' | 'stageSlug' | 'text' | 'mode'
> & { kind?: SentCommandKind };

type SentCommandRow = {
  command_id: string;
  intent_id: string;
  stage_slug: string;
  text: string;
  mode: SendMode;
  status: SentCommandStatus;
  sent_at: string;
  written_at: number | null;
  kind: SentCommandKind;
};

function toSentCommand(row: SentCommandRow): SentCommand {
  return {
    commandId: row.command_id,
    intentId: row.intent_id,
    stageSlug: row.stage_slug,
    text: row.text,
    mode: row.mode,
    status: row.status,
    sentAt: row.sent_at,
    writtenAt: row.written_at,
    kind: row.kind,
  };
}

/** Comandos confirmados. Só `written` conta como enviado (BR5.2). */
export class SentCommandRepo {
  constructor(private readonly db: Database) {}

  find(commandId: string): SentCommand | null {
    const rows = this.db.all<SentCommandRow>('SELECT * FROM sent_command WHERE command_id = ?', [
      commandId,
    ]);
    return rows[0] ? toSentCommand(rows[0]) : null;
  }

  /** Grava em `pending`. Devolve `false` se o `commandId` já existia, sem mudar nada (BR5.3). */
  insertPending(command: NewSentCommand, sentAt: string = new Date().toISOString()): boolean {
    const { changes } = this.db.run(
      `INSERT INTO sent_command
         (command_id, intent_id, stage_slug, text, mode, status, sent_at, kind)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
       ON CONFLICT (command_id) DO NOTHING`,
      [
        command.commandId,
        command.intentId,
        command.stageSlug,
        command.text,
        command.mode,
        sentAt,
        command.kind ?? 'stage',
      ],
    );
    return changes === 1;
  }

  markWritten(commandId: string, writtenAt: number = Date.now()): void {
    this.db.run(
      `UPDATE sent_command SET status = 'written', written_at = ?
       WHERE command_id = ? AND status = 'pending'`,
      [writtenAt, commandId],
    );
  }

  markFailed(commandId: string): void {
    this.db.run(
      `UPDATE sent_command SET status = 'failed' WHERE command_id = ? AND status = 'pending'`,
      [commandId],
    );
  }

  /** Último comando que chegou ao terminal nesta etapa, base de `guide.commandSent`. */
  lastWritten(intentId: string, stageSlug: string): SentCommand | null {
    const rows = this.db.all<SentCommandRow>(
      `SELECT * FROM sent_command
       WHERE intent_id = ? AND stage_slug = ? AND status = 'written' AND kind = 'stage'
       ORDER BY written_at DESC, rowid DESC LIMIT 1`,
      [intentId, stageSlug],
    );
    return rows[0] ? toSentCommand(rows[0]) : null;
  }

  /** Comandos que chegaram ao terminal nesta demanda, do mais recente ao mais antigo. */
  listWritten(intentId: string): SentCommand[] {
    return this.db
      .all<SentCommandRow>(
        `SELECT * FROM sent_command
         WHERE intent_id = ? AND status = 'written' AND kind IN ('stage', 'activate')
         ORDER BY written_at DESC, rowid DESC`,
        [intentId],
      )
      .map(toSentCommand);
  }

  /** Nenhum processo anterior pode concluir o que ficou em `pending` (NFR12.3). */
  failInterrupted(): number {
    return this.db.run(`UPDATE sent_command SET status = 'failed' WHERE status = 'pending'`)
      .changes;
  }
}
