"use client";

import { useEffect, useState } from "react";
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

  const sortedByFlow = [...data].sort((a, b) => b.net_flow - a.net_flow);

  return (
    <div className="space-y-6">
      <Card
        title="權值股與熱門 ETF 資金流向分佈圖"
        headerAction={<Activity size={18} className="text-accent" />}
      >
        <div className="h-[360px] w-full">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-secondary text-sm">
              載入資金流向資料中...
            </div>
          ) : data.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-secondary text-sm">
              暫無資金流向資料
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 24, right: 28, bottom: 20, left: 16 }}>
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

                <ZAxis type="number" dataKey="volume" range={[120, 1200]} name="成交量" />

                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />

                <Scatter name="Stocks" data={data} animationDuration={600}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.is_etf ? "#8b5cf6" : entry.net_flow >= 0 ? "#ef4444" : "#10b981"}
                      fillOpacity={0.75}
                      stroke={entry.is_etf ? "#a78bfa" : entry.net_flow >= 0 ? "#f87171" : "#34d399"}
                      strokeWidth={1.5}
                    />
                  ))}
                  <LabelList dataKey="name" position="top" fill="#e2e8f0" fontSize={11} />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>

        {!loading && data.length > 0 && (
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
            <div className="text-muted">氣泡面積代表當日成交張數</div>
          </div>
        )}
      </Card>

      {!loading && sortedByFlow.length > 0 && (
        <Card title="資金淨流入 / 淨流出排行明細">
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>標的</th>
                  <th>類別</th>
                  <th className="text-right">現價</th>
                  <th className="text-right">漲跌幅</th>
                  <th className="text-right">成交量 (張)</th>
                  <th className="text-right">法人/主力淨流向 (百萬 TWD)</th>
                </tr>
              </thead>
              <tbody>
                {sortedByFlow.map((row) => (
                  <tr key={row.symbol}>
                    <td>
                      <Link href={`/stock/${row.symbol}`} className="font-mono font-semibold text-accent hover:underline mr-2">
                        {row.symbol}
                      </Link>
                      <span className="text-primary font-medium">{row.name}</span>
                    </td>
                    <td>
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-secondary">
                        {row.is_etf ? "ETF" : "權值個股"}
                      </span>
                    </td>
                    <td className="text-right font-mono tabular-nums">{row.price.toFixed(2)}</td>
                    <td className="text-right">
                      <Badge value={row.change_pct} market="TW" />
                    </td>
                    <td className="text-right font-mono tabular-nums text-secondary">
                      {Math.round(row.volume).toLocaleString()}
                    </td>
                    <td
                      className={`text-right font-mono tabular-nums font-semibold ${
                        row.net_flow >= 0 ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {row.net_flow > 0 ? "+" : ""}
                      {row.net_flow.toLocaleString()} M
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
