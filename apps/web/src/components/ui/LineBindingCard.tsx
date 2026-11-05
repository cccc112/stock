"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  MessageSquare,
  Sparkles,
  ExternalLink,
  Crown,
  CheckCircle,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  Send,
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

  useEffect(() => {
    // Generate or read persistent user bind code
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
  }, []);

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

  const [isPushing, setIsPushing] = useState(false);

  const handleSendTestPush = async () => {
    setIsPushing(true);
    try {
      const res = await fetch("/api/line/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "broadcast",
          type: "radar",
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
      if (res.ok && data.success) {
        alert("【LINE 測試推播發送成功！】\n已將「台積電主力突破量化雷達卡片」廣播發送至所有加好友用戶的 LINE 聊天室！");
      } else {
        alert(
          `【LINE 推播發送提示】\n${data.error || "發送失敗"}\n\n若尚未在 Vercel 填入 LINE_CHANNEL_ACCESS_TOKEN，請至 Vercel Settings -> Environment Variables 配置後即可全員推播。`
        );
      }
    } catch (e: any) {
      alert(`連線錯誤: ${e.message}`);
    } finally {
      setIsPushing(false);
    }
  };

  const handleECPaySubscribe = () => {
    setIsSubscribing(true);
    // Construct simulated ECPay checkout payload or direct link
    setTimeout(() => {
      alert("【綠界 ECPay 定期定額信用卡】\n方案：Pro 盤中主力雷達全自動推播\n月費：NT$ 399 / 月\n\n已成功導向安全付款授權頁面（測試環境）。");
      setIsSubscribing(false);
    }, 600);
  };

  return (
    <Card className="p-5 border-emerald-500/40 bg-gradient-to-br from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-emerald-500/5 relative overflow-hidden">
      {/* 熊霸裝飾背景 */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 opacity-10 pointer-events-none select-none">
        <svg viewBox="0 0 100 100" fill="currentColor" className="text-emerald-500">
          <circle cx="50" cy="50" r="45" />
          <path d="M 35 45 L 50 65 L 65 45" stroke="white" strokeWidth="8" fill="none" />
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
            </div>
            <p className="text-xs text-secondary mt-1">
              熊霸（V-Bear）盤中即時雷達：VCP 突破、SMC 機構踩點秒速推播至 LINE，下盤後 15:30 彙整主力戰報！
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSendTestPush}
            disabled={isPushing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-colors cursor-pointer shadow-sm"
            title="點擊立即測試發送一則台積電即時量化雷達 FlexCard 到加好友用戶的 LINE"
          >
            <Send size={13} className={isPushing ? "animate-pulse" : ""} />
            <span>{isPushing ? "推播發送中..." : "一鍵測試 LINE 廣播"}</span>
          </button>

          {isBound ? (
            <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-bold">
              <ShieldCheck size={14} /> LINE 帳號已連線綁定
            </span>
          ) : (
            <a
              href="https://line.me/R/ti/p/@stock_radar"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold transition-colors shadow-sm"
            >
              加入 LINE 官方帳號 <ExternalLink size={13} />
            </a>
          )}
          <button
            onClick={handleSimulateBind}
            className="text-[11px] text-muted hover:text-primary transition-colors underline"
          >
            {isBound ? "重設綁定狀態" : "測試模擬已綁定"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Step 1 & 2 綁定操作 */}
        <div className="md:col-span-2 space-y-3">
          <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-mono">
              1
            </span>
            <span>三步驟快速完成 LINE 連動</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col justify-between">
              <div>
                <span className="font-bold text-primary block mb-1">Step 1. 加好友</span>
                <p className="text-secondary text-[11px] leading-relaxed">
                  點擊右上角加入官方好友或搜尋 ID <code className="text-emerald-400">@stock_radar</code>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col justify-between">
              <div>
                <span className="font-bold text-primary block mb-1">Step 2. 發送指令</span>
                <p className="text-secondary text-[11px] leading-relaxed">
                  在聊天室發送綁定代碼，系統將立即為您連通所有自選股雷達。
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--border)]/60 flex items-center justify-between">
                <span className="font-mono text-emerald-400 font-bold text-xs">{`/bind ${bindCode}`}</span>
                <button
                  onClick={handleCopyCode}
                  className="p-1 rounded bg-[var(--bg-tertiary)] hover:text-accent transition-colors text-secondary"
                  title="複製指令"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex flex-col justify-between">
              <div>
                <span className="font-bold text-primary block mb-1">Step 3. 聊天室快查</span>
                <p className="text-secondary text-[11px] leading-relaxed">
                  直接輸入股號（如 <code className="text-accent">2330</code>、<code className="text-accent">0050</code>）即可秒查即時報價與技術指標。
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--border)]/60">
                <span className="text-[10px] text-muted font-semibold">隨時隨地雙向互動</span>
              </div>
            </div>
          </div>
        </div>

        {/* 訂閱與 14 天體驗狀態卡 */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-emerald-500/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Crown size={14} className="text-amber-400" /> Pro 尊榮方案
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                14 天免費倒數
              </span>
            </div>
            <p className="text-[11px] text-secondary leading-relaxed mb-3">
              綁定成功即享 14 天 Pro 雷達即時推播。試用到期後自動轉為每日 15:30 籌碼精華，無任何扣款風險。
            </p>
            <div className="text-xs text-primary font-bold flex items-baseline gap-1">
              <span className="text-lg text-emerald-400">NT$ 399</span>
              <span className="text-muted text-[11px]">/ 月 (或 NT$ 3,990 / 年)</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
            <Button
              size="sm"
              variant="primary"
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
              onClick={handleECPaySubscribe}
              disabled={isSubscribing}
            >
              <CreditCard size={14} /> 綠界 ECPay 定期定額訂閱
            </Button>
            <div className="text-[10px] text-center text-muted flex items-center justify-center gap-1">
              <CheckCircle size={10} className="text-emerald-400" /> SSL 256-bit 加密 · 隨時可取消
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
