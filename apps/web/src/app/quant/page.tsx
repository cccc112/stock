"use client";

import { useEffect, useState, useCallback } from "react";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { formatNumber, getChangeColorClass } from "@/lib/utils";
import { apiMarket, apiQuant, apiWatchlist } from "@/lib/api";
import { Activity, AlertTriangle, Play, Settings } from "lucide-react";
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
  strategies?: any[];
}

export default function QuantScreenerPage() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('全部');
  const [source, setSource] = useState<'trending' | 'watchlist' | 'custom'>('trending');
  const [customSymbols, setCustomSymbols] = useState('');
  const [showParams, setShowParams] = useState(false);
  const [params, setParams] = useState({
    ma_short: 5, ma_mid: 20, ma_long: 60,
    macd_fast: 12, macd_slow: 26, macd_signal: 9,
    boll_period: 20, boll_std: 2,
    kdj_n: 9, vol_ma: 50
  });

  const TABS = [
    { label: '全部', value: 'all' },
    { label: '量價異動', value: 'volume_anomaly' },
    { label: '均線交叉', value: 'golden_death_cross' },
    { label: 'MACD背離', value: 'macd_divergence' },
    { label: '布林擠壓', value: 'bollinger_squeeze' },
    { label: 'KDJ交叉', value: 'kdj_cross' },
    { label: '爆量突破', value: 'volume_breakout' }
  ];

  const runScan = useCallback(async () => {
    setLoading(true);
    try {
      let targetUniverse: any[] = [];
      let targetSymbols: string[] = [];

      if (source === 'trending') {
        const [trendingRes, etfRes] = await Promise.all([
          apiMarket.getTrending(),
          apiMarket.getPopularETFs()
        ]);
        const universe = [...(trendingRes.data || []), ...(etfRes.data || [])];
        targetUniverse = Array.from(new Map(universe.map((item: any) => [item.symbol, item])).values()).slice(0, 20);
        targetSymbols = targetUniverse.map(t => t.symbol);
      } else if (source === 'watchlist') {
        const watchlistRes = await apiWatchlist.getWatchlist();
        const universe = watchlistRes.data || [];
        targetUniverse = universe.map((item: any) => ({ symbol: item.symbol, name: item.name || item.symbol, price: 0, change: 0, change_pct: 0, market: 'TW' }));
        targetSymbols = targetUniverse.map(t => t.symbol);
      } else if (source === 'custom') {
        targetSymbols = customSymbols.split(',').map(s => s.trim()).filter(s => s);
        targetUniverse = targetSymbols.map(symbol => ({ symbol, name: symbol, price: 0, change: 0, change_pct: 0, market: 'TW' }));
      }

      if (targetSymbols.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      const currentTab = TABS.find(t => t.label === activeTab);
      const strategy = currentTab ? currentTab.value : '';

      let screenMatchedSymbols: string[] = [];
      if (activeTab !== '全部') {
        const screenRes = await apiQuant.screenStocks({ strategies: strategy, symbols: targetSymbols, params });
        screenMatchedSymbols = (screenRes.data || []).map((item: any) => typeof item === 'string' ? item : item.symbol);
      } else {
        screenMatchedSymbols = targetSymbols;
      }

      if (activeTab !== '全部') {
        targetUniverse = targetUniverse.filter(t => screenMatchedSymbols.includes(t.symbol));
      }

      const symbolsToScan = targetUniverse.slice(0, 30);
      
      const scanPromises = symbolsToScan.map(async (stock: any) => {
        try {
          const analysis = await apiQuant.getAnalysis(stock.symbol);
          const strategies = analysis.data.strategies || [];
          
          return {
            ...stock,
            price: stock.price || analysis.data.current_price || 0,
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
      let validResults = scanResults.filter(r => r !== null) as ScanResult[];
      
      if (activeTab === '全部') {
        validResults = validResults.filter(r => 
          (r?.anomaly?.type !== "NORMAL") || 
          (r?.rsi && (r.rsi > 70 || r.rsi < 30)) ||
          (r?.strategies && r.strategies.length > 0)
        );
      }
      
      setResults(validResults);
    } catch (error) {
      console.error("Scan failed", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, source, customSymbols, params]);

  useEffect(() => {
    if (source !== 'custom') {
      runScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, source]);

  const twStocks = results.filter(r => r.market === 'TW');
  const usStocks = results.filter(r => r.market === 'US');

  const renderStockCard = (stock: ScanResult) => (
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
          {stock.strategies && stock.strategies.length > 0 && (
            <div className="flex flex-col gap-2">
              {stock.strategies.map((sig: any, idx: number) => (
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
  );

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl mx-auto mt-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Activity className="text-accent" size={32} />
          量化訊號掃描儀
        </h1>
        <p className="text-secondary">每日自動掃描台美股熱門標的，透過量價與技術指標捕捉交易機會</p>
      </header>

      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-secondary font-medium">掃描範圍:</span>
            <select 
              value={source} 
              onChange={e => setSource(e.target.value as 'trending' | 'watchlist' | 'custom')}
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-3 py-1.5 text-primary"
            >
              <option value="trending">🔥 熱門標的</option>
              <option value="watchlist">⭐ 我的自選股</option>
              <option value="custom">✏️ 自訂代碼</option>
            </select>
          </div>
          
          {source === 'custom' && (
            <div className="flex-1">
              <input 
                type="text" 
                value={customSymbols}
                onChange={e => setCustomSymbols(e.target.value)}
                placeholder="輸入代碼，以逗號分隔 (例: AAPL, TSLA, 2330)"
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-3 py-1.5 text-primary outline-none focus:border-accent"
              />
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button 
              onClick={() => setShowParams(!showParams)}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-secondary transition-colors"
            >
              <Settings size={16} />
              參數設定
            </button>
            <button 
              onClick={runScan}
              className="flex items-center gap-1 px-4 py-1.5 rounded bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
            >
              <Play size={16} fill="currentColor" />
              執行掃描
            </button>
          </div>
        </div>

        {showParams && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(params).map(([key, val]) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs text-secondary">{key}</label>
                <input 
                  type="number" 
                  value={val}
                  onChange={e => setParams({...params, [key]: Number(e.target.value)})}
                  className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded px-2 py-1 text-sm text-primary w-full outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        )}
      </Card>

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
        <div className="space-y-8">
          {twStocks.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4">🇹🇼 台股 (TW)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {twStocks.map(renderStockCard)}
              </div>
            </div>
          )}
          {usStocks.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4">🇺🇸 美股 (US)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {usStocks.map(renderStockCard)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

