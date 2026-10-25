import { useState, useEffect, useCallback } from "react";
import { apiStocks } from "@/lib/api";
import { getCurrentUserNamespace } from "@/hooks/useAuth";

export interface WatchlistStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market: "TW" | "US";
}

export function getWatchlistStorageKey(): string {
  if (typeof window === "undefined") return "watchlist_symbols";
  const ns = getCurrentUserNamespace();
  return ns === "default" ? "watchlist_symbols" : `watchlist_symbols_${ns}`;
}

/**
 * 取得當前使用者的自選股代碼清單
 */
export function getStoredWatchlistSymbols(): string[] {
  if (typeof window === "undefined") return [];
  const key = getWatchlistStorageKey();
  const raw = localStorage.getItem(key);
  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * 儲存當前使用者的自選股清單並廣播變更
 */
export function saveWatchlistSymbols(symbols: string[]) {
  if (typeof window === "undefined") return;
  const key = getWatchlistStorageKey();
  localStorage.setItem(key, JSON.stringify(symbols));
  window.dispatchEvent(new CustomEvent("watchlist_changed", { detail: symbols }));
}

/**
 * 新增代碼至自選股
 */
export function addSymbolToWatchlist(symbol: string): boolean {
  if (typeof window === "undefined" || !symbol) return false;
  const clean = symbol.trim().toUpperCase();
  const list = getStoredWatchlistSymbols();
  if (!list.includes(clean)) {
    const updated = [...list, clean];
    saveWatchlistSymbols(updated);
    return true;
  }
  return false;
}

/**
 * 從自選股移除代碼
 */
export function removeSymbolFromWatchlist(symbol: string): boolean {
  if (typeof window === "undefined" || !symbol) return false;
  const clean = symbol.trim().toUpperCase();
  const list = getStoredWatchlistSymbols();
  if (list.includes(clean)) {
    const updated = list.filter((s) => s !== clean);
    saveWatchlistSymbols(updated);
    return true;
  }
  return false;
}

/**
 * 檢查代碼是否已在自選股中
 */
export function isSymbolInWatchlist(symbol: string): boolean {
  if (typeof window === "undefined" || !symbol) return false;
  const clean = symbol.trim().toUpperCase();
  const list = getStoredWatchlistSymbols();
  return list.includes(clean);
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    try {
      setIsLoading(true);
      const symbols = getStoredWatchlistSymbols();

      if (symbols.length === 0) {
        setItems([]);
        return;
      }

      // Fetch real quotes for each symbol
      const results = await Promise.allSettled(
        symbols.map((sym) => apiStocks.getQuote(sym).then((r) => r.data))
      );

      const stocks: WatchlistStock[] = [];
      results.forEach((res, idx) => {
        if (res.status === "fulfilled" && res.value) {
          const d = res.value;
          stocks.push({
            symbol: d.symbol,
            name: d.name || d.symbol,
            price: d.price ?? 0,
            change: d.change ?? 0,
            change_pct: d.change_pct ?? 0,
            volume: d.volume ?? 0,
            market: d.market ?? "US",
          });
        } else {
          // 若後端暫時無回傳，保留代碼骨架以供展示
          const sym = symbols[idx];
          stocks.push({
            symbol: sym,
            name: sym,
            price: 0,
            change: 0,
            change_pct: 0,
            volume: 0,
            market: sym.endsWith(".TW") ? "TW" : "US",
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

    const handleUpdate = () => {
      fetchWatchlist();
    };

    window.addEventListener("watchlist_changed", handleUpdate);
    window.addEventListener("stock_auth_changed", handleUpdate);

    return () => {
      window.removeEventListener("watchlist_changed", handleUpdate);
      window.removeEventListener("stock_auth_changed", handleUpdate);
    };
  }, [fetchWatchlist]);

  const addStock = async (symbol: string) => {
    addSymbolToWatchlist(symbol);
    await fetchWatchlist();
  };

  const removeStock = async (symbol: string) => {
    removeSymbolFromWatchlist(symbol);
    await fetchWatchlist();
  };

  return {
    items,
    isLoading,
    addStock,
    removeStock,
    addItem: addStock,
    removeItem: removeStock,
    refetch: fetchWatchlist,
  };
}
