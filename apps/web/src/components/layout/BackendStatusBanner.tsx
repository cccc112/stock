"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";
import axios from "axios";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, Server, WifiOff } from "lucide-react";
import Button from "@/components/ui/Button";

export default function BackendStatusBanner() {
  const [isError, setIsError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const checkConnection = async () => {
    const url = getApiBaseUrl();
    setCurrentUrl(url);
    try {
      // Test basic endpoint with short timeout
      const testEndpoint = `${url}/market/trending`;
      await axios.get(testEndpoint, { timeout: 4000 });
      setIsError(false);
    } catch (err: any) {
      console.warn("Backend connectivity check failed:", err);
      setIsError(true);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleSaveUrl = async () => {
    if (!inputUrl.trim()) return;
    setTesting(true);
    setTestResult(null);

    const formatted = inputUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    const targetTest = `${formatted}/api/v1/market/trending`;

    try {
      await axios.get(targetTest, { timeout: 6000 });
      localStorage.setItem("backend_api_url", formatted);
      setTestResult("連線成功！正在重新整理頁面...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setTestResult(`連線失敗: ${err.message || "無法連上該伺服器，請確認網址正確或 Railway 已部署成功"}`);
    } finally {
      setTesting(false);
    }
  };

  const handleResetToDefault = () => {
    localStorage.removeItem("backend_api_url");
    window.location.reload();
  };

  if (!isError) return null;

  return (
    <div className="bg-red-500/15 border-b border-red-500/30 text-red-200 px-4 py-3 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <WifiOff className="text-red-400 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <span className="font-bold text-red-300 mr-2">⚠️ 無法連線至後端伺服器</span>
            <span className="text-red-200/80">
              目前瀏覽器請求目標為: <code className="bg-red-950/60 px-1.5 py-0.5 rounded text-red-300 font-mono text-xs">{currentUrl}</code>
            </span>
            <p className="text-xs text-red-300/70 mt-0.5">
              若您是在 Vercel 線上瀏覽，通常是因為尚未指定 Railway 後端伺服器網址，導致瀏覽器被阻擋連線。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-white rounded-md font-medium text-xs transition-colors"
          >
            <Server size={14} />
            設定 Railway 網址
            {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={checkConnection}
            className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-white rounded-md transition-colors"
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
            placeholder="貼上你的 Railway 網址 (如 https://xxxx.up.railway.app)"
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
