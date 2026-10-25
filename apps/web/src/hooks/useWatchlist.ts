import { useState, useEffect, useCallback } from 'react';
import { apiStocks } from '@/lib/api';
import { getCurrentUserNamespace } from '@/hooks/useAuth';

interface WatchlistStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market: 'TW' | 'US';
}

// 每個 Google 帳號擁有獨立的自選股空間
const DEFAULT_SYMBOLS = ['2330.TW', '2454.TW', 'AAPL', 'NVDA'];

function getStorageKey(): string {
  const ns = getCurrentUserNamespace();
  return ns === 'default' ? 'watchlist_symbols' : `watchlist_symbols_${ns}`;
}

function getStoredSymbols(): string[] {
  if (typeof window === 'undefined') return DEFAULT_SYMBOLS;
  const key = getStorageKey();
  const stored = localStorage.getItem(key);
  if (stored) {
    try { return JSON.parse(stored); } catch { return DEFAULT_SYMBOLS; }
  }
  // 若新使用者初次登入，帶入預設清單
  return DEFAULT_SYMBOLS;
}

function setStoredSymbols(symbols: string[]) {
  if (typeof window !== 'undefined') {
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(symbols));
  }
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    try {
      setIsLoading(true);
      const symbols = getStoredSymbols();
      
      // Fetch real quotes for each symbol
      const results = await Promise.allSettled(
        symbols.map(sym => apiStocks.getQuote(sym).then(r => r.data))
      );

      const stocks: WatchlistStock[] = [];
      results.forEach((res) => {
        if (res.status === 'fulfilled' && res.value) {
          const d = res.value;
          stocks.push({
            symbol: d.symbol,
            name: d.name || d.symbol,
            price: d.price ?? 0,
            change: d.change ?? 0,
            change_pct: d.change_pct ?? 0,
            volume: d.volume ?? 0,
            market: d.market ?? 'US',
          });
        }
      });

      setItems(stocks);
    } catch (error) {
      console.error("Failed to fetch watchlist", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
    // 切換 Google 帳號時立即載入該帳號之獨立自選股
    const handleAuthChange = () => fetchWatchlist();
    window.addEventListener("stock_auth_changed", handleAuthChange);
    // Auto-refresh every 30 seconds
    const timer = setInterval(fetchWatchlist, 30000);
    return () => {
      window.removeEventListener("stock_auth_changed", handleAuthChange);
      clearInterval(timer);
    };
  }, [fetchWatchlist]);

  const addItem = async (symbol: string) => {
    const symbols = getStoredSymbols();
    if (!symbols.includes(symbol)) {
      symbols.push(symbol);
      setStoredSymbols(symbols);
      await fetchWatchlist();
    }
  };

  const removeItem = async (symbol: string) => {
    const symbols = getStoredSymbols().filter(s => s !== symbol);
    setStoredSymbols(symbols);
    setItems(prev => prev.filter(i => i.symbol !== symbol));
  };

  return { items, addItem, removeItem, isLoading, refreshQuotes: fetchWatchlist };
}
