"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Card from "@/components/ui/Card";
import {
  Sparkles,
  RefreshCw,
  ExternalLink,
  Send,
  MessageSquareQuote,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Flame,
  Zap,
  Image as ImageIcon,
} from "lucide-react";
import type { CelebrityPostItem } from "@/app/api/celebrity-feed/route";

const CELEBRITIES = [
  {
    id: "TRUMP",
    name: "川普 Donald Trump",
    sub: "@realDonaldTrump · Truth Social 全量貼文",
    badge: "🇺🇸 全部發文追蹤",
  },
  {
    id: "ALL",
    name: "全部名人雷達",
    sub: "川普 · 馬斯克 · 黃仁勳 · 鮑爾",
    badge: "🔥 全域監控",
  },
  {
    id: "MUSK",
    name: "馬斯克 Elon Musk",
    sub: "@elonmusk · X (Twitter)",
    badge: "🚀 特斯拉/機器人",
  },
  {
    id: "HUANG",
    name: "黃仁勳 Jensen Huang",
    sub: "@nvidia · AI 算力教父",
    badge: "🟢 輝達/CoWoS",
  },
  {
    id: "POWELL",
    name: "鮑爾 Jerome Powell",
    sub: "@federalreserve · Fed 主席",
    badge: "🏛️ 降息/美債",
  },
] as const;

