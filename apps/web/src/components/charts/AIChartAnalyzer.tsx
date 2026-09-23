"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
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
      // Direct API call
      const res = await api.post(`/ai/chart-analysis/${symbol}`);
      const data = res.data;
      
      const newLines: any[] = [];
      data.supportLines.forEach((price: number, i: number) => {
        newLines.push({ price, color: '#22c55e', title: `支撐 ${i+1}` });
      });
      data.resistanceLines.forEach((price: number, i: number) => {
        newLines.push({ price, color: '#ef4444', title: `壓力 ${i+1}` });
      });
      
      onLinesCalculated(newLines);
      setAnalysis(data.analysis);
      
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || "分析失敗，請稍後再試。請確定您已設定 Gemini API Key。");
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
