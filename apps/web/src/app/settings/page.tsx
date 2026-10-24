"use client";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [backendUrl, setBackendUrl] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [urlMessage, setUrlMessage] = useState("");
  const [testingUrl, setTestingUrl] = useState(false);
  const [clearMessage, setClearMessage] = useState("");

  useEffect(() => {
    const key = localStorage.getItem("byok_api_key");
    if (key) setApiKey(key);
    const customUrl = localStorage.getItem("backend_api_url");
    if (customUrl) setBackendUrl(customUrl);
  }, []);

  const handleSave = () => {
    localStorage.setItem("byok_api_key", apiKey);
    setSaveMessage("設定已儲存");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const handleSaveBackendUrl = async () => {
    setTestingUrl(true);
    setUrlMessage("");
    const formatted = backendUrl.trim().replace(/\/+$/, '').replace(/\/api\/v1$/, '');
    if (!formatted) {
      localStorage.removeItem("backend_api_url");
      setUrlMessage("已重設為系統預設後端");
      setTestingUrl(false);
      return;
    }

    try {
      const axios = (await import("axios")).default;
      await axios.get(`${formatted}/api/v1/market/trending`, { timeout: 5000 });
      localStorage.setItem("backend_api_url", formatted);
      setUrlMessage("連線成功並已儲存");
    } catch (err: any) {
      setUrlMessage(`連線警告: ${err.message || "未能收到後端正常回應，但已為您儲存"}`);
      localStorage.setItem("backend_api_url", formatted);
    } finally {
      setTestingUrl(false);
    }
  };

  const handleClearCache = () => {
    if (confirm("確定要清除所有本地快取嗎？這將會清除您所有的設定與偏好。")) {
      localStorage.removeItem("watchlist_symbols");
      localStorage.removeItem("backend_api_url");
      setClearMessage("快取已清除");
      setTimeout(() => setClearMessage(""), 2000);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-secondary text-sm">系統與個人化設定</p>
      </div>

      <Card title="後端伺服器連線 (Railway API 設定)">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">後端 API 伺服器網址</label>
            <p className="text-xs text-secondary mb-3">
              若您在 Vercel 線上環境，請填入您的 Railway 後端網址（例如：<code>https://stock-backend-production-xxxx.up.railway.app</code>）。儲存後即時生效，無需重新構建 Vercel。
            </p>
            <input 
              type="text" 
              className="input-field max-w-md" 
              placeholder="https://xxxx.up.railway.app" 
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" onClick={handleSaveBackendUrl} disabled={testingUrl}>
              {testingUrl ? "連線檢測中..." : "儲存並套用連線"}
            </Button>
            {backendUrl && (
              <Button size="sm" variant="secondary" onClick={() => { setBackendUrl(""); localStorage.removeItem("backend_api_url"); setUrlMessage("已清除自訂網址"); }}>
                還原預設
              </Button>
            )}
            {urlMessage && <span className="text-sm font-medium">{urlMessage}</span>}
          </div>
        </div>
      </Card>

      <Card title="AI 金鑰設定 (BYOK)">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Gemini API Key</label>
            <p className="text-xs text-secondary mb-3">請輸入您的 Google Gemini API Key 以啟用多角色投資委員會與 AI 畫線診斷功能。您的 Key 僅儲存於本地瀏覽器中。</p>
            <input 
              type="password" 
              className="input-field max-w-md" 
              placeholder="AIzaSy..." 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" onClick={handleSave}>儲存設定</Button>
            {saveMessage && <span className="text-success text-sm">{saveMessage}</span>}
          </div>
        </div>
      </Card>

      <Card title="快取管理">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">清除本地快取</div>
            <div className="text-xs text-secondary">清除瀏覽器中儲存的歷史報價與系統設定。</div>
          </div>
          <div className="flex items-center gap-4">
            {clearMessage && <span className="text-success text-sm">{clearMessage}</span>}
            <Button variant="danger" size="sm" onClick={handleClearCache}>清除快取</Button>
          </div>
        </div>
      </Card>
      
      <Card title="關於">
        <div className="text-sm text-secondary space-y-2">
          <p>AI 戰情室 v1.0.0</p>
          <p>本系統使用 Next.js 14、Lightweight Charts 開發。</p>
          <p className="pt-4 border-t border-[var(--border)]">
            免責聲明：本系統所有數據與 AI 分析僅供模擬交易與學術研究使用，不構成任何投資建議。投資有風險，請自行評估。
          </p>
        </div>
      </Card>
    </div>
  );
}