function formatRelativeTime(timestamp: number) {
  if (!timestamp || isNaN(timestamp)) return "剛剛";
  const diffMin = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMin < 2) return "剛剛更新";
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小時前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  return new Date(timestamp).toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function CelebrityRadar() {
  // 預設直接進入川普全量貼文追蹤（亦可隨時切換全部名人或馬斯克等）
  const [selectedPerson, setSelectedPerson] = useState<string>("TRUMP");
  const [trumpTypeFilter, setTrumpTypeFilter] = useState<"ALL" | "ORIGINAL" | "REPOST">("ALL");
  const [items, setItems] = useState<CelebrityPostItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 單篇展開 AI 深度報告狀態
  const [expandedReports, setExpandedReports] = useState<Record<string, string>>({});
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  // 自訂貼上推文/發言即時 AI 診斷
  const [customPerson, setCustomPerson] = useState<"TRUMP" | "MUSK" | "HUANG" | "POWELL">("TRUMP");
  const [customText, setCustomText] = useState<string>("");
  const [customLoading, setCustomLoading] = useState<boolean>(false);
  const [customResult, setCustomResult] = useState<any | null>(null);

  const fetchFeed = useCallback(async (person: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/celebrity-feed?person=${encodeURIComponent(person)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setItems(Array.isArray(json.data) ? json.data : []);
      }
    } catch (e) {
      console.error("Failed to fetch celebrity feed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(selectedPerson);
  }, [selectedPerson, fetchFeed]);

  // 每 60 秒自動輪詢川普最新 Truth Social 貼文
  useEffect(() => {
    const timer = setInterval(() => {
      fetchFeed(selectedPerson);
    }, 60000);
    return () => clearInterval(timer);
  }, [selectedPerson, fetchFeed]);

  const filteredItems = useMemo(() => {
    if (selectedPerson !== "TRUMP" || trumpTypeFilter === "ALL") return items;
    if (trumpTypeFilter === "ORIGINAL") {
      return items.filter((i) => i.postType === "original" || i.postType === "news");
    }
    return items.filter((i) => i.postType === "quote" || i.postType === "repost");
  }, [items, selectedPerson, trumpTypeFilter]);

  // 觸發單篇貼文的 AI 深度推演報告
  const handleGenerateDeepReport = async (item: CelebrityPostItem) => {
    if (expandedReports[item.id]) {
      const copy = { ...expandedReports };
      delete copy[item.id];
      setExpandedReports(copy);
      return;
    }

    setLoadingReportId(item.id);
    try {
      const savedKey =
        typeof window !== "undefined" ? localStorage.getItem("user_gemini_api_key") || "" : "";
      const res = await fetch("/api/celebrity-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: item.personId,
          personName: item.personName,
          text: item.headline,
          originalText: item.originalText || "",
          apiKey: savedKey,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExpandedReports((prev) => ({
          ...prev,
          [item.id]: data.deepReportMarkdown || "無法生成報告",
        }));
      }
    } catch (e) {
      console.error("Deep report error:", e);
    } finally {
      setLoadingReportId(null);
    }
  };

  // 自訂貼上推文 AI 分析
  const handleCustomAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    setCustomLoading(true);
    try {
      const savedKey =
        typeof window !== "undefined" ? localStorage.getItem("user_gemini_api_key") || "" : "";
      const personMeta = CELEBRITIES.find((c) => c.id === customPerson);
      const res = await fetch("/api/celebrity-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: customPerson,
          personName: personMeta?.name || customPerson,
          text: customText.trim(),
          apiKey: savedKey,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomResult(data);
      }
    } catch (e) {
      console.error("Custom analyze error:", e);
    } finally {
      setCustomLoading(false);
    }
  };

  const getSentimentStyle = (sentiment: CelebrityPostItem["sentiment"]) => {
    if (sentiment === "BULLISH") {
      return "bg-red-500/15 text-red-400 border-red-500/30";
    }
    if (sentiment === "BEARISH") {
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  };

  const getEffectBadge = (effect: "POSITIVE" | "NEGATIVE" | "WATCH") => {
    if (effect === "POSITIVE") {
      return "bg-red-500/15 text-red-400 border-red-500/30";
    }
    if (effect === "NEGATIVE") {
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  };

  const getEffectLabel = (effect: "POSITIVE" | "NEGATIVE" | "WATCH") => {
    if (effect === "POSITIVE") return "受惠看多";
    if (effect === "NEGATIVE") return "政策承壓";
    return "震盪觀察";
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. 頂部名人選擇器 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
        {CELEBRITIES.map((cel) => {
          const active = selectedPerson === cel.id;
          return (
            <button
              key={cel.id}
              onClick={() => setSelectedPerson(cel.id)}
              className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer ${
                active
                  ? "bg-accent/15 border-accent shadow-md shadow-accent/10"
                  : "bg-[var(--bg-secondary)] border-[var(--border)] hover:border-accent/50"
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-accent font-semibold">
                  {cel.badge}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-primary truncate">{cel.name}</div>
              <div className="text-[10px] text-secondary truncate mt-0.5">{cel.sub}</div>
            </button>
          );
        })}
      </div>

      {/* 2. 貼上最新推文 / 貼文即時 AI 投顧診斷室 */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent" />
            <span>貼上名人最新 Truth Social / X 貼文，讓 AI 即時推演台美股買賣建議</span>
          </div>
        }
        headerAction={
          <div className="flex items-center gap-1.5 text-[11px] text-secondary">
            <span>快速填入範例：</span>
            <button
              type="button"
              onClick={() => {
                setCustomPerson("TRUMP");
                setCustomText(
                  "川普發文表示將對進口半導體與汽車課徵高關稅，要求企業在美國本土密西根與亞利桑那州擴大設廠生產。"
                );
              }}
              className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] hover:text-accent cursor-pointer"
            >
              川普晶片與汽車關稅
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomPerson("MUSK");
                setCustomText(
                  "Elon Musk 在 X 宣布 Tesla Optimus 人形機器人產線將於明年大幅擴產，並加速 Cybercab 自駕計程車路測。"
                );
              }}
              className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] hover:text-accent cursor-pointer"
            >
              馬斯克機器人量產
            </button>
          </div>
        }
      >
        <form onSubmit={handleCustomAnalyze} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={customPerson}
              onChange={(e) => setCustomPerson(e.target.value as any)}
              className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-primary font-semibold focus:outline-none focus:border-accent sm:w-48"
            >
              <option value="TRUMP">🇺🇸 川普 (Donald Trump)</option>
              <option value="MUSK">🚀 馬斯克 (Elon Musk)</option>
              <option value="HUANG">🟢 黃仁勳 (Jensen Huang)</option>
              <option value="POWELL">🏛️ 鮑爾 (Jerome Powell)</option>
            </select>

            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="在此貼上川普 Truth Social 原文、馬斯克 X 推文或突發發言內容（中英文皆可）..."
                className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-primary focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={customLoading || !customText.trim()}
                className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <Send size={13} />
                {customLoading ? "AI 推演中..." : "AI 立即分析"}
              </button>
            </div>
          </div>
        </form>

        {customResult && (
          <div className="mt-4 p-4 rounded-xl bg-[var(--bg-tertiary)]/90 border border-accent/40 space-y-3 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getSentimentStyle(
                    customResult.sentiment
                  )}`}
                >
                  {customResult.sentimentLabel}
                </span>
                <span className="text-xs font-mono text-accent font-bold">
                  市場衝擊指數：{customResult.impactScore} / 10
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCustomResult(null)}
                className="text-xs text-secondary hover:text-primary cursor-pointer"
              >
                收合結果
              </button>
            </div>

            <div className="ai-report-prose prose prose-invert max-w-none text-xs leading-relaxed">
              <ReactMarkdown>{customResult.deepReportMarkdown}</ReactMarkdown>
            </div>

            {Array.isArray(customResult.affectedStocks) && customResult.affectedStocks.length > 0 && (
              <div className="pt-2 border-t border-[var(--border)] flex flex-wrap gap-2">
                {customResult.affectedStocks.map((st: any) => (
                  <Link
                    key={st.symbol}
                    href={`/stock/${st.symbol}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-accent text-xs transition-all"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getEffectBadge(st.effect)}`}>
                      {getEffectLabel(st.effect)}
                    </span>
                    <span className="font-bold text-primary font-mono">{st.symbol}</span>
                    <span className="text-secondary">{st.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 3. 即時名人貼文串流標題與川普全量貼文篩選器 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-primary">
            <MessageSquareQuote size={18} className="text-accent" />
            <span>
              {selectedPerson === "TRUMP"
                ? `川普 (@realDonaldTrump) Truth Social 全量發文即時追蹤 (${filteredItems.length} 則)`
                : `名人最新貼文 / 發言追蹤與 AI 投顧建議 (${filteredItems.length} 則)`}
            </span>
          </div>

          {selectedPerson === "TRUMP" && (
            <div className="flex bg-[var(--bg-secondary)] p-0.5 rounded-lg border border-[var(--border)] text-xs">
              <button
                onClick={() => setTrumpTypeFilter("ALL")}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                  trumpTypeFilter === "ALL" ? "bg-accent text-white" : "text-secondary hover:text-primary"
                }`}
              >
                全部發文 ({items.length})
              </button>
              <button
                onClick={() => setTrumpTypeFilter("ORIGINAL")}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                  trumpTypeFilter === "ORIGINAL" ? "bg-accent text-white" : "text-secondary hover:text-primary"
                }`}
              >
                原創貼文 ({items.filter((i) => i.postType === "original" || i.postType === "news").length})
              </button>
              <button
                onClick={() => setTrumpTypeFilter("REPOST")}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-all ${
                  trumpTypeFilter === "REPOST" ? "bg-accent text-white" : "text-secondary hover:text-primary"
                }`}
              >
                引用與轉發 ({items.filter((i) => i.postType === "quote" || i.postType === "repost").length})
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => fetchFeed(selectedPerson)}
          className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-secondary hover:text-primary flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-accent" : ""} />
          <span>同步最新貼文</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-secondary text-sm animate-pulse">
          正在即時同步 @realDonaldTrump Truth Social 全量貼文、自動翻譯繁體中文並執行 AI 因果推演...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center text-secondary text-sm">
          暫無相關名人動態，請點擊右上角重新整理
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map((item) => {
            const isExpanded = Boolean(expandedReports[item.id]);
            const isGenerating = loadingReportId === item.id;

            return (
              <div
                key={item.id}
                className="glass-card p-4 sm:p-5 border border-[var(--border)] hover:border-accent/40 transition-all space-y-3.5"
              >
                {/* 頂部：名人資訊 + 情緒定調 + 衝擊分數 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center font-bold text-accent text-xs">
                      {item.personId === "TRUMP"
                        ? "DT"
                        : item.personId === "MUSK"
                        ? "EM"
                        : item.personId === "HUANG"
                        ? "JH"
                        : "JP"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-primary">{item.personName}</span>
                        <span className="text-xs font-mono text-accent">{item.handle}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-secondary font-medium">
                          {item.platform}
                        </span>
                      </div>
                      <div className="text-[11px] text-secondary flex items-center gap-2 mt-0.5">
                        <span>{item.source}</span>
                        <span>•</span>
                        <span className="text-accent font-medium">{formatRelativeTime(item.timestamp)}</span>
                        <span className="text-muted font-mono">
                          (
                          {new Date(item.timestamp).toLocaleString("zh-TW", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                          )
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getSentimentStyle(
                        item.sentiment
                      )}`}
                    >
                      {item.sentimentLabel}
                    </span>
                    <div className="px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs font-mono flex items-center gap-1">
                      <Flame size={13} className="text-amber-400" />
                      <span className="text-secondary">衝擊</span>
                      <span className="font-bold text-primary">{item.impactScore}</span>
                    </div>
                  </div>
                </div>

                {/* 貼文內容：繁體中文翻譯 + Truth Social 英文原文對照 + 原貼文連結 */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)]/75 border border-[var(--border)] space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-sm sm:text-base text-primary leading-relaxed">
                      {item.headline}
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-accent hover:underline flex-shrink-0 bg-accent/10 px-2 py-1 rounded font-medium"
                    >
                      <span>原貼文</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {item.originalText && item.originalText !== item.headline && (
                    <div className="text-xs text-secondary font-mono bg-[var(--bg-secondary)]/80 p-2.5 rounded-lg border border-[var(--border)]/60 leading-relaxed">
                      <span className="text-[10px] text-accent font-sans font-semibold mr-1.5">
                        [Truth Social 原文]
                      </span>
                      {item.originalText}
                    </div>
                  )}

                  {item.mediaUrl && (
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={item.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-md"
                      >
                        <ImageIcon size={13} />
                        <span>查看川普貼文附帶之原始媒體 ({item.mediaType || "image"})</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* AI 因果分析與實戰操作建議雙欄 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1">
                    <div className="font-bold text-blue-400 flex items-center gap-1.5">
                      <Zap size={14} />
                      <span>AI 市場因果解讀</span>
                    </div>
                    <p className="text-secondary leading-relaxed">{item.aiSummary}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      <span>AI 具體操作與配置建議</span>
                    </div>
                    <p className="text-secondary leading-relaxed">{item.actionableAdvice}</p>
                  </div>
                </div>

                {/* 受影響之台美股標的清單 (可直接點擊進入個股頁) */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-secondary font-medium flex items-center gap-2">
                    <span>🎯 AI 點名連動台美股標的（點擊查看即時 K 線與籌碼）：</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {item.affectedStocks.map((st) => (
                      <Link
                        key={st.symbol}
                        href={`/stock/${st.symbol}`}
                        className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-accent transition-all flex flex-col justify-between group"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold font-mono text-xs text-primary group-hover:text-accent">
                              {st.symbol}
                            </span>
                            <span className="text-xs text-secondary truncate">{st.name}</span>
                          </div>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold whitespace-nowrap ${getEffectBadge(
                              st.effect
                            )}`}
                          >
                            {getEffectLabel(st.effect)}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted leading-snug line-clamp-2">{st.reason}</div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* 底部：展開完整 AI 深度推演報告按鈕 */}
                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {item.sectors.map((sec) => (
                      <span
                        key={sec}
                        className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-secondary"
                      >
                        #{sec}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateDeepReport(item)}
                    disabled={isGenerating}
                    className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={13} />
                    <span>
                      {isGenerating
                        ? "AI 正在撰寫深度推演..."
                        : isExpanded
                        ? "收合 AI 深度報告"
                        : "AI 深度推演此貼文"}
                    </span>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {isExpanded && expandedReports[item.id] && (
                  <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-accent/30 ai-report-prose prose prose-invert max-w-none text-xs leading-relaxed animate-fade-in">
                    <ReactMarkdown>{expandedReports[item.id]}</ReactMarkdown>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
