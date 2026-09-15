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
CREATE INDEX IF NOT EXISTS idx_events_anon_ts ON events (anon_id, ts);

-- 应用内反馈。message 是用户自己写的，contact 选填，ip_hash 只用来限流
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  contact TEXT,
  anon_id TEXT,
  ip_hash TEXT,
  context TEXT,
  issue_url TEXT,
  -- open / done / ignored，看板上人工标
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE INDEX IF NOT EXISTS idx_feedback_ts ON feedback (ts);
CREATE INDEX IF NOT EXISTS idx_feedback_ip_ts ON feedback (ip_hash, ts);
