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

export type Tool = 'cursor' | 'trend' | 'ray' | 'hline' | 'vline' | 'fib' | 'rect';
export interface Anchor { ts: number; price: number }
export interface Drawing {
  id: string;
  type: Exclude<Tool, 'cursor'>;
  color: string;
  title?: string;   // 例如 AI 產生的「支撐 1」
  p1: Anchor;
  p2?: Anchor;
}
export interface BarInfo { ts: number; open: number; high: number; low: number; close: number }

interface Store { d: Drawing[]; i: Drawing[] }

const TWO_POINT: Tool[] = ['trend', 'ray', 'fib', 'rect'];
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const COLORS = ['#f59e0b', '#6366f1', '#ef4444', '#22c55e', '#e5e7eb'];

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'cursor', label: '選取', hint: '選取 / 拖曳已畫的線' },
  { id: 'trend', label: '趨勢線', hint: '點兩下：起點、終點' },
  { id: 'ray', label: '射線', hint: '點兩下，向右無限延伸（常用於壓力/支撐趨勢線）' },
  { id: 'hline', label: '水平線', hint: '點一下，標記支撐或壓力價位' },
  { id: 'vline', label: '垂直線', hint: '點一下，標記重要日期' },
  { id: 'fib', label: '斐波那契', hint: '點兩下：波段起點與終點' },
  { id: 'rect', label: '矩形', hint: '點兩下：標記區間（盤整區、缺口）' },
];

const storageKey = (symbol: string) => `chart_drawings:${symbol}`;

function loadStore(symbol: string): Store {
  try {
    const raw = localStorage.getItem(storageKey(symbol));
    if (raw) {
      const p = JSON.parse(raw);
      return { d: Array.isArray(p.d) ? p.d : [], i: Array.isArray(p.i) ? p.i : [] };
    }
  } catch { /* localStorage 不可用就當作沒有 */ }
  return { d: [], i: [] };
}

function saveStore(symbol: string, store: Store) {
  try { localStorage.setItem(storageKey(symbol), JSON.stringify(store)); } catch { /* ignore */ }
}

const newId = () => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------- state hook
export function useDrawings(symbol: string, intraday: boolean) {
  const cls: keyof Store = intraday ? 'i' : 'd';
  const [store, setStore] = useState<Store>(() => loadStore(symbol));
  const storeRef = useRef(store);
  const histRef = useRef<{ cls: keyof Store; list: Drawing[] }[]>([]);
  const [tool, setTool] = useState<Tool>('cursor');
  const [color, setColor] = useState(COLORS[0]);
  const [selected, setSelected] = useState<string | null>(null);
  const [magnet, setMagnet] = useState(true);

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
  const remove = useCallback((id: string) => { update(l => l.filter(d => d.id !== id)); setSelected(null); }, [update]);
  // 以 AI 計算的支撐/壓力取代舊的 AI 線（id 以 ai- 開頭），不進復原堆疊
  const setAiLines = useCallback((lines: { price: number; color: string; title: string }[], ts: number) => {
    update(l => [
      ...l.filter(d => !d.id.startsWith('ai-')),
      ...lines.map((x, i): Drawing => ({ id: `ai-${i}`, type: 'hline', color: x.color, title: x.title, p1: { ts, price: x.price } })),
    ], false);
  }, [update]);
  const clear = useCallback(() => { update(() => []); setSelected(null); }, [update]);
  const undo = useCallback(() => {
    const last = histRef.current.pop();
    if (!last) return;
    const next = { ...storeRef.current, [last.cls]: last.list };
    storeRef.current = next;
    setStore(next);
    saveStore(symbol, next);
    setSelected(null);
  }, [symbol]);

  return {
    drawings: store[cls], tool, setTool, color, setColor, selected, setSelected, magnet, setMagnet,
    add, patch, remove, clear, undo, pushHistory, setAiLines,
  };
}

export type DrawingsApi = ReturnType<typeof useDrawings>;

