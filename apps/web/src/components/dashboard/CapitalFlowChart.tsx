"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiMarket } from "@/lib/api";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
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
import { Activity, Filter } from "lucide-react";

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
  "0050": "0050 台灣50",
  "0056": "0056 高股息",
  "00878": "00878 國泰高息",
  "00929": "00929 科技優息",
  "00919": "00919 群益高息",
};

// 依據點位順序自動循環錯開 8 個方位，徹底避免標籤堆疊互相遮擋
const LABEL_DIRECTIONS = [
  { dx: 0, dy: -20, anchor: "middle" },
  { dx: 0, dy: 24, anchor: "middle" },
  { dx: 14, dy: -14, anchor: "start" },
  { dx: -14, dy: -14, anchor: "end" },
  { dx: 14, dy: 18, anchor: "start" },
  { dx: -14, dy: 18, anchor: "end" },
  { dx: 16, dy: 4, anchor: "start" },
  { dx: -16, dy: 4, anchor: "end" },
];

const renderCustomLabel = (props: any) => {
  const { x, y, value, index, payload } = props;
  if (x == null || y == null) return null;

  const dir = LABEL_DIRECTIONS[index % LABEL_DIRECTIONS.length];
  const sym = payload?.symbol || "";
  const displayName = SHORT_NAMES[sym] || value || payload?.name || sym;
  const charLen = displayName.length;
  const pillWidth = Math.max(charLen * 11 + 12, 46);

  return (
    <g transform={`translate(${x + dir.dx}, ${y + dir.dy})`} className="pointer-events-none select-none">
      {/* 半透明暗黑膠囊背景，徹底防止字體互相遮蔽或與網格干擾 */}
      <rect
        x={dir.anchor === "middle" ? -pillWidth / 2 : dir.anchor === "end" ? -pillWidth : 0}
        y={-12}
        width={pillWidth}
        height={18}
        rx={5}
        fill="rgba(15, 23, 42, 0.92)"
        stroke="rgba(255, 255, 255, 0.22)"
        strokeWidth={0.8}
      />
      <text
        x={dir.anchor === "middle" ? 0 : dir.anchor === "end" ? -pillWidth / 2 : pillWidth / 2}
        y={-2}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize={10.5}
        fontWeight={600}
        dominantBaseline="middle"
      >
        {displayName}
      </text>
    </g>
  );
};

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

  return (
    <div className="space-y-6">
      <Card
        title={
          <div className="flex items-center justify-between w-full pr-2">
            <span>權值股與熱門 ETF 資金流向分佈圖</span>
          </div>
        }
        headerAction={
          <div className="flex items-center gap-2">
            {/* 視圖篩選器 */}
            <div className="flex bg-[var(--bg-tertiary)] p-0.5 rounded-lg border border-[var(--border)] text-xs">
              <button
                onClick={() => setViewFilter("ALL")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  viewFilter === "ALL"
                    ? "bg-accent text-white shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
              >
                全部標的 ({data.length})
              </button>
              <button
                onClick={() => setViewFilter("STOCK")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  viewFilter === "STOCK"
                    ? "bg-accent text-white shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
              >
                只看個股 ({data.filter((d) => !d.is_etf).length})
              </button>
              <button
                onClick={() => setViewFilter("ETF")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  viewFilter === "ETF"
                    ? "bg-accent text-white shadow-sm"
                    : "text-secondary hover:text-primary"
                }`}
              >
                只看 ETF ({data.filter((d) => d.is_etf).length})
              </button>
            </div>
            <Activity size={18} className="text-accent ml-1" />
          </div>
        }
      >
        <div className="h-[480px] sm:h-[520px] w-full">
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
              <ScatterChart margin={{ top: 32, right: 36, bottom: 24, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />

                <XAxis
                  type="number"
                  dataKey="change_pct"
                  name="漲跌幅"
                  unit="%"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  domain={["auto", "auto"]}
                />

                <YAxis
                  type="number"
                  dataKey="net_flow"
                  name="資金流向"
                  unit="百萬"
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                  domain={["auto", "auto"]}
                />

                <ZAxis type="number" dataKey="volume" range={[140, 1400]} name="成交量" />

                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />

                <Scatter name="Stocks" data={filteredData} animationDuration={600}>
                  {filteredData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.is_etf ? "#8b5cf6" : entry.net_flow >= 0 ? "#ef4444" : "#10b981"}
                      fillOpacity={0.75}
                      stroke={entry.is_etf ? "#a78bfa" : entry.net_flow >= 0 ? "#f87171" : "#34d399"}
                      strokeWidth={1.5}
                    />
                  ))}
                  {/* 使用動態方位錯開與防重疊膠囊標籤 */}
                  <LabelList dataKey="name" content={renderCustomLabel} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        {!loading && filteredData.length > 0 && (
          <div className="flex flex-wrap gap-5 justify-center mt-3 pt-3 border-t border-[var(--border)] text-xs text-secondary">
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
            <div className="text-muted">氣泡面積代表當日成交張數 · 標籤具備智慧防重疊膠囊避讓</div>
          </div>
        )}
      </Card>

      {!loading && sortedByFlow.length > 0 && (
        <Card title="資金淨流入 / 淨流出排行明細">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border)] text-secondary">
                  <th className="py-2 px-3">標的</th>
                  <th className="py-2 px-3 text-right">股價</th>
                  <th className="py-2 px-3 text-right">漲跌幅</th>
                  <th className="py-2 px-3 text-right">成交量 (張)</th>
                  <th className="py-2 px-3 text-right">資金淨流向 (百萬)</th>
                  <th className="py-2 px-3 text-center">類別</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-mono">
                {sortedByFlow.map((item) => (
                  <tr key={item.symbol} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-primary">
                      <Link href={`/stock/${item.symbol}`} className="hover:text-accent transition-colors">
                        {item.name} <span className="text-muted text-[11px]">({item.symbol})</span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-right">{item.price.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={item.change_pct >= 0 ? "text-red-400" : "text-emerald-400"}>
                        {item.change_pct > 0 ? "+" : ""}
                        {item.change_pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">{Math.round(item.volume).toLocaleString()}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        item.net_flow >= 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {item.net_flow > 0 ? "+" : ""}
                      {item.net_flow.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
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
