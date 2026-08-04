import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";

const MOCK_ETFS = [
  { symbol: '0050', name: '元大台灣50', price: 185.20, change: 2.1, changePercent: 1.15, volume: 15420, market: 'TW' as const },
  { symbol: '0056', name: '元大高股息', price: 39.85, change: -0.15, changePercent: -0.38, volume: 45210, market: 'TW' as const },
  { symbol: '00878', name: '國泰永續高股息', price: 23.45, change: 0.12, changePercent: 0.51, volume: 88520, market: 'TW' as const },
  { symbol: '00929', name: '復華台灣科技優息', price: 20.15, change: 0.35, changePercent: 1.77, volume: 120500, market: 'TW' as const },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 542.15, change: 4.5, changePercent: 0.84, volume: 45210000, market: 'US' as const },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 475.22, change: 6.8, changePercent: 1.45, volume: 38500000, market: 'US' as const },
];

export default function EtfPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">ETF 專區</h1>
        <p className="text-secondary text-sm">台美股熱門 ETF 即時報價與動向</p>
      </header>

      <Card title="熱門 ETF 報價" className="w-full">
        <div className="overflow-x-auto">
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
              {MOCK_ETFS.map(etf => (
                <tr key={etf.symbol} className="hover:bg-bg-tertiary transition-colors border-b border-border last:border-0">
                  <td className="py-3 px-4">
                    <Link href={`/stock/${etf.symbol}`} className="font-medium text-accent hover:underline">
                      {etf.symbol}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-secondary">{etf.name}</td>
                  <td className="text-right py-3 px-4 font-medium">{formatNumber(etf.price, etf.market === 'TW' ? 2 : 2)}</td>
                  <td className={`text-right py-3 px-4 ${getChangeColorClass(etf.change, etf.market)}`}>
                    {etf.change > 0 ? '+' : ''}{etf.change}
                  </td>
                  <td className="text-right py-3 px-4">
                    <Badge value={etf.changePercent} market={etf.market} />
                  </td>
                  <td className="text-right py-3 px-4 text-secondary">{formatVolume(etf.volume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
