"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiResearch, apiStocks } from "@/lib/api";
import { getChangeColorClass } from "@/lib/utils";
import { Term, InfoTip } from "@/components/ui/TermTooltip";
import {
  ETF_CATALOG,
  resolveETFProfile,
  ETFHolding,
  ETFSectorWeight,
  ETFDividendItem,
} from "@/lib/etfCatalog";

interface ETFReport {
  symbol: string;
  name: string;
  market: "TW" | "US";
  asset_kind: "ETF" | "ASSET" | "STOCK";
  category: string;
  issuer: string;
  tracking_index: string;
  expense_ratio: string;
  dividend_freq: string;
  aum: string;
  dividend_yield?: number | null;
  performance: {
    ret_1m: number | null;
    ret_3m: number | null;
    ret_6m: number | null;
    ret_1y: number | null;
    high_52w: number | null;
    low_52w: number | null;
    volatility_annual: number | null;
    max_drawdown_1y: number | null;
    bias_20ma: number | null;
  };
  dividends: ETFDividendItem[];
  holdings: ETFHolding[];
  sector_weights: ETFSectorWeight[];
  focus_points: string[];
}

function computePerfFromBars(bars: any[]) {
  const perf = {
    ret_1m: null as number | null,
    ret_3m: null as number | null,
    ret_6m: null as number | null,
    ret_1y: null as number | null,
    high_52w: null as number | null,
    low_52w: null as number | null,
    volatility_annual: null as number | null,
    max_drawdown_1y: null as number | null,
    bias_20ma: null as number | null,
  };
  if (!Array.isArray(bars) || bars.length < 5) return perf;

  const closes = bars.map((b) => Number(b.close)).filter((v) => Number.isFinite(v) && v > 0);
  const highs = bars.map((b) => Number(b.high)).filter((v) => Number.isFinite(v) && v > 0);
  const lows = bars.map((b) => Number(b.low)).filter((v) => Number.isFinite(v) && v > 0);
  if (closes.length < 5) return perf;

  const last = closes[closes.length - 1];
  const retAt = (days: number) => {
    const idx = Math.max(0, closes.length - 1 - days);
    const base = closes[idx];
    return base > 0 ? Number((((last - base) / base) * 100).toFixed(2)) : null;
  };

  perf.ret_1m = retAt(Math.min(21, closes.length - 1));
  perf.ret_3m = closes.length > 25 ? retAt(Math.min(63, closes.length - 1)) : null;
  perf.ret_6m = closes.length > 65 ? retAt(Math.min(126, closes.length - 1)) : null;
  perf.ret_1y = closes.length > 120 ? retAt(closes.length - 1) : retAt(closes.length - 1);
  perf.high_52w = highs.length ? Number(Math.max(...highs).toFixed(2)) : null;
  perf.low_52w = lows.length ? Number(Math.min(...lows).toFixed(2)) : null;

  if (closes.length >= 20) {
    const slice20 = closes.slice(-20);
    const ma20 = slice20.reduce((a, b) => a + b, 0) / 20;
    if (ma20 > 0) perf.bias_20ma = Number((((last - ma20) / ma20) * 100).toFixed(2));
  }

  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  if (rets.length > 10) {
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
    perf.volatility_annual = Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(2));
  }

  let peak = closes[0];
  let maxDd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = peak > 0 ? ((c - peak) / peak) * 100 : 0;
    if (dd < maxDd) maxDd = dd;
  }
  perf.max_drawdown_1y = Number(maxDd.toFixed(2));
  return perf;
}

const fmtPct = (v: number | null | undefined, signed = true) => {
  if (v == null) return "—";
  const prefix = signed && v > 0 ? "+" : "";
  return `${prefix}${v.toFixed(2)}%`;
};

