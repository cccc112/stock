"use client";

import { useEffect, useState } from "react";
import { BACKEND_OK_EVENT, BACKEND_WAKING_EVENT, getApiBaseUrl } from "@/lib/api";
import axios from "axios";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Server, WifiOff } from "lucide-react";
import Button from "@/components/ui/Button";

type Status = "ok" | "waking" | "down";

export default function BackendStatusBanner() {
  const [status, setStatus] = useState<Status>("ok");
  const [currentUrl] = useState(() => (typeof window !== "undefined" ? getApiBaseUrl() : ""));
  const [inputUrl, setInputUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const healthUrl = (apiBase: string) => `${apiBase.replace(/\/api\/v1$/, "")}/health`;

  // 免費方案的後端閒置會休眠，喚醒約 30～60 秒：先顯示「喚醒中」，最多等約 90 秒才判定連不上
  const checkConnection = async () => {
    const url = getApiBaseUrl();
    const slow = setTimeout(() => setStatus((s) => (s === "ok" ? "waking" : s)), 2500);
    try {
      // 90 秒內持續重試：休眠喚醒時請求可能卡住，也可能快速回 502/503 或連線被拒
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        try {
          await axios.get(healthUrl(url), { timeout: 45000 });
          setStatus("ok");
          return;
        } catch (err) {
          console.warn("Backend connectivity check failed:", err);
          setStatus((s) => (s === "ok" ? "waking" : s));
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
      setStatus("down");
    } finally {
      clearTimeout(slow);
    }
  };

  useEffect(() => {
    void checkConnection();
    // 頁面上的讀取請求也會回報：正在重試 → 顯示喚醒中；任何請求成功 → 隱藏橫幅
    const onWaking = () => setStatus((s) => (s === "waking" ? s : s === "down" ? s : "waking"));
    const onOk = () => setStatus((s) => (s === "ok" ? s : "ok"));
    window.addEventListener(BACKEND_WAKING_EVENT, onWaking);
    window.addEventListener(BACKEND_OK_EVENT, onOk);
    return () => {
      window.removeEventListener(BACKEND_WAKING_EVENT, onWaking);
      window.removeEventListener(BACKEND_OK_EVENT, onOk);
    };
    // 只在掛載時檢查一次；之後由右側按鈕手動重新檢測
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveUrl = async () => {
    if (!inputUrl.trim()) return;
    setTesting(true);
    setTestResult(null);

    const formatted = inputUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    const targetTest = `${formatted}/health`;

    try {
      await axios.get(targetTest, { timeout: 30000 });
      localStorage.setItem("backend_api_url", formatted);
      setTestResult("連線成功！正在重新整理頁面...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setTestResult(`連線失敗: ${err.message || "無法連上該伺服器，請確認網址正確且後端已部署成功（免費方案休眠時請稍候再試）"}`);
    } finally {
      setTesting(false);
    }
  };

  const handleResetToDefault = () => {
    localStorage.removeItem("backend_api_url");
    window.location.reload();
  };

  if (status === "ok") return null;

  if (status === "waking") {
    return (
      <div className="bg-yellow-500/10 border-b border-yellow-500/30 text-yellow-800 dark:text-yellow-200 px-4 py-2 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <Loader2 className="animate-spin flex-shrink-0 text-yellow-600 dark:text-yellow-300" size={16} />
          <span>後端伺服器喚醒中（免費方案閒置後會休眠），約需 30～60 秒，資料會自動載入，請稍候…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-500/10 dark:bg-red-500/15 border-b border-red-500/30 text-red-900 dark:text-red-200 px-4 py-3 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <WifiOff className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <span className="font-bold text-red-800 dark:text-red-300 mr-2">無法連線至後端伺服器</span>
            <span className="text-red-800/80 dark:text-red-200/80">
              目前瀏覽器請求目標為: <code className="bg-red-200 dark:bg-red-950/60 px-1.5 py-0.5 rounded text-red-900 dark:text-red-300 font-mono text-xs">{currentUrl}</code>
            </span>
            <p className="text-xs text-red-700/80 dark:text-red-300/70 mt-0.5">
              若您是在 Vercel 線上瀏覽，通常是因為尚未指定後端伺服器網址；免費方案的後端閒置後會休眠，喚醒約需 30～60 秒，可稍後按右側重新檢測。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600/15 hover:bg-red-600/25 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-800 dark:text-white rounded-md font-medium text-xs transition-colors"
          >
            <Server size={14} />
            設定後端網址
            {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={checkConnection}
            className="p-1.5 bg-red-600/15 hover:bg-red-600/25 dark:bg-red-500/20 dark:hover:bg-red-500/30 text-red-800 dark:text-white rounded-md transition-colors"
            title="重新檢測"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-red-500/20 flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="貼上後端網址 (如 https://xxxx.onrender.com)"
            className="w-full sm:max-w-md px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-primary focus:outline-none"
          />
          <div className="flex gap-2 w-full sm:w-auto">
            <Button size="sm" variant="primary" onClick={handleSaveUrl} disabled={testing}>
              {testing ? "連線檢測中..." : "儲存並套用連線"}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleResetToDefault}>
              重設預設值
            </Button>
          </div>
          {testResult && (
            <span className={`text-xs ml-2 ${testResult.includes("成功") ? "text-emerald-400 font-bold" : "text-red-400"}`}>
              {testResult}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
