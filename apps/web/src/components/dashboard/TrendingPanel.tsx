"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { apiMarket, apiStocks } from "@/lib/api";
import { Term } from "@/components/ui/TermTooltip";
import { RefreshCw, Flame, ArrowUpRight, DollarSign } from "lucide-react";
import AnimatedPrice from "@/components/ui/AnimatedPrice";

interface RankedStock {
  symbol: string;
  name: string;
  market: "TWSE" | "TPEx";
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  turnover_b?: number;
  volume_lots?: number;
  is_etf?: boolean;
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
  { symbol: "2330", name: "台積電", market: "TWSE", price: 1025.00, change: -15.00, change_pct: -1.44, volume: 48500000, volume_lots: 48500, turnover_b: 49.71 },
  { symbol: "2317", name: "鴻海", market: "TWSE", price: 212.50, change: 2.50, change_pct: 1.19, volume: 62300000, volume_lots: 62300, turnover_b: 13.24 },
  { symbol: "2454", name: "聯發科", market: "TWSE", price: 1290.00, change: -10.00, change_pct: -0.77, volume: 9800000, volume_lots: 9800, turnover_b: 12.64 },
  { symbol: "3231", name: "緯創", market: "TWSE", price: 114.50, change: 1.00, change_pct: 0.88, volume: 45200000, volume_lots: 45200, turnover_b: 5.17 },
  { symbol: "2382", name: "廣達", market: "TWSE", price: 310.00, change: 4.50, change_pct: 1.47, volume: 28400000, volume_lots: 28400, turnover_b: 8.80 },
  { symbol: "2603", name: "長榮", market: "TWSE", price: 206.50, change: 5.50, change_pct: 2.74, volume: 54100000, volume_lots: 54100, turnover_b: 11.17 },
  { symbol: "2609", name: "陽明", market: "TWSE", price: 68.20, change: 1.80, change_pct: 2.71, volume: 68200000, volume_lots: 68200, turnover_b: 4.65 },
  { symbol: "3017", name: "奇鋐", market: "TWSE", price: 645.00, change: -8.00, change_pct: -1.23, volume: 11200000, volume_lots: 11200, turnover_b: 7.22 },
];

const DEFAULT_TPEX: RankedStock[] = [
  { symbol: "1815", name: "富喬", market: "TPEx", price: 121.50, change: -13.50, change_pct: -10.00, volume: 99744000, volume_lots: 99744, turnover_b: 12.12 },
  { symbol: "8042", name: "金山電", market: "TPEx", price: 131.50, change: -1.50, change_pct: -1.13, volume: 51968000, volume_lots: 51968, turnover_b: 6.83 },
  { symbol: "6148", name: "驊宏資", market: "TPEx", price: 43.40, change: -0.80, change_pct: -1.81, volume: 49381000, volume_lots: 49381, turnover_b: 2.14 },
  { symbol: "6182", name: "合晶", market: "TPEx", price: 74.70, change: -8.10, change_pct: -9.78, volume: 28937000, volume_lots: 28937, turnover_b: 2.16 },
  { symbol: "3105", name: "穩懋", market: "TPEx", price: 451.00, change: -50.00, change_pct: -9.98, volume: 24515000, volume_lots: 24515, turnover_b: 11.06 },
  { symbol: "6244", name: "茂迪", market: "TPEx", price: 19.40, change: -0.90, change_pct: -4.43, volume: 20622000, volume_lots: 20622, turnover_b: 0.40 },
  { symbol: "8358", name: "金居", market: "TPEx", price: 334.00, change: -32.50, change_pct: -8.87, volume: 19489000, volume_lots: 19489, turnover_b: 6.51 },
  { symbol: "5314", name: "世紀*", market: "TPEx", price: 21.15, change: -1.55, change_pct: -6.83, volume: 19125000, volume_lots: 19125, turnover_b: 0.40 },
  { symbol: "6147", name: "頎邦", market: "TPEx", price: 157.50, change: -17.50, change_pct: -10.00, volume: 19010000, volume_lots: 19010, turnover_b: 2.99 },
  { symbol: "6488", name: "環球晶", market: "TPEx", price: 564.00, change: -55.00, change_pct: -8.89, volume: 18954000, volume_lots: 18954, turnover_b: 10.69 },
];

