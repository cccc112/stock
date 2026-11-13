import { getTaipeiClock, isTwMarketTradingHours } from "@/lib/marketHours";

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
  limit_up?: number;
  limit_down?: number;
  tv?: number;
  bid1?: number;
  ask1?: number;
  trade_time?: string;
}

let cachedMarketData: {
  ts: number;
  twseAll: RankedStockItem[];
  tpexAll: RankedStockItem[];
  date: string;
} | null = null;

// 伺服器模組級持久即時行情快照（僅在同一交易日、網路短暫超時時作為保底）
const lastKnownLiveQuotes = new Map<string, RankedStockItem>();
const yahooRankCache = new Map<string, { ts: number; items: RankedStockItem[] }>();

const MARKET_ALL_CACHE_TTL_MS = 90_000;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/json,*/*",
  "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
};

export function parseNum(val: unknown): number {
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

export function formatRocDate(raw: unknown): string {
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

export function isValidStockOrEtfCode(code: string): boolean {
  return /^[1-9]\d{3}$/.test(code) || /^00\d{2,4}[A-Z]?$/i.test(code);
}

async function fetchTwseAll(): Promise<RankedStockItem[]> {
  try {
    const rwdRes = await fetch("https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY_ALL", {
      headers: {
        ...BROWSER_HEADERS,
        Accept: "text/csv,application/json,*/*",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
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
          name,
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
      if (rwdItems.length > 500) {
        return rwdItems;
      }
    }
  } catch {
    // Fallback to OpenAPI below
  }

  try {
    const res = await fetch("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", {
      headers: BROWSER_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });
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
  } catch {
    return [];
  }
}

function getRecentTaipeiSlashDates(daysBack = 5): string[] {
  const tw = getTaipeiClock();
  const baseUtc = Date.UTC(Number(tw.year), Number(tw.month) - 1, Number(tw.day));
  const out: string[] = [];
  for (let offset = 0; offset < daysBack; offset++) {
    const d = new Date(baseUtc - offset * 86_400_000);
    const dayOfWeek = d.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    out.push(`${yyyy}/${mm}/${dd}`);
  }
  return out;
}

async function fetchTpexAll(): Promise<RankedStockItem[]> {
  // 1. 優先抓櫃買中心官網 RWD JSON（速度快且包含當日全市場千檔上櫃股與 ETF）
  const dates = getRecentTaipeiSlashDates(5);
  for (const dStr of dates) {
    try {
      const res = await fetch(
        `https://www.tpex.org.tw/www/zh-tw/afterTrading/otc?date=${encodeURIComponent(dStr)}&type=EW&response=json`,
        {
          headers: BROWSER_HEADERS,
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        }
      );
      if (!res.ok) continue;
      const json = await res.json();
      const rows = json?.tables?.[0]?.data;
      if (!Array.isArray(rows) || rows.length < 100) continue;

      const resolvedDate = formatRocDate(json?.date || dStr.replace(/\//g, ""));
      const items: RankedStockItem[] = [];
      for (const row of rows) {
        if (!Array.isArray(row) || row.length < 9) continue;
        const code = String(row[0] || "").trim().toUpperCase();
        if (!isValidStockOrEtfCode(code)) continue;

        const price = parseNum(row[2]);
        const chg = parseNum(row[3]);
        const volShares = Math.round(parseNum(row[7]));
        const valNtd = parseNum(row[8]);
        if (price <= 0) continue;

        const prev = price - chg;
        const chgPct = prev > 0 ? Number(((chg / prev) * 100).toFixed(2)) : 0;

        items.push({
          symbol: code,
          name: String(row[1] || code).trim(),
          market: "TPEx",
          price,
          change: chg,
          change_pct: chgPct,
          volume: volShares,
          volume_lots: Math.round(volShares / 1000),
          turnover_b: Number((valNtd / 1e8).toFixed(2)),
          date: resolvedDate,
          stale: false,
          is_etf: code.startsWith("00"),
        });
      }
      if (items.length > 100) {
        return items;
      }
    } catch {
      // Try earlier date
    }
  }

  // 2. 備援：TPEx OpenAPI
  try {
    const res = await fetch(
      "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes",
      {
        headers: BROWSER_HEADERS,
        cache: "no-store",
        signal: AbortSignal.timeout(4500),
      }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return [];

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
  } catch {
    return [];
  }
}

async function fetchYahooStoreList(url: string): Promise<any[]> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/root\.App\.main\s*=\s*(\{[\s\S]*?\});\s*\n/);
    if (!match) return [];

    const sanitized = match[1].replace(/:\s*undefined\b/g, ":null");
    const json = JSON.parse(sanitized);
    const tableStore = json?.context?.dispatcher?.stores?.TableStore || {};
    for (const val of Object.values(tableStore)) {
      if (val && typeof val === "object" && Array.isArray((val as any).list)) {
        return (val as any).list;
      }
    }
  } catch {
    // Fallback handled by caller
  }
  return [];
}

