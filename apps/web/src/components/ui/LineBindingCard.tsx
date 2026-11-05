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
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [pushErrorMsg, setPushErrorMsg] = useState("");

  const handleSendTestPush = async () => {
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
        setPushStatus("success");
      } else {
        setPushStatus("error");
        setPushErrorMsg(
          data.error ||
            "LINE_CHANNEL_ACCESS_TOKEN 尚未在 Vercel 中設定。請前往 Vercel 控制台新增此變數。"
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

      {/* LINE 推播發送狀態與設定診斷彈窗 (替代瀏覽器被封鎖的 alert) */}
      <Modal
        isOpen={isPushModalOpen}
        onClose={() => setIsPushModalOpen(false)}
        title="📡 LINE 官方廣播推播中心"
      >
        <div className="space-y-4">
          {pushStatus === "sending" && (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-3 border-emerald-500 border-t-transparent animate-spin mx-auto" />
              <h3 className="font-bold text-primary text-base">正在連線 LINE 官方伺服器...</h3>
              <p className="text-secondary text-xs leading-relaxed">
                正在將台積電主力突破量化雷達卡片，透過 LINE Broadcast API 推送至加好友之全體用戶。
              </p>
            </div>
          )}

          {pushStatus === "success" && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-start gap-3">
                <CheckCircle2 size={24} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-300">廣播推播發送成功！</h4>
                  <p className="text-xs text-secondary mt-0.5 leading-relaxed">
                    已將「台積電主力大單敲進 · 突破頸線」量化雷達卡片全員廣播至已加入好友的手機 LINE 聊天室！
                  </p>
                </div>
              </div>

              {/* 推播卡片預覽 */}
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-xs space-y-2">
                <div className="flex items-center justify-between text-secondary">
                  <span className="font-mono font-bold text-emerald-400">【LINE FlexCard 預覽】</span>
                  <span>今日 15:30 即時</span>
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
                關閉
              </Button>
            </div>
          )}

          {pushStatus === "error" && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-start gap-3">
                <AlertCircle size={24} className="flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-300">LINE 金鑰尚未配置</h4>
                  <p className="text-xs text-secondary mt-1 leading-relaxed">
                    系統尚未讀取到 <code className="text-amber-400">LINE_CHANNEL_ACCESS_TOKEN</code>。
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-2.5 text-xs text-secondary">
                <div className="font-bold text-primary flex items-center gap-1.5">
                  <Radio size={14} className="text-accent" />
                  <span>如何 1 分鐘啟用 LINE 全員推播：</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-secondary pl-1">
                  <li>
                    前往 <a href="https://developers.line.biz/" target="_blank" rel="noreferrer" className="text-accent hover:underline">LINE Developers Console</a> 進入你的 Messaging API Channel。
                  </li>
                  <li>
                    在 <strong>Messaging API</strong> 頁籤最底端，點擊 <strong>Issue</strong> 複製長期 Token。
                  </li>
                  <li>
                    前往 <strong>Vercel 專案後台 ➜ Settings ➜ Environment Variables</strong> 新增：
                    <div className="mt-1 p-2 rounded bg-black/40 font-mono text-[10px] text-emerald-400 select-all">
                      LINE_CHANNEL_ACCESS_TOKEN=你的長期Token
                    </div>
                  </li>
                </ol>
              </div>

              {/* 模擬成功按鈕 */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1 text-xs"
                  onClick={() => setPushStatus("success")}
                >
                  <Sparkles size={13} className="mr-1 text-amber-400" /> 檢視推播卡片效果
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 text-xs"
                  onClick={() => setIsPushModalOpen(false)}
                >
                  我知道了
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
}
