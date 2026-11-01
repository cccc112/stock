"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LineBindingCard from "@/components/ui/LineBindingCard";
import { Server, Bell, Trash2, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp, Palette } from "lucide-react";
import { useColorPreference } from "@/hooks/useColorPreference";
import { getCurrentUserNamespace } from "@/hooks/useAuth";

const getNamespaceKey = (base: string) => {
  const ns = getCurrentUserNamespace();
  return ns === "default" ? base : `${base}_${ns}`;
};

export default function SettingsPage() {
  const { preference, setPreference } = useColorPreference();
  const [backendUrl, setBackendUrl] = useState("");
  const [urlMessage, setUrlMessage] = useState("");
  const [testingUrl, setTestingUrl] = useState(false);
  const [clearMessage, setClearMessage] = useState("");
  const [radarEnabled, setRadarEnabled] = useState(true);
  const [showAdvancedBackend, setShowAdvancedBackend] = useState(false);

  const DEFAULT_BACKEND = "https://stock-backend-lz9p.onrender.com";

  useEffect(() => {
    const loadSettings = () => {
      const customUrl = localStorage.getItem(getNamespaceKey("backend_api_url"));
      setBackendUrl(customUrl || "");

      const radarSetting = localStorage.getItem(getNamespaceKey("watchlist_radar_enabled"));
      setRadarEnabled(radarSetting !== "false");
    };

    loadSettings();
    window.addEventListener("stock_auth_changed", loadSettings);
    return () => window.removeEventListener("stock_auth_changed", loadSettings);
  }, []);

  const handleToggleRadar = () => {
    const next = !radarEnabled;
    setRadarEnabled(next);
    localStorage.setItem(getNamespaceKey("watchlist_radar_enabled"), next ? "true" : "false");
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
    const key = getNamespaceKey("backend_api_url");
    if (backendUrl.trim()) {
      localStorage.setItem(key, backendUrl.trim());
      setUrlMessage("已儲存自訂後端網址");
    } else {
      localStorage.removeItem(key);
      setUrlMessage("已還原官方預設主機");
    }
  };

  const handleClearCache = () => {
    if (confirm("確定要重設當前帳號的自選股與個人設定嗎？這將會還原初始預設種子。")) {
      const ns = getCurrentUserNamespace();
      localStorage.removeItem(ns === "default" ? "watchlist_symbols" : `watchlist_symbols_${ns}`);
      localStorage.removeItem(ns === "default" ? "watchlist_categories" : `watchlist_categories_${ns}`);
      localStorage.removeItem(getNamespaceKey("backend_api_url"));
      localStorage.removeItem(getNamespaceKey("watchlist_radar_enabled"));
      localStorage.removeItem(getNamespaceKey("stock_color_preference"));
      setClearMessage("已還原官方初始設定");
      window.dispatchEvent(new CustomEvent("watchlist_changed"));
      setTimeout(() => setClearMessage(""), 2000);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">網站個人設定</h1>
        <p className="text-secondary text-sm">系統主機連線、即時推播與個人化參數配置</p>
      </div>

      {/* LINE 官方推播綁定與 Pro 會員 */}
      <LineBindingCard />

      {/* 漲跌顏色偏好設定 (紅漲綠跌 vs 綠漲紅跌) */}
      <Card title="漲跌顏色偏好設定 (Price Color Scheme)">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-semibold text-primary flex items-center gap-2">
                <Palette size={16} className="text-accent" />
                <span>全站標的漲跌與 K 線色彩慣例</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                自訂台股、美股、加密貨幣、外匯、期貨等所有市場與資產的漲跌色彩慣例。切換後全站報價卡片、清單與 K 線圖表立即同步生效。
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/30 font-medium whitespace-nowrap">
              {preference === "red-up" ? "當前：紅漲綠跌" : "當前：綠漲紅跌"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* 選項 1: 紅漲綠跌 */}
            <div
              onClick={() => setPreference("red-up")}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3.5 ${
                preference === "red-up"
                  ? "bg-accent/10 border-accent shadow-sm ring-1 ring-accent/30"
                  : "bg-[var(--bg-tertiary)] border-[var(--border)] hover:border-[var(--border-hover)]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-sm text-primary flex items-center gap-2">
                    <span>紅漲綠跌</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-semibold">
                      台股 / 亞股慣例
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-1.5 leading-relaxed">
                    上漲顯示紅色、下跌顯示綠色。符合台灣證券交易所、櫃買中心與亞洲主流市場看盤習慣。
                  </p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    preference === "red-up" ? "border-accent bg-accent text-white" : "border-muted"
                  }`}
                >
                  {preference === "red-up" && <CheckCircle2 size={12} className="stroke-[3]" />}
                </div>
              </div>

              {/* 預覽效果 */}
              <div className="flex items-center gap-2 pt-2.5 border-t border-[var(--border)]/60 text-xs font-mono">
                <span className="text-muted text-[11px]">視覺預覽：</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                  +2.45%
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  -1.80%
                </span>
              </div>
            </div>

            {/* 選項 2: 綠漲紅跌 */}
            <div
              onClick={() => setPreference("green-up")}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-3.5 ${
                preference === "green-up"
                  ? "bg-accent/10 border-accent shadow-sm ring-1 ring-accent/30"
                  : "bg-[var(--bg-tertiary)] border-[var(--border)] hover:border-[var(--border-hover)]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-sm text-primary flex items-center gap-2">
                    <span>綠漲紅跌</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                      美股 / 國際慣例
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-1.5 leading-relaxed">
                    上漲顯示綠色、下跌顯示紅色。符合 Wall Street、TradingView 與全球主流加密貨幣交易所習慣。
                  </p>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    preference === "green-up" ? "border-accent bg-accent text-white" : "border-muted"
                  }`}
                >
                  {preference === "green-up" && <CheckCircle2 size={12} className="stroke-[3]" />}
                </div>
              </div>

              {/* 預覽效果 */}
              <div className="flex items-center gap-2 pt-2.5 border-t border-[var(--border)]/60 text-xs font-mono">
                <span className="text-muted text-[11px]">視覺預覽：</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  +2.45%
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                  -1.80%
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
                        localStorage.removeItem(getNamespaceKey("backend_api_url"));
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
