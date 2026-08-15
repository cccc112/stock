"use client";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Bot, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { apiAi } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Suggestion {
  symbol: string;
  action: string; // BUY, SELL, HOLD
  signals: Array<{strategy: string, direction: string, confidence: number, description: string}>;
  price: number;
}

export default function AITradeCard() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);
  const router = useRouter();

  const getSuggestions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiAi.getTradeSuggestions();
      setSuggestions(res.data.suggestions || res.data || []);
      setHasRun(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.message || '取得 AI 交易建議失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-accent">
          <Bot size={20} /> AI 交易建議
        </h3>
        <Button size="sm" onClick={getSuggestions} disabled={loading} variant={hasRun ? "secondary" : "primary"}>
          {loading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Bot size={14} className="mr-2" />}
          {loading ? '分析中...' : hasRun ? '重新分析' : 'AI 智慧選股'}
        </Button>
      </div>

      <div className="flex-1 flex flex-col gap-3 min-h-[200px]">
        {!hasRun && !loading && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-secondary text-sm p-4 text-center">
            <Bot size={32} className="mb-2 opacity-50" />
            <p>點擊「AI 智慧選股」按鈕</p>
            <p>自動掃描全市場並給出買賣建議</p>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-accent opacity-50" />
          </div>
        )}

        {error && (
          <div className="text-danger text-sm p-4 bg-danger/10 rounded-md">
            {error}
          </div>
        )}

        {hasRun && !loading && !error && suggestions.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-secondary text-sm">
            目前無明確的交易建議
          </div>
        )}

        {hasRun && !loading && !error && suggestions.length > 0 && (
          <div className="space-y-3 overflow-y-auto pr-1">
            {suggestions.map((sug, i) => {
              const isBuy = sug.action === 'BUY';
              const isSell = sug.action === 'SELL';
              
              return (
                <div 
                  key={i} 
                  className="bg-[var(--bg-tertiary)] p-3 rounded-md hover:bg-[var(--border)] cursor-pointer transition-colors border border-transparent hover:border-accent/30"
                  onClick={() => router.push(`/stock/${sug.symbol}`)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">{sug.symbol}</span>
                    <div className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                      isBuy ? 'bg-up-tw/20 text-up-tw' : 
                      isSell ? 'bg-down-tw/20 text-down-tw' : 
                      'bg-secondary/20 text-secondary'
                    }`}>
                      {isBuy ? <TrendingUp size={14} /> : isSell ? <TrendingDown size={14} /> : <Minus size={14} />}
                      {isBuy ? '建議買進' : isSell ? '建議賣出' : '觀望'}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-medium">{sug.price ? `$${sug.price}` : ''}</span>
                    <span className="text-xs text-secondary">
                      {sug.signals?.length || 0} 個策略訊號支持
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
