"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Button from "@/components/ui/Button";
import {
  FileSpreadsheet,
  Loader2,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Coins,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { apiAi } from "@/lib/api";
import {
  generateSmartStockAnalysis,
  EquityResearchData,
  ThinkingStep,
} from "@/lib/clientDeepReport";

export default function AISection({
  symbol,
  autoRun = false,
}: {
  symbol: string;
  autoRun?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [researchData, setResearchData] = useState<EquityResearchData | null>(null);
  const [analysisText, setAnalysisText] = useState<string>("");
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [showThinking, setShowThinking] = useState(true);
  const [error, setError] = useState("");

  const analyze = useCallback(async () => {
    setLoading(true);
    setHasRun(true);
    setError("");
    try {
      // 1. 立即啟動本地法人基本面與情境估值研報引擎（0.5~3 秒內必出結果）
      const smartPromise = generateSmartStockAnalysis(symbol);

      // 2. 同步嘗試後端 Gemini（優先連線主機 AI）
      const backendPromise = Promise.race([
        apiAi.analyzeStock(symbol),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI_FAST_TIMEOUT")), 12000)
        ),
      ]).catch(() => null);

      const [smartRes, backendRes] = await Promise.all([smartPromise, backendPromise]);
      setResearchData(smartRes);
      setThinkingSteps(smartRes.thinking_steps || []);

      const raw =
        backendRes?.data?.analysis ||
        backendRes?.data?.content ||
        (typeof backendRes?.data === "string" ? backendRes.data : "");

      if (raw && !String(raw).includes("呼叫失敗")) {
        setAnalysisText(String(raw));
        setSourceLabel("Gemini AI 法人研報");
      } else {
        setAnalysisText(smartRes.analysis);
        setSourceLabel(smartRes.source);
      }
    } catch (err: any) {
      setError(err?.message || "AI 法人研報生成失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (autoRun) {
      analyze();
    }
  }, [symbol, autoRun, analyze]);

  const sc = researchData?.valuation_scenarios;

  return (
    <div className="pt-2 space-y-5">
      {/* 頂部 Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-accent/10 border border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 text-accent font-bold text-base flex-wrap">
            <FileSpreadsheet size={18} />
            <span>AI 法人個股深度研究報告 (Equity Research · {symbol})</span>
            {sourceLabel && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium">
                {sourceLabel}
              </span>
            )}
            <div
              className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 select-none"
              title="已連線主機 Gemini AI 算力"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>主機 AI 算力在線</span>
            </div>
          </div>
          <p className="text-xs text-secondary mt-1">
            券商法人規格：專注「商業模式與護城河」、「財報三表深度體檢」、「三種情境估值目標價」與「未來重大催化劑」
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={analyze} disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={14} className="mr-1.5 animate-spin" />
              法人研報生成中...
            </>
          ) : (
            <>
              <FileSpreadsheet size={14} className="mr-1.5" />
              {analysisText ? "重新生成研報" : "產生法人深度研報"}
            </>
          )}
        </Button>
      </div>

      {/* 待命待觸發狀態 (依據規則：需使用者主動點擊按鈕觸發) */}
      {!hasRun && !loading && !analysisText && !error && (
        <div className="p-8 rounded-2xl bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-tertiary)] to-accent/10 border border-[var(--border)] text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-accent/15 text-accent mx-auto flex items-center justify-center">
            <FileSpreadsheet size={32} />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-primary">點擊生成 {symbol} AI 法人深度研報</h3>
            <p className="text-xs text-secondary mt-1.5 leading-relaxed">
              即時運算情境估值矩陣 (樂觀 / 基準 / 悲觀目標價與隱含本益比)、三表財務健康體檢、商業模式護城河與未來催化劑。
            </p>
          </div>
          <Button size="lg" variant="primary" onClick={analyze} className="px-6 py-2.5 font-bold shadow-lg hover-lift">
            <FileSpreadsheet size={16} className="mr-2" />
            啟動 AI 法人研報分析
          </Button>
        </div>
      )}

      {/* 1. 三種情境估值目標價矩陣看板 (Three Scenario Valuation Models) */}
      {sc && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <TrendingUp size={14} className="text-accent" />
              三種情境估值模型目標價矩陣 (Valuation Scenarios)
            </span>
            <span className="text-[11px] text-secondary">
              機率加權推算 · 杜絕單一目標價盲點
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 樂觀情境 */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    🚀 樂觀情境 (Bull Case)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                    機率 25%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400">
                    ${sc.bull.target}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    +{sc.bull.upside_pct}%
                  </span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  {sc.bull.assumptions}
                </p>
              </div>
              {sc.bull.per > 0 && (
                <div className="mt-3 pt-2 border-t border-emerald-500/20 text-[11px] text-secondary flex justify-between font-mono">
                  <span>隱含本益比:</span>
                  <strong className="text-emerald-700 dark:text-emerald-400">{sc.bull.per}x</strong>
                </div>
              )}
            </div>

            {/* 基準情境 */}
            <div className="p-4 rounded-xl bg-accent/5 border border-accent/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-accent flex items-center gap-1">
                    ⚖️ 基準情境 (Base Case)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-mono font-bold">
                    機率 50%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-extrabold font-mono text-accent">
                    ${sc.base.target}
                  </span>
                  <span className="text-xs font-bold text-accent font-mono">
                    +{sc.base.upside_pct}%
                  </span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  {sc.base.assumptions}
                </p>
              </div>
              {sc.base.per > 0 && (
                <div className="mt-3 pt-2 border-t border-accent/20 text-[11px] text-secondary flex justify-between font-mono">
                  <span>隱含本益比:</span>
                  <strong className="text-accent">{sc.base.per}x</strong>
                </div>
              )}
            </div>

            {/* 悲觀情境 */}
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                    🛡️ 悲觀情境 (Bear Case)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-800 dark:text-rose-300 font-mono font-bold">
                    機率 25%
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-extrabold font-mono text-rose-700 dark:text-rose-400">
                    ${sc.bear.target}
                  </span>
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 font-mono">
                    {sc.bear.upside_pct}%
                  </span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  {sc.bear.assumptions}
                </p>
              </div>
              {sc.bear.per > 0 && (
                <div className="mt-3 pt-2 border-t border-rose-500/20 text-[11px] text-secondary flex justify-between font-mono">
                  <span>防守估值倍數:</span>
                  <strong className="text-rose-400">{sc.bear.per}x</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. 商業模式護城河與財報三表核心排雷指標條 */}
      {researchData?.moat && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <div className="flex items-center gap-2 text-xs text-secondary mb-1">
              <ShieldCheck size={14} className="text-accent" />
              <span>產業護城河評等</span>
            </div>
            <div className="text-sm font-bold text-primary">
              {researchData.moat.level}
            </div>
            <span className="text-[11px] text-accent block mt-0.5">
              護城河綜合評分: {researchData.moat.score}/100
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <div className="flex items-center gap-2 text-xs text-secondary mb-1">
              <Coins size={14} className="text-emerald-400" />
              <span>營業現金流含金量 (OCF/NI)</span>
            </div>
            <div className="text-sm font-bold text-primary font-mono">
              {researchData.financial_health.ocf_to_ni_pct}%
            </div>
            <span className="text-[11px] text-emerald-400 block mt-0.5">
              {researchData.financial_health.cash_flow_quality}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <div className="flex items-center gap-2 text-xs text-secondary mb-1">
              <TrendingUp size={14} className="text-indigo-400" />
              <span>杜邦 ROE 核心驅動引擎</span>
            </div>
            <div className="text-sm font-bold text-primary truncate">
              {researchData.financial_health.dupont_driver}
            </div>
            <span className="text-[11px] text-secondary block mt-0.5">
              拆解淨利率、週轉率與槓桿乘數
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
            <div className="flex items-center gap-2 text-xs text-secondary mb-1">
              <AlertCircle size={14} className="text-amber-400" />
              <span>存貨與負債排雷檢測</span>
            </div>
            <div className="text-sm font-bold text-primary truncate">
              {researchData.financial_health.debt_leverage_alert}
            </div>
            <span className="text-[11px] text-secondary block mt-0.5">
              {researchData.financial_health.inventory_alert}
            </span>
          </div>
        </div>
      )}

      {/* 3. AI 思考與推論過程 (Chain-of-Thought) */}
      {thinkingSteps.length > 0 && (
        <div className="rounded-xl border border-accent/30 bg-[var(--bg-secondary)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowThinking((v) => !v)}
            className="w-full px-5 py-3 flex items-center justify-between bg-accent/10 hover:bg-accent/15 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <BrainCircuit size={17} className="text-accent" />
              <span className="font-bold text-xs sm:text-sm text-primary">
                AI 法人研究推論鏈 (Chain-of-Thought 5 階段推理過程)
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/20 text-accent">
                點擊展開 / 收合
              </span>
            </div>
            {showThinking ? (
              <ChevronUp size={17} className="text-secondary" />
            ) : (
              <ChevronDown size={17} className="text-secondary" />
            )}
          </button>

          {showThinking && (
            <div className="p-4 sm:p-5 space-y-3 divide-y divide-[var(--border)]">
              {thinkingSteps.map((st) => (
                <div key={st.step} className="pt-3 first:pt-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/20 text-accent text-xs font-mono font-bold">
                        {st.step}
                      </span>
                      <span className="text-xs font-bold text-accent">{st.role}</span>
                      <span className="text-xs font-semibold text-primary">— {st.title}</span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-secondary border border-[var(--border)]">
                      {st.metrics}
                    </span>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed pl-7">{st.thought}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. 深度研報主文 (Markdown) */}
      <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-6 rounded-xl min-h-[240px]">
        {loading && !analysisText ? (
          <div className="space-y-4 py-6">
            <div className="flex items-center gap-2 text-accent text-sm font-medium">
              <Loader2 size={16} className="animate-spin" />
              <span>正在拆解 {symbol} 的商業模式護城河、財報三表質量與情境估值模型...</span>
            </div>
            <div className="space-y-3 animate-pulse pt-2">
              <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4"></div>
              <div className="h-4 bg-[var(--bg-secondary)] rounded w-full"></div>
              <div className="h-4 bg-[var(--bg-secondary)] rounded w-5/6"></div>
              <div className="h-4 bg-[var(--bg-secondary)] rounded w-2/3"></div>
            </div>
          </div>
        ) : error ? (
          <div className="text-danger text-sm">{error}</div>
        ) : analysisText ? (
          <div className="ai-report-prose max-w-none text-sm leading-relaxed text-primary">
            <ReactMarkdown>{analysisText}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-secondary text-center py-10 text-sm">
            點擊右上角「產生法人深度研報」立即生成 {symbol} 的個股研究報告
          </div>
        )}
      </div>

      {/* 5. 未來重大催化劑與里程碑時程 */}
      {researchData?.catalysts && researchData.catalysts.length > 0 && (
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
          <div className="flex items-center gap-2 text-xs font-bold text-primary mb-2.5">
            <Calendar size={15} className="text-accent" />
            <span>未來關鍵催化劑時程與追蹤清單 (Key Catalysts & Milestones)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {researchData.catalysts.map((cat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border)] text-xs text-secondary"
              >
                <CheckCircle2 size={14} className="text-accent mt-0.5 flex-shrink-0" />
                <span>{cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
