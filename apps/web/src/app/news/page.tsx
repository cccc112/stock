"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import { Newspaper, Search, RefreshCw, Sparkles, DollarSign, X, ExternalLink, MessageSquareQuote } from "lucide-react";
import { apiStocks } from "@/lib/api";
import CelebrityRadar from "@/components/news/CelebrityRadar";

function formatRelativeTime(dateInput: any) {
  if (!dateInput) return "剛剛";
  const time = typeof dateInput === "number" ? dateInput : new Date(dateInput).getTime();
  if (isNaN(time)) return String(dateInput);
  const diffMs = Date.now() - time;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 2) return "剛剛更新";
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  if (diffHour < 24) return `${diffHour} 小時前`;
  if (diffDay === 1) return "昨天";
  if (diffDay < 7) return `${diffDay} 天前`;
  return new Date(time).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });
}

const MACRO_TOPICS = [
  { id: "MACRO_TW", label: "台股大盤與總經", title: "台股大盤與總體經濟即時快訊" },
  { id: "MACRO_US", label: "美股與全球科技", title: "美股華爾街與全球科技即時動態" },
  { id: "MACRO_ETF", label: "ETF 與債匯市", title: "ETF 申贖、美債殖利率與匯市快訊" },
  { id: "MACRO_GLOBAL", label: "國際政經與原物料", title: "全球總經、央行政策與原物料快訊" },
];

