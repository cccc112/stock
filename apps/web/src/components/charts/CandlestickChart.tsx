"use client";

import { useEffect, useRef, useState } from "react";
import { ColorType, createChart, CandlestickSeries, HistogramSeries, type IChartApi, type Time } from "lightweight-charts";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { apiStocks } from "@/lib/api";

interface CandlestickChartProps {
  symbol: string;
  market?: 'TW' | 'US';
  period?: string;
}

export default function CandlestickChart({ symbol, market = 'TW', period = '3mo' }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState(period);

  const upColor = market === 'TW' ? '#ef4444' : '#22c55e';
  const downColor = market === 'TW' ? '#22c55e' : '#ef4444';

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#8b8f9a',
      },
      grid: {
        vertLines: { color: '#2a2e3f' },
        horzLines: { color: '#2a2e3f' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#2a2e3f' },
      timeScale: { borderColor: '#2a2e3f', timeVisible: false },
    });

    chartRef.current = chart;

    const mainSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    // Fetch real data
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiStocks.getHistory(symbol, activePeriod);
        const bars = Array.isArray(res.data) ? res.data : [];

        if (bars.length === 0) {
          setError("暫無歷史資料");
          setLoading(false);
          return;
        }

        const candleData = bars.map((bar: any) => {
          // Parse time to YYYY-MM-DD string for lightweight-charts
          const d = new Date(bar.time);
          const timeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return {
            time: timeStr as Time,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          };
        });

        const volumeData = bars.map((bar: any) => {
          const d = new Date(bar.time);
          const timeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const isUp = bar.close >= bar.open;
          return {
            time: timeStr as Time,
            value: bar.volume,
            color: isUp ? upColor + '80' : downColor + '80',
          };
        });

        mainSeries.setData(candleData);
        volumeSeries.setData(volumeData);
        chart.timeScale().fitContent();
      } catch (e) {
        console.error("Failed to fetch history", e);
        setError("無法載入圖表資料");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, market, activePeriod, upColor, downColor]);

  const periods = [
    { label: '1月', value: '1mo' },
    { label: '3月', value: '3mo' },
    { label: '6月', value: '6mo' },
    { label: '1年', value: '1y' },
    { label: '5年', value: '5y' },
  ];

  return (
    <div className="relative w-full">
      <div className="flex gap-2 mb-4">
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => setActivePeriod(p.value)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activePeriod === p.value
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="relative h-[400px]">
        {loading && <LoadingSkeleton variant="chart" className="absolute inset-0 z-10" />}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 text-secondary">
            {error}
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
