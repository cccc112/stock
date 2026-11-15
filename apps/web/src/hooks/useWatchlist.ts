import { useState, useEffect, useCallback } from "react";
import { apiStocks } from "@/lib/api";
import { getCurrentUserNamespace, isAuthenticatedUser, requestLoginModal } from "@/hooks/useAuth";

export interface WatchlistStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market: "TW" | "US";
  category?: string;
  addedAt?: number;
}

export interface WatchlistRecord {
  symbol: string;
  category?: string;
  addedAt?: number;
}

export const DEFAULT_WATCHLIST_SEEDS: WatchlistRecord[] = [];

export const DEFAULT_CATEGORIES = ["全部", "預設"];

export function getWatchlistStorageKey(): string {
  if (typeof window === "undefined") return "watchlist_symbols";
  const ns = getCurrentUserNamespace();
  return ns === "default" ? "watchlist_symbols" : `watchlist_symbols_${ns}`;
}

export function getCategoriesStorageKey(): string {
  if (typeof window === "undefined") return "watchlist_categories";
  const ns = getCurrentUserNamespace();
  return ns === "default" ? "watchlist_categories" : `watchlist_categories_${ns}`;
}

/**
 * 取得自選股記錄（僅限已登入帳號，未登入或新帳號皆為空清單，不預設灌入標的）
 */
export function getStoredWatchlistRecords(): WatchlistRecord[] {
  if (typeof window === "undefined" || !isAuthenticatedUser()) return [];
  const key = getWatchlistStorageKey();
  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === "string") {
          return { symbol: item.trim().toUpperCase(), category: "預設" };
        }
        return item as WatchlistRecord;
      });
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 儲存自選股清單（嚴格隔離至當前登入使用者空間）
 */
export function saveWatchlistRecords(records: WatchlistRecord[]) {
  if (typeof window === "undefined" || !isAuthenticatedUser()) return;
  const key = getWatchlistStorageKey();
  const json = JSON.stringify(records);
  localStorage.setItem(key, json);
  window.dispatchEvent(new CustomEvent("watchlist_changed", { detail: records }));
}

/**
 * 取得自訂分類清單（未登入僅回傳預設基本分類）
 */
export function getStoredCategories(): string[] {
  if (typeof window === "undefined" || !isAuthenticatedUser()) return DEFAULT_CATEGORIES;
  const key = getCategoriesStorageKey();
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set(["全部", ...parsed]));
      }
    } catch {}
  }
  return DEFAULT_CATEGORIES;
}

export function saveStoredCategories(cats: string[]) {
  if (typeof window === "undefined" || !isAuthenticatedUser()) return;
  const key = getCategoriesStorageKey();
  const unique = Array.from(new Set(cats.filter((c) => c && c !== "全部")));
  localStorage.setItem(key, JSON.stringify(unique));
}

/**
 * 取得純代碼列表（向後相容舊元件）
 */
export function getStoredWatchlistSymbols(): string[] {
  return getStoredWatchlistRecords().map((r) => r.symbol);
}

/**
 * 新增自選股（需登入後才能加入；未登入將喚起登入視窗）
 */
export function addSymbolToWatchlist(symbol: string, category = "預設"): boolean {
  if (typeof window === "undefined" || !symbol) return false;
  if (!isAuthenticatedUser()) {
    requestLoginModal();
    return false;
  }
  const clean = symbol.trim().toUpperCase();
  const list = getStoredWatchlistRecords();
  if (!list.some((r) => r.symbol === clean)) {
    const updated = [...list, { symbol: clean, category, addedAt: Date.now() }];
    saveWatchlistRecords(updated);
    return true;
  }
  return false;
}

/**
 * 從自選股移除（需登入）
 */
export function removeSymbolFromWatchlist(symbol: string): boolean {
  if (typeof window === "undefined" || !symbol || !isAuthenticatedUser()) return false;
  const clean = symbol.trim().toUpperCase();
  const list = getStoredWatchlistRecords();
  if (list.some((r) => r.symbol === clean)) {
    const updated = list.filter((r) => r.symbol !== clean);
    saveWatchlistRecords(updated);
    return true;
  }
  return false;
}

/**
 * 修改自選股分類（需登入）
 */
