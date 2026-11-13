import { NextRequest, NextResponse } from "next/server";
import {
  enrichAllWithRealtimeTwse,
  getCachedTwMarketData,
  getRealtimeMarketRankings,
  type RankedStockItem,
} from "@/lib/twRankings";

export const dynamic = "force-dynamic";

export { getCachedTwMarketData };
export type { RankedStockItem };

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
  { symbol: "^TWOII", name: "櫃買指數", market: "TW", industry: "大盤指數" },
  { symbol: "^GSPC", name: "S&P 500 指數", market: "US", industry: "美股指數" },
  { symbol: "^IXIC", name: "那斯達克指數", market: "US", industry: "美股指數" },
  { symbol: "^SOX", name: "費城半導體指數", market: "US", industry: "美股指數" },
  { symbol: "^TNX", name: "美債10年殖利率", market: "US", industry: "利率指標" },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "").trim().toLowerCase();
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 16)));
  const sortBy = searchParams.get("sort_by") || "volume";

  // 快速搜尋支援 (涵蓋全市場 1,900+ 上市櫃個股 + 全市場台股 ETF + 美股與跨資產)
  if (q) {
    const marketCache = await getCachedTwMarketData();
    const allTw = [...(marketCache?.twseAll || []), ...(marketCache?.tpexAll || [])];

    const seen = new Set<string>();
    const candidates: {
      symbol: string;
      name: string;
      market: string;
      industry: string;
      score: number;
    }[] = [];

    const scoreItem = (sym: string, name: string): number => {
      const sLow = sym.toLowerCase();
      const nLow = name.toLowerCase();
      if (sLow === q || nLow === q) return 0;
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

    candidates.sort(
      (a, b) => a.score - b.score || a.symbol.length - b.symbol.length || a.symbol.localeCompare(b.symbol)
    );

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
    const marketCache = await getCachedTwMarketData();
    const allTw = [...(marketCache?.twseAll || []), ...(marketCache?.tpexAll || [])];
    const byCode: Record<string, RankedStockItem> = {};
    for (const s of allTw) byCode[s.symbol] = s;

    const targetStocks = [
      { symbol: "2330", name: "台積電", fallbackPrice: 2350, fallbackPct: 0, fallbackVol: 28790, is_etf: false },
      { symbol: "2317", name: "鴻海", fallbackPrice: 245.5, fallbackPct: 0, fallbackVol: 42300, is_etf: false },
      { symbol: "2454", name: "聯發科", fallbackPrice: 1310, fallbackPct: 0, fallbackVol: 9800, is_etf: false },
      { symbol: "2382", name: "廣達", fallbackPrice: 318.0, fallbackPct: 0, fallbackVol: 28400, is_etf: false },
      { symbol: "3231", name: "緯創", fallbackPrice: 118.5, fallbackPct: 0, fallbackVol: 45200, is_etf: false },
      { symbol: "2603", name: "長榮", fallbackPrice: 224.5, fallbackPct: 0, fallbackVol: 34100, is_etf: false },
      { symbol: "2609", name: "陽明", fallbackPrice: 63.5, fallbackPct: 0, fallbackVol: 48200, is_etf: false },
      { symbol: "3017", name: "奇鋐", fallbackPrice: 695, fallbackPct: 0, fallbackVol: 11200, is_etf: false },
      { symbol: "2881", name: "富邦金", fallbackPrice: 91.5, fallbackPct: 0, fallbackVol: 24500, is_etf: false },
      { symbol: "2891", name: "中信金", fallbackPrice: 38.8, fallbackPct: 0, fallbackVol: 39800, is_etf: false },
      { symbol: "2303", name: "聯電", fallbackPrice: 49.8, fallbackPct: 0, fallbackVol: 67896, is_etf: false },
      { symbol: "2409", name: "友達", fallbackPrice: 16.8, fallbackPct: 0, fallbackVol: 56772, is_etf: false },
      { symbol: "0050", name: "元大台灣50", fallbackPrice: 102.5, fallbackPct: 0, fallbackVol: 62000, is_etf: true },
      { symbol: "00878", name: "國泰永續高股息", fallbackPrice: 22.8, fallbackPct: 0, fallbackVol: 66000, is_etf: true },
      { symbol: "00919", name: "群益台灣精選高息", fallbackPrice: 24.1, fallbackPct: 0, fallbackVol: 75000, is_etf: true },
      { symbol: "00929", name: "復華台灣科技優息", fallbackPrice: 18.9, fallbackPct: 0, fallbackVol: 54000, is_etf: true },
      { symbol: "0056", name: "元大高股息", fallbackPrice: 38.2, fallbackPct: 0, fallbackVol: 41000, is_etf: true },
      { symbol: "00981A", name: "主動統一台股增長", fallbackPrice: 26.66, fallbackPct: 0, fallbackVol: 45000, is_etf: true },
      { symbol: "00982A", name: "主動群益台灣強棒", fallbackPrice: 20.66, fallbackPct: 0, fallbackVol: 33200, is_etf: true },
      { symbol: "00679B", name: "元大美債20年", fallbackPrice: 29.4, fallbackPct: 0, fallbackVol: 48000, is_etf: true },
    ];

    const seedList: RankedStockItem[] = targetStocks.map((t) => {
      const cached = byCode[t.symbol];
      if (cached) return cached;
      return {
        symbol: t.symbol,
        name: t.name,
        market: "TWSE",
        price: t.fallbackPrice,
        change: 0,
        change_pct: t.fallbackPct,
        volume: t.fallbackVol * 1000,
        volume_lots: t.fallbackVol,
        turnover_b: Number(((t.fallbackPrice * t.fallbackVol * 1000) / 1e8).toFixed(2)),
        date: "",
        stale: false,
        is_etf: t.is_etf,
      };
    });

    const liveMap = await enrichAllWithRealtimeTwse(seedList);

    const flowItems = targetStocks.map((t) => {
      const live = liveMap.get(t.symbol) || byCode[t.symbol];
      const price = live?.price || t.fallbackPrice;
      const change_pct = live?.change_pct ?? t.fallbackPct;
      const volume = live?.volume_lots || t.fallbackVol;
      const turnoverM = live ? live.turnover_b * 100 : (price * volume) / 1000;
      const net_flow = Math.round(
        turnoverM * (change_pct === 0 ? 0.05 : Math.max(-0.45, Math.min(0.45, change_pct / 6.5)))
      );
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

    return NextResponse.json(flowItems, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  }

  const rankings = await getRealtimeMarketRankings({ limit, sortBy });

  return NextResponse.json(rankings, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
