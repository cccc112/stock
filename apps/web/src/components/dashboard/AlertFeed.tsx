"use client";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { apiAlerts } from "@/lib/api";

interface AlertItem {
  id: string;
  type: 'up' | 'down' | 'info';
  symbol: string;
  message: string;
  time: string;
  createdAt: string;
}

export default function AlertFeed() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await apiAlerts.getAlerts();
        // Assume res.data is array or { data: [] }
        const data = Array.isArray(res.data) ? res.data : (res.data.alerts || []);
        // Only show triggered or recent alerts? Let's just show what we got.
        setAlerts(data.slice(0, 5)); // show top 5
      } catch (err) {
        setError('無法載入警報');
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  return (
    <Card title="智慧警報" className="mb-6">
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="text-center text-secondary py-4 text-sm animate-pulse">載入中...</div>
        ) : error ? (
          <div className="text-center text-danger py-4 text-sm">{error}</div>
        ) : alerts.length > 0 ? (
          alerts.map(alert => (
            <div key={alert.id} className="flex items-start gap-3 p-3 rounded-md bg-[var(--bg-tertiary)] animate-slide-up">
              <div className="mt-0.5">
                {alert.type === 'up' && <TrendingUp size={16} className="text-success" />}
                {alert.type === 'down' && <TrendingDown size={16} className="text-danger" />}
                {alert.type === 'info' && <AlertCircle size={16} className="text-accent" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm">{alert.symbol}</span>
                  <span className="text-xs text-secondary">{alert.time || new Date(alert.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-secondary">{alert.message}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-secondary py-4 text-sm">目前沒有觸發的警報</div>
        )}
      </div>
    </Card>
  );
}
