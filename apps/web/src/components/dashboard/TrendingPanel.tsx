"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatNumber, getChangeColorClass } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { apiMarket } from "@/lib/api";
import { isTwMarketTradingHours } from "@/lib/marketHours";
import { Term } from "@/components/ui/TermTooltip";
import { RefreshCw, Flame, ArrowUpRight, DollarSign, PauseCircle } from "lucide-react";
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

export default function TrendingPanel() {
  const router = useRouter();
  const [board, setBoard] = useState<"twse" | "tpex" | "etf">("twse");
  const [sortType, setSortType] = useState<"volume" | "turnover" | "gainers" | "losers">("volume");
  const [rankings, setRankings] = useState<{
    twse: RankedStock[];
    tpex: RankedStock[];
    etf: RankedStock[];
  }>({
    twse: [],
    tpex: [],
    etf: [],
  });
  const [tradeDate, setTradeDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isTrading, setIsTrading] = useState<boolean>(() => isTwMarketTradingHours(true));

  useEffect(() => {
    const syncState = () => setIsTrading(isTwMarketTradingHours(true));
    syncState();
    const t = setInterval(syncState, 15000);
    return () => clearInterval(t);
  }, []);

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
    if (!isTrading) return;
    // 盤中時段每 3.5 秒即時刷新最新成交量價與排行
    const interval = setInterval(() => fetchRankings(false), 3500);
    return () => clearInterval(interval);
  }, [fetchRankings, isTrading]);

  const list = useMemo(() => {
    const base = [
      ...(board === "twse" ? rankings.twse : board === "tpex" ? rankings.tpex : rankings.etf),
    ];
    if (sortType === "gainers") {
      return base.sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0));
    }
    if (sortType === "losers") {
      return base.sort((a, b) => (a.change_pct || 0) - (b.change_pct || 0));
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
            <span className="text-[11px] font-mono hidden sm:inline-flex items-center gap-1 text-accent/80">
              {isTrading ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>盤中即時 ({lastUpdated})</span>
                </>
              ) : (
                <>
                  <PauseCircle size={11} className="text-amber-400/80" />
                  <span className="text-muted">已收盤 · {tradeDate || lastUpdated}</span>
                </>
              )}
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
            <ArrowUpRight size={12} /> 強勢漲幅
          </button>
          <button
            onClick={() => setSortType("losers")}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              sortType === "losers"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold"
                : "text-muted hover:text-secondary"
            }`}
          >
            <span>弱勢跌幅</span>
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
