"use client";

import { useState, useEffect, use } from "react";
import dynamic from 'next/dynamic';
import Tabs from "@/components/ui/Tabs";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { Sparkles, Plus, Check } from "lucide-react";
import { apiStocks } from "@/lib/api";
import QuantDashboard from "@/components/dashboard/QuantDashboard";

const CandlestickChart = dynamic(() => import('@/components/charts/CandlestickChart'), { ssr: false });

const STORAGE_KEY = 'watchlist_symbols';

function getStoredSymbols(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function addToWatchlist(symbol: string) {
  const list = getStoredSymbols();
  if (!list.includes(symbol)) {
    list.push(symbol);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

function removeFromWatchlist(symbol: string) {
  const list = getStoredSymbols().filter(s => s !== symbol);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  prev_close: number;
  market: 'TW' | 'US';
}

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawSymbol } = use(params);
  const symbol = decodeURIComponent(rawSymbol);

  const [stock, setStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);

  useEffect(() => {
    setInWatchlist(getStoredSymbols().includes(symbol));

    const fetchQuote = async () => {
      try {
        const res = await apiStocks.getQuote(symbol);
        setStock(res.data);
      } catch (e) {
        console.error("Failed to fetch quote", e);
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
    const timer = setInterval(fetchQuote, 30000);
    return () => clearInterval(timer);
  }, [symbol]);

  const toggleWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist(symbol);
      setInWatchlist(false);
    } else {
      addToWatchlist(symbol);
      setInWatchlist(true);
    }
  };

  const market = stock?.market ?? (symbol.match(/^\d/) ? 'TW' : 'US');

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <div className="text-secondary">載入中...</div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <div className="text-secondary">找不到此股票：{symbol}</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{stock.symbol}</h1>
            <span className="text-xl text-secondary">{stock.name}</span>
            <span className="text-xs px-2 py-1 rounded-md bg-[var(--bg-tertiary)] text-primary">{market}</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold">{formatNumber(stock.price, market === 'TW' ? 0 : 2)}</span>
            <span className={`text-xl font-medium ${getChangeColorClass(stock.change, market)}`}>
              {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.change_pct > 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={inWatchlist ? "secondary" : "primary"} 
            onClick={toggleWatchlist}
          >
            {inWatchlist ? <Check size={16} className="mr-1" /> : <Plus size={16} className="mr-1" />}
            {inWatchlist ? '已加自選' : '加自選'}
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
        {/* Main Content Area */}
        <div className="lg:col-span-3 h-full">
          <Card className="h-full">
            <Tabs 
              tabs={[
                {
                  id: 'kline',
                  label: 'K線圖',
                  content: (
                    <div className="pt-2">
                      <CandlestickChart symbol={symbol} market={market} />
                    </div>
                  )
                },
                {
                  id: 'quant',
                  label: '量化分析',
                  content: <QuantDashboard symbol={symbol} currentPrice={stock.price} />
                },
                {
                  id: 'ai',
                  label: 'AI 診斷',
                  content: (
                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 text-accent font-semibold">
                          <Sparkles size={20} /> AI 深度解析
                        </div>
                        <Button size="sm"><Sparkles size={14} className="mr-2"/> 重新生成</Button>
                      </div>
                      <div className="prose prose-invert max-w-none text-sm bg-[var(--bg-tertiary)] p-6 rounded-lg">
                        <p>AI 分析功能開發中，敬請期待。</p>
                      </div>
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card title="基本資料">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-secondary">開盤</span><span>{formatNumber(stock.open, market === 'TW' ? 0 : 2)}</span></div>
              <div className="flex justify-between"><span className="text-secondary">最高</span><span>{formatNumber(stock.high, market === 'TW' ? 0 : 2)}</span></div>
              <div className="flex justify-between"><span className="text-secondary">最低</span><span>{formatNumber(stock.low, market === 'TW' ? 0 : 2)}</span></div>
              <div className="flex justify-between"><span className="text-secondary">昨收</span><span>{formatNumber(stock.prev_close, market === 'TW' ? 0 : 2)}</span></div>
              <div className="flex justify-between"><span className="text-secondary">成交量</span><span>{formatVolume(stock.volume)}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
