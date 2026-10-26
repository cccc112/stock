"use client";

/* eslint-disable react-hooks/refs -- startDrag 等函式只在使用者操作(事件)時才讀寫 ref，render 期間不會執行；規則在此為誤判 */

/**
 * K 線圖手動畫線工具（疊在 lightweight-charts 上的 SVG 圖層）
 *
 * - 線條錨點存「時間 + 價格」，縮放 / 平移 / 切換週期都會跟著 K 線走
 * - 時間超出資料範圍（例如向右延伸的未來）以平均 K 棒間距外推
 * - 日線與分時各存一份，依股票代碼存在 localStorage
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, Logical, SeriesType } from "lightweight-charts";
import { InfoTip } from "@/components/ui/TermTooltip";

export type Tool = 'cursor' | 'trend' | 'ray' | 'channel' | 'hline' | 'vline' | 'fib' | 'rect';
export interface Anchor { ts: number; price: number }
export interface Drawing {
  id: string;
  type: Exclude<Tool, 'cursor'>;
  color: string;
  title?: string;   // 例如 AI 產生的「支撐 1」或「上趨勢線 (壓力)」
  p1: Anchor;
  p2?: Anchor;
}
export interface BarInfo { ts: number; open: number; high: number; low: number; close: number }

interface Store { d: Drawing[]; i: Drawing[] }

const TWO_POINT: Tool[] = ['trend', 'ray', 'channel', 'fib', 'rect'];
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const COLORS = ['#f59e0b', '#6366f1', '#ef4444', '#22c55e', '#e5e7eb'];

const TOOLS: { id: Tool; label: string; hint: string; term?: string }[] = [
  { id: 'cursor', label: '選取', hint: '選取 / 拖曳已畫的線（雙擊線條可直接刪除）' },
  { id: 'trend', label: '趨勢線', hint: '點兩下：起點、終點（有限長度線段）', term: 'trend_tool' },
  { id: 'ray', label: '射線', hint: '點兩下：起點、方向點，自動向右無限延伸', term: 'ray_tool' },
  { id: 'channel', label: '上下通道', hint: '點兩下：同時畫出平行上下趨勢線通道', term: 'channel_tool' },
  { id: 'hline', label: '水平線', hint: '點一下，標記支撐或壓力價位', term: 'hline_tool' },
  { id: 'vline', label: '垂直線', hint: '點一下，標記重要日期', term: 'vline_tool' },
  { id: 'fib', label: '斐波那契', hint: '點兩下：波段起點與終點', term: 'fib_tool' },
  { id: 'rect', label: '矩形', hint: '點兩下：標記區間（盤整區、缺口）', term: 'rect_tool' },
];

/**
 * 自動從目前 K 線資料計算「上趨勢線 (壓力)」與「下趨勢線 (支撐)」
 * 採用「受約束波段轉折包絡線 + 線性回歸趨勢校正 (Constrained Swing Envelope + OLS Regression)」：
 * 1. 確保前後兩個轉折錨點間距至少達視窗寬度的 30% 以上，杜絕相鄰 K 棒連出極端斜率。
 * 2. 嚴格懲罰穿刺 K 棒實體的連線，找出最貼合波段高點的上壓力線與最貼合波段低點的下支撐線。
 * 3. 以最新一根 K 棒為終點 (type: 'trend')，不會向畫面外無限亂射。
 */
