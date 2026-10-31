"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiMarket } from "@/lib/api";
import Card from "@/components/ui/Card";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import { Activity } from "lucide-react";

interface FlowData {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  volume: number; // 張
  net_flow: number; // 百萬 TWD
  is_etf: boolean;
}

const SHORT_NAMES: Record<string, string> = {
  "2330": "台積電",
  "2317": "鴻海",
  "2454": "聯發科",
  "2382": "廣達",
  "3231": "緯創",
  "2603": "長榮",
  "2881": "富邦金",
  "2882": "國泰金",
  "0050": "0050",
  "0056": "0056",
  "00878": "00878",
  "00929": "00929",
  "00919": "00919",
};

interface PlacedBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// 候選方位偏移表：優先往上、下、右、左、斜角試探，若重疊則自動往外圈推開
const CANDIDATE_OFFSETS = [
  { dx: 0, dy: -22, anchor: "middle" as const },
  { dx: 0, dy: 24, anchor: "middle" as const },
  { dx: 16, dy: -4, anchor: "start" as const },
  { dx: -16, dy: -4, anchor: "end" as const },
  { dx: 14, dy: -18, anchor: "start" as const },
  { dx: -14, dy: -18, anchor: "end" as const },
  { dx: 14, dy: 18, anchor: "start" as const },
  { dx: -14, dy: 18, anchor: "end" as const },
  { dx: 0, dy: -38, anchor: "middle" as const },
  { dx: 0, dy: 40, anchor: "middle" as const },
  { dx: 24, dy: -28, anchor: "start" as const },
  { dx: -24, dy: -28, anchor: "end" as const },
  { dx: 24, dy: 28, anchor: "start" as const },
  { dx: -24, dy: 28, anchor: "end" as const },
  { dx: 0, dy: -54, anchor: "middle" as const },
  { dx: 0, dy: 56, anchor: "middle" as const },
];

function computeOverlapArea(a: PlacedBox, b: PlacedBox): number {
  const ox = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const oy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  return ox * oy;
}

