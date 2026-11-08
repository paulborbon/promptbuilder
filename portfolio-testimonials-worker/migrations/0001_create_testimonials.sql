CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  relationship TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  moderation_token_hash TEXT NOT NULL UNIQUE,
  token_expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_testimonials_status_created
ON testimonials(status, created_at DESC);

CREATE TABLE IF NOT EXISTS submission_limits (
  fingerprint TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  submission_count INTEGER NOT NULL
);
