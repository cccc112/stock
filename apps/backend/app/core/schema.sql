-- 資料表定義：欄位與 API 程式碼 (app/api/v1/*) 實際使用的欄位一致。
-- 皆為 IF NOT EXISTS，後端啟動時會自動執行，可重複執行。

CREATE TABLE IF NOT EXISTS watchlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      VARCHAR(20) NOT NULL UNIQUE,
  market      VARCHAR(10) NOT NULL CHECK (market IN ('TW', 'US')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      VARCHAR(20) NOT NULL,
  market      VARCHAR(10) NOT NULL CHECK (market IN ('TW', 'US')),
  type        VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL')),
  price       NUMERIC(18,4) NOT NULL,
  shares      NUMERIC(18,4) NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_tx_symbol ON portfolio_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_tx_ts ON portfolio_transactions("timestamp" DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      VARCHAR(20) NOT NULL,
  condition   VARCHAR(30) NOT NULL DEFAULT 'VOLUME_ANOMALY',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);

CREATE TABLE IF NOT EXISTS sim_portfolios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(100) NOT NULL,
  cash_balance     NUMERIC(18,2) NOT NULL,
  is_ai_auto_trade BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sim_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES sim_portfolios(id) ON DELETE CASCADE,
  symbol       VARCHAR(20) NOT NULL,
  type         VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL')),
  price        NUMERIC(18,4) NOT NULL,
  shares       NUMERIC(18,4) NOT NULL,
  "timestamp"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sim_tx_portfolio ON sim_transactions(portfolio_id);

CREATE TABLE IF NOT EXISTS ai_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(50) NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_cache_type ON ai_cache(type, created_at DESC);

CREATE TABLE IF NOT EXISTS market_symbols (
  symbol        VARCHAR(50) PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  market        VARCHAR(10) NOT NULL,
  type          VARCHAR(20) NOT NULL,
  listing_date  DATE
);