function mapYahooRowToRankedItem(
  row: any,
  defaultMarket: "TWSE" | "TPEx",
  todayDate: string,
  isEtfBoard = false
): RankedStockItem | null {
  const rawSym = String(row?.symbol || "").trim().toUpperCase();
  if (!rawSym) return null;
  const isTwo = rawSym.endsWith(".TWO");
  const code = rawSym.replace(/\.TWO?$/i, "");
  if (!isValidStockOrEtfCode(code)) return null;

  const price = parseNum(row?.price);
  if (price <= 0) return null;

  const chg = parseNum(row?.change);
  const chgPct = parseNum(String(row?.changePercent || "").replace(/%/g, ""));

  let volLots = 0;
  let volShares = 0;
  let turnoverB = 0;

  if (isEtfBoard) {
    volLots = Math.round(parseNum(row?.volumeK ?? row?.volK));
    volShares = volLots * 1000;
    // EtfRanking.turnover 單位為千元 -> / 100,000 = 億元
    turnoverB = Number((parseNum(row?.turnover) / 100_000).toFixed(2));
  } else {
    const rawVolShares = parseNum(row?.volume);
    if (rawVolShares > 0) {
      volShares = Math.round(rawVolShares);
      volLots = Math.round(volShares / 1000);
    } else {
      volLots = Math.round(parseNum(row?.volK));
      volShares = volLots * 1000;
    }
    turnoverB = Number((parseNum(row?.turnoverK) / 100_000).toFixed(2));
  }

  return {
    symbol: code,
    name: String(row?.symbolName || row?.name || code).trim(),
    market: isTwo ? "TPEx" : defaultMarket,
    price,
    change: chg,
    change_pct: chgPct,
    volume: volShares,
    volume_lots: volLots,
    turnover_b: turnoverB,
    date: todayDate,
    stale: false,
    is_etf: isEtfBoard || code.startsWith("00"),
  };
}

/**
 * 即時擷取 Yahoo 台股盤中/當日最新排行（支援成交量、成交金額、漲幅、跌幅、ETF）。
 */
