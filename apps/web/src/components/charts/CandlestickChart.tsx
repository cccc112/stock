"use client";

import { useEffect, useRef, useState } from "react";
import { ColorType, createChart, CandlestickSeries, HistogramSeries, type IChartApi, type Time } from "lightweight-charts";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";

interface CandlestickChartProps {
  symbol: string;
  market?: 'TW' | 'US';
  period?: string;
}

export default function CandlestickChart({ symbol, market = 'TW', period = '3mo' }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);

  // Colors based on market
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
      crosshair: {
        mode: 1, // Normal mode
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

    const mainSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Set as overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // leave top 80% for price
        bottom: 0,
      },
    });

    // Mock data generation
    const generateData = () => {
      const data = [];
      const volumeData = [];
      let time = new Date('2023-01-01').getTime();
      let price = 100;

      for (let i = 0; i < 100; i++) {
        time += 86400000; // 1 day
        const change = (Math.random() - 0.5) * 5;
        const open = price + (Math.random() - 0.5) * 2;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * 2;
        const low = Math.min(open, close) - Math.random() * 2;
        const volume = Math.floor(Math.random() * 10000);
        const isUp = close >= open;

        data.push({
          time: (time / 1000) as Time,
          open,
          high,
          low,
          close,
        });

        volumeData.push({
          time: (time / 1000) as Time,
          value: volume,
          color: isUp ? upColor + '80' : downColor + '80', // Add transparency
        });

        price = close;
      }
      return { data, volumeData };
    };

    setTimeout(() => {
      const { data, volumeData } = generateData();
      mainSeries.setData(data);
      volumeSeries.setData(volumeData);
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
  }, [symbol, market, period, upColor, downColor]);

  return (
    <div className="relative w-full h-[400px]">
      {loading && <LoadingSkeleton variant="chart" className="absolute inset-0 z-10" />}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
