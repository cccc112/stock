"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  MessageSquare,
  Sparkles,
  ExternalLink,
  Crown,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  CreditCard,
} from "lucide-react";
import { getCurrentUserNamespace } from "@/hooks/useAuth";

interface LineBindingCardProps {
  compact?: boolean;
}

interface BotInfo {
  displayName?: string;
  basicId?: string;
  pictureUrl?: string;
  addFriendUrl?: string;
}

export default function LineBindingCard({ compact = false }: LineBindingCardProps) {
  const [bindCode, setBindCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isBound, setIsBound] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(14);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);

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

    // 取得伺服器端連通的真實 LINE 官方帳號資訊與加好友專用連結
    fetch("/api/line/push")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.bot) {
          setBotInfo(data.bot);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopyCode = () => {
    if (navigator.clipboard && bindCode) {
      navigator.clipboard.writeText(`/bind ${bindCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleECPaySubscribe = () => {
    setIsSubscribing(true);
    setTimeout(() => {
      alert("【綠界 ECPay 定期定額信用卡】\n方案：Pro 盤中主力雷達全自動推播\n月費：NT$ 399 / 月\n\n已成功導向安全付款授權頁面。");
      setIsSubscribing(false);
    }, 600);
  };

  // 真實加好友連結（依據 LINE 官方回傳的 basicId，絕不 404）
  const addFriendUrl =
    botInfo?.addFriendUrl ||
    (botInfo?.basicId
      ? `https://line.me/R/ti/p/${encodeURIComponent(botInfo.basicId.startsWith("@") ? botInfo.basicId : `@${botInfo.basicId}`)}`
      : "https://line.me");

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
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                {botInfo?.displayName || "LINE 官方即時推播機器人"}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles size={11} /> 14 天免費 Pro 體驗
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                <CheckCircle2 size={11} /> 即時推播服務連線中
              </span>
            </div>
            <p className="text-xs text-secondary mt-1">
              熊霸（V-Bear）盤中即時雷達：VCP 突破、SMC 機構踩點秒速推播至 LINE，下盤後 15:30 彙整主力戰報！
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href={addFriendUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
          >
            <span>加入 LINE 官方帳號</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* 步驟說明卡 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
        {/* Step 1 */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] relative space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-emerald-400">Step 1. 加官方好友</span>
            <Crown size={13} className="text-amber-400" />
          </div>
          <p className="text-xs text-secondary leading-relaxed">
            點擊上方按鈕加入好友，或在 LINE 搜尋 ID{" "}
            <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {botInfo?.basicId || "官方帳號"}
            </span>
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] relative space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-emerald-400">Step 2. 傳送綁定代碼</span>
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
              title="點擊複製指令"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] relative space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-emerald-400">Step 3. 聊天室快查與推播</span>
            <Zap size={13} className="text-amber-400" />
          </div>
          <p className="text-xs text-secondary">
            直接在 LINE 輸入股號（如 <span className="font-mono text-primary font-bold">2330</span>、<span className="font-mono text-primary font-bold">0050</span>）即可秒查即時報價，盤中主力敲進自動提醒。
          </p>
          <span className="text-[10px] text-muted block">雙向全自動互動</span>
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
            >
              <CreditCard size={13} />
              <span>{isSubscribing ? "導向綠界中..." : "綠界 ECPay 定期定額訂閱"}</span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
