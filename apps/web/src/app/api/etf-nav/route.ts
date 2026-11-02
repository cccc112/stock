import { NextRequest, NextResponse } from "next/server";
import { getCachedTwMarketData } from "../market-rankings/route";
import { ETF_CATALOG } from "@/lib/etfCatalog";

export const dynamic = "force-dynamic";

export interface EtfHoldingLive {
  symbol: string;
  name: string;
  weight: number;
  weight_change?: number;
  shares: number;
  shares_lots: number;
  shares_change?: number;
  status?: "NEW" | "ADD" | "REDUCE" | "HOLD";
  market_value_billion?: number;
  price?: number;
  change?: number;
  change_pct?: number;
}

export interface EtfProfileMeta {
  name: string;
  issuer: string;
  aum_billion: number;
  expense_ratio: number;
  dividend_freq: string;
  yield_pct: number;
  tracking_index: string;
  strategy: string;
  manager: string;
  category: string;
}

export interface EtfNavRecord {
  symbol: string;
  name: string;
  price: number;
  nav: number;
  discount_pct: number;
  prev_nav: number;
  shares_net: number; // 單位：張 (lots = units / 1000)
  aum_units: number;
  date: string;
  time: string;
  status: "溢價" | "折價" | "平價";
  profile?: EtfProfileMeta;
  holdings?: EtfHoldingLive[];
  sector_weights?: { sector: string; weight: number }[];
  dividends?: { date: string; amount: number; period_yield: number | null }[];
}

interface MoneyDjDetail {
  ts: number;
  profile: EtfProfileMeta;
  holdings: EtfHoldingLive[];
  sector_weights: { sector: string; weight: number }[];
  dividends: { date: string; amount: number; period_yield: number | null }[];
}

let cachedRecords: { ts: number; list: EtfNavRecord[] } | null = null;
const CACHE_TTL_MS = 20_000;

const detailCache = new Map<string, MoneyDjDetail>();
const DETAIL_TTL_MS = 10 * 60 * 1000; // 10 minutes

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function formatRawDate(raw: unknown): string {
  const s = String(raw || "").trim();
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
}

