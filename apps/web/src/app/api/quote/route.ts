import { NextRequest, NextResponse } from "next/server";
import { ETF_CATALOG } from "@/lib/etfCatalog";
import { getCachedTwMarketData } from "../market-rankings/route";

export const dynamic = "force-dynamic";

const COMMON_NAMES: Record<string, string> = {
  "^TWII": "台股加權指數",
  "^GSPC": "S&P 500 指數",
  "^IXIC": "Nasdaq 綜合指數",
  "^SOX": "費城半導體指數",
  "^DJI": "道瓊工業指數",
  "^N225": "日經 225 指數",
  "^VIX": "VIX 恐慌指數",
  "^TNX": "美國10年期公債殖利率",
  "^TYX": "美國30年期公債殖利率",
  "BTC-USD": "比特幣 (Bitcoin)",
  "ETH-USD": "以太坊 (Ethereum)",
  "SOL-USD": "Solana (SOL)",
  "GC=F": "黃金期貨 (Gold)",
  "SI=F": "白銀期貨 (Silver)",
  "CL=F": "西德州原油期貨",
  "BZ=F": "布蘭特原油期貨",
  "HG=F": "銅期貨 (Copper)",
  "NG=F": "天然氣期貨",
  "TWD=X": "美元/台幣 (USD/TWD)",
  "JPY=X": "美元/日圓 (USD/JPY)",
  "DX-Y.NYB": "美元指數 (DXY)",
  "2330": "台積電",
  "2317": "鴻海",
  "2454": "聯發科",
  "2382": "廣達",
  "3231": "緯創",
  "2603": "長榮",
  "2881": "富邦金",
  "2882": "國泰金",
  "2891": "中信金",
  "2303": "聯電",
  "2308": "台達電",
  "3711": "日月光投控",
  "2412": "中華電",
  "3037": "欣興",
  "2357": "華碩",
  "2609": "陽明",
  "3017": "奇鋐",
  "2376": "技嘉",
  "2618": "長榮航",
  "6669": "緯穎",
  "2383": "台光電",
  "2409": "友達",
  "3481": "群創",
  "8069": "元太",
  "6488": "環球晶",
  "3293": "鈊象",
  "5347": "世界",
  "3324": "雙鴻",
  "8299": "群聯",
  "3105": "穩懋",
  "1815": "富喬",
  "3374": "精材",
  "NVDA": "NVIDIA (輝達)",
  "AAPL": "Apple (蘋果)",
  "MSFT": "Microsoft (微軟)",
  "AMZN": "Amazon (亞馬遜)",
  "META": "Meta Platforms",
  "GOOGL": "Alphabet (Google)",
  "TSLA": "Tesla (特斯拉)",
  "AMD": "AMD (超微)",
  "AVGO": "Broadcom (博通)",
  "TSM": "台積電 ADR",
};

const YF_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json",
};

function mapPeriodToYf(period: string): { range: string; interval: string } {
  switch (period) {
    case "1d":
      return { range: "5d", interval: "5m" };
    case "5d":
      return { range: "5d", interval: "15m" };
    case "1mo":
    case "1m":
      return { range: "1mo", interval: "1d" };
    case "3mo":
    case "3m":
      return { range: "3mo", interval: "1d" };
    case "6mo":
    case "6m":
      return { range: "6mo", interval: "1d" };
    case "1y":
      return { range: "1y", interval: "1d" };
    case "2y":
      return { range: "2y", interval: "1d" };
    case "5y":
      return { range: "5y", interval: "1wk" };
    default:
      return { range: "6mo", interval: "1d" };
  }
}

