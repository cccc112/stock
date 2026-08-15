"use client";
import Card from "@/components/ui/Card";
import { RefreshCw, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { apiAi } from "@/lib/api";

export default function AIInsightCard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiAi.getMarketSummary();
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || '無法取得 AI 盤勢診斷');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refresh = () => {
    fetchData();
  };

  return (
    <Card 
      title={<div className="flex items-center gap-2"><Sparkles size={18} className="text-accent" /> AI 盤勢診斷</div>}
      variant="accent-border"
      headerAction={
        <button onClick={refresh} className="text-secondary hover:text-primary">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      }
    >
      <div className="prose prose-invert max-w-none text-sm text-secondary">
        {loading ? (
          <div className="space-y-2">
            <div className="h-4 w-full bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-[var(--bg-tertiary)] animate-pulse rounded" />
            <div className="h-4 w-4/6 bg-[var(--bg-tertiary)] animate-pulse rounded" />
          </div>
        ) : error ? (
          <div className="text-danger">{error}</div>
        ) : data ? (
          <div>
            <p className="mb-2"><strong>台股分析：</strong> {data.twMarket || '無資料'}</p>
            <p className="mb-2"><strong>美股分析：</strong> {data.usMarket || '無資料'}</p>
            <p className="mt-4 text-xs text-muted text-right">最後更新: {new Date(data.updatedAt || Date.now()).toLocaleTimeString()}</p>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
