"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  { id: "SOX", symbol: "^SOX", name: "費城半導體", market: "US" as const },
  { id: "BTC", symbol: "BTC-USD", name: "比特幣 (BTC)", market: "US" as const },
  { id: "GOLD", symbol: "GC=F", name: "黃金期貨 (Gold)", market: "US" as const },
  { id: "USDTWD", symbol: "TWD=X", name: "美元/台幣 (USD/TWD)", market: "US" as const },
  { id: "US10Y", symbol: "^TNX", name: "美債10年殖利率", market: "US" as const },
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((idx) => (
        <Link key={idx.id} href={`/stock/${encodeURIComponent(idx.symbol)}`} className="block group">
          <Card className="group-hover:border-accent/50 transition-colors h-full">
            <div className="flex flex-col gap-1.5">
              <div className="text-secondary text-xs font-medium tracking-wide flex justify-between items-center">
                <span>{idx.name}</span>
                <span className="font-mono text-[10px] text-muted">{idx.symbol.replace("^", "")}</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-primary">
                {idx.price > 0 ? formatNumber(idx.price, idx.price < 100 ? 2 : 1) : "—"}
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
        </Link>
      ))}
    </div>
  );
}
