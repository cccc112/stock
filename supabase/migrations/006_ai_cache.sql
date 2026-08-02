-- 006_ai_cache.sql
-- AI 快取與使用記錄

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

-- 索引
CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_log(created_at DESC);

-- 自動清理過期快取（可搭配 pg_cron）
-- SELECT cron.schedule('cleanup-ai-cache', '0 * * * *', $$DELETE FROM ai_cache WHERE expires_at < now()$$);
