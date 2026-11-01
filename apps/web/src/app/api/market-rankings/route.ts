import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RankedStockItem {
  symbol: string;
  name: string;
  market: "TWSE" | "TPEx";
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  volume_lots: number;
  turnover_b: number;
  date: string;
  stale: boolean;
}

let cachedData: {
  ts: number;
  twseAll: RankedStockItem[];
  tpexAll: RankedStockItem[];
  date: string;
} | null = null;

const CACHE_TTL_MS = 60_000;

function parseNum(val: unknown): number {
  if (val == null) return 0;
  const s = String(val)
    .replace(/,/g, "")
    .replace(/\+/g, "")
    .replace(/X/gi, "")
    .replace(/除權息|除息|除權/g, "")
    .trim();
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function formatRocDate(raw: unknown): string {
  const s = String(raw || "").trim();
  // e.g. "1151030" -> 2026-10-30
  if (/^\d{7}$/.test(s)) {
    const rocYear = parseInt(s.slice(0, 3), 10);
    const yyyy = rocYear + 1911;
    const mm = s.slice(3, 5);
    const dd = s.slice(5, 7);
    return `${yyyy}-${mm}-${dd}`;
  }
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
}

async function fetchTwseAll(): Promise<RankedStockItem[]> {
  const res = await fetch(
    "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return [];
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];

  const items: RankedStockItem[] = [];
  for (const row of rows) {
    const code = String(row?.Code || "").trim();
    // 僅納入上市 4 碼普通股 (1000~9999)，排除權證與 00 開頭 ETF
    if (!/^[1-9]\d{3}$/.test(code)) continue;

    const price = parseNum(row?.ClosingPrice);
    const volShares = Math.round(parseNum(row?.TradeVolume));
    const valNtd = parseNum(row?.TradeValue);
    const chg = parseNum(row?.Change);
    if (price <= 0 || volShares <= 0) continue;

    const prev = price - chg;
    const chgPct = prev > 0 ? Number(((chg / prev) * 100).toFixed(2)) : 0;
    const dateStr = formatRocDate(row?.Date);

    items.push({
      symbol: code,
      name: String(row?.Name || code).trim(),
      market: "TWSE",
      price,
      change: chg,
      change_pct: chgPct,
      volume: volShares,
      volume_lots: Math.round(volShares / 1000),
      turnover_b: Number((valNtd / 1e8).toFixed(2)),
      date: dateStr,
      stale: false,
    });
  }
  return items;
}

async function fetchTpexAll(): Promise<RankedStockItem[]> {
  const res = await fetch(
    "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return [];
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];

  const items: RankedStockItem[] = [];
  for (const row of rows) {
    const code = String(row?.SecuritiesCompanyCode || "").trim();
    // 僅納入上櫃 4 碼普通股 (1000~9999)，排除權證與債券 ETF
    if (!/^[1-9]\d{3}$/.test(code)) continue;

    const price = parseNum(row?.Close);
    const volShares = Math.round(parseNum(row?.TradingShares));
    const valNtd = parseNum(row?.TransactionAmount);
    const chg = parseNum(row?.Change);
    if (price <= 0 || volShares <= 0) continue;

    const prev = price - chg;
    const chgPct = prev > 0 ? Number(((chg / prev) * 100).toFixed(2)) : 0;
    const dateStr = formatRocDate(row?.Date);

    items.push({
      symbol: code,
      name: String(row?.CompanyName || code).trim(),
      market: "TPEx",
      price,
      change: chg,
      change_pct: chgPct,
      volume: volShares,
      volume_lots: Math.round(volShares / 1000),
      turnover_b: Number((valNtd / 1e8).toFixed(2)),
      date: dateStr,
      stale: false,
    });
  }
  return items;
}

function sortRankings(
  list: RankedStockItem[],
  sortBy: string,
  limit: number
): RankedStockItem[] {
  const copy = [...list];
  if (sortBy === "turnover") {
    copy.sort((a, b) => b.turnover_b - a.turnover_b || b.volume - a.volume);
  } else if (sortBy === "gainers") {
    copy.sort((a, b) => b.change_pct - a.change_pct || b.volume - a.volume);
  } else {
    copy.sort((a, b) => b.volume - a.volume || b.turnover_b - a.turnover_b);
  }
  return copy.slice(0, limit);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 16)));
  const sortBy = searchParams.get("sort_by") || "volume";

  const now = Date.now();
  if (!cachedData || now - cachedData.ts > CACHE_TTL_MS || cachedData.twseAll.length === 0) {
    const [twseRes, tpexRes] = await Promise.allSettled([
      fetchTwseAll(),
      fetchTpexAll(),
    ]);
    const twseAll = twseRes.status === "fulfilled" ? twseRes.value : [];
    const tpexAll = tpexRes.status === "fulfilled" ? tpexRes.value : [];
    if (twseAll.length > 0 || tpexAll.length > 0) {
      cachedData = {
        ts: now,
        twseAll,
        tpexAll,
        date: twseAll[0]?.date || tpexAll[0]?.date || "",
      };
    }
  }

  const twse = sortRankings(cachedData?.twseAll || [], sortBy, limit);
  const tpex = sortRankings(cachedData?.tpexAll || [], sortBy, limit);

  return NextResponse.json({
    twse,
    tpex,
    date: cachedData?.date || "",
  });
}
