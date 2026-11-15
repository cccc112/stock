"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiMarket } from "@/lib/api";

interface ResonanceHeldBy {
  etf_code: string;
  etf_name: string;
  group: string;
  weight: number;
  shares_lots: number;
  shares_change: number;
  weight_change: number;
  status: "ADD" | "REDUCE" | "HOLD" | "NEW";
  value_billion: number;
  snapshot_date?: string;
  baseline_date?: string;
}

interface ResonanceStockItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume_lots: number;
  etf_count: number;
  total_value_billion: number;
  total_shares_lots: number;
  avg_weight: number;
  max_weight: number;
  add_count: number;
  reduce_count: number;
  new_count: number;
  net_shares_change: number;
  groups: string[];
  held_by: ResonanceHeldBy[];
}

interface ResonanceEtfMeta {
  code: string;
  name: string;
  group: string;
  aum_billion: number;
  holdings_count: number;
  snapshot_date: string;
  baseline_date: string;
}

type ResonanceFilter = "ALL" | "HIGH_DIV" | "MARKET_CAP" | "ACTIVE" | "MOVERS";

export function EtfResonanceBoard({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [etfs, setEtfs] = useState<ResonanceEtfMeta[]>([]);
  const [holdings, setHoldings] = useState<ResonanceStockItem[]>([]);
  const [filter, setFilter] = useState<ResonanceFilter>("ALL");
  const [minCount, setMinCount] = useState<number>(compact ? 2 : 2);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiMarket.getEtfResonance();
      const d = res?.data;
      if (d && Array.isArray(d.holdings)) {
        setHoldings(d.holdings);
        setEtfs(Array.isArray(d.etfs) ? d.etfs : []);
        setUpdatedAt(d.updated_at || "");
      } else {
        setError("目前尚無共振彙總資料");
      }
    } catch {
      setError("載入 ETF 共振資料失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    apiMarket
      .getEtfResonance()
      .then((res) => {
        if (!alive) return;
        const d = res?.data;
        if (d && Array.isArray(d.holdings)) {
          setHoldings(d.holdings);
          setEtfs(Array.isArray(d.etfs) ? d.etfs : []);
          setUpdatedAt(d.updated_at || "");
          setError(null);
        } else {
          setError("目前尚無共振彙總資料");
        }
      })
      .catch(() => {
        if (alive) setError("載入 ETF 共振資料失敗");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return holdings.filter((item) => {
      if (item.etf_count < minCount && !q) return false;
      if (filter === "HIGH_DIV" && !item.groups.includes("高股息")) return false;
      if (filter === "MARKET_CAP" && !item.groups.includes("市值型")) return false;
      if (filter === "ACTIVE" && !item.groups.includes("主動式")) return false;
      if (filter === "MOVERS" && item.add_count === 0 && item.reduce_count === 0 && item.new_count === 0) {
        return false;
      }
      if (q) {
        return (
          item.symbol.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.held_by.some((h) => h.etf_code.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [holdings, filter, minCount, search]);

  const displayed = useMemo(() => {
    if (showAll) return filtered;
    return filtered.slice(0, compact ? 12 : 30);
  }, [filtered, showAll, compact]);

  const kpiStats = useMemo(() => {
    const strongOverlap = holdings.filter((h) => h.etf_count >= 3).length;
    const netAddStocks = holdings.filter((h) => h.add_count + h.new_count > h.reduce_count).length;
    const totalHeldVal = holdings.reduce((acc, h) => acc + (h.total_value_billion || 0), 0);
    return {
      etfCount: etfs.length || 10,
      strongOverlap,
      netAddStocks,
      totalHeldVal: Math.round(totalHeldVal),
    };
  }, [holdings, etfs]);

  const latestSnap = etfs[0]?.snapshot_date || "";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/55 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold text-primary tracking-tight">
              台股核心 ETF 成分共振排行
            </h3>
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded border border-[var(--border)] text-secondary bg-[var(--bg-primary)]">
              LIVE {kpiStats.etfCount} ETFs
            </span>
            {latestSnap && (
              <span className="text-[11px] font-mono text-muted">
                基準日 {latestSnap}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            即時彙總 0050、006208、0056、00878、00919、00929、00940、00713、00981A、00982A 官方申報持股，追蹤多檔基金重疊匯聚標的
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-2.5 py-1.5 rounded border border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--border-hover)] text-xs text-secondary hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "同步中..." : "重新整理"}
          </button>
          {updatedAt && (
            <span className="text-[10px] font-mono text-muted hidden sm:inline">
              {new Date(updatedAt).toLocaleTimeString("zh-TW", { hour12: false })}
            </span>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] border-b border-[var(--border)] bg-[var(--bg-primary)]/40">
        <div className="px-4 py-2.5">
          <div className="text-[11px] text-muted">追蹤核心 ETF</div>
          <div className="text-base font-bold font-mono text-primary tabular-nums mt-0.5">
            {kpiStats.etfCount} <span className="text-xs font-normal text-muted">檔</span>
          </div>
        </div>
        <div className="px-4 py-2.5">
          <div className="text-[11px] text-muted">3檔以上共振個股</div>
          <div className="text-base font-bold font-mono text-amber-400 tabular-nums mt-0.5">
            {kpiStats.strongOverlap} <span className="text-xs font-normal text-muted">檔</span>
          </div>
        </div>
        <div className="px-4 py-2.5">
          <div className="text-[11px] text-muted">同步淨增持標的</div>
          <div className="text-base font-bold font-mono text-red-400 tabular-nums mt-0.5">
            {kpiStats.netAddStocks} <span className="text-xs font-normal text-muted">檔</span>
          </div>
        </div>
        <div className="px-4 py-2.5">
          <div className="text-[11px] text-muted">彙總重疊持股規模</div>
          <div className="text-base font-bold font-mono text-primary tabular-nums mt-0.5">
            {kpiStats.totalHeldVal.toLocaleString()} <span className="text-xs font-normal text-muted">億</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="px-4 py-2.5 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: "ALL" as const, label: "全部共振" },
            { id: "HIGH_DIV" as const, label: "高股息重疊" },
            { id: "MARKET_CAP" as const, label: "市值型重疊" },
            { id: "ACTIVE" as const, label: "主動式 ETF" },
            { id: "MOVERS" as const, label: "近期增減異動" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                filter === tab.id
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                  : "bg-[var(--bg-primary)] text-secondary border-[var(--border)] hover:text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={minCount}
            onChange={(e) => setMinCount(Number(e.target.value))}
            aria-label="最少共振檔數"
            className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg-primary)] text-xs text-primary outline-none"
          >
            <option value={1}>至少 1 檔 ETF</option>
            <option value={2}>至少 2 檔共振</option>
            <option value={3}>至少 3 檔共振</option>
            <option value={4}>至少 4 檔共振</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="篩選代號、股名或 ETF..."
            className="w-40 sm:w-48 px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--bg-primary)] text-xs text-primary placeholder:text-muted focus:border-[var(--border-hover)] outline-none"
          />
        </div>
      </div>

      {/* Table Content */}
      {loading && holdings.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted">
          正在平行彙總 10 檔核心 ETF 最新公開持股申報...
        </div>
      ) : error && holdings.length === 0 ? (
        <div className="p-8 text-center text-xs text-red-400">{error}</div>
      ) : displayed.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted">
          沒有符合目前共振條件的個股，可嘗試降低最少共振檔數或清除搜尋字詞
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-tertiary)]/70 border-b border-[var(--border)] text-[11px] font-medium text-secondary">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[140px]">個股標的</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">收盤/漲跌</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">共振檔數</th>
                <th className="py-2.5 px-3 min-w-[260px]">持有 ETF 與權重明細</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">合計持股(張/億)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">增減動態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs">
              {displayed.map((row, idx) => {
                const isUp = row.change_pct > 0;
                const isDown = row.change_pct < 0;
                const netDiff = row.net_shares_change;
                return (
                  <tr
                    key={row.symbol}
                    className="hover:bg-[var(--bg-tertiary)]/35 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center font-mono text-muted tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <Link
                        href={`/stock/${encodeURIComponent(row.symbol)}`}
                        className="group block"
                      >
                        <div className="font-semibold text-primary group-hover:text-amber-400 transition-colors truncate max-w-[160px]">
                          {row.name}
                        </div>
                        <div className="font-mono text-[11px] text-muted">
                          {row.symbol}
                        </div>
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {row.price > 0 ? (
                        <div>
                          <div className="font-semibold text-primary">
                            {row.price.toFixed(2)}
                          </div>
                          <div
                            className={`text-[11px] ${
                              isUp
                                ? "text-red-400"
                                : isDown
                                ? "text-emerald-400"
                                : "text-muted"
                            }`}
                          >
                            {isUp ? "+" : ""}
                            {row.change_pct.toFixed(2)}%
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
                          row.etf_count >= 5
                            ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                            : row.etf_count >= 3
                            ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                            : "bg-[var(--bg-primary)] text-secondary border-[var(--border)]"
                        }`}
                      >
                        {row.etf_count} 檔
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {row.held_by.slice(0, 6).map((h) => {
                          const badgeTone =
                            h.status === "ADD" || h.status === "NEW"
                              ? "border-red-500/35 text-red-300 bg-red-500/10"
                              : h.status === "REDUCE"
                              ? "border-emerald-500/35 text-emerald-300 bg-emerald-500/10"
                              : "border-[var(--border)] text-secondary bg-[var(--bg-primary)]";
                          return (
                            <Link
                              key={`${row.symbol}-${h.etf_code}`}
                              href={`/stock/${encodeURIComponent(h.etf_code)}`}
                              title={`${h.etf_name} 權重 ${h.weight.toFixed(2)}% / 持有 ${h.shares_lots.toLocaleString()}張`}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono hover:border-[var(--border-hover)] transition-colors ${badgeTone}`}
                            >
                              <span className="font-semibold">{h.etf_code}</span>
                              <span className="text-muted">{h.weight.toFixed(1)}%</span>
                            </Link>
                          );
                        })}
                        {row.held_by.length > 6 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-mono text-muted">
                            +{row.held_by.length - 6}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-primary">
                        {row.total_value_billion.toLocaleString()}億
                      </div>
                      <div className="text-[11px] text-muted">
                        {row.total_shares_lots > 0
                          ? `${row.total_shares_lots.toLocaleString()}張`
                          : `均權 ${row.avg_weight.toFixed(1)}%`}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {netDiff !== 0 ? (
                        <div className={netDiff > 0 ? "text-red-400 font-semibold" : "text-emerald-400 font-semibold"}>
                          {netDiff > 0 ? `+${netDiff.toLocaleString()}張` : `${netDiff.toLocaleString()}張`}
                        </div>
                      ) : (
                        <div className="text-muted">持平</div>
                      )}
                      {(row.add_count > 0 || row.reduce_count > 0 || row.new_count > 0) && (
                        <div className="text-[10px] text-muted">
                          {row.add_count + row.new_count > 0 && (
                            <span className="text-red-400 mr-1">+{row.add_count + row.new_count}買</span>
                          )}
                          {row.reduce_count > 0 && (
                            <span className="text-emerald-400">-{row.reduce_count}賣</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Expand */}
      {filtered.length > (compact ? 12 : 30) && (
        <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--bg-tertiary)]/30 flex items-center justify-between text-xs">
          <span className="text-muted font-mono">
            顯示 {displayed.length} / {filtered.length} 檔符合個股
          </span>
          <button
            onClick={() => setShowAll((prev) => !prev)}
            className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
          >
            {showAll ? "收合清單" : `展開全部 (${filtered.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
