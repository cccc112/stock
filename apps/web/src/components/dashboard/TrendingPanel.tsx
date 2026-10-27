"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { apiMarket, apiStocks } from "@/lib/api";
import { Term } from "@/components/ui/TermTooltip";
import { RefreshCw, Flame, ArrowUpRight, DollarSign } from "lucide-react";

interface RankedStock {
  symbol: string;
  name: string;
  market: "TWSE" | "TPEx";
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  turnover_b?: number;
}

const STOCK_NAMES: Record<string, string> = {
  "2330": "台積電", "2317": "鴻海", "2454": "聯發科",
  "3231": "緯創", "2382": "廣達", "2603": "長榮",
  "2881": "富邦金", "2882": "國泰金", "2303": "聯電",
  "3037": "欣興", "2357": "華碩", "2609": "陽明",
  "3017": "奇鋐", "2376": "技嘉", "2618": "長榮航",
  "6669": "緯穎", "2356": "英業達", "2383": "台光電",
  "1519": "華城", "1503": "士電", "1513": "中興電",
  "3661": "世芯-KY", "2615": "萬海", "2891": "中信金",
  "2409": "友達", "2308": "台達電",
  "8069": "元太", "6488": "環球晶", "3293": "鈊象",
  "5347": "世界", "3324": "雙鴻", "8299": "群聯",
  "6223": "旺矽", "3529": "力旺", "6187": "萬潤",
  "5483": "中美晶", "3105": "穩懋", "6547": "高端疫苗",
  "3680": "家登", "3131": "弘塑", "6274": "台燿",
  "8358": "金居", "5425": "台半", "6188": "廣明",
};

const TWSE_POOLS = [
  "2330", "2317", "2454", "3231", "2382", "2603", "2881", "2882",
  "2303", "3037", "2357", "2609", "3017", "2376", "6669", "2383",
  "1519", "1503", "1513", "3661", "2615", "2891", "2409", "2308"
];

const TPEX_POOLS = [
  "8069", "6488", "3293", "5347", "3324", "8299", "6223", "3529",
  "6187", "5483", "3105", "3680", "3131", "6274", "8358", "5425",
  "6188", "6547"
];

const DEFAULT_TWSE: RankedStock[] = [
  { symbol: "2330", name: "台積電", market: "TWSE", price: 0, change: 0, change_pct: 0, volume: 0 },
  { symbol: "2317", name: "鴻海", market: "TWSE", price: 0, change: 0, change_pct: 0, volume: 0 },
  { symbol: "2454", name: "聯發科", market: "TWSE", price: 0, change: 0, change_pct: 0, volume: 0 },
  { symbol: "3231", name: "緯創", market: "TWSE", price: 0, change: 0, change_pct: 0, volume: 0 },
  { symbol: "2382", name: "廣達", market: "TWSE", price: 0, change: 0, change_pct: 0, volume: 0 },
  { symbol: "2603", name: "長榮", market: "TWSE", price: 0, change: 0, change_pct: 0, volume: 0 },
];

const DEFAULT_TPEX: RankedStock[] = [
  { symbol: "8069", name: "元太", market: "TPEx", price: 0, change: 0, change_pct: 0, volume: 0 },
  { symbol: "6488", name: "環球晶", market: "TPEx", price: 0, change: 0, change_pct: 0, volume: 0 },
  { symbol: "3293", name: "鈊象", market: "TPEx", price: 0, change: 0, change_pct: 0, volume: 0 },
  { symbol: "5347", name: "世界", market: "TPEx", price: 0, change: 0, change_pct: 0, volume: 0 },
  { symbol: "3324", name: "雙鴻", market: "TPEx", price: 0, change: 0, change_pct: 0, volume: 0 },
  { symbol: "8299", name: "群聯", market: "TPEx", price: 0, change: 0, change_pct: 0, volume: 0 },
];

