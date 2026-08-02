-- 004_alerts.sql
-- 智慧條件單與警報系統

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

-- 索引
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