async function fetchYahooTwRankBoard(
  board: "twse" | "tpex" | "etf",
  sortBy: string,
  tpexSymbolSet?: Set<string>
): Promise<RankedStockItem[]> {
  const normalizedSort = ["volume", "turnover", "gainers", "losers"].includes(sortBy)
    ? sortBy
    : "volume";
  const cacheKey = `${board}:${normalizedSort}`;
  const ttl = isTwMarketTradingHours(true) ? 8_000 : 35_000;
  const cached = yahooRankCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < ttl && cached.items.length > 0) {
    return cached.items;
  }

  const todayDate = getTaipeiClock().dateStr;
  let items: RankedStockItem[] = [];

  if (board === "etf") {
    if (normalizedSort === "turnover") {
      const rows = await fetchYahooStoreList("https://tw.stock.yahoo.com/tw-etf/turnover");
      items = rows
        .map((r) => mapYahooRowToRankedItem(r, "TWSE", todayDate, true))
        .filter((x): x is RankedStockItem => Boolean(x));
    } else if (normalizedSort === "gainers" || normalizedSort === "losers") {
      const slug = normalizedSort === "gainers" ? "change-up" : "change-down";
      const [etfVolRows, taiRows, twoRows] = await Promise.all([
        fetchYahooStoreList("https://tw.stock.yahoo.com/tw-etf/volume"),
        fetchYahooStoreList(`https://tw.stock.yahoo.com/rank/${slug}?exchange=TAI`),
        fetchYahooStoreList(`https://tw.stock.yahoo.com/rank/${slug}?exchange=TWO`),
      ]);
      const merged = new Map<string, RankedStockItem>();
      for (const r of etfVolRows) {
        const mapped = mapYahooRowToRankedItem(r, "TWSE", todayDate, true);
        if (mapped) merged.set(mapped.symbol, mapped);
      }
      for (const r of [...taiRows, ...twoRows]) {
        const mapped = mapYahooRowToRankedItem(r, "TWSE", todayDate, false);
        if (mapped && mapped.is_etf) {
          merged.set(mapped.symbol, mapped);
        }
      }
      items = Array.from(merged.values());
    } else {
      const rows = await fetchYahooStoreList("https://tw.stock.yahoo.com/tw-etf/volume");
      items = rows
        .map((r) => mapYahooRowToRankedItem(r, "TWSE", todayDate, true))
        .filter((x): x is RankedStockItem => Boolean(x));
    }

    if (tpexSymbolSet && tpexSymbolSet.size > 0) {
      items = items.map((it) =>
        tpexSymbolSet.has(it.symbol) ? { ...it, market: "TPEx" } : it
      );
    }
  } else {
    const ex = board === "tpex" ? "TWO" : "TAI";
    const slugMap: Record<string, string> = {
      volume: "volume",
      turnover: "turnover",
      gainers: "change-up",
      losers: "change-down",
    };
    const rows = await fetchYahooStoreList(
      `https://tw.stock.yahoo.com/rank/${slugMap[normalizedSort]}?exchange=${ex}`
    );
    items = rows
      .map((r) => mapYahooRowToRankedItem(r, board === "tpex" ? "TPEx" : "TWSE", todayDate, false))
      .filter((x): x is RankedStockItem => Boolean(x));
  }

  if (items.length > 0) {
    yahooRankCache.set(cacheKey, { ts: Date.now(), items });
  }
  return items;
}

