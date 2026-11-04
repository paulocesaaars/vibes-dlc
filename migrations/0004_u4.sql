-- U4: personalização do guia (cores, frases, mídia e a escolha de Sua IA), uma linha por item.
-- O item original é a ausência da linha. Nenhuma tabela de U1 a U3 é alterada.
CREATE TABLE customization_item (
  item_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('color', 'say', 'media', 'cli')),
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
