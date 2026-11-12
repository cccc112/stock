import { NextRequest, NextResponse } from "next/server";
import { resolveChannelAccessToken } from "@/app/api/line/push/route";
import { createRadarAlertFlexCard, RadarSignalData } from "@/lib/line/flexCards";

export const dynamic = "force-dynamic";

const DEFAULT_WATCH_POOL = [
  { symbol: "2330", name: "台積電", market: "tse" },
  { symbol: "2317", name: "鴻海", market: "tse" },
  { symbol: "2454", name: "聯發科", market: "tse" },
  { symbol: "2603", name: "長榮", market: "tse" },
  { symbol: "3231", name: "緯創", market: "tse" },
  { symbol: "2382", name: "廣達", market: "tse" },
  { symbol: "3017", name: "奇鋐", market: "tse" },
  { symbol: "0050", name: "元大台灣50", market: "tse" },
];

interface LiveSnap {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volumeLots: number;
}

async function fetchRealtimePoolQuotes(symbols?: string[]): Promise<LiveSnap[]> {
  const targetList =
    symbols && symbols.length > 0
      ? symbols.slice(0, 12).map((s) => {
          const clean = String(s).trim().toUpperCase();
          const preset = DEFAULT_WATCH_POOL.find((p) => p.symbol === clean);
          return {
            symbol: clean,
            name: preset?.name || clean,
            market: "tse",
          };
        })
      : DEFAULT_WATCH_POOL;

  const parseP = (v: any) => {
    if (!v || v === "-") return 0;
    const n = parseFloat(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const parseBest = (raw: any) => {
    if (!raw || typeof raw !== "string") return 0;
    return parseP(raw.split("_")[0]);
  };

  const results: LiveSnap[] = [];

  try {
    const exCh = targetList.map((s) => `${s.market}_${s.symbol}.tw`).join("|");
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(
      exCh
    )}&json=1&delay=0&_=${Date.now()}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
        Referer: "https://mis.twse.com.tw/stock/fibest.jsp",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const json = await res.json();
      const arr = Array.isArray(json?.msgArray) ? json.msgArray : [];
      for (const m of arr) {
        if (!m?.c) continue;
        const z = parseP(m.z);
        const pz = parseP(m.pz);
        const bid = parseBest(m.b);
        const ask = parseBest(m.a);
        const o = parseP(m.o);
        const y = parseP(m.y);
        const v = parseP(m.v);

        const price = z > 0 ? z : pz > 0 ? pz : bid > 0 ? bid : ask > 0 ? ask : o > 0 ? o : y;
        if (price <= 0) continue;

        const prev = y > 0 ? y : price;
        const chg = Number((price - prev).toFixed(2));
        const pct = prev > 0 ? Number(((chg / prev) * 100).toFixed(2)) : 0;

        results.push({
          symbol: String(m.c).toUpperCase(),
          name: m.n ? String(m.n).trim() : String(m.c),
          price,
          change: chg,
          changePct: pct,
          volumeLots: Math.round(v),
        });
      }
    }
  } catch {}

  // 若 TWSE MIS 休市或未取得，使用 Yahoo Finance 補齊
  if (results.length === 0) {
    await Promise.allSettled(
      targetList.slice(0, 5).map(async (item) => {
        try {
          const yfRes = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
              item.symbol + ".TW"
            )}?range=1d&interval=1d`,
            {
              headers: { "User-Agent": "Mozilla/5.0" },
              signal: AbortSignal.timeout(3000),
            }
          );
          if (!yfRes.ok) return;
          const j = await yfRes.json();
          const meta = j?.chart?.result?.[0]?.meta;
          const p = Number(meta?.regularMarketPrice);
          const prev = Number(meta?.chartPreviousClose) || p;
          const vol = Math.round((Number(meta?.regularMarketVolume) || 0) / 1000);
          if (p > 0) {
            const chg = Number((p - prev).toFixed(2));
            const pct = prev > 0 ? Number(((chg / prev) * 100).toFixed(2)) : 0;
            results.push({
              symbol: item.symbol,
              name: item.name,
              price: p,
              change: chg,
              changePct: pct,
              volumeLots: vol,
            });
          }
        } catch {}
      })
    );
  }

  return results;
}

async function runAutoNotify(customSymbols?: string[]) {
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

  const snaps = await fetchRealtimePoolQuotes(customSymbols);
  if (snaps.length === 0) {
    return NextResponse.json(
      { success: false, error: "目前無法取得即時市場報價" },
      { status: 500 }
    );
  }

  // 挑選當下異動最顯著（絕對漲跌幅最大或成交量最大）的領頭標的進行主動通報
  snaps.sort(
    (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct) || b.volumeLots - a.volumeLots
  );
  const top = snaps[0];

  const isUp = top.changePct >= 0;
  let triggerName = "熊霸主動巡檢 · 盤中主力焦點";
  let triggerDesc = `即時成交 ${top.volumeLots.toLocaleString()} 張，目前報價 NT$${top.price} (${
    isUp ? "+" : ""
  }${top.changePct}%)，系統持續鎖定籌碼異動。`;

  if (top.changePct >= 2.0) {
    triggerName = "主力大單敲進 · 強勢放量突破";
    triggerDesc = `盤中帶量強攻 +${top.changePct}%（成交 ${top.volumeLots.toLocaleString()} 張），突破短期均線壓力區，多方動能強勁！`;
  } else if (top.changePct <= -2.0) {
    triggerName = "盤中震盪回測 · 機構支撐防守";
    triggerDesc = `盤中回檔 ${top.changePct}%（成交 ${top.volumeLots.toLocaleString()} 張），進入下方 SMC 機構訂單塊觀察區，注意停損防守紀律。`;
  }

  const radarData: RadarSignalData = {
    symbol: top.symbol,
    name: top.name,
    price: top.price,
    change: top.change,
    changePct: top.changePct,
    volumeLots: top.volumeLots,
    triggerName,
    triggerDesc,
    category: isUp ? "BREAKOUT" : "VOLUME",
  };

  const flexMsg = createRadarAlertFlexCard(radarData);

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

  return NextResponse.json({
    success: true,
    notifiedAt: new Date().toISOString(),
    target: top,
    triggerName,
  });
}

export async function GET() {
  return runAutoNotify();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const symbols = Array.isArray(body?.symbols) ? body.symbols : undefined;
  return runAutoNotify(symbols);
}
