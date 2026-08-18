-- 002_watchlists.sql
-- ?芷?⊥???
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL DEFAULT '???芷??,
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

-- 撱箇??身?芷?⊥???INSERT INTO watchlists (name) VALUES ('???芷??)
ON CONFLICT DO NOTHING;

-- 蝝Ｗ?
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist ON watchlist_items(watchlist_id);
-- 003_portfolios.sql
-- 摨怠?蝞∠??漱????
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  market VARCHAR(10) NOT NULL CHECK (market IN ('TW', 'US')),
  action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL')),
  quantity DECIMAL(15,4) NOT NULL,
  price DECIMAL(15,4) NOT NULL,
  currency VARCHAR(5) NOT NULL CHECK (currency IN ('TWD', 'USD')),
  fee DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  note TEXT,
  traded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  market VARCHAR(10) NOT NULL CHECK (market IN ('TW', 'US')),
  display_name VARCHAR(100),
  avg_cost DECIMAL(15,4) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL,
  currency VARCHAR(5) NOT NULL CHECK (currency IN ('TWD', 'USD')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(symbol, market)
);

-- 蝝Ｗ?
CREATE INDEX IF NOT EXISTS idx_portfolio_tx_traded ON portfolio_transactions(traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_tx_symbol ON portfolio_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol ON portfolio_holdings(symbol);
-- 004_alerts.sql
-- ?箸璇辣?株?霅血蝟餌絞

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  market VARCHAR(10) NOT NULL CHECK (market IN ('TW', 'US')),
  condition_type VARCHAR(30) NOT NULL CHECK (condition_type IN (
    'PRICE_ABOVE',
    'PRICE_BELOW',
    'VOLUME_SPIKE',
    'SUPPORT_BREAK',
    'RESISTANCE_BREAK',
    'VAP_ANOMALY'
  )),
  threshold DECIMAL(15,4),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_triggered BOOLEAN DEFAULT false,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 蝝Ｗ?
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
-- 005_simulator.sql
-- AI ??璅⊥蝟餌絞

CREATE TABLE IF NOT EXISTS sim_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  initial_capital DECIMAL(15,2) NOT NULL,
  currency VARCHAR(5) NOT NULL CHECK (currency IN ('TWD', 'USD')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sim_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES sim_portfolios(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  market VARCHAR(10) NOT NULL CHECK (market IN ('TW', 'US')),
  action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL')),
  quantity DECIMAL(15,4) NOT NULL,
  price DECIMAL(15,4) NOT NULL,
  reason TEXT,              -- ?冽鞎瑁都?嚗I 閬霈??
  ai_review JSONB,          -- AI 閬?勗?
  traded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 蝝Ｗ?
CREATE INDEX IF NOT EXISTS idx_sim_tx_portfolio ON sim_transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_sim_tx_traded ON sim_transactions(traded_at DESC);
-- 006_ai_cache.sql
-- AI 敹怠??蝙?刻???
CREATE TABLE IF NOT EXISTS ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(200) UNIQUE NOT NULL,
  content JSONB NOT NULL,
  model_used VARCHAR(50),
  tokens_used INT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type VARCHAR(50) NOT NULL,
  symbol VARCHAR(20),
  tokens_used INT NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  is_byok BOOLEAN DEFAULT false,
  response_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 蝝Ｗ?
CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_log(created_at DESC);

-- ?芸?皜???敹怠?嚗?剝? pg_cron嚗?-- SELECT cron.schedule('cleanup-ai-cache', '0 * * * *', $$DELETE FROM ai_cache WHERE expires_at < now()$$);
CREATE TABLE IF NOT EXISTS market_symbols (
    symbol VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    market VARCHAR(10) NOT NULL, -- 'TW' or 'US'
    type VARCHAR(20) NOT NULL, -- 'STOCK' or 'ETF'
    listing_date DATE
);
ALTER TABLE sim_portfolios 
ADD COLUMN IF NOT EXISTS is_ai_auto_trade BOOLEAN DEFAULT FALSE;
