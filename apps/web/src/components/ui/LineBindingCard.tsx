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
  ShieldCheck,
  X,
} from "lucide-react";
import { getCurrentUserNamespace } from "@/hooks/useAuth";
import { refreshSyncedHoldingsFromApi } from "@/lib/holdingsSync";

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
}

interface CardGatewayStatus {
  provider: string;
  mode: "production" | "sandbox";
  label: string;
}

export default function LineBindingCard({ compact = false }: LineBindingCardProps) {
  const [bindCode, setBindCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [trialDaysLeft] = useState(14);
  const [subscribingPlan, setSubscribingPlan] = useState<"standard" | "pro" | null>(null);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);

  // 線上刷卡收銀台狀態
  const [checkoutPlan, setCheckoutPlan] = useState<"standard" | "pro" | null>(null);
  const [cardError, setCardError] = useState("");
  const [gatewayStatus, setGatewayStatus] = useState<CardGatewayStatus | null>(null);
  const [vipStatus, setVipStatus] = useState<VipStatus | null>(null);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState("");

  // LINE 主動通報狀態
  const [autoPushEnabled, setAutoPushEnabled] = useState(true);
  const [isTriggeringNotify, setIsTriggeringNotify] = useState(false);
  const [lastPushLog, setLastPushLog] = useState<AutoPushLog | null>(null);
  const [notifyFeedback, setNotifyFeedback] = useState<string>("");

  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
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

      // 處理刷卡成功或失敗導回參數 (?subscribed=true&plan=...&orderId=...)
      try {
        const sp = new URLSearchParams(window.location.search);
        if (sp.get("subscribed") === "true") {
          const returnedPlan: "standard" | "pro" =
            sp.get("plan") === "standard" ? "standard" : "pro";
          const returnedOrderId = sp.get("orderId") || `CARD${Date.now().toString().slice(-8)}`;
          const newVip: VipStatus = {
            plan: returnedPlan,
            orderId: returnedOrderId,
            activatedAt: new Date().toISOString(),
          };
          setVipStatus(newVip);
          localStorage.setItem("omnitick_vip_status", JSON.stringify(newVip));
          setPaymentSuccessNotice(
            `🎉 線上刷卡授權完成！已為您啟用「${
              returnedPlan === "pro" ? "Pro 旗艦版" : "標準版"
            }」(#${returnedOrderId})`
          );
          window.history.replaceState({}, "", window.location.pathname);
        } else if (sp.get("payment_error")) {
          setPaymentSuccessNotice(`⚠️ 線上刷卡未完成：${sp.get("payment_error")}`);
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch {}
    });

    const handleAutoPushed = (e: CustomEvent<AutoPushLog>) => {
      if (e?.detail) setLastPushLog(e.detail);
    };
    window.addEventListener("line_auto_pushed", handleAutoPushed as EventListener);

    fetch("/api/line/push")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.bot) {
          setBotInfo(data.bot);
        }
      })
      .catch(() => {});

    fetch("/api/payment/subscribe")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.provider) {
          setGatewayStatus({
            provider: data.provider,
            mode: data.mode === "production" ? "production" : "sandbox",
            label: data.label || "",
          });
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
      window.removeEventListener("line_auto_pushed", handleAutoPushed as EventListener);
    };
  }, []);

  const toggleAutoPush = () => {
    const next = !autoPushEnabled;
    setAutoPushEnabled(next);
    localStorage.setItem("line_auto_push_enabled", String(next));
  };

  // 立即執行當日熱門 10 檔 + 庫存消息掃描並主動推播至 LINE
  const handleTriggerImmediateNotify = useCallback(async () => {
    setIsTriggeringNotify(true);
    setNotifyFeedback("");
    try {
      const holdings = await refreshSyncedHoldingsFromApi(1500);
      const res = await fetch("/api/line/auto-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings }),
      });
      const data = await res.json();
      if (data?.success && data.target) {
        const logItem: AutoPushLog = {
          symbol: data.target.symbol,
          name: data.target.name,
          title: data.triggerName || "當日熱門10檔 + 庫存消息",
          price: data.target.price,
          changePct: data.target.changePct,
          time: new Date().toLocaleTimeString("zh-TW", { hour12: false }),
        };
        setLastPushLog(logItem);
        localStorage.setItem("last_line_auto_push_log", JSON.stringify(logItem));
        setNotifyFeedback(
          `✅ 已通報「當日熱門10檔 + 庫存 ${holdings.length} 檔消息」至 LINE！（領頭：${logItem.symbol} ${logItem.name} $${logItem.price}）`
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

  // 開啟線上刷卡收銀台彈窗
  const openCheckoutModal = (plan: "standard" | "pro") => {
    setCheckoutPlan(plan);
    setCardError("");
  };

  // 線上刷卡 / Apple Pay / Google Pay 訂閱結帳
  const handleCardSubscribe = async (plan: "standard" | "pro") => {
    setSubscribingPlan(plan);
    setCardError("");
    try {
      const externalUrl =
        plan === "pro"
          ? process.env.NEXT_PUBLIC_CHECKOUT_PRO_URL
          : process.env.NEXT_PUBLIC_CHECKOUT_STANDARD_URL;

      if (externalUrl) {
        window.location.href = externalUrl;
        return;
      }

      const res = await fetch("/api/payment/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (data?.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data?.success && data.actionUrl && data.params) {
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
      }

      setCardError(data?.error || "建立線上刷卡訂單失敗，請稍後重試。");
    } catch (err) {
      console.error("Card checkout redirect failed:", err);
      setCardError("連線刷卡伺服器逾時，請稍後重試。");
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
                熊霸（V-Bear）主動通報：嚴格精選「當日熱門前 10 檔」與「個人庫存持股」最新行情及新聞推播至 LINE！
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleTriggerImmediateNotify}
              disabled={isTriggeringNotify}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
              title="立即彙整當日熱門 10 檔、庫存持股與焦點新聞發送至 LINE"
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
              主動通報僅發送「當日台股熱門 10 檔」與「您的庫存持股」最新行情及相關新聞，不對其餘觀察清單洗版。
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

        {/* 線上刷卡方案定價與結帳區 */}
        {!compact && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
            {paymentSuccessNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-bold text-emerald-300">
                {paymentSuccessNotice}
              </div>
            )}
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
                    <div className="text-[10px] text-secondary">/ 月（線上刷卡 / Apple Pay）</div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openCheckoutModal("standard")}
                    className="bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer active:scale-95 transition-all"
                  >
                    <CreditCard size={13} />
                    <span>
                      {vipStatus?.plan === "standard" ? "✅ 已開通標準版" : "線上刷卡訂閱 (NT$ 99)"}
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
                    <div className="text-[10px] text-secondary">/ 月（線上刷卡 / Apple Pay）</div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => openCheckoutModal("pro")}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer active:scale-95"
                  >
                    <CreditCard size={13} />
                    <span>{vipStatus?.plan === "pro" ? "✅ 已開通 Pro 旗艦版" : "線上刷卡訂閱 (NT$ 299)"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ★ 線上刷卡安全收銀台彈窗 (Online Card Checkout Modal) ★ */}
      {checkoutPlan && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setCheckoutPlan(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#0B1221] border border-amber-500/40 shadow-2xl overflow-hidden animate-spring-pop"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    OmniTick 線上刷卡安全結帳
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

            {/* Body - 純線上刷卡 */}
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CreditCard size={14} className="text-amber-400" />
                    <span>SSL 256-bit 加密線上刷卡</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-300">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">VISA</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">MC</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">JCB</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">Apple Pay</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  點擊下方按鈕將導向 PCI-DSS 第三方安全刷卡收銀台完成授權，本站絕不儲存或經手任何信用卡卡號。
                </p>

                {gatewayStatus && (
                  <div
                    className={`p-2.5 rounded-lg border text-[11px] leading-relaxed ${
                      gatewayStatus.mode === "production"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    <div className="font-bold">目前通道：{gatewayStatus.label}</div>
                    {gatewayStatus.mode === "sandbox" && (
                      <div className="mt-1 text-[10px] text-amber-200/80 font-mono">
                        尚未填入正式金流前，可使用測試卡號 <span className="font-bold">4311-9522-2222-2222</span>（有效年月任意未來日期、安全碼 <span className="font-bold">222</span>）實測刷卡流程。
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400">本次刷卡金額</span>
                  <span className="text-base font-extrabold text-amber-400 font-mono">
                    NT$ {checkoutPlan === "pro" ? 299 : 99} / 月
                  </span>
                </div>
              </div>

              {cardError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-bold">
                  {cardError}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleCardSubscribe(checkoutPlan)}
                disabled={subscribingPlan !== null}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {subscribingPlan === checkoutPlan ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CreditCard size={15} />
                )}
                <span>
                  {subscribingPlan === checkoutPlan
                    ? "正在導向加密刷卡收銀台..."
                    : `前往線上刷卡結帳 (NT$ ${checkoutPlan === "pro" ? 299 : 99})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
