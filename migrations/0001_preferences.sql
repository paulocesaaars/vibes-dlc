-- Armazenamento local: somente preferências, sem dados de trabalho do AI-DLC.
CREATE TABLE customization_item (
  item_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('color', 'say', 'media')),
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE project_preference (
  path TEXT PRIMARY KEY,
  ai TEXT NOT NULL CHECK (ai IN ('claude_code', 'devin', 'copilot')),
  opened_at TEXT NOT NULL
);
