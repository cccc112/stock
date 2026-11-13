import { NextRequest, NextResponse } from "next/server";
import { resolveChannelAccessToken } from "@/app/api/line/push/route";
import {
  createHotAndHoldingsDailyFlex,
  type HoldingLineItem,
  type HotRankLineItem,
} from "@/lib/line/flexCards";
import { getTwMarketPhase } from "@/lib/marketHours";
import { fetchStockNewsQuery } from "@/lib/stockNews";
import {
  enrichAllWithRealtimeTwse,
  getCachedTwMarketData,
  getRealtimeMarketRankings,
  type RankedStockItem,
} from "@/lib/twRankings";

export const dynamic = "force-dynamic";

interface IncomingHolding {
  symbol: string;
  name?: string;
  shares?: number;
  avg_price?: number;
  current_price?: number;
  pnl_pct?: number;
  source?: string;
}

async function fetchYahooSingleQuote(symbol: string): Promise<{
  price: number;
  changePct: number;
  name?: string;
} | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?range=1d&interval=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    const prev = Number(meta?.chartPreviousClose) || price;
    if (!(price > 0)) return null;
    const changePct = prev > 0 ? Number((((price - prev) / prev) * 100).toFixed(2)) : 0;
    return {
      price,
      changePct,
      name: meta?.shortName || meta?.symbol,
    };
  } catch {
    return null;
  }
}

async function enrichHoldings(rawHoldings: IncomingHolding[]): Promise<HoldingLineItem[]> {
  if (!Array.isArray(rawHoldings) || rawHoldings.length === 0) return [];

  const uniqueMap = new Map<string, IncomingHolding>();
  for (const h of rawHoldings) {
    const sym = String(h?.symbol || "").trim().toUpperCase();
    const shares = Number(h?.shares ?? 0);
    if (!sym || shares <= 0) continue;
    if (!uniqueMap.has(sym)) uniqueMap.set(sym, { ...h, symbol: sym, shares });
  }
  const list = Array.from(uniqueMap.values()).slice(0, 10);
  if (list.length === 0) return [];

  const twCodes = list.filter((h) => /^\d{4,6}[A-Z]?$/i.test(h.symbol));
  const nonTwList = list.filter((h) => !/^\d{4,6}[A-Z]?$/i.test(h.symbol));

  const twLiveMap = new Map<string, RankedStockItem>();
  if (twCodes.length > 0) {
    const marketCache = await getCachedTwMarketData().catch(() => null);
    const knownByCode = new Map<string, RankedStockItem>();
    const tpexSet = new Set<string>();
    for (const s of marketCache?.twseAll || []) knownByCode.set(s.symbol, s);
    for (const s of marketCache?.tpexAll || []) {
      knownByCode.set(s.symbol, s);
      tpexSet.add(s.symbol);
    }

    const candidates: RankedStockItem[] = twCodes.map((h) => {
      const found = knownByCode.get(h.symbol);
      if (found) return found;
      return {
        symbol: h.symbol,
        name: h.name || h.symbol,
        market: "TWSE",
        price: Number(h.current_price || h.avg_price || 0),
        change: 0,
        change_pct: 0,
        volume: 0,
        volume_lots: 0,
        turnover_b: 0,
        date: "",
        stale: false,
        is_etf: h.symbol.startsWith("00"),
      };
    });

    const enriched = await enrichAllWithRealtimeTwse(candidates, tpexSet);
    for (const [k, v] of enriched.entries()) twLiveMap.set(k, v);
  }

  const nonTwLiveMap = new Map<string, { price: number; changePct: number; name?: string }>();
  if (nonTwList.length > 0) {
    await Promise.allSettled(
      nonTwList.map(async (h) => {
        const q = await fetchYahooSingleQuote(h.symbol);
        if (q) nonTwLiveMap.set(h.symbol, q);
      })
    );
  }

  return list.map((h) => {
    const tw = twLiveMap.get(h.symbol);
    const nonTw = nonTwLiveMap.get(h.symbol);
    const livePrice = tw?.price || nonTw?.price || Number(h.current_price || 0);
    const changePct = tw ? tw.change_pct : nonTw ? nonTw.changePct : 0;
    const avgPrice = Number(h.avg_price || 0);
    const pnlPct =
      avgPrice > 0 && livePrice > 0
        ? Number((((livePrice - avgPrice) / avgPrice) * 100).toFixed(2))
        : typeof h.pnl_pct === "number"
        ? h.pnl_pct
        : undefined;

    return {
      symbol: h.symbol,
      name: tw?.name || h.name || nonTw?.name || h.symbol,
      shares: Number(h.shares || 0),
      price: livePrice,
      changePct,
      pnlPct,
      source: h.source,
    };
  });
}

