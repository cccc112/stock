"use client";

import { useEffect, useRef, useState } from "react";
import { ColorType, createChart, HistogramSeries, type IChartApi, type Time } from "lightweight-charts";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

interface RevenueChartProps {
  symbol: string;
}

export default function RevenueChart({ symbol }: RevenueChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);

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

    const revenueSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: { type: 'volume' },
    });

    // Mock monthly revenue data
    const generateData = () => {
      const data = [];
      let time = new Date('2023-01-01').getTime();
      let revenue = 5000;

      for (let i = 0; i < 24; i++) {
        // approximate 1 month step
        time += 30 * 86400000; 
        const change = (Math.random() - 0.5) * 1000;
        revenue = Math.max(1000, revenue + change);

        data.push({
          time: (time / 1000) as Time,
          value: revenue,
          color: change > 0 ? '#ef4444' : '#22c55e', // TW color convention (red up, green down) - let's just use standard blue or up/down
        });
      }
      return data;
    };

    setTimeout(() => {
      revenueSeries.setData(generateData());
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
  }, [symbol]);

  return (
    <div className="relative w-full h-[300px]">
      {loading && <LoadingSkeleton variant="chart" className="absolute inset-0 z-10" />}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
