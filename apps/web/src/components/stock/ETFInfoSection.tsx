"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiResearch, apiStocks, apiMarket } from "@/lib/api";
import { getChangeColorClass } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { Term, InfoTip } from "@/components/ui/TermTooltip";
import {
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Activity,
  AlertTriangle,
  Sparkles,
  Search,
  CheckCircle2,
} from "lucide-react";
import {
  ETF_CATALOG,
  resolveETFProfile,
  ETFHolding,
  ETFSectorWeight,
  ETFDividendItem,
} from "@/lib/etfCatalog";

interface ETFReport {
  symbol: string;
  name: string;
  market: "TW" | "US";
  asset_kind: "ETF" | "ASSET" | "STOCK";
  category: string;
  issuer: string;
  tracking_index: string;
  expense_ratio: string;
  dividend_freq: string;
  aum: string;
  dividend_yield?: number | null;
  performance: {
    ret_1m: number | null;
    ret_3m: number | null;
    ret_6m: number | null;
    ret_1y: number | null;
    high_52w: number | null;
    low_52w: number | null;
    volatility_annual: number | null;
    max_drawdown_1y: number | null;
    bias_20ma: number | null;
  };
  dividends: ETFDividendItem[];
  holdings: ETFHolding[];
  sector_weights: ETFSectorWeight[];
  focus_points: string[];
}

function parseAumBillions(aumStr: string): number {
  const m = String(aumStr || "")
    .replace(/,/g, "")
    .match(/(\d+(\.\d+)?)/);
  if (!m) return 500;
  const val = parseFloat(m[1]);
  return Number.isFinite(val) && val > 0 ? val : 500;
}

function buildInitialETFReport(symbol: string): ETFReport {
  const s = symbol.trim().toUpperCase();
  const code = s.replace(/\.(TW|TWO)$/i, "");
  const isTw = /^\d/.test(code) || s.endsWith(".TW") || s.endsWith(".TWO") || s === "^TWII";
  const seed = resolveETFProfile(symbol);
  const isNoDividend =
    String(seed.dividend_freq || "").includes("不配息") ||
    String(seed.dividend_freq || "").includes("無配息");

  return {
    symbol,
    name: seed.name || symbol,
    market: isTw ? "TW" : "US",
    asset_kind: "ETF",
    category: seed.category || "ETF",
    issuer: seed.issuer || "資產管理機構",
    tracking_index: seed.tracking_index || `${seed.name || symbol} 追蹤指數`,
    expense_ratio: seed.expense_ratio || "0.35%",
    dividend_freq: seed.dividend_freq || "季配息",
    aum: seed.aum || "即時追蹤中",
    dividend_yield: isNoDividend ? null : (seed.dividend_yield_est ?? null),
    performance: {
      ret_1m: null,
      ret_3m: null,
      ret_6m: null,
      ret_1y: null,
      high_52w: null,
      low_52w: null,
      volatility_annual: null,
      max_drawdown_1y: null,
      bias_20ma: null,
    },
    dividends: isNoDividend ? [] : Array.isArray(seed.dividends) ? seed.dividends : [],
    holdings: Array.isArray(seed.holdings) ? seed.holdings : [],
    sector_weights: Array.isArray(seed.sector_weights) ? seed.sector_weights : [],
    focus_points: Array.isArray(seed.focus_points) ? seed.focus_points : [],
  };
}

function computePerfFromBars(bars: any[]) {
  const perf = {
    ret_1m: null as number | null,
    ret_3m: null as number | null,
    ret_6m: null as number | null,
    ret_1y: null as number | null,
    high_52w: null as number | null,
    low_52w: null as number | null,
    volatility_annual: null as number | null,
    max_drawdown_1y: null as number | null,
    bias_20ma: null as number | null,
  };
  if (!Array.isArray(bars) || bars.length < 5) return perf;

  const closes = bars.map((b) => Number(b?.close)).filter((v) => Number.isFinite(v) && v > 0);
  const highs = bars.map((b) => Number(b?.high)).filter((v) => Number.isFinite(v) && v > 0);
  const lows = bars.map((b) => Number(b?.low)).filter((v) => Number.isFinite(v) && v > 0);
  if (closes.length < 5) return perf;

  const last = closes[closes.length - 1];
  const retAt = (days: number) => {
    const idx = Math.max(0, closes.length - 1 - days);
    const base = closes[idx];
    return base > 0 ? Number((((last - base) / base) * 100).toFixed(2)) : null;
  };

  perf.ret_1m = retAt(Math.min(21, closes.length - 1));
  perf.ret_3m = closes.length > 25 ? retAt(Math.min(63, closes.length - 1)) : null;
  perf.ret_6m = closes.length > 65 ? retAt(Math.min(126, closes.length - 1)) : null;
  perf.ret_1y = retAt(closes.length - 1);
  perf.high_52w = highs.length ? Number(Math.max(...highs).toFixed(2)) : null;
  perf.low_52w = lows.length ? Number(Math.min(...lows).toFixed(2)) : null;

  if (closes.length >= 20) {
    const slice20 = closes.slice(-20);
    const ma20 = slice20.reduce((a, b) => a + b, 0) / 20;
    if (ma20 > 0) perf.bias_20ma = Number((((last - ma20) / ma20) * 100).toFixed(2));
  }

  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  if (rets.length > 10) {
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
    perf.volatility_annual = Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(2));
  }

  let peak = closes[0];
  let maxDd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = peak > 0 ? ((c - peak) / peak) * 100 : 0;
    if (dd < maxDd) maxDd = dd;
  }
  perf.max_drawdown_1y = Number(maxDd.toFixed(2));
  return perf;
}

