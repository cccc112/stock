"use client";

import { useEffect, useRef, useState } from "react";
import {
  ColorType,
  createChart,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  LineSeries,
  PriceLineSource,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type Time,
} from "lightweight-charts";
import { DrawingLayer, DrawingToolbar, useDrawings, type BarInfo } from "@/components/charts/ChartDrawings";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { apiStocks } from "@/lib/api";
import { InfoTip } from "@/components/ui/TermTooltip";
import { Activity, CandlestickChart as CandlestickIcon } from "lucide-react";

interface CandlestickChartProps {
  symbol: string;
  market?: 'TW' | 'US';
  period?: string;
  priceLines?: { price: number; color: string; title: string }[];
  prevClose?: number;
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

const YAHOO_PERIODS = [
  { label: '當日', value: '1d' },
  { label: '5天', value: '5d' },
  { label: '1個月', value: '1mo' },
  { label: '6個月', value: '6mo' },
  { label: '今年', value: 'ytd' },
  { label: '1年', value: '1y' },
  { label: '5年', value: '5y' },
  { label: '全部', value: 'max' },
];

const PRO_PERIOD_GROUPS = [
  {
    group: '分K',
    options: [
      { label: '1分', value: '1m' },
      { label: '5分', value: '5m' },
      { label: '15分', value: '15m' },
      { label: '30分', value: '30m' },
      { label: '60分', value: '60m' },
    ],
  },
  {
    group: '日K',
    options: [
      { label: '1月', value: '1mo' },
      { label: '3月', value: '3mo' },
      { label: '6月', value: '6mo' },
      { label: '今年', value: 'ytd' },
      { label: '1年', value: '1y' },
    ],
  },
  {
    group: '長線',
    options: [
      { label: '5年週K', value: '5y' },
      { label: '全部', value: 'max' },
    ],
  },
];

function CandlestickChartInner({
  symbol,
  market = 'TW',
  period = '6mo',
  priceLines = [],
  prevClose,
}: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const upperTrendRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lowerTrendRef = useRef<ISeriesApi<"Line"> | null>(null);
  const mainSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const ma5Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma20Ref = useRef<ISeriesApi<"Line"> | null>(null);
  const ma60Ref = useRef<ISeriesApi<"Line"> | null>(null);

  // 圖表模式：'SIMPLE' (Yahoo風格走勢圖) 或 'PRO_KLINE' (專業技術K線)
  const [chartMode, setChartMode] = useState<"SIMPLE" | "PRO_KLINE">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferred_chart_mode");
      if (saved === "SIMPLE" || saved === "PRO_KLINE") return saved;
    }
    return "SIMPLE"; // 預設顯示直觀的 Yahoo 簡易走勢
  });
  const isSimple = chartMode === "SIMPLE";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePeriod, setActivePeriod] = useState(() => (chartMode === "SIMPLE" ? "1d" : period));
  const [showAutoTrends, setShowAutoTrends] = useState(false);
  const [showMA, setShowMA] = useState(true);
  const [upperTrendColor, setUpperTrendColor] = useState('#ef4444');
  const [tooltipData, setTooltipData] = useState<any>(null);
  const [overlay, setOverlay] = useState<{ chart: IChartApi; series: ISeriesApi<SeriesType>; bars: BarInfo[] } | null>(null);
  const [effectivePrevClose, setEffectivePrevClose] = useState<number>(prevClose || 0);

  useEffect(() => {
    if (prevClose && prevClose > 0) {
      setEffectivePrevClose(prevClose);
    }
  }, [prevClose]);

  const handleModeChange = (mode: "SIMPLE" | "PRO_KLINE") => {
    if (mode === chartMode) return;
    setChartMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred_chart_mode", mode);
    }
    if (mode === "SIMPLE") {
      if (!YAHOO_PERIODS.some((p) => p.value === activePeriod)) {
        setActivePeriod("1d");
      }
    }
  };

  const isIntradayPeriod = ['1m', '5m', '15m', '30m', '60m', '1h', '1d', '5d'].includes(activePeriod);
  const drawingsApi = useDrawings(symbol, isIntradayPeriod);

  const isGreenUp = typeof document !== 'undefined' && document.documentElement.getAttribute('data-color-scheme') === 'green-up';
  const upColor = isGreenUp ? '#22c55e' : '#ef4444';
  const downColor = isGreenUp ? '#ef4444' : '#22c55e';

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

    const targetTz = market === 'US' ? 'America/New_York' : 'Asia/Taipei';

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
        visible: !isSimple,
        borderColor,
      },
      localization: {
        locale: 'zh-TW',
        dateFormat: 'yyyy/MM/dd',
        timeFormatter: (time: any) => {
          if (typeof time === 'number') {
            const d = new Date(time * 1000);
            return d.toLocaleString('zh-TW', {
              timeZone: targetTz,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
          }
          if (typeof time === 'string') return time;
          if (time && typeof time === 'object' && 'year' in time) {
            return `${time.year}/${String(time.month).padStart(2, '0')}/${String(time.day).padStart(2, '0')}`;
          }
          return String(time);
        },
      },
      timeScale: { 
        borderColor, 
        timeVisible: isIntradayPeriod,
        fixLeftEdge: true,
        fixRightEdge: true,
        tickMarkFormatter: (time: any, tickMarkType: number) => {
          if (typeof time === 'number') {
            const d = new Date(time * 1000);
            if (tickMarkType === 3 || tickMarkType === 4) {
              return d.toLocaleTimeString('zh-TW', {
                timeZone: targetTz,
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
              });
            }
            if (tickMarkType === 2) {
              return d.toLocaleDateString('zh-TW', {
                timeZone: targetTz,
                month: 'numeric',
                day: 'numeric',
              });
            }
            if (tickMarkType === 1) {
              return d.toLocaleDateString('zh-TW', {
                timeZone: targetTz,
                month: 'short',
              });
            }
            if (tickMarkType === 0) {
              return d.toLocaleDateString('zh-TW', {
                timeZone: targetTz,
                year: 'numeric',
              });
            }
          }
          return null;
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
    });

    chartRef.current = chart;

    let mainSeries: any;
    if (isSimple) {
      // 📈 Yahoo 風格：AreaSeries 漸層走勢圖
      mainSeries = chart.addSeries(AreaSeries, {
        lineColor: '#2563eb', // 電光寶藍
        topColor: isLight ? 'rgba(37, 99, 235, 0.28)' : 'rgba(37, 99, 235, 0.38)',
        bottomColor: isLight ? 'rgba(37, 99, 235, 0.02)' : 'rgba(37, 99, 235, 0.01)',
        lineWidth: 2,
        priceLineSource: PriceLineSource.LastBar,
        lastValueVisible: true,
        priceLineVisible: true,
      });
    } else {
      // 🕯️ 專業技術K線：CandlestickSeries
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor,
        downColor,
        borderVisible: false,
        wickUpColor: upColor,
        wickDownColor: downColor,
        priceLineSource: PriceLineSource.LastBar,
      });
    }
    mainSeriesRef.current = mainSeries;
    
    // 成交量 Histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: isSimple ? '' : 'left',
    });
    volumeSeriesRef.current = volumeSeries;

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: isSimple ? 0.8 : 0.68, bottom: 0 },
    });

    if (!isSimple) {
      const maOptions = { lineWidth: 1 as const, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false };
      const ma5Series = chart.addSeries(LineSeries, { color: '#6366f1', visible: showMA, ...maOptions });
      const ma20Series = chart.addSeries(LineSeries, { color: '#f59e0b', visible: showMA, ...maOptions });
      const ma60Series = chart.addSeries(LineSeries, { color: '#10b981', visible: showMA, ...maOptions });
      ma5Ref.current = ma5Series;
      ma20Ref.current = ma20Series;
      ma60Ref.current = ma60Series;

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
    }

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
      
      const sData: any = param.seriesData.get(mainSeries);
      const volData: any = param.seriesData.get(volumeSeries);
      
      if (sData) {
        if (isSimple) {
          const val = typeof sData.value === 'number' ? sData.value : (sData.close ?? 0);
          setTooltipData({
            time: param.time,
            price: val,
            volume: volData?.value || 0,
            isSimple: true,
          });
        } else {
          setTooltipData({
            time: param.time,
            open: sData.open,
            high: sData.high,
            low: sData.low,
            close: sData.close,
            volume: volData?.value || 0,
            isSimple: false,
          });
        }
      }
    });

    const fetchData = async (isBackground = false) => {
      if (!isBackground) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await apiStocks.getHistory(symbol, activePeriod);
        const bars = Array.isArray(res.data) ? res.data : [];

        if (bars.length === 0) {
          if (!isBackground) {
            setError("暫無歷史資料");
            setLoading(false);
          }
          return;
        }

        const isIntraday = ['1m', '5m', '15m', '30m', '60m', '1h', '1d', '5d'].includes(activePeriod);

        let candleData: any[] = [];
        let volumeData: any[] = [];

        if (isIntraday) {
          const map = new Map<number, any>();
          bars.forEach((bar: any) => {
            let tSec: number;
            if (typeof bar.time === 'number') {
              tSec = bar.time > 1e11 ? Math.floor(bar.time / 1000) : Math.floor(bar.time);
            } else if (typeof bar.time === 'string') {
              const num = Number(bar.time);
              if (!isNaN(num) && num > 1e8) {
                tSec = num > 1e11 ? Math.floor(num / 1000) : Math.floor(num);
              } else {
                tSec = Math.floor(new Date(bar.time).getTime() / 1000);
              }
            } else {
              return;
            }
            if (!Number.isFinite(tSec) || tSec <= 0) return;
            map.set(tSec, {
              time: tSec as Time,
              open: Number(bar.open),
              high: Number(bar.high),
              low: Number(bar.low),
              close: Number(bar.close),
              volume: Number(bar.volume || 0),
            });
          });

          const sorted = Array.from(map.values()).sort((a, b) => (a.time as number) - (b.time as number));
          // 保證嚴格遞增 (Strictly Ascending Time) 杜絕 Lightweight Charts 渲染崩潰空白
          const strictlyAscending: any[] = [];
          for (const item of sorted) {
            if (strictlyAscending.length === 0 || (item.time as number) > (strictlyAscending[strictlyAscending.length - 1].time as number)) {
              strictlyAscending.push(item);
            }
          }

          candleData = strictlyAscending.map((b) => ({
            time: b.time,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
          }));
          volumeData = strictlyAscending.map((b) => ({
            time: b.time,
            value: b.volume,
            color: b.close >= b.open ? upColor + 'e6' : downColor + 'e6',
          }));
        } else {
          const uniqueBars = new Map<string, any>();
          bars.forEach((bar: any) => {
            let dateStr = "";
            if (typeof bar.time === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(bar.time)) {
              dateStr = bar.time;
            } else {
              const d = typeof bar.time === 'number'
                ? new Date(bar.time > 1e11 ? bar.time : bar.time * 1000)
                : new Date(bar.time);
              if (isNaN(d.getTime())) return;
              dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            uniqueBars.set(dateStr, {
              time: dateStr as Time,
              open: Number(bar.open),
              high: Number(bar.high),
              low: Number(bar.low),
              close: Number(bar.close),
              volume: Number(bar.volume || 0),
            });
          });
          
          const sorted = Array.from(uniqueBars.values()).sort((a, b) => String(a.time).localeCompare(String(b.time)));
          const strictlyAscending: any[] = [];
          for (const item of sorted) {
            if (strictlyAscending.length === 0 || String(item.time) > String(strictlyAscending[strictlyAscending.length - 1].time)) {
              strictlyAscending.push(item);
            }
          }

          candleData = strictlyAscending.map((b) => ({
            time: b.time,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
          }));
          volumeData = strictlyAscending.map((b) => ({
            time: b.time,
            value: b.volume,
            color: b.close >= b.open ? upColor + 'e6' : downColor + 'e6',
          }));
        }

        if (isSimple) {
          // 簡易模式：設定 AreaSeries 走勢線
          mainSeries.setData(candleData.map((c) => ({ time: c.time, value: c.close })));

          // 昨收價水平虛線 (Dashed Reference Line，如同 Yahoo 股市)
          let refClose = prevClose && prevClose > 0 ? prevClose : 0;
          if (!refClose && candleData.length > 0) {
            refClose = candleData[0].open;
          }
          if (refClose > 0) {
            setEffectivePrevClose(refClose);
            try {
              mainSeries.createPriceLine({
                price: refClose,
                color: isLight ? '#94a3b8' : '#64748b',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: '昨收',
              });
            } catch (lineErr) {
              console.warn("createPriceLine failed", lineErr);
            }
          }
        } else {
          // 專業模式：設定 CandlestickSeries 與技術指標
          mainSeries.setData(candleData);

          if (candleData.length >= 5) ma5Ref.current?.setData(calculateSMA(candleData, 5));
          if (candleData.length >= 20) ma20Ref.current?.setData(calculateSMA(candleData, 20));
          if (candleData.length >= 60) ma60Ref.current?.setData(calculateSMA(candleData, 60));

          const { upperData, lowerData } = calculateAutoTrendChannel(candleData);
          if (upperData.length > 0) upperTrendRef.current?.setData(upperData);
          if (lowerData.length > 0) lowerTrendRef.current?.setData(lowerData);
        }

        volumeSeries.setData(volumeData);

        if (!isBackground) {
          chart.timeScale().fitContent();
          requestAnimationFrame(() => {
            try { chart.timeScale().fitContent(); } catch { /* chart 已被銷毀 */ }
          });
        }

        if (!isSimple) {
          // 提供畫線圖層需要的資料
          const barInfos: BarInfo[] = candleData.map((c: any) => ({
            ts: typeof c.time === 'number' ? c.time : Date.parse(`${c.time}T00:00:00Z`) / 1000,
            open: c.open, high: c.high, low: c.low, close: c.close,
          }));
          setOverlay({ chart, series: mainSeries as ISeriesApi<SeriesType>, bars: barInfos });
        } else {
          setOverlay(null);
        }
      } catch (e) {
        console.error("Failed to fetch history", e);
        if (!isBackground) setError("無法載入圖表資料");
      } finally {
        if (!isBackground) setLoading(false);
      }
    };

    fetchData();

    // 盤中/短期刻度自動背景定時同步，無需手動 F5 刷新
    let refreshTimer: any = null;
    if (['1m', '5m', '15m', '30m', '60m', '1d', '5d'].includes(activePeriod)) {
      refreshTimer = setInterval(() => {
        fetchData(true);
      }, 5000);
    }

    const handleResize = (width: number, height: number) => {
      if (chartRef.current && width > 0 && height > 0) {
        chartRef.current.applyOptions({ width, height });
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
      if (refreshTimer) clearInterval(refreshTimer);
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
  }, [symbol, market, activePeriod, upColor, downColor, chartMode, prevClose]);

  // 切換 MA 均線 (5MA / 20MA / 60MA) 顯示狀態
  useEffect(() => {
    if (isSimple) return;
    try {
      ma5Ref.current?.applyOptions({ visible: showMA });
      ma20Ref.current?.applyOptions({ visible: showMA });
      ma60Ref.current?.applyOptions({ visible: showMA });
    } catch {
      /* ignore if disposed */
    }
  }, [showMA, isSimple]);

  // 切換原生自動上下趨勢線顯示狀態與主題顏色
  useEffect(() => {
    if (isSimple) return;
    try {
      upperTrendRef.current?.applyOptions({ visible: showAutoTrends, color: upperTrendColor });
      lowerTrendRef.current?.applyOptions({ visible: showAutoTrends });
    } catch {
      /* ignore if disposed */
    }
  }, [showAutoTrends, upperTrendColor, isSimple]);

  // 監聽深淺色與漲跌顏色模式切換
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const applyThemeToChart = () => {
      if (!chartRef.current) return;
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const isGreenUpNow = document.documentElement.getAttribute('data-color-scheme') === 'green-up';
      const currentUp = isGreenUpNow ? '#22c55e' : '#ef4444';
      const currentDown = isGreenUpNow ? '#ef4444' : '#22c55e';

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

        if (mainSeriesRef.current && !isSimple) {
          mainSeriesRef.current.applyOptions({
            upColor: currentUp,
            downColor: currentDown,
            wickUpColor: currentUp,
            wickDownColor: currentDown,
          });
        }
      } catch { /* ignore */ }
    };
    const observer = new MutationObserver(applyThemeToChart);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-color-scheme'] });
    return () => observer.disconnect();
  }, [isSimple]);

  // 若 AI 有算出水平支撐/壓力線則一併標記在圖上（僅在專業模式）
  const aiKey = JSON.stringify(priceLines);
  const { setAiLines } = drawingsApi;
  useEffect(() => {
    if (isSimple || !overlay || overlay.bars.length === 0) return;
    setAiLines(priceLines, overlay.bars[overlay.bars.length - 1].ts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiKey, overlay, setAiLines, isSimple]);

  return (
    <div className="relative w-full">
      {/* 頂部雙模式切換列 (📈 簡易走勢 vs 🕯️ 專業技術K線) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-1 p-1 bg-[var(--bg-tertiary)]/80 border border-[var(--border)] rounded-xl shadow-sm">
          <button
            type="button"
            onClick={() => handleModeChange("SIMPLE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isSimple
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-secondary hover:text-primary"
            }`}
          >
            <Activity size={13} />
            <span>📈 簡易走勢 (Yahoo風格)</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("PRO_KLINE")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !isSimple
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "text-secondary hover:text-primary"
            }`}
          >
            <CandlestickIcon size={13} />
            <span>🕯️ 專業技術K線</span>
          </button>
        </div>

        {/* 狀態簡述提示 */}
        <div className="text-[11px] text-secondary font-mono flex items-center gap-2">
          {isSimple ? (
            <span className="flex items-center gap-1 text-blue-500">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>即時折線 + 昨收參考基準</span>
            </span>
          ) : (
            <span className="text-secondary">完整技術指標與畫線分析</span>
          )}
        </div>
      </div>

      {/* 週期按鈕列 */}
      <div className="mb-3">
        {isSimple ? (
          /* Yahoo 風格 8 個週期平鋪按鈕 (完全複製 Yahoo 股市) */
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {YAHOO_PERIODS.map((p) => {
              const isSelected = activePeriod === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setActivePeriod(p.value)}
                  className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap cursor-pointer text-center ${
                    isSelected
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 scale-[1.02]"
                      : "bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-secondary hover:text-primary font-medium"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        ) : (
          /* 專業技術 K 線清晰分群列：分K / 日K / 長線 */
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-hide flex-wrap">
            {PRO_PERIOD_GROUPS.map((grp) => (
              <div
                key={grp.group}
                className="flex items-center gap-1 bg-[var(--bg-tertiary)]/70 p-1 rounded-xl border border-[var(--border)]"
              >
                <span className="px-2 text-[10px] font-bold text-secondary tracking-wider uppercase">
                  {grp.group}
                </span>
                <div className="flex items-center gap-1">
                  {grp.options.map((opt) => {
                    const isSelected = activePeriod === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setActivePeriod(opt.value)}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? "bg-accent text-white font-bold shadow-sm"
                            : "text-secondary hover:text-primary hover:bg-[var(--bg-secondary)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 畫線工具列 (僅在專業 K 線模式下顯示) */}
      {!isSimple && (
        <DrawingToolbar
          api={drawingsApi}
          bars={overlay?.bars}
          showAutoTrends={showAutoTrends}
          onToggleAutoTrends={() => setShowAutoTrends((prev) => !prev)}
          showMA={showMA}
          onToggleMA={() => setShowMA((prev) => !prev)}
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
      )}

      {/* 圖表渲染主容器 */}
      <div className="relative h-[320px] sm:h-[400px] border border-[var(--border)] rounded-xl bg-[var(--bg-secondary)]/60 overflow-hidden shadow-inner">
        {/* Legends (專業模式顯示均線/趨勢線；簡易模式顯示昨收參考) */}
        <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-4 z-10 flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs font-mono select-none max-w-[85%]">
          {isSimple ? (
            <div className="flex items-center gap-2 bg-black/30 dark:bg-black/50 px-2.5 py-1 rounded-md backdrop-blur-md border border-white/5">
              <span className="w-2.5 h-0.5 bg-blue-500 rounded-full" />
              <span className="text-blue-400 font-semibold">即時走勢</span>
              {effectivePrevClose > 0 && (
                <>
                  <span className="text-secondary/60">|</span>
                  <span className="w-3 border-t border-dashed border-slate-400" />
                  <span className="text-secondary">
                    昨收基準: {market === 'US' ? `$${effectivePrevClose.toFixed(2)}` : `NT$ ${effectivePrevClose.toFixed(2)}`}
                  </span>
                </>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        {/* 懸浮數值浮窗 (Tooltip) */}
        {tooltipData && (
          <div className="absolute top-11 left-3 sm:left-4 z-20 bg-[var(--bg-tertiary)]/95 backdrop-blur-md border border-[var(--border)] px-3 py-2 rounded-lg shadow-2xl text-xs font-mono pointer-events-none transition-opacity">
            <div className="text-secondary text-[11px] mb-1">
              {typeof tooltipData.time === 'number' 
                ? new Date(tooltipData.time * 1000).toLocaleString('zh-TW', { timeZone: market === 'US' ? 'America/New_York' : 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
                : tooltipData.time}
            </div>
            {tooltipData.isSimple ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-secondary text-[10px]">價格</span>
                  <span className="text-primary font-bold text-sm">
                    {market === 'US' ? `$${tooltipData.price.toFixed(2)}` : `NT$ ${tooltipData.price.toFixed(2)}`}
                  </span>
                </div>
                {effectivePrevClose > 0 && (
                  <div className="flex flex-col">
                    <span className="text-secondary text-[10px]">對比昨收</span>
                    {(() => {
                      const diff = tooltipData.price - effectivePrevClose;
                      const pct = (diff / effectivePrevClose) * 100;
                      const isUp = diff >= 0;
                      return (
                        <span className={`font-semibold ${isUp ? 'text-up-tw' : 'text-down-tw'}`}>
                          {isUp ? '+' : ''}{diff.toFixed(2)} ({isUp ? '+' : ''}{pct.toFixed(2)}%)
                        </span>
                      );
                    })()}
                  </div>
                )}
                <div className="flex flex-col border-l border-[var(--border)] pl-2.5">
                  <span className="text-secondary text-[10px]">成交量</span>
                  <span className="text-primary font-mono font-medium">
                    {market === 'TW'
                      ? `${Math.round(tooltipData.volume / 1000).toLocaleString()} 張`
                      : tooltipData.volume.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
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
                <div className="flex flex-col border-l border-[var(--border)] pl-2.5 ml-1">
                  <span className="text-secondary">成交量 (Vol)</span>
                  <span className="text-primary font-bold font-mono">
                    {market === 'TW'
                      ? `${Math.round(tooltipData.volume / 1000).toLocaleString()} 張`
                      : tooltipData.volume.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {loading && <LoadingSkeleton variant="chart" className="absolute inset-0 z-10" />}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10 text-secondary">
            {error}
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
        {overlay && !loading && !error && !isSimple && (
          <DrawingLayer chart={overlay.chart} series={overlay.series} bars={overlay.bars} api={drawingsApi} />
        )}
      </div>
    </div>
  );
}
