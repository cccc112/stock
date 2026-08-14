"use client";
import { formatNumber, formatPercent, getChangeColorClass } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import { apiPortfolio } from "@/lib/api";

interface HoldingTableProps {
  holdings: any[];
  onUpdate?: () => void;
}

export default function HoldingTable({ holdings, onUpdate }: HoldingTableProps) {
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    if (confirm(`確定要刪除 ${symbol} 的所有庫存紀錄嗎？`)) {
      try {
        await apiPortfolio.deleteHolding(symbol);
        if (onUpdate) onUpdate();
      } catch (err) {
        console.error("Failed to delete holding", err);
        alert("刪除失敗");
      }
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>標的</th>
            <th className="text-right">均價</th>
            <th className="text-right">股數</th>
            <th className="text-right">現價</th>
            <th className="text-right">未實現損益</th>
            <th className="text-right">報酬率</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => {
            const isTW = h.market === 'TW';
            const decimals = 2;
            const pnlClass = getChangeColorClass(h.pnl, h.market);
            
            return (
              <tr key={i} className="cursor-pointer" onClick={() => router.push(`/stock/${h.symbol}`)}>
                <td>
                  <div className="font-medium">{h.symbol}</div>
                  <div className="text-xs text-secondary">{h.name}</div>
                </td>
                <td className="text-right">{formatNumber(h.avg_price || h.avgCost, decimals)}</td>
                <td className="text-right">{formatNumber(h.shares || h.qty, 0)}</td>
                <td className="text-right font-medium">{formatNumber(h.current_price || h.currentPrice, decimals)}</td>
                <td className={`text-right font-medium ${pnlClass}`}>
                  {h.pnl > 0 ? '+' : ''}{formatNumber(h.pnl, decimals)}
                </td>
                <td className={`text-right ${pnlClass}`}>
                  {formatPercent(h.pnl_pct || h.pnlPercent)}
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); /* open trade modal */ }}>交易</Button>
                    <button 
                      onClick={(e) => handleDelete(e, h.symbol)}
                      className="text-secondary hover:text-danger p-1 rounded-md transition-colors"
                      title="刪除庫存"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
