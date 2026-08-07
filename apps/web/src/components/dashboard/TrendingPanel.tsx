"use client";

import { useEffect, useState } from "react";
import { apiMarket } from "@/lib/api";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface TrendingStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market: 'TW' | 'US';
}

export default function TrendingPanel() {
  const [trending, setTrending] = useState<TrendingStock[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await apiMarket.getTrending();
        const data = response.data.data || response.data;
        if (Array.isArray(data)) {
          setTrending(data);
        }
      } catch (error) {
        console.error("Failed to fetch trending stocks", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  return (
    <Card 
      title="熱門排行" 
      className="h-full"
      headerAction={<TrendingUp size={18} className="text-primary" />}
    >
      <div className="overflow-x-auto">
        {loading ? (
          <div className="animate-pulse space-y-4 py-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-[var(--color-bg-tertiary)] rounded opacity-50"></div>
            ))}
          </div>
        ) : trending.length === 0 ? (
          <div className="text-center py-6 text-secondary">暫無資料</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>代號</th>
                <th>名稱</th>
                <th className="text-right">股價</th>
                <th className="text-right">漲跌</th>
                <th className="text-right">漲跌幅</th>
                <th className="text-right">成交量</th>
              </tr>
            </thead>
            <tbody>
              {trending.map(stock => {
                const changePct = stock.change_pct ?? 0;
                return (
                  <tr 
                    key={stock.symbol} 
                    className="cursor-pointer"
                    onClick={() => router.push(`/stock/${stock.symbol}`)}
                  >
                    <td className="font-medium">{stock.symbol}</td>
                    <td className="text-secondary">{stock.name}</td>
                    <td className="text-right font-medium">{formatNumber(stock.price, stock.market === 'TW' ? 2 : 2)}</td>
                    <td className={`text-right ${getChangeColorClass(stock.change, stock.market)}`}>
                      {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)}
                    </td>
                    <td className="text-right">
                      <Badge value={changePct} market={stock.market} />
                    </td>
                    <td className="text-right text-secondary">{formatVolume(stock.volume)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}
