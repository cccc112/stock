CREATE TABLE IF NOT EXISTS market_symbols (
    symbol VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    market VARCHAR(10) NOT NULL, -- 'TW' or 'US'
    type VARCHAR(20) NOT NULL, -- 'STOCK' or 'ETF'
    listing_date DATE
);
