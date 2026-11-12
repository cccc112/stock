"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { apiMarket } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Flame, LayoutGrid, RefreshCw } from "lucide-react";

interface HeatmapItem {
  symbol: string;
  name: string;
  sector: "ai_semi" | "shipping_power" | "finance" | "etf";
  price: number;
  change_pct: number;
  volume: number;
  weight: "lg" | "md" | "sm";
}

const BASE_HEATMAP_STOCKS: HeatmapItem[] = [
  { symbol: "2330", name: "台積電", sector: "ai_semi", price: 1065, change_pct: 1.43, volume: 48500, weight: "lg" },
  { symbol: "2317", name: "鴻海", sector: "ai_semi", price: 215.5, change_pct: 1.65, volume: 62300, weight: "lg" },
  { symbol: "2454", name: "聯發科", sector: "ai_semi", price: 1310, change_pct: 1.55, volume: 9800, weight: "md" },
  { symbol: "2382", name: "廣達", sector: "ai_semi", price: 322, change_pct: 1.74, volume: 28400, weight: "md" },
  { symbol: "3231", name: "緯創", sector: "ai_semi", price: 118.5, change_pct: 2.15, volume: 45200, weight: "md" },
  { symbol: "3017", name: "奇鋐", sector: "ai_semi", price: 668, change_pct: 3.25, volume: 15200, weight: "sm" },
  { symbol: "2303", name: "聯電", sector: "ai_semi", price: 50.2, change_pct: -0.79, volume: 68000, weight: "sm" },
  { symbol: "2603", name: "長榮", sector: "shipping_power", price: 224.5, change_pct: 2.98, volume: 54100, weight: "md" },
  { symbol: "2609", name: "陽明", sector: "shipping_power", price: 72.5, change_pct: 2.4, volume: 68200, weight: "sm" },
  { symbol: "1519", name: "華城", sector: "shipping_power", price: 645, change_pct: 3.53, volume: 8900, weight: "sm" },
  { symbol: "1513", name: "中興電", sector: "shipping_power", price: 162.5, change_pct: 1.88, volume: 19400, weight: "sm" },
  { symbol: "2881", name: "富邦金", sector: "finance", price: 91.2, change_pct: 0.55, volume: 24500, weight: "sm" },
  { symbol: "2891", name: "中信金", sector: "finance", price: 36.8, change_pct: 0.82, volume: 39800, weight: "sm" },
  { symbol: "0050", name: "元大台灣50", sector: "etf", price: 196.2, change_pct: 1.08, volume: 42000, weight: "md" },
  { symbol: "00878", name: "國泰永續高股息", sector: "etf", price: 22.85, change_pct: 0.44, volume: 86000, weight: "sm" },
  { symbol: "00919", name: "群益台灣精選高息", sector: "etf", price: 23.95, change_pct: 0.63, volume: 95000, weight: "sm" },
];

function getHeatTileColor(pct: number): string {
  if (pct >= 3.0) {
    return "bg-gradient-to-br from-rose-600 via-red-600 to-rose-700 text-white border-rose-400/60 shadow-lg shadow-rose-600/20";
  }
  if (pct >= 1.0) {
    return "bg-gradient-to-br from-rose-600/85 to-red-800/90 text-white border-rose-500/40";
  }
  if (pct > 0) {
    return "bg-gradient-to-br from-rose-900/75 to-slate-900 text-rose-200 border-rose-500/30";
  }
  if (pct === 0) {
    return "bg-slate-800/80 text-slate-200 border-slate-700";
  }
  if (pct > -1.5) {
    return "bg-gradient-to-br from-emerald-900/75 to-slate-900 text-emerald-200 border-emerald-500/30";
  }
  if (pct > -3.0) {
    return "bg-gradient-to-br from-emerald-600/85 to-teal-800/90 text-white border-emerald-500/40";
  }
  return "bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 text-white border-emerald-400/60 shadow-lg shadow-emerald-600/20";
}

