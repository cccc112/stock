"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Sparkles, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { apiAi } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Suggestion {
  symbol: string;
  action: string;
  signals: Array<{
    strategy: string;
    direction: string;
    confidence: number;
    description: string;
  }>;
  price: number;
}

export default function AITradeCard() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const router = useRouter();

  const getSuggestions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiAi.getTradeSuggestions();
      setSuggestions(res.data.suggestions || res.data || []);
      setHasRun(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "取得 AI 交易建議失敗"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="AI 交易建議"
      className="h-full"
      headerAction={
        <Button
          size="sm"
          onClick={getSuggestions}
          disabled={loading}
          variant={hasRun ? "secondary" : "primary"}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          <span>{loading ? "掃描分析中..." : hasRun ? "重新掃描" : "AI 智慧選股"}</span>
        </Button>
      }
    >
      <div className="flex flex-col gap-3 min-h-[180px]">
        {!hasRun && !loading && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-secondary text-xs py-10 text-center gap-1.5">
            <p className="text-primary font-medium text-sm">全市場量化訊號掃描</p>
            <p className="text-muted">點擊右上角「AI 智慧選股」執行多策略買賣評估</p>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-accent" />
          </div>
        )}

        {error && (
          <div className="text-danger text-xs p-3.5 bg-danger/10 border border-danger/20 rounded-lg">
            {error}
          </div>
        )}

        {hasRun && !loading && !error && suggestions.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-secondary text-sm py-8">
            目前無明確的交易建議
          </div>
        )}

        {hasRun && !loading && !error && suggestions.length > 0 && (
          <div className="space-y-2.5 overflow-y-auto pr-1">
            {suggestions.map((sug, i) => {
              const isBuy = sug.action === "BUY";
              const isSell = sug.action === "SELL";

              return (
                <div
                  key={i}
                  className="bg-[var(--bg-tertiary)] p-3.5 rounded-lg hover:bg-[var(--border-hover)] cursor-pointer transition-colors border border-[var(--border)]"
                  onClick={() => router.push(`/stock/${sug.symbol}`)}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold font-mono text-base">{sug.symbol}</span>
                    <div
                      className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                        isBuy
                          ? "bg-rose-500/10 text-rose-400"
                          : isSell
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-secondary/10 text-secondary"
                      }`}
                    >
                      {isBuy ? (
                        <TrendingUp size={13} />
                      ) : isSell ? (
                        <TrendingDown size={13} />
                      ) : (
                        <Minus size={13} />
                      )}
                      {isBuy ? "買進訊號" : isSell ? "賣出訊號" : "觀望"}
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono tabular-nums text-primary">
                      {sug.price ? `$${sug.price}` : ""}
                    </span>
                    <span className="text-secondary">
                      {sug.signals?.length || 0} 項量化指標觸發
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
