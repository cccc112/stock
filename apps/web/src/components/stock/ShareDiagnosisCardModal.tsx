"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Share2, Download, Copy, Check, X, Send, Loader2, Sparkles } from "lucide-react";

interface ShareDiagnosisCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  deepSummary?: any;
}

export default function ShareDiagnosisCardModal({
  symbol,
  name,
  price,
  change,
  changePct,
  deepSummary,
}: ShareDiagnosisCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [pushingLine, setPushingLine] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const verdict = deepSummary?.verdict || {};
  const minervini = deepSummary?.models?.minervini || {};
  const smc = deepSummary?.models?.smc || {};

  const actionLabel = verdict.action_label || (changePct >= 0 ? "偏多順勢佈局" : "逢回支撐觀察");
  const entryLow = Array.isArray(verdict.entry_zone)
    ? verdict.entry_zone[0]
    : Number((price * 0.975).toFixed(2));
  const entryHigh = Array.isArray(verdict.entry_zone)
    ? verdict.entry_zone[1]
    : Number((price * 0.995).toFixed(2));
  const stopLoss = verdict.stop_loss || Number((price * 0.94).toFixed(2));
  const targetPrice = verdict.target_price || Number((price * 1.12).toFixed(2));
  const vcpScore = minervini.score ?? 6;
  const obLow = smc?.bullish_ob?.low || entryLow;
  const obHigh = smc?.bullish_ob?.high || entryHigh;

  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 800;
    const H = 1000;
    canvas.width = W;
    canvas.height = H;

    // 1. 深空科技漸層背景
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, "#060a14");
    bgGrad.addColorStop(0.5, "#0f172a");
    bgGrad.addColorStop(1, "#070b14");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. 科技網格裝飾
    ctx.strokeStyle = "rgba(56, 189, 248, 0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // 3. 頂部外框卡片
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, W - 64, H - 64);

    // 4. 繪製台灣黑熊 V-Bear 徽章 (左上角)
    const bx = 95;
    const by = 98;
    // 左耳右耳
    ctx.fillStyle = "#090d16";
    ctx.beginPath();
    ctx.arc(bx - 22, by - 22, 13, 0, Math.PI * 2);
    ctx.arc(bx + 22, by - 22, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fb7185";
    ctx.beginPath();
    ctx.arc(bx - 22, by - 22, 7.5, 0, Math.PI * 2);
    ctx.arc(bx + 22, by - 22, 7.5, 0, Math.PI * 2);
    ctx.fill();
    // 頭
    ctx.fillStyle = "#0b0f17";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bx, by, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 眼睛
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(bx - 10, by - 4, 4.5, 0, Math.PI * 2);
    ctx.arc(bx + 10, by - 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // 吻部
    ctx.fillStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.ellipse(bx, by + 7, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 純白大 V 領
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(bx - 14, by + 20);
    ctx.lineTo(bx, by + 33);
    ctx.lineTo(bx + 14, by + 20);
    ctx.stroke();

    // 品牌標題
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 26px 'Inter', sans-serif";
    ctx.fillText("OmniTick 奧米全時智投", 145, 92);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px 'Inter', sans-serif";
    ctx.fillText("台灣黑熊 V-Bear · AI 多因子量化戰情報告", 145, 120);

    // 日期標籤
    const dateStr = new Date().toLocaleString("zh-TW", { hour12: false });
    ctx.fillStyle = "#64748b";
    ctx.font = "14px monospace";
    ctx.fillText(dateStr, W - 230, 92);

    // 5. 標的與現價主視覺區
    ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
    ctx.fillRect(60, 160, W - 120, 185);
    ctx.strokeStyle = changePct >= 0 ? "rgba(244, 63, 94, 0.45)" : "rgba(16, 185, 129, 0.45)";
    ctx.strokeRect(60, 160, W - 120, 185);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 44px 'Inter', sans-serif";
    ctx.fillText(`${name} (${symbol})`, 90, 225);

    const isUp = changePct >= 0;
    ctx.fillStyle = isUp ? "#fb7185" : "#34d399";
    ctx.font = "bold 56px monospace";
    ctx.fillText(`$${price.toFixed(2)}`, 90, 305);

    ctx.font = "bold 28px monospace";
    const chgText = `${isUp ? "+" : ""}${change.toFixed(2)} (${isUp ? "+" : ""}${changePct.toFixed(2)}%)`;
    ctx.fillText(chgText, 360, 302);

    // AI 總評章
    ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
    ctx.fillRect(W - 270, 188, 185, 48);
    ctx.strokeStyle = "#f59e0b";
    ctx.strokeRect(W - 270, 188, 185, 48);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 20px 'Inter', sans-serif";
    ctx.fillText(actionLabel, W - 245, 219);

    // 6. 四大關鍵量化點位網格
    const cards = [
      {
        label: "AI 委員會階梯進場區",
        val: `$${entryLow} ~ $${entryHigh}`,
        sub: "分批低接安全邊際",
        color: "#38bdf8",
      },
      {
        label: "SMC 機構訂單塊支撐",
        val: `$${obLow} ~ $${obHigh}`,
        sub: "主力大單換手密集區",
        color: "#a78bfa",
      },
      {
        label: "波段目標停利區",
        val: `$${targetPrice}`,
        sub: `Minervini 趨勢評分 ${vcpScore}/8`,
        color: "#fb7185",
      },
      {
        label: "硬性紀律防守停損價",
        val: `$${stopLoss}`,
        sub: "跌破無條件保護本金",
        color: "#34d399",
      },
    ];

    cards.forEach((c, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = 60 + col * 350;
      const cy = 375 + row * 175;
      const cw = 330;
      const ch = 150;

      ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
      ctx.strokeRect(cx, cy, cw, ch);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 18px 'Inter', sans-serif";
      ctx.fillText(c.label, cx + 24, cy + 42);

      ctx.fillStyle = c.color;
      ctx.font = "bold 30px monospace";
      ctx.fillText(c.val, cx + 24, cy + 92);

      ctx.fillStyle = "#64748b";
      ctx.font = "15px 'Inter', sans-serif";
      ctx.fillText(c.sub, cx + 24, cy + 126);
    });

    // 7. 熊霸操盤心法區
    ctx.fillStyle = "rgba(30, 41, 59, 0.55)";
    ctx.fillRect(60, 745, W - 120, 115);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
    ctx.strokeRect(60, 745, W - 120, 115);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 19px 'Inter', sans-serif";
    ctx.fillText("🐻 台灣黑熊 V-Bear 實戰紀律叮嚀：", 85, 782);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "17px 'Inter', sans-serif";
    ctx.fillText(
      `切勿在急拉乖離過大時追高！耐心守候回測 $${entryLow}~$${entryHigh} 支撐區分批佈局，`,
      85,
      815
    );
    ctx.fillText(`並嚴設 $${stopLoss} 為防守底線，維持大賺小賠正期望值。`, 85, 842);

    // 8. 底部品牌與裂變引流資訊
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 18px monospace";
    ctx.fillText("🌐 戰情室：stock-green-ten.vercel.app", 60, 915);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 18px 'Inter', sans-serif";
    ctx.fillText("💬 LINE 搜尋官方帳號秒查報價與突破雷達", W - 405, 915);

    ctx.fillStyle = "#475569";
    ctx.font = "13px 'Inter', sans-serif";
    ctx.fillText("免責聲明：本圖卡由公開數據與量化模型自動生成，僅供研究參考，不構成任何投資買賣建議。", 60, 948);
  }, [symbol, name, price, change, changePct, actionLabel, entryLow, entryHigh, obLow, obHigh, targetPrice, vcpScore, stopLoss]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(drawPoster, 50);
    }
  }, [isOpen, drawPoster]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `OmniTick_${symbol}_${name}_AI體檢圖.png`;
    a.click();
  };

  const handleCopyShareText = () => {
    const text = `🐻【OmniTick 熊霸 AI 量化體檢：${name} (${symbol})】\n📈 現價：$${price} (${
      changePct >= 0 ? "+" : ""
    }${changePct}%)\n🎯 策略評級：${actionLabel}\n🔹 階梯進場區：$${entryLow} ~ $${entryHigh}\n🔹 SMC 機構訂單塊：$${obLow} ~ $${obHigh}\n🔹 波段目標價：$${targetPrice}\n🛡️ 紀律停損價：$${stopLoss}\n👉 免費即時看盤：https://stock-green-ten.vercel.app/stock/${symbol}`;
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handlePushToLine = async () => {
    setPushingLine(true);
    setPushMsg("");
    try {
      const res = await fetch("/api/line/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "radar",
          mode: "broadcast",
          data: {
            symbol,
            name,
            price,
            change,
            changePct,
            volumeLots: 28000,
            triggerName: `AI 體檢報告 · ${actionLabel}`,
            triggerDesc: `建議進場區 $${entryLow}~$${entryHigh}，防守停損 $${stopLoss}，波段目標 $${targetPrice}`,
            category: changePct >= 0 ? "BREAKOUT" : "VOLUME",
          },
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setPushMsg("✅ 已將此股 AI 體檢卡片主動推播至 LINE！");
      } else {
        setPushMsg(`⚠️ ${data?.error || "推播失敗"}`);
      }
    } catch {
      setPushMsg("⚠️ 網路連線異常");
    } finally {
      setPushingLine(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
        title="一鍵生成高畫質個股 AI 體檢長圖，方便分享至 LINE 或社群"
      >
        <Share2 size={14} className="text-amber-400" />
        <span>生成 AI 診斷圖卡</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[var(--bg-secondary)] border border-amber-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <h3 className="text-sm font-extrabold text-primary">
                  {name} ({symbol}) — 熊霸 AI 量化體檢分享圖卡
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-secondary hover:text-primary cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center gap-3 bg-slate-950/60">
              <canvas
                ref={canvasRef}
                className="w-full max-w-[380px] h-auto rounded-xl border border-slate-800 shadow-2xl"
              />
              {pushMsg && <div className="text-xs font-bold text-emerald-400">{pushMsg}</div>}
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-primary)] flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <Download size={14} />
                <span>下載 PNG 圖卡</span>
              </button>

              <button
                type="button"
                onClick={handleCopyShareText}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-accent hover:text-white text-primary font-bold text-xs border border-[var(--border)] flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                {copiedText ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedText ? "已複製戰報" : "複製社群文案"}</span>
              </button>

              <button
                type="button"
                onClick={handlePushToLine}
                disabled={pushingLine}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
              >
                {pushingLine ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>推播至 LINE</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
