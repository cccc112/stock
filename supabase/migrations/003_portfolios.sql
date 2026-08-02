-- 003_portfolios.sql
-- 庫存管理與交易紀錄

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

-- 索引
CREATE INDEX IF NOT EXISTS idx_portfolio_tx_traded ON portfolio_transactions(traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_tx_symbol ON portfolio_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol ON portfolio_holdings(symbol);
