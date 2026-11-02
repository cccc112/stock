import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface RankedStockItem {
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
  is_etf?: boolean;
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

function isValidStockOrEtfCode(code: string): boolean {
  // 4 碼普通股 (1000~9999) 或 全市場台股 ETF (0050, 00679B, 00980A, 00982A, 00981T, 00982D, 009802 等)
  return /^[1-9]\d{3}$/.test(code) || /^00\d{2,4}[A-Z]?$/i.test(code);
}

async function fetchTwseAll(): Promise<RankedStockItem[]> {
  // 1. 優先從證交所官方主站 RWD 抓取即時收盤日報 (盤後 14:00~14:30 立即更新，避開 OpenAPI 網關快取滯後)
  try {
    const rwdRes = await fetch("https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY_ALL", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/csv,application/json,*/*",
      },
      cache: "no-store",
    });
    if (rwdRes.ok) {
      const text = await rwdRes.text();
      const lines = text.split("\n");
      const rwdItems: RankedStockItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(",").map((s) => s.replace(/^"|"$/g, "").trim());
        if (cols.length < 10) continue;
        const [rawDate, code, name, rawVol, rawVal, , , , rawClose, rawChg] = cols;
        const upperCode = code.toUpperCase();
        if (!isValidStockOrEtfCode(upperCode)) continue;

        const price = parseNum(rawClose);
        const volShares = Math.round(parseNum(rawVol));
        const valNtd = parseNum(rawVal);
        const chg = parseNum(rawChg);
        if (price <= 0) continue;

        const prev = price - chg;
        const chgPct = prev > 0 ? Number(((chg / prev) * 100).toFixed(2)) : 0;
        const dateStr = formatRocDate(rawDate);

        rwdItems.push({
          symbol: upperCode,
          name: name || upperCode,
          market: "TWSE",
          price,
          change: chg,
          change_pct: chgPct,
          volume: volShares,
          volume_lots: Math.round(volShares / 1000),
          turnover_b: Number((valNtd / 1e8).toFixed(2)),
          date: dateStr,
          stale: false,
          is_etf: upperCode.startsWith("00"),
        });
      }
      if (rwdItems.length > 0) return rwdItems;
    }
  } catch (err) {
    console.error("fetchTwseAll RWD fallback to OpenAPI:", err);
  }

  // 2. 備援：若官方 RWD 異常，降級至 OpenAPI
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
    const code = String(row?.Code || "").trim().toUpperCase();
    if (!isValidStockOrEtfCode(code)) continue;

    const price = parseNum(row?.ClosingPrice);
    const volShares = Math.round(parseNum(row?.TradeVolume));
    const valNtd = parseNum(row?.TradeValue);
    const chg = parseNum(row?.Change);
    if (price <= 0) continue;

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
      is_etf: code.startsWith("00"),
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
    const code = String(row?.SecuritiesCompanyCode || "").trim().toUpperCase();
    if (!isValidStockOrEtfCode(code)) continue;

    const price = parseNum(row?.Close);
    const volShares = Math.round(parseNum(row?.TradingShares));
    const valNtd = parseNum(row?.TransactionAmount);
    const chg = parseNum(row?.Change);
    if (price <= 0) continue;

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
      is_etf: code.startsWith("00"),
    });
  }
  return items;
}

function sortRankings(
  list: RankedStockItem[],
  sortBy: string,
  limit: number
): RankedStockItem[] {
  const copy = list.filter((x) => !x.is_etf && x.volume > 0);
  if (sortBy === "turnover") {
    copy.sort((a, b) => b.turnover_b - a.turnover_b || b.volume - a.volume);
  } else if (sortBy === "gainers") {
    copy.sort((a, b) => b.change_pct - a.change_pct || b.volume - a.volume);
  } else {
    copy.sort((a, b) => b.volume - a.volume || b.turnover_b - a.turnover_b);
  }
  return copy.slice(0, limit);
}

export async function getCachedTwMarketData() {
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
  return cachedData;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "").trim().toLowerCase();
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 16)));
  const sortBy = searchParams.get("sort_by") || "volume";

  const marketCache = await getCachedTwMarketData();
  const allTw = [...(marketCache?.twseAll || []), ...(marketCache?.tpexAll || [])];

  // 快速搜尋支援 (涵蓋全市場 1,900+ 上市櫃個股 + 全市場 362 檔主動/被動/債券 ETF + 美股與跨資產)
  if (q) {
    const EXTRA_ASSETS = [
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
      { symbol: "VOO", name: "Vanguard 標普500 ETF", market: "US", industry: "美股大盤 ETF" },
      { symbol: "SMH", name: "VanEck 半導體 ETF", market: "US", industry: "半導體 ETF" },
      { symbol: "SOXX", name: "iShares 半導體 ETF", market: "US", industry: "半導體 ETF" },
      { symbol: "TLT", name: "iShares 20+年美債 ETF", market: "US", industry: "美債 ETF" },
      { symbol: "IBIT", name: "iShares 比特幣現貨 ETF", market: "US", industry: "加密貨幣 ETF" },
      { symbol: "GLD", name: "SPDR 黃金現貨 ETF", market: "US", industry: "黃金 ETF" },
      { symbol: "BTC-USD", name: "比特幣 (Bitcoin)", market: "US", industry: "加密貨幣" },
      { symbol: "ETH-USD", name: "以太坊 (Ethereum)", market: "US", industry: "加密貨幣" },
      { symbol: "GC=F", name: "黃金期貨 (Gold)", market: "US", industry: "貴金屬期貨" },
      { symbol: "CL=F", name: "西德州原油期貨 (WTI)", market: "US", industry: "能源期貨" },
      { symbol: "TWD=X", name: "美元/台幣 (USD/TWD)", market: "US", industry: "外匯匯率" },
      { symbol: "^TWII", name: "台股加權指數", market: "TW", industry: "大盤指數" },
    ];

    const seen = new Set<string>();
    const candidates: { symbol: string; name: string; market: string; industry: string; score: number }[] = [];

    const scoreItem = (sym: string, name: string): number => {
      const sLow = sym.toLowerCase();
      const nLow = name.toLowerCase();
      if (sLow === q || nLow === q) return 0; // 完全相符永遠排第一
      if (sLow.startsWith(q)) return 1;
      if (nLow.startsWith(q)) return 2;
      if (sLow.includes(q)) return 3;
      if (nLow.includes(q)) return 4;
      return 99;
    };

    for (const s of allTw) {
      const sc = scoreItem(s.symbol, s.name);
      if (sc < 99 && !seen.has(s.symbol)) {
        seen.add(s.symbol);
        let ind = s.market === "TPEx" ? "上櫃股票" : "上市股票";
        if (s.is_etf) {
          ind = s.symbol.endsWith("A")
            ? "主動式台股 ETF"
            : s.symbol.endsWith("D")
            ? "主動式債券 ETF"
            : s.symbol.endsWith("T")
            ? "平衡型 ETF"
            : s.symbol.endsWith("B")
            ? "債券型 ETF"
            : "台股 ETF";
        }
        candidates.push({
          symbol: s.symbol,
          name: s.name,
          market: "TW",
          industry: ind,
          score: sc,
        });
      }
    }

    for (const a of EXTRA_ASSETS) {
      const sc = scoreItem(a.symbol, a.name);
      if (sc < 99 && !seen.has(a.symbol)) {
        seen.add(a.symbol);
        candidates.push({ ...a, score: sc });
      }
    }

    candidates.sort((a, b) => a.score - b.score || a.symbol.length - b.symbol.length || a.symbol.localeCompare(b.symbol));

    return NextResponse.json(
      candidates.slice(0, 25).map(({ symbol, name, market, industry }) => ({
        symbol,
        name,
        market,
        industry,
      }))
    );
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
      { symbol: "00981A", name: "主動統一台股增長", fallbackPrice: 26.66, fallbackPct: 1.15, fallbackVol: 65000, is_etf: true, flowM: 3120 },
      { symbol: "00982A", name: "主動群益台灣強棒", fallbackPrice: 20.66, fallbackPct: 0.85, fallbackVol: 33200, is_etf: true, flowM: 1680 },
      { symbol: "00679B", name: "元大美債20年", fallbackPrice: 29.4, fallbackPct: 0.68, fallbackVol: 68000, is_etf: true, flowM: 1940 },
    ];

    const flowItems = targetStocks.map((t) => {
      const live = byCode[t.symbol];
      const price = live?.price || t.fallbackPrice;
      const change_pct = live?.change_pct ?? t.fallbackPct;
      const volume = live?.volume_lots || t.fallbackVol;
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

  const twse = sortRankings(marketCache?.twseAll || [], sortBy, limit);
  const tpex = sortRankings(marketCache?.tpexAll || [], sortBy, limit);

  return NextResponse.json({
    twse,
    tpex,
    date: marketCache?.date || "",
  });
}
