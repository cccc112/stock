"use client";

import { useWatchlist } from "@/hooks/useWatchlist";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function WatchlistPanel() {
  const { items, removeItem } = useWatchlist();
  const router = useRouter();

  return (
    <Card title="自選股報價" className="h-full">
      <div className="overflow-x-auto -mx-5 -my-5">
        {items.length === 0 ? (
          <div className="text-center py-10 text-secondary text-xs">
            尚未加入自選股，可於個股頁面點擊「加自選」
          </div>
        ) : (
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th>代號</th>
                <th>名稱</th>
                <th className="text-right">成交價</th>
                <th className="text-right">漲跌</th>
                <th className="text-right">漲跌幅</th>
                <th className="text-right">成交量</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((stock) => (
                <tr
                  key={stock.symbol}
                  className="cursor-pointer"
                  onClick={() => router.push(`/stock/${stock.symbol}`)}
                >
                  <td className="font-mono font-semibold text-primary">{stock.symbol}</td>
                  <td className="text-secondary">{stock.name}</td>
                  <td className="text-right font-mono font-medium">
                    {formatNumber(stock.price, 2)}
                  </td>
                  <td
                    className={`text-right font-mono ${getChangeColorClass(
                      stock.change,
                      stock.market
                    )}`}
                  >
                    {stock.change > 0 ? "+" : ""}
                    {Number(stock.change || 0).toFixed(2)}
                  </td>
                  <td className="text-right">
                    <Badge value={stock.change_pct} market={stock.market} size="sm" />
                  </td>
                  <td className="text-right font-mono text-secondary">
                    {formatVolume(stock.volume)}
                  </td>
                  <td className="text-right">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeItem(stock.symbol);
                      }}
                      className="p-1.5 text-muted hover:text-danger rounded transition-colors"
                      aria-label="移除自選股"
                    >
                      <X size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
