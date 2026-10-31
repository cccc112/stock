"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { ExternalLink } from "lucide-react";

export default function NewsSection({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.data) && json.data.length > 0) {
            setNews(json.data);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to backend API below
      }

      try {
        const res = await api.get(`/stocks/${symbol}/news`);
        const items = res.data?.data || res.data || [];
        setNews(Array.isArray(items) ? items : []);
      } catch (e) {
        console.error("Failed to fetch news", e);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [symbol]);

  const formatDate = (dateStr: any) => {
    if (!dateStr) return "剛剛";
    const d = new Date(dateStr);
    const time = d.getTime();
    if (isNaN(time)) return String(dateStr);
    const diffMin = Math.floor((Date.now() - time) / 60000);
    if (diffMin < 2) return "剛剛";
    if (diffMin < 60) return `${diffMin} 分鐘前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} 小時前`;
    return d.toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <LoadingSkeleton variant="text" />
        <LoadingSkeleton variant="text" />
        <LoadingSkeleton variant="text" />
      </div>
    );
  }

  if (!news || news.length === 0) {
    return <div className="p-6 text-center text-secondary">尚無相關新聞</div>;
  }

  return (
    <div className="space-y-3 pt-2 max-h-[580px] overflow-y-auto pr-1">
      {news.slice(0, 30).map((item, i) => {
        const rawLink: string = typeof item.link === "string" ? item.link : "";
        const searchLink =
          rawLink.startsWith("http") && !rawLink.includes("tw.stock.yahoo.com/news/redirect")
            ? rawLink
            : `https://news.google.com/search?q=${encodeURIComponent(item.title)}`;

        return (
          <a
            key={i}
            href={searchLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3.5 sm:p-4 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 border border-transparent hover:border-accent/50 transition-all group"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2.5 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-primary group-hover:text-accent transition-colors mb-1.5 leading-snug">
                  {item.title}
                </h3>
                <div className="text-xs text-secondary flex flex-wrap gap-3">
                  <span className="text-accent/90 font-medium">{item.source || "即時快訊"}</span>
                  <span>{formatDate(item.date)}</span>
                </div>
              </div>
              <div className="self-start flex items-center gap-1 text-accent text-xs font-medium whitespace-nowrap opacity-80 group-hover:opacity-100 transition-opacity bg-accent/10 px-2.5 py-1 rounded">
                閱讀新聞 <ExternalLink size={13} />
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