async function runAutoNotify(holdingsInput?: IncomingHolding[]) {
  const tokenRes = await resolveChannelAccessToken();
  if (!tokenRes.token) {
    return NextResponse.json(
      {
        success: false,
        error: tokenRes.diagnostic || "LINE Token 未配置，無法執行自動主動通報",
      },
      { status: 400 }
    );
  }

  // 1. 取得當日即時熱門排行榜（上市+上櫃成交量前 10 大）與同步庫存
  const [rankings, enrichedHoldings] = await Promise.all([
    getRealtimeMarketRankings({ limit: 10, sortBy: "volume" }),
    enrichHoldings(holdingsInput || []),
  ]);

  const combinedHot = [...(rankings.twse || []), ...(rankings.tpex || [])]
    .filter((s) => s.price > 0)
    .sort(
      (a, b) =>
        (b.volume_lots || 0) - (a.volume_lots || 0) ||
        (b.turnover_b || 0) - (a.turnover_b || 0)
    );

  // 去重取嚴格前 10 檔
  const seenHot = new Set<string>();
  const hotTop10: HotRankLineItem[] = [];
  for (const s of combinedHot) {
    if (seenHot.has(s.symbol)) continue;
    seenHot.add(s.symbol);
    hotTop10.push({
      rank: hotTop10.length + 1,
      symbol: s.symbol,
      name: s.name,
      price: s.price,
      changePct: s.change_pct,
      volumeLots: s.volume_lots,
    });
    if (hotTop10.length >= 10) break;
  }

  if (hotTop10.length === 0) {
    return NextResponse.json(
      { success: false, error: "目前無法取得當日熱門 10 檔行情資料" },
      { status: 500 }
    );
  }

  // 2. 抓取「當天熱門 10 檔」與「使用者庫存持股」最新新聞快訊
  const hotQuery = hotTop10
    .slice(0, 3)
    .map((s) => `${s.name} ${s.symbol}`)
    .join(" OR ");
  const holdingQuery =
    enrichedHoldings.length > 0
      ? enrichedHoldings
          .slice(0, 4)
          .map((h) => `${h.name} ${h.symbol}`)
          .join(" OR ")
      : "";

  const [hotNews, holdingNews] = await Promise.all([
    fetchStockNewsQuery(hotQuery, 3),
    holdingQuery ? fetchStockNewsQuery(holdingQuery, 3) : Promise.resolve([]),
  ]);

  const phase = getTwMarketPhase();
  const flexMsg = createHotAndHoldingsDailyFlex({
    date: rankings.date || phase.clock.dateStr,
    timeLabel: phase.clock.formattedTime.slice(0, 5),
    marketStatusLabel: phase.label,
    hotTop10,
    hotNews,
    holdings: enrichedHoldings,
    holdingNews,
  });

  const lineRes = await fetch("https://api.line.me/v2/bot/message/broadcast", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenRes.token}`,
    },
    body: JSON.stringify({ messages: [flexMsg] }),
  });

  if (!lineRes.ok) {
    const errData = await lineRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        success: false,
        error: errData.message || `LINE Broadcast 失敗 (${lineRes.status})`,
      },
      { status: lineRes.status }
    );
  }

  const top1 = hotTop10[0];
  const triggerName = `當日熱門10檔 + 庫存(${enrichedHoldings.length}檔)消息`;

  return NextResponse.json({
    success: true,
    mode: "hot10_and_holdings",
    notifiedAt: new Date().toISOString(),
    date: rankings.date || phase.clock.dateStr,
    target: {
      symbol: top1.symbol,
      name: top1.name,
      price: top1.price,
      changePct: top1.changePct,
      volumeLots: top1.volumeLots,
    },
    hotTop10,
    holdings: enrichedHoldings,
    hotNewsCount: hotNews.length,
    holdingNewsCount: holdingNews.length,
    triggerName,
  });
}

export async function GET() {
  return runAutoNotify();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const holdings = Array.isArray(body?.holdings) ? body.holdings : [];
  return runAutoNotify(holdings);
}
