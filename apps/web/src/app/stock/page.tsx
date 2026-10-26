"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { Search } from "lucide-react";
import { apiStocks, apiMarket } from "@/lib/api";
import { formatNumber, formatVolume } from "@/lib/utils";

interface RankedItem {
  symbol: string;
  name: string;
  market: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  turnover_b?: number;
}

const staticCategories = [
  {
    title: "熱門台美 ETF 追蹤",
    items: [
      { symbol: "0050", name: "元大台灣50", tag: "市值型 ETF" },
      { symbol: "00878", name: "國泰永續高股息", tag: "高股息 ETF" },
      { symbol: "00919", name: "群益台灣精選高息", tag: "高股息 ETF" },
      { symbol: "00679B", name: "元大美債20年", tag: "美債 ETF" },
      { symbol: "SPY", name: "SPDR S&P 500", tag: "美股大盤 ETF" },
      { symbol: "QQQ", name: "Invesco Nasdaq 100", tag: "美股科技 ETF" },
    ],
  },
  {
    title: "美股巨頭與跨資產標的",
    items: [
      { symbol: "NVDA", name: "NVIDIA", tag: "美股 AI 晶片" },
      { symbol: "AAPL", name: "Apple", tag: "美股科技巨頭" },
      { symbol: "BTC-USD", name: "比特幣 (Bitcoin)", tag: "加密貨幣" },
      { symbol: "GC=F", name: "黃金期貨 (Gold)", tag: "貴金屬避險" },
      { symbol: "TWD=X", name: "美元/台幣 (USD/TWD)", tag: "外匯匯率" },
      { symbol: "^TNX", name: "美債10年殖利率", tag: "宏觀利率" },
    ],
  },
];

