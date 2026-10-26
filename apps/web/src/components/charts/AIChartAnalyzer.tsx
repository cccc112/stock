"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import { apiAi } from "@/lib/api";
import {
  fetchOrBuildDeepReport,
  generateSmartStockAnalysis,
  ThinkingStep,
} from "@/lib/clientDeepReport";
import { Sparkles, Loader2, BrainCircuit, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AIChartAnalyzerProps {
  symbol: string;
  onLinesCalculated: (lines: { price: number; color: string; title: string }[]) => void;
}

export default function AIChartAnalyzer({ symbol, onLinesCalculated }: AIChartAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [showThinking, setShowThinking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const smartPromise = Promise.all([
        fetchOrBuildDeepReport(symbol),
        generateSmartStockAnalysis(symbol),
      ]);

      const backendPromise = Promise.race([
        apiAi.chartAnalysis(symbol),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("CHART_AI_FAST_TIMEOUT")), 5000)
        ),
      ]).catch(() => null);

      const [[deep, smart], backendRes] = await Promise.all([smartPromise, backendPromise]);
      setThinkingSteps(smart.thinking_steps || []);

      if (backendRes?.data?.supportLines?.length || backendRes?.data?.resistanceLines?.length) {
        const data = backendRes.data;
        const newLines: { price: number; color: string; title: string }[] = [];
        (data.supportLines || []).forEach((price: number, i: number) => {
          newLines.push({ price, color: "#22c55e", title: `支撐 ${i + 1}` });
        });
        (data.resistanceLines || []).forEach((price: number, i: number) => {
          newLines.push({ price, color: "#ef4444", title: `壓力 ${i + 1}` });
        });
        onLinesCalculated(newLines);
      } else if (deep?.verdict) {
        const v = deep.verdict;
        onLinesCalculated([
          { price: v.target_price, color: "#ef4444", title: "目標壓力" },
          { price: v.entry_zone?.[0] || v.stop_loss, color: "#22c55e", title: "關鍵支撐" },
          { price: v.stop_loss, color: "#f59e0b", title: "防守停損" },
        ]);
      }

      if (backendRes?.data?.analysis && !String(backendRes.data.analysis).includes("呼叫失敗") && !backendRes.data?.analysis_error) {
        setAnalysis(backendRes.data.analysis);
      } else {
        setAnalysis(smart.analysis);
      }
    } catch (err: any) {
      setError(err?.message || "分析失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }, [symbol, onLinesCalculated]);

  useEffect(() => {
    handleAnalyze();
  }, [handleAnalyze]);

  return (
    <div className="mt-6 border-t border-[var(--color-border)] pt-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="text-accent" size={20} />
          AI 輔助畫線與基本面診斷
        </h3>
        <Button onClick={handleAnalyze} disabled={loading} variant="primary">
          {loading ? (
            <Loader2 className="animate-spin mr-2" size={16} />
          ) : (
            <Sparkles className="mr-2" size={16} />
          )}
          {loading ? "計算支撐壓力與推理中..." : "執行 AI 畫線分析"}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/50 text-red-500 text-sm">
          {error}
        </div>
      )}

      {thinkingSteps.length > 0 && (
        <div className="rounded-xl border border-accent/30 bg-[var(--bg-secondary)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowThinking((v) => !v)}
            className="w-full px-4 py-2.5 flex items-center justify-between bg-accent/10 hover:bg-accent/15 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <BrainCircuit size={16} className="text-accent" />
              <span className="font-bold text-xs text-primary">
                AI 畫線與基本面思考推理過程 (Chain-of-Thought)
              </span>
            </div>
            {showThinking ? (
              <ChevronUp size={16} className="text-secondary" />
            ) : (
              <ChevronDown size={16} className="text-secondary" />
            )}
          </button>
          {showThinking && (
            <div className="p-4 space-y-2.5 divide-y divide-[var(--border)]">
              {thinkingSteps.map((st) => (
                <div key={st.step} className="pt-2.5 first:pt-0 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
                    <span className="font-bold text-accent">
                      Step {st.step}. {st.role} — {st.title}
                    </span>
                    <span className="text-[11px] font-mono text-secondary">{st.metrics}</span>
                  </div>
                  <p className="text-secondary leading-relaxed">{st.thought}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {analysis && (
        <div className="p-5 rounded-xl bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm ai-report-prose prose prose-invert max-w-none">
          <ReactMarkdown>{analysis}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