export function computeAutoTrendlines(bars: BarInfo[]): Drawing[] {
  if (!bars || bars.length < 12) return [];
  const winLen = Math.min(bars.length, 55);
  const win = bars.slice(-winLen);
  const m = win.length;

  // 計算收盤價線性回歸斜率與區間振幅，作為斜率合理性基準
  let sumX = 0,
    sumY = 0,
    maxH = -Infinity,
    minL = Infinity;
  for (let i = 0; i < m; i++) {
    sumX += i;
    sumY += win[i].close;
    if (win[i].high > maxH) maxH = win[i].high;
    if (win[i].low < minL) minL = win[i].low;
  }
  const meanX = sumX / m;
  const meanY = sumY / m;
  let num = 0,
    den = 0;
  for (let i = 0; i < m; i++) {
    num += (i - meanX) * (win[i].close - meanY);
    den += (i - meanX) * (i - meanX);
  }
  const regSlope = den > 0 ? num / den : 0;
  const priceRange = Math.max(maxH - minL, meanY * 0.04, 0.01);
  const minSpan = Math.max(8, Math.floor(m * 0.32));
  const firstHalfEnd = Math.floor(m * 0.52);
  const lastClose = win[m - 1].close;

  // 1. 搜尋最佳上趨勢壓力線 (Upper Resistance Trendline)
  let bestUpper: { i1: number; endPrice: number; cost: number } | null = null;
  for (let i1 = 0; i1 <= firstHalfEnd; i1++) {
    for (let i2 = i1 + minSpan; i2 < m; i2++) {
      const slope = (win[i2].high - win[i1].high) / (i2 - i1);
      // 排除斜率過於誇張（整段高低差超過區間振幅 1.35 倍）的異常線
      if (Math.abs(slope * m) > priceRange * 1.35) continue;
      const endPrice = win[i1].high + slope * (m - 1 - i1);
      if (endPrice > maxH + priceRange * 0.35 || endPrice < lastClose - priceRange * 0.08) continue;

      let cost = 0;
      let pierced = 0;
      for (let k = i1; k < m; k++) {
        const lineY = win[i1].high + slope * (k - i1);
        const bodyTop = Math.max(win[k].open, win[k].close);
        if (bodyTop > lineY + priceRange * 0.015) {
          pierced += 2;
          cost += (bodyTop - lineY) * 90;
        } else if (win[k].high > lineY + priceRange * 0.01) {
          pierced += 1;
          cost += (win[k].high - lineY) * 35;
        } else {
          cost += lineY - win[k].high;
        }
      }
      if (pierced > Math.max(3, Math.floor(m * 0.06))) continue;
      // 加入與整體趨勢斜率的一致性權重
      cost += Math.abs(slope - regSlope) * m * 0.35;
      if (!bestUpper || cost < bestUpper.cost) {
        bestUpper = { i1, endPrice, cost };
      }
    }
  }

  // 2. 搜尋最佳下趨勢支撐線 (Lower Support Trendline)
  let bestLower: { j1: number; endPrice: number; cost: number } | null = null;
  for (let j1 = 0; j1 <= firstHalfEnd; j1++) {
    for (let j2 = j1 + minSpan; j2 < m; j2++) {
      const slope = (win[j2].low - win[j1].low) / (j2 - j1);
      if (Math.abs(slope * m) > priceRange * 1.35) continue;
      const endPrice = win[j1].low + slope * (m - 1 - j1);
      if (endPrice < minL - priceRange * 0.35 || endPrice > lastClose + priceRange * 0.08) continue;

      let cost = 0;
      let pierced = 0;
      for (let k = j1; k < m; k++) {
        const lineY = win[j1].low + slope * (k - j1);
        const bodyBot = Math.min(win[k].open, win[k].close);
        if (bodyBot < lineY - priceRange * 0.015) {
          pierced += 2;
          cost += (lineY - bodyBot) * 90;
        } else if (win[k].low < lineY - priceRange * 0.01) {
          pierced += 1;
          cost += (lineY - win[k].low) * 35;
        } else {
          cost += win[k].low - lineY;
        }
      }
      if (pierced > Math.max(3, Math.floor(m * 0.06))) continue;
      cost += Math.abs(slope - regSlope) * m * 0.35;
      if (!bestLower || cost < bestLower.cost) {
        bestLower = { j1, endPrice, cost };
      }
    }
  }

  // 若極端行情未找到合格雙轉折點，退回線性回歸平行包絡通道 (Regression Channel)
  let upStartIdx = 0,
    upStartPrice = 0,
    upEndPrice = 0;
  if (bestUpper) {
    upStartIdx = bestUpper.i1;
    upStartPrice = win[bestUpper.i1].high;
    upEndPrice = bestUpper.endPrice;
  } else {
    let maxRes = 0;
    for (let i = 0; i < m; i++) {
      const regY = meanY + regSlope * (i - meanX);
      maxRes = Math.max(maxRes, win[i].high - regY);
    }
    upStartIdx = 0;
    upStartPrice = meanY + regSlope * (0 - meanX) + maxRes;
    upEndPrice = meanY + regSlope * (m - 1 - meanX) + maxRes;
  }

  let loStartIdx = 0,
    loStartPrice = 0,
    loEndPrice = 0;
  if (bestLower) {
    loStartIdx = bestLower.j1;
    loStartPrice = win[bestLower.j1].low;
    loEndPrice = bestLower.endPrice;
  } else {
    let maxNegRes = 0;
    for (let i = 0; i < m; i++) {
      const regY = meanY + regSlope * (i - meanX);
      maxNegRes = Math.max(maxNegRes, regY - win[i].low);
    }
    loStartIdx = 0;
    loStartPrice = meanY + regSlope * (0 - meanX) - maxNegRes;
    loEndPrice = meanY + regSlope * (m - 1 - meanX) - maxNegRes;
  }

  // 確保終點上軌必高於下軌
  if (upEndPrice <= loEndPrice) {
    upEndPrice = Math.max(upEndPrice, lastClose + priceRange * 0.15);
    loEndPrice = Math.min(loEndPrice, lastClose - priceRange * 0.15);
  }

  return [
    {
      id: 'auto-trend-upper',
      type: 'trend',
      color: '#ef4444',
      title: '上趨勢線 (壓力)',
      p1: { ts: win[upStartIdx].ts, price: Number(upStartPrice.toFixed(2)) },
      p2: { ts: win[m - 1].ts, price: Number(upEndPrice.toFixed(2)) },
    },
    {
      id: 'auto-trend-lower',
      type: 'trend',
      color: '#22c55e',
      title: '下趨勢線 (支撐)',
      p1: { ts: win[loStartIdx].ts, price: Number(loStartPrice.toFixed(2)) },
      p2: { ts: win[m - 1].ts, price: Number(loEndPrice.toFixed(2)) },
    },
  ];
}

/**
 * 針對點選的畫線工具（上下通道、斐波那契、盤整矩形、水平支撐壓力、趨勢線、射線、垂直線），
 * 自動根據目前 K 線的波段高低點與轉折結構，智能計算並回傳繪圖物件。
 */
