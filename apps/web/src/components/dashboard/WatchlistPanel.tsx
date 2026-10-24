"use client";

import { useWatchlist } from "@/hooks/useWatchlist";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { X, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function WatchlistPanel() {
  const { items, removeItem } = useWatchlist();
  const router = useRouter();

  return (
    <Card 
      title="自選股報價" 
      className="h-full"
      headerAction={<button className="text-secondary hover:text-primary"><Search size={18} /></button>}
    >
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>代號</th>
              <th>名稱</th>
              <th className="text-right">股價</th>
              <th className="text-right">漲跌</th>
              <th className="text-right">漲跌幅</th>
              <th className="text-right">成交量</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(stock => (
              <tr 
                key={stock.symbol} 
                className="cursor-pointer"
                onClick={() => router.push(`/stock/${stock.symbol}`)}
              >
                <td className="font-medium">{stock.symbol}</td>
                <td className="text-secondary">{stock.name}</td>
                <td className="text-right font-medium">{formatNumber(stock.price, 2)}</td>
                <td className={`text-right ${getChangeColorClass(stock.change, stock.market)}`}>
                  {stock.change > 0 ? '+' : ''}{stock.change}
                </td>
                <td className="text-right">
                  <Badge value={stock.change_pct} market={stock.market} />
                </td>
                <td className="text-right text-secondary">{formatVolume(stock.volume)}</td>
                <td className="text-right">
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeItem(stock.symbol); }}
                    className="p-1 text-secondary hover:text-danger rounded"
                  >
                    <X size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
