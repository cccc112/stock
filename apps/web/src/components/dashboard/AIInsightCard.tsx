"use client";
import Card from "@/components/ui/Card";
import { RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";

export default function AIInsightCard() {
  const [loading, setLoading] = useState(false);
  
  const refresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
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
        ) : (
          <div>
            <p className="mb-2"><strong>台股分析：</strong> 今日加權指數呈現震盪整理，電子權值股互有漲跌。外資期貨空單仍高，建議保守操作，留意季線支撐。</p>
            <p className="mb-2"><strong>美股分析：</strong> 科技股受 AI 財報利多激勵，納斯達克創短期新高。通膨數據降溫提升降息預期。</p>
            <p className="mt-4 text-xs text-muted text-right">最後更新: 10:15 AM</p>
          </div>
        )}
      </div>
    </Card>
  );
}
