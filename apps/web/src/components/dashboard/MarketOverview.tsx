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
  { id: "TWII", symbol: "^TWII", name: "台股加權指數", market: "TW" as const },
  { id: "SPX", symbol: "^GSPC", name: "S&P 500", market: "US" as const },
  { id: "NDX", symbol: "^IXIC", name: "Nasdaq 綜合", market: "US" as const },
  { id: "2330", symbol: "2330.TW", name: "台積電 (2330)", market: "TW" as const },
];

export default function MarketOverview() {
  const [cards, setCards] = useState<IndexCard[]>(
    INDEX_LIST.map((i) => ({ ...i, price: 0, change: 0, change_pct: 0 }))
  );

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.allSettled(
        INDEX_LIST.map((idx) =>
          apiStocks.getQuote(idx.symbol).then((r) => ({ idx, data: r.data }))
        )
      );

      setCards((prev) =>
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((idx) => (
        <Card key={idx.id}>
          <div className="flex flex-col gap-2">
            <div className="text-secondary text-xs font-medium tracking-wide">
              {idx.name}
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-primary">
              {idx.price > 0 ? formatNumber(idx.price) : "—"}
            </div>
            <div>
              {idx.price > 0 ? (
                <Badge value={idx.change_pct} market={idx.market} size="sm">
                  {idx.change > 0 ? `+${idx.change.toFixed(2)}` : idx.change.toFixed(2)}{" "}
                  ({idx.change_pct > 0 ? `+${idx.change_pct.toFixed(2)}` : idx.change_pct.toFixed(2)}%)
                </Badge>
              ) : (
                <span className="text-muted text-xs">報價連線中...</span>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
