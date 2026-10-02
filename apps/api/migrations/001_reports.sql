-- M5: reports + alerts. Applied once against DATABASE_URL.
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('NOT_RUNNING', 'DIVERTED', 'OVERCROWDED', 'OTHER')),
  route_id TEXT,
  stop_id TEXT,
  note TEXT CHECK (char_length(note) <= 280),
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_created_idx ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS reports_stop_idx ON reports (stop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_route_idx ON reports (route_id, created_at DESC);
