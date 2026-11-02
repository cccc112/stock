"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import {
  Gauge,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Newspaper,
  Compass,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import { useColorPreference } from "@/hooks/useColorPreference";
import type { MarketSentimentResponse } from "@/app/api/market-sentiment/route";

export default function MarketSentimentSection() {
  const [data, setData] = useState<MarketSentimentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllNews, setShowAllNews] = useState(false);
  const { isRedUp } = useColorPreference();

  const fetchSentiment = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else if (!data) setLoading(true);

    try {
      const url = `/api/market-sentiment${refresh ? "?refresh=true" : ""}`;
      const res = await fetch(url, {
        headers: {
          ...getAuthHeaders(),
        },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load market sentiment:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    fetchSentiment();
    // 每 2 分鐘自動背景更新
    const timer = setInterval(() => fetchSentiment(true), 120000);
    return () => clearInterval(timer);
  }, [fetchSentiment]);

  const score = data?.overallScore ?? 50;

  // 取得情緒代表色彩（融入使用者自訂之漲跌色彩風格）
  const getSentimentTone = (val: number) => {
    if (val >= 60) {
      // 偏多樂觀
      return {
        textClass: isRedUp ? "text-rose-400" : "text-emerald-400",
        bgClass: isRedUp ? "bg-rose-500/15" : "bg-emerald-500/15",
        borderClass: isRedUp ? "border-rose-500/30" : "border-emerald-500/30",
        strokeHex: isRedUp ? "#f43f5e" : "#10b981",
        label: val >= 75 ? "極度貪婪" : "審慎樂觀",
      };
    } else if (val <= 44) {
      // 偏空恐慌
      return {
        textClass: isRedUp ? "text-emerald-400" : "text-rose-400",
        bgClass: isRedUp ? "bg-emerald-500/15" : "bg-rose-500/15",
        borderClass: isRedUp ? "border-emerald-500/30" : "border-rose-500/30",
        strokeHex: isRedUp ? "#10b981" : "#f43f5e",
        label: val <= 24 ? "極度恐慌" : "偏向悲觀",
      };
    }
    // 中性觀望
    return {
      textClass: "text-amber-400",
      bgClass: "bg-amber-500/15",
      borderClass: "border-amber-500/30",
      strokeHex: "#f59e0b",
      label: "中性觀望",
    };
  };

  const tone = getSentimentTone(score);

  // SVG 半圓儀表盤計算
  // 半徑 70, 弧長 = PI * 70 ≈ 220
  const radius = 70;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // 半圓總周長 ~219.9
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-accent/15 text-accent flex items-center justify-center">
            <Sparkles size={14} />
          </div>
          <span className="font-bold text-sm sm:text-base text-primary">
            AI 市場即時情緒與恐慌雷達
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold border border-accent/20 hidden sm:inline-block">
            NLP 新聞語意 × VIX 恐慌模型
          </span>
        </div>
      }
      headerAction={
        <div className="flex items-center gap-2">
          {data?.updatedAt && (
            <span className="text-[11px] font-mono text-muted hidden md:inline">
              最後運算：{new Date(data.updatedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
            </span>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fetchSentiment(true)}
            disabled={isRefreshing}
            className="text-xs px-2.5 py-1 gap-1"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
            <span>{isRefreshing ? "運算中..." : "重新評估"}</span>
          </Button>
        </div>
      }
    >
      {loading && !data ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-accent" />
          <p className="text-xs text-secondary animate-pulse">
            正在抓取全球最新新聞與 VIX 波動率指標，運行機器學習情緒評估模型...
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 上半部：儀表盤 + 策略方針 + 4大因子拆解 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* 左側：核心指數儀表盤 (5 欄寬) */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-[var(--border)]">
                <span className="text-secondary font-medium flex items-center gap-1.5">
                  <Gauge size={14} className="text-accent" />
                  綜合市場情緒指標 (Composite Sentiment)
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${tone.bgClass} ${tone.textClass} ${tone.borderClass}`}>
                  {data?.statusLabel || tone.label}
                </span>
              </div>

              {/* 半圓 Gauge */}
              <div className="flex flex-col items-center justify-center relative pt-2">
                <svg
                  width="200"
                  height="115"
                  viewBox="0 0 180 100"
                  className="overflow-visible"
                >
                  {/* 底層半圓背景軌道 */}
                  <path
                    d="M 20 90 A 70 70 0 0 1 160 90"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                  {/* 彩色進度半圓弧 */}
                  <path
                    d="M 20 90 A 70 70 0 0 1 160 90"
                    fill="none"
                    stroke={tone.strokeHex}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                {/* 中心分數數字 */}
                <div className="absolute bottom-2 flex flex-col items-center">
                  <span className={`text-4xl font-extrabold font-mono tracking-tight ${tone.textClass}`}>
                    {Number(score).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-secondary font-medium">/ 100 點</span>
                </div>
              </div>

              {/* 刻度標籤 */}
              <div className="flex justify-between items-center text-[11px] font-mono text-muted px-2 -mt-1">
                <span>0 極度恐慌</span>
                <span>50 中性</span>
                <span>100 極度貪婪</span>
              </div>

              {/* 狀態精闢點評 */}
              <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-secondary leading-relaxed">
                <p className="font-semibold text-primary mb-1 flex items-center gap-1.5">
                  <Lightbulb size={13} className="text-amber-500 flex-shrink-0" />
                  <span>{data?.statusDescription}</span>
                </p>
                <div className="flex items-start gap-1.5 pt-1 text-[11px] text-accent font-medium border-t border-[var(--border)]/60 mt-1.5">
                  <Compass size={13} className="flex-shrink-0 mt-0.5" />
                  <span>實戰策略：{data?.actionableGuidance}</span>
                </div>
              </div>
            </div>

            {/* 右側：四大維度因子拆解 (7 欄寬) */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-3 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
              <div className="text-xs font-semibold text-primary flex items-center justify-between pb-1.5 border-b border-[var(--border)]">
                <span>機器學習多因子權重診斷 (Factor Decomposition)</span>
                <span className="text-secondary font-mono text-[11px]">即時並行計算</span>
              </div>

              <div className="flex flex-col gap-3.5 my-auto">
                {data?.factors.map((f) => {
                  const fTone = getSentimentTone(f.score);
                  return (
                    <div key={f.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary">{f.label}</span>
                          <span className="text-[10px] text-muted font-mono">
                            (權重 {Number(f.weight).toFixed(2)}%)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className={`text-[11px] font-semibold ${fTone.textClass}`}>
                            {f.status}
                          </span>
                          <span className="text-xs font-bold text-primary">
                            {Number(f.score).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* 進度條 */}
                      <div className="w-full h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden p-0.5 border border-[var(--border)]">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max(4, Math.min(100, f.score))}%`,
                            backgroundColor: fTone.strokeHex,
                          }}
                        />
                      </div>

                      {/* 細節說明 */}
                      <p className="text-[11px] text-secondary leading-normal">
                        {f.summary}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* 關鍵指標數據膠囊 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] text-xs">
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)] flex flex-col">
                  <span className="text-[10px] text-muted">VIX 恐慌現價</span>
                  <span className="font-mono font-bold text-primary">
                    {(data?.stats.vix.price ?? 0).toFixed(2)}
                    <span className={`text-[10px] ml-1 ${(data?.stats.vix.change ?? 0) >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {(data?.stats.vix.change ?? 0) >= 0 ? "+" : ""}{(data?.stats.vix.change ?? 0).toFixed(2)}
                    </span>
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[var(--bg-secondary)] flex flex-col">
                  <span className="text-[10px] text-muted">新聞多空比</span>
                  <span className="font-mono font-bold text-primary">
                    <span className={isRedUp ? "text-rose-400" : "text-emerald-400"}>
                      多 {Number(data?.stats.newsSentimentRatio.bullishPct || 0).toFixed(2)}%
                    </span>
                    {" / "}
                    <span className={isRedUp ? "text-emerald-400" : "text-rose-400"}>
                      空 {Number(data?.stats.newsSentimentRatio.bearishPct || 0).toFixed(2)}%
                    </span>
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[var(--bg-secondary)] flex flex-col col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-muted">加密情緒 (F&G)</span>
                  <span className="font-mono font-bold text-primary">
                    {data?.stats.cryptoFearGreed?.value || 50} 分
                    <span className="text-[10px] text-muted ml-1 font-normal">
                      ({data?.stats.cryptoFearGreed?.classification || "Neutral"})
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 下半部：NLP 分析之即時新聞標題與情緒標籤 */}
          {data?.newsHighlights && data.newsHighlights.length > 0 && (
            <div className="p-3 sm:p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--border)]">
                <div className="flex items-center gap-2 font-semibold text-primary">
                  <Newspaper size={14} className="text-accent" />
                  <span>即時財經新聞 NLP 語意特徵樣本（共分析 {data.stats.newsSentimentRatio.totalCount} 篇）</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllNews(!showAllNews)}
                  className="text-accent hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{showAllNews ? "收合摘要" : "展開更多新聞"}</span>
                  {showAllNews ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {(showAllNews ? data.newsHighlights : data.newsHighlights.slice(0, 6)).map((item, idx) => {
                  const isBull = item.sentiment === "BULLISH";
                  const isBear = item.sentiment === "BEARISH";
                  const badgeColor = isBull
                    ? isRedUp
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : isBear
                      ? isRedUp
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      : "bg-slate-500/15 text-slate-400 border-slate-500/30";

                  return (
                    <a
                      key={idx}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-lg bg-[var(--bg-secondary)] hover:border-accent/40 border border-[var(--border)] transition-all flex flex-col justify-between gap-2 group cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-primary group-hover:text-accent transition-colors line-clamp-2 leading-relaxed">
                          {item.title}
                        </span>
                        <ExternalLink size={12} className="text-muted group-hover:text-accent flex-shrink-0 mt-0.5" />
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--border)]/40">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${badgeColor}`}>
                            {isBull ? "利多多方" : isBear ? "利空防守" : "中性偏平"}
                          </span>
                          {item.highlightKeywords.map((kw, kidx) => (
                            <span key={kidx} className="text-[10px] text-accent font-mono bg-accent/10 px-1 rounded">
                              #{kw}
                            </span>
                          ))}
                        </div>
                        <span className="text-[10px] text-muted truncate max-w-[100px]">
                          {item.source}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
