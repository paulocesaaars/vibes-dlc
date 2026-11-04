import type { Database } from './database';

export type ArtifactNote = {
  noteId: string;
  intentId: string;
  artifactPath: string;
  text: string;
  createdAt: string;
};

type NoteRow = {
  note_id: string;
  intent_id: string;
  artifact_path: string;
  text: string;
  created_at: string;
};

export class ArtifactNoteRepo {
  constructor(private readonly db: Database) {}

  add(note: ArtifactNote): void {
    this.db.run(
      'INSERT INTO artifact_note (note_id, intent_id, artifact_path, text, created_at) VALUES (?, ?, ?, ?, ?)',
      [note.noteId, note.intentId, note.artifactPath, note.text, note.createdAt],
    );
  }

  list(intentId: string, artifactPath: string): ArtifactNote[] {
    return this.db
      .all<NoteRow>(
        'SELECT * FROM artifact_note WHERE intent_id = ? AND artifact_path = ? ORDER BY created_at DESC, rowid DESC',
        [intentId, artifactPath],
      )
      .map((row) => ({
        noteId: row.note_id,
        intentId: row.intent_id,
        artifactPath: row.artifact_path,
        text: row.text,
        createdAt: row.created_at,
      }));
  }
}
