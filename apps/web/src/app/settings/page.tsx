"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Server, Bell, Trash2, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

export default function SettingsPage() {
  const [backendUrl, setBackendUrl] = useState("");
  const [urlMessage, setUrlMessage] = useState("");
  const [testingUrl, setTestingUrl] = useState(false);
  const [clearMessage, setClearMessage] = useState("");
  const [radarEnabled, setRadarEnabled] = useState(true);
  const [showAdvancedBackend, setShowAdvancedBackend] = useState(false);

  const DEFAULT_BACKEND = "https://stock-backend-lz9p.onrender.com";

  useEffect(() => {
    const customUrl = localStorage.getItem("backend_api_url");
    if (customUrl) setBackendUrl(customUrl);

    const radarSetting = localStorage.getItem("watchlist_radar_enabled");
    setRadarEnabled(radarSetting !== "false");
  }, []);

  const handleToggleRadar = () => {
    const next = !radarEnabled;
    setRadarEnabled(next);
    localStorage.setItem("watchlist_radar_enabled", next ? "true" : "false");
    window.dispatchEvent(new CustomEvent("watchlist_radar_toggle", { detail: next }));
  };

  const handleTestBackend = async () => {
    setTestingUrl(true);
    setUrlMessage("");
    const target = backendUrl.trim() || DEFAULT_BACKEND;
    try {
      const axios = (await import("axios")).default;
      await axios.get(`${target}/api/v1/market/trending`, { timeout: 7000 });
      setUrlMessage("連線正常！後端服務運作中");
    } catch (err: any) {
      setUrlMessage(`連線回應中: ${err.message || "可能處於冷啟動喚醒階段"}`);
    } finally {
      setTestingUrl(false);
    }
  };

  const handleSaveCustomBackend = () => {
    if (backendUrl.trim()) {
      localStorage.setItem("backend_api_url", backendUrl.trim());
      setUrlMessage("已儲存自訂後端網址");
    } else {
      localStorage.removeItem("backend_api_url");
      setUrlMessage("已還原官方預設主機");
    }
  };

  const handleClearCache = () => {
    if (confirm("確定要清除所有本地快取嗎？這將會清除您所有的自選設定與快取數據。")) {
      localStorage.removeItem("watchlist_symbols");
      localStorage.removeItem("backend_api_url");
      setClearMessage("快取已清除完畢");
      setTimeout(() => setClearMessage(""), 2000);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">網站個人設定</h1>
        <p className="text-secondary text-sm">系統主機連線、即時推播與個人化參數配置</p>
      </div>

      {/* 1. 雲端後端連線狀態 (統一連線站長主機，免手動填寫) */}
      <Card title="雲端後端伺服器 (官方連線)">
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Server size={16} />
            </div>
            <div className="flex-1 text-xs space-y-1">
              <div className="font-bold text-primary text-sm flex items-center gap-2">
                <span>站長專屬雲端主機 (Render Cloud)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                  自動直連
                </span>
              </div>
              <p className="text-secondary">
                系統已統一預設直連站長配置好的雲端 API 伺服器，全體使用者皆可開箱即用，無需手動填寫任何伺服器網址。
              </p>
              <div className="font-mono text-muted text-[11px] pt-1">
                目標節點：{backendUrl || DEFAULT_BACKEND}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleTestBackend} disabled={testingUrl}>
              {testingUrl ? "連線檢測中..." : "檢測主機狀態"}
            </Button>
            {urlMessage && <span className="text-xs font-medium text-accent">{urlMessage}</span>}
          </div>

          {/* 進階開發者自訂後端 (收合選單) */}
          <div className="border-t border-[var(--border)] pt-3">
            <button
              type="button"
              onClick={() => setShowAdvancedBackend(!showAdvancedBackend)}
              className="text-xs text-muted hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{showAdvancedBackend ? "收合開發者自訂設定" : "進階：自訂開發者後端 API 網址"}</span>
              {showAdvancedBackend ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {showAdvancedBackend && (
              <div className="mt-3 space-y-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] animate-fade-in text-xs">
                <div>
                  <label className="block font-medium text-secondary mb-1">自訂後端網址 (選填)</label>
                  <input
                    type="text"
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-2 font-mono text-xs text-primary outline-none focus:border-accent"
                    placeholder="https://your-custom-backend.onrender.com"
                    value={backendUrl}
                    onChange={(e) => setBackendUrl(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveCustomBackend}>
                    儲存自訂網址
                  </Button>
                  {backendUrl && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setBackendUrl("");
                        localStorage.removeItem("backend_api_url");
                        setUrlMessage("已還原官方預設主機");
                      }}
                    >
                      還原官方主機
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* 2. 即時通知開關 */}
      <Card title="即時量化雷達推播通知">
        <div className="flex items-center justify-between p-1">
          <div className="space-y-1">
            <div className="font-semibold text-primary flex items-center gap-2">
              <Bell size={16} className={radarEnabled ? "text-accent" : "text-muted"} />
              <span>全自選股量化突破彈窗通知</span>
            </div>
            <div className="text-xs text-secondary max-w-lg">
              盤中自動監控自選股清單之 VCP 收斂突破、主力訂單塊支撐及價格警報，並於畫面角落發送即時推播。
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleRadar}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              radarEnabled ? "bg-accent" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                radarEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </Card>

      {/* 2. 快取管理 */}
      <Card title="本機快取與自選重設">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">清除本地快取與歷史記錄</div>
            <div className="text-xs text-secondary">
              重設瀏覽器暫存的報價快取與本地設定。
            </div>
          </div>
          <div className="flex items-center gap-4">
            {clearMessage && <span className="text-emerald-400 text-xs font-medium">{clearMessage}</span>}
            <Button variant="danger" size="sm" onClick={handleClearCache}>
              清除快取
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
