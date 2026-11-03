-- U1: progresso do guia e comandos confirmados. O banco não guarda a saída do terminal.
CREATE TABLE guide_progress (
  intent_id TEXT NOT NULL,
  stage_slug TEXT NOT NULL,
  current_step TEXT NOT NULL DEFAULT 'understand'
    CHECK (current_step IN ('understand', 'send', 'follow')),
  understood_at TEXT,
  PRIMARY KEY (intent_id, stage_slug)
);

CREATE TABLE sent_command (
  command_id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL,
  stage_slug TEXT NOT NULL,
  text TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('execute', 'paste')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'written', 'failed')),
  sent_at TEXT NOT NULL,
  written_at INTEGER
);

CREATE INDEX sent_command_stage ON sent_command (intent_id, stage_slug, status, written_at);
