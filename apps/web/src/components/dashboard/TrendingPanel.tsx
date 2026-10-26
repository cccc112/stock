"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { apiMarket, apiStocks } from "@/lib/api";
import { Term } from "@/components/ui/TermTooltip";

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
  "8069": "元太", "6488": "環球晶", "3293": "鈊象",
  "5347": "世界", "3324": "雙鴻", "8299": "群聯",
  "6223": "旺矽", "3529": "力旺", "6187": "萬潤",
  "5483": "中美晶", "3105": "穩懋", "6547": "高端疫苗",
};

const TWSE_POOLS = ["2330", "2317", "2454", "3231", "2382", "2603", "2881", "2882"];
const TPEX_POOLS = ["8069", "6488", "3293", "5347", "3324", "8299", "6223", "3529"];

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
  const [rankings, setRankings] = useState<{ twse: RankedStock[]; tpex: RankedStock[] }>({
    twse: DEFAULT_TWSE,
    tpex: DEFAULT_TPEX,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        // 1. 優先嘗試後端標準 rankings 端點
        const res = await apiMarket.getRankings(8).catch(() => null);
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

        // 3. 若 TWSE 依然缺少即時報價，並行向主機請求個股即時行情
        if (twseList.length === 0 || twseList.every((s) => !s.price || s.price === 0)) {
          const quotes = await Promise.allSettled(
            TWSE_POOLS.map((sym) => apiStocks.getQuote(sym))
          );
          const loaded: RankedStock[] = [];
          quotes.forEach((r, idx) => {
            if (r.status === "fulfilled" && r.value?.data && r.value.data.price > 0) {
              const q = r.value.data;
              const sym = TWSE_POOLS[idx];
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
            loaded.sort((a, b) => (b.volume || 0) - (a.volume || 0));
            twseList = loaded;
          }
        }

        // 4. 對 TPEx (上櫃) 並行向主機請求即時報價池，確保即時量價齊全
        if (tpexList.length === 0 || tpexList.every((s) => !s.price || s.price === 0)) {
          const tpexQuotes = await Promise.allSettled(
            TPEX_POOLS.map((sym) => apiStocks.getQuote(sym))
          );
          const loadedTpex: RankedStock[] = [];
          tpexQuotes.forEach((r, idx) => {
            if (r.status === "fulfilled" && r.value?.data && r.value.data.price > 0) {
              const q = r.value.data;
              const sym = TPEX_POOLS[idx];
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
            loadedTpex.sort((a, b) => (b.volume || 0) - (a.volume || 0));
            tpexList = loadedTpex;
          }
        }

        // 5. 確保個股中文名稱 100% 正確顯示（避免舊服務端編碼異常）
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
      }
    };

    fetchRankings();
    const interval = setInterval(fetchRankings, 60000);
    return () => clearInterval(interval);
  }, []);

  const list = board === "twse" ? rankings.twse : rankings.tpex;
  const maxVol = Math.max(1, ...list.map((s) => s.volume || 0));

  return (
    <Card
      title={<Term k="twse_tpex" label="台股真實熱門成交排行" />}
      subtitle="依證交所 (上市) 與櫃買中心 (上櫃) 即時成交量動態排序"
      headerAction={
        <div className="flex bg-[var(--bg-primary)] p-0.5 rounded-lg border border-[var(--border)]">
          <button
            onClick={() => setBoard("twse")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              board === "twse"
                ? "bg-accent text-white"
                : "text-secondary hover:text-primary"
            }`}
          >
            上市熱門 (TWSE)
          </button>
          <button
            onClick={() => setBoard("tpex")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              board === "tpex"
                ? "bg-accent text-white"
                : "text-secondary hover:text-primary"
            }`}
          >
            上櫃熱門 (TPEx)
          </button>
        </div>
      }
      className="h-full"
    >
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
