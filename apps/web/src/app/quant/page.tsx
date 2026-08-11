"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { formatNumber, getChangeColorClass } from "@/lib/utils";
import { apiMarket, apiQuant } from "@/lib/api";
import { Activity, TrendingUp, AlertTriangle } from "lucide-react";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

interface ScanResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  market: 'TW' | 'US';
  anomaly?: { type: string; confidence: number };
  rsi?: number;
}

export default function QuantScreenerPage() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runScan = async () => {
      setLoading(true);
      try {
        // Fetch trending stocks as our scan universe for now
        const [trendingRes, etfRes] = await Promise.all([
          apiMarket.getTrending(),
          apiMarket.getPopularETFs()
        ]);
        
        const universe = [...(trendingRes.data || []), ...(etfRes.data || [])];
        const uniqueUniverse = Array.from(new Map(universe.map(item => [item.symbol, item])).values());
        
        // Take a small subset for demonstration to avoid rate limits
        const targetUniverse = uniqueUniverse.slice(0, 10);
        
        const scanPromises = targetUniverse.map(async (stock) => {
          try {
            const analysis = await apiQuant.getAnalysis(stock.symbol);
            return {
              ...stock,
              anomaly: analysis.data.volume_anomaly,
              rsi: analysis.data.indicators?.RSI
            };
          } catch (e) {
            return null;
          }
        });
        
        const scanResults = await Promise.all(scanPromises);
        const validResults = scanResults.filter(r => r !== null && (r.anomaly?.type !== "NORMAL" || (r.rsi && (r.rsi > 70 || r.rsi < 30))));
        
        setResults(validResults as ScanResult[]);
      } catch (error) {
        console.error("Scan failed", error);
      } finally {
        setLoading(false);
      }
    };
    
    runScan();
  }, []);

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl mx-auto mt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Activity className="text-accent" size={32} />
          量化訊號掃描儀
        </h1>
        <p className="text-secondary">每日自動掃描台美股熱門標的，透過量價與技術指標捕捉交易機會</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="h-48">
              <LoadingSkeleton variant="text" />
              <div className="mt-4"><LoadingSkeleton variant="card" /></div>
            </Card>
          ))}
        </div>
      ) : results.length === 0 ? (
        <Card className="p-12 text-center text-secondary">
          <Activity size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-xl font-semibold mb-2">目前無強烈量化訊號</p>
          <p>市場目前處於盤整或缺乏極端異動，稍後再試。</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map(stock => (
            <Link key={stock.symbol} href={`/stock/${stock.symbol}`}>
              <Card className="hover:scale-[1.02] transition-transform cursor-pointer border hover:border-accent group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold group-hover:text-accent transition-colors">{stock.symbol}</h3>
                    <p className="text-sm text-secondary">{stock.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">{formatNumber(stock.price, 2)}</div>
                    <div className={`text-sm ${getChangeColorClass(stock.change, stock.market)}`}>
                      {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.change_pct.toFixed(2)}%)
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mt-6 border-t border-[var(--border)] pt-4">
                  {stock.anomaly && stock.anomaly.type !== "NORMAL" && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle size={16} className={stock.anomaly.type === 'HIGH_SELL_PRESSURE' ? 'text-down-tw' : 'text-up-tw'} />
                      <span className="font-medium">量價異常: </span>
                      <span className="text-secondary">
                        {stock.anomaly.type === 'HIGH_SELL_PRESSURE' ? '高檔爆量 (留意賣壓)' : '低檔爆量 (支撐浮現)'}
                      </span>
                    </div>
                  )}
                  {stock.rsi && (stock.rsi > 70 || stock.rsi < 30) && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp size={16} className={stock.rsi > 70 ? 'text-down-tw' : 'text-up-tw'} />
                      <span className="font-medium">RSI 警示: </span>
                      <span className="text-secondary">
                        {stock.rsi.toFixed(1)} {stock.rsi > 70 ? '(超買區)' : '(超賣區)'}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
