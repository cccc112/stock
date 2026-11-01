"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { Term } from "@/components/ui/TermTooltip";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function StockCandleShape(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload || !Number.isFinite(y) || !Number.isFinite(height)) return null;
  const open = Number(payload.open ?? payload.close ?? 0);
  const close = Number(payload.close ?? 0);
  const high = Number(payload.high ?? Math.max(open, close));
  const low = Number(payload.low ?? Math.min(open, close));
  if (!close || high <= 0) return null;

  const isUp = close >= open;
  const color = isUp ? "#ef4444" : "#22c55e";
  const range = Math.max(high - low, 0.0001);
  const absH = Math.max(Math.abs(height), 2);
  const topY = height >= 0 ? y : y + height;

  const yOpen = topY + ((high - open) / range) * absH;
  const yClose = topY + ((high - close) / range) * absH;
  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(Math.abs(yClose - yOpen), 3);
  const cx = x + width / 2;
  const candleW = Math.max(Math.min(width * 0.85, 10), 5);

  return (
    <g>
      <line x1={cx} y1={topY} x2={cx} y2={topY + absH} stroke={color} strokeWidth={1.5} />
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

export default function InstitutionalSection({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any[]>([]);
  const [chartRows, setChartRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstitutional = async () => {
      setLoading(true);
      try {
        const [instRes, localRes] = await Promise.allSettled([
          api.get(`/stocks/${symbol}/institutional`),
          fetch(`/api/institutions?symbol=${encodeURIComponent(symbol)}`, { cache: "no-store" }).then((r) =>
            r.ok ? r.json() : null
          ),
        ]);

        if (instRes.status === "fulfilled") {
          const items = instRes.value.data?.data || instRes.value.data || [];
          setData(Array.isArray(items) ? items : []);
        }
        if (localRes.status === "fulfilled" && Array.isArray(localRes.value?.history)) {
          setChartRows(localRes.value.history);
        }
      } catch (e) {
        console.error("Failed to fetch institutional data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchInstitutional();
  }, [symbol]);

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 text-secondary text-sm animate-fade-in">
        <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <span>正在載入三大法人每日買賣超與 K 線疊圖...</span>
      </div>
    );
  }

  if ((!data || data.length === 0) && chartRows.length === 0) {
    return <div className="p-6 text-center text-secondary">尚無籌碼資料 (可能非台股或無資料)</div>;
  }

  // FinMind name 為英文代碼：Foreign_Investor / Foreign_Dealer_Self(外資)、Investment_Trust(投信)、Dealer_self / Dealer_Hedging(自營商)
  const bucketOf = (name: string): "foreign" | "trust" | "dealer" | null => {
    const n = (name || "").toLowerCase();
    if (n.startsWith("foreign") || name.includes("外資") || name.includes("外陸資")) return "foreign";
    if (n.startsWith("investment_trust") || name.includes("投信")) return "trust";
    if (n.startsWith("dealer") || name.includes("自營商") || name.includes("自營")) return "dealer";
    return null;
  };

  const groupedByDate: Record<string, { date: string; foreign: number; trust: number; dealer: number; total: number }> = {};
  data.forEach((item) => {
    if (!groupedByDate[item.date]) {
      groupedByDate[item.date] = { date: item.date, foreign: 0, trust: 0, dealer: 0, total: 0 };
    }
    const bucket = bucketOf(item.name);
    if (bucket) {
      const net = (Number(item.buy) || 0) - (Number(item.sell) || 0);
      groupedByDate[item.date][bucket] += net;
      groupedByDate[item.date].total += net;
    }
  });

  const displayRows = Object.values(groupedByDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30); // 顯示最近 30 個交易日

  const renderValue = (val: number) => {
    if (val === 0) return <span className="text-secondary">0</span>;
    const isUp = val > 0;
    const colorClass = isUp ? "text-up-tw font-semibold" : "text-down-tw font-semibold";
    const prefix = isUp ? "+" : "";
    return <span className={colorClass}>{prefix}{formatNumber(val, 0)}</span>;
  };

  return (
    <div className="pt-2 space-y-5">
      {chartRows.length > 0 && (
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/50">
          <div className="text-xs font-bold text-primary mb-2">
            三大法人每日買賣超 (張) 與 K 線同框疊圖
          </div>
          <div className="h-[290px] sm:h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartRows} margin={{ top: 10, right: 6, left: 4, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={10} tickLine={false} />
                <YAxis
                  yAxisId="shares"
                  width={54}
                  stroke="var(--text-secondary)"
                  fontSize={10}
                  tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="price"
                  orientation="right"
                  width={50}
                  stroke="#f59e0b"
                  fontSize={10}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `$${v}`}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, name: any, item: any) => {
                    if (name === "K線 (開高低收)") {
                      const p = item?.payload;
                      if (p?.open && p?.close) {
                        return [`開 $${p.open} / 高 $${p.high} / 低 $${p.low} / 收 $${p.close}`, name];
                      }
                    }
                    if (name === "收盤價") return [`$${val}`, name];
                    return [`${Number(val).toLocaleString()} 張`, name];
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "8px" }} />
                <ReferenceLine y={0} yAxisId="shares" stroke="var(--text-secondary)" strokeDasharray="3 3" />
                <Bar yAxisId="shares" dataKey="foreign" name="外資" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="shares" dataKey="trust" name="投信" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="shares" dataKey="dealer" name="自營商" fill="#a855f7" radius={[3, 3, 0, 0]} />
                <Bar yAxisId="price" dataKey="klineRange" name="K線 (開高低收)" barSize={9} shape={<StockCandleShape />} />
                <Line yAxisId="price" type="monotone" dataKey="close" name="收盤價" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="max-h-[520px] overflow-y-auto overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="data-table w-full text-sm">
          <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10 shadow-sm">
            <tr>
              <th className="text-left py-3 px-4">日期</th>
              <th className="text-right py-3 px-4"><Term k="foreign_inv" label="外資買賣超" /></th>
              <th className="text-right py-3 px-4"><Term k="trust_inv" label="投信買賣超" /></th>
              <th className="text-right py-3 px-4"><Term k="dealer_inv" label="自營商買賣超" /></th>
              <th className="text-right py-3 px-4">合計</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {displayRows.map((row, i) => (
              <tr key={i} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                <td className="py-3 px-4 text-secondary font-mono whitespace-nowrap">{row.date}</td>
                <td className="text-right py-3 px-4 whitespace-nowrap">{renderValue(row.foreign)}</td>
                <td className="text-right py-3 px-4 whitespace-nowrap">{renderValue(row.trust)}</td>
                <td className="text-right py-3 px-4 whitespace-nowrap">{renderValue(row.dealer)}</td>
                <td className="text-right py-3 px-4 whitespace-nowrap">{renderValue(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center text-xs text-secondary mt-3 px-1">
        <span>顯示近 30 日交易紀錄（可上下滑動）</span>
        <span>單位：股（紅字買超 / 綠字賣超）</span>
      </div>
    </div>
  );
}
