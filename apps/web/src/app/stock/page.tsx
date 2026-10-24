"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { Search } from "lucide-react";
import { apiStocks } from "@/lib/api";

const quickCategories = [
  {
    title: "台股熱門與上櫃代表",
    items: [
      { symbol: "2330", name: "台積電", tag: "上市半導體" },
      { symbol: "2454", name: "聯發科", tag: "上市IC設計" },
      { symbol: "2317", name: "鴻海", tag: "AI伺服器" },
      { symbol: "6486", name: "互動", tag: "上櫃通信網路" },
      { symbol: "8069", name: "元太", tag: "上櫃電子紙" },
      { symbol: "6488", name: "環球晶", tag: "上櫃矽晶圓" },
    ],
  },
  {
    title: "熱門台美 ETF",
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
      { symbol: "NVDA", name: "NVIDIA", tag: "美股 AI" },
      { symbol: "AAPL", name: "Apple", tag: "美股科技" },
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
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-8 mt-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">個股與跨資產全能檢索</h1>
        <p className="text-secondary text-sm">
          支援台股全市場（上市、上櫃、興櫃、ETF，可打簡稱如「互動」、「台積」）、美股、加密貨幣、黃金、原物料與匯率
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
          placeholder="輸入股號、公司中文名稱、ETF 或跨資產 (例: 互動, 2330, 0050, 黃金, BTC, NVDA)"
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl py-3.5 pl-11 pr-24 text-base focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          className="absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          查詢
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

      <div className="space-y-6">
        {quickCategories.map((group) => (
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