export default function SectorHeatmap() {
  const [items, setItems] = useState<HeatmapItem[]>(BASE_HEATMAP_STOCKS);
  const [filter, setFilter] = useState<"all" | "ai_semi" | "shipping_power" | "etf">("all");
  const [refreshing, setRefreshing] = useState(false);

  const loadLiveFlow = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await apiMarket.getCapitalFlow();
      const arr = Array.isArray(res?.data) ? res.data : [];
      if (arr.length > 0) {
        const bySym = new Map<string, any>(arr.map((x: any) => [String(x.symbol).toUpperCase(), x]));
        setItems((prev) =>
          prev.map((item) => {
            const live = bySym.get(item.symbol);
            if (!live || !live.price) return item;
            return {
              ...item,
              price: Number(live.price) || item.price,
              change_pct: Number(live.change_pct ?? item.change_pct),
              volume: Number(live.volume) || item.volume,
            };
          })
        );
      }
    } catch {
      // keep previous snapshot
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadLiveFlow();
    const timer = setInterval(() => loadLiveFlow(false), 6000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.sector === filter);
  }, [items, filter]);

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <LayoutGrid size={16} className="text-accent" />
          <span>台股盤中資金板塊熱力圖 (Sector Treemap)</span>
        </div>
      }
      subtitle="方塊面積代表權重與成交熱度，紅綠深淺反映即時漲跌動能（點擊方塊直達 K 線戰情室）"
      headerAction={
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => loadLiveFlow(true)}
            className="p-1.5 rounded-lg text-secondary hover:text-primary transition-colors cursor-pointer"
            title="手動刷新熱力圖"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-accent" : ""} />
          </button>
          <div className="flex bg-[var(--bg-primary)] p-0.5 rounded-lg border border-[var(--border)] text-xs">
            {[
              { id: "all", label: "全市場" },
              { id: "ai_semi", label: "AI 半導體" },
              { id: "shipping_power", label: "航運重電" },
              { id: "etf", label: "熱門 ETF" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer whitespace-nowrap ${
                  filter === tab.id
                    ? "bg-accent text-white font-bold shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 auto-rows-[76px] gap-2">
        {filtered.map((item) => {
          const spanClass =
            item.weight === "lg" && filter === "all"
              ? "col-span-2 row-span-2"
              : item.weight === "md" && filter === "all"
              ? "col-span-2 row-span-1"
              : "col-span-1 row-span-1";

          const colorClass = getHeatTileColor(item.change_pct);
          const isPositive = item.change_pct > 0;

          return (
            <Link
              key={item.symbol}
              href={`/stock/${encodeURIComponent(item.symbol)}`}
              className={`${spanClass} ${colorClass} rounded-xl border p-3 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:brightness-110 active:scale-95 cursor-pointer relative overflow-hidden group`}
            >
              <div className="flex items-start justify-between gap-1 z-10">
                <div className="min-w-0">
                  <div className="font-extrabold text-xs sm:text-sm truncate leading-tight">
                    {item.name}
                  </div>
                  <div className="font-mono text-[10px] opacity-80">{item.symbol}</div>
                </div>
                {Math.abs(item.change_pct) >= 2.5 && (
                  <Flame size={13} className="text-amber-300 animate-pulse flex-shrink-0" />
                )}
              </div>

              <div className="flex items-baseline justify-between gap-1 z-10 mt-auto">
                <span
                  className={`font-mono font-bold tabular-nums ${
                    item.weight === "lg" ? "text-base sm:text-xl" : "text-xs sm:text-sm"
                  }`}
                >
                  ${formatNumber(item.price, item.price >= 500 ? 0 : 2)}
                </span>
                <span
                  className={`font-mono font-extrabold tabular-nums ${
                    item.weight === "lg" ? "text-sm sm:text-base" : "text-xs"
                  }`}
                >
                  {isPositive ? `+${item.change_pct.toFixed(2)}%` : `${item.change_pct.toFixed(2)}%`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
