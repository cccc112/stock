"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatNumber } from "@/lib/utils";
import { apiStocks } from "@/lib/api";

interface IndexCard {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  market: "TW" | "US";
}

const INDEX_LIST = [
  { id: "TWII", symbol: "^TWII", name: "台股加權", market: "TW" as const },
  { id: "SPX",  symbol: "^GSPC", name: "S&P 500",  market: "US" as const },
  { id: "NDX",  symbol: "^IXIC", name: "Nasdaq",    market: "US" as const },
  { id: "2330", symbol: "2330.TW", name: "台積電",  market: "TW" as const },
];

// Fallback static data for when market is closed or API unavailable
const FALLBACK: Record<string, Partial<IndexCard>> = {
  "^TWII":  { price: 0, change: 0, change_pct: 0 },
  "^GSPC":  { price: 0, change: 0, change_pct: 0 },
  "^IXIC":  { price: 0, change: 0, change_pct: 0 },
  "2330.TW":{ price: 0, change: 0, change_pct: 0 },
};

export default function MarketOverview() {
  const [cards, setCards] = useState<IndexCard[]>(
    INDEX_LIST.map(i => ({ ...i, price: 0, change: 0, change_pct: 0 }))
  );

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.allSettled(
        INDEX_LIST.map(idx =>
          apiStocks.getQuote(idx.symbol).then(r => ({ idx, data: r.data }))
        )
      );

      setCards(prev =>
        prev.map((card, i) => {
          const res = results[i];
          if (res.status === "fulfilled") {
            const d = res.value.data;
            return {
              ...card,
              price: d.price ?? 0,
              change: d.change ?? 0,
              change_pct: d.change_pct ?? 0,
            };
          }
          return card;
        })
      );
    };

    fetchAll();
    const timer = setInterval(fetchAll, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
      {cards.map(idx => (
        <Card key={idx.id} className="min-w-[200px] flex-shrink-0">
          <div className="text-secondary text-sm mb-1">{idx.name}</div>
          <div className="text-xl font-bold mb-2">
            {idx.price > 0 ? formatNumber(idx.price) : "—"}
          </div>
          {idx.price > 0 ? (
            <Badge value={idx.change_pct} market={idx.market} />
          ) : (
            <span className="text-secondary text-xs">載入中...</span>
          )}
        </Card>
      ))}
    </div>
  );
}
