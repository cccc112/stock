"use client";
import { formatNumber, formatPercent, getChangeColorClass } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

interface HoldingTableProps {
  holdings: any[];
}

export default function HoldingTable({ holdings }: HoldingTableProps) {
  const router = useRouter();

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
            const decimals = isTW ? 0 : 2;
            const pnlClass = getChangeColorClass(h.pnl, h.market);
            
            return (
              <tr key={i} className="cursor-pointer" onClick={() => router.push(`/stock/${h.symbol}`)}>
                <td>
                  <div className="font-medium">{h.symbol}</div>
                  <div className="text-xs text-secondary">{h.name}</div>
                </td>
                <td className="text-right">{formatNumber(h.avgCost, decimals)}</td>
                <td className="text-right">{formatNumber(h.qty, 0)}</td>
                <td className="text-right font-medium">{formatNumber(h.currentPrice, decimals)}</td>
                <td className={`text-right font-medium ${pnlClass}`}>
                  {h.pnl > 0 ? '+' : ''}{formatNumber(h.pnl, decimals)}
                </td>
                <td className={`text-right ${pnlClass}`}>
                  {formatPercent(h.pnlPercent)}
                </td>
                <td className="text-right">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); /* open trade modal */ }}>交易</Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
