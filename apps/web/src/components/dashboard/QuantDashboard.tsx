"use client";

import { useState, useEffect } from "react";
import { apiQuant } from "@/lib/api";
import VAPChart from "@/components/charts/VAPChart";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import Badge from "@/components/ui/Badge";
import { formatNumber } from "@/lib/utils";

interface QuantDashboardProps {
  symbol: string;
  currentPrice: number;
}

export default function QuantDashboard({ symbol, currentPrice }: QuantDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuant = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiQuant.getAnalysis(symbol);
        setData(res.data);
      } catch (e) {
        console.error("Failed to fetch quant analysis", e);
        setError("無法取得量化分析資料，可能尚無足夠歷史數據。");
      } finally {
        setLoading(false);
      }
    };

    fetchQuant();
  }, [symbol]);

  if (loading) {
    return (
      <div className="p-4 grid grid-cols-2 gap-6">
        <div><LoadingSkeleton variant="chart" /></div>
        <div className="space-y-4"><LoadingSkeleton variant="text" /><LoadingSkeleton variant="card" /></div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-8 text-center text-secondary">{error}</div>;
  }

  const { vap, volume_anomaly, support_resistance, indicators, strategies } = data;

  return (
    <div className="flex flex-col gap-6 pt-2">
      {/* 策略訊號 Section */}
      <div>
        <h3 className="font-semibold mb-4 text-lg">策略訊號</h3>
        {strategies && strategies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((sig: any, i: number) => {
              const isBuy = sig.direction === 'BUY';
              const isSell = sig.direction === 'SELL';
              const borderClass = isBuy ? 'border-up-tw' : isSell ? 'border-down-tw' : 'border-[var(--bg-tertiary)]';
              const textClass = isBuy ? 'text-up-tw' : isSell ? 'text-down-tw' : 'text-secondary';
              
              return (
                <div key={i} className={`p-4 bg-[var(--bg-tertiary)] border-l-4 rounded-md shadow-sm ${borderClass}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{sig.strategy}</span>
                    <span 
                      className={`px-2 py-1 text-xs rounded-md ${isBuy ? 'bg-up-tw/20 text-up-tw' : isSell ? 'bg-down-tw/20 text-down-tw' : 'bg-secondary/20 text-secondary'}`}
                    >
                      {sig.direction === 'BUY' ? '買進' : sig.direction === 'SELL' ? '賣出' : '中立'}
                    </span>
                  </div>
                  <p className="text-sm text-primary mb-3">{sig.description}</p>
                  <div className="text-xs text-secondary flex justify-between">
                    <span>信心度: {(sig.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-secondary bg-[var(--bg-tertiary)] p-4 rounded-md text-center">
            目前無觸發訊號
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: VAP & Anomaly */}
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-4 text-lg">價量分佈 (VAP)</h3>
          <VAPChart data={vap} currentPrice={currentPrice} />
        </div>

        {volume_anomaly?.type !== "NORMAL" && (
          <div className="bg-warning/10 border border-warning/30 p-4 rounded-lg">
            <h4 className="text-warning font-semibold mb-1">⚠️ 異常量價偵測</h4>
            <p className="text-sm">
              {volume_anomaly.type === "HIGH_SELL_PRESSURE" && "高檔爆量：近期來到波段高點且成交量異常放大，留意倒貨風險。"}
              {volume_anomaly.type === "LOW_BUY_SUPPORT" && "低檔爆量：近期來到波段低點且成交量放大，可能為底部換手或支撐浮現。"}
            </p>
            <div className="text-xs text-secondary mt-2">
              信心指數: {(volume_anomaly.confidence * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Indicators & Support/Resistance */}
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold mb-4 text-lg">關鍵價位雷達</h3>
          <div className="space-y-2">
            {support_resistance?.length > 0 ? (
              support_resistance
                .sort((a: any, b: any) => b.price - a.price)
                .map((level: any, i: number) => {
                  const isResistance = level.type === "RESISTANCE";
                  const dist = ((level.price - currentPrice) / currentPrice) * 100;
                  return (
                    <div key={i} className="flex justify-between items-center p-3 bg-[var(--bg-tertiary)] rounded-md">
                      <div className="flex items-center gap-2">
                        <span className={isResistance ? "text-down-tw" : "text-up-tw"}>
                          {isResistance ? "壓力區" : "支撐區"}
                        </span>
                        <span className="font-medium">{formatNumber(level.price, 2)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-secondary">
                          距離 {dist > 0 ? "+" : ""}{dist.toFixed(1)}%
                        </span>
                        <Badge value={level.strength} isPercent={false} size="sm" className="bg-accent/20 text-accent">
                          強度 {level.strength}
                        </Badge>
                      </div>
                    </div>
                  );
                })
            ) : (
              <div className="text-sm text-secondary">目前無明顯支撐壓力位</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-4 text-lg">技術指標</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--bg-tertiary)] p-4 rounded-md">
              <div className="text-secondary text-sm mb-1">RSI (14)</div>
              <div className={`text-xl font-semibold ${indicators?.RSI > 70 ? 'text-down-tw' : indicators?.RSI < 30 ? 'text-up-tw' : ''}`}>
                {indicators?.RSI ? indicators.RSI.toFixed(1) : '-'}
              </div>
              <div className="text-xs text-secondary mt-1">
                {indicators?.RSI > 70 ? '超買區 (過熱)' : indicators?.RSI < 30 ? '超賣區 (過冷)' : '中性區間'}
              </div>
            </div>

            <div className="bg-[var(--bg-tertiary)] p-4 rounded-md">
              <div className="text-secondary text-sm mb-1">MACD</div>
              <div className="text-xl font-semibold">
                {indicators?.MACD?.histogram > 0 ? (
                  <span className="text-up-tw">偏多</span>
                ) : (
                  <span className="text-down-tw">偏空</span>
                )}
              </div>
              <div className="text-xs text-secondary mt-1">
                柱狀體: {indicators?.MACD?.histogram?.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-[var(--bg-tertiary)] p-4 rounded-md col-span-2">
              <div className="text-secondary text-sm mb-2">移動平均線 (MA)</div>
              <div className="grid grid-cols-4 gap-2 text-sm text-center">
                <div>
                  <div className="text-secondary text-xs">5MA</div>
                  <div className={currentPrice > indicators?.MA?.MA5 ? 'text-up-tw' : 'text-down-tw'}>
                    {indicators?.MA?.MA5?.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-secondary text-xs">20MA</div>
                  <div className={currentPrice > indicators?.MA?.MA20 ? 'text-up-tw' : 'text-down-tw'}>
                    {indicators?.MA?.MA20?.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-secondary text-xs">60MA</div>
                  <div className={currentPrice > indicators?.MA?.MA60 ? 'text-up-tw' : 'text-down-tw'}>
                    {indicators?.MA?.MA60?.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-secondary text-xs">120MA</div>
                  <div className={currentPrice > indicators?.MA?.MA120 ? 'text-up-tw' : 'text-down-tw'}>
                    {indicators?.MA?.MA120?.toFixed(1) ?? '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
