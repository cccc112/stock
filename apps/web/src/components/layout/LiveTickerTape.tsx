"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiStocks } from "@/lib/api";
import { isTwMarketTradingHours } from "@/lib/marketHours";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown, PauseCircle } from "lucide-react";

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
}

const DEFAULT_TICKERS: TickerItem[] = [
  { symbol: "^TWII", name: "台股加權", price: 0, change: 0, change_pct: 0 },
  { symbol: "2330", name: "台積電", price: 0, change: 0, change_pct: 0 },
  { symbol: "2317", name: "鴻海", price: 0, change: 0, change_pct: 0 },
  { symbol: "2454", name: "聯發科", price: 0, change: 0, change_pct: 0 },
  { symbol: "2603", name: "長榮", price: 0, change: 0, change_pct: 0 },
  { symbol: "3231", name: "緯創", price: 0, change: 0, change_pct: 0 },
  { symbol: "2382", name: "廣達", price: 0, change: 0, change_pct: 0 },
  { symbol: "0050", name: "元大台灣50", price: 0, change: 0, change_pct: 0 },
  { symbol: "^SOX", name: "費城半導體", price: 0, change: 0, change_pct: 0 },
  { symbol: "NVDA", name: "輝達 NVDA", price: 0, change: 0, change_pct: 0 },
  { symbol: "TSLA", name: "特斯拉 TSLA", price: 0, change: 0, change_pct: 0 },
  { symbol: "BTC-USD", name: "比特幣 BTC", price: 0, change: 0, change_pct: 0 },
];

export default function LiveTickerTape() {
  const [items, setItems] = useState<TickerItem[]>(DEFAULT_TICKERS);
  const [isTrading, setIsTrading] = useState<boolean>(() => isTwMarketTradingHours(false));

  // 每 15 秒同步檢查台股是否處於交易時段 (09:00 ~ 13:30 Asia/Taipei)
  useEffect(() => {
    const syncMarketState = () => {
      setIsTrading(isTwMarketTradingHours(false));
    };
    syncMarketState();
    const stateTimer = setInterval(syncMarketState, 15000);
    return () => clearInterval(stateTimer);
  }, []);

  // 啟動時先拉取一次最新/收盤報價；僅於交易期間才啟用每 8 秒即時輪詢
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
    if (!isTrading) {
      return () => {
        mounted = false;
      };
    }

    const timer = setInterval(fetchAll, 8000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [isTrading]);

  // 僅於台股交易期間複製兩份達成無縫滾動跑馬燈；收盤後改為靜止單行顯示
  const displayItems = isTrading ? [...items, ...items] : items;

  return (
    <div className="w-full overflow-hidden bg-[var(--bg-secondary)]/90 border-b border-[var(--border)] py-1.5 select-none backdrop-blur-md flex items-center">
      <div className="flex-shrink-0 pl-3 pr-2 border-r border-[var(--border)] mr-2 flex items-center gap-1.5 text-[10px] font-mono">
        {isTrading ? (
          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            盤中跑馬燈
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-muted font-medium"
            title="僅於台股交易時段 (週一至週五 09:00-13:30) 自動滾動更新"
          >
            <PauseCircle size={11} className="text-amber-400/80" />
            已收盤 · 靜態
          </span>
        )}
      </div>

      <div className="flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-y-hidden">
        <div
          className={
            isTrading
              ? "animate-ticker-marquee flex items-center gap-6 px-3"
              : "flex items-center gap-6 px-3 w-max"
          }
        >
          {displayItems.map((item, idx) => {
            const isUp = item.change_pct >= 0;
            const hasPrice = item.price > 0;
            return (
              <Link
                key={`${item.symbol}-${idx}`}
                href={`/stock/${encodeURIComponent(item.symbol)}`}
                className="inline-flex items-center gap-2 text-xs font-mono hover:opacity-80 transition-opacity whitespace-nowrap"
              >
                <span className="font-bold text-primary">{item.name}</span>
                <span className="text-[11px] text-muted">{item.symbol.replace("^", "")}</span>
                <span className="font-bold text-primary tabular-nums">
                  {hasPrice ? formatNumber(item.price, item.price > 500 ? 0 : 2) : "—"}
                </span>
                {hasPrice && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.2 rounded ${
                      isUp ? "text-up bg-up-badge" : "text-down bg-down-badge"
                    }`}
                  >
                    {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {isUp ? `+${item.change_pct.toFixed(2)}%` : `${item.change_pct.toFixed(2)}%`}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
