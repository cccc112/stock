import Card from "@/components/ui/Card";
import { formatCurrency, formatPercent, getChangeColorClass } from "@/lib/utils";

export default function PnLSummary({ summary, holdings }: { summary: any, holdings: any[] }) {
  const totalAssets = holdings.reduce((sum, h) => sum + (h.current_price || h.currentPrice) * (h.shares || h.qty), 0);
  const totalPnl = summary?.total_pnl_twd || 0;
  const totalCost = holdings.reduce((sum, h) => sum + (h.avg_price || h.avgCost) * (h.shares || h.qty), 0);
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card title="股票總資產 (TWD)" variant="elevated">
        <div className="text-3xl font-bold mt-2">{formatCurrency(totalAssets, 'TWD')}</div>
        <div className="text-sm text-secondary mt-1">目前庫存市值</div>
      </Card>
      
      <Card title="未實現損益 (TWD)">
        <div className={`text-3xl font-bold mt-2 ${getChangeColorClass(totalPnl, 'TW')}`}>
          {totalPnl > 0 ? '+' : ''}{formatCurrency(totalPnl, 'TWD')}
        </div>
        <div className={`text-sm mt-1 ${getChangeColorClass(totalPnl, 'TW')}`}>
          {formatPercent(pnlPercent)}
        </div>
      </Card>

      <Card title="已實現損益 (TWD)">
        <div className="text-3xl font-bold mt-2 text-secondary">
          -
        </div>
        <div className="text-sm text-secondary mt-1">開發中</div>
      </Card>
    </div>
  );
}
