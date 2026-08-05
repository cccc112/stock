"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { apiMarket } from "@/lib/api";

interface ETFQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent?: number;
  change_percent?: number;
  volume: number;
  market: 'TW' | 'US';
}

export default function EtfPage() {
  const [etfs, setEtfs] = useState<ETFQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchETFs = async () => {
      try {
        const response = await apiMarket.getPopularETFs();
        const data = response.data.data || response.data;
        if (Array.isArray(data)) {
          setEtfs(data);
        }
      } catch (error) {
        console.error("Failed to fetch popular ETFs", error);
      } finally {
        setLoading(false);
      }
    };
    fetchETFs();
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">ETF 專區</h1>
        <p className="text-secondary text-sm">台美股熱門 ETF 即時報價與動向</p>
      </header>

      <Card title="熱門 ETF 報價" className="w-full">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="animate-pulse space-y-4 py-2 px-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-secondary rounded opacity-50"></div>
              ))}
            </div>
          ) : etfs.length === 0 ? (
            <div className="text-center py-6 text-secondary">暫無資料</div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4">代號</th>
                  <th className="text-left py-3 px-4">名稱</th>
                  <th className="text-right py-3 px-4">股價</th>
                  <th className="text-right py-3 px-4">漲跌</th>
                  <th className="text-right py-3 px-4">漲跌幅</th>
                  <th className="text-right py-3 px-4">成交量</th>
                </tr>
              </thead>
              <tbody>
                {etfs.map(etf => {
                  const changePct = etf.changePercent ?? etf.change_percent ?? 0;
                  return (
                    <tr key={etf.symbol}>
                      <td className="py-3 px-4">
                        <Link href={`/stock/${etf.symbol}`} className="font-medium text-accent hover:underline">
                          {etf.symbol}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-secondary">{etf.name}</td>
                      <td className="text-right py-3 px-4 font-medium">{formatNumber(etf.price, etf.market === 'TW' ? 2 : 2)}</td>
                      <td className={`text-right py-3 px-4 ${getChangeColorClass(etf.change, etf.market)}`}>
                        {etf.change > 0 ? '+' : ''}{etf.change.toFixed(2)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Badge value={changePct} market={etf.market} />
                      </td>
                      <td className="text-right py-3 px-4 text-secondary">{formatVolume(etf.volume)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
