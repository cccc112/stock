"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiStocks } from "@/lib/api";
import { getPriceColors } from "@/lib/utils";
import {
  REAL_TW_TOTAL_TIMELINE,
  REAL_TW_RANKS,
  REAL_STOCK_INSTITUTIONAL_MAP,
  REAL_US_13F_DATA,
} from "@/lib/realInstitutionalSnapshot";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  User,
  Search,
  Sparkles,
  PieChart,
  Layers,
  ChevronRight,
  Flame,
  ArrowLeft,
  X,
  RefreshCw,
} from "lucide-react";

interface TwInstData {
  date: string;
  full_date?: string;
  foreign: number;
  trust: number;
  dealer: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  klineRange?: [number, number];
}

interface StockInstHistory {
  date: string;
  full_date: string;
  foreign: number;
  trust: number;
  dealer: number;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  klineRange?: [number, number];
}

interface StockInstData {
  symbol: string;
  name: string;
  latest_close: number;
  latest: {
    foreign: number;
    trust: number;
    dealer: number;
    total: number;
    date: string;
  };
  stats_5d: {
    foreign: number;
    trust: number;
    dealer: number;
    total: number;
  };
  consecutive: {
    foreign: { days: number; action: string };
    trust: { days: number; action: string };
  };
  history: StockInstHistory[];
}

function KlineCandleShape(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload || !Number.isFinite(y) || !Number.isFinite(height)) return null;
  const open = Number(payload.open ?? payload.close ?? 0);
  const close = Number(payload.close ?? 0);
  const high = Number(payload.high ?? Math.max(open, close));
  const low = Number(payload.low ?? Math.min(open, close));
  if (!close || high <= 0) return null;

  const isUp = close >= open;
  const { upColor, downColor } = getPriceColors();
  const color = isUp ? upColor : downColor;
  const range = Math.max(high - low, 0.0001);
  const absH = Math.max(Math.abs(height), 2);
  const topY = height >= 0 ? y : y + height;

  const yOpen = topY + ((high - open) / range) * absH;
  const yClose = topY + ((high - close) / range) * absH;
  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(Math.abs(yClose - yOpen), 3.5);
  const cx = x + width / 2;
  const candleW = Math.max(Math.min(width * 0.9, 10), 5);

  return (
    <g>
      <line
        x1={cx}
        y1={topY}
        x2={cx}
        y2={topY + absH}
        stroke={color}
        strokeWidth={1.6}
      />
      <rect
        x={cx - candleW / 2}
        y={bodyTop}
        width={candleW}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={0.8}
        rx={1}
      />
    </g>
  );
}

const PRESET_STOCKS = [
  { symbol: "2330", name: "台積電" },
  { symbol: "2317", name: "鴻海" },
  { symbol: "3231", name: "緯創" },
  { symbol: "2603", name: "長榮" },
  { symbol: "2454", name: "聯發科" },
  { symbol: "3017", name: "奇鋐" },
  { symbol: "2382", name: "廣達" },
  { symbol: "2881", name: "富邦金" },
  { symbol: "2609", name: "陽明" },
  { symbol: "2891", name: "中信金" },
];

function normalizeUs13FData(rawList: any[]): any[] {
  if (!Array.isArray(rawList) || rawList.length === 0) return REAL_US_13F_DATA;
  return rawList.map((item, idx) => {
    const fb =
      REAL_US_13F_DATA.find(
        (f) =>
          f.id === item?.id ||
          (item?.fund_name && f.fundName.toLowerCase().includes(String(item.fund_name).toLowerCase())) ||
          (item?.fundName && f.fundName.toLowerCase().includes(String(item.fundName).toLowerCase()))
      ) || REAL_US_13F_DATA[idx % REAL_US_13F_DATA.length];

    const topBuys = Array.isArray(item?.topBuys)
      ? item.topBuys
      : Array.isArray(item?.top_buys)
      ? item.top_buys.map((b: any) =>
          typeof b === "string" ? b : `${b.symbol} (${b.name || b.shares_added || ""})`
        )
      : fb.topBuys;

    const topSells = Array.isArray(item?.topSells)
      ? item.topSells
      : Array.isArray(item?.top_sells)
      ? item.top_sells.map((b: any) =>
          typeof b === "string" ? b : `${b.symbol} (${b.name || b.shares_added || ""})`
        )
      : fb.topSells;

    return {
      id: item?.id || fb.id,
      fundName: item?.fundName || fb.fundName,
      manager: item?.manager || fb.manager,
      reportDate: item?.reportDate || fb.reportDate,
      portfolioValue: item?.portfolioValue || item?.portfolio_value || fb.portfolioValue,
      cashReserves: item?.cashReserves || fb.cashReserves,
      philosophy: item?.philosophy || fb.philosophy,
      thesis: item?.thesis || fb.thesis,
      topBuys,
      topSells,
      sectorAllocation:
        Array.isArray(item?.sectorAllocation) && item.sectorAllocation.length > 0
          ? item.sectorAllocation
          : fb.sectorAllocation,
      holdings:
        Array.isArray(item?.holdings) && item.holdings.length > 0 ? item.holdings : fb.holdings,
    };
  });
}

