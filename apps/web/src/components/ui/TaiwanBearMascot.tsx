"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Bell,
  X,
  ChevronUp,
  MessageSquare,
  Flame,
  Calculator,
  Compass,
} from "lucide-react";

type BearMood = "BULLISH" | "FEAR" | "NEUTRAL";

export default function TaiwanBearMascot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasAlert, setHasAlert] = useState(false);
  const [sentimentScore, setSentimentScore] = useState<number>(55);
  const [speechBubble, setSpeechBubble] = useState<string>("盤中即時掃描中...");

  // 讀取市場情緒以決定黑熊心情
  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        const res = await fetch("/api/market-sentiment");
        if (res.ok) {
          const data = await res.json();
          if (typeof data.overallScore === "number") {
            setSentimentScore(data.overallScore);
          }
        }
      } catch {
        // fallback to default
      }
    };
    fetchSentiment();
    const interval = setInterval(fetchSentiment, 120000);
    return () => clearInterval(interval);
  }, []);

  // 根據市場指數與情緒決定黑熊狀態
  const mood: BearMood = useMemo(() => {
    if (sentimentScore >= 65) return "BULLISH";
    if (sentimentScore <= 40) return "FEAR";
    return "NEUTRAL";
  }, [sentimentScore]);

  useEffect(() => {
    if (mood === "BULLISH") {
      setSpeechBubble("多頭氣勢如虹！胸前 V 字發光，跟緊主力 V 轉節奏！");
    } else if (mood === "FEAR") {
      setSpeechBubble("市場恐慌殺盤？別慌，真大戶都在暴跌找 V 轉黃金坑！");
    } else {
      setSpeechBubble("全市場監控中！盤整期耐心等待量化爆量突破訊號。");
    }
  }, [mood]);

  // 監聽即時雷達警報廣播（如果有新雷達觸發，黑熊耳朵豎起跳動）
  useEffect(() => {
    const handleRadarAlert = () => {
      setHasAlert(true);
      setSpeechBubble("⚡ 抓到了！偵測到主力爆量突破訊號！點我看盤！");
      setTimeout(() => setHasAlert(false), 15000);
    };

    window.addEventListener("stock_radar_alert", handleRadarAlert);
    return () => window.removeEventListener("stock_radar_alert", handleRadarAlert);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-40 select-none print:hidden flex flex-col items-end">
      {/* 1. 互動彈出式對話視窗 (Pop-over) */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-88 rounded-2xl border border-[var(--border)] bg-[var(--bg-glass)] shadow-2xl backdrop-blur-xl p-4.5 animate-slide-up text-primary">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
                <span>熊霸 (V-Bear)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-semibold border border-amber-500/30">
                  AI 守護吉祥物
                </span>
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-secondary hover:text-primary p-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              title="關閉對話"
            >
              <X size={15} />
            </button>
          </div>

          {/* 黑熊即時心語 */}
          <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] mb-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-amber-400/40 flex-shrink-0 flex items-center justify-center text-xs font-black text-amber-400 shadow-sm">
                V
              </div>
              <div>
                <p className="text-xs font-medium text-primary leading-relaxed">
                  {speechBubble}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-secondary">
                  <span>市場情緒: {sentimentScore} / 100</span>
                  <span>•</span>
                  <span className={mood === "BULLISH" ? "text-red-500 font-bold" : mood === "FEAR" ? "text-emerald-500 font-bold" : "text-secondary"}>
                    {mood === "BULLISH" ? "🔥 貪婪偏多" : mood === "FEAR" ? "🛡️ 恐慌防禦" : "⚖️ 中性觀望"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 快捷行動按鈕 */}
          <div className="space-y-1.5 text-xs">
            <Link
              href="/alerts"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 hover:border-emerald-500 transition-all font-semibold text-emerald-700 dark:text-emerald-300 group"
            >
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>綁定 LINE 官方推播 (開通 14 天 Pro)</span>
              </div>
              <span className="text-[10px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded">
                FREE
              </span>
            </Link>

            <Link
              href="/capital-flow"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--border)] border border-[var(--border)] transition-all text-secondary hover:text-primary"
            >
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-rose-500" />
                <span>全市場 ETF 聯手大買 TOP 8</span>
              </div>
              <span className="text-[11px] font-mono text-muted">盤後籌碼 →</span>
            </Link>

            <Link
              href="/dca"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--border)] border border-[var(--border)] transition-all text-secondary hover:text-primary"
            >
              <div className="flex items-center gap-2">
                <Calculator size={14} className="text-accent" />
                <span>定期定額複利收益試算器</span>
              </div>
              <span className="text-[11px] font-mono text-muted">試算 →</span>
            </Link>
          </div>
        </div>
      )}

      {/* 2. 懸浮常駐吉祥物圖示 (Formosan Black Bear) */}
      <div className="relative group">
        {/* 常駐小氣泡提醒（未點開時偶爾冒泡） */}
        {!isOpen && !isMinimized && (
          <div
            onClick={() => setIsOpen(true)}
            className="absolute -top-10 right-0 whitespace-nowrap bg-[var(--bg-glass)] text-primary text-[11px] font-bold py-1 px-2.5 rounded-full border border-[var(--border)] shadow-md backdrop-blur-md cursor-pointer hover:border-accent transition-all animate-bounce flex items-center gap-1.5"
          >
            {hasAlert ? (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            ) : (
              <Sparkles size={11} className="text-amber-400" />
            )}
            <span>{hasAlert ? "主力異動！" : "看今日解盤"}</span>
          </div>
        )}

        {/* 台灣黑熊實體按鈕 (精緻 SVG 動畫) */}
        <button
          onClick={() => {
            setIsOpen((prev) => !prev);
            setHasAlert(false);
          }}
          className={`relative p-1.5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer border ${
            hasAlert
              ? "bg-gradient-to-tr from-rose-600 to-amber-500 border-amber-300 ring-4 ring-rose-500/30 animate-pulse"
              : mood === "BULLISH"
              ? "bg-gradient-to-tr from-slate-900 via-slate-900 to-rose-950 border-rose-500/60 ring-2 ring-rose-500/20"
              : mood === "FEAR"
              ? "bg-gradient-to-tr from-slate-900 via-slate-900 to-emerald-950 border-emerald-500/60 ring-2 ring-emerald-500/20"
              : "bg-slate-900 border-amber-400/50 hover:border-amber-400"
          }`}
          title="點擊與台灣黑熊「熊霸」互動，查看今日解盤與警報"
        >
          {/* 精緻台灣黑熊 SVG */}
          <svg
            className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-lg"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* 左耳與右耳 (圓圓的台灣黑熊招牌耳朵) */}
            <circle cx="24" cy="24" r="14" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
            <circle cx="24" cy="24" r="8" fill="#fda4af" opacity="0.8" />
            <circle cx="76" cy="24" r="14" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
            <circle cx="76" cy="24" r="8" fill="#fda4af" opacity="0.8" />

            {/* 科技耳機天線 (量化雷達感應器) */}
            <path
              d="M 20 18 Q 50 6 80 18"
              stroke={hasAlert ? "#f43f5e" : "#38bdf8"}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
            <circle cx="50" cy="8" r="4" fill={hasAlert ? "#f43f5e" : "#38bdf8"} className={hasAlert ? "animate-ping" : ""} />

            {/* 頭部主體 (毛茸茸黑色外型) */}
            <rect x="14" y="20" width="72" height="68" rx="34" fill="#090d16" stroke="#1e293b" strokeWidth="2" />

            {/* 圓滾滾白皙臉頰 */}
            <circle cx="28" cy="62" r="4.5" fill="#f43f5e" opacity="0.35" />
            <circle cx="72" cy="62" r="4.5" fill="#f43f5e" opacity="0.35" />

            {/* 靈動大眼睛 */}
            {mood === "BULLISH" ? (
              // 歡樂笑瞇眼 (弧線)
              <>
                <path d="M 32 46 Q 38 40 44 46" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M 56 46 Q 62 40 68 46" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              </>
            ) : mood === "FEAR" ? (
              // 堅定專注大眼 (圓形 + 堅毅高光)
              <>
                <circle cx="38" cy="46" r="6" fill="#f8fafc" />
                <circle cx="39" cy="45" r="3.5" fill="#0284c7" />
                <circle cx="62" cy="46" r="6" fill="#f8fafc" />
                <circle cx="63" cy="45" r="3.5" fill="#0284c7" />
              </>
            ) : (
              // 眨眼/智慧探索眼
              <>
                <circle cx="38" cy="46" r="5" fill="#f8fafc" />
                <circle cx="39" cy="45" r="2.5" fill="#0f172a" />
                <circle cx="62" cy="46" r="5" fill="#f8fafc" />
                <circle cx="63" cy="45" r="2.5" fill="#0f172a" />
              </>
            )}

            {/* 口鼻部 (白色/米黃微凸橢圓) */}
            <ellipse cx="50" cy="58" rx="14" ry="10" fill="#f1f5f9" />
            {/* 黑熊黑色三角小鼻子 */}
            <path d="M 45 54 L 55 54 L 50 60 Z" fill="#0f172a" />
            {/* 微笑小嘴 */}
            <path d="M 47 62 Q 50 65 53 62" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />

            {/* ★ 核心靈魂：胸前巨大白色/金黃「V」字胸標 (象徵 V-shaped Rebound 與勝利 Victory) ★ */}
            <path
              d="M 32 75 L 50 92 L 68 75"
              stroke={
                hasAlert
                  ? "#fbbf24"
                  : mood === "BULLISH"
                  ? "#f59e0b"
                  : mood === "FEAR"
                  ? "#10b981"
                  : "#ffffff"
              }
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className={mood === "BULLISH" || hasAlert ? "filter drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]" : ""}
            />
          </svg>

          {/* 右上角警報未讀小徽章 */}
          {hasAlert && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-[9px] font-black text-white">
              !
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
