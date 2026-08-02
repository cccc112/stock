-- 002_watchlists.sql
-- 自選股清單

CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL DEFAULT '我的自選股',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  market VARCHAR(10) NOT NULL CHECK (market IN ('TW', 'US')),
  display_name VARCHAR(100),
  sort_order INT DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(watchlist_id, symbol)
);

-- 建立預設自選股清單
INSERT INTO watchlists (name) VALUES ('我的自選股')
ON CONFLICT DO NOTHING;

-- 索引
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist ON watchlist_items(watchlist_id);
