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
        setNews(res.data.data || res.data || []);
      } catch (e) {
        console.error("Failed to fetch news", e);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, [symbol]);

  if (loading) return <div className="p-4 space-y-4"><LoadingSkeleton variant="text" /><LoadingSkeleton variant="text" /></div>;
  if (!news || news.length === 0) return <div className="p-6 text-center text-secondary">尚無相關新聞</div>;

  return (
    <div className="space-y-4 pt-4">
      {news.slice(0, 10).map((item, i) => (
        <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 border border-transparent hover:border-accent/50 transition-all group">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="font-semibold text-primary group-hover:text-accent transition-colors mb-1">{item.title}</h3>
              <div className="text-xs text-secondary flex gap-3">
                <span>{item.source}</span>
                <span>{new Date(item.date).toLocaleDateString()}</span>
              </div>
            </div>
            <ExternalLink size={16} className="text-secondary group-hover:text-accent flex-shrink-0" />
          </div>
        </a>
      ))}
    </div>
  );
}
