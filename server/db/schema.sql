CREATE TABLE IF NOT EXISTS diagrams (
  id TEXT PRIMARY KEY,
  public_access INTEGER DEFAULT 0,
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY,
  diagram_id TEXT,
  filename TEXT,
  content TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_versions_diagram_id ON versions(diagram_id);
