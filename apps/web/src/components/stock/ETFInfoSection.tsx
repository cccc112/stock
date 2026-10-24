"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiResearch, apiErrorMessage } from "@/lib/api";
import { getChangeColorClass } from "@/lib/utils";

interface Holding {
  symbol: string;
  name: string;
  weight: number;
}

interface SectorWeight {
  sector: string;
  weight: number;
}

interface DividendItem {
  date: string;
  amount: number;
  period_yield?: number | null;
}

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
  dividends: DividendItem[];
  holdings: Holding[];
  sector_weights: SectorWeight[];
  focus_points: string[];
}

const fmtPct = (v: number | null | undefined, signed = true) => {
  if (v == null) return "—";
  const prefix = signed && v > 0 ? "+" : "";
  return `${prefix}${v.toFixed(2)}%`;
};

export default function ETFInfoSection({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ETFReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    apiResearch
      .getEtfInfo(symbol)
      .then((res) => {
        if (alive) setData(res.data);
      })
      .catch((err) => {
        if (alive) setError(apiErrorMessage(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [symbol]);

  if (loading) {
    return <div className="text-secondary py-10 text-center text-sm">載入追蹤資訊中...</div>;
  }
  if (error || !data) {
    return <div className="text-secondary py-10 text-center text-sm">{error || "無法載入追蹤資訊"}</div>;
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
              參考年化殖利率：<span className="font-mono font-semibold text-primary">{data.dividend_yield.toFixed(2)}%</span>
            </div>
          )}
        </div>
        <div className="text-sm text-secondary mb-1">追蹤指數 / 標的基準</div>
        <div className="text-base font-semibold text-primary">{data.tracking_index}</div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[var(--border)] text-sm">
          <div>
            <div className="text-xs text-secondary">總費用率 (內扣)</div>
            <div className="font-mono font-medium mt-0.5">{data.expense_ratio}</div>
          </div>
          <div>
            <div className="text-xs text-secondary">配息頻率</div>
            <div className="font-medium mt-0.5">{data.dividend_freq}</div>
          </div>
          <div>
            <div className="text-xs text-secondary">資產規模 (AUM)</div>
            <div className="font-mono font-medium mt-0.5">{data.aum}</div>
          </div>
          <div>
            <div className="text-xs text-secondary">月線乖離率 (20MA)</div>
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
            { label: "近 1 月", val: fmtPct(p.ret_1m), raw: p.ret_1m },
            { label: "近 3 月", val: fmtPct(p.ret_3m), raw: p.ret_3m },
            { label: "近 6 月", val: fmtPct(p.ret_6m), raw: p.ret_6m },
            { label: "近 1 年", val: fmtPct(p.ret_1y), raw: p.ret_1y },
            { label: "52週高點", val: p.high_52w ?? "—", raw: null },
            { label: "52週低點", val: p.low_52w ?? "—", raw: null },
            { label: "年化波動率", val: fmtPct(p.volatility_annual, false), raw: null },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] p-3">
              <div className="text-xs text-secondary mb-1">{item.label}</div>
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
            <h4 className="text-sm font-semibold text-primary mb-3">核心成分股與權重分佈</h4>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-secondary border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
                    <th className="text-left py-2.5 px-4">代碼</th>
                    <th className="text-left py-2.5 px-4">成分股名稱</th>
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
