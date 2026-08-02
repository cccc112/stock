-- 005_simulator.sql
-- AI 投資模擬系統

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
  reason TEXT,              -- 用戶買賣理由（AI 覆盤讀取）
  ai_review JSONB,          -- AI 覆盤報告
  traded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_sim_tx_portfolio ON sim_transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_sim_tx_traded ON sim_transactions(traded_at DESC);