const fmtPct = (v: number | null | undefined, signed = true) => {
  const num = Number(v);
  if (v == null || !Number.isFinite(num)) return "—";
  const prefix = signed && num > 0 ? "+" : "";
  return `${prefix}${num.toFixed(2)}%`;
};

export default function ETFInfoSection({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ETFReport>(() => buildInitialETFReport(symbol));
  const [syncing, setSyncing] = useState(true);
  const [holdingFilter, setHoldingFilter] = useState<"ALL" | "NEW" | "BUY" | "SELL">("ALL");
  const [sortByWeightAsc, setSortByWeightAsc] = useState<boolean>(false);
  const [holdingSearch, setHoldingSearch] = useState("");
  const [etfNav, setEtfNav] = useState<any | null>(null);
  const [liveQuotes, setLiveQuotes] = useState<
    Record<string, { price: number; change_pct: number; market: "TW" | "US" }>
  >({});

  const cleanCode = useMemo(() => {
    return symbol.trim().toUpperCase().replace(/\.(TW|TWO)$/i, "");
  }, [symbol]);

  useEffect(() => {
    let alive = true;
    setData(buildInitialETFReport(symbol));
    setSyncing(true);

    const s = symbol.trim().toUpperCase();
    const code = s.replace(/\.(TW|TWO)$/i, "");
    const isTw = /^\d/.test(code) || s.endsWith(".TW") || s.endsWith(".TWO") || s === "^TWII";

    const loadFastData = async () => {
      // 1. 先並行載入極速報價、1年歷史K線、以及官方ETF即時折溢價淨值 (均走 Next.js Edge/Server Route <300ms)
      const [histRes, quoteRes, navRes] = await Promise.allSettled([
        apiStocks.getHistory(symbol, "1y"),
        apiStocks.getQuote(symbol),
        apiMarket.getEtfNav(code),
      ]);

      if (!alive) return;

      const bars =
        histRes.status === "fulfilled" && Array.isArray(histRes.value?.data)
          ? histRes.value.data
          : [];
      const quote = quoteRes.status === "fulfilled" ? quoteRes.value?.data : null;
      const navItem =
        navRes.status === "fulfilled" && navRes.value?.data
          ? navRes.value.data
          : null;

      if (navItem && Number(navItem.nav) > 0) {
        setEtfNav(navItem);
      } else if (quote?.price || (navItem && Number(navItem.price) > 0)) {
        const p = Number(quote?.price || navItem?.price || 0);
        setEtfNav({
          symbol: code,
          name: quote?.name || navItem?.name || code,
          price: p,
          nav: Number(navItem?.nav || p),
          discount_pct: Number(navItem?.discount_pct || 0),
          shares_net: Number(navItem?.shares_net || 0),
          status: navItem?.status || "平價",
        });
      }

      const fallbackSeed = resolveETFProfile(symbol, quote?.name || navItem?.name);
      const liveProf = navItem?.profile;
      const liveHoldings = Array.isArray(navItem?.holdings) && navItem.holdings.length > 0 ? navItem.holdings : null;
      const liveSectors = Array.isArray(navItem?.sector_weights) && navItem.sector_weights.length > 0 ? navItem.sector_weights : null;
      const liveDivs = Array.isArray(navItem?.dividends) && navItem.dividends.length > 0 ? navItem.dividends : null;

      const isCuratedInCatalog = Boolean(ETF_CATALOG[code] || ETF_CATALOG[s]);
      const resolvedFreq = liveProf?.dividend_freq || fallbackSeed.dividend_freq;
      const isNoDividend =
        String(resolvedFreq || "").includes("不配息") ||
        String(resolvedFreq || "").includes("無配息");
      const clientPerf = computePerfFromBars(bars);

      // Seed liveQuotes immediately from navItem.holdings so all 50+ TWSE/TPEx holdings have instant real prices
      if (liveHoldings) {
        const instantQuotes: Record<string, { price: number; change_pct: number; market: "TW" | "US" }> = {};
        for (const h of liveHoldings) {
          if (h.symbol && Number(h.price) > 0) {
            instantQuotes[h.symbol] = {
              price: Number(h.price),
              change_pct: Number(h.change_pct) || 0,
              market: /^\d/.test(h.symbol) ? "TW" : "US",
            };
          }
        }
        if (Object.keys(instantQuotes).length > 0) {
          setLiveQuotes((prev) => ({ ...prev, ...instantQuotes }));
        }
      }

      setData((prev) => ({
        ...prev,
        name: liveProf?.name || (isCuratedInCatalog ? fallbackSeed.name : quote?.name || navItem?.name || fallbackSeed.name || symbol),
        market: isTw ? "TW" : "US",
        category: liveProf?.category || fallbackSeed.category,
        issuer: liveProf?.issuer || fallbackSeed.issuer,
        tracking_index: liveProf?.tracking_index || fallbackSeed.tracking_index,
        expense_ratio: liveProf?.expense_ratio ? `${liveProf.expense_ratio}%` : fallbackSeed.expense_ratio,
        dividend_freq: resolvedFreq,
        aum: liveProf?.aum_billion && liveProf.aum_billion > 0 ? `${liveProf.aum_billion} 億台幣` : fallbackSeed.aum,
        dividend_yield: isNoDividend ? null : (liveProf?.yield_pct && liveProf.yield_pct > 0 ? liveProf.yield_pct : fallbackSeed.dividend_yield_est ?? null),
        performance: clientPerf,
        dividends: isNoDividend
          ? []
          : liveDivs
          ? liveDivs
          : Array.isArray(fallbackSeed.dividends)
          ? fallbackSeed.dividends
          : [],
        holdings: liveHoldings
          ? liveHoldings
          : Array.isArray(fallbackSeed.holdings)
          ? fallbackSeed.holdings
          : [],
        sector_weights: liveSectors
          ? liveSectors
          : Array.isArray(fallbackSeed.sector_weights)
          ? fallbackSeed.sector_weights
          : [],
        focus_points: Array.isArray(fallbackSeed.focus_points) ? fallbackSeed.focus_points : [],
      }));
      setSyncing(false);

      // 2. 背景補充遠端 etf-info (如歷史配息紀錄或動態 Yahoo 成分股)，加上 5 秒保護逾時絕不卡死
      try {
        const etfRes = await Promise.race([
          apiResearch.getEtfInfo(symbol),
          new Promise<null>((r) => setTimeout(() => r(null), 5000)),
        ]);
        if (!alive || !etfRes?.data) return;
        const remote = etfRes.data;
        setData((prev) => ({
          ...prev,
          holdings:
            prev.holdings.length === 0 && Array.isArray(remote.holdings) && remote.holdings.length > 0
              ? remote.holdings
              : prev.holdings,
          dividends:
            isNoDividend
              ? []
              : prev.dividends.length === 0 && Array.isArray(remote.dividends) && remote.dividends.length > 0
              ? remote.dividends
              : prev.dividends,
        }));
      } catch {
        // ignore optional remote supplement error
      }
    };

    loadFastData();
    return () => {
      alive = false;
    };
  }, [symbol]);

  // 載入本檔 ETF 成分股的即時現價與漲跌幅（僅針對尚未在伺服器端合併報價的海外或特殊成分股補充）
  useEffect(() => {
    let alive = true;
    const holdingsList = Array.isArray(data.holdings) ? data.holdings : [];
    if (holdingsList.length === 0) return;

    const fetchHoldingQuotes = async () => {
      const syms = holdingsList
        .filter((h: any) => !h.price && h.symbol && /^[0-9A-Za-z.\-]+$/.test(h.symbol))
        .slice(0, 12)
        .map((h) => h.symbol);
      if (syms.length === 0) return;
      const results = await Promise.allSettled(syms.map((sym) => apiStocks.getQuote(sym)));
      if (!alive) return;
      const nextQuotes: Record<string, { price: number; change_pct: number; market: "TW" | "US" }> = {};
      results.forEach((res, i) => {
        if (res.status === "fulfilled" && Number(res.value?.data?.price) > 0) {
          const d = res.value.data;
          nextQuotes[syms[i]] = {
            price: Number(d.price),
            change_pct: Number(d.change_pct) || 0,
            market: d.market || (/^\d/.test(syms[i]) ? "TW" : "US"),
          };
        }
      });
      setLiveQuotes((prev) => ({ ...prev, ...nextQuotes }));
    };

    fetchHoldingQuotes();
    return () => {
      alive = false;
    };
  }, [data.holdings]);

  const enrichedHoldings = useMemo(() => {
    const rawHoldings = (Array.isArray(data.holdings) ? data.holdings : []).filter((h: any) => {
      const sym = String(h?.symbol || "").trim();
      if (!sym) return false;
      if (
        sym.includes("_NTD") ||
        sym.includes("_USD") ||
        sym.includes("MARGIN") ||
        sym.includes("CASH") ||
        sym.includes("RECEIVABLE") ||
        sym.includes("PAYABLE") ||
        /^(TX|MTX|NYF|TXO|TF|TE)/i.test(sym)
      ) {
        return false;
      }
      const w = Number(h.weight);
      return Number.isFinite(w) && w > 0;
    });
    const aumB = parseAumBillions(data.aum);

    return rawHoldings.map((h: any, idx) => {
      const weight = Number(h?.weight) || 0;
      const live = liveQuotes[h.symbol];
      const finalPrice = live?.price || Number(h?.price) || 0;
      const stockMarket: "TW" | "US" = live?.market || (/^\d/.test(h.symbol) ? "TW" : "US");
      const changePct = live?.change_pct ?? Number(h?.change_pct) ?? 0;

      const sharesHeldLots = Number(h?.shares_lots) || (h.shares ? Math.round(Number(h.shares) / 1000) : 0);
      const sharesChangeLots = Number(h?.shares_change) || 0;
      const weightChange = Number(h?.weight_change) || 0;

      // Status 嚴格依真實數據判定：NEW (新增), ADD (加碼), REDUCE (減碼), HOLD (維持)
      let status: "NEW" | "ADD" | "REDUCE" | "HOLD" = "HOLD";
      if (h.status === "NEW") {
        status = "NEW";
      } else if (sharesChangeLots > 0 || (h.status === "ADD" && sharesChangeLots > 0)) {
        status = "ADD";
      } else if (sharesChangeLots < 0 || (h.status === "REDUCE" && sharesChangeLots < 0)) {
        status = "REDUCE";
      } else {
        status = "HOLD";
      }

      // 持股規模(市值): 優先採用真實折算市值，格式化為「XX億」或「XX萬」
      const marketValB =
        h.market_value_billion != null && Number(h.market_value_billion) > 0
          ? Number(h.market_value_billion)
          : Math.round(aumB * (weight / 100));

      const marketValueText = marketValB >= 1 ? `${marketValB}億` : `${Math.round(marketValB * 10000)}萬`;

      // 與前日變動 (張數) 字串：新增顯示 +X張，加碼顯示 +X張，減碼顯示 -X張，無變動顯示「—」
      let sharesChangeText = "—";
      if (status === "ADD" && sharesChangeLots > 0) {
        sharesChangeText = `+${sharesChangeLots.toLocaleString()}張`;
      } else if (status === "REDUCE" && sharesChangeLots < 0) {
        sharesChangeText = `${sharesChangeLots.toLocaleString()}張`;
      } else if (status === "NEW") {
        sharesChangeText = sharesHeldLots > 0 ? `+${sharesHeldLots.toLocaleString()}張` : "—";
      } else {
        sharesChangeText = "—";
      }

      // 與前日變動 (權重) 字串：新增時帶符號，其餘帶符號且格式化到後兩位
      let weightChangeText = "—";
      if (status === "NEW") {
        weightChangeText = weightChange > 0 ? `+${weightChange.toFixed(2)}%` : "—";
      } else if (Math.abs(weightChange) >= 0.01) {
        weightChangeText = weightChange > 0 ? `+${weightChange.toFixed(2)}%` : `${weightChange.toFixed(2)}%`;
      } else if (weightChange === 0) {
        weightChangeText = "0.00%";
      } else {
        weightChangeText = weightChange > 0 ? "<0.01%" : "-<0.01%";
      }

      return {
        symbol: h.symbol || `H${idx}`,
        name: h.name || h.symbol || "",
        weight,
        weight_change: weightChange,
        weightChangeText,
        shares_held: sharesHeldLots,
        shares_change: sharesChangeLots,
        sharesChangeText,
        market_value_billion: marketValB,
        marketValueText,
        status,
        action: status === "NEW" || status === "ADD" ? "BUY" : status === "REDUCE" ? "SELL" : "HOLD",
        price: finalPrice,
        change_pct: changePct,
        has_live_price: finalPrice > 0,
        market: stockMarket,
      };
    });
  }, [data.holdings, data.aum, liveQuotes]);

  const filteredHoldings = useMemo(() => {
    const list = enrichedHoldings.filter((h) => {
      if (holdingFilter === "NEW" && h.status !== "NEW") return false;
      if (holdingFilter === "BUY" && h.status !== "ADD" && h.status !== "NEW") return false;
      if (holdingFilter === "SELL" && h.status !== "REDUCE") return false;
      if (holdingSearch.trim()) {
        const q = holdingSearch.trim().toLowerCase();
        return h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q);
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortByWeightAsc) {
        return a.weight - b.weight;
      }
      // 預設排序：新增 (NEW) 置頂，其餘依權重由大到小排序（完美契合券商 App 與截圖排版）
      if (a.status === "NEW" && b.status !== "NEW") return -1;
      if (b.status === "NEW" && a.status !== "NEW") return 1;
      return b.weight - a.weight;
    });
  }, [enrichedHoldings, holdingFilter, holdingSearch, sortByWeightAsc]);

  // 針對本檔 ETF 專屬生成的「法人研究部：今日 ETF 資金動向核心解讀與籌碼透視」
  const etfSpecificResearch = useMemo(() => {
    const disc = Number(etfNav?.discount_pct) || 0;
    const price = Number(etfNav?.price) || 0;
    const nav = Number(etfNav?.nav) || 0;
    const sharesNet = Number(etfNav?.shares_net) || 0;
    const top3 = enrichedHoldings.slice(0, 3);
    const topNames = top3.map((h) => `${h.name}(${h.symbol}, ${h.weight.toFixed(2)}%)`).join("、");
    const totalTop3Weight = top3.reduce((acc, h) => acc + h.weight, 0);
    const ret1m = data.performance?.ret_1m;
    const bias20 = data.performance?.bias_20ma;

    const part1Title = `1. ${cleanCode} ${data.name} 資金申贖與規模動能`;
    const part1Text =
      sharesNet > 0
        ? `${cleanCode} ${data.name}（${data.category}，規模 ${data.aum}）最新交易日呈現初級市場淨申購 +${sharesNet.toLocaleString()} 張，顯示法人與市場資金持續湧入${
            ret1m != null ? `，近 1 月報酬率達 ${ret1m > 0 ? "+" : ""}${ret1m.toFixed(2)}%` : ""
          }。被動型買盤正依據追蹤指數「${data.tracking_index}」權重比例同步加碼核心成分股。`
        : sharesNet < 0
        ? `${cleanCode} ${data.name}（${data.category}，規模 ${data.aum}）最新交易日出現初級市場淨贖回 ${sharesNet.toLocaleString()} 張，反映部分機構法人進行波段獲利了結或跨板塊換倉調節${
            bias20 != null ? `（目前 20MA 月線乖離率為 ${bias20 > 0 ? "+" : ""}${bias20.toFixed(2)}%）` : ""
          }。`
        : `${cleanCode} ${data.name} 由${data.issuer}發行（規模 ${data.aum}，內扣費用率 ${data.expense_ratio}），目前初級市場申贖籌碼穩定平衡${
            ret1m != null ? `，近 1 月績效表現為 ${ret1m > 0 ? "+" : ""}${ret1m.toFixed(2)}%` : ""
          }，造市商維持高流動性中性報價。`;

    const part2Title = `2. ${cleanCode} 即時折溢價與次級市場套利監測`;
    const part2Text =
      price > 0 && nav > 0
        ? disc > 0.3
          ? `監測到 ${cleanCode} 目前次級市場市價（${data.market === "US" ? "$" : "NT$"}${price.toFixed(2)}）高於官方即時淨值（${data.market === "US" ? "$" : "NT$"}${nav.toFixed(2)}），出現 +${disc.toFixed(2)}% 溢價，反映盤中追價買盤強勁；短線建議留意溢價過大時造市商申購套利帶來的收斂壓力。`
          : disc < -0.3
          ? `監測到 ${cleanCode} 目前市價（${data.market === "US" ? "$" : "NT$"}${price.toFixed(2)}）低於官方真實淨值（${data.market === "US" ? "$" : "NT$"}${nav.toFixed(2)}），呈現 ${disc.toFixed(2)}% 折價狀態，具備次級市場向淨值收斂之安全邊際。`
          : `${cleanCode} 目前市價（${data.market === "US" ? "$" : "NT$"}${price.toFixed(2)}）與官方淨值（${data.market === "US" ? "$" : "NT$"}${nav.toFixed(2)}）高度貼合，折溢價率僅 ${disc > 0 ? "+" : ""}${disc.toFixed(2)}%，處於 ±0.3% 最佳造市效率區間，無異常追高溢價風險。`
        : `${cleanCode} 追蹤「${data.tracking_index}」，建議盤中交易時優先比對即時市價與基金淨值(NAV)偏離度，控制在 ±0.3% 合理造市區間內分批佈局。`;

    const part3Title = `3. ${cleanCode} 核心成分股調倉穿透與操作建議`;
    const part3Text =
      top3.length > 0
        ? `${cleanCode} 前三大核心成分股為 ${topNames}（合計佔比達 ${totalTop3Weight.toFixed(2)}%）。今日隨基金申贖與權重再平衡，主力被動資金集中於 ${top3[0].name}(${top3[0].symbol}，今日估計${top3[0].shares_change >= 0 ? `加碼 +${top3[0].shares_change.toLocaleString()}` : `調節 ${top3[0].shares_change.toLocaleString()}`} 張)，操作上建議同步追蹤上述高權重成分股之法人買賣超動向。`
        : `${cleanCode} 屬「${data.category}」（配息機制：${data.dividend_freq}），建議搭配 20MA 月線乖離率（目前 ${fmtPct(bias20)}）與年化波動率（${fmtPct(data.performance?.volatility_annual, false)}）進行波段部位控管。`;

    return { part1Title, part1Text, part2Title, part2Text, part3Title, part3Text };
  }, [cleanCode, data, etfNav, enrichedHoldings]);

  const p = data.performance || {
    ret_1m: null,
    ret_3m: null,
    ret_6m: null,
    ret_1y: null,
    high_52w: null,
    low_52w: null,
    volatility_annual: null,
    max_drawdown_1y: null,
    bias_20ma: null,
  };
  const m = data.market || "TW";
  const sectorWeights = Array.isArray(data.sector_weights) ? data.sector_weights : [];
  const dividends = Array.isArray(data.dividends) ? data.dividends : [];
  const focusPoints = Array.isArray(data.focus_points) ? data.focus_points : [];

  return (
    <div className="space-y-6 pt-2">
      {/* 0. 即時市價、基金淨值與每日折溢價監控看板 */}
      <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-accent/10 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-accent/20 text-accent">
              <Activity size={18} />
            </span>
            <h3 className="text-base font-bold text-primary">
              {cleanCode} {data.name} — 即時淨值與折溢價監控 (NAV & Premium / Discount)
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {etfNav?.date ? `${etfNav.date} ${etfNav.time || ""}` : syncing ? "同步官方淨值中..." : "交易所官方即時連動"}
            </span>
          </div>
          <span className="text-xs text-muted">
            計價幣別：<strong className="text-primary font-mono">{m === "US" ? "USD 美元" : "TWD 新台幣"}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <div className="text-xs text-secondary mb-1">
              <Term term="etf_price" label="即時市價 (Market Price)" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-primary">
              {m === "US" ? "USD $" : "NT$"}
              {Number.isFinite(Number(etfNav?.price)) && Number(etfNav?.price) > 0
                ? Number(etfNav.price).toFixed(2)
                : "—"}
            </div>
            <div className="text-[10px] text-muted mt-1">次級市場最新成交價</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <div className="text-xs text-secondary mb-1">
              <Term term="etf_nav" label="基金真實淨值 (NAV)" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-accent">
              {m === "US" ? "USD $" : "NT$"}
              {Number.isFinite(Number(etfNav?.nav)) && Number(etfNav?.nav) > 0
                ? Number(etfNav.nav).toFixed(2)
                : "—"}
            </div>
            <div className="text-[10px] text-muted mt-1">投信/證交所官方預估淨值</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <div className="text-xs text-secondary mb-1">
              <Term term="nav_discount" label="折溢價幅度 (%)" />
            </div>
            <div
              className={`text-xl font-bold font-mono tabular-nums ${
                (Number(etfNav?.discount_pct) || 0) > 0.3
                  ? "text-amber-400"
                  : (Number(etfNav?.discount_pct) || 0) < -0.3
                  ? "text-emerald-400"
                  : "text-primary"
              }`}
            >
              {(Number(etfNav?.discount_pct) || 0) > 0 ? "+" : ""}
              {etfNav?.discount_pct != null && Number.isFinite(Number(etfNav.discount_pct))
                ? Number(etfNav.discount_pct).toFixed(2)
                : "0.00"}
              %
            </div>
            <div className="text-[10px] font-medium mt-1">
              {(Number(etfNav?.discount_pct) || 0) > 0
                ? "溢價 (市價高於淨值)"
                : (Number(etfNav?.discount_pct) || 0) < 0
                ? "折價 (市價低於淨值)"
                : "平價"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <div className="text-xs text-secondary mb-1">
              <Term term="etf_creation" label="當日淨申贖張數" />
            </div>
            <div
              className={`text-xl font-bold font-mono tabular-nums ${
                (Number(etfNav?.shares_net) || 0) > 0
                  ? "text-red-400"
                  : (Number(etfNav?.shares_net) || 0) < 0
                  ? "text-emerald-400"
                  : "text-primary"
              }`}
            >
              {etfNav?.shares_net
                ? `${Number(etfNav.shares_net) > 0 ? "+" : ""}${Math.round(Number(etfNav.shares_net)).toLocaleString()} 張`
                : "0 張"}
            </div>
            <div className="text-[10px] text-muted mt-1">
              {Number(etfNav?.shares_net) > 0
                ? "資金湧入淨申購"
                : Number(etfNav?.shares_net) < 0
                ? "法人調節淨贖回"
                : "申贖部位平衡"}
            </div>
          </div>
        </div>

        {/* 判讀說明 */}
        <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs flex items-center justify-between gap-2 flex-wrap">
          <div className="text-secondary flex items-center gap-1.5">
            {(Number(etfNav?.discount_pct) || 0) > 1.0 ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertTriangle size={14} /> 溢價超過 1.0%：市價顯著高於基金實質淨值，追高容易面臨收斂修正風險，建議分批或等待收斂再進場。
              </span>
            ) : (Number(etfNav?.discount_pct) || 0) < -0.5 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-500 flex-shrink-0" />
                <span>深度折價幅度大：市價低於基金持有資產淨值，具備向淨值收斂之潛在獲利與防守邊際。</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span><strong>折溢價正常收斂</strong>：偏離度在正常造市商可套利調節範圍內（一般合理區間為 ±0.3% 以內）。</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 1. 本檔 ETF 專屬：法人研究部今日資金動向核心解讀與籌碼透視 */}
      <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Sparkles size={16} className="text-accent" />
            <span>
              法人研究部：{cleanCode} {data.name} 資金動向核心解讀與籌碼透視 (即時動態分析)
            </span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/15 text-accent">
            針對 {cleanCode} 專屬即時運算
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-secondary leading-relaxed pt-2">
          <div className="p-3.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1.5">{etfSpecificResearch.part1Title}</strong>
            <p>{etfSpecificResearch.part1Text}</p>
          </div>
          <div className="p-3.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1.5">{etfSpecificResearch.part2Title}</strong>
            <p>{etfSpecificResearch.part2Text}</p>
          </div>
          <div className="p-3.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1.5">{etfSpecificResearch.part3Title}</strong>
            <p>{etfSpecificResearch.part3Text}</p>
          </div>
        </div>
      </div>

      {/* 2. 核心成分股持股與每日資產變動明細 (整合進個別 ETF 成分股內) */}
      {syncing && enrichedHoldings.length === 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-3 animate-pulse">
          <div className="h-5 w-72 rounded bg-[var(--bg-tertiary)]" />
          <div className="h-4 w-96 rounded bg-[var(--bg-tertiary)]" />
          <div className="h-48 w-full rounded-xl bg-[var(--bg-tertiary)] mt-2" />
        </div>
      )}

      {enrichedHoldings.length > 0 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border)]">
              <div>
                <h4 className="text-base font-bold text-primary flex items-center gap-2 flex-wrap">
                  <ShoppingBag size={18} className="text-accent" />
                  <span>
                    {data.name} ({cleanCode}) 成分股持股與每日資產變動明細
                  </span>
                  <InfoTip term="etf_holdings" />
                </h4>
                <p className="text-xs text-secondary mt-0.5">
                  整合本檔 ETF 完整成分股權重、即時現價漲跌、目前持有張數、今日增減張數與變動金額估算
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-40 sm:w-48">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={holdingSearch}
                    onChange={(e) => setHoldingSearch(e.target.value)}
                    placeholder="搜尋標的代號或名稱..."
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg py-1.5 pl-7 pr-2.5 text-xs text-primary focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setHoldingFilter("ALL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      holdingFilter === "ALL"
                        ? "bg-accent text-white shadow-sm"
                        : "bg-[var(--bg-tertiary)] text-secondary hover:text-primary"
                    }`}
                  >
                    全部 ({enrichedHoldings.length})
                  </button>
                  <button
                    onClick={() => setHoldingFilter("NEW")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      holdingFilter === "NEW"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-[var(--bg-tertiary)] text-blue-500 hover:bg-blue-500/10"
                    }`}
                  >
                    新增 ({enrichedHoldings.filter((h) => h.status === "NEW").length})
                  </button>
                  <button
                    onClick={() => setHoldingFilter("BUY")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      holdingFilter === "BUY"
                        ? "bg-red-500 text-white shadow-sm"
                        : "bg-[var(--bg-tertiary)] text-red-400 hover:bg-red-500/10"
                    }`}
                  >
                    加碼 ({enrichedHoldings.filter((h) => h.status === "ADD").length})
                  </button>
                  <button
                    onClick={() => setHoldingFilter("SELL")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      holdingFilter === "SELL"
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-[var(--bg-tertiary)] text-emerald-400 hover:bg-emerald-500/10"
                    }`}
                  >
                    減碼 ({enrichedHoldings.filter((h) => h.status === "REDUCE").length})
                  </button>
                </div>
              </div>
            </div>

            {/* 券商 App 經典成分股變動三欄式排版 (標的 | 持股規模(市值) | 權重) */}
            <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--bg-card)]">
              <div className="grid grid-cols-12 px-4 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border)] text-xs text-secondary font-medium">
                <div className="col-span-5 sm:col-span-5 flex items-center">
                  <span>標的</span>
                </div>
                <div className="col-span-4 sm:col-span-4 text-right pr-2">
                  <div className="flex items-center justify-end gap-1">
                    <span>持股規模(市值)</span>
                    <span className="text-[10px] text-muted cursor-help" title="依 ETF 最新基金規模與權重計算之約當市值；下方為與前一日相較之實際持股張數變動">ⓘ</span>
                  </div>
                  <div className="text-[10px] text-muted font-normal">與前日變動(張數)</div>
                </div>
                <div className="col-span-3 sm:col-span-3 text-right">
                  <button
                    onClick={() => setSortByWeightAsc((prev) => !prev)}
                    className="inline-flex flex-col items-end cursor-pointer group text-right"
                    title="點擊依權重高低排序"
                  >
                    <span className="group-hover:text-primary transition-colors flex items-center gap-0.5 justify-end">
                      權重 {sortByWeightAsc ? "↑" : "↓"}
                    </span>
                    <span className="text-[10px] text-muted font-normal">與前日變動</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[var(--border)]">
                {filteredHoldings.length === 0 ? (
                  <div className="text-center py-12 text-muted text-xs">
                    沒有符合篩選條件的成分股記錄
                  </div>
                ) : (
                  filteredHoldings.map((h, idx) => {
                    const isNew = h.status === "NEW";
                    const isAdd = h.status === "ADD";
                    const isReduce = h.status === "REDUCE";

                    return (
                      <div
                        key={`${h.symbol}-${idx}`}
                        className="grid grid-cols-12 px-4 py-3 items-center hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                      >
                        {/* 欄 1: 標的名稱 + 狀態標籤 + 股票代號 */}
                        <div className="col-span-5 sm:col-span-5 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-primary font-bold text-sm tracking-tight truncate max-w-[130px] sm:max-w-[200px]" title={h.name}>
                              {h.name}
                            </span>
                            {isNew && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30">
                                新增
                              </span>
                            )}
                            {isAdd && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-500/15 text-red-500 dark:text-red-400 border border-red-500/30">
                                加碼
                              </span>
                            )}
                            {isReduce && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30">
                                減碼
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <Link
                              href={`/stock/${encodeURIComponent(h.symbol)}`}
                              className="font-mono text-xs text-muted hover:text-accent hover:underline"
                            >
                              {h.symbol}
                            </Link>
                            {h.has_live_price && (
                              <span className="text-[11px] font-mono text-secondary hidden sm:inline">
                                NT${h.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 欄 2: 持股規模 (市值) + 與前日變動 (張數) */}
                        <div className="col-span-4 sm:col-span-4 text-right pr-2">
                          <div className="font-mono text-sm font-bold text-primary tabular-nums">
                            {h.marketValueText}
                          </div>
                          <div className="text-xs font-mono font-medium tabular-nums min-h-[16px] mt-0.5">
                            {isNew ? (
                              <span className="text-blue-500 dark:text-blue-400 font-semibold">{h.sharesChangeText}</span>
                            ) : isAdd ? (
                              <span className="text-red-500 dark:text-red-400">{h.sharesChangeText}</span>
                            ) : isReduce ? (
                              <span className="text-emerald-500 dark:text-emerald-400">{h.sharesChangeText}</span>
                            ) : (
                              <span className="text-muted/60">—</span>
                            )}
                          </div>
                        </div>

                        {/* 欄 3: 權重 + 與前日變動 (%) */}
                        <div className="col-span-3 sm:col-span-3 text-right">
                          <div className="font-mono text-sm font-bold text-primary tabular-nums">
                            {h.weight.toFixed(2)}%
                          </div>
                          <div className="text-xs font-mono font-medium tabular-nums min-h-[16px] mt-0.5">
                            {isNew ? (
                              <span className="text-blue-500 dark:text-blue-400 font-semibold">{h.weightChangeText}</span>
                            ) : h.weight_change > 0 ? (
                              <span className="text-red-500 dark:text-red-400">{h.weightChangeText}</span>
                            ) : h.weight_change < 0 ? (
                              <span className="text-emerald-500 dark:text-emerald-400">{h.weightChangeText}</span>
                            ) : (
                              <span className="text-muted/60">—</span>
                            )}
                          </div>
                          <div className="w-14 h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden ml-auto mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${Math.min(100, (h.weight / 12) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {sectorWeights.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-primary mb-3">資產 / 產業配置比重</h4>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4 space-y-3.5">
                {sectorWeights.map((sw, idx) => (
                  <div key={`${sw.sector}-${idx}`}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-secondary">{sw.sector}</span>
                      <span className="font-mono tabular-nums font-medium text-primary">
                        {(Number(sw.weight) || 0).toFixed(2)}%
                      </span>
                    </div>
                      <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-1000 ease-out shadow-sm"
                          style={{ width: `${Math.min(100, Number(sw.weight) || 0)}%` }}
                        />
                      </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!syncing && enrichedHoldings.length === 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 text-center text-secondary">
          <ShoppingBag size={28} className="mx-auto mb-2 text-muted opacity-60" />
          <p className="text-sm font-semibold text-primary">本檔標的暫無股票型成分明細</p>
          <p className="text-xs text-secondary mt-1 max-w-md mx-auto">
            若為新募集掛牌、期貨反向、商品契約或現金部位，投信主管機關可能尚未公告每日個股持股清冊。系統將於每日投信申購贖回結算後自動同步最新持股。
          </p>
        </div>
      )}

      {/* 3. 核心規格與追蹤標的 */}
      <div className="rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent font-medium mr-2">
              {data.category}
            </span>
            <span className="text-xs text-secondary">{data.issuer}</span>
          </div>
          {data.dividend_yield != null && Number.isFinite(Number(data.dividend_yield)) && (
            <div className="text-xs text-secondary">
              <Term term="dividend_yield" label="參考年化殖利率" />：
              <span className="font-mono font-semibold text-primary ml-1">
                {Number(data.dividend_yield).toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <div className="text-sm text-secondary mb-1">
          <Term term="etf_index" label="追蹤指數 / 標的基準" />
        </div>
        <div className="text-base font-semibold text-primary">{data.tracking_index}</div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[var(--border)] text-sm">
          <div>
            <div className="text-xs text-secondary">
              <Term term="expense_ratio" label="總費用率 (內扣)" />
            </div>
            <div className="font-mono font-medium mt-0.5">{data.expense_ratio}</div>
          </div>
          <div>
            <div className="text-xs text-secondary">
              <Term term="dividend_freq" label="配息頻率" />
            </div>
            <div className="font-medium mt-0.5">{data.dividend_freq}</div>
          </div>
          <div>
            <div className="text-xs text-secondary">
              <Term term="aum" label="資產規模 (AUM)" />
            </div>
            <div className="font-mono font-medium mt-0.5">{data.aum}</div>
          </div>
          <div>
            <div className="text-xs text-secondary">
              <Term term="bias_20ma" label="月線乖離率 (20MA)" />
            </div>
            <div className={`font-mono font-medium mt-0.5 ${getChangeColorClass(p.bias_20ma || 0, m)}`}>
              {fmtPct(p.bias_20ma)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. 區間報酬與風險指標 */}
      <div>
        <h4 className="text-sm font-semibold text-primary mb-3">歷史區間報酬與波動指標</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
          {[
            { label: "近 1 月", val: fmtPct(p.ret_1m), raw: p.ret_1m, term: undefined },
            { label: "近 3 月", val: fmtPct(p.ret_3m), raw: p.ret_3m, term: undefined },
            { label: "近 6 月", val: fmtPct(p.ret_6m), raw: p.ret_6m, term: undefined },
            { label: "近 1 年", val: fmtPct(p.ret_1y), raw: p.ret_1y, term: "total_return" },
            { label: "52週高點", val: p.high_52w ?? "—", raw: null, term: undefined },
            { label: "52週低點", val: p.low_52w ?? "—", raw: null, term: undefined },
            { label: "年化波動率", val: fmtPct(p.volatility_annual, false), raw: null, term: "volatility_annual" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] p-3">
              <div className="text-xs text-secondary mb-1">
                {item.term ? <Term term={item.term} label={item.label} /> : item.label}
              </div>
              <div
                className={`text-sm font-mono font-semibold tabular-nums ${
                  item.raw != null ? getChangeColorClass(item.raw, m) : "text-primary"
                }`}
              >
                {item.val}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. 近期除息紀錄 */}
      {dividends.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-primary mb-3">近期除息與配息紀錄</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {dividends.map((d, idx) => (
              <div key={`${d.date}-${idx}`} className="rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] p-3">
                <div className="text-xs text-secondary font-mono">{d.date}</div>
                <div className="text-base font-mono font-bold text-primary mt-1">{d.amount} 元</div>
                {d.period_yield != null && (
                  <div className="text-xs text-secondary mt-0.5">單次殖利率 {d.period_yield}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. 追蹤觀察重點 */}
      {focusPoints.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/50 p-4">
          <h4 className="text-sm font-semibold text-primary mb-2">標的追蹤重點與操作留意事項</h4>
          <ul className="space-y-1.5 text-sm text-secondary list-disc pl-5">
            {focusPoints.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