async function fetchYahooChart(yfSym: string, range: string, interval: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yfSym
  )}?range=${range}&interval=${interval}&includePrePost=false`;
  const res = await fetch(url, { headers: YF_HEADERS, next: { revalidate: 15 } });
  if (!res.ok) return null;
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) return null;
  return result;
}

async function fetchTwseStockDayBars(code: string) {
  try {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}01`;
    const url = `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?date=${yyyymm}&stockNo=${encodeURIComponent(
      code
    )}&response=json`;
    const res = await fetch(url, { headers: YF_HEADERS, next: { revalidate: 60 } });
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json?.data)) return [];
    const bars = [];
    for (const row of json.data) {
      // [日期, 成交股數, 成交金額, 開盤價, 最高價, 最低價, 收盤價, 漲跌價差, 成交筆數]
      const rawDate = String(row[0] || "").trim();
      const parts = rawDate.split("/");
      if (parts.length !== 3) continue;
      const yyyy = Number(parts[0]) + 1911;
      const dateStr = `${yyyy}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      const parseN = (v: any) => parseFloat(String(v || "0").replace(/,/g, ""));
      const vol = parseN(row[1]);
      const open = parseN(row[3]);
      const high = parseN(row[4]);
      const low = parseN(row[5]);
      const close = parseN(row[6]);
      if (!Number.isFinite(close) || close <= 0) continue;
      bars.push({
        time: dateStr,
        open: Number((open || close).toFixed(2)),
        high: Number((high || close).toFixed(2)),
        low: Number((low || close).toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: Math.round(vol || 0),
      });
    }
    return bars;
  } catch {
    return [];
  }
}

async function fetchTwseMisNameAndQuote(code: string) {
  try {
    const exCh = `tse_${code}.tw|otc_${code}.tw`;
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(
      exCh
    )}&json=1&delay=0&_=${Date.now()}`;
    const res = await fetch(url, {
      headers: {
        ...YF_HEADERS,
        Referer: "https://mis.twse.com.tw/stock/fibest.jsp",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const arr = Array.isArray(data?.msgArray) ? data.msgArray : [];
    const info = arr.find((m: any) => m?.n || (m?.z && m.z !== "-")) || arr[0];
    if (!info) return null;

    const parsePrice = (v: any) => {
      if (!v || v === "-") return 0;
      const n = parseFloat(String(v).replace(/,/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    const prevClose = parsePrice(info.y);
    const zPrice = parsePrice(info.z);
    const price = zPrice > 0 ? zPrice : prevClose;
    const open = parsePrice(info.o) || price;
    const high = parsePrice(info.h) || price;
    const low = parsePrice(info.l) || price;
    const volLots = parsePrice(info.v);

    return {
      name: String(info.n || "").trim(),
      price,
      prevClose,
      open,
      high,
      low,
      volume: Math.round(volLots * 1000),
      hasRealtimePrice: price > 0,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSym = (searchParams.get("symbol") || "").trim();
  const period = searchParams.get("period");

  if (!rawSym) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const upper = rawSym.toUpperCase();
  const cleanCode = upper.replace(/\.(TW|TWO)$/i, "");
  const isTw =
    (/^\d/.test(cleanCode) && !upper.includes("-USD") && !upper.includes("=")) ||
    upper.endsWith(".TW") ||
    upper.endsWith(".TWO");
  const market: "TW" | "US" = isTw || upper === "^TWII" ? "TW" : "US";

  const candidateYfSymbols = isTw
    ? upper.endsWith(".TWO")
      ? [`${cleanCode}.TWO`, `${cleanCode}.TW`]
      : [`${cleanCode}.TW`, `${cleanCode}.TWO`]
    : [upper];

  // 1. History Mode (`?symbol=...&period=...`)
  if (period) {
    const { range, interval } = mapPeriodToYf(period);
    for (const yfSym of candidateYfSymbols) {
      const result = await fetchYahooChart(yfSym, range, interval);
      const timestamps: number[] = result?.timestamp || [];
      const q = result?.indicators?.quote?.[0] || {};
      if (timestamps.length > 0 && Array.isArray(q.close)) {
        const isIntraday = interval.endsWith("m") || interval.endsWith("h");
        const bars = [];
        for (let i = 0; i < timestamps.length; i++) {
          const c = Number(q.close?.[i]);
          if (!Number.isFinite(c) || c <= 0) continue;
          const o = Number(q.open?.[i]) || c;
          const h = Number(q.high?.[i]) || Math.max(o, c);
          const l = Number(q.low?.[i]) || Math.min(o, c);
          const v = Number(q.volume?.[i]) || 0;
          const ts = timestamps[i];
          const timeVal = isIntraday
            ? ts
            : new Date(ts * 1000).toISOString().slice(0, 10);
          bars.push({
            time: timeVal,
            open: Number(o.toFixed(2)),
            high: Number(h.toFixed(2)),
            low: Number(l.toFixed(2)),
            close: Number(c.toFixed(2)),
            volume: Math.round(v),
          });
        }
        if (bars.length > 0) {
          return NextResponse.json(bars);
        }
      }
    }

    // Fallback to TWSE STOCK_DAY for newly listed ETFs / Taiwan stocks
    if (isTw) {
      const twseBars = await fetchTwseStockDayBars(cleanCode);
      if (twseBars.length > 0) {
        return NextResponse.json(twseBars);
      }
    }

    return NextResponse.json([]);
  }

  // 2. Quote Mode (`?symbol=...`)
  const [twseMis, yfResultPrimary, twMarketData] = await Promise.all([
    isTw ? fetchTwseMisNameAndQuote(cleanCode) : Promise.resolve(null),
    fetchYahooChart(candidateYfSymbols[0], "5d", "1d"),
    isTw ? getCachedTwMarketData().catch(() => null) : Promise.resolve(null),
  ]);

  let yfResult = yfResultPrimary;
  if (!yfResult && candidateYfSymbols.length > 1) {
    yfResult = await fetchYahooChart(candidateYfSymbols[1], "5d", "1d");
  }

  const twMarketHit = twMarketData
    ? [...twMarketData.twseAll, ...twMarketData.tpexAll].find(
        (m) => m.symbol.toUpperCase() === cleanCode
      )
    : undefined;

  const knownName =
    COMMON_NAMES[cleanCode] ||
    COMMON_NAMES[upper] ||
    ETF_CATALOG[cleanCode]?.name ||
    ETF_CATALOG[upper]?.name ||
    twMarketHit?.name ||
    "";

  const meta = yfResult?.meta || {};
  const q = yfResult?.indicators?.quote?.[0] || {};
  const closes: number[] = (q.close || []).filter(
    (v: any) => Number.isFinite(Number(v)) && Number(v) > 0
  );
  const opens: number[] = (q.open || []).filter(
    (v: any) => Number.isFinite(Number(v)) && Number(v) > 0
  );
  const highs: number[] = (q.high || []).filter(
    (v: any) => Number.isFinite(Number(v)) && Number(v) > 0
  );
  const lows: number[] = (q.low || []).filter(
    (v: any) => Number.isFinite(Number(v)) && Number(v) > 0
  );
  const vols: number[] = (q.volume || []).filter((v: any) =>
    Number.isFinite(Number(v))
  );

  const yfPrice =
    Number(meta.regularMarketPrice) ||
    (closes.length > 0 ? Number(closes[closes.length - 1]) : 0);
  const yfPrevClose =
    closes.length >= 2
      ? Number(closes[closes.length - 2])
      : Number(meta.chartPreviousClose || meta.previousClose || yfPrice);

  const price =
    twseMis?.hasRealtimePrice && twseMis.price > 0
      ? twseMis.price
      : yfPrice > 0
      ? yfPrice
      : twMarketHit?.price || 0;
  const prevClose =
    twseMis?.hasRealtimePrice && twseMis.prevClose > 0
      ? twseMis.prevClose
      : yfPrevClose > 0
      ? yfPrevClose
      : twMarketHit
      ? Number((twMarketHit.price - twMarketHit.change).toFixed(2))
      : price;

  const change = price > 0 && prevClose > 0 ? Number((price - prevClose).toFixed(2)) : 0;
  const changePct =
    price > 0 && prevClose > 0
      ? Number((((price - prevClose) / prevClose) * 100).toFixed(2))
      : 0;

  const open =
    (twseMis?.open && twseMis.open > 0 ? twseMis.open : 0) ||
    Number(meta.regularMarketDayOpen) ||
    (opens.length > 0 ? Number(opens[opens.length - 1]) : price);
  const high =
    (twseMis?.high && twseMis.high > 0 ? twseMis.high : 0) ||
    Number(meta.regularMarketDayHigh) ||
    (highs.length > 0 ? Number(highs[highs.length - 1]) : price);
  const low =
    (twseMis?.low && twseMis.low > 0 ? twseMis.low : 0) ||
    Number(meta.regularMarketDayLow) ||
    (lows.length > 0 ? Number(lows[lows.length - 1]) : price);
  const volume =
    (twseMis?.volume && twseMis.volume > 0 ? twseMis.volume : 0) ||
    Number(meta.regularMarketVolume) ||
    (vols.length > 0 ? Number(vols[vols.length - 1]) : twMarketHit ? twMarketHit.volume_lots * 1000 : 0);

  const finalName =
    knownName ||
    twseMis?.name ||
    meta.shortName ||
    meta.longName ||
    cleanCode;

  return NextResponse.json({
    symbol: isTw ? cleanCode : upper,
    name: finalName,
    price: Number(price.toFixed(2)),
    change,
    change_pct: changePct,
    volume: Math.round(volume),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    open: Number(open.toFixed(2)),
    prev_close: Number(prevClose.toFixed(2)),
    market,
    source: twseMis?.hasRealtimePrice || twMarketHit ? "twse" : "yahoo",
    stale: false,
  });
}
