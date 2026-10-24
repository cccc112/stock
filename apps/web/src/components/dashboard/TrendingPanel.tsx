"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiStocks } from "@/lib/api";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market: "TW" | "US";
}

const DEFAULT_TRENDING: Stock[] = [
  { symbol: "2330", name: "台積電", price: 0, change: 0, change_pct: 0, volume: 0, market: "TW" },
  { symbol: "2317", name: "鴻海", price: 0, change: 0, change_pct: 0, volume: 0, market: "TW" },
  { symbol: "2454", name: "聯發科", price: 0, change: 0, change_pct: 0, volume: 0, market: "TW" },
  { symbol: "3231", name: "緯創", price: 0, change: 0, change_pct: 0, volume: 0, market: "TW" },
  { symbol: "2382", name: "廣達", price: 0, change: 0, change_pct: 0, volume: 0, market: "TW" },
  { symbol: "2881", name: "富邦金", price: 0, change: 0, change_pct: 0, volume: 0, market: "TW" },
];

export default function TrendingPanel() {
  const router = useRouter();
  const [trending, setTrending] = useState<Stock[]>(DEFAULT_TRENDING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const results = await Promise.allSettled(
          DEFAULT_TRENDING.map(s => apiStocks.getQuote(s.symbol))
        );
        const updated = DEFAULT_TRENDING.map((stock, i) => {
          const res = results[i];
          if (res.status === "fulfilled" && res.value?.data) {
            const q = res.value.data;
            return {
              ...stock,
              name: q.name || stock.name,
              price: q.price ?? stock.price,
              change: q.change ?? stock.change,
              change_pct: q.change_pct ?? stock.change_pct,
              volume: q.volume ?? stock.volume,
            };
          }
          return stock;
        });
        setTrending(updated);
      } catch (err) {
        console.error("Failed to load trending stocks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
    const interval = setInterval(fetchTrending, 30000);
    return () => clearInterval(interval);
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
              <div key={i} className="h-8 bg-[var(--bg-tertiary)] rounded" />
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