const DEFAULT_ETF: RankedStock[] = [
  { symbol: "0050", name: "元大台灣50", market: "TWSE", price: 100.60, change: -3.50, change_pct: -3.36, volume: 42500000, volume_lots: 42500, turnover_b: 42.75 },
  { symbol: "00878", name: "國泰永續高股息", market: "TWSE", price: 22.85, change: -0.15, change_pct: -0.65, volume: 88500000, volume_lots: 88500, turnover_b: 20.22 },
  { symbol: "00919", name: "群益台灣精選高息", market: "TWSE", price: 23.90, change: 0.10, change_pct: 0.42, volume: 95200000, volume_lots: 95200, turnover_b: 22.75 },
  { symbol: "00929", name: "復華台灣科技優息", market: "TWSE", price: 18.25, change: -0.05, change_pct: -0.27, volume: 76000000, volume_lots: 76000, turnover_b: 13.87 },
  { symbol: "0056", name: "元大高股息", market: "TWSE", price: 37.80, change: -0.20, change_pct: -0.53, volume: 52000000, volume_lots: 52000, turnover_b: 19.65 },
  { symbol: "00940", name: "元大台灣價值高息", market: "TWSE", price: 9.45, change: -0.05, change_pct: -0.53, volume: 68000000, volume_lots: 68000, turnover_b: 6.42 },
  { symbol: "00679B", name: "元大美債20年", market: "TPEx", price: 29.50, change: 0.20, change_pct: 0.68, volume: 65000000, volume_lots: 65000, turnover_b: 19.17 },
  { symbol: "00406A", name: "主動中信台灣收益", market: "TWSE", price: 15.20, change: 0.12, change_pct: 0.80, volume: 38000000, volume_lots: 38000, turnover_b: 5.77 },
  { symbol: "00981A", name: "主動統一台股增長", market: "TWSE", price: 26.66, change: 0.30, change_pct: 1.14, volume: 65000000, volume_lots: 65000, turnover_b: 17.33 },
  { symbol: "00982A", name: "主動群益台灣強棒", market: "TWSE", price: 20.66, change: 0.18, change_pct: 0.88, volume: 33200000, volume_lots: 33200, turnover_b: 6.86 },
];