export default function TrendingPanel() {
  const router = useRouter();
  const [board, setBoard] = useState<"twse" | "tpex">("twse");
  const [sortType, setSortType] = useState<"volume" | "turnover" | "gainers">("volume");
  const [rankings, setRankings] = useState<{ twse: RankedStock[]; tpex: RankedStock[] }>({
    twse: DEFAULT_TWSE,
    tpex: DEFAULT_TPEX,
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRankings = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setLoading(true);

    try {
      // 1. 優先嘗試後端標準 rankings 端點
      const res = await apiMarket.getRankings(12).catch(() => null);
      const data = res?.data;
      let twseList: RankedStock[] =
        data?.twse && Array.isArray(data.twse) && data.twse.length > 0 ? data.twse : [];
      let tpexList: RankedStock[] =
        data?.tpex && Array.isArray(data.tpex) && data.tpex.length > 0 ? data.tpex : [];

      // 2. 若後端伺服器版本未收錄 rankings，自動降級調用熱門 trending 端點
      if (twseList.length === 0 || twseList.every((s) => !s.price || s.price === 0)) {
        try {
          const trendingRes = await apiMarket.getTrending().catch(() => null);
          if (trendingRes?.data && Array.isArray(trendingRes.data) && trendingRes.data.length > 0) {
            twseList = trendingRes.data
              .map((q: any) => ({
                symbol: q.symbol,
                name: STOCK_NAMES[q.symbol] || q.name || q.symbol,
                market: "TWSE" as const,
                price: Number(q.price) || 0,
                change: Number(q.change) || 0,
                change_pct: Number(q.change_pct) || 0,
                volume: Number(q.volume) || 0,
                turnover_b:
                  Math.round(
                    (((Number(q.price) || 0) * (Number(q.volume) || 0)) / 1e8) * 100
                  ) / 100,
              }))
              .filter((s: RankedStock) => s.price > 0)
              .sort((a: RankedStock, b: RankedStock) => (b.volume || 0) - (a.volume || 0));
          }
        } catch (e) {
          console.error("Trending fallback error:", e);
        }
      }

      // 3. 並行向即時行情池動態請求上市熱門股 (涵蓋半導體、AI、散熱、航運等 24 檔)
      if (twseList.length === 0 || twseList.every((s) => !s.price || s.price === 0) || isManual) {
        const poolToFetch = isManual ? [...TWSE_POOLS].sort(() => 0.5 - Math.random()).slice(0, 16) : TWSE_POOLS.slice(0, 16);
        const quotes = await Promise.allSettled(
          poolToFetch.map((sym) => apiStocks.getQuote(sym))
        );
        const loaded: RankedStock[] = [];
        quotes.forEach((r, idx) => {
          if (r.status === "fulfilled" && r.value?.data && r.value.data.price > 0) {
            const q = r.value.data;
            const sym = poolToFetch[idx];
            loaded.push({
              symbol: sym,
              name: STOCK_NAMES[sym] || q.name || sym,
              market: "TWSE",
              price: q.price,
              change: q.change || 0,
              change_pct: q.change_pct || 0,
              volume: q.volume || 0,
              turnover_b: Math.round(((q.price * (q.volume || 0)) / 1e8) * 100) / 100,
            });
          }
        });
        if (loaded.length > 0) {
          twseList = loaded;
        }
      }

      // 4. 對 TPEx (上櫃) 並行向主機請求即時報價池 (涵蓋矽智財、散熱、半導體設備等 18 檔)
      if (tpexList.length === 0 || tpexList.every((s) => !s.price || s.price === 0) || isManual) {
        const tpexPoolToFetch = isManual ? [...TPEX_POOLS].sort(() => 0.5 - Math.random()).slice(0, 14) : TPEX_POOLS.slice(0, 14);
        const tpexQuotes = await Promise.allSettled(
          tpexPoolToFetch.map((sym) => apiStocks.getQuote(sym))
        );
        const loadedTpex: RankedStock[] = [];
        tpexQuotes.forEach((r, idx) => {
          if (r.status === "fulfilled" && r.value?.data && r.value.data.price > 0) {
            const q = r.value.data;
            const sym = tpexPoolToFetch[idx];
            loadedTpex.push({
              symbol: sym,
              name: STOCK_NAMES[sym] || q.name || sym,
              market: "TPEx",
              price: q.price,
              change: q.change || 0,
              change_pct: q.change_pct || 0,
              volume: q.volume || 0,
              turnover_b: Math.round(((q.price * (q.volume || 0)) / 1e8) * 100) / 100,
            });
          }
        });
        if (loadedTpex.length > 0) {
          tpexList = loadedTpex;
        }
      }

      // 5. 確保個股中文名稱 100% 正確顯示
      twseList = twseList.map((s) => ({
        ...s,
        name: STOCK_NAMES[s.symbol] || s.name || s.symbol,
      }));
      tpexList = tpexList.map((s) => ({
        ...s,
        name: STOCK_NAMES[s.symbol] || s.name || s.symbol,
      }));

      setRankings({
        twse: twseList.length ? twseList : DEFAULT_TWSE,
        tpex: tpexList.length ? tpexList : DEFAULT_TPEX,
      });
    } catch (err) {
      console.error("Failed to load market rankings:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings();
    const interval = setInterval(() => fetchRankings(), 60000);
    return () => clearInterval(interval);
  }, [fetchRankings]);

  const list = useMemo(() => {
    const base = [...(board === "twse" ? rankings.twse : rankings.tpex)];
    if (sortType === "gainers") {
      return base.sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0));
    }
    if (sortType === "turnover") {
      return base.sort((a, b) => (b.turnover_b || 0) - (a.turnover_b || 0));
    }
    return base.sort((a, b) => (b.volume || 0) - (a.volume || 0));
  }, [board, rankings, sortType]);

  const maxVol = Math.max(1, ...list.map((s) => s.volume || 0));

  return (
    <Card
      title={<Term k="twse_tpex" label="台股真實熱門成交排行" />}
      subtitle="即時連線證交所與櫃買中心成交動態，支援成交量、成交值與強勢榜切換"
      headerAction={
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRankings(true)}
            disabled={isRefreshing}
            className="p-1 rounded-md text-secondary hover:text-primary transition-colors cursor-pointer"
            title="點擊手動刷新最新排行榜行情"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-accent" : ""} />
          </button>

          <div className="flex bg-[var(--bg-primary)] p-0.5 rounded-lg border border-[var(--border)]">
            <button
              onClick={() => setBoard("twse")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                board === "twse"
                  ? "bg-accent text-white"
                  : "text-secondary hover:text-primary"
              }`}
            >
              上市 (TWSE)
            </button>
            <button
              onClick={() => setBoard("tpex")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                board === "tpex"
                  ? "bg-accent text-white"
                  : "text-secondary hover:text-primary"
              }`}
            >
              上櫃 (TPEx)
            </button>
          </div>
        </div>
      }
      className="h-full"
    >
      {/* 排序維度快捷切換 */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border)] text-xs">
        <span className="text-secondary font-medium">排序條件：</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setSortType("volume")}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              sortType === "volume"
                ? "bg-accent/15 text-accent border border-accent/30 font-bold"
                : "text-muted hover:text-secondary"
            }`}
          >
            <Flame size={12} /> 成交量
          </button>
          <button
            onClick={() => setSortType("turnover")}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              sortType === "turnover"
                ? "bg-accent/15 text-accent border border-accent/30 font-bold"
                : "text-muted hover:text-secondary"
            }`}
          >
            <DollarSign size={12} /> 成交金額
          </button>
          <button
            onClick={() => setSortType("gainers")}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              sortType === "gainers"
                ? "bg-red-500/15 text-red-400 border border-red-500/30 font-bold"
                : "text-muted hover:text-secondary"
            }`}
          >
            <ArrowUpRight size={12} /> 今日漲幅
          </button>
        </div>
      </div>
      <div className="overflow-x-auto -mx-5 -my-5">
        {loading ? (
          <div className="animate-pulse space-y-3 p-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-9 bg-[var(--bg-tertiary)] rounded-md" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-secondary text-sm">暫無資料</div>
        ) : (
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>標的</th>
                <th className="text-right">成交價</th>
                <th className="text-right">漲跌</th>
                <th className="text-right">漲跌幅</th>
                <th className="text-right w-32">成交量熱度</th>
              </tr>
            </thead>
            <tbody>
              {list.map((stock, idx) => {
                const changePct = stock.change_pct ?? 0;
                const volRatio = Math.min(100, Math.round(((stock.volume || 0) / maxVol) * 100));
                return (
                  <tr
                    key={stock.symbol}
                    className="cursor-pointer group"
                    onClick={() => router.push(`/stock/${stock.symbol}`)}
                  >
                    <td className="font-mono text-xs text-muted font-bold">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-primary group-hover:text-accent transition-colors">
                          {stock.symbol}
                        </span>
                        <span className="text-secondary text-xs sm:text-sm truncate max-w-[96px]">
                          {stock.name}
                        </span>
                      </div>
                    </td>
                    <td className="text-right font-mono font-semibold">
                      {stock.price > 0 ? formatNumber(stock.price, 2) : "-"}
                    </td>
                    <td
                      className={`text-right font-mono ${getChangeColorClass(
                        stock.change,
                        "TW"
                      )}`}
                    >
                      {stock.change > 0 ? "+" : ""}
                      {stock.price > 0 ? stock.change.toFixed(2) : "-"}
                    </td>
                    <td className="text-right">
                      <Badge value={changePct} market="TW" size="sm" />
                    </td>
                    <td className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-xs text-secondary">
                          {formatVolume(stock.volume)}
                        </span>
                        <div className="w-20 h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent/80 rounded-full"
                            style={{ width: `${Math.max(8, volRatio)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
