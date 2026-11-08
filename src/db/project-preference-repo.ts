import type { AiKind } from '@/core/commands';
import type { Database } from './database';

export type ProjectPreference = { path: string; ai: AiKind };

export class ProjectPreferenceRepo {
  constructor(private readonly db: Database) {}

  recent(): ProjectPreference[] {
    return this.db.all<ProjectPreference>(
      "SELECT path, ai FROM project_preference WHERE opened_at <> '' ORDER BY opened_at DESC LIMIT 30",
    );
  }

  find(path: string): ProjectPreference | null {
    return (
      this.db.all<ProjectPreference>('SELECT path, ai FROM project_preference WHERE path = ?', [
        path,
      ])[0] ?? null
    );
  }

  forget(path: string): void {
    this.db.run("UPDATE project_preference SET opened_at = '' WHERE path = ?", [path]);
  }

  open(path: string): void {
    this.db.run(
      `INSERT INTO project_preference (path, ai, opened_at) VALUES (?, 'claude_code', ?)
      ON CONFLICT(path) DO UPDATE SET opened_at = excluded.opened_at`,
      [path, new Date().toISOString()],
    );
  }

  setAi(path: string, ai: AiKind): void {
    this.db.run('UPDATE project_preference SET ai = ? WHERE path = ?', [ai, path]);
  }
}
