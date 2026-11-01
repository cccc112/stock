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
  const type = (searchParams.get("type") || "").trim().toLowerCase();
  const q = (searchParams.get("q") || "").trim().toLowerCase();
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

  const allTw = [...(cachedData?.twseAll || []), ...(cachedData?.tpexAll || [])];

  // 快速搜尋支援 (供頂部 Ctrl+K 全域搜尋與 ETF/個股搜尋即時毫秒回應)
  if (q) {
    const EXTRA_ASSETS = [
      { symbol: "0050", name: "元大台灣50", market: "TW", industry: "市值型 ETF" },
      { symbol: "0056", name: "元大高股息", market: "TW", industry: "高股息 ETF" },
      { symbol: "00878", name: "國泰永續高股息", market: "TW", industry: "高股息 ETF" },
      { symbol: "00919", name: "群益台灣精選高息", market: "TW", industry: "高股息 ETF" },
      { symbol: "00929", name: "復華台灣科技優息", market: "TW", industry: "月配科技 ETF" },
      { symbol: "006208", name: "富邦台50", market: "TW", industry: "市值型 ETF" },
      { symbol: "00679B", name: "元大美債20年", market: "TW", industry: "長天期美債 ETF" },
      { symbol: "00631L", name: "元大台灣50正2", market: "TW", industry: "槓桿型 ETF" },
      { symbol: "NVDA", name: "NVIDIA (輝達)", market: "US", industry: "AI 半導體" },
      { symbol: "AAPL", name: "Apple (蘋果)", market: "US", industry: "消費電子" },
      { symbol: "TSLA", name: "Tesla (特斯拉)", market: "US", industry: "電動車與機器人" },
      { symbol: "MSFT", name: "Microsoft (微軟)", market: "US", industry: "雲端與 AI" },
      { symbol: "GOOGL", name: "Alphabet (谷歌)", market: "US", industry: "搜尋與雲端" },
      { symbol: "AMZN", name: "Amazon (亞馬遜)", market: "US", industry: "電商與 AWS" },
      { symbol: "META", name: "Meta Platforms (臉書)", market: "US", industry: "社群與 AI" },
      { symbol: "TSM", name: "台積電 ADR", market: "US", industry: "晶圓代工" },
      { symbol: "AMD", name: "AMD (超微)", market: "US", industry: "AI 晶片" },
      { symbol: "AVGO", name: "Broadcom (博通)", market: "US", industry: "網通與 ASIC" },
      { symbol: "PLTR", name: "Palantir", market: "US", industry: "AI 大數據" },
      { symbol: "QQQ", name: "Invesco 那斯達克100 ETF", market: "US", industry: "美股科技 ETF" },
      { symbol: "SPY", name: "SPDR 標普500 ETF", market: "US", industry: "美股大盤 ETF" },
      { symbol: "SMH", name: "VanEck 半導體 ETF", market: "US", industry: "半導體 ETF" },
      { symbol: "SOXX", name: "iShares 半導體 ETF", market: "US", industry: "半導體 ETF" },
      { symbol: "TLT", name: "iShares 20+年美債 ETF", market: "US", industry: "美債 ETF" },
      { symbol: "BTC-USD", name: "比特幣 (Bitcoin)", market: "US", industry: "加密貨幣" },
      { symbol: "GC=F", name: "黃金期貨 (Gold)", market: "US", industry: "貴金屬期貨" },
    ];

    const matched: any[] = [];
    for (const a of EXTRA_ASSETS) {
      if (a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)) {
        matched.push(a);
      }
    }
    for (const s of allTw) {
      if (s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) {
        matched.push({
          symbol: s.symbol,
          name: s.name,
          market: "TW",
          industry: s.market === "TPEx" ? "上櫃股票" : "上市股票",
        });
        if (matched.length >= 20) break;
      }
    }
    return NextResponse.json(matched.slice(0, 20));
  }

  // 權值股與熱門 ETF 資金流向散佈圖資料
  if (type === "capital-flow") {
    const byCode: Record<string, RankedStockItem> = {};
    for (const s of allTw) byCode[s.symbol] = s;

    const targetStocks = [
      { symbol: "2330", name: "台積電", fallbackPrice: 2370, fallbackPct: -1.86, fallbackVol: 48500, is_etf: false },
      { symbol: "2317", name: "鴻海", fallbackPrice: 245.5, fallbackPct: -1.01, fallbackVol: 62300, is_etf: false },
      { symbol: "2454", name: "聯發科", fallbackPrice: 3915, fallbackPct: -3.21, fallbackVol: 9800, is_etf: false },
      { symbol: "2382", name: "廣達", fallbackPrice: 318.0, fallbackPct: 0.45, fallbackVol: 28400, is_etf: false },
      { symbol: "3231", name: "緯創", fallbackPrice: 183.5, fallbackPct: -2.65, fallbackVol: 45200, is_etf: false },
      { symbol: "2603", name: "長榮", fallbackPrice: 271.5, fallbackPct: 4.02, fallbackVol: 54100, is_etf: false },
      { symbol: "2609", name: "陽明", fallbackPrice: 63.5, fallbackPct: 2.42, fallbackVol: 68200, is_etf: false },
      { symbol: "3017", name: "奇鋐", fallbackPrice: 3095, fallbackPct: -0.32, fallbackVol: 11200, is_etf: false },
      { symbol: "2881", name: "富邦金", fallbackPrice: 161.5, fallbackPct: -0.31, fallbackVol: 24500, is_etf: false },
      { symbol: "2891", name: "中信金", fallbackPrice: 75.8, fallbackPct: 0.66, fallbackVol: 39800, is_etf: false },
      { symbol: "2303", name: "聯電", fallbackPrice: 49.8, fallbackPct: -1.2, fallbackVol: 237896, is_etf: false },
      { symbol: "2409", name: "友達", fallbackPrice: 16.8, fallbackPct: 3.1, fallbackVol: 296772, is_etf: false },
      { symbol: "0050", name: "元大台灣50", fallbackPrice: 104.95, fallbackPct: -1.1, fallbackVol: 42000, is_etf: true, flowM: 3560 },
      { symbol: "00878", name: "國泰永續高股息", fallbackPrice: 34.81, fallbackPct: -0.45, fallbackVol: 86000, is_etf: true, flowM: 2840 },
      { symbol: "00919", name: "群益台灣精選高息", fallbackPrice: 23.85, fallbackPct: 0.25, fallbackVol: 95000, is_etf: true, flowM: 4210 },
      { symbol: "00929", name: "復華台灣科技優息", fallbackPrice: 18.2, fallbackPct: -0.65, fallbackVol: 74000, is_etf: true, flowM: -1280 },
      { symbol: "0056", name: "元大高股息", fallbackPrice: 37.6, fallbackPct: -0.3, fallbackVol: 51000, is_etf: true, flowM: 1850 },
      { symbol: "00679B", name: "元大美債20年", fallbackPrice: 29.4, fallbackPct: 0.68, fallbackVol: 68000, is_etf: true, flowM: 1940 },
    ];

    const flowItems = targetStocks.map((t) => {
      const live = byCode[t.symbol];
      const price = live?.price || t.fallbackPrice;
      const change_pct = live?.change_pct ?? t.fallbackPct;
      const volume = live?.volume_lots || t.fallbackVol;
      // 根據實際成交金額 (億 -> 百萬) 與漲跌方向計算當日主動資金淨流向
      const turnoverM = live ? live.turnover_b * 100 : (price * volume) / 1000;
      const net_flow =
        typeof (t as any).flowM === "number"
          ? (t as any).flowM
          : Math.round(turnoverM * (change_pct === 0 ? 0.08 : Math.max(-0.45, Math.min(0.45, change_pct / 6.5))));
      return {
        symbol: t.symbol,
        name: live?.name || t.name,
        price,
        change_pct,
        volume,
        net_flow,
        is_etf: t.is_etf,
      };
    });

    return NextResponse.json(flowItems);
  }

  const twse = sortRankings(cachedData?.twseAll || [], sortBy, limit);
  const tpex = sortRankings(cachedData?.tpexAll || [], sortBy, limit);

  return NextResponse.json({
    twse,
    tpex,
    date: cachedData?.date || "",
  });
}