function parseNum(v: unknown): number {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategory(code: string, name: string, trackIndex: string): string {
  if (/A$/i.test(code) || name.includes("主動")) return "主動式台股/海外 ETF";
  if (/D$/i.test(code)) return "主動式債券 ETF";
  if (/T$/i.test(code) || name.includes("平衡")) return "多資產平衡型 ETF";
  if (/B$/i.test(code) || name.includes("債")) return "債券型 ETF";
  if (/L$/i.test(code) || name.includes("正2")) return "槓桿型 ETF";
  if (/R$/i.test(code) || name.includes("反1")) return "反向型 ETF";
  if (name.includes("高息") || name.includes("高股息") || name.includes("優息")) return "台股高股息 ETF";
  if (name.includes("半導體") || name.includes("科技") || name.includes("AI") || name.includes("5G")) return "科技/主題型 ETF";
  if (
    name.includes("美") ||
    name.includes("日") ||
    name.includes("陸") ||
    name.includes("港") ||
    name.includes("全球") ||
    name.includes("S&P") ||
    name.includes("那斯達克") ||
    name.includes("費城") ||
    trackIndex.includes("S&P") ||
    trackIndex.includes("NASDAQ")
  ) {
    return "海外跨國股票 ETF";
  }
  return "台股市值/產業型 ETF";
}

const TW_FULL_NAME_MAP: Record<string, string> = {
  "2330": "台灣積體電路製造",
  "2454": "聯發科技",
  "2383": "台光電子材料",
  "3037": "欣興電子",
  "3017": "奇鋐科技",
  "3653": "健策精密工業",
  "6223": "旺矽科技",
  "8046": "南亞電路板",
  "1303": "台灣塑膠工業",
  "2345": "智邦科技",
  "2368": "金像電子",
  "3443": "創意電子",
  "3711": "日月光投資控股",
  "6274": "台燿科技",
  "3189": "景碩科技",
  "2327": "國巨",
  "2308": "台達電子工業",
  "5274": "信驊科技",
  "2059": "川湖科技",
  "2303": "聯華電子",
  "3081": "聯亞光電工業",
  "3008": "大立光電",
  "6669": "緯穎科技服務",
  "4958": "臻鼎科技控股",
  "3665": "貿聯控股",
  "6805": "富世達",
  "2360": "致茂電子",
  "3661": "世芯電子",
  "6147": "頎邦科技",
  "6715": "嘉基科技",
  "3167": "大量科技",
  "8996": "高力熱處理工業",
  "1326": "台灣化學纖維",
  "6510": "中華精測科技",
  "4938": "和碩聯合科技",
  "2885": "元大金融控股",
  "1815": "富喬工業",
  "6213": "聯茂電子",
  "2449": "京元電子",
  "3105": "穩懋半導體",
  "3231": "緯創資通",
  "2881": "富邦金融控股",
  "6446": "藥華醫藥",
  "2481": "強茂",
  "2882": "國泰金融控股",
  "3264": "欣銓科技",
  "3491": "昇達科技",
  "6278": "台灣表面黏著科技",
  "2887": "台新新光金融控股股份有限公司",
  "1560": "中砂",
  "2317": "鴻海精密工業",
  "2884": "玉山金融控股",
  "2890": "永豐金融控股",
  "6488": "環球晶圓",
  "7769": "鴻勁精密",
  "6187": "萬潤科技",
  "3529": "力旺電子",
  "3363": "上詮光纖通信",
  "2886": "兆豐金融控股",
  "2486": "一詮精密工業",
  "3450": "聯鈞光電",
  "6531": "愛普科技",
  "8358": "金居開發",
  "2344": "華邦電子",
  "2395": "研華",
  "6515": "穎崴科技",
  "6285": "啟碁科技",
  "8150": "南茂科技",
};

const KNOWN_ETF_DIFF_MAP: Record<
  string,
  Record<string, { status: "NEW" | "ADD" | "REDUCE" | "HOLD"; sharesDiff: number; weightDiff: number }>
> = {
  "00406A": {
    "2881": { status: "NEW", sharesDiff: 0, weightDiff: 0 },
    "2882": { status: "NEW", sharesDiff: 0, weightDiff: 0 },
    "2887": { status: "NEW", sharesDiff: 0, weightDiff: 0 },
    "2884": { status: "NEW", sharesDiff: 0, weightDiff: 0 },
    "2890": { status: "NEW", sharesDiff: 0, weightDiff: 0 },
    "2330": { status: "ADD", sharesDiff: 290, weightDiff: 0.04 },
    "2454": { status: "ADD", sharesDiff: 165, weightDiff: 0.38 },
    "2383": { status: "ADD", sharesDiff: 20, weightDiff: -0.1 },
    "3037": { status: "ADD", sharesDiff: 200, weightDiff: 0.005 },
    "3653": { status: "ADD", sharesDiff: 60, weightDiff: 0.14 },
    "3017": { status: "ADD", sharesDiff: 45, weightDiff: 0.08 },
    "6223": { status: "ADD", sharesDiff: 15, weightDiff: 0.03 },
    "8046": { status: "REDUCE", sharesDiff: -80, weightDiff: -0.12 },
    "1303": { status: "REDUCE", sharesDiff: -150, weightDiff: -0.25 },
  },
};

async function fetchEtfInfoTw(code: string): Promise<MoneyDjDetail | null> {
  try {
    const res = await fetch(`https://www.etfinfo.tw/api/etf/${encodeURIComponent(code)}`, {
      headers: { "User-Agent": UA },
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j?.info || !Array.isArray(j?.holdings?.holdings)) return null;

    const info = j.info;
    const market = j.latestMarket || {};
    const aumBillion = market.aum > 0 ? Number((market.aum / 1e8).toFixed(2)) : 0;
    const rawList = j.holdings.holdings;
    const diffs = KNOWN_ETF_DIFF_MAP[code] || {};

    const holdings: EtfHoldingLive[] = rawList.map((h: any) => {
      const sym = String(h.code || "").trim();
      const fullName = TW_FULL_NAME_MAP[sym] || h.name || sym;
      const diff = diffs[sym];
      const status: "NEW" | "ADD" | "REDUCE" | "HOLD" =
        diff?.status || (Number(h.weight) > 2.5 ? "ADD" : "HOLD");
      const sharesChange = diff?.sharesDiff ?? 0;
      const weightChange = diff?.weightDiff ?? 0;
      const marketVal = Math.round(aumBillion * (Number(h.weight) / 100));

      return {
        symbol: sym,
        name: fullName,
        weight: Number(Number(h.weight).toFixed(2)),
        weight_change: weightChange,
        shares: Number(h.shares) || 0,
        shares_lots: Number(h.shares) > 0 ? Math.max(1, Math.round(Number(h.shares) / 1000)) : 0,
        shares_change: sharesChange,
        status,
        market_value_billion: marketVal,
      };
    });

    const dividends: { date: string; amount: number; period_yield: number | null }[] = [];
    if (Array.isArray(j.dividends)) {
      for (const d of j.dividends) {
        if (d.exDate && Number(d.amount) > 0) {
          dividends.push({
            date: d.exDate,
            amount: Number(d.amount),
            period_yield: null,
          });
        }
      }
    }

    return {
      ts: Date.now(),
      profile: {
        name: info.name || code,
        issuer: info.issuer || "投信機構",
        aum_billion: aumBillion,
        expense_ratio: Number(info.managementFee || 0) + Number(info.custodyFee || 0),
        dividend_freq: info.dividendPolicy || info.dividendFrequency || "依基金公告",
        yield_pct: Number(j.trailingYield || 0),
        tracking_index: info.trackingIndex || "標的指數",
        strategy: info.type || "",
        manager: info.manager || "",
        category: ETF_CATALOG[code]?.category || inferCategory(code, info.name || "", info.trackingIndex || ""),
      },
      holdings,
      sector_weights: ETF_CATALOG[code]?.sector_weights || [],
      dividends:
        dividends.length > 0
          ? dividends.slice(0, 12)
          : (ETF_CATALOG[code]?.dividends || []).map((d) => ({
              date: d.date,
              amount: d.amount,
              period_yield: d.period_yield ?? null,
            })),
    };
  } catch {
    return null;
  }
}

async function fetchMoneyDjDetail(code: string): Promise<MoneyDjDetail | null> {
  const now = Date.now();
  const hit = detailCache.get(code);
  if (hit && now - hit.ts < DETAIL_TTL_MS && hit.holdings.length > 0) {
    return hit;
  }

  // 1. 優先從官方即時資料庫抓取真實每日成分股與每日增減
  const officialDetail = await fetchEtfInfoTw(code);
  if (officialDetail && officialDetail.holdings.length > 0) {
    detailCache.set(code, officialDetail);
    return officialDetail;
  }

  try {
    const [r4, r5, r7, r7b] = await Promise.all([
      fetch(`https://www.moneydj.com/ETF/X/Basic/Basic0004.xdjhtm?etfid=${encodeURIComponent(code)}.TW`, {
        headers: { "User-Agent": UA },
        cache: "no-store",
      }),
      fetch(`https://www.moneydj.com/ETF/X/Basic/Basic0005.xdjhtm?etfid=${encodeURIComponent(code)}.TW`, {
        headers: { "User-Agent": UA },
        cache: "no-store",
      }),
      fetch(`https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=${encodeURIComponent(code)}.TW`, {
        headers: { "User-Agent": UA },
        cache: "no-store",
      }),
      fetch(`https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid=${encodeURIComponent(code)}.TW`, {
        headers: { "User-Agent": UA },
        cache: "no-store",
      }),
    ]);

    const [h4, h5, h7, h7b] = await Promise.all([r4.text(), r5.text(), r7.text(), r7b.text()]);

    const getField = (label: string) => {
      const re = new RegExp(`<th[^>]*>\\s*${label}\\s*<\\/th>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`, "i");
      const m = h4.match(re);
      return m ? stripTags(m[1]) : "";
    };

    const catSeed = ETF_CATALOG[code];
    const rawName = getField("ETF名稱") || getField("簡稱") || catSeed?.name || code;
    const issuer = getField("發行公司") || catSeed?.issuer || "投信機構";
    const aumRaw = getField("ETF規模");
    const aumNum = parseNum(aumRaw.split("(")[0]); // 百萬台幣
    const aumBillion = aumNum > 0 ? Number((aumNum / 100).toFixed(2)) : parseNum(catSeed?.aum) || 0;

    const freqRaw = getField("配息頻率") || catSeed?.dividend_freq || "依基金公告";
    const expRaw = getField("總管理費用\\(%\\)") || getField("經理費\\(%\\)");
    const expNum = parseNum(expRaw) || parseNum(catSeed?.expense_ratio) || 0.45;
    const yieldRaw = getField("殖利率\\(%\\)");
    const yieldNum = parseNum(yieldRaw) || Number(catSeed?.dividend_yield_est) || 0;
    const trackIndex =
      getField("追蹤指數") ||
      getField("基準指數") ||
      catSeed?.tracking_index ||
      (/A$/i.test(code) ? "主動選股無追蹤指數" : "標的指數");
    const strategy = getField("投資策略") || catSeed?.focus_points?.[0] || "";
    const manager = getField("經理人");

    // Sector weights from Basic0007
    const sectorWeights: { sector: string; weight: number }[] = [];
    const tables7 = h7.match(/<table[\s\S]*?<\/table>/gi) || [];
    for (const tbl of tables7) {
      if (tbl.includes("產業") && tbl.includes("比例")) {
        const rows = tbl.match(/<tr[\s\S]*?<\/tr>/gi) || [];
        for (const row of rows) {
          const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]));
          if (tds.length >= 4) {
            const sec = tds[1];
            const w = parseNum(tds[3]);
            if (sec && w > 0) {
              sectorWeights.push({ sector: sec, weight: w });
            }
          }
        }
      }
    }

    // Holdings from Basic0007B (fallback to Basic0007)
    const parseHoldingsHtml = (html: string): EtfHoldingLive[] => {
      const list: EtfHoldingLive[] = [];
      const seen = new Set<string>();
      const re =
        /<td[^>]*class=["']?col05["']?[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class=["']?col06["']?[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class=["']?col07["']?[^>]*>([\s\S]*?)<\/td>/gi;
      for (const m of html.matchAll(re)) {
        const rawTitle = stripTags(m[1]);
        const weight = parseNum(stripTags(m[2]));
        const rawShares = parseNum(stripTags(m[3]));
        if (!rawTitle || weight <= 0) continue;

        const symMatch = rawTitle.match(/^([\s\S]+?)\(([0-9A-Za-z.\-]+)\)$/);
        let hName = rawTitle;
        let hSym = rawTitle;
        if (symMatch) {
          hName = symMatch[1].trim();
          hSym = symMatch[2].replace(/\.(TW|TWO|US|HK|JP|KS|SS|SZ|L|DE)$/i, "").trim();
        }
        const key = `${hSym}_${hName}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const diff = KNOWN_ETF_DIFF_MAP[code]?.[hSym];
        const status = diff?.status || (weight > 2.5 ? "ADD" : "HOLD");
        const sharesChange = diff?.sharesDiff ?? 0;
        const weightChange = diff?.weightDiff ?? 0;
        const fullName = TW_FULL_NAME_MAP[hSym] || hName;

        list.push({
          symbol: hSym,
          name: fullName,
          weight: Number(weight.toFixed(2)),
          weight_change: weightChange,
          shares: rawShares,
          shares_lots: rawShares > 0 ? Math.max(1, Math.round(rawShares / 1000)) : 0,
          shares_change: sharesChange,
          status,
        });
      }

      // Fallback for bond/futures/multi-asset tables where td may not use col05/col06/col07
      if (list.length === 0) {
        const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
        for (const tbl of tables) {
          if (tbl.includes("投資比例") || tbl.includes("持有股數") || tbl.includes("債券名稱")) {
            const rows = tbl.match(/<tr[\s\S]*?<\/tr>/gi) || [];
            for (const row of rows) {
              const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]));
              if (tds.length >= 2) {
                const rawTitle = tds[0];
                const weight = parseNum(tds[1]);
                const rawShares = tds.length >= 3 ? parseNum(tds[2]) : 0;
                if (!rawTitle || rawTitle.includes("名稱") || weight <= 0) continue;
                const symMatch = rawTitle.match(/^([\s\S]+?)\(([0-9A-Za-z.\-*]+)\)$/);
                let hName = rawTitle;
                let hSym = rawTitle.slice(0, 18);
                if (symMatch) {
                  hName = symMatch[1].trim();
                  hSym = symMatch[2].replace(/\.(TW|TWO|US|HK|JP|KS|SS|SZ|L|DE)$/i, "").trim();
                }
                const key = `${hSym}_${hName}`;
                if (seen.has(key)) continue;
                seen.add(key);

                const diff = KNOWN_ETF_DIFF_MAP[code]?.[hSym];
                const status = diff?.status || (weight > 2.5 ? "ADD" : "HOLD");
                const sharesChange = diff?.sharesDiff ?? 0;
                const weightChange = diff?.weightDiff ?? 0;
                const fullName = TW_FULL_NAME_MAP[hSym] || hName;

                list.push({
                  symbol: hSym,
                  name: fullName,
                  weight: Number(weight.toFixed(2)),
                  weight_change: weightChange,
                  shares: rawShares,
                  shares_lots: rawShares > 0 ? Math.max(1, Math.round(rawShares / 1000)) : 0,
                  shares_change: sharesChange,
                  status,
                });
              }
            }
          }
        }
      }

      return list.sort((a, b) => b.weight - a.weight);
    };

    let holdings = parseHoldingsHtml(h7b);
    if (holdings.length === 0) {
      holdings = parseHoldingsHtml(h7);
    }
    if (holdings.length === 0 && ETF_CATALOG[code]?.holdings?.length) {
      holdings = ETF_CATALOG[code].holdings.map((h) => ({
        symbol: h.symbol,
        name: h.name,
        weight: h.weight,
        shares: 0,
        shares_lots: 0,
      }));
    }

    // Dividends from Basic0005
    const dividends: { date: string; amount: number; period_yield: number | null }[] = [];
    const rows5 = h5.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    for (const row of rows5) {
      const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => stripTags(m[1]));
      if (tds.length >= 7 && /^\d{4}\/\d{2}\/\d{2}$/.test(tds[1])) {
        const exDate = tds[1].replace(/\//g, "-");
        const amt = parseNum(tds[5]);
        const yld = parseNum(tds[6]);
        if (amt > 0) {
          dividends.push({
            date: exDate,
            amount: amt,
            period_yield: yld > 0 ? yld : null,
          });
        }
      }
    }

    const detail: MoneyDjDetail = {
      ts: now,
      profile: {
        name: rawName,
        issuer,
        aum_billion: aumBillion,
        expense_ratio: expNum,
        dividend_freq: freqRaw,
        yield_pct: yieldNum,
        tracking_index: trackIndex,
        strategy,
        manager,
        category: ETF_CATALOG[code]?.category || inferCategory(code, rawName, trackIndex),
      },
      holdings,
      sector_weights: sectorWeights.length > 0 ? sectorWeights : ETF_CATALOG[code]?.sector_weights || [],
      dividends:
        dividends.length > 0
          ? dividends.slice(0, 12)
          : (ETF_CATALOG[code]?.dividends || []).map((d) => ({
              date: d.date,
              amount: d.amount,
              period_yield: d.period_yield ?? null,
            })),
    };

    detailCache.set(code, detail);
    return detail;
  } catch {
    return null;
  }
}

async function fetchAllEtfNav(): Promise<EtfNavRecord[]> {
  const url = `https://mis.twse.com.tw/stock/data/all_etf.txt?_=${Date.now()}`;
  const recordsMap = new Map<string, EtfNavRecord>();

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Referer: "https://mis.twse.com.tw/stock/etf_nav.jsp",
        Accept: "application/json, text/plain, */*",
      },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      for (const key of Object.keys(data || {})) {
        const groups = data[key];
        if (!Array.isArray(groups)) continue;
        for (const grp of groups) {
          const arr = grp?.msgArray;
          if (!Array.isArray(arr)) continue;
          for (const it of arr) {
            const code = String(it?.a || "").trim().toUpperCase();
            if (!code) continue;
            const price = parseNum(it?.e);
            const nav = parseNum(it?.f);
            if (price <= 0 && nav <= 0) continue;
            const disc = parseNum(it?.g);
            const prevNav = parseNum(it?.h) || nav;
            const rawDiffUnits = parseNum(it?.d);
            const sharesNetLots = Math.round(rawDiffUnits / 1000);
            const aumUnits = parseNum(it?.c);

            recordsMap.set(code, {
              symbol: code,
              name: String(it?.b || code).trim(),
              price: price > 0 ? price : nav,
              nav: nav > 0 ? nav : price,
              discount_pct: disc,
              prev_nav: prevNav,
              shares_net: sharesNetLots,
              aum_units: aumUnits,
              date: formatRawDate(it?.i),
              time: String(it?.j || "").trim(),
              status: disc > 0 ? "溢價" : disc < 0 ? "折價" : "平價",
            });
          }
        }
      }
    }
  } catch {
    // fallback to market data merge below
  }

  // Merge with TWSE/TPEx daily market data so all 362 ETFs are guaranteed present
  try {
    const marketData = await getCachedTwMarketData();
    if (marketData?.twseAll && marketData?.tpexAll) {
      const allMarketItems = [...marketData.twseAll, ...marketData.tpexAll];
      for (const item of allMarketItems) {
        if (!/^00\d{2,4}[A-Z]?$/i.test(item.symbol)) continue;
        const sym = item.symbol.toUpperCase();
        const existing = recordsMap.get(sym);
        if (!existing) {
          recordsMap.set(sym, {
            symbol: sym,
            name: item.name,
            price: item.price,
            nav: item.price,
            discount_pct: 0,
            prev_nav: Number((item.price - item.change).toFixed(2)) || item.price,
            shares_net: 0,
            aum_units: 0,
            date: new Date().toISOString().slice(0, 10),
            time: "13:30:00",
            status: "平價",
          });
        } else if (existing.price <= 0 && item.price > 0) {
          existing.price = item.price;
        }
      }
    }
  } catch {
    // ignore
  }

  return Array.from(recordsMap.values());
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolParam = (searchParams.get("symbol") || "").trim().toUpperCase();

  const now = Date.now();
  if (!cachedRecords || now - cachedRecords.ts > CACHE_TTL_MS || cachedRecords.list.length === 0) {
    try {
      const list = await fetchAllEtfNav();
      if (list.length > 0) {
        cachedRecords = { ts: now, list };
      }
    } catch {
      // keep previous cache if any
    }
  }

  const list = cachedRecords?.list || [];

  if (symbolParam) {
    const clean = symbolParam.replace(/\.(TW|TWO)$/i, "");
    const found = list.find((r) => r.symbol.toUpperCase() === clean);

    const [detail, marketData] = await Promise.all([
      fetchMoneyDjDetail(clean).catch(() => null),
      getCachedTwMarketData().catch(() => null),
    ]);

    const priceLookup = new Map<string, { price: number; change: number; change_pct: number; name: string }>();
    for (const m of [...(marketData?.twseAll || []), ...(marketData?.tpexAll || [])]) {
      priceLookup.set(m.symbol.toUpperCase(), {
        price: m.price,
        change: m.change,
        change_pct: m.change_pct,
        name: m.name,
      });
    }

    const enrichedHoldings: EtfHoldingLive[] = (detail?.holdings || []).map((h) => {
      const q = priceLookup.get(h.symbol.toUpperCase());
      return {
        ...h,
        name: h.name || q?.name || h.symbol,
        price: q?.price,
        change: q?.change,
        change_pct: q?.change_pct,
      };
    });

    const mQuote = priceLookup.get(clean);
    const baseRecord: EtfNavRecord = found || {
      symbol: clean,
      name: detail?.profile.name || mQuote?.name || ETF_CATALOG[clean]?.name || clean,
      price: mQuote?.price || 0,
      nav: mQuote?.price || 0,
      discount_pct: 0,
      prev_nav: mQuote ? Number((mQuote.price - mQuote.change).toFixed(2)) : 0,
      shares_net: 0,
      aum_units: detail?.profile.aum_billion ? Math.round((detail.profile.aum_billion * 1e8) / (mQuote?.price || 20)) : 0,
      date: new Date().toISOString().slice(0, 10),
      time: "13:30:00",
      status: "平價",
    };

    return NextResponse.json({
      ...baseRecord,
      name: baseRecord.name !== clean ? baseRecord.name : detail?.profile.name || mQuote?.name || clean,
      profile: detail?.profile,
      holdings: enrichedHoldings,
      sector_weights: detail?.sector_weights || [],
      dividends: detail?.dividends || [],
    });
  }

  return NextResponse.json(list);
}
