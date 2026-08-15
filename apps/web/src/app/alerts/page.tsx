"use client";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Bell, Plus, Trash2 } from "lucide-react";
import { apiAlerts } from "@/lib/api";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New alert form state
  const [symbol, setSymbol] = useState("");
  const [condition, setCondition] = useState("");
  const [value, setValue] = useState("");

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await apiAlerts.getAlerts();
      setAlerts(Array.isArray(res.data) ? res.data : (res.data.alerts || []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !condition) return;
    try {
      await apiAlerts.createAlert({ symbol, condition, value, type: 'info', message: `${condition} ${value}` });
      setIsModalOpen(false);
      setSymbol("");
      setCondition("");
      setValue("");
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await apiAlerts.toggleAlert(id, active);
      setAlerts(alerts.map(a => a.id === id ? { ...a, status: active ? 'active' : 'inactive' } : a));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此警報嗎？')) return;
    try {
      await apiAlerts.deleteAlert(id);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">智慧警報</h1>
          <p className="text-secondary text-sm">設定客製化條件，捕捉最佳進出場時機</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus size={16} className="mr-2" /> 新增警報</Button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-secondary">載入中...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-secondary">目前沒有設定任何警報</div>
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id} className="flex flex-row items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${
                  alert.status === 'active' ? 'bg-accent-light text-accent' :
                  alert.status === 'triggered' ? 'bg-warning-light text-warning' : 'bg-[var(--bg-tertiary)] text-secondary'
                }`}>
                  <Bell size={20} />
                </div>
                <div>
                  <div className="font-semibold">{alert.symbol} {alert.name || ''}</div>
                  <div className="text-sm text-secondary">條件：{alert.condition || alert.message} {alert.value || ''}</div>
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
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={alert.status === 'active'} 
                      onChange={(e) => handleToggle(alert.id, e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
                  </label>
                  <button onClick={() => handleDelete(alert.id)} className="p-2 text-secondary hover:text-danger rounded transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="新增警報">
        <form className="space-y-4" onSubmit={handleCreate}>
          <div>
            <label className="block text-sm text-secondary mb-1">股票代號</label>
            <input type="text" className="input-field" value={symbol} onChange={e => setSymbol(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-secondary mb-1">條件設定</label>
            <input type="text" className="input-field" placeholder="e.g. 價格大於、成交量大於" value={condition} onChange={e => setCondition(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-secondary mb-1">目標數值</label>
            <input type="text" className="input-field" value={value} onChange={e => setValue(e.target.value)} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button type="submit">儲存</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