export default function ETFInfoSection({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ETFReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const loadAll = async () => {
      const s = symbol.trim().toUpperCase();
      const code = s.replace(/\.(TW|TWO)$/i, "");
      const isTw = /^\d/.test(code) || s.endsWith(".TW") || s.endsWith(".TWO");

      const [etfRes, histRes, quoteRes] = await Promise.allSettled([
        apiResearch.getEtfInfo(symbol),
        apiStocks.getHistory(symbol, "1y"),
        apiStocks.getQuote(symbol),
      ]);

      if (!alive) return;

      const bars = histRes.status === "fulfilled" && Array.isArray(histRes.value?.data) ? histRes.value.data : [];
      const quote = quoteRes.status === "fulfilled" ? quoteRes.value?.data : null;
      const fallbackSeed = resolveETFProfile(symbol, quote?.name);
      const isCuratedInCatalog = Boolean(ETF_CATALOG[code] || ETF_CATALOG[s]);
      const isNoDividend =
        fallbackSeed.dividend_freq.includes("不配息") ||
        fallbackSeed.dividend_freq.includes("無配息");
      const clientPerf = computePerfFromBars(bars);

      if (etfRes.status === "fulfilled" && etfRes.value?.data) {
        const remote: ETFReport = etfRes.value.data;
        const isGenericRemote =
          !remote.issuer ||
          remote.issuer === "台灣投信發行" ||
          remote.issuer === "國際資產管理機構" ||
          remote.aum === "即時追蹤中";

        const mergedPerf = {
          ret_1m: remote.performance?.ret_1m ?? clientPerf.ret_1m,
          ret_3m: remote.performance?.ret_3m ?? clientPerf.ret_3m,
          ret_6m: remote.performance?.ret_6m ?? clientPerf.ret_6m,
          ret_1y: remote.performance?.ret_1y ?? clientPerf.ret_1y,
          high_52w: remote.performance?.high_52w ?? clientPerf.high_52w,
          low_52w: remote.performance?.low_52w ?? clientPerf.low_52w,
          volatility_annual: remote.performance?.volatility_annual ?? clientPerf.volatility_annual,
          max_drawdown_1y: remote.performance?.max_drawdown_1y ?? clientPerf.max_drawdown_1y,
          bias_20ma: remote.performance?.bias_20ma ?? clientPerf.bias_20ma,
        };

        setData({
          ...remote,
          name: isCuratedInCatalog ? fallbackSeed.name : remote.name || fallbackSeed.name,
          category: isCuratedInCatalog || isGenericRemote ? fallbackSeed.category : remote.category,
          issuer: isCuratedInCatalog || isGenericRemote ? fallbackSeed.issuer : remote.issuer,
          tracking_index:
            isCuratedInCatalog || isGenericRemote ? fallbackSeed.tracking_index : remote.tracking_index,
          expense_ratio:
            isCuratedInCatalog || isGenericRemote ? fallbackSeed.expense_ratio : remote.expense_ratio,
          dividend_freq:
            isCuratedInCatalog || isGenericRemote ? fallbackSeed.dividend_freq : remote.dividend_freq,
          aum: isCuratedInCatalog || isGenericRemote ? fallbackSeed.aum : remote.aum,
          dividend_yield: isNoDividend
            ? null
            : (remote.dividend_yield ?? fallbackSeed.dividend_yield_est ?? null),
          holdings:
            isCuratedInCatalog && fallbackSeed.holdings.length
              ? fallbackSeed.holdings
              : remote.holdings?.length
              ? remote.holdings
              : fallbackSeed.holdings,
          sector_weights:
            isCuratedInCatalog && fallbackSeed.sector_weights.length
              ? fallbackSeed.sector_weights
              : remote.sector_weights?.length
              ? remote.sector_weights
              : fallbackSeed.sector_weights,
          dividends: isNoDividend
            ? []
            : remote.dividends?.length
            ? remote.dividends
            : fallbackSeed.dividends || [],
          focus_points:
            isCuratedInCatalog && fallbackSeed.focus_points.length
              ? fallbackSeed.focus_points
              : remote.focus_points?.length
              ? remote.focus_points
              : fallbackSeed.focus_points,
          performance: mergedPerf,
        });
      } else {
        setData({
          symbol,
          name: fallbackSeed.name || quote?.name || symbol,
          market: isTw ? "TW" : "US",
          asset_kind: "ETF",
          category: fallbackSeed.category,
          issuer: fallbackSeed.issuer,
          tracking_index: fallbackSeed.tracking_index,
          expense_ratio: fallbackSeed.expense_ratio,
          dividend_freq: fallbackSeed.dividend_freq,
          aum: fallbackSeed.aum,
          dividend_yield: isNoDividend ? null : fallbackSeed.dividend_yield_est,
          performance: clientPerf,
          dividends: isNoDividend ? [] : fallbackSeed.dividends || [],
          holdings: fallbackSeed.holdings,
          sector_weights: fallbackSeed.sector_weights,
          focus_points: fallbackSeed.focus_points,
        });
      }
      setLoading(false);
    };

    loadAll();
    return () => {
      alive = false;
    };
  }, [symbol]);

  if (loading) {
    return <div className="text-secondary py-10 text-center text-sm">載入追蹤資訊中...</div>;
  }
  if (!data) {
    return <div className="text-secondary py-10 text-center text-sm">無法載入追蹤資訊</div>;
  }

  const p = data.performance;
  const m = data.market;

  return (
    <div className="space-y-6 pt-2">
      {/* 1. 核心規格與追蹤標的 */}
      <div className="rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent font-medium mr-2">
              {data.category}
            </span>
            <span className="text-xs text-secondary">{data.issuer}</span>
          </div>
          {data.dividend_yield != null && (
            <div className="text-xs text-secondary">
              <Term term="dividend_yield" label="參考年化殖利率" />：
              <span className="font-mono font-semibold text-primary ml-1">{data.dividend_yield.toFixed(2)}%</span>
            </div>
          )}
        </div>
        <div className="text-sm text-secondary mb-1">
          <Term term="etf_index" label="追蹤指數 / 標的基準" />
        </div>
        <div className="text-base font-semibold text-primary">{data.tracking_index}</div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[var(--border)] text-sm">
          <div>
            <div className="text-xs text-secondary">
              <Term term="expense_ratio" label="總費用率 (內扣)" />
            </div>
            <div className="font-mono font-medium mt-0.5">{data.expense_ratio}</div>
          </div>
          <div>
            <div className="text-xs text-secondary">
              <Term term="dividend_freq" label="配息頻率" />
            </div>
            <div className="font-medium mt-0.5">{data.dividend_freq}</div>
          </div>
          <div>
            <div className="text-xs text-secondary">
              <Term term="aum" label="資產規模 (AUM)" />
            </div>
            <div className="font-mono font-medium mt-0.5">{data.aum}</div>
          </div>
          <div>
            <div className="text-xs text-secondary">
              <Term term="bias_20ma" label="月線乖離率 (20MA)" />
            </div>
            <div className={`font-mono font-medium mt-0.5 ${getChangeColorClass(p.bias_20ma || 0, m)}`}>
              {fmtPct(p.bias_20ma)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 區間報酬與風險指標 */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-3">歷史區間報酬與波動指標</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
          {[
            { label: "近 1 月", val: fmtPct(p.ret_1m), raw: p.ret_1m, term: undefined },
            { label: "近 3 月", val: fmtPct(p.ret_3m), raw: p.ret_3m, term: undefined },
            { label: "近 6 月", val: fmtPct(p.ret_6m), raw: p.ret_6m, term: undefined },
            { label: "近 1 年", val: fmtPct(p.ret_1y), raw: p.ret_1y, term: "total_return" },
            { label: "52週高點", val: p.high_52w ?? "—", raw: null, term: undefined },
            { label: "52週低點", val: p.low_52w ?? "—", raw: null, term: undefined },
            { label: "年化波動率", val: fmtPct(p.volatility_annual, false), raw: null, term: "volatility_annual" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] p-3">
              <div className="text-xs text-secondary mb-1">
                {item.term ? <Term term={item.term} label={item.label} /> : item.label}
              </div>
              <div
                className={`text-sm font-mono font-semibold tabular-nums ${
                  item.raw != null ? getChangeColorClass(item.raw, m) : "text-primary"
                }`}
              >
                {item.val}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 前十大成分股與產業權重 */}
      {data.holdings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h4 className="text-sm font-semibold text-primary mb-3 flex items-center">
              核心成分股與權重分佈 <InfoTip term="etf_holdings" />
            </h4>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-secondary border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
                    <th className="text-left py-2.5 px-4">代碼</th>
                    <th className="text-left py-2.5 px-4">成分股 / 連動標的名稱</th>
                    <th className="text-right py-2.5 px-4">權重佔比</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.holdings.map((h) => (
                    <tr key={h.symbol} className="hover:bg-[var(--bg-tertiary)]/60 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium">
                        <Link href={`/stock/${encodeURIComponent(h.symbol)}`} className="text-accent hover:underline">
                          {h.symbol}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-primary">{h.name}</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="w-20 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-accent rounded-full"
                              style={{ width: `${Math.min(100, h.weight * 1.6)}%` }}
                            />
                          </div>
                          <span className="font-mono tabular-nums font-medium w-14">{h.weight.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.sector_weights.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-primary mb-3">資產 / 產業配置比重</h4>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4 space-y-3.5">
                {data.sector_weights.map((sw) => (
                  <div key={sw.sector}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-secondary">{sw.sector}</span>
                      <span className="font-mono tabular-nums font-medium text-primary">{sw.weight.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div className="h-full bg-accent/80 rounded-full" style={{ width: `${Math.min(100, sw.weight)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. 近期除息紀錄 */}
      {data.dividends.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-primary mb-3">近期除息與配息紀錄</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.dividends.map((d, idx) => (
              <div key={`${d.date}-${idx}`} className="rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] p-3">
                <div className="text-xs text-secondary font-mono">{d.date}</div>
                <div className="text-base font-mono font-bold text-primary mt-1">{d.amount} 元</div>
                {d.period_yield != null && (
                  <div className="text-xs text-secondary mt-0.5">單次殖利率 {d.period_yield}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. 追蹤觀察重點 */}
      {data.focus_points.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/50 p-4">
          <h4 className="text-sm font-semibold text-primary mb-2">標的追蹤重點與操作留意事項</h4>
          <ul className="space-y-1.5 text-sm text-secondary list-disc pl-5">
            {data.focus_points.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
