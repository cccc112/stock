"use client";

import { useEffect, useRef, useState } from "react";
import { ColorType, createChart, CandlestickSeries, HistogramSeries, LineSeries, PriceLineSource, type IChartApi, type ISeriesApi, type SeriesType, type Time } from "lightweight-charts";
import { DrawingLayer, DrawingToolbar, useDrawings, type BarInfo } from "@/components/charts/ChartDrawings";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { apiStocks } from "@/lib/api";
import { InfoTip } from "@/components/ui/TermTooltip";

interface CandlestickChartProps {
  symbol: string;
  market?: 'TW' | 'US';
  period?: string;
  priceLines?: { price: number; color: string; title: string }[];
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

/**
 * 原生計算 K 線「上趨勢壓力線 (Upper Resistance)」與「下趨勢支撐線 (Lower Support)」：
 * 1. 先對近期主趨勢區間計算典型價格 (H+L+C)/3 的最小平方法線性回歸 (OLS) 取得基準趨勢斜率 b_reg。
 * 2. 將每根 K 棒的高低點扣除基準趨勢 (去趨勢化 Detrending)，分別在前半段與後半段找出最具代表性的波段高點 (Peak 1, Peak 2) 與波段低點 (Trough 1, Trough 2)。
 * 3. 結合雙波峰/雙波谷斜率與回歸斜率進行平滑約束，杜絕單根異常長影線造成斜率亂飛。
 * 4. 嚴格以所有 K 棒實體上緣/下緣為邊界校準截距，保證上下趨勢線 100% 貼合波段高低點且絕不穿刺任何 K 棒實體，直接以 lightweight-charts 原生 LineSeries 繪製。
 */
const calculateAutoTrendChannel = (candleData: any[]) => {
  if (!candleData || candleData.length < 10) {
    return { upperData: [], lowerData: [] };
  }
  const n = candleData.length;
  const winLen = Math.min(n, Math.max(24, Math.min(85, Math.floor(n * 0.72))));
  const win = candleData.slice(n - winLen);
  const m = win.length;

  let sumX = 0;
  let sumY = 0;
  let maxH = -Infinity;
  let minL = Infinity;
  for (let k = 0; k < m; k++) {
    const tp = (win[k].high + win[k].low + win[k].close) / 3;
    sumX += k;
    sumY += tp;
    if (win[k].high > maxH) maxH = win[k].high;
    if (win[k].low < minL) minL = win[k].low;
  }
  const meanX = sumX / m;
  const meanY = sumY / m;

  let num = 0;
  let den = 0;
  for (let k = 0; k < m; k++) {
    const tp = (win[k].high + win[k].low + win[k].close) / 3;
    num += (k - meanX) * (tp - meanY);
    den += (k - meanX) * (k - meanX);
  }
  const regSlope = den > 0 ? num / den : 0;
  const priceRange = Math.max(maxH - minL, meanY * 0.03, 0.01);

  const leftEnd = Math.max(2, Math.floor(m * 0.45));
  const rightStart = Math.min(m - 2, Math.max(leftEnd + 3, Math.floor(m * 0.55)));

  // 找出前半段與後半段去趨勢化後最突出的波段高點與波段低點
  let i1 = 0;
  let maxDetrendH1 = -Infinity;
  let j1 = 0;
  let maxDetrendL1 = -Infinity;
  for (let k = 0; k <= leftEnd; k++) {
    const base = meanY + regSlope * (k - meanX);
    const dH = win[k].high - base;
    const dL = base - win[k].low;
    if (dH > maxDetrendH1) {
      maxDetrendH1 = dH;
      i1 = k;
    }
    if (dL > maxDetrendL1) {
      maxDetrendL1 = dL;
      j1 = k;
    }
  }

  let i2 = rightStart;
  let maxDetrendH2 = -Infinity;
  let j2 = rightStart;
  let maxDetrendL2 = -Infinity;
  for (let k = rightStart; k < m; k++) {
    const base = meanY + regSlope * (k - meanX);
    const dH = win[k].high - base;
    const dL = base - win[k].low;
    if (dH > maxDetrendH2) {
      maxDetrendH2 = dH;
      i2 = k;
    }
    if (dL > maxDetrendL2) {
      maxDetrendL2 = dL;
      j2 = k;
    }
  }

  const rawUpSlope = i2 > i1 ? (win[i2].high - win[i1].high) / (i2 - i1) : regSlope;
  const rawLoSlope = j2 > j1 ? (win[j2].low - win[j1].low) / (j2 - j1) : regSlope;
  const maxSlopeDev = (priceRange * 0.42) / m;

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const upSlope = clamp(
    0.65 * rawUpSlope + 0.35 * regSlope,
    regSlope - maxSlopeDev,
    regSlope + maxSlopeDev
  );
  const loSlope = clamp(
    0.65 * rawLoSlope + 0.35 * regSlope,
    regSlope - maxSlopeDev,
    regSlope + maxSlopeDev
  );

  // 校準上軌截距：貼合 97% 分位波段高點，且絕對不低於任何一根 K 棒實體頂部
  const highOffsets: number[] = [];
  let maxBodyTopOffset = -Infinity;
  const lowOffsets: number[] = [];
  let minBodyBotOffset = Infinity;

  for (let k = 0; k < m; k++) {
    const hOff = win[k].high - upSlope * k;
    const bodyTopOff = Math.max(win[k].open, win[k].close) - upSlope * k;
    highOffsets.push(hOff);
    if (bodyTopOff > maxBodyTopOffset) maxBodyTopOffset = bodyTopOff;

    const lOff = win[k].low - loSlope * k;
    const bodyBotOff = Math.min(win[k].open, win[k].close) - loSlope * k;
    lowOffsets.push(lOff);
    if (bodyBotOff < minBodyBotOffset) minBodyBotOffset = bodyBotOff;
  }

  highOffsets.sort((a, b) => a - b);
  lowOffsets.sort((a, b) => a - b);

  const upIntercept = Math.max(
    highOffsets[Math.min(m - 1, Math.floor(m * 0.96))],
    maxBodyTopOffset + priceRange * 0.005
  );
  const loIntercept = Math.min(
    lowOffsets[Math.max(0, Math.floor(m * 0.04))],
    minBodyBotOffset - priceRange * 0.005
  );

  const upperData = win.map((bar, k) => ({
    time: bar.time,
    value: Number((upIntercept + upSlope * k).toFixed(2)),
  }));
  const lowerData = win.map((bar, k) => ({
    time: bar.time,
    value: Number((loIntercept + loSlope * k).toFixed(2)),
  }));

  return { upperData, lowerData };
};

export default function CandlestickChart(props: CandlestickChartProps) {
  // 換股票時整個重建，畫線資料才不會混到別檔
  return <CandlestickChartInner key={props.symbol} {...props} />;
}

function CandlestickChartInner({ symbol, market = 'TW', period = '6mo', priceLines = [] }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const upperTrendRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lowerTrendRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma5Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma60Ref = useRef<ISeriesApi<"Line"> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState(period);
  const [showAutoTrends, setShowAutoTrends] = useState(true);
  const [showMA, setShowMA] = useState(true);
  const [upperTrendColor, setUpperTrendColor] = useState('#ef4444');
  const [tooltipData, setTooltipData] = useState<any>(null);
  const [overlay, setOverlay] = useState<{ chart: IChartApi; series: ISeriesApi<SeriesType>; bars: BarInfo[] } | null>(null);
  const drawingsApi = useDrawings(symbol, activePeriod === '1d' || activePeriod === '5d');

  const upColor = market === 'TW' ? '#ef4444' : '#22c55e';
  const downColor = market === 'TW' ? '#22c55e' : '#ef4444';

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(148, 163, 184, 0.22)' : 'rgba(59, 130, 246, 0.1)';
    const borderColor = isLight ? 'rgba(148, 163, 184, 0.4)' : 'rgba(59, 130, 246, 0.2)';
    const textColor = isLight ? '#475569' : '#94a3b8';

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 800,
      height: chartContainerRef.current.clientHeight || 398,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor },
      leftPriceScale: {
        visible: true,
        borderColor,
      },
      timeScale: { 
        borderColor, 
        timeVisible: activePeriod === '1d' || activePeriod === '5d',
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
    });

    chartRef.current = chart;

    const mainSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
      // 最新價標籤固定取「最後一根 K 棒」，而不是畫面上最後一根可見的 K 棒
      priceLineSource: PriceLineSource.LastBar,
    });
    
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'left',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const maOptions = { lineWidth: 1 as const, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false };
    const ma5Series = chart.addSeries(LineSeries, { color: '#6366f1', visible: showMA, ...maOptions });
    const ma20Series = chart.addSeries(LineSeries, { color: '#f59e0b', visible: showMA, ...maOptions });
    const ma60Series = chart.addSeries(LineSeries, { color: '#10b981', visible: showMA, ...maOptions });
    ma5Ref.current = ma5Series;
    ma20Ref.current = ma20Series;
    ma60Ref.current = ma60Series;

    // 原生上下趨勢通道線 (Upper Resistance & Lower Support Trendlines)
    const upperTrendSeries = chart.addSeries(LineSeries, {
      color: '#ef4444',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      crosshairMarkerVisible: false,
      lastValueVisible: true,
      priceLineVisible: false,
      title: '上壓',
      visible: showAutoTrends,
    });
    const lowerTrendSeries = chart.addSeries(LineSeries, {
      color: '#22c55e',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      crosshairMarkerVisible: false,
      lastValueVisible: true,
      priceLineVisible: false,
      title: '下撐',
      visible: showAutoTrends,
    });
    upperTrendRef.current = upperTrendSeries;
    lowerTrendRef.current = lowerTrendSeries;

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

        const { upperData, lowerData } = calculateAutoTrendChannel(candleData);
        if (upperData.length > 0) upperTrendSeries.setData(upperData);
        if (lowerData.length > 0) lowerTrendSeries.setData(lowerData);

        chart.timeScale().fitContent();
        // 第一次 fitContent 時右側價格刻度寬度尚未確定；刻度變寬後繪圖區變窄，
        // 最後幾根 K 棒會被擠出畫面（例如只顯示到前兩天）。版面穩定後再縮放一次。
        requestAnimationFrame(() => {
          try { chart.timeScale().fitContent(); } catch { /* chart 已被銷毀 */ }
        });

        // 提供畫線圖層需要的資料：每根 K 棒的時間戳(秒)與 OHLC
        const barInfos: BarInfo[] = candleData.map((c: any) => ({
          ts: typeof c.time === 'number' ? c.time : Date.parse(`${c.time}T00:00:00Z`) / 1000,
          open: c.open, high: c.high, low: c.low, close: c.close,
        }));
        setOverlay({ chart, series: mainSeries as ISeriesApi<SeriesType>, bars: barInfos });
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
        // 尺寸改變後確保最新一根 K 棒仍在畫面內（保留使用者的縮放比例）
        chartRef.current.timeScale().scrollToRealTime();
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
      setOverlay(null);
      upperTrendRef.current = null;
      lowerTrendRef.current = null;
      ma5Ref.current = null;
      ma20Ref.current = null;
      ma60Ref.current = null;
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, market, activePeriod, upColor, downColor]);

  // 切換 MA 均線 (5MA / 20MA / 60MA) 顯示狀態
  useEffect(() => {
    try {
      ma5Ref.current?.applyOptions({ visible: showMA });
      ma20Ref.current?.applyOptions({ visible: showMA });
      ma60Ref.current?.applyOptions({ visible: showMA });
    } catch {
      /* ignore if disposed */
    }
  }, [showMA]);

  // 切換原生自動上下趨勢線顯示狀態與主題顏色
  useEffect(() => {
    try {
      upperTrendRef.current?.applyOptions({ visible: showAutoTrends, color: upperTrendColor });
      lowerTrendRef.current?.applyOptions({ visible: showAutoTrends });
    } catch {
      /* ignore if disposed */
    }
  }, [showAutoTrends, upperTrendColor]);

  // 監聽深淺色模式切換，即時更新 K 線圖座標軸與網格配色
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const applyThemeToChart = () => {
      if (!chartRef.current) return;
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const gridColor = isLight ? 'rgba(148, 163, 184, 0.22)' : 'rgba(59, 130, 246, 0.1)';
      const borderColor = isLight ? 'rgba(148, 163, 184, 0.4)' : 'rgba(59, 130, 246, 0.2)';
      const textColor = isLight ? '#475569' : '#94a3b8';
      try {
        chartRef.current.applyOptions({
          layout: { textColor },
          grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
          rightPriceScale: { borderColor },
          leftPriceScale: { borderColor },
          timeScale: { borderColor },
        });
      } catch { /* ignore */ }
    };
    const observer = new MutationObserver(applyThemeToChart);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // 若 AI 有算出水平支撐/壓力線則一併標記在圖上
  const aiKey = JSON.stringify(priceLines);
  const { setAiLines } = drawingsApi;
  useEffect(() => {
    if (!overlay || overlay.bars.length === 0) return;
    setAiLines(priceLines, overlay.bars[overlay.bars.length - 1].ts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiKey, overlay, setAiLines]);

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
                ? 'bg-accent text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                : 'bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      
      <DrawingToolbar
        api={drawingsApi}
        bars={overlay?.bars}
        showAutoTrends={showAutoTrends}
        onToggleAutoTrends={() => setShowAutoTrends(prev => !prev)}
        showMA={showMA}
        onToggleMA={() => setShowMA(prev => !prev)}
        onClearAllAuxiliary={() => {
          drawingsApi.clear();
          setShowAutoTrends(false);
          setShowMA(false);
        }}
        onApplyThemeColor={(c) => {
          setUpperTrendColor(c);
          setShowAutoTrends(true);
        }}
      />

      <div className="relative h-[400px] border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)]/60 overflow-hidden">
        {/* Legends */}
        <div className="absolute top-3 left-4 z-10 flex flex-wrap items-center gap-3 text-xs font-mono select-none">
          {showMA ? (
            <div className="flex items-center gap-2.5 bg-black/25 dark:bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-[#6366f1]"></span> 5MA <InfoTip term="ma5" />
              </div>
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> 20MA <InfoTip term="ma20" />
              </div>
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-[#10b981]"></span> 60MA <InfoTip term="ma60" />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowMA(true)}
              className="px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-secondary hover:text-primary transition-colors text-[11px] cursor-pointer"
              title="點擊恢復顯示 5MA / 20MA / 60MA 均線"
            >
              均線已隱藏 (點擊開啟)
            </button>
          )}

          {showAutoTrends && (
            <div className="flex items-center gap-2.5 bg-black/25 dark:bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
              <div className="flex gap-1.5 items-center" style={{ color: upperTrendColor }}>
                <span className="w-3 border-t-2 border-dashed" style={{ borderColor: upperTrendColor }}></span> 上趨勢壓力
              </div>
              <div className="flex gap-1.5 items-center text-[#22c55e]">
                <span className="w-3 border-t-2 border-dashed border-[#22c55e]"></span> 下趨勢支撐
              </div>
            </div>
          )}

          {!showMA && !showAutoTrends && drawingsApi.drawings.length === 0 && (
            <div className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-sans font-medium flex items-center gap-1">
              <span>✨ 純淨 K 線模式</span>
            </div>
          )}
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
        {overlay && !loading && !error && (
          <DrawingLayer chart={overlay.chart} series={overlay.series} bars={overlay.bars} api={drawingsApi} />
        )}
      </div>
    </div>
  );
}
