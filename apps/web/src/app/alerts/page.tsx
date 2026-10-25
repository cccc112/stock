"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  Bell,
  Plus,
  Trash2,
  Zap,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { apiAlerts } from "@/lib/api";
import {
  getWatchlistSymbols,
  getTriggeredAlerts,
  getNotificationPermission,
  requestNotificationPermission,
  RadarAlertEvent,
} from "@/lib/watchlistRadar";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [radarEvents, setRadarEvents] = useState<RadarAlertEvent[]>([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [permission, setPermission] = useState<string>("default");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New alert form state
  const [symbol, setSymbol] = useState("");
  const [condition, setCondition] = useState("");
  const [value, setValue] = useState("");

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      try {
        const res = await apiAlerts.getAlerts();
        setAlerts(Array.isArray(res.data) ? res.data : res.data.alerts || []);
      } catch {
        // Backend optional
      }
      setRadarEvents(getTriggeredAlerts());
      setWatchlistSymbols(getWatchlistSymbols());
      setPermission(getNotificationPermission());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const handleUpdate = () => {
      setRadarEvents(getTriggeredAlerts());
    };
    window.addEventListener("watchlist_radar_alert", handleUpdate);
    return () => window.removeEventListener("watchlist_radar_alert", handleUpdate);
  }, []);

  const handleEnableNotification = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
  };

  const handleClearRadarHistory = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("triggered_radar_alerts");
      setRadarEvents([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !condition) return;
    try {
      await apiAlerts.createAlert({
        symbol,
        condition,
        value,
        type: "info",
        message: `${condition} ${value}`,
      });
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
      setAlerts(
        alerts.map((a) => (a.id === id ? { ...a, status: active ? "active" : "inactive" } : a))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除此自訂警報嗎？")) return;
    try {
      await apiAlerts.deleteAlert(id);
      setAlerts(alerts.filter((a) => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
      {/* 頂部標題 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Radio className="text-accent" size={24} />
            智慧量化雷達與警報中心
          </h1>
          <p className="text-secondary text-xs sm:text-sm mt-0.5">
            全自選股池背景自動監控（VCP 突破、SMC 訂單塊、階梯掛單進場）與自訂價格警示
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={16} className="mr-1.5" /> 新增自訂警報
          </Button>
        </div>
      </div>

      {/* 1. 全自選股池自動雷達狀態卡 */}
      <Card className="p-5 border-accent/40 bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-accent/5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-bold text-primary">
                全自選股自動量化雷達 (Watchlist Smart Radar)
              </h2>
            </div>
            <p className="text-xs text-secondary mt-1">
              系統於開盤中每 60 秒自動掃描您的所有自選股，無需手動設定即可捕捉機構主力異動。
            </p>
          </div>

          <div className="flex items-center gap-2">
            {permission === "granted" ? (
              <span className="text-xs px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-bold">
                <ShieldCheck size={14} /> 瀏覽器靜音推播已啟用
              </span>
            ) : (
              <Button size="sm" variant="primary" onClick={handleEnableNotification}>
                <Bell size={14} className="mr-1.5" /> 啟用桌面推播授權
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <span className="text-secondary block mb-1">當前監控自選標的</span>
            <div className="flex flex-wrap gap-1">
              {watchlistSymbols.map((s) => (
                <span
                  key={s}
                  className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] font-mono text-primary font-bold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <span className="text-secondary block mb-1">監控訊號 1 · 波動突破</span>
            <span className="text-accent font-bold block">
              Minervini VCP 收斂突破
            </span>
            <span className="text-[11px] text-secondary">
              壓縮比 ≤ 0.85 且放量轉強
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <span className="text-secondary block mb-1">監控訊號 2 · 機構支撐</span>
            <span className="text-indigo-400 font-bold block">
              SMC 機構訂單塊踩點
            </span>
            <span className="text-[11px] text-secondary">
              回測多方主力成本防守區
            </span>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <span className="text-secondary block mb-1">監控訊號 3 · 實戰掛單</span>
            <span className="text-emerald-400 font-bold block">
              AI 委員會階梯進場與停損
            </span>
            <span className="text-[11px] text-secondary">
              觸碰階梯買點或破線風控
            </span>
          </div>
        </div>
      </Card>

      {/* 2. 即時量化雷達已觸發紀錄 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-accent" />
            <h2 className="text-sm font-bold text-primary">
              自選股即時量化雷達觸發紀錄 ({radarEvents.length})
            </h2>
          </div>
          {radarEvents.length > 0 && (
            <button
              type="button"
              onClick={handleClearRadarHistory}
              className="text-xs text-secondary hover:text-danger transition-colors cursor-pointer"
            >
              清空雷達歷史
            </button>
          )}
        </div>

        {radarEvents.length === 0 ? (
          <Card className="p-6 text-center text-secondary text-xs">
            目前所有自選股皆在常態區間運行，暫無觸發突破或停損訊號。
          </Card>
        ) : (
          <div className="space-y-2.5">
            {radarEvents.map((ev) => (
              <Card
                key={ev.id}
                className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] flex-shrink-0 mt-0.5">
                    {ev.type === "up" ? (
                      <TrendingUp size={18} className="text-emerald-400" />
                    ) : ev.type === "down" ? (
                      <AlertTriangle size={18} className="text-rose-400" />
                    ) : (
                      <Zap size={18} className="text-accent" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm text-primary">{ev.symbol}</span>
                      <span className="text-xs text-secondary">{ev.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-accent/15 text-accent font-medium">
                        {ev.title}
                      </span>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed">
                      {ev.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                  <span className="text-xs font-mono text-secondary">
                    {new Date(ev.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Link
                    href={`/stock/${encodeURIComponent(ev.symbol)}`}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-accent hover:text-black transition-colors text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>戰情室</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 3. 使用者手動自訂警報清單 */}
      <div className="space-y-3 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-accent" />
          <h2 className="text-sm font-bold text-primary">
            使用者自訂價位警報 ({alerts.length})
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-8 text-secondary text-xs">載入中...</div>
        ) : alerts.length === 0 ? (
          <Card className="p-6 text-center text-secondary text-xs">
            目前沒有設定自訂價格警報，可點擊右上角「新增自訂警報」設定特定價位提醒。
          </Card>
        ) : (
          <div className="space-y-2.5">
            {alerts.map((alert) => (
              <Card key={alert.id} className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      alert.status === "active"
                        ? "bg-accent/15 text-accent"
                        : alert.status === "triggered"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-[var(--bg-tertiary)] text-secondary"
                    }`}
                  >
                    <Bell size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-primary">
                      {alert.symbol} {alert.name || ""}
                    </div>
                    <div className="text-xs text-secondary">
                      條件：{alert.condition || alert.message} {alert.value || ""}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                      alert.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : alert.status === "triggered"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-[var(--bg-tertiary)] text-secondary"
                    }`}
                  >
                    {alert.status === "active"
                      ? "監控中"
                      : alert.status === "triggered"
                      ? "已觸發"
                      : "已停用"}
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={alert.status === "active"}
                        onChange={(e) => handleToggle(alert.id, e.target.checked)}
                      />
                      <div className="w-8 h-4 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDelete(alert.id)}
                      className="p-1.5 text-secondary hover:text-danger rounded transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 新增警報 Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="新增自訂警報">
        <form className="space-y-4" onSubmit={handleCreate}>
          <div>
            <label className="block text-sm text-secondary mb-1">股票代號</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 2330.TW 或 NVDA"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-secondary mb-1">條件設定</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 價格大於、成交量大於、跌破支撐"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-secondary mb-1">目標數值</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 1050"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>
            <Button type="submit">儲存警報</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