function createSmartLabelRenderer(isMobile: boolean) {
  let placedBoxes: PlacedBox[] = [];

  return (props: any) => {
    const { x, y, value, index, payload } = props;
    if (x == null || y == null) return null;

    if (index === 0) {
      placedBoxes = [];
    }

    const sym = payload?.symbol || "";
    const rawName = SHORT_NAMES[sym] || value || payload?.name || sym;
    const displayName = isMobile && rawName.length > 5 ? rawName.slice(0, 5) : rawName;
    const fontSize = isMobile ? 9.5 : 10.5;
    const charWidth = isMobile ? 9.5 : 11;
    const pillWidth = Math.max(displayName.length * charWidth + 10, isMobile ? 36 : 44);
    const pillHeight = isMobile ? 16 : 18;

    // 將圓點本身也視為不可重疊障礙物
    const dotRadius = isMobile ? 9 : 13;
    const dotBox: PlacedBox = {
      x1: x - dotRadius,
      y1: y - dotRadius,
      x2: x + dotRadius,
      y2: y + dotRadius,
    };

    let bestCandidate = CANDIDATE_OFFSETS[index % CANDIDATE_OFFSETS.length];
    let bestBox: PlacedBox | null = null;
    let minPenalty = Infinity;

    // 從 index 對應的預設方向開始輪詢所有候選位置，挑選出 0 重疊或最小重疊的位置
    for (let step = 0; step < CANDIDATE_OFFSETS.length; step++) {
      const cand = CANDIDATE_OFFSETS[(index + step) % CANDIDATE_OFFSETS.length];
      const tx = x + cand.dx;
      const ty = y + cand.dy;
      const rectX =
        cand.anchor === "middle"
          ? tx - pillWidth / 2
          : cand.anchor === "end"
          ? tx - pillWidth
          : tx;
      const rectY = ty - pillHeight / 2 - 2;

      const candidateBox: PlacedBox = {
        x1: rectX - 3,
        y1: rectY - 2,
        x2: rectX + pillWidth + 3,
        y2: rectY + pillHeight + 2,
      };

      let penalty = computeOverlapArea(candidateBox, dotBox) * 2;
      for (const existing of placedBoxes) {
        penalty += computeOverlapArea(candidateBox, existing) * 10;
      }

      // 邊界微幅懲罰，避免標籤超出畫布左右側
      if (candidateBox.x1 < 36) penalty += (36 - candidateBox.x1) * 5;
      if (candidateBox.y1 < 8) penalty += (8 - candidateBox.y1) * 5;

      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestCandidate = cand;
        bestBox = candidateBox;
      }
      if (penalty === 0) break;
    }

    if (bestBox) {
      placedBoxes.push(bestBox);
      placedBoxes.push(dotBox);
    }

    const tx = x + bestCandidate.dx;
    const ty = y + bestCandidate.dy;
    const rectOffsetX =
      bestCandidate.anchor === "middle"
        ? -pillWidth / 2
        : bestCandidate.anchor === "end"
        ? -pillWidth
        : 0;
    const textOffsetX =
      bestCandidate.anchor === "middle"
        ? 0
        : bestCandidate.anchor === "end"
        ? -pillWidth / 2
        : pillWidth / 2;

    return (
      <g className="pointer-events-none select-none">
        {/* 若標籤被推離較遠，畫一條細引線連接氣泡圓心 */}
        {Math.hypot(bestCandidate.dx, bestCandidate.dy) > 28 && (
          <line
            x1={x}
            y1={y}
            x2={tx}
            y2={ty}
            stroke="rgba(148, 163, 184, 0.45)"
            strokeWidth={0.8}
            strokeDasharray="2 2"
          />
        )}
        <g transform={`translate(${tx}, ${ty})`}>
          <rect
            x={rectOffsetX}
            y={-pillHeight / 2 - 2}
            width={pillWidth}
            height={pillHeight}
            rx={4}
            fill="rgba(15, 23, 42, 0.92)"
            stroke="rgba(255, 255, 255, 0.24)"
            strokeWidth={0.8}
          />
          <text
            x={textOffsetX}
            y={-2}
            textAnchor="middle"
            fill="#f8fafc"
            fontSize={fontSize}
            fontWeight={600}
            dominantBaseline="middle"
          >
            {displayName}
          </text>
        </g>
      </g>
    );
  };
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as FlowData;
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-3 rounded-lg shadow-xl z-50 text-xs">
        <div className="font-semibold text-primary mb-1">
          {data.name} ({data.symbol})
        </div>
        <div className="text-secondary">
          股價: <span className="font-mono text-primary">{data.price.toFixed(2)}</span>
        </div>
        <div className="text-secondary">
          漲跌幅:{" "}
          <span className={`font-mono ${data.change_pct >= 0 ? "text-red-400" : "text-emerald-400"}`}>
            {data.change_pct > 0 ? "+" : ""}
            {data.change_pct.toFixed(2)}%
          </span>
        </div>
        <div className="text-secondary">
          成交量: <span className="font-mono text-primary">{Math.round(data.volume).toLocaleString()} 張</span>
        </div>
        <div className={`font-mono font-semibold mt-1.5 ${data.net_flow >= 0 ? "text-red-400" : "text-emerald-400"}`}>
          資金淨流向: {data.net_flow > 0 ? "+" : ""}
          {data.net_flow.toLocaleString()} 百萬
        </div>
      </div>
    );
  }
  return null;
};

