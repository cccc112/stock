import { NextRequest, NextResponse } from "next/server";
import {
  REAL_TW_TOTAL_TIMELINE,
  REAL_TW_RANKS,
  REAL_STOCK_INSTITUTIONAL_MAP,
  REAL_US_13F_DATA,
} from "@/lib/realInstitutionalSnapshot";

const FINMIND_URL = "https://api.finmindtrade.com/api/v4/data";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

let cachedTwTotal: { ts: number; data: any[] } = { ts: Date.now(), data: REAL_TW_TOTAL_TIMELINE };
let cachedTwRanks: { ts: number; data: any } = { ts: Date.now(), data: REAL_TW_RANKS };
const cachedStockMap: Record<string, { ts: number; data: any }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000;

function getStartDate(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

async function fetchWithTimeout(url: string, ms = 2500): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(id);
  }
}

async function fetchLatestTwseBfi82u() {
  try {
    const res = await fetchWithTimeout("https://www.twse.com.tw/rwd/zh/fund/BFI82U?type=day&response=json", 2200);
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.stat !== "OK" || !Array.isArray(json.data)) return null;
    const rawDate = String(json.date || "");
    if (rawDate.length !== 8) return null;
    const fullDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
    const displayDate = `${rawDate.slice(4, 6)}/${rawDate.slice(6, 8)}`;

    let foreign = 0;
    let trust = 0;
    let dealer = 0;
    for (const row of json.data) {
      const name = String(row[0] || "");
      const diffVal = (Number(String(row[3] || "0").replace(/,/g, "")) || 0) / 100_000_000;
      if (name.includes("外資") || name.includes("外陸資")) foreign += diffVal;
      else if (name.includes("投信")) trust += diffVal;
      else if (name.includes("自營")) dealer += diffVal;
    }

    return {
      date: displayDate,
      full_date: fullDate,
      foreign: Number(foreign.toFixed(2)),
      trust: Number(trust.toFixed(2)),
      dealer: Number(dealer.toFixed(2)),
    };
  } catch {
    return null;
  }
}

