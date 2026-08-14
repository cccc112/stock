"use client";

import { useEffect, useRef, useState } from "react";
import { ColorType, createChart, CandlestickSeries, HistogramSeries, LineSeries, type IChartApi, type Time } from "lightweight-charts";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { apiStocks } from "@/lib/api";

interface CandlestickChartProps {
  symbol: string;
  market?: 'TW' | 'US';
  period?: string;
}

const calculateSMA = (data: any[], count: number) => {
  const result = [];
  for (let i = count - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < count; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / count });
  }
  return result;
};

export default function CandlestickChart({ symbol, market = 'TW', period = '6mo' }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState(period);
  const [tooltipData, setTooltipData] = useState<any>(null);

  const upColor = market === 'TW' ? '#ef4444' : '#22c55e';
  const downColor = market === 'TW' ? '#22c55e' : '#ef4444';

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 800,
      height: chartContainerRef.current.clientHeight || 398,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8b8f9a',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 63, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 63, 0.5)' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: 'rgba(42, 46, 63, 0.8)' },
      leftPriceScale: {
        visible: true,
        borderColor: 'rgba(42, 46, 63, 0.8)',
      },
      timeScale: { 
        borderColor: 'rgba(42, 46, 63, 0.8)', 
        timeVisible: activePeriod === '1d' || activePeriod === '5d',
        fixLeftEdge: true,
        fixRightEdge: true,
      },
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
      priceScaleId: 'left',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const maOptions = { lineWidth: 1 as const, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false };
    const ma5Series = chart.addSeries(LineSeries, { color: '#6366f1', title: '5MA', ...maOptions });
    const ma20Series = chart.addSeries(LineSeries, { color: '#f59e0b', title: '20MA', ...maOptions });
    const ma60Series = chart.addSeries(LineSeries, { color: '#10b981', title: '60MA', ...maOptions });

    chart.subscribeCrosshairMove((param) => {
      if (
        !param.time ||
        !param.point ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current!.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current!.clientHeight
      ) {
        setTooltipData(null);
        return;
      }
      
      const candleData: any = param.seriesData.get(mainSeries);
      const volData: any = param.seriesData.get(volumeSeries);
      
      if (candleData) {
        setTooltipData({
          time: param.time,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volData?.value || 0,
        });
      }
    });

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

        const isIntraday = activePeriod === '1d' || activePeriod === '5d';

        let candleData: any[] = [];
        let volumeData: any[] = [];

        if (isIntraday) {
          candleData = bars.map((bar: any) => ({
            time: Math.floor(new Date(bar.time).getTime() / 1000) as Time,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          }));
          volumeData = bars.map((bar: any) => ({
            time: Math.floor(new Date(bar.time).getTime() / 1000) as Time,
            value: bar.volume,
            color: bar.close >= bar.open ? upColor + '80' : downColor + '80',
          }));
        } else {
          const uniqueBars = new Map();
          bars.forEach((bar: any) => {
            const d = new Date(bar.time);
            const timeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            uniqueBars.set(timeStr, { ...bar, timeStr });
          });
          
          const sortedUniqueBars = Array.from(uniqueBars.values()).sort((a, b) => a.timeStr.localeCompare(b.timeStr));

          candleData = sortedUniqueBars.map((bar: any) => ({
            time: bar.timeStr as Time,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          }));

          volumeData = sortedUniqueBars.map((bar: any) => ({
            time: bar.timeStr as Time,
            value: bar.volume,
            color: bar.close >= bar.open ? upColor + '80' : downColor + '80',
          }));
        }

        mainSeries.setData(candleData);
        volumeSeries.setData(volumeData);
        
        if (candleData.length >= 5) ma5Series.setData(calculateSMA(candleData, 5));
        if (candleData.length >= 20) ma20Series.setData(calculateSMA(candleData, 20));
        if (candleData.length >= 60) ma60Series.setData(calculateSMA(candleData, 60));

        chart.timeScale().fitContent();
      } catch (e) {
        console.error("Failed to fetch history", e);
        setError("無法載入圖表資料");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleResize = (width: number, height: number) => {
      if (chartRef.current && width > 0 && height > 0) {
        chartRef.current.applyOptions({ width, height });
      }
    };

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || entries[0].target !== chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      handleResize(width, height);
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, market, activePeriod, upColor, downColor]);

  const periods = [
    { label: '日線', value: '1d' },
    { label: '5天', value: '5d' },
    { label: '1月', value: '1mo' },
    { label: '3月', value: '3mo' },
    { label: '6月', value: '6mo' },
    { label: '今年', value: 'ytd' },
    { label: '1年', value: '1y' },
    { label: '5年', value: '5y' },
  ];

  return (
    <div className="relative w-full">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => setActivePeriod(p.value)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              activePeriod === p.value
                ? 'bg-accent text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      
      <div className="relative h-[400px] border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)]/50 overflow-hidden shadow-inner">
        {/* Legends */}
        <div className="absolute top-3 left-4 z-10 flex flex-wrap gap-4 text-xs font-mono pointer-events-none">
          <div className="flex gap-2 items-center">
            <span className="w-2 h-2 rounded-full bg-[#6366f1]"></span> 5MA
          </div>
          <div className="flex gap-2 items-center">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> 20MA
          </div>
          <div className="flex gap-2 items-center">
            <span className="w-2 h-2 rounded-full bg-[#10b981]"></span> 60MA
          </div>
        </div>

        {/* Tooltip */}
        {tooltipData && (
          <div className="absolute top-10 left-4 z-20 bg-[var(--bg-tertiary)]/90 backdrop-blur border border-[var(--border)] p-2 rounded-md shadow-xl text-xs font-mono pointer-events-none transition-opacity">
            <div className="text-secondary mb-1">
              {typeof tooltipData.time === 'number' 
                ? new Date(tooltipData.time * 1000).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                : tooltipData.time}
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col">
                <span className="text-secondary">O</span>
                <span className={tooltipData.open > tooltipData.close ? 'text-down-tw' : 'text-up-tw'}>{tooltipData.open.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-secondary">H</span>
                <span className={tooltipData.high > tooltipData.open ? 'text-up-tw' : ''}>{tooltipData.high.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-secondary">L</span>
                <span className={tooltipData.low < tooltipData.open ? 'text-down-tw' : ''}>{tooltipData.low.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-secondary">C</span>
                <span className={tooltipData.close > tooltipData.open ? 'text-up-tw' : 'text-down-tw'}>{tooltipData.close.toFixed(2)}</span>
              </div>
              <div className="flex flex-col border-l border-[var(--border)] pl-3 ml-1">
                <span className="text-secondary">V</span>
                <span className="text-primary">{(tooltipData.volume / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </div>
        )}

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
