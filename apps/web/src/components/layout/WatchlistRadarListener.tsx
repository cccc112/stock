"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  runWatchlistRadarScan,
  isMarketTradingHours,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  RadarAlertEvent,
} from "@/lib/watchlistRadar";
import { Bell, BellOff, X, ExternalLink, Zap, AlertTriangle, TrendingUp } from "lucide-react";

export default function WatchlistRadarListener() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [activeToasts, setActiveToasts] = useState<RadarAlertEvent[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isNotificationSupported()) {
      const p = getNotificationPermission();
      setPermission(p);
      if (p === "default") {
        setShowPrompt(true);
      }
    }

    // 監聽前端內部自定義事件
    const handleRadarEvent = (e: any) => {
      if (e?.detail) {
        const ev = e.detail as RadarAlertEvent;
        setActiveToasts((prev) => [ev, ...prev.filter((t) => t.id !== ev.id)].slice(0, 3));

        // 8 秒後自動淡出
        setTimeout(() => {
          setActiveToasts((prev) => prev.filter((t) => t.id !== ev.id));
        }, 8000);
      }
    };

    window.addEventListener("watchlist_radar_alert", handleRadarEvent);

    // 啟動定時輪詢掃描
    const runScan = () => {
      runWatchlistRadarScan();
    };

    // 初次載入 3 秒後先掃描一次
    const initialTimer = setTimeout(runScan, 3000);

    // 盤中 60 秒掃描一次，盤後 180 秒掃描一次
    const isTrading = isMarketTradingHours();
    const intervalMs = isTrading ? 60_000 : 180_000;
    const intervalTimer = setInterval(runScan, intervalMs);

    return () => {
      window.removeEventListener("watchlist_radar_alert", handleRadarEvent);
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  const handleEnableNotification = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    setShowPrompt(false);
  };

  const removeToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      {/* 1. 桌面權限提示條（僅在尚未決定時於頁面頂部以精緻膠囊呈現） */}
      {showPrompt && (
        <aside aria-label="全自選股自動量化雷達推播" className="fixed bottom-4 left-4 z-50 flex items-center gap-3 p-3.5 pr-4 rounded-xl bg-[var(--bg-secondary)] border border-accent/40 shadow-2xl backdrop-blur-md animate-slide-up max-w-md">
          <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center flex-shrink-0">
            <Bell size={16} />
          </div>
          <div className="flex-1 text-xs">
            <strong className="text-primary block font-bold">全自選股量化雷達已就緒</strong>
            <span className="text-secondary text-[11px] leading-tight block mt-0.5">
              開啟瀏覽器靜音通知，盤中當自選股 VCP 突破、踩機構訂單塊或達階梯進場價時即時提醒。
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleEnableNotification}
              className="px-2.5 py-1 text-xs font-bold bg-accent text-black rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              啟用推播
            </button>
            <button
              type="button"
              onClick={() => setShowPrompt(false)}
              className="p-1 text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </aside>
      )}

      {/* 2. 右上角純靜音浮動 Toast 警報清單 */}
      {activeToasts.length > 0 && (
        <aside aria-label="即時異動警報" className="fixed top-16 right-4 z-50 space-y-2.5 max-w-sm w-full pointer-events-none">
          {activeToasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto p-4 rounded-xl bg-[var(--bg-secondary)]/95 backdrop-blur-md border border-accent/40 shadow-2xl shadow-black/40 animate-fade-in transition-all hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  {toast.type === "up" ? (
                    <TrendingUp size={16} className="text-emerald-400" />
                  ) : toast.type === "down" ? (
                    <AlertTriangle size={16} className="text-rose-400" />
                  ) : (
                    <Zap size={16} className="text-accent" />
                  )}
                  <span className="text-xs font-bold text-primary">
                    {toast.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="text-secondary hover:text-primary p-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <p className="text-xs text-secondary leading-relaxed mb-2.5">
                {toast.message}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[11px]">
                <span className="font-mono text-primary font-bold">
                  {toast.symbol} · ${toast.price} ({toast.changePct >= 0 ? "+" : ""}{toast.changePct}%)
                </span>
                <Link
                  href={`/stock/${encodeURIComponent(toast.symbol)}`}
                  onClick={() => removeToast(toast.id)}
                  className="flex items-center gap-1 text-accent font-bold hover:underline"
                >
                  <span>查看戰情室</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          ))}
        </aside>
      )}
    </>
  );
}