export default function NewsPage() {
  // 主視圖切換：MACRO_NEWS (全球總體與個股即時新聞) vs CELEBRITY_RADAR (川普/馬斯克等名人貼文與 AI 投顧分析)
  const [mainView, setMainView] = useState<"MACRO_NEWS" | "CELEBRITY_RADAR">("MACRO_NEWS");

  const [topic, setTopic] = useState<string>("MACRO_TW");
  const [customSymbol, setCustomSymbol] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNewsData = useCallback(async (activeTopic: string, symbolQuery: string) => {
    setLoading(true);
    try {
      const params = symbolQuery
        ? `symbol=${encodeURIComponent(symbolQuery)}`
        : `topic=${encodeURIComponent(activeTopic)}`;

      // 1. 優先由前端同源 Serverless Route 即時抓取 Google 財經 RSS，毫秒級回應且不受後端冷啟動影響
      const localRes = await fetch(`/api/news?${params}`);
      if (localRes.ok) {
        const json = await localRes.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setNews(
            json.data.map((item: any) => ({
              headline: item.title,
              source: item.source || "財經即時快訊",
              datetime: item.timestamp || new Date(item.date).getTime() || Date.now(),
              url:
                item.link && item.link.startsWith("http")
                  ? item.link
                  : `https://news.google.com/search?q=${encodeURIComponent(item.title)}`,
            }))
          );
          setLoading(false);
          return;
        }
      }

      // 2. 後端 API 備援
      const target = symbolQuery || (activeTopic === "MACRO_US" ? "SPY" : "0050");
      const res = await apiStocks.getNews(target);
      const items = res.data?.data || res.data || [];
      if (Array.isArray(items) && items.length > 0) {
        setNews(
          items.slice(0, 30).map((item: any) => ({
            headline: item.title,
            source: item.source || "財經即時快訊",
            datetime: (() => {
              const t = new Date(item.date).getTime();
              return isNaN(t) ? Date.now() : t;
            })(),
            url:
              item.link && item.link.startsWith("http")
                ? item.link
                : `https://news.google.com/search?q=${encodeURIComponent(item.title)}`,
          }))
        );
      } else {
        setNews([]);
      }
    } catch (err) {
      console.warn("News fetch error:", err);
      setNews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNewsData(topic, customSymbol);
  }, [topic, customSymbol, fetchNewsData]);

  // 每 60 秒自動靜態更新最新即時新聞
  useEffect(() => {
    const timer = setInterval(() => {
      if (mainView === "MACRO_NEWS") {
        fetchNewsData(topic, customSymbol);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [mainView, topic, customSymbol, fetchNewsData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchInput.trim().toUpperCase();
    if (q) {
      setCustomSymbol(q);
      setMainView("MACRO_NEWS");
    } else {
      setCustomSymbol("");
    }
  };

  const clearCustomSearch = () => {
    setSearchInput("");
    setCustomSymbol("");
  };

  const currentTitle = customSymbol
    ? `${customSymbol} 個股與相關即時新聞`
    : MACRO_TOPICS.find((t) => t.id === topic)?.title || "即時財經新聞";

  return (
    <div className="animate-fade-in space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">
            即時財經新聞與名人貼文 AI 雷達
          </h1>
          <p className="text-secondary text-xs sm:text-sm">
            全天候追蹤台美股總體快訊，以及川普、馬斯克、黃仁勳、鮑爾最新貼文與 AI 投資建議
          </p>
        </div>

        {mainView === "MACRO_NEWS" && (
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="選填搜尋特定個股 (例: NVDA, 2330)"
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg py-1.5 pl-8 pr-7 text-xs text-primary focus:outline-none focus:border-accent"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={clearCustomSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary cursor-pointer"
                  title="清除搜尋"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              搜尋
            </button>
          </form>
        )}
      </header>

      {/* 頂部雙主軸切換：全球總體即時新聞 vs 川普/馬斯克名人貼文與 AI 投顧 */}
      <div className="flex border-b border-[var(--border)] gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setMainView("MACRO_NEWS")}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap relative cursor-pointer transition-colors ${
            mainView === "MACRO_NEWS" ? "text-accent" : "text-secondary hover:text-primary"
          }`}
        >
          <Newspaper size={16} />
          <span>全球總體與個股即時新聞</span>
          {mainView === "MACRO_NEWS" && (
            <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-accent rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setMainView("CELEBRITY_RADAR")}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap relative cursor-pointer transition-colors ${
            mainView === "CELEBRITY_RADAR" ? "text-accent" : "text-secondary hover:text-primary"
          }`}
        >
          <MessageSquareQuote size={16} />
          <span>名人貼文追蹤與 AI 投顧分析 (川普 / 馬斯克 / 黃仁勳)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent/15 text-accent font-bold">
            AI 建議
          </span>
          {mainView === "CELEBRITY_RADAR" && (
            <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-accent rounded-t-full" />
          )}
        </button>
      </div>

      {mainView === "CELEBRITY_RADAR" ? (
        <CelebrityRadar />
      ) : (
        <>
          {/* 總體新聞分類切換列（無預設個股，直接呈現大盤與總經新聞） */}
          <div className="flex items-center justify-between pb-1 gap-2">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {MACRO_TOPICS.map((t) => {
                const isActive = !customSymbol && topic === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setCustomSymbol("");
                      setSearchInput("");
                      setTopic(t.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-accent text-white shadow-sm"
                        : "bg-[var(--bg-secondary)] text-secondary hover:text-primary"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {customSymbol && (
                <button
                  onClick={clearCustomSearch}
                  className="px-2.5 py-1 rounded-lg bg-accent/15 text-accent border border-accent/30 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <span>搜尋: {customSymbol}</span>
                  <X size={12} />
                </button>
              )}
              <button
                onClick={() => fetchNewsData(topic, customSymbol)}
                className="p-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-secondary hover:text-primary transition-colors cursor-pointer"
                title="手動刷新即時新聞"
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-accent" : ""} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Newspaper size={17} className="text-accent flex-shrink-0" />
                  <span className="truncate">{currentTitle}</span>
                  <span className="text-xs font-mono text-secondary font-normal flex-shrink-0">
                    ({news.length} 則)
                  </span>
                </div>
              }
              className="lg:col-span-2"
            >
              {loading ? (
                <div className="flex flex-col space-y-4 text-center items-center py-16 text-secondary animate-pulse text-sm">
                  正在同步最新即時財經快訊...
                </div>
              ) : news.length === 0 ? (
                <div className="text-secondary text-center py-16 text-sm">
                  暫無相關即時新聞，請點擊右上角重新整理或切換分類
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                  {news.map((n, i) => (
                    <a
                      key={i}
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 sm:p-3.5 rounded-xl bg-[var(--bg-secondary)]/60 hover:bg-[var(--bg-tertiary)] transition-colors border border-[var(--border)] group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="font-semibold text-primary group-hover:text-accent transition-colors text-xs sm:text-sm leading-snug">
                          {n.headline}
                        </div>
                        <ExternalLink
                          size={13}
                          className="text-muted group-hover:text-accent flex-shrink-0 mt-0.5"
                        />
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-secondary">
                        <span className="font-medium text-accent/90 truncate max-w-[160px] sm:max-w-none">
                          {n.source}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent/15 text-accent font-medium">
                            {formatRelativeTime(n.datetime)}
                          </span>
                          <span className="font-mono text-muted">
                            {new Date(n.datetime).toLocaleDateString("zh-TW", {
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </Card>

            <Card title="全球市場總體觀察重點">
              <div className="flex flex-col space-y-4 p-3.5 sm:p-4 text-xs text-secondary bg-[var(--bg-tertiary)] rounded-xl leading-relaxed">
                <div>
                  <div className="font-bold text-primary mb-1 flex items-center gap-1.5 text-sm">
                    <Sparkles size={14} className="text-accent" />
                    <span>美股與全球科技總經趨勢</span>
                  </div>
                  <p>
                    大型雲端服務商（CSP）AI 資本支出與半導體先進製程拉貨動能持續支撐科技板塊，市場聚焦聯準會利率路徑、非農就業與通膨數據對美債殖利率之影響。
                  </p>
                </div>
                <div className="border-t border-[var(--border)] pt-3">
                  <div className="font-bold text-primary mb-1 flex items-center gap-1.5 text-sm">
                    <DollarSign size={14} className="text-accent" />
                    <span>台股加權與資金輪動結構</span>
                  </div>
                  <p>
                    外資期現貨籌碼與投信被動型 ETF 申購資金構成台股下檔支撐，權值電子、AI 伺服器散熱及高殖利率金控族群呈現良性輪動。
                  </p>
                </div>
                <div className="border-t border-[var(--border)] pt-3">
                  <div className="font-bold text-primary mb-1 text-sm">
                    <span>跨資產風險控管提醒</span>
                  </div>
                  <p>
                    留意美元指數（DXY）與新台幣匯率連動對外資買盤之影響；操作 ETF 時應觀察盤中即時折溢價幅度，避免於溢價過大時追價。
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
