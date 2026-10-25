"use client";
import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Button from "@/components/ui/Button";
import { Sparkles, Loader2, BrainCircuit, ChevronDown, ChevronUp } from "lucide-react";
import { apiAi } from "@/lib/api";
import { generateSmartStockAnalysis, ThinkingStep } from "@/lib/clientDeepReport";

export default function AISection({
  symbol,
  autoRun = true,
}: {
  symbol: string;
  autoRun?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState<string>("");
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [showThinking, setShowThinking] = useState(true);
  const [error, setError] = useState("");

  const analyze = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 1. 立即啟動本地財報與量化推理鏈（使用記憶體快取，0.5~3 秒內必出結果）
      const smartPromise = generateSmartStockAnalysis(symbol);

      // 2. 同步嘗試後端 Gemini（最多等 5 秒，絕不卡在 504）
      const backendPromise = Promise.race([
        apiAi.analyzeStock(symbol),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI_FAST_TIMEOUT")), 5000)
        ),
      ]).catch(() => null);

      const [smartRes, backendRes] = await Promise.all([smartPromise, backendPromise]);
      setThinkingSteps(smartRes.thinking_steps || []);

      const raw =
        backendRes?.data?.analysis ||
        backendRes?.data?.content ||
        (typeof backendRes?.data === "string" ? backendRes.data : "");

      if (raw && !String(raw).includes("呼叫失敗")) {
        setAnalysisText(String(raw));
        setSourceLabel("Gemini AI 即時診斷");
      } else {
        setAnalysisText(smartRes.analysis);
        setSourceLabel(smartRes.source);
      }
    } catch (err: any) {
      setError(err?.message || "AI 分析失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (autoRun) {
      analyze();
    }
  }, [symbol, autoRun, analyze]);

  return (
    <div className="pt-2 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-tertiary)] border border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 text-accent font-bold text-base flex-wrap">
            <Sparkles size={18} />
            <span>AI 財報與技術面深度診斷 ({symbol})</span>
            {sourceLabel && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium">
                {sourceLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-secondary mt-0.5">
            自動整合最新季度財報、杜邦 ROE 拆解、四大交易模型與 K 線支撐壓力位，並公開 AI 逐步思考推理過程
          </p>
        </div>
        <Button size="sm" variant="primary" onClick={analyze} disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={14} className="mr-1.5 animate-spin" />
              AI 深度運算中...
            </>
          ) : (
            <>
              <Sparkles size={14} className="mr-1.5" />
              {analysisText ? "重新生成診斷" : "開始 AI 分析"}
            </>
          )}
        </Button>
      </div>

      {/* AI 思考與推論過程 (Chain-of-Thought) */}
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
                AI 思考與推論過程 (Chain-of-Thought 5 階段推理鏈)
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

      <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-6 rounded-xl min-h-[240px]">
        {loading && !analysisText ? (
          <div className="space-y-4 py-6">
            <div className="flex items-center gap-2 text-accent text-sm font-medium">
              <Loader2 size={16} className="animate-spin" />
              <span>正在分析 {symbol} 的財報獲利結構、均線趨勢與機構支撐壓力...</span>
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
          <div className="prose prose-invert max-w-none text-sm leading-relaxed text-primary">
            <ReactMarkdown>{analysisText}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-secondary text-center py-10 text-sm">
            點擊右上角「開始 AI 分析」立即產生 {symbol} 的深度診斷報告
          </div>
        )}
      </div>
    </div>
  );
}
