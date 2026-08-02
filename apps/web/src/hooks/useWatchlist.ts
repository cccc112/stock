import { useState, useEffect, useCallback } from 'react';
import { apiWatchlist } from '@/lib/api';

export function useWatchlist() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    try {
      setIsLoading(true);
      // Mock data for now to ensure UI works without backend
      // const res = await apiWatchlist.getQuotes();
      // setItems(res.data);
      setItems([
        { symbol: '2330', name: '台積電', price: 950, change: 15, changePercent: 1.6, volume: 34500, market: 'TW' },
        { symbol: '2454', name: '聯發科', price: 1200, change: -10, changePercent: -0.83, volume: 12000, market: 'TW' },
        { symbol: 'AAPL', name: 'Apple Inc.', price: 215.3, change: 2.1, changePercent: 0.98, volume: 45000000, market: 'US' },
        { symbol: 'NVDA', name: 'NVIDIA', price: 115.4, change: 5.2, changePercent: 4.7, volume: 89000000, market: 'US' }
      ]);
    } catch (error) {
      console.error("Failed to fetch watchlist", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const addItem = async (symbol: string) => {
    try {
      // await apiWatchlist.addItem(symbol);
      await fetchWatchlist();
    } catch (e) {
      console.error(e);
    }
  };

  const removeItem = async (symbol: string) => {
    try {
      // await apiWatchlist.removeItem(symbol);
      setItems(prev => prev.filter(i => i.symbol !== symbol));
    } catch (e) {
      console.error(e);
    }
  };

  return { items, addItem, removeItem, isLoading, refreshQuotes: fetchWatchlist };
}
