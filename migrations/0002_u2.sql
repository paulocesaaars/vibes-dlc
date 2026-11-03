-- U2: revisões de artefato, último estado visto de cada demanda e o reconhecimento da conclusão.
-- A coluna nova fica vazia nas linhas de U1, então os dados existentes continuam intactos.
ALTER TABLE guide_progress ADD COLUMN conclusion_seen_at TEXT;

CREATE TABLE artifact_review (
  intent_id TEXT NOT NULL,
  artifact_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  reviewed_at TEXT NOT NULL,
  PRIMARY KEY (intent_id, artifact_path)
);

CREATE TABLE demand_seen_state (
  intent_id TEXT PRIMARY KEY,
  stage_slug TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  mark TEXT NOT NULL,
  seen_at TEXT NOT NULL
);