export default function CapitalFlowChart() {
  const [data, setData] = useState<FlowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<"ALL" | "STOCK" | "ETF">("ALL");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkViewport = () => setIsMobile(window.innerWidth < 640);
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  useEffect(() => {
    const fetchFlow = async () => {
      try {
        const response = await apiMarket.getCapitalFlow();
        const resData = response.data?.data || response.data;
        if (Array.isArray(resData)) {
          setData(resData);
        }
      } catch (error) {
        console.error("Failed to fetch capital flow", error);
      } finally {
        setLoading(false);
      }
    };
    fetchFlow();
  }, []);

  const filteredData = useMemo(() => {
    if (viewFilter === "STOCK") return data.filter((d) => !d.is_etf);
    if (viewFilter === "ETF") return data.filter((d) => d.is_etf);
    return data;
  }, [data, viewFilter]);

  const sortedByFlow = [...filteredData].sort((a, b) => b.net_flow - a.net_flow);
  const smartLabelRenderer = useMemo(() => createSmartLabelRenderer(isMobile), [isMobile, filteredData]);

  return (
    <div className="space-y-6">
      <Card
        title="權值股與熱門 ETF 資金流向分佈圖"
        headerAction={
          <div className="flex items-center gap-1.5">
            <div className="flex bg-[var(--bg-tertiary)] p-0.5 rounded-lg border border-[var(--border)] text-[11px] sm:text-xs">
              <button
                onClick={() => setViewFilter("ALL")}
                className={`px-2 sm:px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewFilter === "ALL"
                    ? "bg-accent text-white shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
              >
                全部 ({data.length})
              </button>
              <button
                onClick={() => setViewFilter("STOCK")}
                className={`px-2 sm:px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewFilter === "STOCK"
                    ? "bg-accent text-white shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
              >
                個股 ({data.filter((d) => !d.is_etf).length})
              </button>
              <button
                onClick={() => setViewFilter("ETF")}
                className={`px-2 sm:px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewFilter === "ETF"
                    ? "bg-accent text-white shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
              >
                ETF ({data.filter((d) => d.is_etf).length})
              </button>
            </div>
            <Activity size={16} className="text-accent hidden sm:block ml-1" />
          </div>
        }
      >
        <div className="h-[380px] sm:h-[520px] w-full">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-secondary text-sm">
              載入資金流向資料中...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-secondary text-sm">
              暫無資金流向資料
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={
                  isMobile
                    ? { top: 24, right: 16, bottom: 12, left: -4 }
                    : { top: 32, right: 36, bottom: 24, left: 10 }
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />

                <XAxis
                  type="number"
                  dataKey="change_pct"
                  name="漲跌幅"
                  unit="%"
                  tick={{ fill: "#94a3b8", fontSize: isMobile ? 10 : 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  domain={["auto", "auto"]}
                />

                <YAxis
                  type="number"
                  dataKey="net_flow"
                  name="資金流向"
                  width={isMobile ? 46 : 64}
                  tickFormatter={(v) =>
                    Math.abs(v) >= 100 ? `${(v / 100).toFixed(0)}億` : `${v}M`
                  }
                  tick={{ fill: "#94a3b8", fontSize: isMobile ? 10 : 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  domain={["auto", "auto"]}
                />

                <ZAxis
                  type="number"
                  dataKey="volume"
                  range={isMobile ? [45, 360] : [130, 1200]}
                  name="成交量"
                />

                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />

                <Scatter name="Stocks" data={filteredData} animationDuration={500}>
                  {filteredData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.is_etf ? "#8b5cf6" : entry.net_flow >= 0 ? "#ef4444" : "#10b981"}
                      fillOpacity={0.75}
                      stroke={entry.is_etf ? "#a78bfa" : entry.net_flow >= 0 ? "#f87171" : "#34d399"}
                      strokeWidth={1.5}
                    />
                  ))}
                  <LabelList dataKey="name" content={smartLabelRenderer} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        {!loading && filteredData.length > 0 && (
          <div className="flex flex-wrap gap-3 sm:gap-5 justify-center mt-3 pt-3 border-t border-[var(--border)] text-[11px] sm:text-xs text-secondary">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span>個股資金淨流入</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>個股資金淨流出</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]"></span>
              <span>ETF 標的</span>
            </div>
            <div className="text-muted">氣泡面積代表當日成交張數 · 點擊氣泡查看詳情</div>
          </div>
        )}
      </Card>

      {!loading && sortedByFlow.length > 0 && (
        <Card title="資金淨流入 / 淨流出排行明細">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead>
                <tr className="border-b border-[var(--border)] text-secondary">
                  <th className="py-2 px-2.5 sm:px-3">標的</th>
                  <th className="py-2 px-2.5 sm:px-3 text-right">股價</th>
                  <th className="py-2 px-2.5 sm:px-3 text-right">漲跌幅</th>
                  <th className="py-2 px-2.5 sm:px-3 text-right">成交量 (張)</th>
                  <th className="py-2 px-2.5 sm:px-3 text-right">資金淨流向 (百萬)</th>
                  <th className="py-2 px-2.5 sm:px-3 text-center">類別</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-mono">
                {sortedByFlow.map((item) => (
                  <tr key={item.symbol} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="py-2.5 px-2.5 sm:px-3 font-semibold text-primary">
                      <Link href={`/stock/${item.symbol}`} className="hover:text-accent transition-colors">
                        {item.name} <span className="text-muted text-[11px]">({item.symbol})</span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-2.5 sm:px-3 text-right">{item.price.toFixed(2)}</td>
                    <td className="py-2.5 px-2.5 sm:px-3 text-right">
                      <span className={item.change_pct >= 0 ? "text-red-400" : "text-emerald-400"}>
                        {item.change_pct > 0 ? "+" : ""}
                        {item.change_pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 sm:px-3 text-right">{Math.round(item.volume).toLocaleString()}</td>
                    <td
                      className={`py-2.5 px-2.5 sm:px-3 text-right font-bold ${
                        item.net_flow >= 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {item.net_flow > 0 ? "+" : ""}
                      {item.net_flow.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2.5 sm:px-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-sans ${
                          item.is_etf
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {item.is_etf ? "ETF" : "個股"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
