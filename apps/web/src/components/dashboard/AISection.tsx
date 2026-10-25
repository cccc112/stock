"use client";
import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Button from "@/components/ui/Button";
import { Sparkles, Loader2 } from "lucide-react";
import { apiAi } from "@/lib/api";
import { generateSmartStockAnalysis } from "@/lib/clientDeepReport";

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
  const [error, setError] = useState("");

  const analyze = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // 限制後端等待時間最多 14 秒；若遠端發生 504 / 503 或未設 Key，立即切換前端 BYOK / 財報量化 AI 引擎
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI_BACKEND_TIMEOUT")), 14000)
      );
      const res = await Promise.race([apiAi.analyzeStock(symbol), timeoutPromise]);
      const raw =
        res.data?.analysis ||
        res.data?.content ||
        (typeof res.data === "string" ? res.data : "");
      if (raw && !String(raw).includes("呼叫失敗")) {
        setAnalysisText(String(raw));
        setSourceLabel("Gemini AI 即時診斷");
        setLoading(false);
        return;
      }
      throw new Error("FALLBACK_TO_SMART_ENGINE");
    } catch {
      try {
        const fallback = await generateSmartStockAnalysis(symbol);
        setAnalysisText(fallback.analysis);
        setSourceLabel(fallback.source);
      } catch (err: any) {
        setError(err?.message || "AI 分析失敗，請稍後再試");
      } finally {
        setLoading(false);
      }
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
          <div className="flex items-center gap-2 text-accent font-bold text-base">
            <Sparkles size={18} />
            <span>AI 財報與技術面深度診斷 ({symbol})</span>
            {sourceLabel && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium">
                {sourceLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-secondary mt-0.5">
            自動整合最新季度財報、杜邦 ROE 拆解、四大交易模型與 K 線支撐壓力位，給出具體操作計畫
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

      <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] p-6 rounded-xl min-h-[240px]">
        {loading ? (
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
