"use client";
import { useState } from "react";
import { Sparkles, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { apiSimulator } from "@/lib/api";

interface ReviewReportProps {
  portfolioId?: string;
}

export default function ReviewReport({ portfolioId }: ReviewReportProps) {
  const [review, setReview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReview = async () => {
    if (!portfolioId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiSimulator.requestReview(portfolioId);
      setReview(data.review || data.analysis || JSON.stringify(data));
    } catch (e: any) {
      setError("無法取得 AI 覆盤報告");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!portfolioId) {
    return (
      <div className="text-center py-8 text-secondary">
        請先選擇一個投資組合
      </div>
    );
  }

  if (!review && !loading) {
    return (
      <div className="text-center py-8 space-y-4">
        <Sparkles size={32} className="mx-auto text-accent" />
        <p className="text-secondary">讓 AI 幫你分析這個組合的交易表現</p>
        <Button onClick={fetchReview}>
          <Sparkles size={14} className="mr-2" /> 開始 AI 覆盤
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12 space-y-4">
        <Loader2 size={32} className="mx-auto text-accent animate-spin" />
        <p className="text-secondary">AI 正在分析您的交易紀錄...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-danger">{error}</p>
        <Button variant="secondary" onClick={fetchReview}>重試</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-accent">
          <Sparkles size={20} /> AI 交易覆盤報告
        </h3>
        <Button size="sm" variant="ghost" onClick={fetchReview}>重新分析</Button>
      </div>
      <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg prose prose-invert max-w-none text-sm whitespace-pre-wrap leading-relaxed">
        {review}
      </div>
    </div>
  );
}

