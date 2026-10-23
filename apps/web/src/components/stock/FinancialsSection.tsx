"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import Button from "@/components/ui/Button";
import { apiResearch, apiErrorMessage } from "@/lib/api";
import { Sparkles } from "lucide-react";
import { BarTrend, LineTrend } from "@/components/stock/TrendCharts";

interface Quarter {
  quarter: string;
  revenue: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  eps: number | null;
  revenue_yoy: number | null;
  revenue_qoq: number | null;
  eps_yoy: number | null;
}

interface Report {
  name: string;
  market: 'TW' | 'US';
  quarters: Quarter[];
  monthly_revenue: { month: string; revenue: number; yoy: number | null }[];
  balance: { debt_ratio?: number | null; current_ratio?: number | null; roe_ttm?: number | null };
  valuation: { per?: number | null; pbr?: number | null; dividend_yield?: number | null; per_percentile?: number | null; per_median?: number | null };
  dividend: { cash_dividend_12m?: number | null };
  scores: Record<string, number | null>;
  flags: string[];
}

const SCORE_LABELS: Record<string, string> = {
  overall: '綜合', profitability: '獲利能力', growth: '成長性', safety: '財務體質', valuation: '估值',
};

const fmtPct = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`);
const fmtMoney = (v: number | null | undefined) => {
  if (v == null) return '—';
  const a = Math.abs(v);
  if (a >= 1e12) return `${(v / 1e12).toFixed(2)} 兆`;
  if (a >= 1e8) return `${(v / 1e8).toFixed(1)} 億`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return v.toFixed(2);
};
const scoreColor = (s: number | null) => (s == null ? 'text-secondary' : s >= 70 ? 'text-green-500' : s >= 45 ? 'text-yellow-500' : 'text-red-500');
// 台股習慣：紅漲綠跌
const growthColor = (v: number | null | undefined, market: string) =>
  v == null || v === 0 ? '' : (v > 0) === (market === 'TW') ? 'text-red-500' : 'text-green-500';

export default function FinancialsSection({ symbol }: { symbol: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [advice, setAdvice] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState('');

  useEffect(() => {
    let alive = true;
    apiResearch.getFinancials(symbol)
      .then(r => alive && setReport(r.data))
      .catch(e => alive && setError(apiErrorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [symbol]);

  const runAdvice = async () => {
    setAdviceLoading(true); setAdviceError('');
    try {
      const r = await apiResearch.getFinancialAdvice(symbol);
      setAdvice(r.data.advice);
    } catch (e) {
      setAdviceError(apiErrorMessage(e));
    } finally {
      setAdviceLoading(false);
    }
  };

  if (loading) return <div className="text-secondary py-10 text-center">載入財報中...</div>;
  if (error || !report) return <div className="text-secondary py-10 text-center">{error || '查無財報資料'}</div>;

  const m = report.market;
  const chrono = report.quarters.slice(0, 8).reverse();          // 舊 -> 新
  const qLabels = chrono.map(q => q.quarter.slice(2));            // 26Q2
  return (
    <div className="space-y-6">
      {/* 評分 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(SCORE_LABELS).map(([k, label]) => (
          <div key={k} className="rounded-lg bg-[var(--bg-tertiary)] p-3 text-center">
            <div className="text-xs text-secondary">{label}</div>
            <div className={`text-2xl font-bold ${scoreColor(report.scores[k] ?? null)}`}>{report.scores[k] ?? '—'}</div>
          </div>
        ))}
      </div>

      {report.flags.length > 0 && (
        <ul className="text-sm space-y-1">
          {report.flags.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}

      {/* 關鍵指標 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        {[
          ['本益比 PER', report.valuation.per?.toFixed?.(2) ?? '—'],
          ['股價淨值比 PBR', report.valuation.pbr?.toFixed?.(2) ?? '—'],
          ['殖利率', report.valuation.dividend_yield != null ? `${Number(report.valuation.dividend_yield).toFixed(2)}%` : '—'],
          ['PER 歷史百分位', report.valuation.per_percentile != null ? `${report.valuation.per_percentile}%` : '—'],
          ['ROE (近四季)', fmtPct(report.balance.roe_ttm)],
          ['負債比', fmtPct(report.balance.debt_ratio)],
          ['流動比率', report.balance.current_ratio ?? '—'],
          ['近12月現金股利', report.dividend.cash_dividend_12m ?? '—'],
        ].map(([k, v]) => (
          <div key={k as string} className="flex justify-between border-b border-[var(--border)] py-2">
            <span className="text-secondary">{k}</span><span className="font-medium">{v as string}</span>
          </div>
        ))}
      </div>

      {/* 趨勢圖 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <BarTrend title="單季營收" labels={qLabels} values={chrono.map(q => q.revenue)}
          format={v => (Math.abs(v) >= 1e8 ? `${(v / 1e8).toFixed(0)}億` : `${(v / 1e6).toFixed(0)}M`)} />
        <LineTrend title="獲利率趨勢" labels={qLabels} series={[
          { name: '毛利率', color: '#6366f1', values: chrono.map(q => q.gross_margin) },
          { name: '營益率', color: '#f59e0b', values: chrono.map(q => q.operating_margin) },
          { name: '淨利率', color: '#22c55e', values: chrono.map(q => q.net_margin) },
        ]} />
        <BarTrend title="單季 EPS" labels={qLabels} values={chrono.map(q => q.eps)} format={v => v.toFixed(2)} color="#22c55e" />
      </div>

      {/* 季報 */}
      <div>
        <h4 className="font-semibold mb-2">近季損益表現</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-secondary text-xs text-right border-b border-[var(--border)]">
                <th className="text-left py-2">季度</th><th>營收</th><th>毛利率</th><th>營益率</th><th>淨利率</th>
                <th>EPS</th><th>營收YoY</th><th>營收QoQ</th><th>EPS YoY</th>
              </tr>
            </thead>
            <tbody>
              {report.quarters.slice(0, 8).map(q => (
                <tr key={q.quarter} className="text-right border-b border-[var(--border)]/50">
                  <td className="text-left py-2 font-medium">{q.quarter}</td>
                  <td>{fmtMoney(q.revenue)}</td>
                  <td>{fmtPct(q.gross_margin)}</td>
                  <td>{fmtPct(q.operating_margin)}</td>
                  <td>{fmtPct(q.net_margin)}</td>
                  <td>{q.eps ?? '—'}</td>
                  <td className={growthColor(q.revenue_yoy, m)}>{fmtPct(q.revenue_yoy)}</td>
                  <td className={growthColor(q.revenue_qoq, m)}>{fmtPct(q.revenue_qoq)}</td>
                  <td className={growthColor(q.eps_yoy, m)}>{fmtPct(q.eps_yoy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {report.monthly_revenue.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">月營收</h4>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
            {report.monthly_revenue.slice(0, 6).map(r => (
              <div key={r.month} className="rounded-md bg-[var(--bg-tertiary)] p-2">
                <div className="text-secondary">{r.month}</div>
                <div className="font-medium">{fmtMoney(r.revenue)}</div>
                <div className={growthColor(r.yoy, m)}>YoY {fmtPct(r.yoy)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 財報建議 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold">AI 財報診斷與建議</h4>
          <Button size="sm" onClick={runAdvice} isLoading={adviceLoading}>
            <Sparkles size={14} className="mr-1" />{advice ? '重新分析' : '產生 AI 建議'}
          </Button>
        </div>
        {adviceError && <div className="text-sm text-red-500">{adviceError}</div>}
        {advice && (
          <div className="prose prose-invert max-w-none text-sm bg-[var(--bg-tertiary)] p-4 rounded-lg">
            <ReactMarkdown>{advice}</ReactMarkdown>
          </div>
        )}
        {!advice && !adviceError && <p className="text-xs text-secondary">指標由系統用真實財報計算，AI 只負責解讀。需先在「設定」輸入 Gemini API Key。</p>}
      </div>
    </div>
  );
}