// ---------------------------------------------------------------- toolbar
export function DrawingToolbar({ api }: { api: DrawingsApi }) {
  const { tool, setTool, color, setColor, selected, remove, clear, undo, magnet, setMagnet, drawings, setSelected } = api;
  const btn = (active: boolean) =>
    `px-2.5 py-1 text-xs rounded-md border transition-colors whitespace-nowrap ${
      active ? 'border-[var(--accent)] text-accent bg-[var(--accent)]/10' : 'border-[var(--border)] text-secondary hover:text-primary'}`;
  const current = TOOLS.find(t => t.id === tool);

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-secondary mr-1">畫線</span>
        {TOOLS.map(t => (
          <button key={t.id} title={t.hint} className={btn(tool === t.id)}
            onClick={() => { setTool(t.id); setSelected(null); }}>{t.label}</button>
        ))}
        <span className="w-px h-5 bg-[var(--border)] mx-1" />
        {COLORS.map(c => (
          <button key={c} aria-label={`顏色 ${c}`} onClick={() => {
            setColor(c);
            if (selected) api.patch(selected, { color: c }, true);
          }}
            className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
            style={{ background: c }} />
        ))}
        <span className="w-px h-5 bg-[var(--border)] mx-1" />
        <button className={btn(magnet)} title="自動吸附到最近 K 棒的開高低收" onClick={() => setMagnet(!magnet)}>磁吸</button>
        <button className={btn(false)} onClick={undo} title="復原 (Ctrl+Z)">復原</button>
        <button className={btn(false)} disabled={!selected} onClick={() => selected && remove(selected)} title="刪除選取 (Delete)">刪除</button>
        <button className={btn(false)} disabled={!drawings.length}
          onClick={() => { if (window.confirm('清除這檔股票在此圖上的所有畫線？')) clear(); }}>全部清除</button>
      </div>
      {tool !== 'cursor' && current && (
        <div className="text-xs text-secondary mt-1.5">{current.hint}。按 Esc 取消。</div>
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

interface Draft { type: Exclude<Tool, 'cursor'>; p1: Anchor; cursor: Anchor | null }
interface Drag {
  id: string;
  mode: 'p1' | 'p2' | 'move';
  idx1: number; idx2: number; price1: number; price2: number;
  startLogical: number; startPrice: number;
  moved: boolean;
}
type Pt = { x: number; y: number };

export function DrawingLayer({ chart, series, bars, api }: LayerProps) {
  const { drawings, tool, color, selected, setSelected, magnet, add, patch, remove, undo, pushHistory, setTool } = api;
  const svgRef = useRef<SVGSVGElement>(null);
  const [, setTick] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
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
        ].join('|');
        if (sig !== last) { last = sig; setTick(t => t + 1); }
      } catch { /* chart 已被銷毀 */ }
    };

    const handler = () => update();
    try {
      chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
      chart.timeScale().subscribeVisibleTimeRangeChange(handler);
    } catch { /* ignore */ }

    // 僅在使用者滾動或拖曳圖表時維持短暫動畫更新，靜止時完全零 CPU 負擔
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
      stopTime = Date.now() + 400;
      if (!activeRaf) {
        activeRaf = requestAnimationFrame(pollLoop);
      }
    };

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
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) { e.preventDefault(); remove(selected); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, remove, undo, setTool, setSelected]);

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
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={12} style={{ pointerEvents: 'stroke', cursor: 'move' }}
        onPointerDown={e => startDrag(e, d, 'move')} />
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
      body = (<>
        <line x1={a.x} y1={a.y} x2={ex} y2={ey} {...common} />{hit(a.x, a.y, ex, ey)}
        {label((a.x + b.x) / 2 + 40, (a.y + b.y) / 2 - 12, `${pct > 0 ? '+' : ''}${pct.toFixed(2)}% · ${Math.abs(cnt)}根`, d.color)}
      </>);
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
        <rect x={0} y={0} width={w} height={h} fill="transparent" style={{ pointerEvents: 'all', cursor: 'crosshair' }}
          onPointerDown={onCanvasDown} onPointerMove={onCanvasMove} />
      )}
    </svg>
  );
}
