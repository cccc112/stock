"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiAi } from "@/lib/api";
import {
  generateSmartAICommittee,
  buildThinkingSteps,
  fetchOrBuildDeepReport,
  ThinkingStep,
} from "@/lib/clientDeepReport";
import {
  Users,
  ShieldAlert,
  TrendingUp,
  Award,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Scale,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AICommitteeProps {
  symbol: string;
}

export default function AICommitteeSection({ symbol }: AICommitteeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [showThinking, setShowThinking] = useState(true);

  const handleRunCommittee = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. 先立即從快取或平行財報引擎合成完整四方委員會裁決與思考過程（約 0.5~3 秒內必定完成，絕不卡住）
      const smartPromise = generateSmartAICommittee(symbol);

      // 2. 同步嘗試後端 Gemini（最多只等 5 秒，若逾時或失敗直接採用上方真實財報量化引擎結果）
      const backendPromise = Promise.race([
        apiAi.runCommittee(symbol),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("COMMITTEE_FAST_TIMEOUT")), 5000)
        ),
      ]).catch(() => null);

      const [smartData, backendRes] = await Promise.all([smartPromise, backendPromise]);
      setThinkingSteps(smartData.thinking_steps || []);

      if (
        backendRes?.data?.cio_verdict &&
        !backendRes.data.cio_verdict.error &&
        !backendRes.data.experts?.buffett?.error
      ) {
        // 合併後端 LLM 結果與逐步思考過程
        const merged = {
          ...backendRes.data,
          thinking_steps: smartData.thinking_steps,
          experts: {
            buffett: {
              ...smartData.experts.buffett,
              ...backendRes.data.experts.buffett,
              reasoning:
                backendRes.data.experts.buffett?.reasoning ||
                smartData.experts.buffett.reasoning,
            },
            simons: {
              ...smartData.experts.simons,
              ...backendRes.data.experts.simons,
              reasoning:
                backendRes.data.experts.simons?.reasoning ||
                smartData.experts.simons.reasoning,
            },
            cro: {
              ...smartData.experts.cro,
              ...backendRes.data.experts.cro,
              reasoning:
                backendRes.data.experts.cro?.reasoning ||
                smartData.experts.cro.reasoning,
            },
          },
        };
        setData(merged);
      } else {
        setData(smartData);
      }
    } catch (err: any) {
      setError(err?.message || "AI 投資委員會會議召開失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  // 點開「AI 投資委員會」頁籤時自動啟動，不需額外手動按兩次
  useEffect(() => {
    handleRunCommittee();
  }, [symbol, handleRunCommittee]);

  const getActionColor = (action: string) => {
    switch (action) {
      case "STRONG_BUY":
      case "BUY":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "STRONG_SELL":
      case "SELL":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* 頂部啟動區塊 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="text-accent" size={22} />
              多角色 AI 投資委員會 ({symbol})
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Multi-Agent Chain-of-Thought
            </span>
          </div>
          <p className="text-secondary text-xs sm:text-sm">
            集合巴菲特 (基本面護城河)、西蒙斯 (量化動量籌碼) 與首席風控長 (黑天鵝審查) 三方深度交鋒，完整公開 5 階段思考推理鏈。
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleRunCommittee}
          disabled={loading}
          className="py-2.5 px-5 font-bold shadow-lg shadow-accent/20 flex-shrink-0 flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              委員會多空激辯中...
            </>
          ) : (
            <>
              <BrainCircuit size={18} />
              重新召開 AI 委員會
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
          <ShieldAlert size={18} />
          {error}
        </div>
      )}

      {loading && !data && (
        <Card className="p-8 space-y-4">
          <div className="flex items-center gap-3 text-accent font-semibold text-sm">
            <Loader2 className="animate-spin" size={18} />
            <span>正在調閱 {symbol} 財報、計算四大量化模型並進行三方專家推理...</span>
          </div>
          <div className="space-y-2.5 text-xs text-secondary font-mono pl-7">
            <div>[Step 1/5] 提取最新季報毛利率、杜邦 ROE 三因子與資產負債表...</div>
            <div>[Step 2/5] 巴菲特 Agent：檢驗 Piotroski F-Score 與本益比安全邊際...</div>
            <div>[Step 3/5] 西蒙斯 Agent：運算 Minervini VCP 收斂比與 SMC 機構訂單塊...</div>
            <div>[Step 4/5] 首席風控長 CRO：執行下行回撤與上檔套牢壓力測試...</div>
            <div>[Step 5/5] 投資總監 CIO：加權多空論點拍板最終進出場區間...</div>
          </div>
        </Card>
      )}

      {/* 委員會裁決結果與思考過程展示 */}
      {data && (
        <div className="space-y-6 animate-fade-in">
          {/* 0. AI 委員會 5 階段思考與推理過程 (Chain-of-Thought) */}
          {thinkingSteps.length > 0 && (
            <div className="rounded-xl border border-accent/30 bg-[var(--bg-secondary)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowThinking((v) => !v)}
                className="w-full px-5 py-3.5 flex items-center justify-between bg-accent/10 hover:bg-accent/15 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <BrainCircuit size={18} className="text-accent" />
                  <span className="font-bold text-sm text-primary">
                    AI 委員會思考與推理過程 (5 階段 Chain-of-Thought 推理鏈)
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/20 text-accent">
                    可點擊展開 / 收合
                  </span>
                </div>
                {showThinking ? (
                  <ChevronUp size={18} className="text-secondary" />
                ) : (
                  <ChevronDown size={18} className="text-secondary" />
                )}
              </button>

              {showThinking && (
                <div className="p-5 space-y-3.5 divide-y divide-[var(--border)]">
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
                      <p className="text-xs text-secondary leading-relaxed pl-7">
                        {st.thought}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 1. CIO 投資總監決策看板 */}
          {data.cio_verdict && (
            <Card className="p-6 border-accent/40 bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-accent/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
                <div>
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    Chief Investment Officer • 投資總監最終裁決
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span
                      className={`text-2xl font-bold px-3 py-1 rounded-lg border ${getActionColor(
                        data.cio_verdict.final_action
                      )}`}
                    >
                      {data.cio_verdict.action_label || data.cio_verdict.final_action}
                    </span>
                    <span className="text-sm text-secondary">
                      建議配置部位:{" "}
                      <strong className="text-primary font-mono text-base">
                        {data.cio_verdict.suggested_position_pct ?? 50}%
                      </strong>
                    </span>
                  </div>
                </div>

                {/* 綜合 AI 評分 */}
                <div className="flex items-center gap-4 bg-[var(--bg-primary)]/60 px-4 py-2.5 rounded-xl border border-[var(--border)]">
                  <div className="text-right">
                    <span className="text-xs text-secondary block">委員會綜合評分</span>
                    <span className="text-2xl font-extrabold font-mono text-accent">
                      {data.cio_verdict.overall_ai_score ?? 85}
                    </span>
                    <span className="text-xs text-secondary"> / 100</span>
                  </div>
                  <Award className="text-accent" size={32} />
                </div>
              </div>

              {/* 關鍵價位帶 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                <div className="p-3 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border)]">
                  <span className="text-xs text-secondary block">建議進場區間</span>
                  <span className="text-sm font-bold font-mono text-primary">
                    {data.cio_verdict.entry_zone || "市價拉回支撐"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border)]">
                  <span className="text-xs text-secondary block">停利目標價</span>
                  <span className="text-sm font-bold font-mono text-up-tw">
                    ${data.cio_verdict.target_price ?? "-"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border)]">
                  <span className="text-xs text-secondary block">嚴格防守停損價</span>
                  <span className="text-sm font-bold font-mono text-down-tw">
                    ${data.cio_verdict.stop_loss_price ?? "-"}
                  </span>
                </div>
              </div>

              {/* 總結陳述 */}
              <div className="bg-[var(--bg-primary)]/40 p-4 rounded-lg border border-[var(--border)] mb-4">
                <span className="text-xs font-semibold text-secondary uppercase block mb-1">
                  委員會決策核心論述
                </span>
                <p className="text-sm text-primary leading-relaxed">
                  {data.cio_verdict.executive_summary}
                </p>
              </div>

              {/* 具體行動清單 */}
              {data.cio_verdict.action_plan && (
                <div>
                  <span className="text-xs font-semibold text-secondary uppercase block mb-2">
                    建議執行步驟 (Action Plan)
                  </span>
                  <div className="space-y-1.5">
                    {data.cio_verdict.action_plan.map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-secondary">
                        <CheckCircle2 size={14} className="text-accent mt-0.5 flex-shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* 2. 三方專家深度意見與各自思考邏輯 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 巴菲特 (價值投資) */}
            {data.experts?.buffett && (
              <Card className="p-5 flex flex-col justify-between border-emerald-500/20">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <Scale size={15} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">巴菲特視角</h4>
                        <span className="text-[11px] text-secondary">價值投資首席顧問</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        data.experts.buffett.stance === "BULLISH"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      評分: {data.experts.buffett.score}分
                    </span>
                  </div>

                  {data.experts.buffett.reasoning && (
                    <div className="mb-3 p-2.5 rounded-lg bg-[var(--bg-primary)]/60 border border-emerald-500/20 text-[11px] text-secondary leading-relaxed">
                      <span className="text-emerald-400 font-bold block mb-0.5">
                        [巴菲特思考推論]
                      </span>
                      {data.experts.buffett.reasoning}
                    </div>
                  )}

                  <p className="text-xs text-primary mb-3 leading-relaxed">
                    {data.experts.buffett.summary}
                  </p>

                  <div className="space-y-2 mb-3">
                    <span className="text-[11px] font-semibold text-secondary block">核心護城河優勢:</span>
                    {(data.experts.buffett.key_strengths || []).map((s: string, i: number) => (
                      <div key={i} className="text-xs flex items-center gap-1.5 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>

                  {data.experts.buffett.major_risks?.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                      <span className="text-[11px] font-semibold text-secondary block">價值層面隱憂:</span>
                      {data.experts.buffett.major_risks.map((r: string, i: number) => (
                        <div key={i} className="text-xs text-secondary flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-secondary flex justify-between">
                  <span>護城河評定:</span>
                  <span className="font-bold text-primary">{data.experts.buffett.moat_rating || "WIDE"}</span>
                </div>
              </Card>
            )}

            {/* 西蒙斯 (量化動量) */}
            {data.experts?.simons && (
              <Card className="p-5 flex flex-col justify-between border-indigo-500/20">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                        <TrendingUp size={15} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">西蒙斯視角</h4>
                        <span className="text-[11px] text-secondary">量化動量模型分析師</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        data.experts.simons.stance === "BULLISH"
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      評分: {data.experts.simons.score}分
                    </span>
                  </div>

                  {data.experts.simons.reasoning && (
                    <div className="mb-3 p-2.5 rounded-lg bg-[var(--bg-primary)]/60 border border-indigo-500/20 text-[11px] text-secondary leading-relaxed">
                      <span className="text-indigo-400 font-bold block mb-0.5">
                        [西蒙斯量化推論]
                      </span>
                      {data.experts.simons.reasoning}
                    </div>
                  )}

                  <p className="text-xs text-primary mb-3 leading-relaxed">
                    {data.experts.simons.summary}
                  </p>

                  <div className="space-y-2 mb-3">
                    <span className="text-[11px] font-semibold text-secondary block">量價籌碼訊號:</span>
                    {(data.experts.simons.momentum_signals || []).map((s: string, i: number) => (
                      <div key={i} className="text-xs flex items-center gap-1.5 text-indigo-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border)] grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[var(--bg-primary)] p-2 rounded text-center">
                    <span className="text-secondary block">關鍵支撐</span>
                    <span className="font-bold font-mono text-primary">${data.experts.simons.support_level ?? "-"}</span>
                  </div>
                  <div className="bg-[var(--bg-primary)] p-2 rounded text-center">
                    <span className="text-secondary block">關鍵壓力</span>
                    <span className="font-bold font-mono text-primary">${data.experts.simons.resistance_level ?? "-"}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* 首席風控長 (挑毛病與黑天鵝把關) */}
            {data.experts?.cro && (
              <Card className="p-5 flex flex-col justify-between border-red-500/20">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0">
                        <ShieldAlert size={15} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">首席風控官 (CRO)</h4>
                        <span className="text-[11px] text-secondary">黑天鵝與極端風險審查</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        data.experts.cro.risk_level === "LOW"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : data.experts.cro.risk_level === "MEDIUM"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      風險等級: {data.experts.cro.risk_level}
                    </span>
                  </div>

                  {data.experts.cro.reasoning && (
                    <div className="mb-3 p-2.5 rounded-lg bg-[var(--bg-primary)]/60 border border-rose-500/20 text-[11px] text-secondary leading-relaxed">
                      <span className="text-rose-400 font-bold block mb-0.5">
                        [風控長反方詰問推論]
                      </span>
                      {data.experts.cro.reasoning}
                    </div>
                  )}

                  <p className="text-xs text-primary mb-3 leading-relaxed">
                    {data.experts.cro.summary}
                  </p>

                  <div className="space-y-2 mb-3">
                    <span className="text-[11px] font-semibold text-secondary block">主要漏洞與脆弱點:</span>
                    {(data.experts.cro.top_vulnerabilities || []).map((v: string, i: number) => (
                      <div key={i} className="text-xs flex items-center gap-1.5 text-red-400">
                        <AlertTriangle size={12} className="flex-shrink-0" />
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border)] text-[11px] text-secondary flex justify-between">
                  <span>建議最大停損保護:</span>
                  <span className="font-bold text-down-tw">
                    -{data.experts.cro.recommended_stop_loss_pct ?? 6.0}%
                  </span>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
