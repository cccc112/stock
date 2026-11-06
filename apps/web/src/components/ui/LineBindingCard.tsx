"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import {
  MessageSquare,
  Sparkles,
  ExternalLink,
  Crown,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  Send,
  Radio,
  Key,
  RefreshCw,
} from "lucide-react";
import { getCurrentUserNamespace } from "@/hooks/useAuth";

interface LineBindingCardProps {
  compact?: boolean;
}

export default function LineBindingCard({ compact = false }: LineBindingCardProps) {
  const [bindCode, setBindCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isBound, setIsBound] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(14);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // 測試推播 Modal 相關狀態
  const [isPushing, setIsPushing] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [pushErrorMsg, setPushErrorMsg] = useState("");
  const [serverDiag, setServerDiag] = useState<{
    configured?: boolean;
    tokenInfo?: string;
    valid?: boolean;
    error?: string;
    message?: string;
  } | null>(null);

  // 自訂/備用 Token、Channel ID 與 Channel Secret（允許使用者在畫面直接填寫即時測試，免等 Vercel 重新部署）
  const [customToken, setCustomToken] = useState("");
  const [customChannelId, setCustomChannelId] = useState("");
  const [customChannelSecret, setCustomChannelSecret] = useState("");

  useEffect(() => {
    // 讀取持久化綁定碼
    const ns = getCurrentUserNamespace();
    const storageKey = `line_bind_code_${ns}`;
    let code = localStorage.getItem(storageKey);
    if (!code) {
      code = "V" + Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem(storageKey, code);
    }
    setBindCode(code);

    const boundStatus = localStorage.getItem(`line_bound_status_${ns}`) === "true";
    setIsBound(boundStatus);

    // 讀取暫存的憑證
    const savedToken = localStorage.getItem("omnitick_temp_line_token") || "";
    if (savedToken) setCustomToken(savedToken);
    const savedId = localStorage.getItem("omnitick_temp_channel_id") || "";
    if (savedId) setCustomChannelId(savedId);
    const savedSecret = localStorage.getItem("omnitick_temp_channel_secret") || "";
    if (savedSecret) setCustomChannelSecret(savedSecret);

    // 初始檢測伺服器端環境變數狀態
    fetchServerStatus();
  }, []);

  const fetchServerStatus = async () => {
    try {
      const res = await fetch("/api/line/push");
      const data = await res.json();
      setServerDiag(data);
    } catch {
      // 忽略
    }
  };

  const handleCopyCode = () => {
    if (navigator.clipboard && bindCode) {
      navigator.clipboard.writeText(`/bind ${bindCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSimulateBind = () => {
    const ns = getCurrentUserNamespace();
    const nextStatus = !isBound;
    setIsBound(nextStatus);
    localStorage.setItem(`line_bound_status_${ns}`, nextStatus ? "true" : "false");
  };

  const handleSendTestPush = async (override?: {
    token?: string;
    channelId?: string;
    channelSecret?: string;
  }) => {
    const activeToken = override?.token !== undefined ? override.token : (customToken.trim() || undefined);
    const activeId = override?.channelId !== undefined ? override.channelId : (customChannelId.trim() || undefined);
    const activeSecret = override?.channelSecret !== undefined ? override.channelSecret : (customChannelSecret.trim() || undefined);

    // 儲存臨時憑證方便後續重複測試
    if (activeToken) localStorage.setItem("omnitick_temp_line_token", activeToken);
    if (activeId) localStorage.setItem("omnitick_temp_channel_id", activeId);
    if (activeSecret) localStorage.setItem("omnitick_temp_channel_secret", activeSecret);

    setIsPushing(true);
    setIsPushModalOpen(true);
    setPushStatus("sending");
    setPushErrorMsg("");

    try {
      const res = await fetch("/api/line/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "broadcast",
          type: "radar",
          token: activeToken,
          channelId: activeId,
          channelSecret: activeSecret,
          data: {
            symbol: "2330",
            name: "台積電",
            price: 2260,
            change: 10,
            changePct: 0.44,
            volumeLots: 38500,
            triggerName: "主力大單敲進 · 突破頸線",
            triggerDesc: "盤中 15 分 K 突破整理區間，大戶買賣比達 1.82，量能放大 160%",
            category: "BREAKOUT",
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPushStatus("success");
        fetchServerStatus();
      } else {
        setPushStatus("error");
        setPushErrorMsg(
          data.error ||
            "LINE 推播發送失敗，請確認 Channel ID 與 Channel Secret 是否正確。"
        );
      }
    } catch (e: any) {
      setPushStatus("error");
      setPushErrorMsg(`連線失敗: ${e.message}`);
    } finally {
      setIsPushing(false);
    }
  };

  const handleECPaySubscribe = () => {
    setIsSubscribing(true);
    setTimeout(() => {
      alert("【綠界 ECPay 定期定額信用卡】\n方案：Pro 盤中主力雷達全自動推播\n月費：NT$ 399 / 月\n\n已成功導向安全付款授權頁面（測試環境）。");
      setIsSubscribing(false);
    }, 600);
  };

  return (
    <Card className="p-5 border-emerald-500/40 bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-emerald-500/5 relative overflow-hidden">
      {/* 台灣黑熊裝飾背景 */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10 pointer-events-none select-none">
        <svg viewBox="0 0 100 100" fill="currentColor" className="text-emerald-500">
          <circle cx="50" cy="50" r="45" />
          <path d="M 32 65 L 50 85 L 68 65" stroke="white" strokeWidth="8" fill="none" />
        </svg>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                LINE 官方即時推播機器人
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles size={11} /> 14 天免費 Pro 體驗
              </span>
              {serverDiag?.configured && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                  <CheckCircle2 size={11} /> Vercel 金鑰已就緒
                </span>
              )}
            </div>
            <p className="text-xs text-secondary mt-1">
              熊霸（V-Bear）盤中即時雷達：VCP 突破、SMC 機構踩點秒速推播至 LINE，下盤後 15:30 彙整主力戰報！
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleSendTestPush()}
            disabled={isPushing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer shadow-sm active:scale-95"
            title="點擊立即測試發送一則台積電即時量化雷達 FlexCard 到加好友用戶的 LINE"
          >
            <Send size={13} className={isPushing ? "animate-pulse" : ""} />
            <span>{isPushing ? "推播傳送中..." : "一鍵測試 LINE 廣播"}</span>
          </button>

          <button
            onClick={() => {
              setPushStatus("error");
              setIsPushModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] text-secondary hover:text-primary border border-[var(--border)] text-xs font-medium transition-colors cursor-pointer"
            title="直接填寫或修改 Channel ID 與 Channel Secret"
          >
            <Key size={13} className="text-amber-400" />
            <span>配置金鑰</span>
          </button>

          <a
            href="https://line.me/R/ti/p/@stock_radar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs shadow-md transition-colors"
          >
            <span>加入 LINE 官方帳號</span>
            <ExternalLink size={13} />
          </a>

          <button
            onClick={handleSimulateBind}
            className={`text-[11px] px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              isBound
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-slate-500/10 text-muted border-slate-500/20 hover:text-secondary"
            }`}
          >
            {isBound ? "測試模擬已綁定" : "切換模擬綁定"}
          </button>
        </div>
      </div>

      {/* 步驟說明卡 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
        {/* Step 1 */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] relative space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-emerald-400">Step 1. 加好友</span>
            <Crown size={13} className="text-amber-400" />
          </div>
          <p className="text-xs text-secondary">
            點擊右上角加入官方好友或搜尋 ID <span className="font-mono text-primary font-bold">@stock_radar</span>
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] relative space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-emerald-400">Step 2. 發送指令</span>
            <span className="text-[10px] text-muted">連通自選股</span>
          </div>
          <p className="text-xs text-secondary">
            在聊天室發送綁定代碼，系統將立即為您連通所有自選股雷達。
          </p>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] font-mono text-xs">
            <span className="font-bold text-emerald-400">/bind {bindCode}</span>
            <button
              onClick={handleCopyCode}
              className="text-secondary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] relative space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-emerald-400">Step 3. 聊天室快查</span>
            <Zap size={13} className="text-amber-400" />
          </div>
          <p className="text-xs text-secondary">
            直接輸入股號（如 <span className="font-mono text-primary font-bold">2330</span>、<span className="font-mono text-primary font-bold">0050</span>）即可秒查即時報價與技術指標。
          </p>
          <span className="text-[10px] text-muted block">隨時隨地雙向互動</span>
        </div>
      </div>

      {/* 方案與付款區 */}
      {!compact && (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-[var(--bg-primary)] to-emerald-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Crown size={14} /> Pro 尊榮方案
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                {trialDaysLeft} 天免費倒數
              </span>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              綁定成功即享 14 天 Pro 雷達即時推播。試用到期後自動轉為每日 15:30 籌碼精華，無任何扣款風險。
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right">
              <div className="text-base font-extrabold font-mono text-primary">NT$ 399</div>
              <div className="text-[10px] text-secondary">/ 月（或 NT$ 3,990 / 年）</div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={handleECPaySubscribe}
              disabled={isSubscribing}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <CreditCard size={13} />
              <span>{isSubscribing ? "導向綠界中..." : "綠界 ECPay 定期定額訂閱"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* 推播測試視覺反饋 Modal */}
      <Modal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        title="📡 LINE 官方廣播推播中心"
      >
        <div className="space-y-4 pt-1">
          {pushStatus === "sending" && (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin" />
              <p className="text-sm font-bold text-primary">正在連線 LINE Messaging API 發送廣播...</p>
              <p className="text-xs text-secondary">正在打包台積電主力大單突破 FlexCard</p>
            </div>
          )}

          {pushStatus === "success" && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-start gap-3">
                <CheckCircle2 size={24} className="flex-shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-300">廣播推播發送成功！</h4>
                  <p className="text-xs text-secondary mt-0.5 leading-relaxed">
                    已將「台積電主力大單敲進 · 突破頸線」量化雷達卡片全員廣播至已加入好友的手機 LINE 聊天室！請查看您的手機 LINE。
                  </p>
                </div>
              </div>

              {/* 推播卡片預覽 */}
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs space-y-2">
                <div className="flex items-center justify-between text-secondary">
                  <span className="font-mono font-bold text-emerald-400">【LINE FlexCard 預覽】</span>
                  <span>今日即時推播</span>
                </div>
                <div className="p-3 rounded-lg bg-[#090d16] text-white space-y-1.5 font-mono">
                  <div className="flex justify-between items-center text-[10px] text-amber-400 font-bold">
                    <span>⚡ 盤中量化雷達觸發</span>
                    <span className="text-emerald-400">14天Pro體驗</span>
                  </div>
                  <div className="text-base font-bold text-slate-100">台積電 (2330)</div>
                  <div className="text-lg font-bold text-rose-500 flex items-baseline gap-1.5">
                    <span>NT$ 2,260</span>
                    <span className="text-xs">+10.00 (+0.44%)</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    訊號：主力大單敲進 · 突破頸線
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => setIsPushModalOpen(false)}
              >
                我知道了，已成功發送！
              </Button>
            </div>
          )}

          {pushStatus === "error" && (
            <div className="space-y-3.5">
              {/* 診斷報錯區 */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-start gap-3">
                <AlertCircle size={24} className="flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed">
                  <h4 className="font-bold text-sm text-amber-300">LINE 推播未送達</h4>
                  <p className="text-secondary font-mono bg-black/40 p-2 rounded text-[11px] text-rose-300 border border-rose-500/20">
                    {pushErrorMsg || serverDiag?.message || "尚未讀取到 LINE 金鑰 (請確認 Vercel 中的 Channel ID 與 Channel Secret)"}
                  </p>
                </div>
              </div>

              {/* 為什麼後台根本沒有 Token 的真相關懷 */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-2 text-xs text-secondary">
                <div className="font-bold text-primary flex items-center gap-1.5">
                  <RefreshCw size={13} className="text-amber-400" />
                  <span>為什麼你在 LINE 官方後台（manager.line.biz）完全找不到 Token？</span>
                </div>
                <div className="text-[11px] leading-relaxed space-y-1.5 text-secondary">
                  <p>
                    <strong>你的直覺完全正確！</strong>在 LINE 官方帳號管理後台（manager.line.biz）的「Messaging API」頁面中，本來就<strong>只有 Channel ID 與 Channel secret</strong>，翻遍全頁都不會有 Token。
                  </p>
                  <p className="text-emerald-400 font-semibold">
                    💡 好消息：你完全不需要 Token！只要把你在該頁面看到的 Channel ID 與 Channel secret 填在下方，系統會直接透過 LINE 官方 OAuth 機制「全自動換發」，再也不需要大海撈針！
                  </p>
                </div>
              </div>

              {/* 方案 A（最強烈推薦）：直接在畫面填寫 Channel ID + Channel Secret 立即測試 */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Key size={13} />
                    <span>免找 Token！直接填寫 Channel ID 與 Channel Secret：</span>
                  </span>
                  <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                    自動 OAuth 換發
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-secondary block mb-0.5">Channel ID（10 碼數字）</label>
                    <input
                      type="text"
                      placeholder="例如: 200xxxxxxx"
                      value={customChannelId}
                      onChange={(e) => setCustomChannelId(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-xs font-mono text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-secondary block mb-0.5">Channel Secret（32 碼英數）</label>
                    <input
                      type="password"
                      placeholder="貼上 32 碼 Secret"
                      value={customChannelSecret}
                      onChange={(e) => setCustomChannelSecret(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-xs font-mono text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!customChannelId.trim() || !customChannelSecret.trim() || isPushing}
                  onClick={() =>
                    handleSendTestPush({
                      channelId: customChannelId,
                      channelSecret: customChannelSecret,
                    })
                  }
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
                >
                  {isPushing ? "LINE 官方 OAuth 授權連線中..." : "立即以 Channel ID + Secret 自動換發並廣播測試"}
                </Button>
                <span className="text-[10px] text-muted block">
                  點擊後系統會透過 LINE 官方 OAuth 2.0 端點取得合法權杖並立即送出廣播，手機 LINE 馬上能收到推播！
                </span>
              </div>

              {/* 方案 B：手動貼上 Channel Access Token（選用） */}
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-2 text-xs">
                <span className="font-bold text-secondary flex items-center gap-1.5 text-[11px]">
                  <span>方案 B：手動貼上 Channel Access Token（若已在 Messaging API 頁籤取得）</span>
                </span>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="貼上你的 Channel access token (long-lived)..."
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-mono text-primary focus:outline-none focus:border-blue-500"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!customToken.trim() || isPushing}
                    onClick={() => handleSendTestPush({ token: customToken })}
                    className="shrink-0 text-xs font-bold"
                  >
                    帶入測試
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  className="flex-1 text-xs"
                  onClick={() => setPushStatus("success")}
                >
                  <Sparkles size={13} className="mr-1 text-amber-400" /> 檢視預覽卡片效果
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 text-xs"
                  onClick={() => setIsPushModalOpen(false)}
                >
                  關閉
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
}
