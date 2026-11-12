"use client";

import { useState, useEffect, useCallback } from "react";
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
  BellRing,
  Send,
  Loader2,
  Radio,
  Landmark,
  ShieldCheck,
  X,
} from "lucide-react";
import { getCurrentUserNamespace } from "@/hooks/useAuth";
import { getWatchlistSymbols } from "@/lib/watchlistRadar";

interface LineBindingCardProps {
  compact?: boolean;
}

interface BotInfo {
  displayName?: string;
  basicId?: string;
  pictureUrl?: string;
  addFriendUrl?: string;
}

interface AutoPushLog {
  symbol: string;
  name: string;
  title: string;
  price: number;
  changePct: number;
  time: string;
}

interface VipStatus {
  plan: "standard" | "pro";
  orderId: string;
  activatedAt: string;
  last5Digits?: string;
}

const BANK_INFO = {
  bankName: process.env.NEXT_PUBLIC_BANK_NAME || "822 中國信託商業銀行",
  accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT || "9015-4088-2330",
  accountNote: "轉帳完成後填寫下方「帳號後 5 碼」，系統將立即透過 LINE 傳送開通憑證並解鎖 VIP！",
};

export default function LineBindingCard({ compact = false }: LineBindingCardProps) {
  const [bindCode, setBindCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);
  const [trialDaysLeft] = useState(14);
  const [subscribingPlan, setSubscribingPlan] = useState<"standard" | "pro" | null>(null);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);

  // 雙通道收銀台彈窗狀態
  const [checkoutPlan, setCheckoutPlan] = useState<"standard" | "pro" | null>(null);
  const [paymentChannel, setPaymentChannel] = useState<"bank" | "card">("bank");
  const [bankCode, setBankCode] = useState("");
  const [last5Digits, setLast5Digits] = useState("");
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [bankError, setBankError] = useState("");
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);

  // LINE 主動通報狀態
  const [autoPushEnabled, setAutoPushEnabled] = useState(true);
  const [isTriggeringNotify, setIsTriggeringNotify] = useState(false);
  const [lastPushLog, setLastPushLog] = useState<AutoPushLog | null>(null);
  const [notifyFeedback, setNotifyFeedback] = useState<string>("");

  useEffect(() => {
    const ns = getCurrentUserNamespace();
    const storageKey = `line_bind_code_${ns}`;
    let code = localStorage.getItem(storageKey);
    if (!code) {
      code = "V" + Math.floor(100000 + Math.random() * 900000);
      localStorage.setItem(storageKey, code);
    }
    setBindCode(code);

    const enabled = localStorage.getItem("line_auto_push_enabled") !== "false";
    setAutoPushEnabled(enabled);

    try {
      const savedLog = localStorage.getItem("last_line_auto_push_log");
      if (savedLog) setLastPushLog(JSON.parse(savedLog));
      const savedVip = localStorage.getItem("omnitick_vip_status");
      if (savedVip) setVipStatus(JSON.parse(savedVip));
    } catch {}

    const handleAutoPushed = (e: any) => {
      if (e?.detail) setLastPushLog(e.detail);
    };
    window.addEventListener("line_auto_pushed", handleAutoPushed);

    fetch("/api/line/push")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.bot) {
          setBotInfo(data.bot);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener("line_auto_pushed", handleAutoPushed);
  }, []);

  const toggleAutoPush = () => {
    const next = !autoPushEnabled;
    setAutoPushEnabled(next);
    localStorage.setItem("line_auto_push_enabled", String(next));
  };

  // 立即執行盤中掃描並主動推播至 LINE
  const handleTriggerImmediateNotify = useCallback(async () => {
    setIsTriggeringNotify(true);
    setNotifyFeedback("");
    try {
      const symbols = getWatchlistSymbols();
      const res = await fetch("/api/line/auto-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      });
      const data = await res.json();
      if (data?.success && data.target) {
        const logItem: AutoPushLog = {
          symbol: data.target.symbol,
          name: data.target.name,
          title: data.triggerName || "熊霸主動巡檢通報",
          price: data.target.price,
          changePct: data.target.changePct,
          time: new Date().toLocaleTimeString("zh-TW", { hour12: false }),
        };
        setLastPushLog(logItem);
        localStorage.setItem("last_line_auto_push_log", JSON.stringify(logItem));
        setNotifyFeedback(
          `✅ 已主動通報至 LINE：${logItem.symbol} ${logItem.name} ($${logItem.price})`
        );
      } else {
        setNotifyFeedback(`⚠️ 通報失敗：${data?.error || "請確認 LINE 官方帳號權限"}`);
      }
    } catch {
      setNotifyFeedback("⚠️ 網路連線異常，請稍後再試");
    } finally {
      setIsTriggeringNotify(false);
    }
  }, []);

  const handleCopyCode = () => {
    if (navigator.clipboard && bindCode) {
      navigator.clipboard.writeText(`/bind ${bindCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyBankAccount = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(BANK_INFO.accountNumber.replace(/-/g, ""));
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    }
  };

  // 開啟雙通道收銀台彈窗
  const openCheckoutModal = (plan: "standard" | "pro") => {
    setCheckoutPlan(plan);
    setBankError("");
    setLast5Digits("");
  };

  // 通道 A：網銀轉帳後五碼立即開通 + LINE 自動對帳通報
  const handleBankVerifySubmit = async () => {
    if (!checkoutPlan) return;
    if (!/^\d{5}$/.test(last5Digits.trim())) {
      setBankError("請輸入完整的 5 位數字匯款帳號後五碼");
      return;
    }

    setIsSubmittingBank(true);
    setBankError("");
    try {
      const res = await fetch("/api/payment/manual-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: checkoutPlan,
          last5Digits: last5Digits.trim(),
          bankCode: bankCode.trim(),
          bindCode,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        const newVip: VipStatus = {
          plan: checkoutPlan,
          orderId: data.orderId,
          activatedAt: data.activatedAt,
          last5Digits: last5Digits.trim(),
        };
        setVipStatus(newVip);
        localStorage.setItem("omnitick_vip_status", JSON.stringify(newVip));
        setCheckoutPlan(null);
      } else {
        setBankError(data?.error || "送出驗證失敗，請稍後再試");
      }
    } catch {
      setBankError("網路連線異常，請稍後再試");
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // 通道 B：信用卡 / Apple Pay 線上刷卡授權
  const handleCardSubscribe = async (plan: "standard" | "pro") => {
    setSubscribingPlan(plan);
    try {
      const externalUrl =
        plan === "pro"
          ? process.env.NEXT_PUBLIC_CHECKOUT_PRO_URL
          : process.env.NEXT_PUBLIC_CHECKOUT_STANDARD_URL;

      if (externalUrl) {
        window.open(externalUrl, "_blank", "noopener,noreferrer");
        setSubscribingPlan(null);
        return;
      }

      const res = await fetch("/api/payment/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.success && data.actionUrl && data.params) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.actionUrl;
        form.style.display = "none";
        for (const [key, val] of Object.entries(data.params)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(val);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      } else {
        alert("前往付款授權失敗，請稍後重試。");
      }
    } catch (err) {
      console.error("Subscription redirect failed:", err);
      alert("連線付款伺服器逾時，請稍後重試。");
    } finally {
      setSubscribingPlan(null);
    }
  };

  const addFriendUrl =
    botInfo?.addFriendUrl ||
    (botInfo?.basicId
      ? `https://line.me/R/ti/p/${encodeURIComponent(
          botInfo.basicId.startsWith("@") ? botInfo.basicId : `@${botInfo.basicId}`
        )}`
      : "https://line.me");

  return (
    <>
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
                {vipStatus ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Crown size={11} /> 已開通 {vipStatus.plan === "pro" ? "Pro 旗艦版" : "標準版"} (#
                    {vipStatus.orderId})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles size={11} /> 14 天免費 Pro 體驗
                  </span>
                )}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                  <CheckCircle2 size={11} /> 主動通報已連線
                </span>
              </div>
              <p className="text-xs text-secondary mt-1">
                熊霸（V-Bear）盤中即時雷達：VCP 突破、SMC 機構踩點與自選股異動自動主動推播至 LINE！
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleTriggerImmediateNotify}
              disabled={isTriggeringNotify}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
              title="立即掃描自選股與大盤焦點，馬上主動發送一張真實戰報至您的 LINE"
            >
              {isTriggeringNotify ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={13} />
              )}
              <span>{isTriggeringNotify ? "主動通報發送中..." : "立即主動通報至 LINE"}</span>
            </button>

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

        {/* LINE 主動通報即時狀態與自動巡檢開關面板 */}
        <div className="mt-4 p-3.5 rounded-xl bg-[var(--bg-primary)] border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Radio size={14} className={autoPushEnabled ? "text-emerald-400 animate-pulse" : "text-muted"} />
              <span className="text-xs font-bold text-primary">
                LINE 全自動主動通報引擎 (Auto Push Dispatcher)
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  autoPushEnabled
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-800 text-muted"
                }`}
              >
                {autoPushEnabled ? "自動監控推播 ON" : "已暫停 OFF"}
              </span>
            </div>
            <p className="text-[11px] text-secondary">
              當自選股觸發 VCP 突破、SMC 訂單塊、爆量急拉或雲端定時巡檢時，系統免手動查詢即會主動發送 LINE 戰報。
            </p>
            {notifyFeedback && (
              <div className="text-xs font-bold text-emerald-400 pt-0.5">{notifyFeedback}</div>
            )}
            {lastPushLog && !notifyFeedback && (
              <div className="text-[11px] font-mono text-amber-400/90 pt-0.5">
                最近一次主動通報：[{lastPushLog.time}] {lastPushLog.symbol} {lastPushLog.name} (${lastPushLog.price}) — {lastPushLog.title}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={toggleAutoPush}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                autoPushEnabled
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                  : "bg-[var(--bg-secondary)] border-[var(--border)] text-secondary hover:text-primary"
              }`}
            >
              <BellRing size={13} />
              <span>{autoPushEnabled ? "主動通報：開啟中" : "主動通報：已關閉"}</span>
            </button>
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
              <span className="text-[11px] font-mono font-bold text-emerald-400">Step 3. 聊天室快查與主動通報</span>
              <Zap size={13} className="text-amber-400" />
            </div>
            <p className="text-xs text-secondary">
              輸入股號（如 <span className="font-mono text-primary font-bold">2330</span>）秒查報價；盤中觸發突破或點擊上方「立即主動通報」即刻推送至手機。
            </p>
            <span className="text-[10px] text-muted block">雙向查詢 + 盤中主動推播</span>
          </div>
        </div>

        {/* 雙層方案定價與付款區 */}
        {!compact && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 標準版方案 */}
              <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] hover:border-emerald-500/40 transition-all flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Sparkles size={14} className="text-emerald-400" /> 標準版方案
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/25">
                      超值首選
                    </span>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    每日 15:30 盤後法人籌碼精華推播、大盤多空量化動量與自選股監控。
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/60">
                  <div>
                    <div className="text-base font-extrabold font-mono text-primary">NT$ 99</div>
                    <div className="text-[10px] text-secondary">/ 月（支援網銀秒開通 / 刷卡）</div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openCheckoutModal("standard")}
                    className="bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer active:scale-95 transition-all"
                  >
                    <CreditCard size={13} />
                    <span>
                      {vipStatus?.plan === "standard" ? "✅ 已開通標準版" : "訂閱標準版 (NT$ 99)"}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Pro 旗艦版 */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-[var(--bg-primary)] to-emerald-500/10 border border-amber-500/30 hover:border-amber-500/50 transition-all flex flex-col justify-between gap-3 relative overflow-hidden">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Crown size={14} /> Pro 旗艦版
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      {trialDaysLeft} 天免費試用
                    </span>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    盤中主力大單即時雷達、AI 智能解盤、深度 13F 機構持倉與 ETF 申購穿透。
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/60">
                  <div>
                    <div className="text-base font-extrabold font-mono text-primary">NT$ 299</div>
                    <div className="text-[10px] text-secondary">/ 月（支援網銀秒開通 / 刷卡）</div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => openCheckoutModal("pro")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer active:scale-95"
                  >
                    <CreditCard size={13} />
                    <span>{vipStatus?.plan === "pro" ? "✅ 已開通 Pro 旗艦版" : "訂閱 Pro 版 (NT$ 299)"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ★ 雙通道極速安全收銀台彈窗 (Dual-Channel Checkout Modal) ★ */}
      {checkoutPlan && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setCheckoutPlan(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0B1221] border border-emerald-500/40 shadow-2xl overflow-hidden animate-spring-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    OmniTick 雙通道極速收銀台
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    方案：{checkoutPlan === "pro" ? "Pro 旗艦版 (NT$ 299 / 月)" : "標準版 (NT$ 99 / 月)"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutPlan(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* 通道切換 Tabs */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/60 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setPaymentChannel("bank")}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentChannel === "bank"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Landmark size={14} />
                <span>網銀轉帳 (秒開通)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentChannel("card")}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  paymentChannel === "card"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <CreditCard size={14} />
                <span>信用卡 / Apple Pay</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {paymentChannel === "bank" ? (
                <>
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">收款銀行</span>
                      <span className="text-xs font-bold text-white font-mono">
                        {BANK_INFO.bankName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">收款帳號</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-emerald-400 font-mono">
                          {BANK_INFO.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyBankAccount}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedBank ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copiedBank ? "已複製" : "複製"}</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-400">應付金額</span>
                      <span className="text-base font-extrabold text-amber-400 font-mono">
                        NT$ {checkoutPlan === "pro" ? 299 : 99}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {BANK_INFO.accountNote}
                  </p>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        銀行代碼 (選填)
                      </label>
                      <input
                        type="text"
                        maxLength={3}
                        value={bankCode}
                        onChange={(e) => setBankCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="如 822"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] text-emerald-400 font-bold mb-1">
                        轉出帳號後 5 碼 (必填) *
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={last5Digits}
                        onChange={(e) => setLast5Digits(e.target.value.replace(/\D/g, ""))}
                        placeholder="請輸入 5 位數字"
                        className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-emerald-500/50 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>

                  {bankError && (
                    <div className="text-xs text-rose-400 font-bold">{bankError}</div>
                  )}

                  <button
                    type="button"
                    onClick={handleBankVerifySubmit}
                    disabled={isSubmittingBank}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingBank ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    <span>
                      {isSubmittingBank
                        ? "正在傳送 LINE 對帳通知並開通 VIP..."
                        : "送出後五碼 · 立即開通 VIP 並發送 LINE 憑證"}
                    </span>
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CreditCard size={14} className="text-amber-400" />
                      SSL 256-bit 加密線上刷卡 / Apple Pay
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      點擊下方按鈕將導向第三方 PCI-DSS 認證安全收銀台，本站不經手或儲存任何信用卡號。
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-xs text-slate-400">刷卡金額</span>
                      <span className="text-base font-extrabold text-amber-400 font-mono">
                        NT$ {checkoutPlan === "pro" ? 299 : 99} / 月
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCardSubscribe(checkoutPlan)}
                    disabled={subscribingPlan !== null}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard size={15} />
                    <span>
                      {subscribingPlan === checkoutPlan
                        ? "正在導向加密收銀台..."
                        : `前往線上刷卡結帳 (NT$ ${checkoutPlan === "pro" ? 299 : 99})`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