export async function enrichAllWithRealtimeTwse(
  items: RankedStockItem[],
  tpexSymbolSet?: Set<string>
): Promise<Map<string, RankedStockItem>> {
  const resultMap = new Map<string, RankedStockItem>();
  if (!items || items.length === 0) return resultMap;

  for (const it of items) {
    const cached = lastKnownLiveQuotes.get(it.symbol);
    // 優先使用剛拉到的同一日資料；若僅在較舊快取中才讀取 cached
    resultMap.set(it.symbol, cached && cached.date > it.date ? cached : it);
  }

  const parseP = (v: any) => {
    if (!v || v === "-") return 0;
    const n = parseFloat(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const parseBestBidAsk = (raw: any) => {
    if (!raw || typeof raw !== "string") return 0;
    const first = raw.split("_")[0];
    return parseP(first);
  };

  try {
    const uniqueItems = Array.from(
      new Map(items.map((s) => [s.symbol.toUpperCase(), s])).values()
    );

    const chunkSize = 18;
    const chunks: RankedStockItem[][] = [];
    for (let i = 0; i < uniqueItems.length; i += chunkSize) {
      chunks.push(uniqueItems.slice(i, i + chunkSize));
    }

    const byCode: Record<string, any> = {};

    await Promise.allSettled(
      chunks.map(async (chunk) => {
        const exCh = chunk
          .map((s) => {
            const isOtc = s.market === "TPEx" || Boolean(tpexSymbolSet?.has(s.symbol));
            return (isOtc ? "otc_" : "tse_") + s.symbol + ".tw";
          })
          .join("|");

        const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(
          exCh
        )}&json=1&delay=0&_=${Date.now()}`;

        const res = await fetch(url, {
          headers: {
            ...BROWSER_HEADERS,
            Referer: "https://mis.twse.com.tw/stock/fibest.jsp",
          },
          cache: "no-store",
          signal: AbortSignal.timeout(4000),
        });

        if (!res.ok) return;
        const json = await res.json();
        const arr = Array.isArray(json?.msgArray) ? json.msgArray : [];
        for (const m of arr) {
          if (m?.c) byCode[String(m.c).toUpperCase()] = m;
        }
      })
    );

    for (const it of uniqueItems) {
      const live = byCode[it.symbol.toUpperCase()];
      if (!live) continue;

      const z = parseP(live.z) || parseP(live.trade?.z);
      const pz = parseP(live.pz);
      const bestBid = parseBestBidAsk(live.b);
      const bestAsk = parseBestBidAsk(live.a);
      const o = parseP(live.o);
      const y = parseP(live.y);
      const vLots = parseP(live.v);
      const tvLots = parseP(live.trade?.v) || parseP(live.tv);
      const tradeTime = String(live.trade?.t || live.t || "").trim();
      const cached = lastKnownLiveQuotes.get(it.symbol);

      const livePrice =
        z > 0
          ? z
          : pz > 0
          ? pz
          : bestBid > 0
          ? bestBid
          : bestAsk > 0
          ? bestAsk
          : o > 0
          ? o
          : cached?.price || it.price;

      const prevClose =
        y > 0 ? y : cached?.price ? cached.price - cached.change : it.price - it.change;

      let chg = it.change;
      let pct = it.change_pct;
      if (livePrice > 0 && prevClose > 0) {
        chg = Number((livePrice - prevClose).toFixed(2));
        pct = Number((((livePrice - prevClose) / prevClose) * 100).toFixed(2));
      }

      const volLots = vLots > 0 ? Math.round(vLots) : cached?.volume_lots || it.volume_lots;
      const volShares = volLots * 1000;
      const liveTurnoverB =
        it.turnover_b > 0 && Math.abs(volLots - it.volume_lots) < Math.max(50, it.volume_lots * 0.03)
          ? it.turnover_b
          : livePrice > 0 && volShares > 0
          ? Number(((livePrice * volShares) / 1e8).toFixed(2))
          : it.turnover_b;

      const resolvedDate = live.d ? formatRocDate(live.d) : it.date;
      const resolvedMarket =
        live.ex === "otc" ? "TPEx" : live.ex === "tse" ? "TWSE" : it.market;

      const enriched: RankedStockItem = {
        ...it,
        market: resolvedMarket,
        name: live.n ? String(live.n).trim() : it.name,
        price: livePrice,
        change: chg,
        change_pct: pct,
        volume_lots: volLots,
        volume: volShares,
        turnover_b: liveTurnoverB,
        date: resolvedDate,
        limit_up: parseP(live.u) || it.limit_up,
        limit_down: parseP(live.w) || it.limit_down,
        tv: tvLots > 0 ? Math.round(tvLots) : undefined,
        bid1: bestBid > 0 ? bestBid : undefined,
        ask1: bestAsk > 0 ? bestAsk : undefined,
        trade_time: tradeTime || undefined,
      };

      if (enriched.price > 0) {
        lastKnownLiveQuotes.set(it.symbol, enriched);
      }
      resultMap.set(it.symbol, enriched);
    }
  } catch (err) {
    console.warn("TWSE MIS batch quote failed, falling back to Yahoo/cache:", err);
  }

  return resultMap;
}

export function sortRankings(
  list: RankedStockItem[],
  sortBy: string,
  limit: number,
  isEtfOnly = false
): RankedStockItem[] {
  const copy = list.filter((x) => (isEtfOnly ? Boolean(x.is_etf) : !x.is_etf) && x.volume > 0);
  if (sortBy === "turnover") {
    copy.sort((a, b) => (b.turnover_b || 0) - (a.turnover_b || 0) || (b.volume || 0) - (a.volume || 0));
  } else if (sortBy === "gainers") {
    copy.sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0) || (b.volume || 0) - (a.volume || 0));
  } else if (sortBy === "losers") {
    copy.sort((a, b) => (a.change_pct || 0) - (b.change_pct || 0) || (b.volume || 0) - (a.volume || 0));
  } else {
    copy.sort((a, b) => (b.volume || 0) - (a.volume || 0) || (b.turnover_b || 0) - (a.turnover_b || 0));
  }
  return copy.slice(0, limit);
}

export async function getCachedTwMarketData() {
  const now = Date.now();
  if (
    !cachedMarketData ||
    now - cachedMarketData.ts > MARKET_ALL_CACHE_TTL_MS ||
    cachedMarketData.twseAll.length === 0
  ) {
    const [twseRes, tpexRes] = await Promise.allSettled([fetchTwseAll(), fetchTpexAll()]);
    const twseAll = twseRes.status === "fulfilled" ? twseRes.value : [];
    const tpexAll = tpexRes.status === "fulfilled" ? tpexRes.value : [];
    if (twseAll.length > 0 || tpexAll.length > 0) {
      cachedMarketData = {
        ts: now,
        twseAll,
        tpexAll,
        date: twseAll[0]?.date || tpexAll[0]?.date || getTaipeiClock().dateStr,
      };
    }
  }
  return cachedMarketData;
}

export async function getRealtimeMarketRankings(options?: {
  limit?: number;
  sortBy?: string;
}) {
  const limit = Math.min(50, Math.max(1, Number(options?.limit ?? 16)));
  const sortBy = options?.sortBy || "volume";
  const poolSize = Math.max(limit + 8, 22);

  // 先抓市場全名單（供補充、分類上市/上櫃別與 ETF 代碼對應）
  const marketCache = await getCachedTwMarketData();
  const twseAll = marketCache?.twseAll || [];
  const tpexAll = marketCache?.tpexAll || [];
  const allTw = [...twseAll, ...tpexAll];
  const tpexSymbolSet = new Set(tpexAll.map((s) => s.symbol.toUpperCase()));

  // 同時抓取 Yahoo 台股即時排行榜（真正覆蓋盤中當日黑馬股與最新熱度）
  const [yTwseRes, yTpexRes, yEtfRes] = await Promise.allSettled([
    fetchYahooTwRankBoard("twse", sortBy, tpexSymbolSet),
    fetchYahooTwRankBoard("tpex", sortBy, tpexSymbolSet),
    fetchYahooTwRankBoard("etf", sortBy, tpexSymbolSet),
  ]);

  const yTwse = yTwseRes.status === "fulfilled" ? yTwseRes.value : [];
  const yTpex = yTpexRes.status === "fulfilled" ? yTpexRes.value : [];
  const yEtf = yEtfRes.status === "fulfilled" ? yEtfRes.value : [];

  const mergeCandidates = (
    primary: RankedStockItem[],
    fallbackPool: RankedStockItem[],
    isEtfOnly: boolean
  ): RankedStockItem[] => {
    const primaryFiltered = sortRankings(primary, sortBy, poolSize, isEtfOnly);
    if (primaryFiltered.length >= poolSize) return primaryFiltered;
    const seen = new Set(primaryFiltered.map((x) => x.symbol));
    const supplements = sortRankings(fallbackPool, sortBy, poolSize * 2, isEtfOnly).filter(
      (x) => !seen.has(x.symbol)
    );
    return [...primaryFiltered, ...supplements].slice(0, poolSize);
  };

  const allEtfs = allTw.filter((x) => x.is_etf);
  const rawTwse = mergeCandidates(yTwse, twseAll, false);
  const rawTpex = mergeCandidates(yTpex, tpexAll, false);
  const rawEtf = mergeCandidates(yEtf, allEtfs, true);

  // 批併查詢 TWSE MIS 取得即時成交價、單筆大量張數 (tv)、五檔委買賣與真實交易日期
  const allCandidates = [...rawTwse, ...rawTpex, ...rawEtf];
  const enrichedMap = await enrichAllWithRealtimeTwse(allCandidates, tpexSymbolSet);

  const enrichedTwse = rawTwse.map((s) => enrichedMap.get(s.symbol) || s);
  const enrichedTpex = rawTpex.map((s) => enrichedMap.get(s.symbol) || s);
  const enrichedEtf = rawEtf.map((s) => enrichedMap.get(s.symbol) || s);

  const twse = sortRankings(enrichedTwse, sortBy, limit, false);
  const tpex = sortRankings(enrichedTpex, sortBy, limit, false);
  const etf = sortRankings(enrichedEtf, sortBy, limit, true);

  const resolvedDate =
    twse[0]?.date || tpex[0]?.date || etf[0]?.date || marketCache?.date || getTaipeiClock().dateStr;

  return {
    twse,
    tpex,
    etf,
    date: resolvedDate,
    live_ts: Date.now(),
  };
}
