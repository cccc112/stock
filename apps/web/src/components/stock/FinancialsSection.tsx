"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { apiResearch, apiErrorMessage } from "@/lib/api";
import { fetchOrBuildDeepReport } from "@/lib/clientDeepReport";
import { Sparkles, CheckCircle2, XCircle, ArrowRight, ShieldCheck, AlertTriangle, Layers } from "lucide-react";
import { BarTrend, LineTrend } from "@/components/stock/TrendCharts";
import SnowflakeRadar, { RadarItem } from "@/components/stock/SnowflakeRadar";
import { InfoTip, Term } from "@/components/ui/TermTooltip";

function detectCriterionTerm(label: string): string | undefined {
  if (label.includes("ROA")) return "roa";
  if (label.includes("營業現金流")) return "ocf";
  if (label.includes("盈餘品質") || label.includes("含金量")) return "ocf_to_ni";
  if (label.includes("負債比")) return "debt_ratio";
  if (label.includes("流動比率")) return "current_ratio";
  if (label.includes("毛利率")) return "gross_margin";
  if (label.includes("週轉率")) return "asset_turnover";
  if (label.includes("ROE")) return "roe";
  if (label.includes("VCP") || label.includes("波動收斂")) return "vcp_ratio";
  if (label.includes("BOS") || label.includes("結構突破")) return "bos";
  if (label.includes("訂單塊") && label.includes("多方")) return "bull_ob";
  if (label.includes("訂單塊") && label.includes("空方")) return "bear_ob";
  if (label.includes("FVG") || label.includes("失衡缺口")) return "fvg";
  if (label.includes("50 日均線") || label.includes("均線")) return "ma";
  return undefined;
}

function detectModelTerm(name: string): string {
  if (name.includes("Piotroski")) return "piotroski";
  if (name.includes("CANSLIM")) return "canslim";
  if (name.includes("Minervini")) return "minervini";
  return "smc";
}

interface Quarter {
  quarter: string;
  revenue: number | null;
  gross_margin: number | null;
  operating_margin: number | null;
  net_margin: number | null;
  eps: number | null;
  ocf?: number | null;
  fcf?: number | null;
  ocf_to_ni?: number | null;
  roe_ann?: number | null;
  asset_turnover_ann?: number | null;
  equity_multiplier?: number | null;
  revenue_yoy: number | null;
  revenue_qoq: number | null;
  eps_yoy: number | null;
}

