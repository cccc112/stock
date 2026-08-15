"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { Sparkles } from "lucide-react";
import { apiAi } from "@/lib/api";

export default function AISection({ symbol }: { symbol: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  const analyze = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiAi.analyzeStock(symbol);
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'AI 分析失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-2">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 text-accent font-semibold">
          <Sparkles size={20} /> AI 深度解析
        </div>
        <Button size="sm" onClick={analyze} disabled={loading}>
          <Sparkles size={14} className="mr-2" />
          {loading ? '分析中...' : data ? '重新生成' : '開始分析'}
        </Button>
      </div>
      <div className="prose prose-invert max-w-none text-sm bg-[var(--bg-tertiary)] p-6 rounded-lg min-h-[200px]">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4"></div>
            <div className="h-4 bg-[var(--bg-secondary)] rounded w-full"></div>
            <div className="h-4 bg-[var(--bg-secondary)] rounded w-5/6"></div>
          </div>
        ) : error ? (
          <div className="text-danger">{error}</div>
        ) : data ? (
          <div className="whitespace-pre-wrap">{data.analysis || data.content || (typeof data === 'string' ? data : JSON.stringify(data))}</div>
        ) : (
          <div className="text-secondary text-center py-8">點擊「開始分析」取得 {symbol} 的 AI 診斷報告</div>
        )}
      </div>
    </div>
  );
}
