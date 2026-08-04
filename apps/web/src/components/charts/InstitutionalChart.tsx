"use client";

import { useEffect, useRef, useState } from "react";
import { ColorType, createChart, HistogramSeries, type IChartApi, type Time } from "lightweight-charts";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

interface InstitutionalChartProps {
  symbol: string;
  market?: 'TW' | 'US';
}

export default function InstitutionalChart({ symbol, market = 'TW' }: InstitutionalChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);

  const upColor = market === 'TW' ? '#ef4444' : '#22c55e';
  const downColor = market === 'TW' ? '#22c55e' : '#ef4444';

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#8b8f9a',
      },
      grid: {
        vertLines: { color: '#2a2e3f' },
        horzLines: { color: '#2a2e3f' },
      },
      rightPriceScale: {
        borderColor: '#2a2e3f',
      },
      timeScale: {
        borderColor: '#2a2e3f',
        timeVisible: true,
      },
    });
    
    chartRef.current = chart;

    const netBuySeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
    });

    // Mock net buy/sell data
    const generateData = () => {
      const data = [];
      let time = new Date('2023-01-01').getTime();

      for (let i = 0; i < 60; i++) {
        time += 86400000; 
        const netBuy = (Math.random() - 0.5) * 5000; // positive or negative

        data.push({
          time: (time / 1000) as Time,
          value: netBuy,
          color: netBuy > 0 ? upColor : downColor, 
        });
      }
      return data;
    };

    setTimeout(() => {
      netBuySeries.setData(generateData());
      chart.timeScale().fitContent();
      setLoading(false);
    }, 500);

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
      chart.remove();
    };
  }, [symbol, market, upColor, downColor]);

  return (
    <div className="relative w-full h-[300px]">
      {loading && <LoadingSkeleton variant="chart" className="absolute inset-0 z-10" />}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
