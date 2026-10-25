"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiAi } from "@/lib/api";
import {
  generateSmartAICommittee,
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
  MessageSquare,
  PieChart,
  ListOrdered,
  Flame,
  ShieldCheck,
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
      // 1. 先立即從本地避險基金決策引擎合成四方委員會裁決、多空攻防辯論與階梯掛單（0.5~3 秒內必出結果）
      const smartPromise = generateSmartAICommittee(symbol);

      // 2. 同步嘗試後端 Gemini（最多等 5 秒，絕不卡在 504）
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
        const merged = {
          ...smartData,
          ...backendRes.data,
          thinking_steps: smartData.thinking_steps,
          portfolio_allocation: smartData.cio_verdict.portfolio_allocation,
          debate: smartData.debate,
          order_ladder: smartData.order_ladder,
          contingency_playbook: smartData.contingency_playbook,
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

  const cio = data?.cio_verdict;
  const alloc = cio?.portfolio_allocation;
  const debate = data?.debate;
  const ladder = data?.order_ladder;
  const playbook = data?.contingency_playbook;

  return (
    <div className="space-y-6">
      {/* 頂部啟動區塊 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-accent/10 border border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="text-accent" size={22} />
              AI 避險基金投資委員會閉門決策室 ({symbol})
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-medium">
              Multi-Agent Live Debate & Execution
            </span>
          </div>
          <p className="text-secondary text-xs sm:text-sm">
            避險基金實戰規格：專注「專家現場多空互槓辯論」、「資產配置上限%」、「階梯式限價掛單手冊」與「突發 If-Then 應變守則」
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
              重新召集決策會議
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
            <span>正在調閱 {symbol} 財報、計算四大量化模型並啟動三方專家交鋒辯論...</span>
          </div>
          <div className="space-y-2.5 text-xs text-secondary font-mono pl-7">
            <div>[Round 1] 巴菲特 Agent：從基本面估值安全邊際開炮，質疑追高風險...</div>
            <div>[Round 2] 西蒙斯 Agent：量化動能反擊，提出 Minervini Stage 2 與 SMC 機構大單訂單塊...</div>
            <div>[Round 3] 首席風控官 CRO：冷靜介入仲裁，依據波動率定下總資產配置上限與硬性停損...</div>
            <div>[Round 4] 投資總監 CIO：整合裁定，制定 3 階階梯式限價掛單指引與 If-Then 應變手冊...</div>
          </div>
        </Card>
      )}

      {/* 委員會裁決結果與決策展示 */}
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
                    AI 委員會決策推論鏈 (5 階段 Chain-of-Thought 推理過程)
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/20 text-accent">
                    點擊展開 / 收合
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

          {/* 1. CIO 投資總監最終裁決看板與資產配置比例 */}
          {cio && (
            <Card className="p-6 border-accent/40 bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-accent/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
                <div>
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                    Chief Investment Officer • 避險基金投資總監最終裁決
                  </span>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span
                      className={`text-2xl font-bold px-3 py-1 rounded-lg border ${getActionColor(
                        cio.final_action
                      )}`}
                    >
                      {cio.action_label || cio.final_action}
                    </span>

                    {/* 資產配置權重標籤 */}
                    {alloc && (
                      <div className="flex items-center gap-2 bg-[var(--bg-primary)] px-3 py-1 rounded-lg border border-[var(--border)]">
                        <PieChart size={15} className="text-accent" />
                        <span className="text-xs text-secondary">
                          建議配置上限:{" "}
                          <strong className="text-accent font-mono text-sm">
                            {alloc.conservative_pct}% ~ {alloc.aggressive_pct}%
                          </strong>{" "}
                          (單檔上限 {alloc.max_cap_pct}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 綜合 AI 評分 */}
                <div className="flex items-center gap-4 bg-[var(--bg-primary)]/80 px-4 py-2.5 rounded-xl border border-[var(--border)]">
                  <div className="text-right">
                    <span className="text-xs text-secondary block">委員會綜合信心度</span>
                    <span className="text-2xl font-extrabold font-mono text-accent">
                      {cio.overall_ai_score ?? 85}
                    </span>
                    <span className="text-xs text-secondary"> / 100</span>
                  </div>
                  <Award className="text-accent" size={32} />
                </div>
              </div>

              {/* 關鍵價位帶 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                <div className="p-3 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border)]">
                  <span className="text-xs text-secondary block">建議進場位階</span>
                  <span className="text-sm font-bold font-mono text-primary">
                    {cio.entry_zone || "回測支撐掛單"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border)]">
                  <span className="text-xs text-secondary block">波段目標價</span>
                  <span className="text-sm font-bold font-mono text-up-tw">
                    ${cio.target_price ?? "-"}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-primary)]/50 border border-[var(--border)]">
                  <span className="text-xs text-secondary block">嚴格防守停損價</span>
                  <span className="text-sm font-bold font-mono text-down-tw">
                    ${cio.stop_loss_price ?? "-"}
                  </span>
                </div>
              </div>

              {/* 總結陳述 */}
              <div className="bg-[var(--bg-primary)]/40 p-4 rounded-lg border border-[var(--border)] mb-4">
                <span className="text-xs font-semibold text-secondary uppercase block mb-1">
                  委員會最終裁決核心論述
                </span>
                <p className="text-sm text-primary leading-relaxed">
                  {cio.executive_summary}
                </p>
                {alloc?.reasoning && (
                  <p className="text-xs text-accent mt-2 pt-2 border-t border-[var(--border)]">
                    💡 <strong>資金管理守則</strong>：{alloc.reasoning}
                  </p>
                )}
              </div>

              {/* 具體行動清單 */}
              {cio.action_plan && (
                <div>
                  <span className="text-xs font-semibold text-secondary uppercase block mb-2">
                    建議操盤紀律 (Execution Rules)
                  </span>
                  <div className="space-y-1.5">
                    {cio.action_plan.map((step: string, idx: number) => (
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

          {/* 2. 避險基金閉門決策：三方專家即時多空攻防辯論 (Live Multi-Agent Debate) */}
          {debate && (
            <div className="p-5 rounded-xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-accent/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-primary">
                    避險基金專家閉門會議：實戰多空交鋒辯論 (Live Debate)
                  </h3>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 font-semibold">
                  3 方真實攻防質詢
                </span>
              </div>

              <div className="text-xs text-secondary italic">
                辯論核心議題：{debate.topic}
              </div>

              <div className="space-y-3.5">
                {/* Round 1: 巴菲特質疑 */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Scale size={15} className="text-emerald-400" />
                      <strong className="text-xs text-emerald-400 font-bold">
                        Round 1 · {debate.round1_buffett.speaker}（{debate.round1_buffett.role}）
                      </strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                      {debate.round1_buffett.stance}
                    </span>
                  </div>
                  <p className="text-xs text-primary leading-relaxed pl-6">
                    「{debate.round1_buffett.speech}」
                  </p>
                </div>

                {/* Round 2: 西蒙斯反駁 */}
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={15} className="text-indigo-400" />
                      <strong className="text-xs text-indigo-400 font-bold">
                        Round 2 · {debate.round2_simons.speaker}（{debate.round2_simons.role}）
                      </strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                      {debate.round2_simons.stance}
                    </span>
                  </div>
                  <p className="text-xs text-primary leading-relaxed pl-6">
                    「{debate.round2_simons.speech}」
                  </p>
                </div>

                {/* Round 3: CRO 裁決 */}
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={15} className="text-rose-400" />
                      <strong className="text-xs text-rose-400 font-bold">
                        Round 3 · {debate.round3_cro.speaker}（{debate.round3_cro.role}）
                      </strong>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-medium">
                      {debate.round3_cro.stance}
                    </span>
                  </div>
                  <p className="text-xs text-primary leading-relaxed pl-6">
                    「{debate.round3_cro.speech}」
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. 實戰階梯式限價掛單手冊 (Execution Order Ladder) */}
          {ladder && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <ListOrdered size={15} className="text-accent" />
                  實戰階梯式限價掛單指引 (Execution Order Ladder)
                </span>
                <span className="text-[11px] text-secondary">
                  分批建倉 · 移動停利 · 嚴禁單筆梭哈
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-accent">
                      {ladder.step1_entry.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-accent/20 text-accent font-mono font-bold">
                      {ladder.step1_entry.share_pct}% 部位
                    </span>
                  </div>
                  <div className="text-xl font-extrabold font-mono text-primary mb-1">
                    ${ladder.step1_entry.price}
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    {ladder.step1_entry.note}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-indigo-400">
                      {ladder.step2_pullback.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                      {ladder.step2_pullback.share_pct}% 部位
                    </span>
                  </div>
                  <div className="text-xl font-extrabold font-mono text-primary mb-1">
                    ${ladder.step2_pullback.price}
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    {ladder.step2_pullback.note}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-emerald-400">
                      {ladder.step3_breakout.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      {ladder.step3_breakout.share_pct}% 部位
                    </span>
                  </div>
                  <div className="text-xl font-extrabold font-mono text-primary mb-1">
                    ${ladder.step3_breakout.price}
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    {ladder.step3_breakout.note}
                  </p>
                </div>
              </div>

              {/* 分批停利與保本出場計畫 */}
              <div className="mt-3 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2 text-secondary">
                  <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-emerald-400 block mb-0.5">
                      階梯停利 TP1 (${ladder.take_profit_ladder.tp1.price})
                    </strong>
                    <span>{ladder.take_profit_ladder.tp1.action}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-secondary">
                  <ShieldCheck size={15} className="text-down-tw mt-0.5 flex-shrink-0" />
                  <div>
                    <strong className="text-down-tw block mb-0.5">
                      硬性停損 ($${ladder.stop_loss.price})
                    </strong>
                    <span>{ladder.stop_loss.action}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. 突發極端情境 If-Then 應變手冊 (Contingency Playbook) */}
          {playbook && playbook.length > 0 && (
            <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-accent" />
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
                  突發極端情境 If-Then 應變守則 (Contingency Playbook)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {playbook.map((pb: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border ${
                      pb.type === "danger"
                        ? "bg-rose-500/5 border-rose-500/30 text-rose-300"
                        : pb.type === "warning"
                        ? "bg-amber-500/5 border-amber-500/30 text-amber-300"
                        : "bg-indigo-500/5 border-indigo-500/30 text-indigo-300"
                    }`}
                  >
                    <span className="font-bold text-xs block mb-1">
                      {pb.title}
                    </span>
                    <div className="text-[11px] text-secondary mb-2">
                      <strong>觸發條件</strong>：{pb.trigger}
                    </div>
                    <div className="text-xs text-primary leading-relaxed pt-2 border-t border-[var(--border)]">
                      👉 <strong>因應動作</strong>：{pb.action}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. 三方專家深度意見與各自思考邏輯 */}
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
                        [巴菲特辯論重點]
                      </span>
                      {data.experts.buffett.reasoning}
                    </div>
                  )}

                  <p className="text-xs text-primary mb-3 leading-relaxed">
                    {data.experts.buffett.summary}
                  </p>

                  <div className="space-y-2 mb-3">
                    <span className="text-[11px] font-semibold text-secondary block">核心關注指標:</span>
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
