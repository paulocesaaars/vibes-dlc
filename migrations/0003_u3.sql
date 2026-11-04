-- U3: notas sobre artefatos e classificação dos comandos enviados pelo painel.
ALTER TABLE sent_command ADD COLUMN kind TEXT NOT NULL DEFAULT 'stage'
  CHECK (kind IN ('stage', 'new_demand', 'analysis', 'activate'));

CREATE TABLE artifact_note (
  note_id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL,
  artifact_path TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (length(text) BETWEEN 1 AND 4000)
);

CREATE INDEX artifact_note_artifact ON artifact_note (intent_id, artifact_path, created_at);
