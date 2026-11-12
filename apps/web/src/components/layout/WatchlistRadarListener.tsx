"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  runWatchlistRadarScan,
  getWatchlistSymbols,
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    // 檢查使用者是否手動關閉推播通知
    const storedEnabled = localStorage.getItem("watchlist_radar_enabled");
    const isEnabled = storedEnabled !== "false";
    setNotificationsEnabled(isEnabled);

    if (!isEnabled) return;

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
        // 依照 symbol 進行聚合，若已有同一檔股票的 toast，直接替換更新為最新聚合訊息
        setActiveToasts((prev) => [ev, ...prev.filter((t) => t.symbol !== ev.symbol)].slice(0, 3));

        // 8 秒後自動淡出
        setTimeout(() => {
          setActiveToasts((prev) => prev.filter((t) => t.id !== ev.id));
        }, 8000);
      }
    };

    const handleToggleEvent = (e: any) => {
      const state = e?.detail ?? (localStorage.getItem("watchlist_radar_enabled") !== "false");
      setNotificationsEnabled(state);
      if (!state) {
        setActiveToasts([]);
        setShowPrompt(false);
      }
    };

    window.addEventListener("watchlist_radar_alert", handleRadarEvent);
    window.addEventListener("watchlist_radar_toggle", handleToggleEvent);

    // 啟動定時輪詢掃描與 LINE 自動主動通報巡檢
    const runScan = async () => {
      if (localStorage.getItem("watchlist_radar_enabled") !== "false") {
        await runWatchlistRadarScan();
      }

      // 檢查是否啟用 LINE 自動主動通報巡檢 (預設開啟，每 25 分鐘自動巡檢一次避免洗版)
      const lineAutoEnabled = localStorage.getItem("line_auto_push_enabled") !== "false";
      if (lineAutoEnabled) {
        const lastCronTs = Number(localStorage.getItem("last_auto_line_cron_ts") || 0);
        const now = Date.now();
        if (now - lastCronTs > 25 * 60 * 1000) {
          localStorage.setItem("last_auto_line_cron_ts", String(now));
          const symbols = getWatchlistSymbols();
          fetch("/api/line/auto-notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbols }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data?.success && data.target) {
                const logItem = {
                  symbol: data.target.symbol,
                  name: data.target.name,
                  title: data.triggerName || "熊霸定時主動巡檢",
                  price: data.target.price,
                  changePct: data.target.changePct,
                  time: new Date().toLocaleTimeString("zh-TW", { hour12: false }),
                };
                localStorage.setItem("last_line_auto_push_log", JSON.stringify(logItem));
                window.dispatchEvent(new CustomEvent("line_auto_pushed", { detail: logItem }));
              }
            })
            .catch(() => {});
        }
      }
    };

    // 初次載入 4 秒後先掃描一次
    const initialTimer = setTimeout(runScan, 4000);

    // 盤中 60 秒掃描一次，盤後 180 秒掃描一次
    const isTrading = isMarketTradingHours();
    const intervalMs = isTrading ? 60_000 : 180_000;
    const intervalTimer = setInterval(runScan, intervalMs);

    return () => {
      window.removeEventListener("watchlist_radar_alert", handleRadarEvent);
      window.removeEventListener("watchlist_radar_toggle", handleToggleEvent);
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  const handleEnableNotification = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    setShowPrompt(false);
  };

  const handleDisableForever = () => {
    localStorage.setItem("watchlist_radar_enabled", "false");
    setNotificationsEnabled(false);
    setShowPrompt(false);
    setActiveToasts([]);
    window.dispatchEvent(new CustomEvent("watchlist_radar_toggle", { detail: false }));
  };

  const removeToast = (id: string) => {
    setActiveToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // 若使用者已關閉即時通知，則完全不渲染任何 DOM
  if (!notificationsEnabled) return null;

  return (
    <>
      {/* 1. 桌面權限提示條（附帶關閉/不再提醒開關） */}
      {showPrompt && (
        <aside aria-label="全自選股自動量化雷達推播" className="fixed bottom-4 left-4 z-50 flex items-center gap-3 p-3.5 pr-4 rounded-xl bg-[var(--bg-secondary)] border border-accent/40 shadow-2xl backdrop-blur-md animate-slide-up max-w-md">
          <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center flex-shrink-0">
            <Bell size={16} />
          </div>
          <div className="flex-1 text-xs">
            <strong className="text-primary block font-bold">全自選股量化雷達已就緒</strong>
            <span className="text-secondary text-[11px] leading-tight block mt-0.5">
              開啟瀏覽器靜音通知，盤中當自選股突破或踩機構訂單塊時即時提醒。
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleEnableNotification}
              className="px-2.5 py-1 text-xs font-bold bg-accent text-black rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              開啟推播
            </button>
            <button
              type="button"
              onClick={handleDisableForever}
              className="px-2 py-1 text-[11px] text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
              title="關閉即時通知，不再彈出提示"
            >
              關閉通知
            </button>
          </div>
        </aside>
      )}

      {/* 2. 右上角浮動 Toast 警報清單（提供一鍵關閉通知功能） */}
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
                    <TrendingUp size={16} className="text-rose-400" />
                  ) : toast.type === "down" ? (
                    <AlertTriangle size={16} className="text-emerald-400" />
                  ) : (
                    <Zap size={16} className="text-accent" />
                  )}
                  <span className="text-xs font-bold text-primary">
                    {toast.title}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleDisableForever}
                    className="p-1 text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                    title="完全關閉所有即時推播通知"
                  >
                    <BellOff size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="p-1 text-secondary hover:text-primary transition-colors cursor-pointer"
                    title="關閉此訊息"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="text-xs text-primary font-medium mb-1.5 leading-relaxed">
                {toast.message}
              </div>

              {toast.signals && toast.signals.length > 1 && (
                <div className="my-2 p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-[11px] space-y-1">
                  {toast.signals.map((sig, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-secondary">
                      <span className="text-accent font-bold">•</span>
                      <span>{sig}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--border)] text-muted">
                <span>{new Date(toast.timestamp).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                <Link
                  href={`/stock/${encodeURIComponent(toast.symbol)}`}
                  className="text-accent hover:underline flex items-center gap-1 font-medium"
                >
                  <span>查看即時圖表</span>
                  <ExternalLink size={10} />
                </Link>
              </div>
            </div>
          ))}
        </aside>
      )}
    </>
  );
}
