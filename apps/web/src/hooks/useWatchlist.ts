import { useState, useEffect, useCallback } from 'react';
import { apiStocks } from '@/lib/api';

interface WatchlistStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market: 'TW' | 'US';
}

// Default watchlist symbols stored in localStorage
const STORAGE_KEY = 'watchlist_symbols';
const DEFAULT_SYMBOLS = ['2330.TW', '2454.TW', 'AAPL', 'NVDA'];

function getStoredSymbols(): string[] {
  if (typeof window === 'undefined') return DEFAULT_SYMBOLS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { return DEFAULT_SYMBOLS; }
  }
  return DEFAULT_SYMBOLS;
}

function setStoredSymbols(symbols: string[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
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
    // Auto-refresh every 30 seconds
    const timer = setInterval(fetchWatchlist, 30000);
    return () => clearInterval(timer);
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