export function autoGenerateDrawing(
  tool: Exclude<Tool, 'cursor'>,
  bars: BarInfo[],
  preferredColor?: string
): Drawing[] {
  if (!bars || bars.length < 5) return [];
  const n = bars.length;
  const winLen = Math.min(n, 65);
  const win = bars.slice(-winLen);
  const m = win.length;

  let maxH = -Infinity;
  let minL = Infinity;
  let iMax = 0;
  let iMin = 0;
  let maxRange = -Infinity;
  let iMaxRange = 0;

  for (let i = 0; i < m; i++) {
    const b = win[i];
    if (b.high > maxH) {
      maxH = b.high;
      iMax = i;
    }
    if (b.low < minL) {
      minL = b.low;
      iMin = i;
    }
    const rng = Math.abs(b.high - b.low);
    if (rng > maxRange) {
      maxRange = rng;
      iMaxRange = i;
    }
  }

  const lastBar = win[m - 1];
  const firstBar = win[0];
  const lastClose = lastBar.close;

  switch (tool) {
    case 'channel': {
      // 1. 自動上下趨勢通道：以波段回歸或高低點均值為中心軸，上下包絡
      const centerStart = (firstBar.high + firstBar.low) / 2;
      const centerEnd = (lastBar.high + lastBar.low) / 2;
      return [
        {
          id: `auto-channel-${newId()}`,
          type: 'channel',
          color: preferredColor || '#6366f1',
          title: '智能趨勢通道',
          p1: { ts: firstBar.ts, price: Number(centerStart.toFixed(2)) },
          p2: { ts: lastBar.ts, price: Number(centerEnd.toFixed(2)) },
        },
      ];
    }

    case 'fib': {
      // 2. 斐波那契黃金分割：由波段低點拉到波段高點（多頭）或高點拉到低點（空頭）
      const p1Bar = iMax > iMin ? win[iMax] : win[iMin];
      const p2Bar = iMax > iMin ? win[iMin] : win[iMax];
      return [
        {
          id: `auto-fib-${newId()}`,
          type: 'fib',
          color: preferredColor || '#f59e0b',
          title: `斐波那契 (${minL.toFixed(1)}~${maxH.toFixed(1)})`,
          p1: { ts: p1Bar.ts, price: iMax > iMin ? maxH : minL },
          p2: { ts: p2Bar.ts, price: iMax > iMin ? minL : maxH },
        },
      ];
    }

    case 'rect': {
      // 3. 盤整箱體 / SMC 訂單塊：抓取最近 18 根 K 棒的密集震盪區間
      const boxSpan = Math.min(m, 20);
      const boxBars = win.slice(-boxSpan);
      const bHigh = Math.max(...boxBars.map((b) => b.high));
      const bLow = Math.min(...boxBars.map((b) => b.low));
      return [
        {
          id: `auto-rect-${newId()}`,
          type: 'rect',
          color: preferredColor || '#38bdf8',
          title: 'SMC 盤整箱體 / 訂單塊',
          p1: { ts: boxBars[0].ts, price: Number(bHigh.toFixed(2)) },
          p2: { ts: lastBar.ts, price: Number(bLow.toFixed(2)) },
        },
      ];
    }

    case 'hline': {
      // 4. 水平線：自動生成近期波段高點壓力線與低點支撐線
      return [
        {
          id: `auto-hline-res-${newId()}`,
          type: 'hline',
          color: '#ef4444',
          title: '波段壓力',
          p1: { ts: win[iMax].ts, price: Number(maxH.toFixed(2)) },
        },
        {
          id: `auto-hline-sup-${newId()}`,
          type: 'hline',
          color: '#22c55e',
          title: '波段支撐',
          p1: { ts: win[iMin].ts, price: Number(minL.toFixed(2)) },
        },
      ];
    }

    case 'vline': {
      // 5. 垂直線：標記近期最大振幅/關鍵轉折日
      const pivotBar = win[iMaxRange] || lastBar;
      return [
        {
          id: `auto-vline-${newId()}`,
          type: 'vline',
          color: preferredColor || '#a855f7',
          title: '關鍵轉折日',
          p1: { ts: pivotBar.ts, price: pivotBar.close },
        },
      ];
    }

    case 'trend': {
      // 6. 趨勢線：連接波段重要轉折點至最新 K 棒
      const trendList = computeAutoTrendlines(bars);
      if (trendList.length > 0) return trendList;
      return [
        {
          id: `auto-trend-${newId()}`,
          type: 'trend',
          color: preferredColor || '#f59e0b',
          title: '波段趨勢線',
          p1: { ts: win[iMin].ts, price: minL },
          p2: { ts: lastBar.ts, price: lastClose },
        },
      ];
    }

    case 'ray': {
      // 7. 射線：由波段低點或高點向右無限延伸
      const pivot = iMax > iMin ? win[iMin] : win[iMax];
      return [
        {
          id: `auto-ray-${newId()}`,
          type: 'ray',
          color: preferredColor || '#06b6d4',
          title: '多空方向射線',
          p1: { ts: pivot.ts, price: iMax > iMin ? minL : maxH },
          p2: { ts: lastBar.ts, price: lastClose },
        },
      ];
    }

    default:
      return [];
  }
}

/**
 * 一鍵全套智能自動繪圖（通道 + 斐波那契 + SMC 箱體 + 水平支撐壓力）
 */
export function autoGenerateAllDrawings(bars: BarInfo[], preferredColor?: string): Drawing[] {
  if (!bars || bars.length < 5) return [];
  const channels = autoGenerateDrawing('channel', bars, preferredColor || '#6366f1');
  const fibs = autoGenerateDrawing('fib', bars, '#f59e0b');
  const rects = autoGenerateDrawing('rect', bars, '#38bdf8');
  const hlines = autoGenerateDrawing('hline', bars, '#ef4444');
  return [...channels, ...fibs, ...rects, ...hlines];
}

const storageKey = (symbol: string) => `chart_drawings:${symbol}`;

const isManualDrawing = (d: Drawing) =>
  d && typeof d.id === 'string' && !d.id.startsWith('auto-trend-') && !d.id.startsWith('ai-');

function loadStore(symbol: string): Store {
  try {
    const raw = localStorage.getItem(storageKey(symbol));
    if (raw) {
      const p = JSON.parse(raw);
      return {
        d: Array.isArray(p.d) ? p.d.filter(isManualDrawing) : [],
        i: Array.isArray(p.i) ? p.i.filter(isManualDrawing) : [],
      };
    }
  } catch { /* localStorage 不可用就當作沒有 */ }
  return { d: [], i: [] };
}

function saveStore(symbol: string, store: Store) {
  try {
    const clean: Store = {
      d: store.d.filter(isManualDrawing),
      i: store.i.filter(isManualDrawing),
    };
    localStorage.setItem(storageKey(symbol), JSON.stringify(clean));
  } catch { /* ignore */ }
}

const newId = () => Math.random().toString(36).slice(2, 10);

export interface Draft { type: Exclude<Tool, 'cursor'>; p1: Anchor; cursor: Anchor | null }

