import Card from "@/components/ui/Card";
import { formatCurrency, formatPercent, getChangeColorClass } from "@/lib/utils";

export default function PnLSummary() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card title="總資產 (TWD)" variant="elevated">
        <div className="text-3xl font-bold mt-2">{formatCurrency(1250000, 'TWD')}</div>
        <div className="text-sm text-secondary mt-1">包含現金 250,000</div>
      </Card>
      
      <Card title="未實現損益 (TWD)">
        <div className={`text-3xl font-bold mt-2 ${getChangeColorClass(45000, 'TW')}`}>
          +{formatCurrency(45000, 'TWD')}
        </div>
        <div className={`text-sm mt-1 ${getChangeColorClass(45000, 'TW')}`}>
          {formatPercent(4.5)}
        </div>
      </Card>

      <Card title="已實現損益 (TWD)">
        <div className={`text-3xl font-bold mt-2 ${getChangeColorClass(12500, 'TW')}`}>
          +{formatCurrency(12500, 'TWD')}
        </div>
        <div className="text-sm text-secondary mt-1">本年度</div>
      </Card>
    </div>
  );
}
