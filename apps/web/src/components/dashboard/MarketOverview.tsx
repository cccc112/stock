import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatNumber } from "@/lib/utils";

const indices = [
  { id: 'TWII', name: '台股加權', price: 23450.12, change: 120.5, changePercent: 0.52, market: 'TW' as const },
  { id: 'SPX', name: 'S&P 500', price: 5460.48, change: 25.3, changePercent: 0.47, market: 'US' as const },
  { id: 'NDX', name: 'Nasdaq', price: 19800.2, change: -45.6, changePercent: -0.23, market: 'US' as const },
  { id: '2330', name: 'TSMC', price: 950, change: 15, changePercent: 1.6, market: 'TW' as const },
];

export default function MarketOverview() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
      {indices.map(idx => (
        <Card key={idx.id} className="min-w-[200px] flex-shrink-0">
          <div className="text-secondary text-sm mb-1">{idx.name}</div>
          <div className="text-xl font-bold mb-2">{formatNumber(idx.price)}</div>
          <Badge value={idx.changePercent} market={idx.market} />
        </Card>
      ))}
    </div>
  );
}
