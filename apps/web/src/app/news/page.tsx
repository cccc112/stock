"use client";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { Newspaper, Search, RefreshCw, Sparkles, Globe, DollarSign } from "lucide-react";
import { apiStocks } from "@/lib/api";

const PRESET_TOPICS = [
  { id: "tw", label: "台股焦點", symbols: ["2330", "2317", "2454", "3231", "2603"] },
  { id: "us", label: "美股與全球科技", symbols: ["NVDA", "AAPL", "TSLA", "MSFT", "GOOGL"] },
  { id: "etf", label: "ETF 與總體經濟", symbols: ["0050", "00878", "00919", "SPY", "QQQ"] },
];

export default function NewsPage() {
  const [topic, setTopic] = useState<string>("tw");
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchSymbol, setSearchSymbol] = useState("");
  const [activeSymbol, setActiveSymbol] = useState("2330");

  const fetchNews = async (sym: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await apiStocks.getNews(sym);
      const items = res.data?.data || res.data || [];
      if (Array.isArray(items) && items.length > 0) {
        setNews(
          items.slice(0, 25).map((item: any) => ({
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
      console.warn("Backend news fetch failed:", err);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const defaultSym = PRESET_TOPICS.find((t) => t.id === topic)?.symbols[0] || "2330";
    setActiveSymbol(defaultSym);
    fetchNews(defaultSym);
  }, [topic]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchSymbol.trim().toUpperCase();
    if (q) {
      setActiveSymbol(q);
      fetchNews(q);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">即時財經新聞與全球動態</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium flex items-center gap-1">
              <Globe size={12} /> 同步台股 FinMind 與美股 Yahoo Finance / Google 財經
            </span>
          </div>
          <p className="text-secondary text-sm">
            全市場上市櫃個股、美股科技巨頭與各大主流 ETF 即時重大新聞即時抓取
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative w-48 sm:w-60">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchSymbol}
              onChange={(e) => setSearchSymbol(e.target.value)}
              placeholder="搜尋標的新聞 (例: NVDA, 2330)"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg py-1.5 pl-8 pr-3 text-xs text-primary focus:outline-none focus:border-accent font-mono uppercase"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            查詢新聞
          </button>
        </form>
      </header>

      {/* 市場切換分類 */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 flex-wrap gap-2">
        <div className="flex gap-2">
          {PRESET_TOPICS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTopic(t.id);
                setSearchSymbol("");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                topic === t.id
                  ? "bg-accent text-white shadow-sm"
                  : "bg-[var(--bg-secondary)] text-secondary hover:text-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted flex-wrap">
          <span>快捷標的：</span>
          {(PRESET_TOPICS.find((t) => t.id === topic)?.symbols || []).map((sym) => (
            <button
              key={sym}
              onClick={() => {
                setActiveSymbol(sym);
                fetchNews(sym);
              }}
              className={`px-2 py-0.5 rounded font-mono text-xs cursor-pointer transition-colors ${
                activeSymbol === sym
                  ? "bg-accent/20 text-accent font-bold border border-accent/40"
                  : "bg-[var(--bg-tertiary)] text-secondary hover:text-primary"
              }`}
            >
              {sym}
            </button>
          ))}
          <button
            onClick={() => fetchNews(activeSymbol)}
            className="p-1 rounded text-secondary hover:text-primary transition-colors ml-1 cursor-pointer"
            title="刷新新聞"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-accent" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          title={
            <div className="flex items-center gap-2">
              <Newspaper size={18} className="text-accent" />
              <span>{activeSymbol} 最新即時新聞 ({news.length} 則)</span>
            </div>
          }
          className="md:col-span-2"
        >
          {loading ? (
            <div className="flex flex-col space-y-4 text-center items-center py-16 text-secondary animate-pulse">
              載入最新即時新聞中...
            </div>
          ) : news.length === 0 ? (
            <div className="text-secondary text-center py-16 text-sm">
              暫無 {activeSymbol} 最新即時新聞，可嘗試上方切換其他標的
            </div>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {news.map((n, i) => (
                <a
                  key={i}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3.5 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors border border-[var(--border)] group"
                >
                  <div className="font-semibold text-primary group-hover:text-accent transition-colors mb-1.5 text-sm leading-snug">
                    {n.headline}
                  </div>
                  <div className="flex justify-between items-center text-xs text-secondary">
                    <span className="font-medium text-accent/80">{n.source}</span>
                    <span className="font-mono">
                      {new Date(n.datetime).toLocaleDateString("zh-TW", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card title="全球市場 AI 每日情報摘要">
          <div className="flex flex-col space-y-4 p-4 text-xs text-secondary bg-[var(--bg-tertiary)] rounded-xl leading-relaxed">
            <div>
              <div className="font-bold text-primary mb-1 flex items-center gap-1.5 text-sm">
                <Sparkles size={14} className="text-accent" />
                <span>美股與科技 AI 趨勢</span>
              </div>
              <p>
                輝達(NVDA)與大型 CSP 雲端資本支出持續攀升，AI 晶片需求帶動那斯達克維持多頭排列，需關注聯準會貨幣政策會議與利率預期定價。
              </p>
            </div>
            <div className="border-t border-[var(--border)] pt-3">
              <div className="font-bold text-primary mb-1 flex items-center gap-1.5 text-sm">
                <DollarSign size={14} className="text-accent" />
                <span>台股權值與 ETF 資金動向</span>
              </div>
              <p>
                外資與投信在半導體供應鏈、高股息 ETF 與先進封裝族群維持高持股水位，高殖利率與成分股換股動態成為資金避風港。
              </p>
            </div>
            <div className="border-t border-[var(--border)] pt-3">
              <div className="font-bold text-primary mb-1 text-sm">
                <span>操作建議與避險觀察</span>
              </div>
              <p>
                短線乖離率過高時宜逢高分批調節，留意美債殖利率(^TNX)與美元指數(DXY)波動，避免在 ETF 溢價超過 1% 時過度追高。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
