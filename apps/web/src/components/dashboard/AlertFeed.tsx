"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { AlertCircle, TrendingUp, TrendingDown, Zap, ExternalLink } from "lucide-react";
import { apiAlerts } from "@/lib/api";
import { getTriggeredAlerts, RadarAlertEvent } from "@/lib/watchlistRadar";

interface CombinedAlertItem {
  id: string;
  type: "up" | "down" | "info";
  symbol: string;
  title?: string;
  message: string;
  time: string;
  timestamp?: number;
}

export default function AlertFeed() {
  const [alerts, setAlerts] = useState<CombinedAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        let apiList: any[] = [];
        try {
          const res = await apiAlerts.getAlerts();
          apiList = Array.isArray(res.data) ? res.data : res.data.alerts || [];
        } catch {
          // ignore backend failure
        }

        const radarEvents = getTriggeredAlerts();

        const formattedRadar: CombinedAlertItem[] = radarEvents.map((r) => ({
          id: r.id,
          type: r.type,
          symbol: r.symbol,
          title: r.title,
          message: r.message,
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          timestamp: r.timestamp,
        }));

        const formattedApi: CombinedAlertItem[] = apiList.map((a) => ({
          id: a.id,
          type: a.type || "info",
          symbol: a.symbol,
          title: a.title,
          message: a.message || `${a.condition || ""} ${a.value || ""}`,
          time: new Date(a.created_at || a.createdAt || Date.now()).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          timestamp: new Date(a.created_at || a.createdAt || 0).getTime(),
        }));

        const combined = [...formattedRadar, ...formattedApi].sort(
          (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
        );

        setAlerts(combined.slice(0, 5));
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // 監聽即時雷達事件以動態更新
    const handleUpdate = () => fetchAlerts();
    window.addEventListener("watchlist_radar_alert", handleUpdate);
    return () => window.removeEventListener("watchlist_radar_alert", handleUpdate);
  }, []);

  return (
    <Card
      title="自選股即時量化雷達警報"
      className="mb-6"
    >
      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="text-center text-secondary py-4 text-sm animate-pulse">
            雷達掃描中...
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 transition-colors"
            >
              <div className="mt-0.5">
                {alert.type === "up" && <TrendingUp size={16} className="text-emerald-400" />}
                {alert.type === "down" && <TrendingDown size={16} className="text-rose-400" />}
                {alert.type === "info" && <Zap size={16} className="text-accent" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-primary">{alert.symbol}</span>
                    {alert.title && (
                      <span className="text-[11px] font-medium text-accent truncate">
                        {alert.title}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-secondary">{alert.time}</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed line-clamp-2">
                  {alert.message}
                </p>
                <div className="mt-1.5 flex justify-end">
                  <Link
                    href={`/stock/${encodeURIComponent(alert.symbol)}`}
                    className="text-[11px] text-accent hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>開啟個股戰情</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-secondary py-5 text-xs">
            目前自選股皆在常態區間震盪，暫無觸發突破或破線警報
          </div>
        )}
      </div>
    </Card>
  );
}