// ---------------------------------------------------------------- state hook
export function useDrawings(symbol: string, intraday: boolean) {
  const cls: keyof Store = intraday ? 'i' : 'd';
  const [store, setStore] = useState<Store>(() => loadStore(symbol));
  const storeRef = useRef(store);
  const histRef = useRef<{ cls: keyof Store; list: Drawing[] }[]>([]);
  const [tool, setToolState] = useState<Tool>('cursor');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [selected, setSelected] = useState<string | null>(null);
  const [magnet, setMagnet] = useState(true);

  const setTool = useCallback((nextTool: Tool) => {
    setDraft(null);
    setToolState(nextTool);
  }, []);

  const pushHistory = useCallback(() => {
    histRef.current.push({ cls, list: storeRef.current[cls] });
    if (histRef.current.length > 50) histRef.current.shift();
  }, [cls]);

  const update = useCallback((fn: (list: Drawing[]) => Drawing[], record = true) => {
    if (record) pushHistory();
    const next = { ...storeRef.current, [cls]: fn(storeRef.current[cls]) };
    storeRef.current = next;
    setStore(next);
    saveStore(symbol, next);
  }, [cls, symbol, pushHistory]);

  const add = useCallback((d: Drawing) => update(l => [...l, d]), [update]);
  const patch = useCallback((id: string, p: Partial<Drawing>, record = false) =>
    update(l => l.map(d => (d.id === id ? { ...d, ...p } : d)), record), [update]);
  const remove = useCallback((id: string) => {
    update(l => l.filter(d => d.id !== id));
    setSelected(null);
    setDraft(null);
  }, [update]);

  // 刪除目前選取的線；若未選取但正在畫草稿則取消草稿；否則刪除最後一條畫的線
  const removeSelectedOrLast = useCallback(() => {
    if (draft) {
      setDraft(null);
      setToolState('cursor');
      return;
    }
    if (selected) {
      update(l => l.filter(d => d.id !== selected));
      setSelected(null);
      return;
    }
    const list = storeRef.current[cls];
    if (list.length > 0) {
      update(l => l.slice(0, -1));
      setSelected(null);
    }
  }, [draft, selected, cls, update]);

  // 以 AI 計算的支撐/壓力水平線取代舊的 AI 線（id 以 ai- 開頭），不進復原堆疊
  const setAiLines = useCallback((lines: { price: number; color: string; title: string }[], ts: number) => {
    update(l => [
      ...l.filter(d => !d.id.startsWith('ai-') && !d.id.startsWith('auto-trend-')),
      ...lines.map((x, i): Drawing => ({ id: `ai-${i}`, type: 'hline', color: x.color, title: x.title, p1: { ts, price: x.price } })),
    ], false);
  }, [update]);

  const clear = useCallback(() => {
    setDraft(null);
    setToolState('cursor');
    update(() => []);
    setSelected(null);
  }, [update]);

  const undo = useCallback(() => {
    if (draft) {
      setDraft(null);
      setToolState('cursor');
      return;
    }
    const last = histRef.current.pop();
    if (!last) return;
    const next = { ...storeRef.current, [last.cls]: last.list };
    storeRef.current = next;
    setStore(next);
    saveStore(symbol, next);
    setSelected(null);
  }, [symbol, draft]);

  const addMany = useCallback((items: Drawing[]) => {
    if (!items || items.length === 0) return;
    pushHistory();
    const next = { ...storeRef.current, [cls]: [...storeRef.current[cls], ...items] };
    storeRef.current = next;
    setStore(next);
    saveStore(symbol, next);
  }, [cls, symbol, pushHistory]);

  return {
    drawings: store[cls], tool, setTool, draft, setDraft, color, setColor, selected, setSelected, magnet, setMagnet,
    add, addMany, patch, remove, removeSelectedOrLast, clear, undo, pushHistory, setAiLines,
  };
}

export type DrawingsApi = ReturnType<typeof useDrawings>;

