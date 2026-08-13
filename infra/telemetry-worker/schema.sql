CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  anon_id TEXT NOT NULL,
  session_id TEXT,
  platform TEXT,
  version TEXT,
  event TEXT NOT NULL,
  props TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_ts ON events (ts);
CREATE INDEX IF NOT EXISTS idx_events_event_ts ON events (event, ts);
