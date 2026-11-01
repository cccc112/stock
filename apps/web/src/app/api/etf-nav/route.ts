import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
}

let cachedRecords: { ts: number; list: EtfNavRecord[] } | null = null;
const CACHE_TTL_MS = 20_000;

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

async function fetchAllEtfNav(): Promise<EtfNavRecord[]> {
  const url = `https://mis.twse.com.tw/stock/data/all_etf.txt?_=${Date.now()}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://mis.twse.com.tw/stock/etf_nav.jsp",
      Accept: "application/json, text/plain, */*",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  const records: EtfNavRecord[] = [];

  for (const key of Object.keys(data || {})) {
    const groups = data[key];
    if (!Array.isArray(groups)) continue;
    for (const grp of groups) {
      const arr = grp?.msgArray;
      if (!Array.isArray(arr)) continue;
      for (const it of arr) {
        const code = String(it?.a || "").trim();
        if (!code) continue;
        const price = parseNum(it?.e);
        const nav = parseNum(it?.f);
        if (price <= 0 && nav <= 0) continue;
        const disc = parseNum(it?.g);
        const prevNav = parseNum(it?.h) || nav;
        const rawDiffUnits = parseNum(it?.d);
        const sharesNetLots = Math.round(rawDiffUnits / 1000);
        const aumUnits = parseNum(it?.c);

        records.push({
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
  return records;
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
    if (found) {
      return NextResponse.json(found);
    }
    return NextResponse.json({
      symbol: clean,
      name: clean,
      price: 0,
      nav: 0,
      discount_pct: 0,
      prev_nav: 0,
      shares_net: 0,
      aum_units: 0,
      date: "",
      time: "",
      status: "平價",
    });
  }

  return NextResponse.json(list);
}
