import Card from "@/components/ui/Card";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

const mockAlerts = [
  { id: 1, type: 'up', symbol: '2330', message: '突破月線 (930.5)', time: '10:05' },
  { id: 2, type: 'down', symbol: 'AAPL', message: '跌破支撐位 (210.0)', time: '09:30' },
  { id: 3, type: 'info', symbol: 'NVDA', message: '量增價漲，成交量大於 50M', time: '04:15' }
];

export default function AlertFeed() {
  return (
    <Card title="智慧警報" className="mb-6">
      <div className="flex flex-col gap-3">
        {mockAlerts.map(alert => (
          <div key={alert.id} className="flex items-start gap-3 p-3 rounded-md bg-[var(--bg-tertiary)] animate-slide-up">
            <div className="mt-0.5">
              {alert.type === 'up' && <TrendingUp size={16} className="text-success" />}
              {alert.type === 'down' && <TrendingDown size={16} className="text-danger" />}
              {alert.type === 'info' && <AlertCircle size={16} className="text-accent" />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm">{alert.symbol}</span>
                <span className="text-xs text-secondary">{alert.time}</span>
              </div>
              <p className="text-sm text-secondary">{alert.message}</p>
            </div>
          </div>
        ))}
        {mockAlerts.length === 0 && (
          <div className="text-center text-secondary py-4 text-sm">目前沒有觸發的警報</div>
        )}
      </div>
    </Card>
  );
}
