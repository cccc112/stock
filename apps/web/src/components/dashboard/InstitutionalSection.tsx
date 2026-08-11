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
        // FinMind data usually comes as { data: [...] }
        const items = res.data.data || res.data || [];
        // Sort descending by date
        const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setData(sorted);
      } catch (e) {
        console.error("Failed to fetch institutional data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchInstitutional();
  }, [symbol]);

  if (loading) return <div className="p-4 space-y-4"><LoadingSkeleton variant="text" /><LoadingSkeleton variant="card" /></div>;
  if (!data || data.length === 0) return <div className="p-6 text-center text-secondary">尚無籌碼資料 (可能非台股或無資料)</div>;

  // Group by date to show a clean table
  const groupedByDate: Record<string, any> = {};
  data.forEach(item => {
    if (!groupedByDate[item.date]) {
      groupedByDate[item.date] = { date: item.date, foreign: 0, trust: 0, dealer: 0 };
    }
    const val = item.buy - item.sell;
    if (item.name.includes("外資")) groupedByDate[item.date].foreign += val;
    else if (item.name.includes("投信")) groupedByDate[item.date].trust += val;
    else if (item.name.includes("自營商")) groupedByDate[item.date].dealer += val;
  });

  const displayRows = Object.values(groupedByDate).slice(0, 15); // Show last 15 days

  return (
    <div className="pt-4 overflow-x-auto">
      <table className="data-table w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-3 px-4">日期</th>
            <th className="text-right py-3 px-4">外資買賣超</th>
            <th className="text-right py-3 px-4">投信買賣超</th>
            <th className="text-right py-3 px-4">自營商買賣超</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, i) => (
            <tr key={i} className="hover:bg-[var(--bg-tertiary)] transition-colors">
              <td className="py-3 px-4 text-secondary">{row.date}</td>
              <td className={`text-right py-3 px-4 font-medium ${row.foreign > 0 ? 'text-up-tw' : row.foreign < 0 ? 'text-down-tw' : ''}`}>
                {formatNumber(row.foreign)}
              </td>
              <td className={`text-right py-3 px-4 font-medium ${row.trust > 0 ? 'text-up-tw' : row.trust < 0 ? 'text-down-tw' : ''}`}>
                {formatNumber(row.trust)}
              </td>
              <td className={`text-right py-3 px-4 font-medium ${row.dealer > 0 ? 'text-up-tw' : row.dealer < 0 ? 'text-down-tw' : ''}`}>
                {formatNumber(row.dealer)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-xs text-secondary mt-4 text-right">單位：股</div>
    </div>
  );
}
