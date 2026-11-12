"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiStocks } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
}

const DEFAULT_TICKERS: TickerItem[] = [
  { symbol: "^TWII", name: "台股加權", price: 23520, change: 145, change_pct: 0.62 },
  { symbol: "2330", name: "台積電", price: 1065, change: 15, change_pct: 1.43 },
  { symbol: "2317", name: "鴻海", price: 215.5, change: 3.5, change_pct: 1.65 },
  { symbol: "2454", name: "聯發科", price: 1310, change: 20, change_pct: 1.55 },
  { symbol: "2603", name: "長榮", price: 224.5, change: 6.5, change_pct: 2.98 },
  { symbol: "3231", name: "緯創", price: 118.5, change: 2.5, change_pct: 2.15 },
  { symbol: "2382", name: "廣達", price: 322, change: 5.5, change_pct: 1.74 },
  { symbol: "0050", name: "元大台灣50", price: 196.2, change: 2.1, change_pct: 1.08 },
  { symbol: "^SOX", name: "費城半導體", price: 5210, change: 68, change_pct: 1.32 },
  { symbol: "NVDA", name: "輝達 NVDA", price: 146.8, change: 3.2, change_pct: 2.23 },
  { symbol: "TSLA", name: "特斯拉 TSLA", price: 328.5, change: 8.4, change_pct: 2.62 },
  { symbol: "BTC-USD", name: "比特幣 BTC", price: 89400, change: 2150, change_pct: 2.46 },
];

export default function LiveTickerTape() {
  const [items, setItems] = useState<TickerItem[]>(DEFAULT_TICKERS);

  useEffect(() => {
    let mounted = true;
    const fetchAll = async () => {
      const results = await Promise.allSettled(
        DEFAULT_TICKERS.map((t) =>
          apiStocks.getQuote(t.symbol).then((r) => ({ symbol: t.symbol, data: r.data }))
        )
      );
      if (!mounted) return;
      setItems((prev) =>
        prev.map((item, idx) => {
          const res = results[idx];
          if (res.status === "fulfilled" && res.value?.data?.price > 0) {
            const d = res.value.data;
            return {
              ...item,
              price: d.price,
              change: d.change ?? item.change,
              change_pct: d.change_pct ?? item.change_pct,
            };
          }
          return item;
        })
      );
    };

    fetchAll();
    const timer = setInterval(fetchAll, 8000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  // 複製兩份陣列達成 100% 無縫循環滾動 (Seamless Marquee)
  const loopItems = [...items, ...items];

  return (
    <div className="w-full overflow-hidden bg-[var(--bg-secondary)]/90 border-b border-[var(--border)] py-1.5 select-none backdrop-blur-md">
      <div className="animate-ticker-marquee flex items-center gap-6 px-4">
        {loopItems.map((item, idx) => {
          const isUp = item.change_pct >= 0;
          return (
            <Link
              key={`${item.symbol}-${idx}`}
              href={`/stock/${encodeURIComponent(item.symbol)}`}
              className="inline-flex items-center gap-2 text-xs font-mono hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              <span className="font-bold text-primary">{item.name}</span>
              <span className="text-[11px] text-muted">{item.symbol.replace("^", "")}</span>
              <span className="font-bold text-primary tabular-nums">
                {formatNumber(item.price, item.price > 500 ? 0 : 2)}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.2 rounded ${
                  isUp ? "text-up bg-up-badge" : "text-down bg-down-badge"
                }`}
              >
                {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {isUp ? `+${item.change_pct.toFixed(2)}%` : `${item.change_pct.toFixed(2)}%`}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