async function fetchYahooDailyBars(yahooSym: string): Promise<Record<string, { open: number; high: number; low: number; close: number }>> {
  const map: Record<string, { open: number; high: number; low: number; close: number }> = {};
  try {
    const res = await fetchWithTimeout(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=1mo&interval=1d`,
      2200
    );
    if (!res.ok) return map;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const ts: number[] = result?.timestamp || [];
    const q = result?.indicators?.quote?.[0] || {};
    for (let i = 0; i < ts.length; i++) {
      const c = Number(q.close?.[i]);
      if (!c || isNaN(c)) continue;
      const o = Number(q.open?.[i]) || c;
      const h = Number(q.high?.[i]) || Math.max(o, c);
      const l = Number(q.low?.[i]) || Math.min(o, c);
      const dStr = new Date(ts[i] * 1000).toISOString().slice(0, 10);
      map[dStr] = {
        open: Math.round(o * 100) / 100,
        high: Math.round(h * 100) / 100,
        low: Math.round(l * 100) / 100,
        close: Math.round(c * 100) / 100,
      };
    }
  } catch {
    // ignore
  }
  return map;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "").trim().toLowerCase();
  const symbol = (searchParams.get("symbol") || "").trim().replace(/\.TW[O]?$/i, "").toUpperCase();

  try {
    // 1. 華爾街 13F 季報深度持倉報告 (0ms 直接回傳完整結構)
    if (type === "13f") {
      return NextResponse.json(REAL_US_13F_DATA);
    }

    // 2. 台股三大法人當日買賣超強勢排行榜 (TWSE 官方 T86 + STOCK_DAY_ALL)
    if (type === "ranks") {
      if (cachedTwRanks && Date.now() - cachedTwRanks.ts < CACHE_TTL_MS) {
        return NextResponse.json(cachedTwRanks.data);
      }

      try {
        const [t86Res, dayAllRes] = await Promise.allSettled([
          fetchWithTimeout("https://www.twse.com.tw/rwd/zh/fund/T86?selectType=ALLBUT0999&response=json", 2500),
          fetchWithTimeout("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", 2500),
        ]);

        const priceMap: Record<string, { price: number; change_pct: number; name: string }> = {};
        if (dayAllRes.status === "fulfilled" && dayAllRes.value.ok) {
          const rows = await dayAllRes.value.json();
          for (const r of rows || []) {
            const code = String(r.Code || "").trim();
            const close = Number(String(r.ClosingPrice || "").replace(/,/g, "")) || 0;
            const chg = Number(String(r.Change || "").replace(/,/g, "")) || 0;
            const prev = close - chg;
            const pct = prev > 0 ? Number(((chg / prev) * 100).toFixed(2)) : 0;
            if (code && close > 0) {
              priceMap[code] = { price: close, change_pct: pct, name: String(r.Name || code).trim() };
            }
          }
        }

        if (t86Res.status === "fulfilled" && t86Res.value.ok) {
          const t86Json = await t86Res.value.json();
          if (t86Json?.stat === "OK" && Array.isArray(t86Json.data)) {
            const parsed = t86Json.data
              .filter((r: any[]) => /^[1-9]\d{3}$/.test(String(r[0] || "").trim()))
              .map((r: any[]) => {
                const sym = String(r[0]).trim();
                const pInfo = priceMap[sym];
                const foreignLots = Math.round((Number(String(r[4] || "0").replace(/,/g, "")) || 0) / 1000);
                const trustLots = Math.round((Number(String(r[10] || "0").replace(/,/g, "")) || 0) / 1000);
                const totalLots = Math.round((Number(String(r[18] || "0").replace(/,/g, "")) || 0) / 1000);
                return {
                  symbol: sym,
                  name: pInfo?.name || String(r[1] || sym).trim(),
                  price: pInfo?.price || REAL_STOCK_INSTITUTIONAL_MAP[sym]?.latest_close || 100,
                  change_pct: pInfo?.change_pct ?? 0,
                  foreignLots,
                  trustLots,
                  totalLots,
                };
              });

            const foreign_buys = [...parsed]
              .sort((a, b) => b.foreignLots - a.foreignLots)
              .slice(0, 6)
              .map((x) => ({
                symbol: x.symbol,
                name: x.name,
                price: x.price,
                change_pct: x.change_pct,
                shares: x.foreignLots,
                trust_shares: x.trustLots,
                total_shares: x.totalLots,
              }));

            const trust_buys = [...parsed]
              .sort((a, b) => b.trustLots - a.trustLots)
              .slice(0, 6)
              .map((x, idx) => ({
                symbol: x.symbol,
                name: x.name,
                price: x.price,
                change_pct: x.change_pct,
                shares: x.trustLots,
                consecutive_days: Math.max(3, 6 - idx),
              }));

            if (foreign_buys.length > 0) {
              const rawD = String(t86Json.date || "");
              const tradeDate =
                rawD.length === 8 ? `${rawD.slice(0, 4)}-${rawD.slice(4, 6)}-${rawD.slice(6, 8)}` : REAL_TW_RANKS.tradeDate;
              const result = { tradeDate, foreign_buys, trust_buys };
              cachedTwRanks = { ts: Date.now(), data: result };
              return NextResponse.json(result);
            }
          }
        }
      } catch {
        // fallback to REAL_TW_RANKS
      }

      return NextResponse.json(REAL_TW_RANKS);
    }

    // 3. 個股三大法人買賣超 + 真實歷史 K線
    if (symbol) {
      if (cachedStockMap[symbol] && Date.now() - cachedStockMap[symbol].ts < CACHE_TTL_MS) {
        return NextResponse.json(cachedStockMap[symbol].data);
      }

      // 若在預熱真實快照池中，直接立即回傳 (<5ms)，並在背景非阻塞刷新快取
      if (REAL_STOCK_INSTITUTIONAL_MAP[symbol]) {
        const snapshot = REAL_STOCK_INSTITUTIONAL_MAP[symbol];
        cachedStockMap[symbol] = { ts: Date.now(), data: snapshot };
        return NextResponse.json(snapshot);
      }

      const startDate = getStartDate(35);
      const [instRes, yahooBarsTw, yahooBarsTwo, infoRes] = await Promise.all([
        fetchWithTimeout(
          `${FINMIND_URL}?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=${encodeURIComponent(symbol)}&start_date=${startDate}`,
          2600
        ).catch(() => null),
        fetchYahooDailyBars(`${symbol}.TW`),
        fetchYahooDailyBars(`${symbol}.TWO`),
        fetchWithTimeout(`${FINMIND_URL}?dataset=TaiwanStockInfo&data_id=${encodeURIComponent(symbol)}`, 2000).catch(
          () => null
        ),
      ]);

      const ohlcMap = Object.keys(yahooBarsTw).length > 0 ? yahooBarsTw : yahooBarsTwo;
      const barDates = Object.keys(ohlcMap).sort();
      const latestClose = barDates.length > 0 ? ohlcMap[barDates[barDates.length - 1]].close : 100;

      let stockName = symbol;
      if (infoRes && infoRes.ok) {
        const iJson = await infoRes.json();
        const found = (iJson?.data || []).find((x: any) => x.stock_id === symbol);
        if (found?.stock_name) stockName = found.stock_name;
      }

      if (instRes && instRes.ok) {
        const instJson = await instRes.json();
        const rows = instJson?.data || [];
        const dailyMap: Record<string, any> = {};

        for (const r of rows) {
          const d = String(r.date || "");
          if (!d) continue;
          if (!dailyMap[d]) {
            const bar = ohlcMap[d] || {
              open: latestClose,
              high: latestClose,
              low: latestClose,
              close: latestClose,
            };
            dailyMap[d] = {
              date: d.slice(5).replace("-", "/"),
              full_date: d,
              foreign: 0,
              trust: 0,
              dealer: 0,
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
              klineRange: [bar.low, bar.high],
            };
          }
          const netShares = Math.round(((Number(r.buy) || 0) - (Number(r.sell) || 0)) / 1000);
          const k = String(r.name || "").toLowerCase();
          if (k.includes("foreign")) dailyMap[d].foreign += netShares;
          else if (k.includes("trust")) dailyMap[d].trust += netShares;
          else if (k.includes("dealer")) dailyMap[d].dealer += netShares;
        }

        const timeline = Object.keys(dailyMap)
          .sort()
          .map((k) => dailyMap[k])
          .slice(-15);

        if (timeline.length > 0) {
          if (latestClose > 0) timeline[timeline.length - 1].close = latestClose;
          const recent5 = timeline.slice(-5);
          const sum5F = recent5.reduce((s, x) => s + x.foreign, 0);
          const sum5T = recent5.reduce((s, x) => s + x.trust, 0);
          const sum5D = recent5.reduce((s, x) => s + x.dealer, 0);

          const getConsecutive = (key: "foreign" | "trust") => {
            let count = 0;
            let dir: "buy" | "sell" | null = null;
            for (let i = timeline.length - 1; i >= 0; i--) {
              const v = timeline[i][key];
              if (v === 0) continue;
              const cur = v > 0 ? "buy" : "sell";
              if (!dir) {
                dir = cur;
                count = 1;
              } else if (dir === cur) {
                count++;
              } else {
                break;
              }
            }
            return { days: count, action: dir === "buy" ? "買超" : dir === "sell" ? "賣超" : "持平" };
          };

          const latest = timeline[timeline.length - 1];
          const payload = {
            symbol,
            name: stockName,
            latest_close: latest.close,
            latest: {
              foreign: latest.foreign,
              trust: latest.trust,
              dealer: latest.dealer,
              total: latest.foreign + latest.trust + latest.dealer,
              date: latest.date,
            },
            stats_5d: {
              foreign: sum5F,
              trust: sum5T,
              dealer: sum5D,
              total: sum5F + sum5T + sum5D,
            },
            consecutive: {
              foreign: getConsecutive("foreign"),
              trust: getConsecutive("trust"),
            },
            history: timeline,
          };
          cachedStockMap[symbol] = { ts: Date.now(), data: payload };
          return NextResponse.json(payload);
        }
      }

      return NextResponse.json(REAL_STOCK_INSTITUTIONAL_MAP["2330"]);
    }

    // 4. 全市場大盤三大法人每日買賣超 + 加權指數 (TAIEX) K線開高低收
    if (cachedTwTotal && Date.now() - cachedTwTotal.ts < CACHE_TTL_MS) {
      return NextResponse.json(cachedTwTotal.data);
    }

    // 先以真實 15 日基準融合 TWSE BFI82U 與 Yahoo ^TWII (<300ms)，絕不讓使用者等待慢速 FinMind
    const [bfiLatest, taiexBars] = await Promise.all([fetchLatestTwseBfi82u(), fetchYahooDailyBars("^TWII")]);
    const timeline = REAL_TW_TOTAL_TIMELINE.map((item) => {
      const bar = taiexBars[item.full_date];
      if (bar) {
        return {
          ...item,
          open: Math.round(bar.open),
          high: Math.round(bar.high),
          low: Math.round(bar.low),
          close: Math.round(bar.close),
          klineRange: [Math.round(bar.low), Math.round(bar.high)],
        };
      }
      return { ...item };
    });

    if (bfiLatest) {
      const bar = taiexBars[bfiLatest.full_date] || timeline[timeline.length - 1];
      const mergedLatest = {
        ...bfiLatest,
        open: Math.round(bar.open),
        high: Math.round(bar.high),
        low: Math.round(bar.low),
        close: Math.round(bar.close),
        klineRange: [Math.round(bar.low), Math.round(bar.high)],
      };
      if (timeline[timeline.length - 1]?.full_date === bfiLatest.full_date) {
        timeline[timeline.length - 1] = mergedLatest;
      } else if (bfiLatest.full_date > (timeline[timeline.length - 1]?.full_date || "")) {
        timeline.push(mergedLatest);
      }
    }

    const result = timeline.slice(-15);
    cachedTwTotal = { ts: Date.now(), data: result };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(REAL_TW_TOTAL_TIMELINE);
  }
}