// ---------------------------------------------------------------- toolbar
export function DrawingToolbar({
  api,
  bars = [],
  showAutoTrends = true,
  onToggleAutoTrends,
  showMA = true,
  onToggleMA,
  onClearAllAuxiliary,
  onApplyThemeColor,
}: {
  api: DrawingsApi;
  bars?: BarInfo[];
  showAutoTrends?: boolean;
  onToggleAutoTrends?: () => void;
  showMA?: boolean;
  onToggleMA?: () => void;
  onClearAllAuxiliary?: () => void;
  onApplyThemeColor?: (color: string) => void;
}) {
  const { tool, setTool, draft, color, setColor, selected, removeSelectedOrLast, clear, undo, magnet, setMagnet, drawings, setSelected, addMany } = api;
  const [autoDrawMode, setAutoDrawMode] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const btn = (active: boolean) =>
    `px-2.5 py-1 text-xs rounded-md border transition-all whitespace-nowrap cursor-pointer ${
      active
        ? 'border-[var(--accent)] text-accent bg-[var(--accent)]/15 shadow-sm'
        : 'border-[var(--border)] text-secondary hover:text-primary hover:border-[var(--border-hover)]'}`;
  const current = TOOLS.find((t) => t.id === tool);
  const canDelete = Boolean(selected || draft || drawings.length > 0);

  const handleToolClick = (t: (typeof TOOLS)[number]) => {
    if (t.id === 'cursor') {
      setTool('cursor');
      setSelected(null);
      return;
    }

    // 若處於「按下自動畫出」模式且有 K 棒資料，立即在圖表上精準畫出形態
    if (autoDrawMode && bars && bars.length >= 5) {
      const generated = autoGenerateDrawing(t.id as Exclude<Tool, 'cursor'>, bars, color);
      if (generated.length > 0) {
        addMany(generated);
        setSelected(generated[0].id);
        setTool('cursor');
        showToast(`已自動畫出${t.label}（已標記在 K 線圖，可點選拖曳微調）`);
        return;
      }
    }

    // 手動模式或無 K 棒資料時切換為十字線手動拉線
    if (tool === t.id) {
      setTool('cursor');
    } else {
      setTool(t.id);
    }
    setSelected(null);
  };

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* 一鍵純淨 K 線 (清除所有輔助線只留K線) */}
        <button
          type="button"
          className="px-2.5 py-1 text-xs rounded-md border border-rose-500/50 bg-rose-500/15 text-rose-400 font-semibold hover:bg-rose-500/25 transition-all whitespace-nowrap shadow-sm flex items-center gap-1 cursor-pointer"
          onClick={() => {
            if (onClearAllAuxiliary) {
              onClearAllAuxiliary();
            } else {
              clear();
            }
            showToast('🧹 已清除所有輔助線，僅保留純 K 線！(可點擊均線或趨勢線按鈕隨時恢復)');
          }}
          title="一鍵清除所有輔助線：手動畫線、自動趨勢通道、SMC 箱體、斐波那契及均線(MA)，僅保留乾淨 K 線"
        >
          <span>🧹 一鍵純淨 K 線</span>
        </button>

        {onToggleMA && (
          <button
            type="button"
            title="切換 5MA / 20MA / 60MA 移動平均線顯示"
            className={btn(Boolean(showMA))}
            onClick={onToggleMA}
          >
            均線 (MA)
          </button>
        )}

        {onToggleAutoTrends && (
          <div className="inline-flex items-center">
            <button
              type="button"
              title="自動標記近期波段高點連線(上趨勢壓力線)與波段低點連線(下趨勢支撐線)"
              className={btn(showAutoTrends)}
              onClick={onToggleAutoTrends}
            >
              自動上下趨勢線
            </button>
            <InfoTip term="auto_trendlines" />
          </div>
        )}

        <span className="w-px h-5 bg-[var(--border)] mx-0.5" />

        {/* 一鍵全套智能自動畫出 */}
        <button
          type="button"
          className="px-2.5 py-1 text-xs rounded-md border border-amber-500/40 bg-amber-500/15 text-amber-400 font-semibold hover:bg-amber-500/25 transition-all whitespace-nowrap shadow-sm flex items-center gap-1 cursor-pointer"
          onClick={() => {
            if (!bars || bars.length < 5) return;
            const all = autoGenerateAllDrawings(bars, color);
            addMany(all);
            showToast('⚡ 已一鍵全套自動畫出：趨勢通道、斐波那契、SMC 箱體與關鍵支撐壓力線！');
            setTool('cursor');
          }}
          title="按下直接自動畫出：趨勢通道 + 斐波那契黃金分割 + SMC 盤整箱體 + 關鍵水平支撐壓力"
        >
          <span>⚡ 一鍵全部自動畫</span>
        </button>

        {/* 自動畫出 / 手動畫線 切換模式標籤 */}
        <button
          type="button"
          className={`px-2 py-1 text-xs rounded-md border transition-all whitespace-nowrap font-medium cursor-pointer ${
            autoDrawMode
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : 'border-slate-400/50 dark:border-slate-500/50 bg-slate-500/10 dark:bg-slate-500/15 text-slate-700 dark:text-slate-300'
          }`}
          onClick={() => {
            const nextMode = !autoDrawMode;
            setAutoDrawMode(nextMode);
            showToast(nextMode ? '已切換為「按下自動畫出」模式：點選工具按鈕即自動智能繪製' : '已切換為「手動模式」：點擊工具後於圖表點擊十字線自定義繪製');
          }}
          title={autoDrawMode ? "目前為「按下自動畫出」模式：點選工具按鈕即可自動在 K 線畫出對應形態；點此可切換手動拉線" : "目前為「手動拉線模式」；點此可切換為按下自動畫出"}
        >
          {autoDrawMode ? '模式: 按下自動畫' : '模式: 手動拉線'}
        </button>

        <span className="w-px h-5 bg-[var(--border)] mx-0.5" />

        {TOOLS.map(t => (
          <div key={t.id} className="inline-flex items-center">
            <button
              type="button"
              title={autoDrawMode && t.id !== 'cursor' ? `【按下自動畫出】點擊立即在 K 線圖自動畫出${t.label}` : t.hint}
              className={btn(tool === t.id)}
              onClick={() => handleToolClick(t)}
            >
              {t.label}
            </button>
            {t.term && <InfoTip term={t.term} />}
          </div>
        ))}
        <span className="w-px h-5 bg-[var(--border)] mx-1" />
        <div className="inline-flex items-center gap-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              title="點擊切換畫筆顏色（若已畫線會立即變色；若尚未手動畫線則會改變趨勢線配色）"
              aria-label={`顏色 ${c}`}
              onClick={() => {
                setColor(c);
                if (selected) {
                  api.patch(selected, { color: c }, true);
                } else if (drawings.length > 0) {
                  const lastId = drawings[drawings.length - 1].id;
                  api.patch(lastId, { color: c }, true);
                  setSelected(lastId);
                } else if (onApplyThemeColor) {
                  onApplyThemeColor(c);
                }
              }}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                color === c ? 'border-[var(--text-primary)] scale-110 shadow-md' : 'border-transparent opacity-80 hover:opacity-100'
              }`}
              style={{ background: c }}
            />
          ))}
          <InfoTip term="color_tool" />
        </div>
        <span className="w-px h-5 bg-[var(--border)] mx-1" />
        <div className="inline-flex items-center">
          <button type="button" className={btn(magnet)} title="自動吸附到最近 K 棒的開高低收" onClick={() => setMagnet(!magnet)}>
            磁吸
          </button>
          <InfoTip term="magnet_tool" />
        </div>
        {(tool !== 'cursor' || draft) && (
          <button
            type="button"
            className="px-2.5 py-1 text-xs rounded-md border border-amber-500/40 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors whitespace-nowrap cursor-pointer"
            onClick={() => setTool('cursor')}
          >
            取消畫線
          </button>
        )}
        <button type="button" className={btn(false)} onClick={undo} title="復原上一步 (Ctrl+Z)">
          復原
        </button>
        <button
          type="button"
          className={`${btn(false)} ${!canDelete ? 'opacity-40 cursor-not-allowed' : 'hover:border-rose-500/50 hover:text-rose-400'}`}
          disabled={!canDelete}
          onClick={removeSelectedOrLast}
          title="刪除選取的線或最後一條畫線 (Delete)"
        >
          刪除
        </button>
        <button
          type="button"
          className={`${btn(false)} ${!canDelete ? 'opacity-40 cursor-not-allowed' : 'hover:border-rose-500/50 hover:text-rose-400'}`}
          disabled={!canDelete}
          onClick={clear}
          title="一鍵清除圖上所有手動畫線"
        >
          清除畫線
        </button>
      </div>

      {toast && (
        <div className="mt-2 px-3 py-1.5 text-xs rounded-md bg-accent/15 border border-accent/30 text-accent font-medium flex items-center gap-1.5 shadow-sm">
          <span>✨</span>
          <span>{toast}</span>
        </div>
      )}

      {tool !== 'cursor' && current && (
        <div className="text-xs text-accent mt-1.5 flex items-center gap-2">
          <span>{current.hint}（再點一次按鈕、按右鍵或點「取消畫線」即可退出；畫完可點「刪除」或「全部清除」消掉）。</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- layer
interface LayerProps {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  bars: BarInfo[];
  api: DrawingsApi;
}

interface Drag {
  id: string;
  mode: 'p1' | 'p2' | 'move';
  idx1: number; idx2: number; price1: number; price2: number;
  startLogical: number; startPrice: number;
  moved: boolean;
}
type Pt = { x: number; y: number };

export function DrawingLayer({ chart, series, bars, api }: LayerProps) {
  const { drawings, tool, draft, setDraft, color, selected, setSelected, magnet, add, patch, remove, removeSelectedOrLast, undo, pushHistory, setTool } = api;
  const svgRef = useRef<SVGSVGElement>(null);
  const [, setTick] = useState(0);
  const dragRef = useRef<Drag | null>(null);
  const drawingsRef = useRef(drawings);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);

  const n = bars.length;
  const step = n > 1 ? (bars[n - 1].ts - bars[0].ts) / (n - 1) : 86400;

  const tsToIdx = useCallback((ts: number) => {
    if (n === 0) return 0;
    if (ts <= bars[0].ts) return (ts - bars[0].ts) / step;
    if (ts >= bars[n - 1].ts) return n - 1 + (ts - bars[n - 1].ts) / step;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (bars[mid].ts <= ts) lo = mid; else hi = mid;
    }
    return lo + (ts - bars[lo].ts) / (bars[hi].ts - bars[lo].ts);
  }, [bars, n, step]);

  const idxToTs = useCallback((idx: number) => {
    if (n === 0) return 0;
    if (idx <= 0) return bars[0].ts + idx * step;
    if (idx >= n - 1) return bars[n - 1].ts + (idx - (n - 1)) * step;
    const lo = Math.floor(idx);
    return bars[lo].ts + (idx - lo) * (bars[lo + 1].ts - bars[lo].ts);
  }, [bars, n, step]);

  const toPx = (a: Anchor): Pt | null => {
    try {
      const x = chart.timeScale().logicalToCoordinate(tsToIdx(a.ts) as Logical);
      const y = series.priceToCoordinate(a.price);
      return x == null || y == null ? null : { x, y };
    } catch { return null; }
  };

  // 圖表被拖曳 / 縮放 / 改價格軸時重畫：事件驅動 + 互動時偵測，平時不佔用 CPU
  useEffect(() => {
    let last = '';
    const update = () => {
      try {
        const r = chart.timeScale().getVisibleLogicalRange();
        const sig = [
          r?.from?.toFixed(2), r?.to?.toFixed(2),
          series.priceToCoordinate(0)?.toFixed(1), series.priceToCoordinate(1000)?.toFixed(1),
          chart.paneSize().height,
          chart.priceScale('left').width(),
          chart.timeScale().width(),
        ].join('|');
        if (sig !== last) { last = sig; setTick(t => t + 1); }
      } catch { /* chart 已被銷毀 */ }
    };

    const handler = () => update();
    try {
      chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
      chart.timeScale().subscribeVisibleTimeRangeChange(handler);
    } catch { /* ignore */ }

    // 僅在使用者滾動或拖曳圖表、以及初次掛載後版面穩定期間維持短暫動畫更新，靜止時完全零 CPU 負擔
    let activeRaf = 0;
    let stopTime = 0;
    const pollLoop = () => {
      update();
      if (Date.now() < stopTime) {
        activeRaf = requestAnimationFrame(pollLoop);
      } else {
        activeRaf = 0;
      }
    };
    const onUserInteraction = () => {
      stopTime = Date.now() + 450;
      if (!activeRaf) {
        activeRaf = requestAnimationFrame(pollLoop);
      }
    };

    // 初次載入或切換週期時啟動 450ms 追蹤，確保 lightweight-charts 完成座標軸寬度與價格縮放後精準對齊 K 棒
    onUserInteraction();

    window.addEventListener('resize', update);
    window.addEventListener('wheel', onUserInteraction, { passive: true });
    window.addEventListener('pointermove', onUserInteraction, { passive: true });

    return () => {
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
        chart.timeScale().unsubscribeVisibleTimeRangeChange(handler);
      } catch { /* ignore */ }
      if (activeRaf) cancelAnimationFrame(activeRaf);
      window.removeEventListener('resize', update);
      window.removeEventListener('wheel', onUserInteraction);
      window.removeEventListener('pointermove', onUserInteraction);
    };
  }, [chart, series]);

  let left = 0, w = 0, h = 0;
  try {
    left = chart.priceScale('left').width();
    w = chart.timeScale().width();
    h = chart.paneSize().height;
  } catch { /* disposed */ }

  // ---- 滑鼠座標 -> 錨點
  const eventPoint = (clientX: number, clientY: number): Pt | null => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : null;
  };

  const ptToAnchor = (p: Pt, snap: boolean): Anchor | null => {
    try {
      const logical = chart.timeScale().coordinateToLogical(p.x);
      let price = series.coordinateToPrice(p.y);
      if (logical == null || price == null) return null;
      let idx = logical as number;
      if (snap && magnet && n > 0) {
        const bi = Math.round(idx);
        if (bi >= 0 && bi < n) {
          const b = bars[bi];
          let best: { price: number; d: number } | null = null;
          for (const c of [b.open, b.high, b.low, b.close]) {
            const cy = series.priceToCoordinate(c);
            if (cy != null && (best === null || Math.abs(cy - p.y) < best.d)) best = { price: c, d: Math.abs(cy - p.y) };
          }
          if (best && best.d < 14) { price = best.price as typeof price; idx = bi; }
        }
      }
      return { ts: idxToTs(idx), price: price as number };
    } catch { return null; }
  };

  // ---- 建立新線
  const onCanvasDown = (e: React.PointerEvent) => {
    if (tool === 'cursor') return;
    const p = eventPoint(e.clientX, e.clientY);
    const a = p && ptToAnchor(p, true);
    if (!a) return;
    if (!TWO_POINT.includes(tool)) {
      add({ id: newId(), type: tool as Exclude<Tool, 'cursor'>, color, p1: a });
      setTool('cursor');
      return;
    }
    if (!draft) {
      setDraft({ type: tool as Exclude<Tool, 'cursor'>, p1: a, cursor: a });
    } else {
      if (Math.abs(a.ts - draft.p1.ts) > 0 || Math.abs(a.price - draft.p1.price) > 0) {
        const id = newId();
        add({ id, type: draft.type, color, p1: draft.p1, p2: a });
        setSelected(id);
      }
      setDraft(null);
      setTool('cursor');
    }
  };

  const onCanvasMove = (e: React.PointerEvent) => {
    if (!draft) return;
    const p = eventPoint(e.clientX, e.clientY);
    const a = p && ptToAnchor(p, true);
    if (a) setDraft({ ...draft, cursor: a });
  };

  // ---- 拖曳既有線 / 錨點
  const startDrag = (e: React.PointerEvent, d: Drawing, mode: Drag['mode']) => {
    e.stopPropagation();
    setSelected(d.id);
    const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
    const p = rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : null;
    const a = p && ptToAnchor(p, false);
    const logical = p ? chart.timeScale().coordinateToLogical(p.x) : null;
    if (!p || !a || logical == null) return;
    dragRef.current = {
      id: d.id, mode,
      idx1: tsToIdx(d.p1.ts), idx2: d.p2 ? tsToIdx(d.p2.ts) : 0,
      price1: d.p1.price, price2: d.p2?.price ?? 0,
      startLogical: logical as number, startPrice: a.price, moved: false,
    };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const p = eventPoint(e.clientX, e.clientY);
      if (!p) return;
      if (!drag.moved) { pushHistory(); drag.moved = true; }
      if (drag.mode === 'move') {
        const logical = chart.timeScale().coordinateToLogical(p.x);
        const price = series.coordinateToPrice(p.y);
        if (logical == null || price == null) return;
        const dL = (logical as number) - drag.startLogical;
        const dP = (price as number) - drag.startPrice;
        const cur = drawingsRef.current.find(d => d.id === drag.id);
        patch(drag.id, {
          p1: { ts: idxToTs(drag.idx1 + dL), price: drag.price1 + dP },
          ...(cur?.p2 ? { p2: { ts: idxToTs(drag.idx2 + dL), price: drag.price2 + dP } } : {}),
        });
      } else {
        const a = ptToAnchor(p, true);
        if (a) patch(drag.id, drag.mode === 'p1' ? { p1: a } : { p2: a });
      }
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  });

  // ---- 鍵盤
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'Escape') { setDraft(null); setTool('cursor'); setSelected(null); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeSelectedOrLast(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeSelectedOrLast, undo, setTool, setSelected, setDraft]);

  // ---- 繪製
  const fmt = (v: number) => v.toFixed(2);
  const label = (x: number, y: number, text: string, c: string, anchor: 'start' | 'end' = 'end') => (
    <g pointerEvents="none">
      <rect x={anchor === 'end' ? x - text.length * 6.4 - 8 : x} y={y - 9} width={text.length * 6.4 + 8} height={16} rx={3} fill="rgba(15,17,26,0.85)" />
      <text x={anchor === 'end' ? x - 4 : x + 4} y={y + 3} fontSize={11} fill={c} textAnchor={anchor} fontFamily="monospace">{text}</text>
    </g>
  );

  const renderShape = (d: Drawing, preview = false) => {
    const a = toPx(d.p1);
    const b = d.p2 ? toPx(d.p2) : null;
    if (!a) return null;
    const isSel = !preview && selected === d.id;
    const sw = isSel ? 2.5 : 1.8;
    const common = { stroke: d.color, strokeWidth: sw, fill: 'none', pointerEvents: 'none' as const };
    const hit = (x1: number, y1: number, x2: number, y2: number) => preview ? null : (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={14}
        style={{ pointerEvents: 'stroke', cursor: 'move' }}
        onPointerDown={e => startDrag(e, d, 'move')}
        onDoubleClick={e => { e.stopPropagation(); remove(d.id); }}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); remove(d.id); }}
      />
    );
    let body: React.ReactNode = null;

    if (d.type === 'hline') {
      body = (<>
        <line x1={0} y1={a.y} x2={w} y2={a.y} {...common} />{hit(0, a.y, w, a.y)}
        {label(w, a.y - 10, `${d.title ? d.title + ' ' : ''}${fmt(d.p1.price)}`, d.color)}
      </>);
    } else if (d.type === 'vline') {
      body = (<><line x1={a.x} y1={0} x2={a.x} y2={h} {...common} />{hit(a.x, 0, a.x, h)}</>);
    } else if (b && (d.type === 'trend' || d.type === 'ray')) {
      let ex = b.x, ey = b.y;
      if (d.type === 'ray' && b.x !== a.x) {
        const k = (b.y - a.y) / (b.x - a.x);
        ex = b.x > a.x ? w : 0;
        ey = a.y + k * (ex - a.x);
      }
      const pct = ((d.p2!.price - d.p1.price) / d.p1.price) * 100;
      const cnt = Math.round(tsToIdx(d.p2!.ts) - tsToIdx(d.p1.ts));
      const isAuto = d.id.startsWith('auto-trend-');
      const labelText = d.title
        ? `${d.title} ${fmt(d.p2!.price)} (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`
        : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}% · ${Math.abs(cnt)}根`;
      const isUpper = d.id === 'auto-trend-upper';
      const labelX = isAuto ? Math.min(w - 8, Math.max(120, ex - 4)) : (a.x + b.x) / 2 + 40;
      const labelY = isAuto
        ? Math.min(h - 14, Math.max(16, isUpper ? ey - 10 : ey + 14))
        : (a.y + b.y) / 2 - 12;
      body = (<>
        <line x1={a.x} y1={a.y} x2={ex} y2={ey} {...common} strokeDasharray={isAuto ? '6 3' : undefined} />
        {hit(a.x, a.y, ex, ey)}
        <circle cx={a.x} cy={a.y} r={3.5} fill={d.color} pointerEvents="none" />
        <circle cx={b.x} cy={b.y} r={3.5} fill={d.color} pointerEvents="none" />
        {label(labelX, labelY, labelText, d.color)}
      </>);
    } else if (b && d.type === 'channel') {
      // 上下平行趨勢通道：以 p1->p2 為中心趨勢線，上下各偏移 2.5% 價格形成上軌與下軌
      const offsetPrice = Math.max(d.p1.price, d.p2!.price) * 0.025;
      const aUp = toPx({ ts: d.p1.ts, price: d.p1.price + offsetPrice });
      const bUp = toPx({ ts: d.p2!.ts, price: d.p2!.price + offsetPrice });
      const aLo = toPx({ ts: d.p1.ts, price: d.p1.price - offsetPrice });
      const bLo = toPx({ ts: d.p2!.ts, price: d.p2!.price - offsetPrice });
      if (aUp && bUp && aLo && bLo) {
        const poly = `${aUp.x},${aUp.y} ${bUp.x},${bUp.y} ${bLo.x},${bLo.y} ${aLo.x},${aLo.y}`;
        body = (<>
          <polygon points={poly} fill={d.color} fillOpacity={0.09} pointerEvents="none" />
          <line x1={aUp.x} y1={aUp.y} x2={bUp.x} y2={bUp.y} stroke="#ef4444" strokeWidth={sw} pointerEvents="none" />
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={d.color} strokeWidth={1.2} strokeDasharray="4 4" pointerEvents="none" />
          <line x1={aLo.x} y1={aLo.y} x2={bLo.x} y2={bLo.y} stroke="#22c55e" strokeWidth={sw} pointerEvents="none" />
          {hit(a.x, a.y, b.x, b.y)}
          {label(bUp.x, bUp.y - 8, `通道上軌 ${fmt(d.p2!.price + offsetPrice)}`, '#ef4444')}
          {label(bLo.x, bLo.y + 14, `通道下軌 ${fmt(d.p2!.price - offsetPrice)}`, '#22c55e')}
        </>);
      }
    } else if (b && d.type === 'rect') {
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), rw = Math.abs(a.x - b.x), rh = Math.abs(a.y - b.y);
      body = (<>
        <rect x={x} y={y} width={rw} height={rh} stroke={d.color} strokeWidth={sw} fill={d.color} fillOpacity={0.12} pointerEvents="none" />
        {!preview && <rect x={x} y={y} width={rw} height={rh} fill="none" stroke="transparent" strokeWidth={12}
          style={{ pointerEvents: 'stroke', cursor: 'move' }} onPointerDown={e => startDrag(e, d, 'move')} />}
        {label(x + rw, y - 10, `${fmt(Math.max(d.p1.price, d.p2!.price))} / ${fmt(Math.min(d.p1.price, d.p2!.price))}`, d.color)}
      </>);
    } else if (b && d.type === 'fib') {
      const x1 = Math.min(a.x, b.x), x2 = Math.max(a.x, b.x);
      const hi = d.p1.price, lo = d.p2!.price;
      body = (<>
        {FIB_LEVELS.map(lv => {
          const price = lo + (hi - lo) * lv;       // 0 = 終點、1 = 起點
          const y = series.priceToCoordinate(price);
          if (y == null) return null;
          return (
            <g key={lv}>
              <line x1={x1} y1={y} x2={x2} y2={y} stroke={d.color} strokeWidth={lv === 0.618 ? 2 : 1} strokeOpacity={lv === 0.5 || lv === 0.618 ? 1 : 0.65} pointerEvents="none" />
              {!preview && <line x1={x1} y1={y} x2={x2} y2={y} stroke="transparent" strokeWidth={10} style={{ pointerEvents: 'stroke', cursor: 'move' }}
                onPointerDown={e => startDrag(e, d, 'move')} />}
              {label(x2, y - 9, `${lv} (${fmt(price)})`, d.color)}
            </g>
          );
        })}
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={d.color} strokeWidth={1} strokeDasharray="4 4" pointerEvents="none" />
      </>);
    }

    return (
      <g key={d.id} opacity={preview ? 0.7 : 1}>
        {body}
        {isSel && <>
          <circle cx={a.x} cy={a.y} r={5} fill="#fff" stroke={d.color} strokeWidth={2} style={{ cursor: 'grab' }} onPointerDown={e => startDrag(e, d, 'p1')} />
          {b && <circle cx={b.x} cy={b.y} r={5} fill="#fff" stroke={d.color} strokeWidth={2} style={{ cursor: 'grab' }} onPointerDown={e => startDrag(e, d, 'p2')} />}
        </>}
      </g>
    );
  };

  const drawingMode = tool !== 'cursor';
  return (
    <svg
      ref={svgRef}
      className="absolute"
      style={{ left, top: 0, width: w, height: h, zIndex: 5, pointerEvents: 'none', overflow: 'hidden' }}
    >
      {drawings.map(d => renderShape(d))}
      {draft?.cursor && renderShape({ id: 'draft', type: draft.type, color, p1: draft.p1, p2: draft.cursor }, true)}
      {drawingMode && (
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill="transparent"
          style={{ pointerEvents: 'all', cursor: 'crosshair' }}
          onPointerDown={onCanvasDown}
          onPointerMove={onCanvasMove}
          onContextMenu={e => {
            e.preventDefault();
            setTool('cursor');
          }}
        />
      )}
    </svg>
  );
}
