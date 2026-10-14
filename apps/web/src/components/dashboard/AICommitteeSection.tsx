"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiAi } from "@/lib/api";
import {
  Users,
  ShieldAlert,
  TrendingUp,
  Award,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Target,
  Scale,
  BrainCircuit,
  Percent
} from "lucide-react";

interface AICommitteeProps {
  symbol: string;
}

export default function AICommitteeSection({ symbol }: AICommitteeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  const handleRunCommittee = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiAi.runCommittee(symbol);
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.detail ||
          "AI 投資委員會會議召開失敗。請確認您已在設定中輸入 Gemini API Key (BYOK)。"
      );
    } finally {
      setLoading(false);
    }
  };

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
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="text-accent" size={22} />
              多角色 AI 投資委員會 (Multi-Agent Investment Committee)
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              MarketSenseAI Architecture
            </span>
          </div>
          <p className="text-secondary text-xs sm:text-sm">
            集合巴菲特 (基本面護城河)、西蒙斯 (量化動量籌碼) 與首席風控長 (黑天鵝審查) 三方深度交鋒，由投資總監 (CIO) 拍板最終戰略。
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
              召開 AI 投資委員會
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

      {/* 尚未執行提示 */}
      {!loading && !data && !error && (
        <Card className="p-12 text-center text-secondary">
          <Scale size={48} className="mx-auto mb-3 opacity-30 text-accent" />
          <h3 className="text-lg font-bold text-primary mb-1">AI 投資委員會待召開</h3>
          <p className="text-sm max-w-md mx-auto mb-5 text-secondary">
            點擊上方按鈕，AI 專家群將即時調取 {symbol} 的真實報價、財務營收年增率、三大法人籌碼動向與即時新聞，展開多空立體審查。
          </p>
          <Button variant="secondary" onClick={handleRunCommittee}>
            立即啟動委員審查
          </Button>
        </Card>
      )}

      {/* 委員會裁決結果展示 */}
      {data && (
        <div className="space-y-6 animate-fade-in">
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

          {/* 2. 三方專家深度意見 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 巴菲特 (價值投資) */}
            {data.experts?.buffett && (
              <Card className="p-5 flex flex-col justify-between border-emerald-500/20">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">💼</span>
                      <div>
                        <h4 className="font-bold text-sm">巴菲特視角</h4>
                        <span className="text-[11px] text-secondary">價值投資首席顧問</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        data.experts.buffett.stance === "BULLISH"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      評分: {data.experts.buffett.score}分
                    </span>
                  </div>

                  <p className="text-xs text-secondary mb-3 leading-relaxed">
                    {data.experts.buffett.summary}
                  </p>

                  <div className="space-y-2 mb-3">
                    <span className="text-[11px] font-semibold text-secondary block">核心護城河優勢:</span>
                    {(data.experts.buffett.key_strengths || []).map((s: string, i: number) => (
                      <div key={i} className="text-xs flex items-center gap-1.5 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>

                  {data.experts.buffett.major_risks?.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-[var(--border)]">
                      <span className="text-[11px] font-semibold text-secondary block">價值層面隱憂:</span>
                      {data.experts.buffett.major_risks.map((r: string, i: number) => (
                        <div key={i} className="text-xs text-secondary flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
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
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚡</span>
                      <div>
                        <h4 className="font-bold text-sm">西蒙斯視角</h4>
                        <span className="text-[11px] text-secondary">量化動量模型分析師</span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-bold ${
                        data.experts.simons.stance === "BULLISH"
                          ? "bg-indigo-500/10 text-indigo-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      評分: {data.experts.simons.score}分
                    </span>
                  </div>

                  <p className="text-xs text-secondary mb-3 leading-relaxed">
                    {data.experts.simons.summary}
                  </p>

                  <div className="space-y-2 mb-3">
                    <span className="text-[11px] font-semibold text-secondary block">量價籌碼訊號:</span>
                    {(data.experts.simons.momentum_signals || []).map((s: string, i: number) => (
                      <div key={i} className="text-xs flex items-center gap-1.5 text-indigo-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
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
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🛡️</span>
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

                  <p className="text-xs text-secondary mb-3 leading-relaxed">
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
