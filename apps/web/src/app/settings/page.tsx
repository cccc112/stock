"use client";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [clearMessage, setClearMessage] = useState("");

  useEffect(() => {
    const key = localStorage.getItem("byok_api_key");
    if (key) setApiKey(key);
  }, []);

  const handleSave = () => {
    localStorage.setItem("byok_api_key", apiKey);
    setSaveMessage("設定已儲存");
    setTimeout(() => setSaveMessage(""), 2000);
  };

  const handleClearCache = () => {
    if (confirm("確定要清除所有本地快取嗎？這將會清除您所有的設定與偏好。")) {
      localStorage.removeItem("watchlist_symbols");
      // Don't remove API key here, or maybe do depending on design. But just generally local cache.
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

      <Card title="API 設定">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">BYOK (Bring Your Own Key)</label>
            <p className="text-xs text-secondary mb-3">請輸入您的 OpenAI 或 Anthropic API Key 以啟用進階 AI 診斷功能。您的 Key 僅儲存於本地瀏覽器中。</p>
            <input 
              type="password" 
              className="input-field max-w-md" 
              placeholder="sk-..." 
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
