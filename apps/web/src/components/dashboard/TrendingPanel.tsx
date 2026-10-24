"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { apiMarket } from "@/lib/api";
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
        const res = await apiMarket.getRankings(8);
        const data = res.data;
        if (data && (Array.isArray(data.twse) || Array.isArray(data.tpex))) {
          setRankings({
            twse: data.twse?.length ? data.twse : DEFAULT_TWSE,
            tpex: data.tpex?.length ? data.tpex : DEFAULT_TPEX,
          });
        }
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