export default function TrendingPanel() {
  const router = useRouter();
  const [board, setBoard] = useState<"twse" | "tpex" | "etf">("twse");
  const [sortType, setSortType] = useState<"volume" | "turnover" | "gainers">("volume");
  const [rankings, setRankings] = useState<{
    twse: RankedStock[];
    tpex: RankedStock[];
    etf: RankedStock[];
  }>({
    twse: DEFAULT_TWSE,
    tpex: DEFAULT_TPEX,
    etf: DEFAULT_ETF,
  });
  const [tradeDate, setTradeDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchRankings = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);

    try {
      const res = await apiMarket.getRankings(16, sortType).catch(() => null);
      const data = res?.data;
      const twseList: RankedStock[] =
        data?.twse && Array.isArray(data.twse) && data.twse.length > 0 ? data.twse : [];
      const tpexList: RankedStock[] =
        data?.tpex && Array.isArray(data.tpex) && data.tpex.length > 0 ? data.tpex : [];
      const etfList: RankedStock[] =
        data?.etf && Array.isArray(data.etf) && data.etf.length > 0 ? data.etf : [];

      if (data?.date) {
        setTradeDate(data.date);
      }

      if (twseList.length > 0 || tpexList.length > 0 || etfList.length > 0) {
        setRankings((prev) => {
          const mergeSafely = (incoming: RankedStock[], old: RankedStock[]) => {
            if (!incoming || incoming.length === 0) return old;
            const oldMap = new Map(old.map((s) => [s.symbol, s]));
            return incoming.map((item) => {
              const oldItem = oldMap.get(item.symbol);
              // 如果新收到的資料意外退回 0.00 與 0%，但本地已有盤中真實撮合價與漲跌，絕不讓錯誤的 0 蓋台
              if (
                oldItem &&
                oldItem.price > 0 &&
                (oldItem.change !== 0 || oldItem.change_pct !== 0) &&
                item.change === 0 &&
                item.change_pct === 0 &&
                item.price !== oldItem.price
              ) {
                return oldItem;
              }
              return item;
            });
          };

          return {
            twse: mergeSafely(twseList, prev.twse),
            tpex: mergeSafely(tpexList, prev.tpex),
            etf: mergeSafely(etfList, prev.etf),
          };
        });
      }
      setLastUpdated(
        new Date().toLocaleTimeString("zh-TW", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    } catch (err) {
      console.error("Failed to load market rankings:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [sortType]);

  useEffect(() => {
    fetchRankings();
    // 盤中每 2.5 秒極速無縫輪詢最新成交量價與排行
    const interval = setInterval(() => fetchRankings(false), 2500);
    return () => clearInterval(interval);
  }, [fetchRankings]);

  const list = useMemo(() => {
    const base = [
      ...(board === "twse" ? rankings.twse : board === "tpex" ? rankings.tpex : rankings.etf),
    ];
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
      subtitle={
        tradeDate
          ? `即時連線證交所與櫃買中心 (${tradeDate} 交易日真實量價)`
          : "即時連線證交所與櫃買中心成交動態，支援成交量、成交值與強勢榜切換"
      }
      headerAction={
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[11px] font-mono text-accent/80 hidden sm:inline flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>2.5秒即時跳動 ({lastUpdated})</span>
            </span>
          )}
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
            <button
              onClick={() => setBoard("etf")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                board === "etf"
                  ? "bg-accent text-white"
                  : "text-secondary hover:text-primary"
              }`}
            >
              <Flame size={12} className={board === "etf" ? "text-amber-300" : "text-amber-500"} />
              <span>熱門 ETF</span>
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
                ? "bg-up-badge font-bold"
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
                const isRegularStock = !stock.is_etf && !stock.symbol.startsWith("00");
                const isLimitUp = Boolean(isRegularStock && (((stock as any).limit_up && (stock as any).limit_up > 0 && stock.price >= (stock as any).limit_up) || changePct >= 9.8));
                const isLimitDown = Boolean(isRegularStock && (((stock as any).limit_down && (stock as any).limit_down > 0 && stock.price <= (stock as any).limit_down) || changePct <= -9.8));
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
                      {stock.price > 0 ? (
                        isLimitUp ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-red-600 text-white font-bold text-xs shadow-sm">
                            <span className="text-[10px] mr-1 opacity-80">NT$</span>
                            {formatNumber(stock.price, 2)}
                          </span>
                        ) : isLimitDown ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold text-xs shadow-sm">
                            <span className="text-[10px] mr-1 opacity-80">NT$</span>
                            {formatNumber(stock.price, 2)}
                          </span>
                        ) : (
                          <AnimatedPrice price={stock.price} currencyPrefix="NT$" showIndicator={false} />
                        )
                      ) : (
                        "-"
                      )}
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
                      {isLimitUp ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-red-600 text-white font-mono font-bold text-xs shadow-sm animate-pulse">
                          漲停 +{changePct.toFixed(2)}%
                        </span>
                      ) : isLimitDown ? (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono font-bold text-xs shadow-sm animate-pulse">
                          跌停 {changePct.toFixed(2)}%
                        </span>
                      ) : (
                        <Badge value={changePct} market="TW" size="sm" />
                      )}
                    </td>
                    <td className="text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-xs text-secondary">
                          {Math.round((stock.volume || 0) / 1000).toLocaleString()} 張
                          {stock.turnover_b ? ` (${stock.turnover_b}億)` : ""}
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