interface Criterion {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

interface StrategyModel {
  name: string;
  subtitle: string;
  score: number;
  max_score: number;
  status: string;
  summary: string;
  vcp_ratio?: number | null;
  bullish_ob?: { low: number; high: number; date: string } | null;
  bearish_ob?: { low: number; high: number; date: string } | null;
  fvg?: { type: string; low: number; high: number; date: string } | null;
  criteria: Criterion[];
}

interface DeepReport {
  symbol: string;
  name: string;
  market: "TW" | "US";
  industry: string;
  price: number;
  change_pct: number;
  has_financials: boolean;
  radar: RadarItem[];
  financials: {
    name: string;
    market: "TW" | "US";
    quarters: Quarter[];
    monthly_revenue: { month: string; revenue: number; yoy: number | null }[];
    balance: {
      debt_ratio?: number | null;
      current_ratio?: number | null;
      roe_ttm?: number | null;
      asset_turnover?: number | null;
      equity_multiplier?: number | null;
    };
    dupont?: {
      roe_ttm?: number | null;
      net_margin_ttm?: number | null;
      asset_turnover?: number | null;
      equity_multiplier?: number | null;
      driver?: string;
    };
    valuation: {
      per?: number | null;
      pbr?: number | null;
      dividend_yield?: number | null;
      per_percentile?: number | null;
      per_median?: number | null;
      per_min?: number | null;
      per_max?: number | null;
    };
    dividend: { cash_dividend_12m?: number | null };
    scores: Record<string, number | null>;
    flags: string[];
  };
  models: {
    piotroski: StrategyModel;
    canslim: StrategyModel;
    minervini: StrategyModel;
    smc: StrategyModel;
  };
  peers: {
    symbol: string;
    name: string;
    industry: string;
    price: number;
    change_pct: number;
    ret_20d?: number | null;
    revenue_yoy_3m?: number | null;
    score?: number | null;
  }[];
  verdict: {
    total_score: number;
    rating: string;
    rating_code: "STRONG_BULL" | "BULL" | "NEUTRAL" | "BEAR";
    entry_zone: [number, number];
    stop_loss: number;
    target_price: number;
    risk_reward: number;
    bull_points: string[];
    bear_points: string[];
    conclusion: string;
  };
}

const fmtPct = (v: number | null | undefined, digits = 1) =>
  v == null ? "—" : `${Number(v).toFixed(digits)}%`;

const fmtMoney = (v: number | null | undefined) => {
  if (v == null) return "—";
  const a = Math.abs(v);
  if (a >= 1e12) return `${(v / 1e12).toFixed(2)} 兆`;
  if (a >= 1e8) return `${(v / 1e8).toFixed(1)} 億`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  return v.toFixed(1);
};

const growthColor = (v: number | null | undefined, market: string) =>
  v == null || v === 0 ? "" : (v > 0) === (market === "TW") ? "text-red-400" : "text-emerald-400";

const ratingStyle = (code: string) => {
  switch (code) {
    case "STRONG_BULL":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "BULL":
      return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
    case "NEUTRAL":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default:
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
  }
};

export default function FinancialsSection({
  symbol,
  onApplyStrategyLines,
}: {
  symbol: string;
  onApplyStrategyLines?: (lines: { price: number; color: string; title: string }[]) => void;
}) {
  const [data, setData] = useState<DeepReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [advice, setAdvice] = useState("");
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    fetchOrBuildDeepReport(symbol)
      .then((resData) => {
        if (alive) setData(resData);
      })
      .catch((e) => {
        if (alive) setError(apiErrorMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [symbol]);

  const runAdvice = async () => {
    setAdviceLoading(true);
    setAdviceError("");
    try {
      const r = await apiResearch.getFinancialAdvice(symbol);
      setAdvice(r.data.advice);
    } catch (e) {
      setAdviceError(apiErrorMessage(e));
    } finally {
      setAdviceLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 py-6">
        <div className="h-56 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
          <div className="h-44 rounded-xl bg-[var(--bg-tertiary)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-secondary py-10 text-center">
        {error || "查無深度財報與策略模型資料"}
      </div>
    );
  }

  const report = data.financials;
  const m = data.market;
  const chrono = (report.quarters || []).slice(0, 8).reverse();
  const qLabels = chrono.map((q) => q.quarter.slice(2));
  const verdict = data.verdict;
  const dupont = report.dupont || {};
  const val = report.valuation || {};

  const applyVerdictToKline = () => {
    if (!onApplyStrategyLines) return;
    const lines: { price: number; color: string; title: string }[] = [
      { price: verdict.target_price, color: "#10b981", title: "目標價 (Target)" },
      { price: verdict.entry_zone[1], color: "#6366f1", title: "建議進場上緣" },
      { price: verdict.entry_zone[0], color: "#3b82f6", title: "建議進場下緣" },
      { price: verdict.stop_loss, color: "#ef4444", title: "防守停損 (Stop)" },
    ];
    const smc = data.models.smc;
    if (smc?.bullish_ob?.low) {
      lines.push({
        price: smc.bullish_ob.low,
        color: "#22c55e",
        title: "SMC 多方訂單塊支撐",
      });
    }
    if (smc?.bearish_ob?.high) {
      lines.push({
        price: smc.bearish_ob.high,
        color: "#f97316",
        title: "SMC 空方訂單塊壓力",
      });
    }
    onApplyStrategyLines(lines);
  };

  return (
    <div className="space-y-8 pt-2">
      {/* 1. Simply Wall St 雪花五維雷達 + 最終多空結論與操作策略裁決卡 */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-accent/15 text-accent">
                Executive Research Verdict
              </span>
              <h3 className="text-base font-bold text-primary m-0 flex items-center">
                <span>五維雪花體質雷達與最終多空結論裁決書</span>
                <InfoTip term="snowflake_radar" />
              </h3>
            </div>
            <p className="text-xs text-secondary mt-1">
              綜合基本面財報、杜邦 ROE、獲利含金量與四大開源量化交易模型之量化裁決
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`px-3.5 py-1.5 rounded-lg border text-sm font-bold ${ratingStyle(
                verdict.rating_code
              )}`}
            >
              {verdict.rating} · 總評 {verdict.total_score} / 100
            </div>
            {onApplyStrategyLines && (
              <Button size="sm" variant="secondary" onClick={applyVerdictToKline}>
                <Layers size={14} />
                <span>將關鍵價位與 SMC 訂單塊畫至 K 線</span>
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* 左側：五維雪花雷達圖 */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[var(--bg-secondary)]/80 rounded-xl p-4 border border-[var(--border)]">
            <SnowflakeRadar items={data.radar} totalScore={verdict.total_score} size={240} />
            <div className="grid grid-cols-5 gap-1.5 w-full mt-2 pt-3 border-t border-[var(--border)] text-center">
              {data.radar.map((r) => (
                <div key={r.key} className="px-1">
                  <div className="text-[11px] text-secondary truncate flex items-center justify-center">
                    <span>{r.axis}</span>
                    <InfoTip term={r.key} />
                  </div>
                  <div className="font-mono text-xs font-bold text-primary mt-0.5">
                    {r.score}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 右側：最終結論、操作價位與多空正反論點 */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-3.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-sm text-primary leading-relaxed">
              <span className="font-semibold text-accent mr-1.5">[綜合結論]</span>
              {verdict.conclusion}
            </div>

            {/* 策略價位與風報比 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div className="text-[11px] text-secondary">
                  <Term k="entry_zone" label="建議分批進場區間" />
                </div>
                <div className="font-mono text-sm font-bold text-indigo-400 mt-1">
                  {verdict.entry_zone[0]} ~ {verdict.entry_zone[1]}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div className="text-[11px] text-secondary">
                  <Term k="stop_loss" label="嚴格防守停損價" />
                </div>
                <div className="font-mono text-sm font-bold text-rose-400 mt-1">
                  {verdict.stop_loss}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div className="text-[11px] text-secondary">
                  <Term k="target_price" label="波段目標價" />
                </div>
                <div className="font-mono text-sm font-bold text-emerald-400 mt-1">
                  {verdict.target_price}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div className="text-[11px] text-secondary">
                  <Term k="risk_reward" label="預估風險報酬比" />
                </div>
                <div className="font-mono text-sm font-bold text-primary mt-1">
                  1 : {verdict.risk_reward}
                </div>
              </div>
            </div>

            {/* 多方優勢 vs 空方風險 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-2">
                  <ShieldCheck size={14} />
                  <span>多方核心催化與優勢 (Bull Case)</span>
                </div>
                <ul className="space-y-1.5 text-xs text-secondary">
                  {verdict.bull_points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-emerald-400 font-bold mt-0.5">+</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-3.5 rounded-lg bg-rose-500/5 border border-rose-500/20">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 mb-2">
                  <AlertTriangle size={14} />
                  <span>空方風險與排雷警示 (Bear Case)</span>
                </div>
                <ul className="space-y-1.5 text-xs text-secondary">
                  {verdict.bear_points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-rose-400 font-bold mt-0.5">-</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 四大經典開源策略與交易模型診斷面板 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-primary">
              四大經典開源量化與大師交易模型診斷
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              整合價值排雷 (Piotroski)、成長動能 (CANSLIM)、型態突破 (Minervini VCP) 與機構訂單塊 (SMC)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              data.models.piotroski,
              data.models.canslim,
              data.models.minervini,
              data.models.smc,
            ] as StrategyModel[]
          ).map((model) => {
            const pct = Math.round((model.score / Math.max(1, model.max_score)) * 100);
            const barColor =
              pct >= 70 ? "bg-emerald-500" : pct >= 45 ? "bg-indigo-500" : "bg-amber-500";
            return (
              <div
                key={model.name}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="text-sm font-bold text-primary flex items-center">
                        <span>{model.name}</span>
                        <InfoTip term={detectModelTerm(model.name)} />
                      </div>
                      <div className="text-xs text-secondary">{model.subtitle}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-mono text-base font-bold text-primary">
                        {model.score} / {model.max_score}
                      </span>
                      <div className="text-[11px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-accent font-medium mt-0.5">
                        {model.status}
                      </div>
                    </div>
                  </div>

                  {/* 分數進度條 */}
                  <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden mb-2.5">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="text-xs text-secondary mb-3 leading-relaxed">{model.summary}</p>

                  {/* SMC 專屬訂單塊區間提示 */}
                  {(model.bullish_ob || model.bearish_ob || model.fvg) && (
                    <div className="grid grid-cols-2 gap-2 mb-3 p-2.5 rounded-lg bg-[var(--bg-tertiary)]/70 border border-[var(--border)] text-xs">
                      <div>
                        <span className="text-muted block text-[11px]">
                          <Term k="bull_ob" label="多方機構訂單塊 (Bull OB)" />
                        </span>
                        <span className="font-mono font-semibold text-emerald-400">
                          {model.bullish_ob
                            ? `${model.bullish_ob.low} ~ ${model.bullish_ob.high}`
                            : "近期無明顯區間"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block text-[11px]">
                          <Term k="bear_ob" label="空方機構訂單塊 (Bear OB)" />
                        </span>
                        <span className="font-mono font-semibold text-rose-400">
                          {model.bearish_ob
                            ? `${model.bearish_ob.low} ~ ${model.bearish_ob.high}`
                            : "近期無明顯區間"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 檢核條件明細 */}
                  <div className="space-y-1.5 border-t border-[var(--border)] pt-2.5">
                    {model.criteria.map((c) => {
                      const cTerm = detectCriterionTerm(c.label);
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs gap-2 py-0.5"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {c.pass ? (
                              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
                            ) : (
                              <XCircle size={13} className="text-slate-500 flex-shrink-0" />
                            )}
                            <span
                              className={`truncate ${
                                c.pass ? "text-primary font-medium" : "text-secondary"
                              }`}
                            >
                              {c.label}
                            </span>
                            {cTerm && <InfoTip term={cTerm} />}
                          </div>
                          <span className="font-mono text-[11px] text-secondary flex-shrink-0">
                            {c.detail}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 財報狗風格：杜邦 ROE 三因子拆解 + 本益比歷史估值位階尺 */}
      {data.has_financials && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 杜邦分析 ROE 拆解 */}
          <div className="lg:col-span-7 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-bold text-primary m-0 flex items-center">
                  <span>杜邦分析 ROE 三因子拆解 (DuPont Identity)</span>
                  <InfoTip term="dupont" />
                </h4>
                <p className="text-xs text-secondary mt-0.5">
                  拆解股東權益報酬率來源：獲利護城河 vs 總資產周轉效率 vs 財務槓桿
                </p>
              </div>
              {dupont.driver && (
                <span className="text-xs px-2.5 py-1 rounded-md bg-accent/15 text-accent font-semibold">
                  {dupont.driver}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 items-center my-3 text-center">
              <div className="sm:col-span-1 p-3 rounded-lg bg-accent/10 border border-accent/30">
                <div className="text-[11px] text-secondary flex items-center justify-center">
                  <span>近四季 ROE</span>
                  <InfoTip term="roe" />
                </div>
                <div className="font-mono text-lg font-bold text-accent mt-0.5">
                  {fmtPct(dupont.roe_ttm ?? report.balance.roe_ttm)}
                </div>
              </div>
              <div className="font-mono text-base font-bold text-muted">=</div>
              <div className="sm:col-span-1 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <div className="text-[11px] text-secondary flex items-center justify-center">
                  <span>稅後淨利率</span>
                  <InfoTip term="net_margin" />
                </div>
                <div className="font-mono text-base font-bold text-primary mt-0.5">
                  {fmtPct(dupont.net_margin_ttm)}
                </div>
              </div>
              <div className="font-mono text-base font-bold text-muted">×</div>
              <div className="sm:col-span-1 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <div className="text-[11px] text-secondary flex items-center justify-center">
                  <span>資產週轉率</span>
                  <InfoTip term="asset_turnover" />
                </div>
                <div className="font-mono text-base font-bold text-primary mt-0.5">
                  {dupont.asset_turnover != null ? `${dupont.asset_turnover.toFixed(2)}x` : "—"}
                </div>
              </div>
              <div className="font-mono text-base font-bold text-muted">×</div>
              <div className="sm:col-span-1 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <div className="text-[11px] text-secondary flex items-center justify-center">
                  <span>權益乘數</span>
                  <InfoTip term="equity_multiplier" />
                </div>
                <div className="font-mono text-base font-bold text-primary mt-0.5">
                  {dupont.equity_multiplier != null
                    ? `${dupont.equity_multiplier.toFixed(2)}x`
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          {/* 本益比歷史位階與關鍵估值卡 */}
          <div className="lg:col-span-5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-primary m-0 flex items-center">
                  <span>歷史估值位階尺 (PER Band)</span>
                  <InfoTip term="per_band" />
                </h4>
                <span className="font-mono text-xs text-secondary">
                  百分位：{val.per_percentile != null ? `${val.per_percentile}%` : "—"}
                </span>
              </div>
              <p className="text-xs text-secondary mb-3">
                對比過去 5 年歷史本益比區間，判斷目前股價處於便宜、合理或昂貴區
              </p>

              {/* 視覺化位階條 */}
              <div className="space-y-1.5 mb-4">
                <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-emerald-500/70 via-amber-500/70 to-rose-500/70">
                  {val.per_percentile != null && (
                    <div
                      className="absolute -top-1 w-3.5 h-5 rounded bg-white border-2 border-slate-900 shadow"
                      style={{
                        left: `calc(${Math.min(96, Math.max(4, val.per_percentile))}% - 7px)`,
                      }}
                      title={`目前 PER 位於歷史 ${val.per_percentile}% 分位`}
                    />
                  )}
                </div>
                <div className="flex justify-between text-[11px] font-mono text-secondary">
                  <span>低估區 {val.per_min ? `${val.per_min}x` : ""}</span>
                  <span>歷史中位 {val.per_median ? `${val.per_median}x` : "—"}</span>
                  <span>高估區 {val.per_max ? `${val.per_max}x` : ""}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] text-center">
              <div>
                <div className="text-[11px] text-secondary flex items-center justify-center">
                  <span>目前 PER</span>
                  <InfoTip term="per" />
                </div>
                <div className="font-mono text-sm font-bold text-primary">
                  {val.per != null ? `${Number(val.per).toFixed(1)}x` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-secondary flex items-center justify-center">
                  <span>股價淨值比 PBR</span>
                  <InfoTip term="pbr" />
                </div>
                <div className="font-mono text-sm font-bold text-primary">
                  {val.pbr != null ? `${Number(val.pbr).toFixed(2)}x` : "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-secondary flex items-center justify-center">
                  <span>現金殖利率</span>
                  <InfoTip term="dividend_yield" />
                </div>
                <div className="font-mono text-sm font-bold text-emerald-400">
                  {val.dividend_yield != null ? `${Number(val.dividend_yield).toFixed(2)}%` : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. 財報狗核心視覺化圖表群（單季營收、三率、EPS、營業現金流與自由現金流含金量） */}
      {data.has_financials && chrono.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-primary mb-3">
            關鍵財務趨勢圖表（營收、三率、EPS 與獲利含金量）
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <BarTrend
              title="單季營收趨勢"
              labels={qLabels}
              values={chrono.map((q) => q.revenue)}
              format={(v) =>
                Math.abs(v) >= 1e8 ? `${(v / 1e8).toFixed(0)}億` : `${(v / 1e6).toFixed(0)}M`
              }
            />
            <LineTrend
              title="三率走勢 (毛利/營益/淨利率)"
              labels={qLabels}
              series={[
                { name: "毛利率", color: "#6366f1", values: chrono.map((q) => q.gross_margin) },
                { name: "營益率", color: "#f59e0b", values: chrono.map((q) => q.operating_margin) },
                { name: "淨利率", color: "#10b981", values: chrono.map((q) => q.net_margin) },
              ]}
            />
            <BarTrend
              title="單季 EPS 趨勢 (元)"
              labels={qLabels}
              values={chrono.map((q) => q.eps)}
              format={(v) => v.toFixed(2)}
              color="#10b981"
            />
            <LineTrend
              title="現金流與獲利含金量 (OCF / FCF)"
              labels={qLabels}
              series={[
                {
                  name: "營業現金流",
                  color: "#38bdf8",
                  values: chrono.map((q) =>
                    q.ocf != null ? Number((q.ocf / 1e8).toFixed(1)) : null
                  ),
                },
                {
                  name: "自由現金流",
                  color: "#a855f7",
                  values: chrono.map((q) =>
                    q.fcf != null ? Number((q.fcf / 1e8).toFixed(1)) : null
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* 5. 近季完整損益與現金流明細表 */}
      {data.has_financials && report.quarters.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-primary mb-2.5">
            近 8 季損益、現金流與獲利含金量明細表
          </h4>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[var(--bg-tertiary)] text-secondary text-xs text-right border-b border-[var(--border)]">
                  <th className="text-left py-2.5 px-3">季度</th>
                  <th className="px-3">營收</th>
                  <th className="px-3"><Term k="gross_margin" label="毛利率" /></th>
                  <th className="px-3"><Term k="operating_margin" label="營益率" /></th>
                  <th className="px-3"><Term k="net_margin" label="淨利率" /></th>
                  <th className="px-3"><Term k="eps" label="EPS" /></th>
                  <th className="px-3"><Term k="ocf" label="營業現金流" /></th>
                  <th className="px-3"><Term k="fcf" label="自由現金流" /></th>
                  <th className="px-3"><Term k="ocf_to_ni" label="含金量(OCF/NI)" /></th>
                  <th className="px-3"><Term k="yoy" label="營收YoY" /></th>
                  <th className="px-3"><Term k="yoy" label="EPS YoY" /></th>
                </tr>
              </thead>
              <tbody>
                {report.quarters.slice(0, 8).map((q) => (
                  <tr
                    key={q.quarter}
                    className="text-right border-b border-[var(--border)]/50 hover:bg-[var(--bg-tertiary)]/40"
                  >
                    <td className="text-left py-2.5 px-3 font-mono font-semibold">{q.quarter}</td>
                    <td className="px-3 font-mono">{fmtMoney(q.revenue)}</td>
                    <td className="px-3 font-mono">{fmtPct(q.gross_margin)}</td>
                    <td className="px-3 font-mono">{fmtPct(q.operating_margin)}</td>
                    <td className="px-3 font-mono">{fmtPct(q.net_margin)}</td>
                    <td className="px-3 font-mono font-semibold">{q.eps ?? "—"}</td>
                    <td className="px-3 font-mono">{fmtMoney(q.ocf)}</td>
                    <td className="px-3 font-mono">{fmtMoney(q.fcf)}</td>
                    <td
                      className={`px-3 font-mono ${
                        q.ocf_to_ni != null && q.ocf_to_ni >= 80
                          ? "text-emerald-400"
                          : q.ocf_to_ni != null && q.ocf_to_ni < 50
                          ? "text-amber-400"
                          : ""
                      }`}
                    >
                      {fmtPct(q.ocf_to_ni, 0)}
                    </td>
                    <td className={`px-3 font-mono ${growthColor(q.revenue_yoy, m)}`}>
                      {fmtPct(q.revenue_yoy)}
                    </td>
                    <td className={`px-3 font-mono ${growthColor(q.eps_yoy, m)}`}>
                      {fmtPct(q.eps_yoy)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. 同業橫向比較表 (Peer Comparison) */}
      {data.peers && data.peers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h4 className="text-sm font-bold text-primary m-0">
                同產業橫向比較表 ({data.industry || "同業代表"})
              </h4>
              <p className="text-xs text-secondary mt-0.5">
                自動抓取同產業代表標的，並排比較近期動能、營收成長與綜合量化評分
              </p>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[var(--bg-tertiary)] text-secondary text-xs text-right border-b border-[var(--border)]">
                  <th className="text-left py-2.5 px-3">代號 / 名稱</th>
                  <th className="px-3">產業分類</th>
                  <th className="px-3">現價</th>
                  <th className="px-3">當日漲跌</th>
                  <th className="px-3"><Term k="ret_20d" label="20日相對動能" /></th>
                  <th className="px-3"><Term k="yoy" label="近3月營收YoY" /></th>
                  <th className="px-3">綜合量化評分</th>
                  <th className="px-3">研究</th>
                </tr>
              </thead>
              <tbody>
                {data.peers.map((p) => (
                  <tr
                    key={p.symbol}
                    className="text-right border-b border-[var(--border)]/50 hover:bg-[var(--bg-tertiary)]/40"
                  >
                    <td className="text-left py-2.5 px-3">
                      <span className="font-mono font-bold text-primary mr-2">{p.symbol}</span>
                      <span className="text-secondary">{p.name}</span>
                    </td>
                    <td className="px-3 text-xs text-secondary">{p.industry}</td>
                    <td className="px-3 font-mono font-medium">{p.price}</td>
                    <td className="px-3">
                      <Badge value={p.change_pct ?? 0} market={m} size="sm" />
                    </td>
                    <td className={`px-3 font-mono ${growthColor(p.ret_20d, m)}`}>
                      {fmtPct(p.ret_20d)}
                    </td>
                    <td className={`px-3 font-mono ${growthColor(p.revenue_yoy_3m, m)}`}>
                      {fmtPct(p.revenue_yoy_3m)}
                    </td>
                    <td className="px-3 font-mono font-bold text-accent">{p.score ?? "—"}</td>
                    <td className="px-3">
                      <Link
                        href={`/stock/${encodeURIComponent(p.symbol)}`}
                        className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        <span>對比</span>
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. AI 財報深度解讀 */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-sm font-bold text-primary m-0">AI 財報與策略綜合解讀</h4>
            <p className="text-xs text-secondary mt-0.5">
              指標與四大模型由系統根據真實財報與日線計算，可選用 Gemini 進一步撰寫研究報告摘要
            </p>
          </div>
          <Button size="sm" onClick={runAdvice} isLoading={adviceLoading}>
            <Sparkles size={14} className="mr-1" />
            {advice ? "重新產生解讀" : "產生 AI 深度解讀"}
          </Button>
        </div>
        {adviceError && <div className="text-sm text-rose-400 mt-2">{adviceError}</div>}
        {advice && (
          <div className="prose prose-invert max-w-none text-sm bg-[var(--bg-tertiary)] p-4 rounded-lg mt-3">
            <ReactMarkdown>{advice}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
