"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { formatNumber } from "@/lib/utils";

export default function InstitutionalSection({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInstitutional = async () => {
      try {
        const res = await api.get(`/stocks/${symbol}/institutional`);
        const items = res.data?.data || res.data || [];
        setData(Array.isArray(items) ? items : []);
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
      <div className="p-4 space-y-4">
        <LoadingSkeleton variant="text" />
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  if (!data || data.length === 0) {
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
    <div className="pt-2">
      <div className="max-h-[520px] overflow-y-auto overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="data-table w-full text-sm">
          <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10 shadow-sm">
            <tr>
              <th className="text-left py-3 px-4">日期</th>
              <th className="text-right py-3 px-4">外資買賣超</th>
              <th className="text-right py-3 px-4">投信買賣超</th>
              <th className="text-right py-3 px-4">自營商買賣超</th>
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
