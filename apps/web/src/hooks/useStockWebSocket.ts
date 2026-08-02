import { useState, useEffect, useCallback } from 'react';

export function useStockWebSocket(symbol: string) {
  const [quote, setQuote] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!symbol) return;
    
    // Fallback Mock implementation since WS might not be ready
    let interval: NodeJS.Timeout;
    setIsConnected(true);
    
    // Simulate initial fetch
    setQuote({
      symbol,
      price: 150 + Math.random() * 10,
      change: (Math.random() - 0.5) * 5,
      changePercent: (Math.random() - 0.5) * 3,
      volume: Math.floor(Math.random() * 1000000),
      timestamp: Date.now()
    });

    interval = setInterval(() => {
      setQuote((prev: any) => {
        if (!prev) return null;
        const changeDiff = (Math.random() - 0.5) * 0.5;
        const newPrice = prev.price + changeDiff;
        return {
          ...prev,
          price: newPrice,
          change: prev.change + changeDiff,
          changePercent: ((prev.change + changeDiff) / (newPrice - prev.change - changeDiff)) * 100,
          timestamp: Date.now()
        };
      });
    }, 3000);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, [symbol]);

  return { quote, isConnected, error };
}
