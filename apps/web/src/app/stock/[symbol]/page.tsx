"use client";

import { useState } from "react";
import dynamic from 'next/dynamic';
import Tabs from "@/components/ui/Tabs";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import VAPChart from "@/components/charts/VAPChart";
import { formatNumber, getChangeColorClass } from "@/lib/utils";
import { Sparkles } from "lucide-react";

// Dynamically import lightweight-charts component to avoid SSR issues
const CandlestickChart = dynamic(() => import('@/components/charts/CandlestickChart'), { ssr: false });
const RevenueChart = dynamic(() => import('@/components/charts/RevenueChart'), { ssr: false });
const InstitutionalChart = dynamic(() => import('@/components/charts/InstitutionalChart'), { ssr: false });

// Mock data
const mockVAP = [
  { price: 900, volume: 1200 },
  { price: 910, volume: 2500 },
  { price: 920, volume: 8000, isPeak: true },
  { price: 930, volume: 4500 },
  { price: 940, volume: 3000 },
  { price: 950, volume: 9500, isPeak: true },
  { price: 960, volume: 2000 },
];

export default function StockDetailPage({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const isTW = /^\d+$/.test(symbol);
  const market = isTW ? 'TW' : 'US';
  
  // Mock current info
  const currentPrice = isTW ? 950 : 150.25;
  const change = isTW ? 15 : 2.5;
  const changePercent = isTW ? 1.6 : 1.69;

  return (
    <div className="animate-fade-in flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold">{symbol}</h1>
            <span className="text-xl text-secondary">{isTW ? '台積電' : 'Sample Corp'}</span>
            <Badge value={0} className="bg-[var(--bg-tertiary)] text-primary">{market}</Badge>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold">{formatNumber(currentPrice, isTW ? 0 : 2)}</span>
            <span className={`text-xl font-medium ${getChangeColorClass(change, market)}`}>
              {change > 0 ? '+' : ''}{change} ({change > 0 ? '+' : ''}{changePercent}%)
            </span>
          </div>
        </div>
        <div>
          <Button variant="secondary" className="mr-2">+ 加自選</Button>
          <Button>模擬交易</Button>
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
                      <div className="flex gap-2 mb-4">
                        {['1M', '3M', '6M', '1Y', '5Y'].map(p => (
                          <button key={p} className="px-3 py-1 text-xs rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--border)] transition-colors">
                            {p}
                          </button>
                        ))}
                      </div>
                      <CandlestickChart symbol={symbol} market={market} />
                    </div>
                  )
                },
                {
                  id: 'quant',
                  label: '量化分析',
                  content: (
                    <div className="grid grid-cols-2 gap-6 pt-2">
                      <div>
                        <h3 className="font-semibold mb-4">價量分佈 (VAP)</h3>
                        <VAPChart data={mockVAP} currentPrice={currentPrice} />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-4">技術指標</h3>
                        <div className="space-y-4">
                          <div className="flex justify-between p-3 bg-[var(--bg-tertiary)] rounded-md">
                            <span className="text-secondary">RSI (14)</span>
                            <span className="font-medium text-warning">65.4</span>
                          </div>
                          <div className="flex justify-between p-3 bg-[var(--bg-tertiary)] rounded-md">
                            <span className="text-secondary">MACD</span>
                            <span className="font-medium text-up-tw">黃金交叉</span>
                          </div>
                          <div className="flex justify-between p-3 bg-[var(--bg-tertiary)] rounded-md">
                            <span className="text-secondary">外資動向</span>
                            <span className="font-medium text-up-tw">連 3 買</span>
                          </div>
                          <Badge value={1} isPercent={false} size="lg" className="w-full mt-4 bg-accent-light text-accent border border-accent/30 py-2">
                            發現量價異常！(成交量放大 3 倍)
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
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
                        <p>根據最新的技術面與籌碼面分析：</p>
                        <ul>
                          <li><strong>技術面：</strong> 股價突破前波高點，均線呈多頭排列。目前 RSI 尚未進入超買區，動能持續。</li>
                          <li><strong>籌碼面：</strong> 法人籌碼持續集中，外資與投信同步站在買方。</li>
                          <li><strong>總結：</strong> 短期偏多看待，建議回測 5 日線可作為加碼點。停損設於月線。</li>
                        </ul>
                      </div>
                    </div>
                  )
                },
                {
                  id: 'revenue',
                  label: '營收表現',
                  content: (
                    <div className="pt-2">
                      <h3 className="font-semibold mb-4">每月營收與年增率</h3>
                      <RevenueChart symbol={symbol} />
                    </div>
                  )
                },
                {
                  id: 'institutional',
                  label: '籌碼分析',
                  content: (
                    <div className="pt-2">
                      <h3 className="font-semibold mb-4">三大法人買賣超</h3>
                      <InstitutionalChart symbol={symbol} market={market} />
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card title="五檔報價" className="h-[300px]">
            <div className="flex flex-col h-full text-sm">
              <div className="flex-1 flex flex-col justify-end text-down-tw">
                <div className="flex justify-between py-1"><span className="text-secondary">賣5</span><span>955</span><span>120</span></div>
                <div className="flex justify-between py-1"><span className="text-secondary">賣4</span><span>954</span><span>85</span></div>
                <div className="flex justify-between py-1"><span className="text-secondary">賣3</span><span>953</span><span>234</span></div>
                <div className="flex justify-between py-1"><span className="text-secondary">賣2</span><span>952</span><span>156</span></div>
                <div className="flex justify-between py-1 border-b border-[var(--border)] pb-2"><span className="text-secondary">賣1</span><span>951</span><span>45</span></div>
              </div>
              <div className="flex-1 flex flex-col pt-2 text-up-tw">
                <div className="flex justify-between py-1"><span className="text-secondary">買1</span><span>950</span><span>342</span></div>
                <div className="flex justify-between py-1"><span className="text-secondary">買2</span><span>949</span><span>156</span></div>
                <div className="flex justify-between py-1"><span className="text-secondary">買3</span><span>948</span><span>890</span></div>
                <div className="flex justify-between py-1"><span className="text-secondary">買4</span><span>947</span><span>120</span></div>
                <div className="flex justify-between py-1"><span className="text-secondary">買5</span><span>946</span><span>55</span></div>
              </div>
            </div>
          </Card>
          
          <Card title="基本資料">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-secondary">開盤</span><span>945</span></div>
              <div className="flex justify-between"><span className="text-secondary">最高</span><span>955</span></div>
              <div className="flex justify-between"><span className="text-secondary">最低</span><span>940</span></div>
              <div className="flex justify-between"><span className="text-secondary">昨收</span><span>935</span></div>
              <div className="flex justify-between"><span className="text-secondary">總量</span><span>34,500</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