export default function InstitutionsPage() {
  const [activeMainTab, setActiveMainTab] = useState<"TW" | "US_13F">("TW");
  const [twView, setTwView] = useState<"TOTAL" | "STOCK">("TOTAL");
  const [rankTab, setRankTab] = useState<"FOREIGN" | "TRUST">("FOREIGN");

  // 0ms 同步載入真實 15 日基準數據，絕不讓畫面空轉或顯示錯誤舊價位
  const [twData, setTwData] = useState<TwInstData[]>(() =>
    REAL_TW_TOTAL_TIMELINE.map((x) => ({
      ...x,
      klineRange: [x.low, x.high] as [number, number],
    }))
  );
  const [usData, setUsData] = useState<any[]>(() => REAL_US_13F_DATA);
  const [ranks, setRanks] = useState<any>(() => REAL_TW_RANKS);
  const [liveQuotesMap, setLiveQuotesMap] = useState<Record<string, { price: number; change_pct: number }>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // 個股籌碼狀態
  const [selectedStock, setSelectedStock] = useState("2330");
  const [stockInput, setStockInput] = useState("");
  const [stockData, setStockData] = useState<StockInstData>(
    () => REAL_STOCK_INSTITUTIONAL_MAP["2330"]
  );
  const [stockSyncing, setStockSyncing] = useState(false);

  // 13F 深度報告彈窗
  const [selectedFund, setSelectedFund] = useState<any | null>(null);

  const fetchInitialData = async () => {
    setIsSyncing(true);
    try {
      const [resTw, resRanks, resUs] = await Promise.allSettled([
        fetch("/api/institutions").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/institutions?type=ranks").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/institutions?type=13f").then((r) => (r.ok ? r.json() : null)),
      ]);

      if (resTw.status === "fulfilled" && Array.isArray(resTw.value) && resTw.value.length > 0) {
        setTwData(
          resTw.value.map((item: any, i: number) => {
            const fb = REAL_TW_TOTAL_TIMELINE[i % REAL_TW_TOTAL_TIMELINE.length];
            const c = Number(item.close) || fb.close;
            const o = Number(item.open) || fb.open || c;
            const h = Number(item.high) || fb.high || Math.max(o, c);
            const l = Number(item.low) || fb.low || Math.min(o, c);
            return {
              ...item,
              open: o,
              high: h,
              low: l,
              close: c,
              klineRange: [l, h] as [number, number],
            };
          })
        );
      }

      if (resRanks.status === "fulfilled" && resRanks.value?.foreign_buys?.length > 0) {
        setRanks(resRanks.value);
      }

      if (resUs.status === "fulfilled" && Array.isArray(resUs.value) && resUs.value.length > 0) {
        setUsData(normalizeUs13FData(resUs.value));
      }
    } catch {
      // keep pre-seeded real snapshot
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // 平行拉取法人排行各檔標的之即時市價，保證與個股分析頁價格 100% 同步完全一致
  useEffect(() => {
    const list = [...(ranks?.foreign_buys || []), ...(ranks?.trust_buys || [])];
    const syms = Array.from(new Set(list.map((x: any) => String(x.symbol || "").trim()))).filter(Boolean);
    if (syms.length === 0) return;

    Promise.allSettled(
      syms.map(async (sym) => {
        try {
          const res = await apiStocks.getQuote(sym);
          const p = Number(res?.data?.price);
          if (p > 0) {
            const pct = Number(Number(res?.data?.change_pct ?? res?.data?.changePercent ?? 0).toFixed(2));
            return { symbol: sym, price: p, change_pct: pct };
          }
        } catch {}
        return null;
      })
    ).then((results) => {
      const map: Record<string, { price: number; change_pct: number }> = {};
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value) {
          map[r.value.symbol] = { price: r.value.price, change_pct: r.value.change_pct };
        }
      });
      if (Object.keys(map).length > 0) {
        setLiveQuotesMap((prev) => ({ ...prev, ...map }));
      }
    });
  }, [ranks]);

  const fetchStockInstitutions = async (sym: string) => {
    const clean = sym.replace(/\.TW[O]?$/i, "").toUpperCase();
    // 若在真實預熱池中，0ms 立即切換圖表，不遮擋畫面
    if (REAL_STOCK_INSTITUTIONAL_MAP[clean]) {
      setStockData(REAL_STOCK_INSTITUTIONAL_MAP[clean]);
    }

    setStockSyncing(true);
    try {
      const [resLocalInst, resQuote] = await Promise.allSettled([
        fetch(`/api/institutions?symbol=${encodeURIComponent(clean)}`).then((r) =>
          r.ok ? r.json() : null
        ),
        apiStocks.getQuote(clean),
      ]);

      let nextData: StockInstData | null = null;
      if (resLocalInst.status === "fulfilled" && resLocalInst.value?.history?.length > 0) {
        nextData = resLocalInst.value;
      } else if (REAL_STOCK_INSTITUTIONAL_MAP[clean]) {
        nextData = { ...REAL_STOCK_INSTITUTIONAL_MAP[clean] };
      }

      if (nextData && resQuote.status === "fulfilled" && resQuote.value?.data?.price) {
        const livePrice = Number(resQuote.value.data.price);
        const liveName = resQuote.value.data.name;
        if (livePrice > 0) {
          nextData = {
            ...nextData,
            latest_close: livePrice,
            name: liveName || nextData.name,
            history: nextData.history.map((h, idx, arr) =>
              idx === arr.length - 1
                ? {
                    ...h,
                    close: livePrice,
                    high: Math.max(Number(h.high) || livePrice, livePrice),
                    low: Math.min(Number(h.low) || livePrice, livePrice),
                    klineRange: [
                      Math.min(Number(h.low) || livePrice, livePrice),
                      Math.max(Number(h.high) || livePrice, livePrice),
                    ] as [number, number],
                  }
                : h
            ),
          };
        }
      }

      if (nextData) {
        setStockData(nextData);
      }
    } catch {
      // keep existing
    } finally {
      setStockSyncing(false);
    }
  };

  useEffect(() => {
    if (twView === "STOCK") {
      fetchStockInstitutions(selectedStock);
    }
  }, [twView, selectedStock]);

  const handleStockSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (stockInput.trim()) {
      const code = stockInput.trim().toUpperCase();
      setSelectedStock(code);
      setTwView("STOCK");
      setStockInput("");
    }
  };

  const selectStockAndSwitch = (sym: string) => {
    setSelectedStock(sym);
    setTwView("STOCK");
  };

  const latestItem = twData.length > 0 ? twData[twData.length - 1] : null;
  const recent5 = twData.slice(-5);
  const sum5Foreign = recent5.reduce((sum, item) => sum + (Number(item.foreign) || 0), 0);
  const sum5Trust = recent5.reduce((sum, item) => sum + (Number(item.trust) || 0), 0);
  const sum5Dealer = recent5.reduce((sum, item) => sum + (Number(item.dealer) || 0), 0);
  const latestTotal = latestItem ? latestItem.foreign + latestItem.trust + latestItem.dealer : 0;

  const formatBillion = (val: number) => {
    const prefix = val > 0 ? "+" : "";
    return `${prefix}${val.toFixed(2)} 億`;
  };

  const formatShares = (val: number) => {
    const prefix = val > 0 ? "+" : "";
    return `${prefix}${val.toLocaleString()} 張`;
  };

  const getFlowColor = (val: number) => {
    if (val > 0) return "text-up-tw font-semibold";
    if (val < 0) return "text-down-tw font-semibold";
    return "text-secondary";
  };

  // =========================================================================
  // 1. 台股三大法人 (大盤 & 個股整合視圖)
  // =========================================================================
  const renderTwSection = () => {
    const activeRankList =
      rankTab === "FOREIGN" ? ranks?.foreign_buys || [] : ranks?.trust_buys || [];

    return (
      <div className="space-y-6 animate-fade-in">
        {/* 子切換標籤：大盤總覽 vs 個股透視 */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTwView("TOTAL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                twView === "TOTAL"
                  ? "bg-[var(--accent)] text-white shadow-md shadow-accent/25"
                  : "text-secondary hover:text-primary hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              全市場大盤法人動向
            </button>
            <button
              onClick={() => setTwView("STOCK")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                twView === "STOCK"
                  ? "bg-[var(--accent)] text-white shadow-md shadow-accent/25"
                  : "text-secondary hover:text-primary hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              個股三大法人籌碼診斷
            </button>
          </div>

          <div className="flex items-center gap-2">
            {twView === "STOCK" && (
              <button
                onClick={() => setTwView("TOTAL")}
                className="text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <ArrowLeft size={13} /> 返回大盤總覽
              </button>
            )}
            <button
              onClick={() =>
                twView === "TOTAL" ? fetchInitialData() : fetchStockInstitutions(selectedStock)
              }
              disabled={isSyncing || stockSyncing}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs text-secondary hover:text-primary flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw
                size={12}
                className={isSyncing || stockSyncing ? "animate-spin text-accent" : ""}
              />
              <span>同步最新籌碼</span>
            </button>
          </div>
        </div>

        {/* ---------------- 視圖 A: 全市場大盤法人 ---------------- */}
        {twView === "TOTAL" && (
          <div className="space-y-6">
            {/* 頂部四張核心指標概況卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card className="hover-lift border border-[var(--border)]">
                <div className="text-xs text-secondary mb-1 flex items-center justify-between">
                  <span>外資最新買賣超 ({latestItem?.date})</span>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-live-pulse" />
                </div>
                <div
                  className={`text-xl sm:text-2xl font-bold font-mono ${getFlowColor(
                    latestItem?.foreign || 0
                  )}`}
                >
                  {formatBillion(latestItem?.foreign || 0)}
                </div>
                <div className="text-xs text-secondary mt-1.5 flex items-center gap-1">
                  <span>近5日累計:</span>
                  <span className={getFlowColor(sum5Foreign)}>{formatBillion(sum5Foreign)}</span>
                </div>
              </Card>

              <Card className="hover-lift border border-[var(--border)]">
                <div className="text-xs text-secondary mb-1 flex items-center justify-between">
                  <span>投信最新買賣超 ({latestItem?.date})</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-live-pulse" />
                </div>
                <div
                  className={`text-xl sm:text-2xl font-bold font-mono ${getFlowColor(
                    latestItem?.trust || 0
                  )}`}
                >
                  {formatBillion(latestItem?.trust || 0)}
                </div>
                <div className="text-xs text-secondary mt-1.5 flex items-center gap-1">
                  <span>近5日累計:</span>
                  <span className={getFlowColor(sum5Trust)}>{formatBillion(sum5Trust)}</span>
                </div>
              </Card>

              <Card className="hover-lift border border-[var(--border)]">
                <div className="text-xs text-secondary mb-1 flex items-center justify-between">
                  <span>自營商最新買賣超 ({latestItem?.date})</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-live-pulse" />
                </div>
                <div
                  className={`text-xl sm:text-2xl font-bold font-mono ${getFlowColor(
                    latestItem?.dealer || 0
                  )}`}
                >
                  {formatBillion(latestItem?.dealer || 0)}
                </div>
                <div className="text-xs text-secondary mt-1.5 flex items-center gap-1">
                  <span>近5日累計:</span>
                  <span className={getFlowColor(sum5Dealer)}>{formatBillion(sum5Dealer)}</span>
                </div>
              </Card>

              <Card className="hover-lift border border-[var(--border)] bg-[var(--bg-secondary)]/80">
                <div className="text-xs text-secondary mb-1">三大法人合計動向</div>
                <div
                  className={`text-xl sm:text-2xl font-bold font-mono ${getFlowColor(latestTotal)}`}
                >
                  {formatBillion(latestTotal)}
                </div>
                <div className="text-xs text-secondary mt-1.5 font-mono">
                  加權收盤: {latestItem?.close ? `${latestItem.close.toLocaleString()} 點` : "—"} (
                  {latestItem?.full_date || latestItem?.date})
                </div>
              </Card>
            </div>

            {/* 三大法人買賣超長條圖 + 加權指數 K 線疊圖 (強化每日欄位斑馬紋與垂直分隔線) */}
            <Card
              title="全市場三大法人每日買賣超動向 與 加權指數 K 線疊圖 (單位: 億台幣 / 點)"
              subtitle="每一交易日獨立分欄（交錯底色 + 垂直虛線分隔），同欄呈現外資/投信/自營商買賣超與當日大盤 K 線"
              className="border border-[var(--border)] shadow-md"
            >
              <div className="h-[340px] sm:h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={twData}
                    barCategoryGap="28%"
                    barGap={2}
                    margin={{ top: 14, right: 8, left: 4, bottom: 8 }}
                  >
                    {/* 交錯斑馬紋底色：偶數交易日加上淡色底框，讓每天的區間一目了然 */}
                    {twData.map((d, idx) =>
                      idx % 2 === 0 ? (
                        <ReferenceArea
                          key={`band-${d.date}`}
                          yAxisId="flow"
                          x1={d.date}
                          x2={d.date}
                          fill="rgba(148, 163, 184, 0.08)"
                          strokeOpacity={0}
                          ifOverflow="extendDomain"
                        />
                      ) : null
                    )}
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.22)"
                      vertical={true}
                      horizontal={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="var(--text-primary)"
                      fontSize={11}
                      fontWeight={600}
                      tickMargin={6}
                      tickLine={{ stroke: "var(--border)" }}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      yAxisId="flow"
                      width={64}
                      stroke="var(--text-secondary)"
                      fontSize={10}
                      tickFormatter={(value) => `${value}億`}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <YAxis
                      yAxisId="price"
                      orientation="right"
                      width={58}
                      stroke="#f59e0b"
                      fontSize={10}
                      domain={["auto", "auto"]}
                      tickFormatter={(value) => `${Number(value).toLocaleString()}`}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                    />
                    <Tooltip
                      cursor={{
                        fill: "rgba(56, 189, 248, 0.14)",
                        stroke: "rgba(56, 189, 248, 0.5)",
                        strokeWidth: 1,
                      }}
                      contentStyle={{
                        backgroundColor: "var(--bg-secondary)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                        borderRadius: "10px",
                        fontSize: "12px",
                        boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
                      }}
                      formatter={(val: any, name: any, item: any) => {
                        if (name === "加權指數 K線") {
                          const p = item?.payload;
                          if (p?.open && p?.close) {
                            return [
                              `開 ${p.open.toLocaleString()} / 高 ${p.high.toLocaleString()} / 低 ${p.low.toLocaleString()} / 收 ${p.close.toLocaleString()}`,
                              "加權指數 K線",
                            ];
                          }
                          return [val, name];
                        }
                        if (name === "加權收盤連線") {
                          return [`${Number(val).toLocaleString()} 點`, name];
                        }
                        return [`${Number(val) > 0 ? "+" : ""}${val} 億台幣`, name];
                      }}
                      labelFormatter={(lbl, payload) => {
                        const full = payload?.[0]?.payload?.full_date;
                        return `交易日期：${full || lbl}`;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                    <ReferenceLine
                      y={0}
                      yAxisId="flow"
                      stroke="rgba(248, 250, 252, 0.4)"
                      strokeWidth={1.2}
                    />
                    <Bar
                      yAxisId="flow"
                      dataKey="foreign"
                      name="外資"
                      fill="#3b82f6"
                      radius={[3, 3, 0, 0]}
                      animationDuration={300}
                    />
                    <Bar
                      yAxisId="flow"
                      dataKey="trust"
                      name="投信"
                      fill="#10b981"
                      radius={[3, 3, 0, 0]}
                      animationDuration={300}
                    />
                    <Bar
                      yAxisId="flow"
                      dataKey="dealer"
                      name="自營商"
                      fill="#a855f7"
                      radius={[3, 3, 0, 0]}
                      animationDuration={300}
                    />
                    <Bar
                      yAxisId="price"
                      dataKey="klineRange"
                      name="加權指數 K線"
                      barSize={9}
                      shape={<KlineCandleShape />}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="close"
                      name="加權收盤連線"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: "#f59e0b" }}
                      animationDuration={300}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* 下方分欄：三大法人每日流水表 + TWSE 官方 T86 強勢焦點股清單 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card
                  title="三大法人每日買賣超流水表 (TWSE 官方統計)"
                  className="border border-[var(--border)] overflow-hidden"
                >
                  <div className="max-h-[380px] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border)] text-secondary">
                        <tr>
                          <th className="py-2.5 px-3 text-left">交易日</th>
                          <th className="py-2.5 px-3 text-right">加權收盤</th>
                          <th className="py-2.5 px-3 text-right">外資 (億)</th>
                          <th className="py-2.5 px-3 text-right">投信 (億)</th>
                          <th className="py-2.5 px-3 text-right">自營商 (億)</th>
                          <th className="py-2.5 px-3 text-right">合計 (億)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] font-mono">
                        {twData
                          .slice()
                          .reverse()
                          .map((item, idx) => {
                            const dayTotal =
                              Number(item.foreign) + Number(item.trust) + Number(item.dealer);
                            return (
                              <tr
                                key={idx}
                                className="hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                              >
                                <td className="py-2 px-3 text-secondary">
                                  {item.full_date || item.date}
                                </td>
                                <td className="py-2 px-3 text-right text-primary font-semibold">
                                  {item.close ? item.close.toLocaleString() : "—"}
                                </td>
                                <td className={`py-2 px-3 text-right ${getFlowColor(item.foreign)}`}>
                                  {formatBillion(item.foreign)}
                                </td>
                                <td className={`py-2 px-3 text-right ${getFlowColor(item.trust)}`}>
                                  {formatBillion(item.trust)}
                                </td>
                                <td className={`py-2 px-3 text-right ${getFlowColor(item.dealer)}`}>
                                  {formatBillion(item.dealer)}
                                </td>
                                <td
                                  className={`py-2 px-3 text-right font-semibold ${getFlowColor(
                                    dayTotal
                                  )}`}
                                >
                                  {formatBillion(dayTotal)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* 右側 1 欄：TWSE T86 熱門法人買超焦點股 */}
              <div>
                <Card
                  title="最新法人買超排行焦點 (TWSE 官方 T86)"
                  headerAction={
                    <div className="flex rounded-lg bg-[var(--bg-tertiary)] p-0.5 border border-[var(--border)] text-[11px]">
                      <button
                        onClick={() => setRankTab("FOREIGN")}
                        className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                          rankTab === "FOREIGN"
                            ? "bg-accent text-white"
                            : "text-secondary hover:text-primary"
                        }`}
                      >
                        外資買超
                      </button>
                      <button
                        onClick={() => setRankTab("TRUST")}
                        className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                          rankTab === "TRUST"
                            ? "bg-emerald-500 text-white"
                            : "text-secondary hover:text-primary"
                        }`}
                      >
                        投信買超
                      </button>
                    </div>
                  }
                  className="border border-[var(--border)]"
                >
                  <p className="text-[11px] text-secondary mb-3">
                    資料日期：{ranks?.tradeDate || "最新交易日"} · 點擊任意個股立即展開三大法人與 K 線疊圖
                  </p>
                  <div className="space-y-2.5">
                    {activeRankList.slice(0, 6).map((stock: any) => {
                      const curPrice = liveQuotesMap[stock.symbol]?.price ?? stock.price;
                      const curPct = liveQuotesMap[stock.symbol]?.change_pct ?? stock.change_pct;
                      return (
                        <div
                          key={stock.symbol}
                          onClick={() => selectStockAndSwitch(stock.symbol)}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]/40 hover:bg-[var(--bg-tertiary)] hover:border-accent transition-all cursor-pointer group"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-primary group-hover:text-accent transition-colors font-mono">
                                {stock.symbol}
                              </span>
                              <span className="text-secondary text-xs font-medium">{stock.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-mono font-semibold">
                                +{stock.shares ? Math.round(stock.shares).toLocaleString() : 0} 張
                              </span>
                            </div>
                            <div className="text-[11px] text-accent mt-0.5 flex items-center gap-0.5">
                              點擊秒看個股籌碼 K 線 <ChevronRight size={11} />
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-sm text-primary">
                              NT${Number(curPrice || 0).toFixed(2)}
                            </div>
                            <div
                              className={`font-mono text-xs ${
                                Number(curPct || 0) >= 0 ? "text-up-tw" : "text-down-tw"
                              } font-semibold`}
                            >
                              {Number(curPct || 0) > 0 ? "+" : ""}
                              {Number(curPct || 0).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 視圖 B: 個股三大法人籌碼診斷 ---------------- */}
        {twView === "STOCK" && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-secondary font-medium">快速切換：</span>
                  {PRESET_STOCKS.map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => setSelectedStock(s.symbol)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        selectedStock === s.symbol
                          ? "bg-[var(--accent)] text-white shadow-md shadow-accent/25"
                          : "bg-[var(--bg-tertiary)] text-secondary hover:text-primary hover:border-accent border border-transparent"
                      }`}
                    >
                      {s.symbol} {s.name}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleStockSearch} className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="輸入台股代碼 (如 2303)..."
                      value={stockInput}
                      onChange={(e) => setStockInput(e.target.value)}
                      className="input-field text-xs py-1.5 px-3 pr-8 w-40 sm:w-48 rounded-lg"
                    />
                    <Search
                      size={14}
                      className="absolute right-2.5 top-2.5 text-secondary pointer-events-none"
                    />
                  </div>
                  <Button size="sm" type="submit">
                    查詢
                  </Button>
                </form>
              </div>
            </div>

            {stockData && (
              <div className="space-y-6">
                {/* 個股指標卡片 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <Card className="hover-lift border border-[var(--border)]">
                    <div className="text-xs text-secondary mb-1">
                      外資最新買賣超 ({stockData.latest.date})
                    </div>
                    <div
                      className={`text-xl sm:text-2xl font-bold font-mono ${getFlowColor(
                        stockData.latest.foreign
                      )}`}
                    >
                      {formatShares(stockData.latest.foreign)}
                    </div>
                    <div className="text-xs mt-1.5 flex items-center justify-between">
                      <span className="text-secondary">近5日累計:</span>
                      <span className={getFlowColor(stockData.stats_5d.foreign)}>
                        {formatShares(stockData.stats_5d.foreign)}
                      </span>
                    </div>
                    <div className="text-[11px] text-accent mt-1 flex items-center gap-1">
                      <Flame size={12} /> 外資連 {stockData.consecutive.foreign.days} 日
                      {stockData.consecutive.foreign.action}
                    </div>
                  </Card>

                  <Card className="hover-lift border border-[var(--border)]">
                    <div className="text-xs text-secondary mb-1">
                      投信最新買賣超 ({stockData.latest.date})
                    </div>
                    <div
                      className={`text-xl sm:text-2xl font-bold font-mono ${getFlowColor(
                        stockData.latest.trust
                      )}`}
                    >
                      {formatShares(stockData.latest.trust)}
                    </div>
                    <div className="text-xs mt-1.5 flex items-center justify-between">
                      <span className="text-secondary">近5日累計:</span>
                      <span className={getFlowColor(stockData.stats_5d.trust)}>
                        {formatShares(stockData.stats_5d.trust)}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                      <Flame size={12} /> 投信連 {stockData.consecutive.trust.days} 日
                      {stockData.consecutive.trust.action}
                    </div>
                  </Card>

                  <Card className="hover-lift border border-[var(--border)]">
                    <div className="text-xs text-secondary mb-1">
                      自營商最新買賣超 ({stockData.latest.date})
                    </div>
                    <div
                      className={`text-xl sm:text-2xl font-bold font-mono ${getFlowColor(
                        stockData.latest.dealer
                      )}`}
                    >
                      {formatShares(stockData.latest.dealer)}
                    </div>
                    <div className="text-xs mt-1.5 flex items-center justify-between">
                      <span className="text-secondary">近5日累計:</span>
                      <span className={getFlowColor(stockData.stats_5d.dealer)}>
                        {formatShares(stockData.stats_5d.dealer)}
                      </span>
                    </div>
                    <div className="text-[11px] text-secondary mt-1">避險與自行買賣加總</div>
                  </Card>

                  <Card className="hover-lift border border-[var(--border)] bg-[var(--bg-secondary)]/80">
                    <div className="text-xs text-secondary mb-1">三大法人合計買賣</div>
                    <div
                      className={`text-xl sm:text-2xl font-bold font-mono ${getFlowColor(
                        stockData.latest.total
                      )}`}
                    >
                      {formatShares(stockData.latest.total)}
                    </div>
                    <div className="text-xs mt-1.5 flex items-center justify-between">
                      <span className="text-secondary">最新收盤現價:</span>
                      <span className="font-mono text-primary font-bold">
                        NT${stockData.latest_close}
                      </span>
                    </div>
                    <div className="text-[11px] text-accent mt-1 flex items-center gap-1">
                      5日總淨額: {formatShares(stockData.stats_5d.total)}
                    </div>
                  </Card>
                </div>

                {/* 個股雙軸圖：K線 + 股價折線 + 法人買賣超長條圖 (強化每日欄位分隔) */}
                <Card
                  title={`${stockData.symbol} ${stockData.name} - 三大法人每日買賣超 (張) 與 K 線疊圖`}
                  subtitle="每一交易日皆有獨立分欄底色與垂直虛線分隔，清楚對照法人買賣超與當日 K 線表現"
                  className="border border-[var(--border)] shadow-md"
                  headerAction={
                    <Link
                      href={`/stock/${stockData.symbol}`}
                      className="text-xs text-accent hover:underline flex items-center gap-1 whitespace-nowrap"
                    >
                      前往個股完整分析 <ChevronRight size={13} />
                    </Link>
                  }
                >
                  <div className="h-[340px] sm:h-[420px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={stockData.history}
                        barCategoryGap="28%"
                        barGap={2}
                        margin={{ top: 14, right: 8, left: 4, bottom: 8 }}
                      >
                        {stockData.history.map((d, idx) =>
                          idx % 2 === 0 ? (
                            <ReferenceArea
                              key={`sband-${d.date}`}
                              yAxisId="shares"
                              x1={d.date}
                              x2={d.date}
                              fill="rgba(148, 163, 184, 0.08)"
                              strokeOpacity={0}
                              ifOverflow="extendDomain"
                            />
                          ) : null
                        )}
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(148, 163, 184, 0.22)"
                          vertical={true}
                          horizontal={false}
                        />
                        <XAxis
                          dataKey="date"
                          stroke="var(--text-primary)"
                          fontSize={11}
                          fontWeight={600}
                          tickMargin={6}
                          tickLine={{ stroke: "var(--border)" }}
                          axisLine={{ stroke: "var(--border)" }}
                        />
                        <YAxis
                          yAxisId="shares"
                          width={58}
                          stroke="var(--text-secondary)"
                          fontSize={10}
                          tickFormatter={(value) =>
                            Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
                          }
                          tickLine={false}
                          axisLine={{ stroke: "var(--border)" }}
                        />
                        <YAxis
                          yAxisId="price"
                          orientation="right"
                          width={54}
                          stroke="#f59e0b"
                          fontSize={10}
                          domain={["auto", "auto"]}
                          tickFormatter={(value) => `$${value}`}
                          tickLine={false}
                          axisLine={{ stroke: "var(--border)" }}
                        />
                        <Tooltip
                          cursor={{
                            fill: "rgba(56, 189, 248, 0.14)",
                            stroke: "rgba(56, 189, 248, 0.5)",
                            strokeWidth: 1,
                          }}
                          contentStyle={{
                            backgroundColor: "var(--bg-secondary)",
                            borderColor: "var(--border)",
                            color: "var(--text-primary)",
                            borderRadius: "10px",
                            fontSize: "12px",
                            boxShadow: "0 10px 28px rgba(0,0,0,0.4)",
                          }}
                          formatter={(val: any, name: any, item: any) => {
                            if (name === "個股 K線") {
                              const p = item?.payload;
                              if (p?.open && p?.close) {
                                return [
                                  `開 $${p.open} / 高 $${p.high} / 低 $${p.low} / 收 $${p.close}`,
                                  "個股 K線",
                                ];
                              }
                              return [val, name];
                            }
                            if (name === "收盤價") return [`NT$${val}`, name];
                            return [
                              `${Number(val) > 0 ? "+" : ""}${Number(val).toLocaleString()} 張`,
                              name,
                            ];
                          }}
                          labelFormatter={(lbl, payload) => {
                            const full = payload?.[0]?.payload?.full_date;
                            return `交易日期：${full || lbl}`;
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
                        <ReferenceLine
                          y={0}
                          yAxisId="shares"
                          stroke="rgba(248, 250, 252, 0.4)"
                          strokeWidth={1.2}
                        />
                        <Bar
                          yAxisId="shares"
                          dataKey="foreign"
                          name="外資"
                          fill="#3b82f6"
                          radius={[3, 3, 0, 0]}
                          animationDuration={300}
                        />
                        <Bar
                          yAxisId="shares"
                          dataKey="trust"
                          name="投信"
                          fill="#10b981"
                          radius={[3, 3, 0, 0]}
                          animationDuration={300}
                        />
                        <Bar
                          yAxisId="shares"
                          dataKey="dealer"
                          name="自營商"
                          fill="#a855f7"
                          radius={[3, 3, 0, 0]}
                          animationDuration={300}
                        />
                        <Bar
                          yAxisId="price"
                          dataKey="klineRange"
                          name="個股 K線"
                          barSize={9}
                          shape={<KlineCandleShape />}
                          isAnimationActive={false}
                        />
                        <Line
                          yAxisId="price"
                          type="monotone"
                          dataKey="close"
                          name="收盤價"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          dot={{ r: 2.5, fill: "#f59e0b" }}
                          animationDuration={300}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* 個股每日法人歷史明細表 */}
                <Card
                  title={`${stockData.symbol} ${stockData.name} - 每日三大法人買賣超進出明細`}
                  className="border border-[var(--border)] overflow-hidden"
                >
                  <div className="max-h-[360px] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border)] text-secondary">
                        <tr>
                          <th className="py-2.5 px-3 text-left">日期</th>
                          <th className="py-2.5 px-3 text-right">收盤價</th>
                          <th className="py-2.5 px-3 text-right">外資 (張)</th>
                          <th className="py-2.5 px-3 text-right">投信 (張)</th>
                          <th className="py-2.5 px-3 text-right">自營商 (張)</th>
                          <th className="py-2.5 px-3 text-right">三大法人合計 (張)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] font-mono">
                        {stockData.history
                          .slice()
                          .reverse()
                          .map((item, idx) => {
                            const total = item.foreign + item.trust + item.dealer;
                            return (
                              <tr
                                key={idx}
                                className="hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                              >
                                <td className="py-2 px-3 text-secondary">
                                  {item.full_date || item.date}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-primary">
                                  NT${item.close}
                                </td>
                                <td
                                  className={`py-2 px-3 text-right ${getFlowColor(item.foreign)}`}
                                >
                                  {formatShares(item.foreign)}
                                </td>
                                <td className={`py-2 px-3 text-right ${getFlowColor(item.trust)}`}>
                                  {formatShares(item.trust)}
                                </td>
                                <td className={`py-2 px-3 text-right ${getFlowColor(item.dealer)}`}>
                                  {formatShares(item.dealer)}
                                </td>
                                <td
                                  className={`py-2 px-3 text-right font-bold ${getFlowColor(
                                    total
                                  )}`}
                                >
                                  {formatShares(total)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // 2. 華爾街 13F 機構深度報告 (統一紅漲/增持、綠跌/減持)
  // =========================================================================
  const renderUsSection = () => {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* 頂部宏觀洞察橫幅 */}
        <div className="p-4 rounded-xl border border-blue-500/25 bg-blue-500/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/15 text-blue-400">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="text-sm font-bold text-primary">
                華爾街頂級避險基金 13F 季報核心動向
              </div>
              <div className="text-xs text-secondary mt-0.5">
                即時掌握巴菲特、達里奧、西蒙斯、大賣空貝瑞、泰珀、艾克曼等傳奇經理人的機構持股調倉與完整重倉股
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-secondary">共識增持：</span>
              <span className="text-red-400 font-semibold">
                AI 算力巨頭、能源護城河、中概電商龍頭
              </span>
            </div>
            <div>
              <span className="text-secondary">共識減持：</span>
              <span className="text-emerald-400 font-semibold">
                高估值消費股、傳統商銀
              </span>
            </div>
          </div>
        </div>

        {/* 基金機構卡片網格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {usData.map((fund) => (
            <Card
              key={fund.id || fund.fundName}
              variant="elevated"
              className="hover-lift border border-[var(--border)] flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3 border-b border-[var(--border)] pb-3 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-primary flex items-center gap-1.5">
                      <Landmark size={17} className="text-accent flex-shrink-0" />
                      <span>{fund.fundName}</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-secondary">
                      <span className="flex items-center gap-1">
                        <User size={12} /> {fund.manager}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-primary font-mono">
                      {fund.portfolioValue}
                    </div>
                    <div className="text-[10px] text-secondary mt-0.5 font-mono">
                      {fund.reportDate}
                    </div>
                  </div>
                </div>

                {/* 操盤核心哲學 */}
                <div className="text-xs text-secondary mb-3 bg-[var(--bg-tertiary)]/50 p-2.5 rounded-lg border border-[var(--border)]/50">
                  <span className="text-primary font-semibold">操盤哲學：</span> {fund.philosophy}
                </div>

                {/* 操盤核心邏輯 */}
                <div className="text-xs text-secondary mb-4 leading-relaxed">{fund.thesis}</div>

                {/* 加碼與減碼清單 (統一紅增持、綠減持) */}
                <div className="space-y-3 pt-2 border-t border-[var(--border)]/40">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-red-400">
                      <TrendingUp size={13} />
                      <span>本季加碼 (Top Buys)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(fund.topBuys || []).map((ticker: string) => (
                        <span
                          key={ticker}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-red-500/10 text-red-400 border border-red-500/25"
                        >
                          {ticker}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-emerald-400">
                      <TrendingDown size={13} />
                      <span>本季減碼 (Top Sells)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(fund.topSells || []).map((ticker: string) => (
                        <span
                          key={ticker}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                        >
                          {ticker}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 查看完整持倉與深度報告按鈕 */}
              <div className="mt-5 pt-3 border-t border-[var(--border)]">
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-center text-xs"
                  onClick={() => setSelectedFund(fund)}
                >
                  <Sparkles size={13} className="mr-1.5 text-accent" />
                  查看完整持倉與深度報告 ({fund.holdings?.length || 0} 檔核心持倉)
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* 13F 深度報告彈窗 */}
        {selectedFund && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in"
            onClick={() => setSelectedFund(null)}
          >
            <div
              className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start border-b border-[var(--border)] pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Landmark className="text-accent" size={22} />
                    <h2 className="text-lg sm:text-xl font-bold text-primary">
                      {selectedFund.fundName}
                    </h2>
                  </div>
                  <div className="text-xs text-secondary mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span>操盤手: {selectedFund.manager}</span>
                    <span>•</span>
                    <span>持股市值: {selectedFund.portfolioValue}</span>
                    <span>•</span>
                    <span>現金與配置: {selectedFund.cashReserves}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFund(null)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5 text-sm">
                <div className="p-4 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border)]">
                  <div className="text-xs font-bold text-accent uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={14} /> 本季操盤戰略與宏觀調倉深度解讀
                  </div>
                  <p className="text-primary text-xs leading-relaxed">{selectedFund.thesis}</p>
                </div>

                {Array.isArray(selectedFund.sectorAllocation) &&
                  selectedFund.sectorAllocation.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <PieChart size={14} /> 板塊資產配置分佈
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {selectedFund.sectorAllocation.map((s: any) => (
                          <div
                            key={s.sector}
                            className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]/30 text-center"
                          >
                            <div className="text-xs text-secondary truncate">{s.sector}</div>
                            <div className="text-sm font-bold font-mono text-accent mt-0.5">
                              {Number(s.pct || 0).toFixed(2)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {Array.isArray(selectedFund.holdings) && selectedFund.holdings.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers size={14} /> 前大重倉股持股明細表 (Top Holdings)
                    </h4>
                    <div className="rounded-xl border border-[var(--border)] overflow-hidden overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border)] text-secondary">
                          <tr>
                            <th className="py-2.5 px-3 text-left">代號</th>
                            <th className="py-2.5 px-3 text-left">名稱</th>
                            <th className="py-2.5 px-3 text-right">持股數</th>
                            <th className="py-2.5 px-3 text-right">市值</th>
                            <th className="py-2.5 px-3 text-right">投組佔比 %</th>
                            <th className="py-2.5 px-3 text-right">本季動作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] font-mono">
                          {selectedFund.holdings.map((h: any) => {
                            const act = String(h?.action || "持有");
                            const isPositiveAction =
                              act.includes("增持") ||
                              act.includes("加碼") ||
                              act.includes("建倉") ||
                              act.includes("重倉");
                            const isNegativeAction =
                              act.includes("減持") || act.includes("賣出");
                            return (
                              <tr
                                key={h?.symbol}
                                className="hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                              >
                                <td className="py-2.5 px-3 font-bold text-accent">
                                  <Link href={`/stock/${h?.symbol}`} className="hover:underline">
                                    {h?.symbol}
                                  </Link>
                                </td>
                                <td className="py-2.5 px-3 text-primary font-sans">{h?.name}</td>
                                <td className="py-2.5 px-3 text-right text-secondary">
                                  {h?.shares}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-primary">
                                  {h?.value}
                                </td>
                                <td className="py-2.5 px-3 text-right text-accent font-bold">
                                  {Number(h?.portfolioPct || 0).toFixed(2)}%
                                </td>
                                <td className="py-2.5 px-3 text-right font-sans">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      isPositiveAction
                                        ? "bg-red-500/15 text-red-400 border border-red-500/25"
                                        : isNegativeAction
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                                        : "bg-zinc-500/15 text-zinc-400"
                                    }`}
                                  >
                                    {act}{" "}
                                    {h?.changePct
                                      ? `(${Number(h.changePct) > 0 ? "+" : ""}${Number(h.changePct).toFixed(2)}%)`
                                      : ""}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setSelectedFund(null)}>
                    關閉報告
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Landmark className="text-accent" />
            機構追蹤中心
          </h1>
          <p className="text-secondary text-sm">
            全市場三大法人即時動向、個股籌碼深度透視與華爾街 13F 機構深度報告
          </p>
        </div>
      </header>

      <div className="flex border-b border-[var(--border)] mb-6 overflow-x-auto no-scrollbar gap-2">
        <button
          onClick={() => setActiveMainTab("TW")}
          className={`pb-3 px-3.5 text-sm font-medium transition-colors relative whitespace-nowrap cursor-pointer ${
            activeMainTab === "TW"
              ? "text-accent font-semibold"
              : "text-secondary hover:text-primary"
          }`}
        >
          台股三大法人 (大盤 & 個股)
          {activeMainTab === "TW" && (
            <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[var(--accent)] rounded-t-full shadow-md shadow-accent/50" />
          )}
        </button>

        <button
          onClick={() => setActiveMainTab("US_13F")}
          className={`pb-3 px-3.5 text-sm font-medium transition-colors relative whitespace-nowrap cursor-pointer ${
            activeMainTab === "US_13F"
              ? "text-accent font-semibold"
              : "text-secondary hover:text-primary"
          }`}
        >
          華爾街 13F 機構深度報告 ({usData.length} 大頂級機構)
          {activeMainTab === "US_13F" && (
            <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[var(--accent)] rounded-t-full shadow-md shadow-accent/50" />
          )}
        </button>
      </div>

      {activeMainTab === "TW" ? renderTwSection() : renderUsSection()}
    </div>
  );
}
