"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { apiAi } from "@/lib/api";
import { fetchOrBuildDeepReport, generateSmartStockAnalysis } from "@/lib/clientDeepReport";
import { Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface AIChartAnalyzerProps {
  symbol: string;
  onLinesCalculated: (lines: { price: number; color: string; title: string }[]) => void;
}

export default function AIChartAnalyzer({ symbol, onLinesCalculated }: AIChartAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("CHART_AI_TIMEOUT")), 14000)
      );
      const res = await Promise.race([apiAi.chartAnalysis(symbol), timeoutPromise]);
      const data = res.data;

      const newLines: any[] = [];
      (data.supportLines || []).forEach((price: number, i: number) => {
        newLines.push({ price, color: "#22c55e", title: `支撐 ${i + 1}` });
      });
      (data.resistanceLines || []).forEach((price: number, i: number) => {
        newLines.push({ price, color: "#ef4444", title: `壓力 ${i + 1}` });
      });

      onLinesCalculated(newLines);

      if (data.analysis && !String(data.analysis).includes("呼叫失敗")) {
        setAnalysis(data.analysis);
      } else {
        const smart = await generateSmartStockAnalysis(symbol);
        setAnalysis(smart.analysis);
      }
    } catch {
      try {
        const [deep, smart] = await Promise.all([
          fetchOrBuildDeepReport(symbol),
          generateSmartStockAnalysis(symbol),
        ]);
        const v = deep?.verdict;
        if (v) {
          onLinesCalculated([
            { price: v.target_price, color: "#ef4444", title: "目標壓力" },
            { price: v.entry_zone?.[0] || v.stop_loss, color: "#22c55e", title: "關鍵支撐" },
            { price: v.stop_loss, color: "#f59e0b", title: "防守停損" },
          ]);
        }
        setAnalysis(smart.analysis);
      } catch (err: any) {
        setError(err?.message || "分析失敗，請稍後再試。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border-t border-[var(--color-border)] pt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="text-primary" size={20} />
          AI 輔助畫線與基本面診斷
        </h3>
        <Button onClick={handleAnalyze} disabled={loading} variant="primary">
          {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Sparkles className="mr-2" size={16} />}
          {loading ? "計算支撐壓力中..." : "執行 AI 畫線分析"}
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-red-500/10 border border-red-500/50 text-red-500 text-sm mb-4">
          {error}
        </div>
      )}

      {analysis && (
        <div className="p-4 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-sm prose prose-invert max-w-none">
          <ReactMarkdown>{analysis}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
