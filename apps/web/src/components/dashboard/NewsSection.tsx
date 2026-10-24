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
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? String(dateStr)
      : d.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
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
            className="block p-4 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 border border-transparent hover:border-accent/50 transition-all group"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-primary group-hover:text-accent transition-colors mb-2 leading-snug">
                  {item.title}
                </h3>
                <div className="text-xs text-secondary flex gap-3">
                  <span className="text-accent/90 font-medium">{item.source || "即時快訊"}</span>
                  <span>{formatDate(item.date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-accent text-xs font-medium whitespace-nowrap opacity-80 group-hover:opacity-100 transition-opacity bg-accent/10 px-2.5 py-1.5 rounded">
                閱讀新聞 <ExternalLink size={14} />
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
