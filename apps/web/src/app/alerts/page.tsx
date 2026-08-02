"use client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Bell, Plus, Trash2 } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">智慧警報</h1>
          <p className="text-secondary text-sm">設定客製化條件，捕捉最佳進出場時機</p>
        </div>
        <Button><Plus size={16} className="mr-2" /> 新增警報</Button>
      </div>

      <div className="space-y-4">
        {[
          { symbol: '2330', name: '台積電', condition: '價格大於', value: '960', status: 'active' },
          { symbol: 'AAPL', name: 'Apple Inc.', condition: '跌破', value: '季線', status: 'triggered' },
          { symbol: 'NVDA', name: 'NVIDIA', condition: '成交量大於', value: '50M', status: 'inactive' },
        ].map((alert, i) => (
          <Card key={i} className="flex flex-row items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${
                alert.status === 'active' ? 'bg-accent-light text-accent' :
                alert.status === 'triggered' ? 'bg-warning-light text-warning' : 'bg-secondary text-muted'
              }`}>
                <Bell size={20} />
              </div>
              <div>
                <div className="font-semibold">{alert.symbol} {alert.name}</div>
                <div className="text-sm text-secondary">條件：{alert.condition} {alert.value}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xs px-2 py-1 rounded ${
                alert.status === 'active' ? 'bg-success-light text-success' :
                alert.status === 'triggered' ? 'bg-warning-light text-warning' : 'bg-[var(--bg-tertiary)] text-secondary'
              }`}>
                {alert.status === 'active' ? '監控中' : alert.status === 'triggered' ? '已觸發' : '已停用'}
              </span>
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked={alert.status === 'active'} />
                  <div className="w-9 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                </label>
                <button className="p-2 text-secondary hover:text-danger rounded transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