export default function StockIndexPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [twseTop, setTwseTop] = useState<RankedItem[]>([]);
  const [tpexTop, setTpexTop] = useState<RankedItem[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(true);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadRankings = async () => {
      try {
        const res = await apiMarket.getRankings(6).catch(() => null);
        if (res?.data?.twse && res.data.twse.length > 0) {
          setTwseTop(res.data.twse.slice(0, 6));
          if (res.data?.tpex) setTpexTop(res.data.tpex.slice(0, 6));
          return;
        }

        // 降級調用主機即時 trending 端點
        const trendingRes = await apiMarket.getTrending().catch(() => null);
        if (trendingRes?.data && Array.isArray(trendingRes.data) && trendingRes.data.length > 0) {
          const mapped = trendingRes.data
            .map((q: any) => ({
              symbol: q.symbol,
              name: q.name || q.symbol,
              market: "TWSE",
              price: Number(q.price) || 0,
              change: Number(q.change) || 0,
              change_pct: Number(q.change_pct) || 0,
              volume: Number(q.volume) || 0,
              turnover_b:
                Math.round(
                  (((Number(q.price) || 0) * (Number(q.volume) || 0)) / 1e8) * 100
                ) / 100,
            }))
            .filter((s: any) => s.price > 0)
            .sort((a: any, b: any) => (b.volume || 0) - (a.volume || 0));
          setTwseTop(mapped.slice(0, 6));
        }

        // 上櫃 TPEx 代表股並行即時行情
        const tpexPool = ["8069", "6488", "3293", "5347", "3324", "8299"];
        const tpexQuotes = await Promise.allSettled(
          tpexPool.map((s) => apiStocks.getQuote(s))
        );
        const tpexList: RankedItem[] = [];
        tpexQuotes.forEach((r, idx) => {
          if (r.status === "fulfilled" && r.value?.data && r.value.data.price > 0) {
            const q = r.value.data;
            tpexList.push({
              symbol: tpexPool[idx],
              name: q.name || tpexPool[idx],
              market: "TPEx",
              price: q.price,
              change: q.change || 0,
              change_pct: q.change_pct || 0,
              volume: q.volume || 0,
              turnover_b: Math.round(((q.price * (q.volume || 0)) / 1e8) * 100) / 100,
            });
          }
        });
        if (tpexList.length > 0) {
          tpexList.sort((a, b) => (b.volume || 0) - (a.volume || 0));
          setTpexTop(tpexList.slice(0, 6));
        }
      } catch (err) {
        console.error("Failed to load rankings on stock page:", err);
      } finally {
        setLoadingRankings(false);
      }
    };

    loadRankings();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiStocks.searchStocks(q);
        setSuggestions(Array.isArray(res.data) ? res.data : []);
        setShowDropdown(true);
      } catch (e) {
        console.error(e);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (suggestions.length > 0) {
      router.push(`/stock/${encodeURIComponent(suggestions[0].symbol)}`);
      return;
    }
    try {
      const res = await apiStocks.searchStocks(q);
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length > 0) {
        router.push(`/stock/${encodeURIComponent(list[0].symbol)}`);
        return;
      }
    } catch {
      // fallback
    }
    router.push(`/stock/${encodeURIComponent(q)}`);
  };

  const handleSelect = (symbol: string) => {
    setSearchQuery(symbol);
    setShowDropdown(false);
    router.push(`/stock/${encodeURIComponent(symbol)}`);
  };

  const renderLiveBoard = (title: string, badgeLabel: string, items: RankedItem[]) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-primary tracking-wider">{title}</h2>
          <span className="text-[11px] px-2 py-0.5 rounded bg-accent/15 text-accent font-medium">
            {badgeLabel}
          </span>
        </div>
        <span className="text-xs text-muted">依市場真實成交量 / 成交值即時排序</span>
      </div>
      {loadingRankings && items.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {items.map((item, idx) => (
            <Link key={item.symbol} href={`/stock/${encodeURIComponent(item.symbol)}`}>
              <Card className="hover:border-accent/60 transition-all cursor-pointer h-full">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-base font-bold text-primary">{item.symbol}</span>
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-muted border border-[var(--border)]">
                    TOP {idx + 1}
                  </span>
                </div>
                <div className="text-sm text-secondary truncate font-medium mb-2">{item.name}</div>
                <div className="flex items-baseline justify-between gap-1 pt-2 border-t border-[var(--border)]">
                  <span className="font-mono text-sm font-bold text-primary">
                    {item.price > 0 ? formatNumber(item.price, 2) : "-"}
                  </span>
                  <Badge value={item.change_pct ?? 0} market="TW" size="sm" />
                </div>
                <div className="text-[11px] text-muted mt-1.5 flex justify-between font-mono">
                  <span>量 {formatVolume(item.volume)}</span>
                  {item.turnover_b ? <span>{item.turnover_b}億</span> : null}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-8 mt-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">個股研究與跨資產檢索中心</h1>
        <p className="text-secondary text-sm">
          支援台股全市場 3,167 檔（上市、上櫃、興櫃、ETF，可打簡稱或股號）、美股、加密貨幣、黃金、原物料與匯率
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search size={18} className="text-secondary" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder="輸入股號、公司中文簡稱、ETF 或跨資產 (例: 2330, 台積電, 元太, 0050, 黃金, BTC, NVDA)"
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl py-3.5 pl-11 pr-24 text-base focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          className="absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          開始研究
        </button>

        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-20 w-full mt-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
          >
            {suggestions.map((s: any) => (
              <div
                key={`${s.symbol}-${s.name}`}
                className="px-4 py-3 hover:bg-[var(--bg-tertiary)] cursor-pointer flex justify-between items-center border-b border-[var(--border)] last:border-0"
                onClick={() => handleSelect(s.symbol)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-accent">{s.symbol}</span>
                  <span className="text-primary font-medium">{s.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {s.industry && (
                    <span className="text-xs bg-[var(--bg-tertiary)] px-2 py-0.5 rounded text-secondary">
                      {s.industry}
                    </span>
                  )}
                  <span className="text-xs font-mono bg-[var(--bg-primary)] px-2 py-0.5 rounded text-muted border border-[var(--border)]">
                    {s.market}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </form>

      <div className="space-y-7">
        {renderLiveBoard("台股上市熱門成交榜 (TWSE)", "上市真實量能", twseTop)}
        {renderLiveBoard("台股上櫃熱門成交榜 (TPEx)", "上櫃真實量能", tpexTop)}

        {staticCategories.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3">
              {group.title}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {group.items.map((item) => (
                <Link key={item.symbol} href={`/stock/${encodeURIComponent(item.symbol)}`}>
                  <Card className="hover:border-accent/50 transition-colors cursor-pointer h-full">
                    <div className="font-mono text-base font-bold text-primary mb-0.5">{item.symbol}</div>
                    <div className="text-sm text-secondary truncate">{item.name}</div>
                    <div className="text-[11px] text-muted mt-2">{item.tag}</div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
