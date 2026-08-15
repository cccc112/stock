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
  const [activeTab, setActiveTab] = useState('全部');

  const TABS = [
    { label: '全部', value: 'all' },
    { label: '量價異動', value: 'volume_anomaly' },
    { label: '均線交叉', value: 'golden_death_cross' },
    { label: 'MACD背離', value: 'macd_divergence' },
    { label: '布林擠壓', value: 'bollinger_squeeze' },
    { label: 'KDJ交叉', value: 'kdj_cross' },
    { label: '爆量突破', value: 'volume_breakout' }
  ];

  useEffect(() => {
    const runScan = async () => {
      setLoading(true);
      try {
        let targetUniverse = [];
        if (activeTab === '全部' || activeTab === 'all') {
          const [trendingRes, etfRes] = await Promise.all([
            apiMarket.getTrending(),
            apiMarket.getPopularETFs()
          ]);
          const universe = [...(trendingRes.data || []), ...(etfRes.data || [])];
          targetUniverse = Array.from(new Map(universe.map(item => [item.symbol, item])).values()).slice(0, 10);
        } else {
          // Find the active tab value
          const currentTab = TABS.find(t => t.label === activeTab);
          const strategy = currentTab ? currentTab.value : '';
          const screenRes = await apiQuant.screenStocks(strategy);
          // screenRes.data could be a list of symbols or stocks
          const screenData = screenRes.data || [];
          // If the backend returns just strings, we map to objects. Let's assume it returns {symbol, name, ...} or string
          targetUniverse = screenData.map((item: any) => typeof item === 'string' ? { symbol: item, name: item, price: 0, change: 0, change_pct: 0, market: 'TW' } : item);
          if (targetUniverse.length === 0) {
            // fallback if empty
          }
        }

        const scanPromises = targetUniverse.map(async (stock: any) => {
          try {
            const analysis = await apiQuant.getAnalysis(stock.symbol);
            const strategies = analysis.data.strategies || [];
            
            // Check if it matches active tab strategy
            const currentTabValue = TABS.find(t => t.label === activeTab)?.value;
            if (activeTab !== '全部') {
              const hasSignal = strategies.some((s: any) => s.strategy === currentTabValue);
              // Also check for anomaly if tab is volume_anomaly
              const isAnomaly = currentTabValue === 'volume_anomaly' && analysis.data.volume_anomaly?.type !== 'NORMAL';
              if (!hasSignal && !isAnomaly) return null;
            }

            return {
              ...stock,
              price: stock.price || analysis.data.current_price || 0, // Fallback if API returned only symbol
              change: stock.change || 0,
              change_pct: stock.change_pct || 0,
              market: stock.market || 'TW',
              anomaly: analysis.data.volume_anomaly,
              rsi: analysis.data.indicators?.RSI,
              strategies: strategies
            };
          } catch (e) {
            return null;
          }
        });
        
        const scanResults = await Promise.all(scanPromises);
        let validResults = scanResults.filter(r => r !== null);
        
        if (activeTab === '全部') {
          validResults = validResults.filter(r => 
            (r?.anomaly?.type !== "NORMAL") || 
            (r?.rsi && (r.rsi > 70 || r.rsi < 30)) ||
            (r?.strategies && r.strategies.length > 0)
          );
        }
        
        setResults(validResults as ScanResult[]);
      } catch (error) {
        console.error("Scan failed", error);
      } finally {
        setLoading(false);
      }
    };
    
    runScan();
  }, [activeTab]);

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl mx-auto mt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Activity className="text-accent" size={32} />
          量化訊號掃描儀
        </h1>
        <p className="text-secondary">每日自動掃描台美股熱門標的，透過量價與技術指標捕捉交易機會</p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.label)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.label
                ? 'bg-accent text-white'
                : 'bg-[var(--bg-tertiary)] text-secondary hover:text-primary hover:bg-[var(--border)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
                  {(stock as any).strategies && (stock as any).strategies.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {(stock as any).strategies.map((sig: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm bg-[var(--bg-tertiary)] p-2 rounded">
                          <span className={`px-2 py-0.5 rounded text-xs ${sig.direction === 'BUY' ? 'bg-up-tw/20 text-up-tw' : sig.direction === 'SELL' ? 'bg-down-tw/20 text-down-tw' : 'bg-secondary/20 text-secondary'}`}>
                            {sig.direction === 'BUY' ? '買' : sig.direction === 'SELL' ? '賣' : '平'}
                          </span>
                          <span className="font-medium text-primary">{sig.strategy}</span>
                          <span className="text-secondary text-xs truncate ml-auto">{sig.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {stock.anomaly && stock.anomaly.type !== "NORMAL" && (
                    <div className="flex items-center gap-2 text-sm bg-[var(--bg-tertiary)] p-2 rounded">
                      <AlertTriangle size={16} className={stock.anomaly.type === 'HIGH_SELL_PRESSURE' ? 'text-down-tw' : 'text-up-tw'} />
                      <span className="font-medium text-primary">量價異常</span>
                      <span className="text-secondary text-xs ml-auto">
                        {stock.anomaly.type === 'HIGH_SELL_PRESSURE' ? '高檔爆量 (留意賣壓)' : '低檔爆量 (支撐浮現)'}
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