export function updateSymbolCategory(symbol: string, newCategory: string): boolean {
  if (typeof window === "undefined" || !symbol || !isAuthenticatedUser()) return false;
  const clean = symbol.trim().toUpperCase();
  const list = getStoredWatchlistRecords();
  const idx = list.findIndex((r) => r.symbol === clean);
  if (idx !== -1) {
    list[idx].category = newCategory;
    saveWatchlistRecords([...list]);
    return true;
  }
  return false;
}

/**
 * 檢查是否在自選股中
 */
export function isSymbolInWatchlist(symbol: string): boolean {
  if (typeof window === "undefined" || !symbol || !isAuthenticatedUser()) return false;
  const clean = symbol.trim().toUpperCase();
  const list = getStoredWatchlistRecords();
  return list.some((r) => r.symbol === clean);
}

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  const fetchWatchlist = useCallback(async (isManual = false) => {
    try {
      if (isManual) setIsLoading(true);
      const records = getStoredWatchlistRecords();
      setCategories(getStoredCategories());

      if (records.length === 0) {
        setItems([]);
        return;
      }

      // 並行抓取即時報價，嚴格禁止寫死偽造價格
      const results = await Promise.allSettled(
        records.map((r) =>
          Promise.race([
            apiStocks.getQuote(r.symbol).then((res) => res.data),
            new Promise((_, reject) => setTimeout(() => reject("timeout"), 6000)),
          ])
        )
      );

      setItems((prevItems) => {
        const prevMap = new Map(prevItems.map((p) => [p.symbol, p]));
        const stocks: WatchlistStock[] = [];

        results.forEach((res, idx) => {
          const rec = records[idx];
          const existing = prevMap.get(rec.symbol);

          if (res.status === "fulfilled" && res.value && Number((res.value as any).price) > 0) {
            const d = res.value as any;
            stocks.push({
              symbol: d.symbol || rec.symbol,
              name: d.name || existing?.name || rec.symbol,
              price: Number(d.price),
              change: Number(d.change ?? 0),
              change_pct: Number(d.change_pct ?? 0),
              volume: Number(d.volume ?? 0),
              market: d.market ?? (rec.symbol.endsWith(".TW") || /^\d{4}$/.test(rec.symbol) ? "TW" : "US"),
              category: rec.category || existing?.category || "預設",
              addedAt: rec.addedAt || existing?.addedAt,
            });
          } else if (existing) {
            // 請求超時或暫時性網路抖動時，保留現有真實價格，絕不覆蓋假數據
            stocks.push({
              ...existing,
              category: rec.category || existing.category,
            });
          } else {
            // 初次載入但報價尚未返回
            stocks.push({
              symbol: rec.symbol,
              name: rec.symbol,
              price: 0,
              change: 0,
              change_pct: 0,
              volume: 0,
              market: rec.symbol.endsWith(".TW") || /^\d{4}$/.test(rec.symbol) ? "TW" : "US",
              category: rec.category || "預設",
              addedAt: rec.addedAt,
            });
          }
        });

        return stocks;
      });
    } catch (error) {
      console.error("Failed to fetch watchlist", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist(true);

    // 盤中 2.5 秒極速無縫更新最新自選股撮合價
    const timer = setInterval(() => fetchWatchlist(false), 2500);

    const handleUpdate = () => {
      fetchWatchlist(false);
    };

    window.addEventListener("watchlist_changed", handleUpdate);
    window.addEventListener("stock_auth_changed", handleUpdate);

    return () => {
      clearInterval(timer);
      window.removeEventListener("watchlist_changed", handleUpdate);
      window.removeEventListener("stock_auth_changed", handleUpdate);
    };
  }, [fetchWatchlist]);

  const addStock = async (symbol: string, category = "預設") => {
    addSymbolToWatchlist(symbol, category);
    await fetchWatchlist();
  };

  const removeStock = async (symbol: string) => {
    removeSymbolFromWatchlist(symbol);
    await fetchWatchlist();
  };

  const updateCategory = async (symbol: string, newCategory: string) => {
    updateSymbolCategory(symbol, newCategory);
    await fetchWatchlist();
  };

  const addCategory = (name: string) => {
    if (!isAuthenticatedUser()) {
      requestLoginModal();
      return;
    }
    if (!name.trim()) return;
    const clean = name.trim();
    const updated = Array.from(new Set([...categories, clean]));
    saveStoredCategories(updated);
    setCategories(updated);
  };

  return {
    items,
    isLoading,
    categories,
    addStock,
    removeStock,
    addItem: addStock,
    removeItem: removeStock,
    updateCategory,
    addCategory,
    refetch: fetchWatchlist,
  };
}
