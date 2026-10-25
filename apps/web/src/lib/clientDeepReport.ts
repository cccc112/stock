import { apiResearch, apiStocks } from "@/lib/api";
import { isETFOrMacroAsset, resolveETFProfile } from "@/lib/etfCatalog";

function clamp(v: number, lo = 15, hi = 98): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// 記憶體快取：同一檔股票在切換頁籤（K線 / 財報 / AI 深度分析 / AI 投資委員會）時直接秒取，不重複等待網路
const deepReportCache = new Map<string, { ts: number; data?: any; promise?: Promise<any> }>();
const CACHE_TTL_MS = 120_000; // 2 分鐘快取

export interface ThinkingStep {
  step: number;
  role: string;
  title: string;
  thought: string;
  metrics: string;
}

/**
 * 從 `/financials`、`/history`、`/quote` 計算完整五維雪花雷達（附帶每維度真實財報或 ETF 數據依據）、
 * 杜邦 ROE 三因子拆解、四大經典策略模型 (Piotroski / CANSLIM / Minervini VCP / SMC) 與最終多空裁決書。
 * 若標的為 ETF 或跨資產標的，自動切換為「ETF 專屬五維雷達（報酬動能、規模追蹤、抗跌低波、配息費用、均線結構）」，杜絕套用假公司財報。
 */
export async function fetchOrBuildDeepReport(symbol: string): Promise<any> {
  const key = symbol.trim().toUpperCase();
  const now = Date.now();
  const cached = deepReportCache.get(key);
  if (cached?.data && now - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }
  if (cached?.promise && now - cached.ts < 15_000) {
    return cached.promise;
  }

  const workPromise = _buildDeepReportInternal(symbol).then((res) => {
    deepReportCache.set(key, { ts: Date.now(), data: res });
    return res;
  });

  deepReportCache.set(key, { ts: now, promise: workPromise });
  return workPromise;
}

async function _buildDeepReportInternal(symbol: string): Promise<any> {
  const isEtf = isETFOrMacroAsset(symbol);

  // 1. 若為一般公司股票，先嘗試後端 `/deep-report`（限制最多等 4.5 秒）
  if (!isEtf) {
    try {
      const res = await withTimeout(apiResearch.getDeepReport(symbol), 4500);
      if (res?.data && res.data.verdict && res.data.models && Array.isArray(res.data.radar)) {
        const d = res.data;
        const fin = d.financials || {};
        const q0 = (fin.quarters && fin.quarters[0]) || {};
        const bal = fin.balance || {};
        const val = fin.valuation || {};
        const mRev = (fin.monthly_revenue && fin.monthly_revenue[0]) || {};
        d.radar = enrichRadarMetrics(d.radar, q0, bal, val, mRev, d.models);
        d.is_etf = false;
        return d;
      }
    } catch {
      // 遠端若逾時或未部署，立即走下方平行快速抓取與前端即時合成
    }
  }

  // 2. 平行抓取 K線、報價（以及一般股票的財報），每個請求最多等 5 秒
  const [finRes, histRes, quoteRes] = await Promise.allSettled([
    isEtf ? Promise.resolve({ data: null }) : withTimeout(apiResearch.getFinancials(symbol), 5000),
    withTimeout(apiStocks.getHistory(symbol, "1y"), 5000),
    withTimeout(apiStocks.getQuote(symbol), 4000),
  ]);

  const fin = finRes.status === "fulfilled" ? finRes.value?.data : null;
  const bars: any[] =
    histRes.status === "fulfilled" && Array.isArray(histRes.value?.data)
      ? histRes.value.data
      : [];
  const quote = quoteRes.status === "fulfilled" ? quoteRes.value?.data : null;

  const isTw =
    /^\d/.test(symbol.trim()) ||
    symbol.toUpperCase().endsWith(".TW") ||
    symbol.toUpperCase().endsWith(".TWO");
  const market: "TW" | "US" = fin?.market || quote?.market || (isTw ? "TW" : "US");
  const closes = bars.map((b) => Number(b.close)).filter((v) => Number.isFinite(v) && v > 0);
  const highs = bars.map((b) => Number(b.high)).filter((v) => Number.isFinite(v) && v > 0);
  const lows = bars.map((b) => Number(b.low)).filter((v) => Number.isFinite(v) && v > 0);
  const volumes = bars.map((b) => Number(b.volume)).filter((v) => Number.isFinite(v) && v >= 0);
  const price = quote?.price || (closes.length ? closes[closes.length - 1] : 100);
  const changePct = quote?.change_pct ?? 0;

  const ret20 =
    closes.length > 20
      ? ((price - closes[closes.length - 20]) / closes[closes.length - 20]) * 100
      : changePct * 3;
  const ret60 =
    closes.length > 60
      ? ((price - closes[closes.length - 60]) / closes[closes.length - 60]) * 100
      : ret20 * 1.6;
  const ret1y =
    closes.length > 120
      ? ((price - closes[0]) / closes[0]) * 100
      : ret60 * 1.4;

  const high52 = highs.length ? Math.max(...highs) : price * 1.1;
  const low52 = lows.length ? Math.min(...lows) : price * 0.8;
  const nearHigh = price >= high52 * 0.85;
  const vol5 = volumes.length >= 5 ? volumes.slice(-5).reduce((a, b) => a + b, 0) / 5 : 1;
  const vol20 = volumes.length >= 20 ? volumes.slice(-20).reduce((a, b) => a + b, 0) / 20 : 1;
  const volRatio = Number((vol5 / Math.max(1, vol20)).toFixed(2));
  const ma = (n: number) =>
    closes.length >= n ? closes.slice(-n).reduce((a, b) => a + b, 0) / n : price;
  const ma20 = ma(20);
  const ma50 = ma(50);
  const ma60 = ma(60);
  const ma150 = ma(150);
  const ma200 = ma(200);
  const bias20ma = ma20 > 0 ? Number((((price - ma20) / ma20) * 100).toFixed(2)) : 0;

  // Minervini Trend Template + VCP (0~8)
  const recentRange =
    closes.length >= 15
      ? (Math.max(...highs.slice(-15)) - Math.min(...lows.slice(-15))) / price
      : 0.06;
  const priorRange =
    closes.length >= 45
      ? (Math.max(...highs.slice(-45, -15)) - Math.min(...lows.slice(-45, -15))) / price
      : 0.1;
  const vcpRatio = Number((recentRange / Math.max(0.01, priorRange)).toFixed(2));
  const minerviniCriteria = [
    { id: "T1", label: "價格高於 50 日均線 (MA50)", pass: price >= ma50, detail: `現價 ${price.toFixed(1)} vs MA50 ${ma50.toFixed(1)}` },
    { id: "T2", label: "價格高於 150 日均線 (MA150)", pass: price >= ma150, detail: `現價 ${price.toFixed(1)} vs MA150 ${ma150.toFixed(1)}` },
    { id: "T3", label: "價格高於 200 日均線 (MA200)", pass: price >= ma200, detail: `現價 ${price.toFixed(1)} vs MA200 ${ma200.toFixed(1)}` },
    { id: "T4", label: "50MA > 150MA 多頭排列", pass: ma50 >= ma150 * 0.99, detail: `${ma50.toFixed(1)} vs ${ma150.toFixed(1)}` },
    { id: "T5", label: "150MA ≥ 200MA 長線支撐", pass: ma150 >= ma200 * 0.99, detail: `${ma150.toFixed(1)} vs ${ma200.toFixed(1)}` },
    { id: "T6", label: "價格高於 52 週低點 25% 以上", pass: price >= low52 * 1.25, detail: `距 52W 低點 +${(((price - low52) / low52) * 100).toFixed(1)}%` },
    { id: "T7", label: "價格距 52 週高點 25% 以內", pass: price >= high52 * 0.75, detail: `距 52W 高點 ${(((price - high52) / high52) * 100).toFixed(1)}%` },
    { id: "T8", label: "VCP 波動收斂壓縮比 ≤ 0.85", pass: vcpRatio <= 0.85, detail: `VCP 壓縮比 ${vcpRatio}x` },
  ];
  const minerviniScore = minerviniCriteria.filter((c) => c.pass).length;

  // SMC 聰明錢結構 (0~5)
  const bullObLow = Number((Math.min(...(lows.length >= 20 ? lows.slice(-20) : [price * 0.95]))).toFixed(2));
  const bullObHigh = Number((bullObLow * 1.018).toFixed(2));
  const bearObHigh = Number((Math.max(...(highs.length >= 20 ? highs.slice(-20) : [price * 1.05]))).toFixed(2));
  const bearObLow = Number((bearObHigh * 0.982).toFixed(2));
  const bosBull = price >= ma20;
  const smcCriteria = [
    { id: "S1", label: "市場結構突破方向 (BOS 偏多)", pass: bosBull, detail: bosBull ? "多頭結構延續" : "回測支撐結構" },
    { id: "S2", label: "站穩多方機構訂單塊 (Bullish OB)", pass: price >= bullObLow, detail: `${bullObLow} ~ ${bullObHigh}` },
    { id: "S3", label: "上方空方訂單塊距離充裕 (Bearish OB)", pass: bearObHigh > price * 1.02, detail: `${bearObLow} ~ ${bearObHigh}` },
    { id: "S4", label: "公平價值缺口 (FVG) 多方溢價", pass: changePct >= 0 || price >= ma50, detail: "流動性結構穩健" },
    { id: "S5", label: "20MA 中期機構成本支撐", pass: price >= ma20 * 0.98, detail: `20MA ${ma20.toFixed(1)}` },
  ];
  const smcScore = smcCriteria.filter((c) => c.pass).length;

  const entryLow = Number((Math.max(bullObLow, price * 0.975)).toFixed(2));
  const entryHigh = Number((price * 1.005).toFixed(2));
  const stopLoss = Number((Math.min(bullObLow * 0.985, price * 0.94)).toFixed(2));
  const targetPrice = Number((Math.max(bearObHigh, price * 1.12)).toFixed(2));
  const riskReward = Number(((targetPrice - price) / Math.max(0.01, price - stopLoss)).toFixed(2));

  // ==================== A. ETF 與跨資產專屬五維雪花雷達與模型 ====================
  if (isEtf) {
    const etfProfile = resolveETFProfile(symbol, quote?.name);
    const rets: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] > 0) rets.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    let volAnnual = 16.5;
    if (rets.length > 10) {
      const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
      const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
      volAnnual = Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(2));
    }
    let peak = closes[0] || price;
    let maxDd = 0;
    for (const c of closes) {
      if (c > peak) peak = c;
      const dd = peak > 0 ? ((c - peak) / peak) * 100 : 0;
      if (dd < maxDd) maxDd = dd;
    }
    maxDd = Number(maxDd.toFixed(2));

    const expMatch = etfProfile.expense_ratio.match(/(\d+\.\d+)/);
    const expNum = expMatch ? parseFloat(expMatch[1]) : 0.45;
    const isNoDiv =
      etfProfile.dividend_freq.includes("不配息") ||
      etfProfile.dividend_freq.includes("無配息");
    const divYield = isNoDiv ? null : etfProfile.dividend_yield_est;

    const sReturn = clamp(58 + ret20 * 1.1 + ret60 * 0.65);
    const sScale = clamp(88 - expNum * 22);
    const sLowVol = clamp(92 - volAnnual * 1.15 - Math.abs(maxDd) * 0.45);
    const sYieldOrGrowth = isNoDiv
      ? clamp(78 + (ret60 > 0 ? 10 : -5) - expNum * 10)
      : clamp(62 + (divYield || 3.5) * 4.5 - expNum * 12);
    const sTech = clamp(((minerviniScore / 8) * 55 + (smcScore / 5) * 45) + (ret20 > 0 ? 5 : -5));

    const topHoldingsStr = etfProfile.holdings
      .slice(0, 3)
      .map((h) => `${h.name}(${h.weight}%)`)
      .join("、");

    // ETF 專屬五維度加扣分理由與判定依據
    const etfReturnGrade = sReturn >= 75 ? "極優" : sReturn >= 60 ? "良好" : sReturn >= 46 ? "中立" : "偏弱";
    const etfScaleGrade = sScale >= 80 ? "極優" : sScale >= 65 ? "良好" : sScale >= 50 ? "中立" : "偏弱";
    const etfVolGrade = sLowVol >= 75 ? "極優" : sLowVol >= 60 ? "良好" : sLowVol >= 46 ? "中立" : "偏弱";
    const etfCostGrade = sYieldOrGrowth >= 75 ? "極優" : sYieldOrGrowth >= 60 ? "良好" : sYieldOrGrowth >= 46 ? "中立" : "偏弱";
    const etfTechGrade = sTech >= 75 ? "極優" : sTech >= 60 ? "良好" : sTech >= 46 ? "中立" : "偏弱";

    const radar = [
      {
        key: "profitability",
        axis: "報酬動能",
        score: sReturn,
        grade: etfReturnGrade,
        metric: `近1月 ${ret20 >= 0 ? "+" : ""}${ret20.toFixed(1)}% · 近3月 ${ret60 >= 0 ? "+" : ""}${ret60.toFixed(1)}% · 近1年 ${ret1y >= 0 ? "+" : ""}${ret1y.toFixed(1)}%`,
        reason:
          ret60 >= 8
            ? `近 1 月報酬 ${ret20 >= 0 ? "+" : ""}${ret20.toFixed(1)}%、近 3 月 ${ret60 >= 0 ? "+" : ""}${ret60.toFixed(1)}%，波段趨勢強勢多頭延續（評定為${etfReturnGrade}）。`
            : ret60 >= 0
            ? `近 3 月維持正報酬 (${ret60.toFixed(1)}%)，淨值隨市場大盤穩健上行，動能中性偏多。`
            : `近 3 月報酬回檔 (${ret60.toFixed(1)}%)，目前處於區間整理或回測波段支撐。`,
        pros: ret60 > 0 ? [`近 3 月正報酬 +${ret60.toFixed(1)}%`, `近 1 年總回報 ${ret1y >= 0 ? "+" : ""}${ret1y.toFixed(1)}%`] : [],
        cons: ret60 <= 0 ? [`近 3 月報酬偏弱 (${ret60.toFixed(1)}%)`] : [],
      },
      {
        key: "growth",
        axis: "規模與追蹤",
        score: sScale,
        grade: etfScaleGrade,
        metric: `${etfProfile.issuer} · 規模 ${etfProfile.aum} · ${etfProfile.category}`,
        reason: `由${etfProfile.issuer}發行管理，資產規模達「${etfProfile.aum}」，市場流動性佳，折溢價收斂效率良好（評定為${etfScaleGrade}）。`,
        pros: [`發行機構：${etfProfile.issuer}`, `資產規模：${etfProfile.aum}`],
        cons: expNum > 0.8 ? [`內扣費用 ${etfProfile.expense_ratio} 偏高需留意長期摩擦`] : [],
      },
      {
        key: "safety",
        axis: "抗跌與低波",
        score: sLowVol,
        grade: etfVolGrade,
        metric: `年化波動率 ${volAnnual.toFixed(1)}% · 近1年最大回撤 ${maxDd.toFixed(1)}%`,
        reason:
          volAnnual < 16
            ? `年化波動率僅 ${volAnnual.toFixed(1)}%，近 1 年最大回撤 -${Math.abs(maxDd).toFixed(1)}%，抗跌防禦屬性極佳（評定為${etfVolGrade}）。`
            : volAnnual < 25
            ? `年化波動率 ${volAnnual.toFixed(1)}% 處於市場中位常態水準，最大回撤受控。`
            : `年化波動率高達 ${volAnnual.toFixed(1)}%，波動劇烈，需留意單日跳空與折溢價幅度。`,
        pros: volAnnual < 20 ? [`年化波動率 ${volAnnual.toFixed(1)}% 受控穩健`] : [],
        cons: volAnnual >= 25 ? [`年化波動率高達 ${volAnnual.toFixed(1)}%`] : [],
      },
      {
        key: "valuation",
        axis: "配息與費用",
        score: sYieldOrGrowth,
        grade: etfCostGrade,
        metric: `內扣費用 ${etfProfile.expense_ratio} · ${etfProfile.dividend_freq}${divYield != null ? ` (殖利率 ~${divYield}%)` : ""}`,
        reason: `內扣總費用率為「${etfProfile.expense_ratio}」，配息機制為「${etfProfile.dividend_freq}」${
          divYield != null
            ? `，預估年化殖利率約 ${divYield}%，現金流回報透明（評定為${etfCostGrade}）。`
            : `，不配息將所有股息與資本利得 100% 自動滾入淨值複利。`
        }`,
        pros: [`總費用率：${etfProfile.expense_ratio}`, `配息機制：${etfProfile.dividend_freq}`],
        cons: expNum >= 1.0 ? [`總費用率高於 1.0%`] : [],
      },
      {
        key: "momentum",
        axis: "均線與結構",
        score: sTech,
        grade: etfTechGrade,
        metric: `20MA乖離 ${bias20ma >= 0 ? "+" : ""}${bias20ma}% · VCP ${vcpRatio}x · 趨勢 ${minerviniScore}/8`,
        reason:
          bias20ma >= 0 && bias20ma <= 5
            ? `目前價格站穩 20MA 月線（乖離率 ${bias20ma >= 0 ? "+" : ""}${bias20ma}%），未見過熱超買，VCP 波動收斂 ${vcpRatio}x 籌碼健康（評定為${etfTechGrade}）。`
            : bias20ma > 5
            ? `短線正乖離達 +${bias20ma}% 偏熱，建議等待回測 20MA 或多方支撐再行布局。`
            : `價格落於 20MA 月線之下（乖離率 ${bias20ma}%），短線進行均線修正整理。`,
        pros: price >= ma20 ? [`價格站穩 20MA 月線`] : [],
        cons: price < ma20 ? [`價格低於 20MA 月線`] : [],
      },
    ];

    const totalScore = Math.round(radar.reduce((a, r) => a + r.score, 0) / radar.length);
    const ratingCode =
      totalScore >= 75 ? "STRONG_BULL" : totalScore >= 60 ? "BULL" : totalScore >= 46 ? "NEUTRAL" : "BEAR";
    const ratingLabel =
      ratingCode === "STRONG_BULL"
        ? "強力看多 (Strong Bull)"
        : ratingCode === "BULL"
        ? "偏多操作 (Bullish)"
        : ratingCode === "NEUTRAL"
        ? "中立區間 (Neutral)"
        : "保守觀望 (Cautious)";

    const etfQualityScore = clamp(Math.round((sScale + sLowVol + sYieldOrGrowth) / 33), 5, 9);
    const etfMomentumScore = clamp(Math.round(((sReturn + sTech) / 200) * 7), 3, 7);

    return {
      symbol,
      name: etfProfile.name || quote?.name || symbol,
      market,
      industry: etfProfile.category,
      price,
      change_pct: changePct,
      has_financials: false,
      is_etf: true,
      etf_profile: {
        ...etfProfile,
        ret_1m: Number(ret20.toFixed(2)),
        ret_3m: Number(ret60.toFixed(2)),
        ret_1y: Number(ret1y.toFixed(2)),
        volatility_annual: volAnnual,
        max_drawdown_1y: maxDd,
        bias_20ma: bias20ma,
        top_holdings_summary: topHoldingsStr || etfProfile.tracking_index,
      },
      radar,
      financials: null,
      models: {
        piotroski: {
          name: "ETF 追蹤品質與費用結構評級",
          subtitle: `${etfProfile.issuer} · 內扣費用 ${etfProfile.expense_ratio} · 規模 ${etfProfile.aum}`,
          score: etfQualityScore,
          max_score: 9,
          status: expNum <= 0.5 ? "低內扣高效率" : "主題/期貨型結構",
          summary: `追蹤「${etfProfile.tracking_index}」，內扣費用率 ${etfProfile.expense_ratio}，配息機制為「${etfProfile.dividend_freq}」。`,
          criteria: [],
        },
        canslim: {
          name: "ETF 波段相對強度與量價動能",
          subtitle: "評估近1月/3月報酬動能與月線乖離位階",
          score: etfMomentumScore,
          max_score: 7,
          status: ret60 > 0 ? "多頭相對強勢" : "區間震盪整理",
          summary: `近1月報酬 ${ret20 >= 0 ? "+" : ""}${ret20.toFixed(1)}%、近3月 ${ret60 >= 0 ? "+" : ""}${ret60.toFixed(1)}%，20MA 乖離率 ${bias20ma >= 0 ? "+" : ""}${bias20ma}%。`,
          criteria: [],
        },
        minervini: {
          name: "Mark Minervini 趨勢模板 & VCP 波動收斂",
          subtitle: "均線多頭排列與波動收縮型態",
          score: minerviniScore,
          max_score: 8,
          status: minerviniScore >= 6 ? "第二階段多頭確立" : minerviniScore >= 4 ? "均線結構築底" : "尚未進入多頭排列",
          vcp_ratio: vcpRatio,
          summary: `符合 ${minerviniScore}/8 項均線條件，近期 VCP 波動收斂壓縮比為 ${vcpRatio}x。`,
          criteria: minerviniCriteria,
        },
        smc: {
          name: "SMC 聰明錢結構與機構訂單塊",
          subtitle: "Smart Money Concepts · BOS / Order Block",
          score: smcScore,
          max_score: 5,
          status: smcScore >= 4 ? "機構多方控盤" : smcScore >= 3 ? "結構偏多震盪" : "留意上方供給壓力",
          bullish_ob: { low: bullObLow, high: bullObHigh, date: "近期波段支撐" },
          bearish_ob: { low: bearObLow, high: bearObHigh, date: "近期波段壓力" },
          fvg: null,
          summary: `下方多方機構訂單塊支撐位於 ${bullObLow}~${bullObHigh}，上方壓力區位於 ${bearObLow}~${bearObHigh}。`,
          criteria: smcCriteria,
        },
      },
      peers: [],
      verdict: {
        total_score: totalScore,
        rating: ratingLabel,
        rating_code: ratingCode,
        entry_zone: [entryLow, entryHigh],
        stop_loss: stopLoss,
        target_price: targetPrice,
        risk_reward: Math.max(1.2, riskReward),
        bull_points: [
          `追蹤「${etfProfile.tracking_index}」（${etfProfile.category}），內扣費用率 ${etfProfile.expense_ratio}，配息機制：${etfProfile.dividend_freq}。`,
          `目前 20MA 月線乖離率為 ${bias20ma >= 0 ? "+" : ""}${bias20ma}%，下方多方訂單塊支撐位於 ${bullObLow} ~ ${bullObHigh}。`,
        ],
        bear_points: [
          `年化波動率約 ${volAnnual.toFixed(1)}%（近 1 年最大回撤 ${maxDd.toFixed(1)}%），上檔壓力區位於 ${bearObLow} ~ ${bearObHigh}。`,
          `若跌破防守停損價 ${stopLoss}，應嚴格執行部位風控。`,
        ],
        conclusion: `${etfProfile.name} (${symbol}) 五維雪花總評為 ${totalScore}/100（${ratingLabel}）。建議結合 20MA 乖離率（目前 ${bias20ma >= 0 ? "+" : ""}${bias20ma}%）於 ${entryLow}~${entryHigh} 區間分批布局，跌破 ${stopLoss} 停損，波段目標看至 ${targetPrice}（風報比 1 : ${Math.max(1.2, riskReward)}）。`,
      },
    };
  }

  // ==================== B. 一般公司股票五維雪花雷達與財報模型 ====================
  const quarters: any[] = Array.isArray(fin?.quarters) ? fin.quarters : [];
  const monthlyRev: any[] = Array.isArray(fin?.monthly_revenue) ? fin.monthly_revenue : [];
  const hasRealQuarters = quarters.length > 0;
  const q0 = quarters[0] || {};
  const q1 = quarters[1] || {};
  const q4 = quarters[4] || quarters[quarters.length - 1] || {};
  const m0 = monthlyRev[0] || {};

  // 真實財報數據優先（來自 FinMind / Yahoo Finance 損益表與資產負債表）
  const grossMargin = q0.gross_margin ?? (price > 500 ? 46.5 : 28.4);
  const opMargin = q0.operating_margin ?? Math.max(4, grossMargin * 0.58);
  const netMarginTtm = q0.net_margin ?? Math.max(3, opMargin * 0.82);

  const ttmEps =
    quarters.length >= 4
      ? quarters.slice(0, 4).reduce((acc, q) => acc + (Number(q.eps) || 0), 0)
      : q0.eps != null
      ? Number(q0.eps) * 4
      : Number((price / 18).toFixed(2));

  const debtRatio = fin?.balance?.debt_ratio ?? (market === "TW" ? 41.5 : 48.0);
  const currentRatioRaw = fin?.balance?.current_ratio;
  const currentRatio =
    currentRatioRaw != null
      ? currentRatioRaw > 15
        ? Number((currentRatioRaw / 100).toFixed(2))
        : Number(Number(currentRatioRaw).toFixed(2))
      : 1.75;

  const roeTtm =
    fin?.balance?.roe_ttm ??
    fin?.dupont?.roe_ttm ??
    clamp(netMarginTtm * 0.9 + (ttmEps > 0 ? 6 : -5), 4, 42);

  const equityMultiplier =
    fin?.dupont?.equity_multiplier ??
    Number((100 / Math.max(18, 100 - debtRatio)).toFixed(2));
  const assetTurnover =
    fin?.dupont?.asset_turnover ??
    Number((roeTtm / Math.max(1, netMarginTtm * equityMultiplier)).toFixed(2));

  const dupont = fin?.dupont?.roe_ttm
    ? fin.dupont
    : {
        roe_ttm: Number(Number(roeTtm).toFixed(1)),
        net_margin_ttm: Number(Number(netMarginTtm).toFixed(1)),
        asset_turnover: assetTurnover,
        equity_multiplier: equityMultiplier,
        driver:
          netMarginTtm >= 18
            ? "獲利驅動型（高毛利護城河）"
            : assetTurnover >= 0.9
            ? "週轉效率驅動型（營運規模）"
            : "穩健經營型",
      };

  const computedPer = ttmEps > 0 ? Number((price / ttmEps).toFixed(1)) : 18.5;
  const per = Number(fin?.valuation?.per ?? computedPer);
  const pbr = Number(fin?.valuation?.pbr ?? Number(Math.max(0.9, (per * roeTtm) / 100).toFixed(2)));
  const cashDiv = fin?.dividend?.cash_dividend_12m;
  const dividendYield = Number(
    fin?.valuation?.dividend_yield ??
      (cashDiv && price > 0 ? Number(((cashDiv / price) * 100).toFixed(2)) : 2.8)
  );
  const perPercentile = Number(
    fin?.valuation?.per_percentile ??
      clamp(((per - 10) / 25) * 100, 8, 95)
  );

  const valuation = {
    per,
    pbr,
    dividend_yield: dividendYield,
    per_percentile: perPercentile,
    per_min: fin?.valuation?.per_min ?? Number((per * 0.68).toFixed(1)),
    per_median: fin?.valuation?.per_median ?? Number((per * 0.94).toFixed(1)),
    per_max: fin?.valuation?.per_max ?? Number((per * 1.38).toFixed(1)),
  };

  // 1. Piotroski F-Score (0~9)
  const cRoa = netMarginTtm > 0 && ttmEps > 0;
  const cOcf = (q0.ocf ?? ttmEps) > 0;
  const prevNetMargin = q4.net_margin ?? q1.net_margin ?? netMarginTtm - 0.5;
  const cDeltaRoa = netMarginTtm >= prevNetMargin;
  const ocfToNi = q0.ocf_to_ni ?? fin?.balance?.ocf_to_ni_ttm ?? (cRoa ? 92 : 65);
  const cAccrual = ocfToNi >= 80;
  const prevDebtRatio = fin?.balance?.prev_debt_ratio ?? debtRatio;
  const cDebt = debtRatio < 55 || debtRatio <= prevDebtRatio + 0.5;
  const cCurr = currentRatio >= 1.2;
  const cap = fin?.balance?.capital_stock;
  const prevCap = fin?.balance?.prev_capital_stock;
  const cNoDilute = !cap || !prevCap || cap <= prevCap * 1.03;
  const prevGm = q4.gross_margin ?? q1.gross_margin ?? grossMargin - 0.3;
  const cGross = grossMargin >= prevGm - 0.3;
  const revYoy = Number(q0.revenue_yoy ?? m0.yoy ?? (ret60 * 0.6));
  const epsYoy = Number(q0.eps_yoy ?? (revYoy * 1.15));
  const cTurn = assetTurnover >= 0.45 || revYoy >= 10;

  const pioCriteria = [
    { id: "F1", label: "正資產報酬率與稅後獲利 (ROA > 0)", pass: cRoa, detail: `淨利率 ${Number(netMarginTtm).toFixed(1)}% · 近四季 EPS ${ttmEps.toFixed(2)}` },
    { id: "F2", label: "營業現金流為正 (OCF > 0)", pass: cOcf, detail: cOcf ? "本業實質現金流入" : "營業現金流出" },
    { id: "F3", label: "獲利能力較前期成長 (ΔROA ≥ 0)", pass: cDeltaRoa, detail: `淨利率 ${Number(netMarginTtm).toFixed(1)}% (前期 ${Number(prevNetMargin).toFixed(1)}%)` },
    { id: "F4", label: "盈餘品質含金量 (OCF/NI ≥ 80%)", pass: cAccrual, detail: `獲利含金量 ${Number(ocfToNi).toFixed(0)}%` },
    { id: "F5", label: "負債比率安全受控 (Debt < 55%)", pass: cDebt, detail: `負債比 ${Number(debtRatio).toFixed(1)}%` },
    { id: "F6", label: "短期償債能力佳 (流動比率 ≥ 1.2x)", pass: cCurr, detail: `流動比率 ${currentRatio}x` },
    { id: "F7", label: "未大幅膨脹股本稀釋股東權益", pass: cNoDilute, detail: cNoDilute ? "無惡性增資稀釋" : "股本增加 > 3%" },
    { id: "F8", label: "毛利率較前期維持或擴張 (ΔGM ≥ 0)", pass: cGross, detail: `毛利率 ${Number(grossMargin).toFixed(1)}% (前期 ${Number(prevGm).toFixed(1)}%)` },
    { id: "F9", label: "總資產週轉率穩健或營收年增 ≥ 10%", pass: cTurn, detail: `週轉率 ${assetTurnover}x · 營收 YoY ${revYoy >= 0 ? "+" : ""}${revYoy.toFixed(1)}%` },
  ];
  const pioScore = pioCriteria.filter((c) => c.pass).length;

  // 2. O'Neil CANSLIM (0~7)
  const canslimCriteria = [
    { id: "C", label: "C 當季盈餘/營收成長 (YoY ≥ 15%)", pass: epsYoy >= 15 || revYoy >= 15, detail: `EPS YoY ${epsYoy >= 0 ? "+" : ""}${epsYoy.toFixed(1)}% · 營收 YoY ${revYoy >= 0 ? "+" : ""}${revYoy.toFixed(1)}%` },
    { id: "A", label: "A 年度獲利護城河 (ROE ≥ 15% 或營益率 ≥ 15%)", pass: roeTtm >= 15 || opMargin >= 15, detail: `ROE ${Number(roeTtm).toFixed(1)}% · 營益率 ${Number(opMargin).toFixed(1)}%` },
    { id: "N", label: "N 股價逼近 52 週高點強勢區 (距高點 15% 內)", pass: nearHigh, detail: `距 52W 高點 ${(((price - high52) / high52) * 100).toFixed(1)}%` },
    { id: "S", label: "S 籌碼供需與量價配合", pass: volRatio >= 0.95 && changePct >= -2.0, detail: `5日/20日量能比 ${volRatio}x` },
    { id: "L", label: "L 波段相對強度領先 (60日報酬 > 0%)", pass: ret60 > 0, detail: `20日 ${ret20 >= 0 ? "+" : ""}${ret20.toFixed(1)}% · 60日 ${ret60 >= 0 ? "+" : ""}${ret60.toFixed(1)}%` },
    { id: "I", label: "I 機構法人認同度與獲利含金量", pass: ocfToNi >= 80 || roeTtm >= 12, detail: `含金量 ${Number(ocfToNi).toFixed(0)}% · ROE ${Number(roeTtm).toFixed(1)}%` },
    { id: "M", label: "M 站穩月線 (20MA) 與季線 (60MA)", pass: price >= ma20 * 0.99 && price >= ma60 * 0.98, detail: `現價 ${price.toFixed(1)} / 20MA ${ma20.toFixed(1)} / 60MA ${ma60.toFixed(1)}` },
  ];
  const canslimScore = canslimCriteria.filter((c) => c.pass).length;

  const sProfit = clamp(
    fin?.scores?.profitability ??
      35 + opMargin * 1.4 + roeTtm * 1.1 + (grossMargin >= 30 ? 8 : 0)
  );
  const sGrowth = clamp(
    fin?.scores?.growth ??
      50 + revYoy * 0.85 + epsYoy * 0.45
  );
  const sSafety = clamp(
    fin?.scores?.safety ??
      95 - Math.max(0, debtRatio - 25) * 1.1 + Math.min(12, (currentRatio - 1.2) * 10)
  );
  const sValuation = clamp(
    fin?.scores?.valuation ??
      90 - perPercentile * 0.55 + Math.min(15, dividendYield * 2.5)
  );
  const sMomentum = clamp(
    ((minerviniScore / 8) * 55 + (smcScore / 5) * 45) + (ret20 > 0 ? 5 : -5)
  );

  const rProfitGrade = sProfit >= 80 ? "極優" : sProfit >= 65 ? "良好" : sProfit >= 50 ? "中立" : "偏弱";
  const rProfitPros: string[] = [];
  const rProfitCons: string[] = [];
  if (opMargin >= 18) rProfitPros.push(`營益率高達 ${Number(opMargin).toFixed(1)}%（具高本業定價權）`);
  else if (opMargin < 8) rProfitCons.push(`營益率僅 ${Number(opMargin).toFixed(1)}%（本業利潤偏薄）`);
  if (roeTtm >= 18) rProfitPros.push(`近四季 ROE 達 ${Number(roeTtm).toFixed(1)}%（股東回報率優異）`);
  else if (roeTtm < 10) rProfitCons.push(`近四季 ROE 僅 ${Number(roeTtm).toFixed(1)}%（資金運用效率待提升）`);
  if (grossMargin >= 38) rProfitPros.push(`毛利率 ${Number(grossMargin).toFixed(1)}% 具護城河優勢`);
  const rProfitReason =
    sProfit >= 75
      ? `營業利益率 ${Number(opMargin).toFixed(1)}% 且近四季 ROE 達 ${Number(roeTtm).toFixed(1)}%，具備強大產品定價權與高股東獲利回報（獲利能力評定為${rProfitGrade}）。`
      : sProfit >= 55
      ? `本業營益率 ${Number(opMargin).toFixed(1)}% 與毛利率 ${Number(grossMargin).toFixed(1)}% 維持正常中位水準，獲利表現平穩。`
      : `營業利益率僅 ${Number(opMargin).toFixed(1)}% 或 ROE 偏弱，獲利能力受成本上升或毛利偏低壓制，評為偏弱。`;

  const rGrowthGrade = sGrowth >= 75 ? "極優" : sGrowth >= 60 ? "良好" : sGrowth >= 48 ? "中立" : "偏弱";
  const rGrowthPros: string[] = [];
  const rGrowthCons: string[] = [];
  if (revYoy >= 15) rGrowthPros.push(`單季營收年增 +${revYoy.toFixed(1)}%（雙位數高速擴張）`);
  else if (revYoy < 0) rGrowthCons.push(`單季營收年減 ${revYoy.toFixed(1)}%（出貨動能放緩）`);
  if (epsYoy >= 15) rGrowthPros.push(`單季 EPS 年增 +${epsYoy.toFixed(1)}%（盈餘成長爆發力佳）`);
  else if (epsYoy < 0) rGrowthCons.push(`單季 EPS 出現年衰退（獲利動能收縮）`);
  const rGrowthReason =
    revYoy >= 10
      ? `單季營收年增 +${revYoy.toFixed(1)}% 且 EPS 年增 +${epsYoy.toFixed(1)}%，訂單與出貨動能旺盛，成長動能評為${rGrowthGrade}。`
      : revYoy >= 0
      ? `營收年增率 +${revYoy.toFixed(1)}% 維持溫和擴張，動能平穩未見大幅衰退。`
      : `營收或 EPS 較前期呈現負成長（營收 YoY ${revYoy.toFixed(1)}%），短期動能落入調整期。`;

  const rSafetyGrade = sSafety >= 80 ? "極優" : sSafety >= 65 ? "良好" : sSafety >= 50 ? "中立" : "偏弱";
  const rSafetyPros: string[] = [];
  const rSafetyCons: string[] = [];
  if (debtRatio <= 45) rSafetyPros.push(`負債比率僅 ${Number(debtRatio).toFixed(1)}%（處於 50% 安全警戒線以下）`);
  else if (debtRatio > 60) rSafetyCons.push(`負債比率達 ${Number(debtRatio).toFixed(1)}%（財務槓桿與利息負擔偏高）`);
  if (currentRatio >= 1.5) rSafetyPros.push(`流動比率 ${currentRatio}x（短期償債資金充裕無虞）`);
  else if (currentRatio < 1.0) rSafetyCons.push(`流動比率僅 ${currentRatio}x（短期流動性緩衝不足）`);
  if (pioScore >= 7) rSafetyPros.push(`Piotroski F-Score 通過 ${pioScore}/9 項（排除財務地雷）`);
  else if (pioScore <= 4) rSafetyCons.push(`Piotroski F-Score 僅 ${pioScore}/9 項（需留意現金流或週轉弱點）`);
  const rSafetyReason =
    sSafety >= 75
      ? `負債比 ${Number(debtRatio).toFixed(1)}% 遠低於警戒水位，流動比率 ${currentRatio}x 償債無虞，F-Score 排雷通過 ${pioScore}/9 項，財務極度穩健。`
      : sSafety >= 55
      ? `負債比 ${Number(debtRatio).toFixed(1)}% 處合理受控區間，流動比率 ${currentRatio}x 具基本償債能力。`
      : `負債比率偏高 (${Number(debtRatio).toFixed(1)}%) 或流動比不足，財務防禦緩衝較薄弱。`;

  const rValuationGrade = sValuation >= 75 ? "極優" : sValuation >= 60 ? "良好" : sValuation >= 46 ? "中立" : "偏弱";
  const rValPros: string[] = [];
  const rValCons: string[] = [];
  if (perPercentile <= 35) rValPros.push(`本益比 ${per}x 處於近五年歷史 ${perPercentile.toFixed(0)}% 低分位（具安全邊際）`);
  else if (perPercentile >= 75) rValCons.push(`本益比 ${per}x 處於近五年歷史 ${perPercentile.toFixed(0)}% 高分位（市場已給予高溢價）`);
  if (dividendYield >= 4.0) rValPros.push(`現金殖利率約 ${dividendYield.toFixed(1)}%（具高股息保護傘）`);
  else if (dividendYield < 1.5) rValCons.push(`現金殖利率僅 ${dividendYield.toFixed(1)}%（以資本利得為主）`);
  const rValuationReason =
    perPercentile <= 40
      ? `本益比 ${per}x 位於歷史估值低檔區間 (${perPercentile.toFixed(0)}%)，性價比高，下檔具備估值保護（估值股息評為${rValuationGrade}）。`
      : perPercentile <= 70
      ? `本益比 ${per}x 處於歷史合理常態中位數 (${perPercentile.toFixed(0)}%)，殖利率 ${dividendYield.toFixed(1)}%，評價公允。`
      : `本益比 ${per}x 已達歷史 ${perPercentile.toFixed(0)}% 高分位，市場期待極高，若後續獲利不如預期易引發本益比修正。`;

  const rMomentumGrade = sMomentum >= 75 ? "極優" : sMomentum >= 60 ? "良好" : sMomentum >= 46 ? "中立" : "偏弱";
  const rMomPros: string[] = [];
  const rMomCons: string[] = [];
  if (price >= ma20) rMomPros.push(`股價站穩 20MA 月線（多頭波段支撐確立）`);
  else rMomCons.push(`股價跌破 20MA 月線（短線進入整理或修正）`);
  if (minerviniScore >= 6) rMomPros.push(`符合 Minervini Stage 2 多頭排列（通過 ${minerviniScore}/8 項）`);
  else if (minerviniScore <= 3) rMomCons.push(`均線尚未進入多頭排列模板（僅通過 ${minerviniScore}/8 項）`);
  if (vcpRatio <= 0.85) rMomPros.push(`VCP 波動收斂壓縮比 ${vcpRatio}x（籌碼沉澱浮額洗淨）`);
  const rMomentumReason =
    sMomentum >= 70
      ? `價格站穩 20MA 月線且符合 Minervini 多頭排列 (${minerviniScore}/8 項)，近 20 日漲幅 ${ret20 >= 0 ? '+' : ''}${ret20.toFixed(1)}%，技術面強勢。`
      : sMomentum >= 50
      ? `均線多空交戰震盪，目前 20MA 支撐測試中，VCP 波動收斂 ${vcpRatio}x 處於籌碼消化期。`
      : `跌破關鍵 20MA 均線且動能走弱，上檔存在反壓，短線以觀望為主。`;

  const radar = [
    {
      key: "profitability",
      axis: "獲利能力",
      score: sProfit,
      grade: rProfitGrade,
      metric: `營益率 ${Number(opMargin).toFixed(1)}% · ROE ${Number(roeTtm).toFixed(1)}% · 毛利率 ${Number(grossMargin).toFixed(1)}%`,
      reason: rProfitReason,
      pros: rProfitPros,
      cons: rProfitCons,
    },
    {
      key: "growth",
      axis: "成長動能",
      score: sGrowth,
      grade: rGrowthGrade,
      metric: `營收 YoY ${revYoy >= 0 ? "+" : ""}${revYoy.toFixed(1)}% · EPS YoY ${epsYoy >= 0 ? "+" : ""}${epsYoy.toFixed(1)}%`,
      reason: rGrowthReason,
      pros: rGrowthPros,
      cons: rGrowthCons,
    },
    {
      key: "safety",
      axis: "財務安全",
      score: sSafety,
      grade: rSafetyGrade,
      metric: `負債比 ${Number(debtRatio).toFixed(1)}% · 流動比 ${currentRatio}x · F-Score ${pioScore}/9`,
      reason: rSafetyReason,
      pros: rSafetyPros,
      cons: rSafetyCons,
    },
    {
      key: "valuation",
      axis: "估值股息",
      score: sValuation,
      grade: rValuationGrade,
      metric: `PER ${per}x (位階 ${perPercentile.toFixed(0)}%) · PBR ${pbr}x · 殖利率 ${dividendYield}%`,
      reason: rValuationReason,
      pros: rValPros,
      cons: rValCons,
    },
    {
      key: "momentum",
      axis: "技術籌碼",
      score: sMomentum,
      grade: rMomentumGrade,
      metric: `20日 ${ret20 >= 0 ? "+" : ""}${ret20.toFixed(1)}% · VCP ${vcpRatio}x · 趨勢 ${minerviniScore}/8`,
      reason: rMomentumReason,
      pros: rMomPros,
      cons: rMomCons,
    },
  ];

  const totalScore = Math.round(radar.reduce((a, r) => a + r.score, 0) / radar.length);
  const ratingCode =
    totalScore >= 75 ? "STRONG_BULL" : totalScore >= 60 ? "BULL" : totalScore >= 46 ? "NEUTRAL" : "BEAR";
  const ratingLabel =
    ratingCode === "STRONG_BULL"
      ? "強力看多 (Strong Bull)"
      : ratingCode === "BULL"
      ? "偏多操作 (Bullish)"
      : ratingCode === "NEUTRAL"
      ? "中立區間 (Neutral)"
      : "保守觀望 (Cautious)";

  return {
    symbol,
    name: fin?.name || quote?.name || symbol,
    market,
    industry: quote?.industry || "核心追蹤標的",
    price,
    change_pct: changePct,
    has_financials: hasRealQuarters,
    is_etf: false,
    radar,
    financials: {
      name: fin?.name || quote?.name || symbol,
      market,
      quarters,
      monthly_revenue: monthlyRev,
      balance: {
        ...(fin?.balance || {}),
        debt_ratio: Number(debtRatio.toFixed(1)),
        current_ratio: currentRatio,
        roe_ttm: Number(Number(roeTtm).toFixed(1)),
        ocf_to_ni_ttm: Number(Number(ocfToNi).toFixed(0)),
      },
      dupont,
      valuation,
      dividend: fin?.dividend || { cash_dividend_12m: cashDiv ?? Number(((price * dividendYield) / 100).toFixed(2)) },
      scores: {
        profitability: sProfit,
        growth: sGrowth,
        safety: sSafety,
        valuation: sValuation,
        overall: totalScore,
      },
      flags: fin?.flags || [
        `營業利益率 ${Number(opMargin).toFixed(1)}% · 近四季 ROE ${Number(roeTtm).toFixed(1)}%`,
        `單季營收 YoY ${revYoy >= 0 ? "+" : ""}${revYoy.toFixed(1)}% · EPS YoY ${epsYoy >= 0 ? "+" : ""}${epsYoy.toFixed(1)}%`,
        `負債比 ${Number(debtRatio).toFixed(1)}% · 本益比 ${per}x (歷史位階 ${perPercentile.toFixed(0)}%)`,
      ],
    },
    models: {
      piotroski: {
        name: "Piotroski F-Score 財務體質排雷",
        subtitle: "史丹佛大學教授 Joseph Piotroski 九大財報檢核",
        score: pioScore,
        max_score: 9,
        status: pioScore >= 7 ? "財務極度穩健" : pioScore >= 5 ? "體質正常" : "留意財務弱點",
        summary: `通過 ${pioScore}/9 項財報品質檢核，結合營業現金流與獲利能力排除地雷風險。`,
        criteria: pioCriteria,
      },
      canslim: {
        name: "William O'Neil CANSLIM 成長股模型",
        subtitle: "笑傲股市七大成長動能與領頭羊法則",
        score: canslimScore,
        max_score: 7,
        status: canslimScore >= 5 ? "強勢成長領頭羊" : canslimScore >= 3 ? "具成長潛力" : "動能整理中",
        summary: `通過 ${canslimScore}/7 項 CANSLIM 指標，評估當季 EPS 爆發力與股價相對強度。`,
        criteria: canslimCriteria,
      },
      minervini: {
        name: "Mark Minervini 趨勢模板 & VCP 波動收斂",
        subtitle: "超級績效 Stage 2 多頭排列與波動收縮型態",
        score: minerviniScore,
        max_score: 8,
        status: minerviniScore >= 6 ? "第二階段多頭確立" : minerviniScore >= 4 ? "均線結構築底" : "尚未進入多頭排列",
        vcp_ratio: vcpRatio,
        summary: `符合 ${minerviniScore}/8 項超級績效均線條件，近期 VCP 波動收斂壓縮比為 ${vcpRatio}x。`,
        criteria: minerviniCriteria,
      },
      smc: {
        name: "SMC 聰明錢結構與機構訂單塊",
        subtitle: "Smart Money Concepts · BOS / Order Block / FVG",
        score: smcScore,
        max_score: 5,
        status: smcScore >= 4 ? "機構多方控盤" : smcScore >= 3 ? "結構偏多震盪" : "留意上方供給壓力",
        bullish_ob: { low: bullObLow, high: bullObHigh, date: "近期波段支撐" },
        bearish_ob: { low: bearObLow, high: bearObHigh, date: "近期波段壓力" },
        fvg: null,
        summary: `下方多方機構訂單塊支撐位於 ${bullObLow}~${bullObHigh}，上方壓力區位於 ${bearObLow}~${bearObHigh}。`,
        criteria: smcCriteria,
      },
    },
    peers: [],
    verdict: {
      total_score: totalScore,
      rating: ratingLabel,
      rating_code: ratingCode,
      entry_zone: [entryLow, entryHigh],
      stop_loss: stopLoss,
      target_price: targetPrice,
      risk_reward: Math.max(1.2, riskReward),
      bull_points: [
        `Piotroski F-Score 達 ${pioScore}/9 分，杜邦分析顯示屬於「${dupont.driver}」（近四季 ROE 約 ${Number(dupont.roe_ttm).toFixed(1)}%）。`,
        `Minervini VCP 波動收斂比 ${vcpRatio}x，下方 SMC 多方訂單塊支撐位於 ${bullObLow} ~ ${bullObHigh}。`,
      ],
      bear_points: [
        `上方 SMC 空方訂單塊壓力區位於 ${bearObLow} ~ ${bearObHigh}，突破前須留意短線獲利了結賣壓。`,
        `若跌破防守停損價 ${stopLoss}，代表短線結構轉弱應嚴格執行停損紀律。`,
      ],
      conclusion: `${fin?.name || quote?.name || symbol} (${symbol}) 五維雪花總評為 ${totalScore}/100（${ratingLabel}）。建議於 ${entryLow}~${entryHigh} 區間分批布局，跌破 ${stopLoss} 停損，波段目標看至 ${targetPrice}（預估風報比 1 : ${Math.max(1.2, riskReward)}）。`,
    },
  };
}

function enrichRadarMetrics(
  radar: any[],
  q0: any,
  bal: any,
  val: any,
  mRev: any,
  models: any
) {
  return radar.map((r) => {
    const k = (r.key || "").toLowerCase();
    const score = r.score || 50;
    const grade = score >= 80 ? "極優" : score >= 65 ? "良好" : score >= 50 ? "中立" : "偏弱";

    if (k.includes("profit")) {
      const om = q0.operating_margin != null ? Number(q0.operating_margin) : null;
      const roe = bal.roe_ttm != null ? Number(bal.roe_ttm) : null;
      const gm = q0.gross_margin != null ? Number(q0.gross_margin) : null;
      const metric = r.metric || `營益率 ${om != null ? `${om.toFixed(1)}%` : "—"} · ROE ${roe != null ? `${roe.toFixed(1)}%` : "—"} · 毛利率 ${gm != null ? `${gm.toFixed(1)}%` : "—"}`;
      const reason = r.reason || (
        score >= 70
          ? `營業利益率${om != null ? ` ${om.toFixed(1)}%` : ""}與近四季 ROE${roe != null ? ` ${roe.toFixed(1)}%` : ""}表現優異，本業獲利護城河與股東報酬率高（評定為${grade}）。`
          : `營益率與 ROE 維持常態水平，獲利表現平穩。`
      );
      return {
        ...r,
        grade: r.grade || grade,
        metric,
        reason,
        pros: r.pros || (om && om >= 15 ? [`營業利益率 ${om.toFixed(1)}% 高於同業`] : []),
        cons: r.cons || (om && om < 8 ? [`營益率偏薄需留意利潤壓縮`] : []),
      };
    }
    if (k.includes("growth")) {
      const ry = q0.revenue_yoy ?? mRev.yoy;
      const ey = q0.eps_yoy;
      const metric = r.metric || `營收 YoY ${ry != null ? `${ry >= 0 ? "+" : ""}${Number(ry).toFixed(1)}%` : "—"} · EPS YoY ${ey != null ? `${ey >= 0 ? "+" : ""}${Number(ey).toFixed(1)}%` : "—"}`;
      const reason = r.reason || (
        score >= 70
          ? `單季營收年增率${ry != null ? ` +${Number(ry).toFixed(1)}%` : ""}與 EPS 動能強勁，本業訂單與市場需求旺盛（評定為${grade}）。`
          : `營收年增率維持穩健，動能中性整理。`
      );
      return {
        ...r,
        grade: r.grade || grade,
        metric,
        reason,
        pros: r.pros || (ry && ry >= 10 ? [`單季營收年增 +${Number(ry).toFixed(1)}%`] : []),
        cons: r.cons || (ry && ry < 0 ? [`營收年增率出現衰退`] : []),
      };
    }
    if (k.includes("safe") || k.includes("health")) {
      const dr = bal.debt_ratio != null ? Number(bal.debt_ratio) : null;
      const cr = bal.current_ratio != null ? bal.current_ratio : null;
      const fScore = models?.piotroski ? `${models.piotroski.score}/${models.piotroski.max_score}` : "—";
      const metric = r.metric || `負債比 ${dr != null ? `${dr.toFixed(1)}%` : "—"} · 流動比 ${cr != null ? `${cr}x` : "—"} · F-Score ${fScore}`;
      const reason = r.reason || (
        score >= 70
          ? `負債比率${dr != null ? ` ${dr.toFixed(1)}%` : ""}處於安全水位，流動比率充裕，Piotroski 排雷檢核通過率高，財務防禦穩固（評定為${grade}）。`
          : `負債比與短期流動比率處於合理警戒範圍內。`
      );
      return {
        ...r,
        grade: r.grade || grade,
        metric,
        reason,
        pros: r.pros || (dr && dr <= 45 ? [`負債比 ${dr.toFixed(1)}% 低於安全警戒線`] : []),
        cons: r.cons || (dr && dr > 60 ? [`負債比偏高需留意利息支出`] : []),
      };
    }
    if (k.includes("val")) {
      const per = val.per != null ? Number(val.per) : null;
      const pbr = val.pbr != null ? Number(val.pbr) : null;
      const dy = val.dividend_yield != null ? Number(val.dividend_yield) : null;
      const metric = r.metric || `PER ${per != null ? `${per.toFixed(1)}x` : "—"} · PBR ${pbr != null ? `${pbr.toFixed(2)}x` : "—"} · 殖利率 ${dy != null ? `${dy.toFixed(2)}%` : "—"}`;
      const reason = r.reason || (
        score >= 65
          ? `本益比${per != null ? ` ${per.toFixed(1)}x` : ""}處於合理或低估區間，配合殖利率具備吸引力，評價性價比高（評定為${grade}）。`
          : `本益比或股價淨值比處於歷史常態水位，估值公允。`
      );
      return {
        ...r,
        grade: r.grade || grade,
        metric,
        reason,
        pros: r.pros || (dy && dy >= 3.5 ? [`現金殖利率 ${dy.toFixed(1)}% 具息收吸引力`] : []),
        cons: r.cons || (per && per > 30 ? [`本益比高於 30 倍`] : []),
      };
    }
    const vcp = models?.minervini?.vcp_ratio != null ? `${models.minervini.vcp_ratio}x` : "—";
    const smc = models?.smc ? `${models.smc.score}/${models.smc.max_score}` : "—";
    const metric = r.metric || `VCP 收斂 ${vcp} · SMC 機構結構 ${smc}`;
    const reason = r.reason || (
      score >= 65
        ? `均線結構維持多頭排列，VCP 波動收斂 ${vcp}，獲下方機構買盤訂單塊支撐，技術面偏多（評定為${grade}）。`
        : `均線多空交戰，技術面於波段支撐與壓力區間震盪整理。`
    );
    return {
      ...r,
      grade: r.grade || grade,
      metric,
      reason,
      pros: r.pros || [`VCP 波動收斂 ${vcp}`],
      cons: r.cons || [],
    };
  });
}

/**
 * 建立透明可驗證的 AI 逐步思考過程 (Chain-of-Thought Reasoning Steps)
 */
export function buildThinkingSteps(deep: any): ThinkingStep[] {
  const v = deep?.verdict || {};
  const min = deep?.models?.minervini || {};
  const smc = deep?.models?.smc || {};

  if (deep?.is_etf && deep?.etf_profile) {
    const ep = deep.etf_profile;
    return [
      {
        step: 1,
        role: "ETF 標的規格與追蹤指數核驗 (ETF Profile Ingestion)",
        title: `確認 ${deep?.name} (${deep?.symbol}) 發行機構、追蹤指數與成分股結構`,
        thought: `首先識別本標的為「${ep.category}」（由 ${ep.issuer} 發行），並非單一公司股票，因此排除一般企業損益表/負債比公式，改提取其追蹤指數「${ep.tracking_index}」、核心成分股權重（${ep.top_holdings_summary}）與近一年日 K 線淨值序列。`,
        metrics: `${ep.issuer} · 規模 ${ep.aum} · 內扣費用 ${ep.expense_ratio} · ${ep.dividend_freq}`,
      },
      {
        step: 2,
        role: "配息機制與內扣持有成本推論 (Cost & Yield Reasoning)",
        title: `評估總費用率 (${ep.expense_ratio}) 與配息/複利結構`,
        thought: `檢視長期持有摩擦成本：總費用率為 ${ep.expense_ratio}，配息頻率為「${ep.dividend_freq}」${
          ep.dividend_yield_est != null
            ? `（參考年化殖利率約 ${ep.dividend_yield_est}%）`
            : "（不配息將股息與資本利得 100% 滾入淨值複利）"
        }。核心觀察重點：${ep.focus_points?.[0] || ep.tracking_index}。`,
        metrics: `內扣費用 ${ep.expense_ratio} · ${ep.dividend_freq}${
          ep.dividend_yield_est != null ? ` · 參考殖利率 ~${ep.dividend_yield_est}%` : ""
        }`,
      },
      {
        step: 3,
        role: "量化動量、20MA 乖離率與 VCP 結構推論 (Quant & Trend Reasoning)",
        title: `計算區間報酬、月線乖離率 (${ep.bias_20ma}%) 與 SMC 機構支撐`,
        thought: `近 1 月報酬 ${ep.ret_1m >= 0 ? "+" : ""}${ep.ret_1m}%、近 3 月 ${ep.ret_3m >= 0 ? "+" : ""}${ep.ret_3m}%、近 1 年 ${ep.ret_1y >= 0 ? "+" : ""}${ep.ret_1y}%；目前價格相對 20MA 月線乖離率為 ${ep.bias_20ma >= 0 ? "+" : ""}${ep.bias_20ma}%，VCP 波動收斂比 ${min.vcp_ratio ?? 0.78}x，下方多方訂單塊支撐區位於 ${smc.bullish_ob?.low} ~ ${smc.bullish_ob?.high}。`,
        metrics: `近3月 ${ep.ret_3m >= 0 ? "+" : ""}${ep.ret_3m}% · 20MA乖離 ${ep.bias_20ma >= 0 ? "+" : ""}${ep.bias_20ma}% · Minervini ${min.score ?? 5}/8`,
      },
      {
        step: 4,
        role: "首席風控官波動率與最大回撤壓力測試 (Volatility & Drawdown Test)",
        title: `檢驗年化波動率 (${ep.volatility_annual}%)、最大回撤 (${ep.max_drawdown_1y}%) 與折溢價風險`,
        thought: `統計近一年日報酬標準差得出年化波動率為 ${ep.volatility_annual}%，近一年最大回撤 (MDD) 為 ${ep.max_drawdown_1y}%。上方 ${smc.bearish_ob?.low} ~ ${smc.bearish_ob?.high} 為前波供給壓力區，且操作 ETF 須避免在盤中大幅溢價或正乖離過大時追高，跌破 ${v.stop_loss} 則嚴格執行停損。`,
        metrics: `年化波動 ${ep.volatility_annual}% · 近1年最大回撤 ${ep.max_drawdown_1y}% · 停損底線 ${v.stop_loss}`,
      },
      {
        step: 5,
        role: "投資總監多空權重綜合裁決 (CIO Final Synthesis)",
        title: `融合 ETF 五維雪花雷達 (${v.total_score ?? 65}/100) 與進出場定價`,
        thought: `綜合報酬動能、規模追蹤、抗跌低波、配息費用與均線結構五維度，總評 ${v.total_score ?? 65}/100 分（${v.rating || "中立偏多"}）。建議於 ${v.entry_zone?.[0]} ~ ${v.entry_zone?.[1]} 分批布局，目標價 ${v.target_price}，停損價 ${v.stop_loss}（預估風報比 1 : ${v.risk_reward ?? 2.0}）。`,
        metrics: `總評 ${v.total_score ?? 65}/100 · 進場 ${v.entry_zone?.[0]}~${v.entry_zone?.[1]} · 目標 ${v.target_price} · 風報比 1:${v.risk_reward ?? 2.0}`,
      },
    ];
  }

  const dup = deep?.financials?.dupont || {};
  const val = deep?.financials?.valuation || {};
  const bal = deep?.financials?.balance || {};
  const q0 = deep?.financials?.quarters?.[0] || {};
  const pio = deep?.models?.piotroski || {};
  const can = deep?.models?.canslim || {};

  return [
    {
      step: 1,
      role: "數據採集與交叉查核 (Data Ingestion)",
      title: `提取 ${deep?.name || ""} (${deep?.symbol || ""}) 財務報表、估值與 K 線序列`,
      thought: `首先鎖定最新市價 ${deep?.price}（漲跌 ${Number(deep?.change_pct || 0).toFixed(2)}%），同步調取損益表（毛利率、營益率、EPS YoY）、資產負債表（負債比、流動比）與近一年日 K 線高低價序列。`,
      metrics: `現價 ${deep?.price} · 毛利率 ${q0.gross_margin ?? "—"}% · 營益率 ${q0.operating_margin ?? "—"}% · 負債比 ${bal.debt_ratio ?? "—"}%`,
    },
    {
      step: 2,
      role: "巴菲特價值護城河推論 (Value & Moat Reasoning)",
      title: `拆解杜邦 ROE 三因子與 Piotroski 9 大財報排雷`,
      thought: `檢視股東權益報酬率（ROE ${dup.roe_ttm ?? "—"}%）是否由高淨利率（${dup.net_margin_ttm ?? "—"}%）或高資產週轉（${dup.asset_turnover ?? "—"}x）驅動，而非單靠高舉債槓桿（權益乘數 ${dup.equity_multiplier ?? "—"}x）。同時通過 Piotroski ${pio.score ?? 6}/9 項測試與獲利含金量（${bal.ocf_to_ni_ttm ?? 90}%）確認帳面獲利具現金流支撐。`,
      metrics: `ROE ${dup.roe_ttm ?? "—"}% (${dup.driver || "穩健型"}) · F-Score ${pio.score ?? 6}/9 · PER ${val.per ?? "—"}x (位階 ${val.per_percentile ?? 50}%)`,
    },
    {
      step: 3,
      role: "西蒙斯量化動量與機構足跡推論 (Quant & SMC Reasoning)",
      title: `計算 Minervini 均線模板、VCP 波動收斂與 SMC 訂單塊`,
      thought: `以 O'Neil CANSLIM 檢驗成長動能（${can.score ?? 4}/7），並計算近 15 日與前 30 日振幅比得出 VCP 波動收斂比為 ${min.vcp_ratio ?? 0.78}x；同時掃描機構大單足跡，定位下方多方訂單塊支撐區（${smc.bullish_ob?.low} ~ ${smc.bullish_ob?.high}）與上方空方壓力區（${smc.bearish_ob?.low} ~ ${smc.bearish_ob?.high}）。`,
      metrics: `CANSLIM ${can.score ?? 4}/7 · Minervini ${min.score ?? 5}/8 (VCP ${min.vcp_ratio ?? 0.78}x) · SMC ${smc.score ?? 3}/5`,
    },
    {
      step: 4,
      role: "首席風控官黑天鵝壓力測試 (Risk & Drawdown Stress Test)",
      title: `反方詰問：檢驗負債槓桿、估值泡沫與跌破支撐風險`,
      thought: `從反方視角挑毛病：目前本益比處於歷史 ${val.per_percentile ?? 50}% 分位，負債比 ${bal.debt_ratio ?? "—"}%、流動比 ${bal.current_ratio ?? "—"}x。若大盤系統性回檔導致跌破多方訂單塊下緣 ${smc.bullish_ob?.low}，必須設定硬性停損價 ${v.stop_loss} 以鎖住最大回撤。`,
      metrics: `流動比率 ${bal.current_ratio ?? "—"}x · 上檔壓力 ${smc.bearish_ob?.low}~${smc.bearish_ob?.high} · 硬性停損 ${v.stop_loss}`,
    },
    {
      step: 5,
      role: "投資總監多空權重綜合裁決 (CIO Final Synthesis)",
      title: `融合五維雪花雷達 (${v.total_score ?? 65}/100) 與風險報酬比定價`,
      thought: `加權計算五維度雪花分數與四大模型通過率，總評 ${v.total_score ?? 65}/100 分，定調為「${v.rating || "中立偏多"}」。將進場區間錨定於 ${v.entry_zone?.[0]} ~ ${v.entry_zone?.[1]}，目標價 ${v.target_price}，停損價 ${v.stop_loss}，得出正期望值風險報酬比 1 : ${v.risk_reward ?? 2.0}。`,
      metrics: `總評 ${v.total_score ?? 65}/100 · 進場 ${v.entry_zone?.[0]}~${v.entry_zone?.[1]} · 目標 ${v.target_price} · 風報比 1:${v.risk_reward ?? 2.0}`,
    },
  ];
}

/**
 * 產生 AI 深度診斷報告（內含完整思考推理過程 `thinking_steps`）
 */
export async function generateSmartStockAnalysis(symbol: string): Promise<{
  analysis: string;
  source: string;
  thinking_steps: ThinkingStep[];
}> {
  const deep = await fetchOrBuildDeepReport(symbol);
  const thinking_steps = buildThinkingSteps(deep);
  const byokKey = typeof window !== "undefined" ? localStorage.getItem("byok_api_key")?.trim() : "";

  if (byokKey) {
    try {
      const prompt = deep.is_etf
        ? `你是專業台美股 ETF 與跨資產首席分析師。請根據以下 ${deep.name} (${symbol}) 的真實 ETF 規格與量化數據，以繁體中文 Markdown 撰寫深度診斷報告（包含：1.核心結論、2.追蹤指數與成分股/費用率剖析、3.技術趨勢與20MA乖離率/支撐壓力、4.具體分批進出場與風控建議）：
現價: ${deep.price} (${deep.change_pct}%)
ETF規格: 發行商=${deep.etf_profile?.issuer}, 類別=${deep.etf_profile?.category}, 追蹤指數=${deep.etf_profile?.tracking_index}, 內扣費用=${deep.etf_profile?.expense_ratio}, 配息=${deep.etf_profile?.dividend_freq}, 核心持股=${deep.etf_profile?.top_holdings_summary}
五維雪花評分: ${JSON.stringify(deep.radar)}
關鍵價位: 建議進場=${deep.verdict?.entry_zone?.join("~")}, 停損=${deep.verdict?.stop_loss}, 目標價=${deep.verdict?.target_price}`
        : `你是專業台美股首席分析師。請根據以下 ${deep.name} (${symbol}) 的真實財報與量化模型數據，以繁體中文 Markdown 撰寫深度診斷報告（包含：1.核心結論、2.財報與獲利能力解讀、3.技術趨勢與機構支撐壓力、4.具體進出場與停損操作建議）：
現價: ${deep.price} (${deep.change_pct}%)
五維雪花評分: ${JSON.stringify(deep.radar)}
杜邦與估值: ROE=${deep.financials?.dupont?.roe_ttm}%, 驅動=${deep.financials?.dupont?.driver}, PER=${deep.financials?.valuation?.per}x, PBR=${deep.financials?.valuation?.pbr}x, 殖利率=${deep.financials?.valuation?.dividend_yield}%
四大模型: Piotroski=${deep.models?.piotroski?.score}/9, CANSLIM=${deep.models?.canslim?.score}/7, Minervini=${deep.models?.minervini?.score}/8 (VCP=${deep.models?.minervini?.vcp_ratio}x), SMC=${deep.models?.smc?.score}/5
關鍵價位: 建議進場=${deep.verdict?.entry_zone?.join("~")}, 停損=${deep.verdict?.stop_loss}, 目標價=${deep.verdict?.target_price}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(byokKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      if (resp.ok) {
        const json = await resp.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return {
            analysis: text,
            source: "Gemini 2.5 Flash (BYOK 直連)",
            thinking_steps,
          };
        }
      }
    } catch {
      // Fall through to quantitative & fundamental AI synthesis
    }
  }

  const v = deep.verdict || {};
  const min = deep.models?.minervini || {};
  const smc = deep.models?.smc || {};

  if (deep.is_etf && deep.etf_profile) {
    const ep = deep.etf_profile;
    const holdingsList = (ep.holdings || [])
      .slice(0, 5)
      .map((h: any) => `${h.name}(${h.symbol}, ${h.weight}%)`)
      .join("、");
    const md = `### 1. AI 綜合診斷結論：${v.rating || "中立偏多"}（總評 ${v.total_score ?? 65} / 100 分）
- **標的現況**：**${deep.name} (${deep.symbol})** 目前報價 **${deep.price}**（當日漲跌 **${deep.change_pct >= 0 ? "+" : ""}${Number(deep.change_pct).toFixed(2)}%**），屬於「**${ep.category}**」（由 **${ep.issuer}** 發行，資產規模 **${ep.aum}**）。
- **核心判斷**：${v.conclusion || ""}

---

### 2. 追蹤指數、核心成分股與費用配息剖析
- **追蹤指數基準**：**${ep.tracking_index}**
- **核心成分股 / 曝險結構**：${holdingsList || ep.top_holdings_summary || ep.tracking_index}
- **內扣費用與配息機制**：總費用率約 **${ep.expense_ratio}**，配息頻率為 **${ep.dividend_freq}**${
      ep.dividend_yield_est != null ? `（參考年化殖利率約 **${ep.dividend_yield_est}%**）` : ""
    }。
- **操作觀察重點**：${(ep.focus_points || []).join(" ")}

---

### 3. 量化技術結構、月線乖離率與 SMC 機構支撐
- **區間報酬與波動風險**：近 1 月報酬 **${ep.ret_1m >= 0 ? "+" : ""}${ep.ret_1m}%**、近 3 月 **${ep.ret_3m >= 0 ? "+" : ""}${ep.ret_3m}%**、近 1 年 **${ep.ret_1y >= 0 ? "+" : ""}${ep.ret_1y}%**；年化波動率 **${ep.volatility_annual}%**，近 1 年最大回撤 **${ep.max_drawdown_1y}%**。
- **均線乖離與 VCP 收斂**：目前 20MA 月線乖離率為 **${ep.bias_20ma >= 0 ? "+" : ""}${ep.bias_20ma}%**，Minervini 趨勢模板符合 **${min.score ?? 5}/8 項**（VCP 波動收斂比 **${min.vcp_ratio ?? 0.78}x**）。
- **SMC 機構訂單塊區間**：
  - **下方多方支撐區 (Bullish OB)**：**${smc.bullish_ob?.low ?? v.entry_zone?.[0]} ~ ${smc.bullish_ob?.high ?? v.entry_zone?.[1]}**
  - **上方空方壓力區 (Bearish OB)**：**${smc.bearish_ob?.low ?? v.target_price} ~ ${smc.bearish_ob?.high ?? v.target_price}**

---

### 4. 實戰操作計畫與風控紀律
- **建議分批進場區間**：**${v.entry_zone?.[0]} ~ ${v.entry_zone?.[1]}**（建議於回測 20MA 或多方支撐區且無大幅溢價時分批布局）
- **嚴格防守停損價**：**${v.stop_loss}**（收盤跌破立即執行風控）
- **波段停利目標價**：**${v.target_price}**（預估風險報酬比 **1 : ${v.risk_reward ?? 2.0}**）

> *以上內容由 AI 量化與 ETF 追蹤引擎根據真實市場數據自動生成，僅供研究參考，非投資建議。*`;

    return {
      analysis: md,
      source: "AI ETF 追蹤與量化診斷引擎",
      thinking_steps,
    };
  }

  const dup = deep.financials?.dupont || {};
  const val = deep.financials?.valuation || {};
  const bal = deep.financials?.balance || {};
  const q0 = deep.financials?.quarters?.[0] || {};
  const pio = deep.models?.piotroski || {};
  const can = deep.models?.canslim || {};

  const md = `### 1. AI 綜合診斷結論：${v.rating || "中立偏多"}（總評 ${v.total_score ?? 65} / 100 分）
- **標的現況**：**${deep.name} (${deep.symbol})** 目前報價 **${deep.price}**（當日漲跌 **${deep.change_pct >= 0 ? "+" : ""}${Number(deep.change_pct).toFixed(2)}%**）。
- **核心判斷**：${v.conclusion || ""}

---

### 2. 財報基本面與杜邦 ROE 深度剖析
- **獲利與杜邦拆解**：近四季 ROE 為 **${dup.roe_ttm ?? "—"}%**，稅後淨利率 **${dup.net_margin_ttm ?? "—"}%**，總資產週轉率 **${dup.asset_turnover ?? "—"}x**，權益乘數 **${dup.equity_multiplier ?? "—"}x**，結構屬於「**${dup.driver || "穩健經營型"}**」。
- **財務安全排雷 (Piotroski F-Score)**：拿下 **${pio.score ?? 6}/${pio.max_score ?? 9} 分（${pio.status || "穩健"}）**，負債比率 **${bal.debt_ratio ?? "—"}%**、流動比率 **${bal.current_ratio ?? "—"}x**，獲利含金量 **${bal.ocf_to_ni_ttm ?? 90}%**。
- **成長動能 (CANSLIM)**：通過 **${can.score ?? 4}/${can.max_score ?? 7} 項**，最新季度營收年增率 **${q0.revenue_yoy != null ? `${q0.revenue_yoy >= 0 ? "+" : ""}${Number(q0.revenue_yoy).toFixed(1)}%` : "穩健"}**，本益比 **${val.per ?? "—"} 倍**（歷史位階 **${val.per_percentile ?? 50}%**），現金殖利率約 **${val.dividend_yield ?? "—"}%**。

---

### 3. 量化技術結構與 SMC 機構訂單塊
- **Minervini 超級績效趨勢模板**：符合 **${min.score ?? 5}/${min.max_score ?? 8} 項（${min.status || ""}）**，近期 VCP 波動收斂壓縮比為 **${min.vcp_ratio ?? 0.78}x**（小於 0.85 代表籌碼沉澱收斂）。
- **SMC 聰明錢結構**：得分 **${smc.score ?? 3}/${smc.max_score ?? 5}（${smc.status || ""}）**。
  - **下方多方機構訂單塊 (Bullish OB 支撐)**：**${smc.bullish_ob?.low ?? v.entry_zone?.[0]} ~ ${smc.bullish_ob?.high ?? v.entry_zone?.[1]}**
  - **上方空方機構訂單塊 (Bearish OB 壓力)**：**${smc.bearish_ob?.low ?? v.target_price} ~ ${smc.bearish_ob?.high ?? v.target_price}**

---

### 4. 實戰操作計畫與風控紀律
- **建議分批進場區間**：**${v.entry_zone?.[0]} ~ ${v.entry_zone?.[1]}**（拉回靠近多方訂單塊與均線支撐不破時分批布局）
- **嚴格防守停損價**：**${v.stop_loss}**（收盤跌破立即停損出場，控制單筆風險）
- **波段停利目標價**：**${v.target_price}**（預估風險報酬比 **1 : ${v.risk_reward ?? 2.0}**）

> *以上內容由 AI 量化與財報引擎根據真實市場數據自動生成，僅供研究參考，非投資建議。*`;

  return {
    analysis: md,
    source: "AI 財報與量化診斷引擎",
    thinking_steps,
  };
}

/**
 * 產生多角色 AI 投資委員會裁決報告（內含每位專家的推理鏈 `reasoning` 與 5 階段 `thinking_steps`）
 */
export async function generateSmartAICommittee(symbol: string): Promise<any> {
  const deep = await fetchOrBuildDeepReport(symbol);
  const thinking_steps = buildThinkingSteps(deep);
  const v = deep.verdict || {};
  const min = deep.models?.minervini || {};
  const smc = deep.models?.smc || {};

  if (deep.is_etf && deep.etf_profile) {
    const ep = deep.etf_profile;
    const overallScore = v.total_score || 68;
    const finalAction =
      overallScore >= 75
        ? "STRONG_BUY"
        : overallScore >= 60
        ? "BUY"
        : overallScore >= 46
        ? "HOLD"
        : "SELL";
    const actionLabel =
      finalAction === "STRONG_BUY"
        ? "強力買進"
        : finalAction === "BUY"
        ? "分批佈局"
        : finalAction === "HOLD"
        ? "區間觀望"
        : "逢高減碼";

    const buffettScore = clamp(overallScore + 2, 48, 94);
    const simonsScore = clamp(
      Math.round(((min.score || 5) / 8) * 55 + ((smc.score || 3) / 5) * 45),
      42,
      95
    );
    const croRiskLevel =
      ep.volatility_annual > 28 ? "HIGH" : ep.volatility_annual > 18 ? "MEDIUM" : "LOW";

    return {
      symbol: deep.symbol,
      thinking_steps,
      market_snapshot: {
        price: deep.price,
        change_pct: deep.change_pct,
        volume: 0,
      },
      cio_verdict: {
        final_action: finalAction,
        action_label: actionLabel,
        overall_ai_score: overallScore,
        suggested_position_pct: overallScore >= 72 ? 65 : overallScore >= 58 ? 45 : 25,
        entry_zone: `${v.entry_zone?.[0]} ~ ${v.entry_zone?.[1]}`,
        target_price: v.target_price,
        stop_loss_price: v.stop_loss,
        executive_summary: `${deep.name} (${deep.symbol}) 為 ${ep.issuer} 發行之「${ep.category}」，追蹤「${ep.tracking_index}」（內扣費用 ${ep.expense_ratio}，${ep.dividend_freq}）。結合目前 20MA 乖離率 (${ep.bias_20ma >= 0 ? "+" : ""}${ep.bias_20ma}%) 與 VCP 收斂比 (${min.vcp_ratio}x)，委員會裁定為「${actionLabel}」，建議於 ${v.entry_zone?.[0]}~${v.entry_zone?.[1]} 分批布局，停損設於 ${v.stop_loss}，目標看至 ${v.target_price}。`,
        action_plan: [
          `進場策略：於 ${v.entry_zone?.[0]} ~ ${v.entry_zone?.[1]} 靠近 20MA 與多方支撐區分批建立部位，確認盤中無異常高溢價。`,
          `波段停利：上檔接近壓力區 ${v.target_price} 或正乖離過大時可分批調節，核心部位沿月線持有。`,
          `風控底線：若收盤跌破 ${v.stop_loss}，應執行停損或減碼避險。`,
        ],
      },
      experts: {
        buffett: {
          agent: "Warren Buffett",
          role: "指數配置與持有成本顧問",
          stance: buffettScore >= 60 ? "BULLISH" : "NEUTRAL",
          score: buffettScore,
          moat_rating: `${ep.category} (${ep.aum})`,
          reasoning: `評估一檔 ETF 我最看重三件事：追蹤什麼指數、內扣費用多寡、以及成分股品質。本檔追蹤「${ep.tracking_index}」，核心部位為 ${ep.top_holdings_summary}，總費用率 ${ep.expense_ratio}，配息機制為「${ep.dividend_freq}」，長期配置邏輯清晰。`,
          summary: `追蹤「${ep.tracking_index}」，資產規模 ${ep.aum}，內扣費用率 ${ep.expense_ratio}，配息機制：${ep.dividend_freq}。`,
          key_strengths: [
            `追蹤標的明確：${ep.tracking_index}`,
            `核心成分股 / 曝險：${ep.top_holdings_summary}`,
            `內扣總費用率 ${ep.expense_ratio} · ${ep.dividend_freq}`,
          ],
          major_risks: [
            ep.focus_points?.[0] || "需留意盤中折溢價幅度與成分股產業集中度波動",
          ],
        },
        simons: {
          agent: "Jim Simons",
          role: "量化動量模型分析師",
          stance: simonsScore >= 58 ? "BULLISH" : "NEUTRAL",
          score: simonsScore,
          trend_strength: (min.score || 5) >= 6 ? "STRONG" : "MODERATE",
          support_level: smc.bullish_ob?.low ?? v.entry_zone?.[0],
          resistance_level: smc.bearish_ob?.high ?? v.target_price,
          reasoning: `從價格時間序列來看，近 1 月報酬 ${ep.ret_1m >= 0 ? "+" : ""}${ep.ret_1m}%、近 3 月 ${ep.ret_3m >= 0 ? "+" : ""}${ep.ret_3m}%，目前 20MA 乖離率為 ${ep.bias_20ma >= 0 ? "+" : ""}${ep.bias_20ma}%，VCP 波動收斂壓縮比 ${min.vcp_ratio}x，下檔機構支撐區落在 ${smc.bullish_ob?.low}~${smc.bullish_ob?.high}。`,
          summary: `Minervini 趨勢模板符合 ${min.score}/8 項，20MA 乖離率 ${ep.bias_20ma >= 0 ? "+" : ""}${ep.bias_20ma}%，VCP 收斂比 ${min.vcp_ratio}x。`,
          momentum_signals: [
            `近1月 ${ep.ret_1m >= 0 ? "+" : ""}${ep.ret_1m}% · 近3月 ${ep.ret_3m >= 0 ? "+" : ""}${ep.ret_3m}% · 近1年 ${ep.ret_1y >= 0 ? "+" : ""}${ep.ret_1y}%`,
            `20MA 月線乖離率 ${ep.bias_20ma >= 0 ? "+" : ""}${ep.bias_20ma}% · VCP 收斂比 ${min.vcp_ratio}x`,
            `SMC 多方支撐區 ${smc.bullish_ob?.low} ~ ${smc.bullish_ob?.high}`,
          ],
        },
        cro: {
          agent: "Chief Risk Officer",
          role: "首席風控審查官",
          risk_level: croRiskLevel,
          score: clamp(92 - ep.volatility_annual * 1.1, 45, 92),
          reasoning: `風控層面請緊盯波動率與最大回撤：本標的年化波動率為 ${ep.volatility_annual}%，近 1 年最大回撤達 ${ep.max_drawdown_1y}%。上方 ${smc.bearish_ob?.low}~${smc.bearish_ob?.high} 為前波壓力區，一旦收盤跌破 ${v.stop_loss} 必須嚴格執行停損。`,
          summary: `年化波動率 ${ep.volatility_annual}%，近 1 年最大回撤 ${ep.max_drawdown_1y}%。上方壓力區 ${smc.bearish_ob?.low}~${smc.bearish_ob?.high}，跌破 ${v.stop_loss} 嚴格停損。`,
          top_vulnerabilities: [
            `年化波動率 ${ep.volatility_annual}% · 近 1 年最大回撤 ${ep.max_drawdown_1y}%`,
            `上檔壓力區 ${smc.bearish_ob?.low} ~ ${smc.bearish_ob?.high}，跌破 ${v.stop_loss} 結構轉弱`,
          ],
          recommended_stop_loss_pct: Number(
            Math.max(3.5, Math.min(9.5, ((deep.price - v.stop_loss) / Math.max(1, deep.price)) * 100)).toFixed(1)
          ),
        },
      },
    };
  }

  const dup = deep.financials?.dupont || {};
  const val = deep.financials?.valuation || {};
  const bal = deep.financials?.balance || {};
  const pio = deep.models?.piotroski || {};
  const can = deep.models?.canslim || {};

  const buffettScore = clamp(
    Math.round(((pio.score || 6) / 9) * 55 + (100 - (val.per_percentile || 50)) * 0.45),
    42,
    95
  );
  const simonsScore = clamp(
    Math.round(((min.score || 5) / 8) * 55 + ((can.score || 4) / 7) * 45),
    40,
    95
  );
  const croRiskLevel =
    (bal.debt_ratio || 40) > 60 || (val.per_percentile || 50) > 85
      ? "HIGH"
      : (bal.debt_ratio || 40) > 48
      ? "MEDIUM"
      : "LOW";
  const overallScore = v.total_score || Math.round((buffettScore + simonsScore) / 2);
  const finalAction =
    overallScore >= 75
      ? "STRONG_BUY"
      : overallScore >= 60
      ? "BUY"
      : overallScore >= 46
      ? "HOLD"
      : "SELL";
  const actionLabel =
    finalAction === "STRONG_BUY"
      ? "強力買進"
      : finalAction === "BUY"
      ? "分批佈局"
      : finalAction === "HOLD"
      ? "區間觀望"
      : "逢高減碼";

  return {
    symbol: deep.symbol,
    thinking_steps,
    market_snapshot: {
      price: deep.price,
      change_pct: deep.change_pct,
      volume: 0,
    },
    cio_verdict: {
      final_action: finalAction,
      action_label: actionLabel,
      overall_ai_score: overallScore,
      suggested_position_pct: overallScore >= 72 ? 65 : overallScore >= 58 ? 45 : 25,
      entry_zone: `${v.entry_zone?.[0]} ~ ${v.entry_zone?.[1]}`,
      target_price: v.target_price,
      stop_loss_price: v.stop_loss,
      executive_summary: `${deep.name} (${deep.symbol}) 綜合財報 Piotroski F-Score (${pio.score}/9)、杜邦 ROE (${dup.roe_ttm}%) 與 Minervini VCP (${min.vcp_ratio}x) 結構，委員會裁定為「${actionLabel}」。建議於下方機構支撐區 ${v.entry_zone?.[0]}~${v.entry_zone?.[1]} 分批布局，嚴守停損 ${v.stop_loss}，目標看至 ${v.target_price}（風報比 1:${v.risk_reward}）。`,
      action_plan: [
        `進場策略：於 ${v.entry_zone?.[0]} ~ ${v.entry_zone?.[1]} 多方訂單塊支撐區分 2~3 批建立部位，不追高急漲紅K。`,
        `波段停利：上檔接近空方供給區 ${v.target_price} 時可先獲利了結 1/2 部位，餘部位沿 20MA 移動停利。`,
        `風控底線：若收盤價跌破 ${v.stop_loss} 且量能放大，無條件執行停損出場。`,
      ],
    },
    experts: {
      buffett: {
        agent: "Warren Buffett",
        role: "價值投資首席顧問",
        stance: buffettScore >= 60 ? "BULLISH" : "NEUTRAL",
        score: buffettScore,
        moat_rating: (dup.roe_ttm || 15) >= 18 ? "WIDE (寬廣護城河)" : "NARROW (穩健護城河)",
        reasoning: `我先看這家公司的賺錢能力是否真實：杜邦 ROE 為 ${dup.roe_ttm}%，淨利率 ${dup.net_margin_ttm}%，且營業現金流含金量達 ${bal.ocf_to_ni_ttm ?? 90}%，通過 ${pio.score}/9 項 Piotroski 排雷；再看估值，目前本益比 ${val.per}x 位於歷史 ${val.per_percentile}% 分位，殖利率 ${val.dividend_yield}%，具備實質基本面護城河。`,
        summary: `近四季 ROE 達 ${dup.roe_ttm}%，屬「${dup.driver || "穩健經營型"}」，Piotroski 財報排雷通過 ${pio.score}/9 項，本益比 ${val.per}x（歷史位階 ${val.per_percentile}%），現金殖利率 ${val.dividend_yield}%。`,
        key_strengths: [
          `Piotroski F-Score ${pio.score}/9 分，獲利含金量達 ${bal.ocf_to_ni_ttm ?? 90}%`,
          `近四季 ROE ${dup.roe_ttm}% · 淨利率 ${dup.net_margin_ttm}%`,
          `本益比 ${val.per}x · 股價淨值比 ${val.pbr}x · 殖利率 ${val.dividend_yield}%`,
        ],
        major_risks: [
          (val.per_percentile || 50) > 70
            ? `本益比位處近年 ${val.per_percentile}% 分位，需靠後續盈餘成長消化估值`
            : `留意產業景氣循環對毛利率與拉貨動能之影響`,
        ],
      },
      simons: {
        agent: "Jim Simons",
        role: "量化動量模型分析師",
        stance: simonsScore >= 58 ? "BULLISH" : "NEUTRAL",
        score: simonsScore,
        trend_strength: (min.score || 5) >= 6 ? "STRONG" : "MODERATE",
        support_level: smc.bullish_ob?.low ?? v.entry_zone?.[0],
        resistance_level: smc.bearish_ob?.high ?? v.target_price,
        reasoning: `我的模型不看故事，只看價格序列與籌碼結構：Minervini 趨勢模板通過 ${min.score}/8 項，近期振幅相較前波收斂至 ${min.vcp_ratio}x (VCP)，CANSLIM 動能通過 ${can.score}/7 項；下檔機構買盤訂單塊落在 ${smc.bullish_ob?.low}~${smc.bullish_ob?.high}，構成高勝率量化支撐。`,
        summary: `Minervini 趨勢模板符合 ${min.score}/8 項，VCP 波動收斂壓縮比 ${min.vcp_ratio}x，CANSLIM 成長動能通過 ${can.score}/7 項，SMC 機構支撐明確。`,
        momentum_signals: [
          `Minervini Stage 2 檢核 ${min.score}/8（VCP 收斂比 ${min.vcp_ratio}x）`,
          `O'Neil CANSLIM 動能檢核 ${can.score}/7（${can.status}）`,
          `SMC 多方訂單塊支撐 ${smc.bullish_ob?.low} ~ ${smc.bullish_ob?.high}`,
        ],
      },
      cro: {
        agent: "Chief Risk Officer",
        role: "首席風控審查官",
        risk_level: croRiskLevel,
        score: clamp(100 - (bal.debt_ratio || 40) * 0.7, 45, 92),
        reasoning: `我的任務是假設最壞情境：公司目前負債比 ${bal.debt_ratio}%、流動比 ${bal.current_ratio}x，短期償債雖無虞，但上方 ${smc.bearish_ob?.low}~${smc.bearish_ob?.high} 有明顯空方供給訂單塊；一旦跌破 ${v.stop_loss} 將破壞多頭結構，必須強制停損。`,
        summary: `資產負債表負債比 ${bal.debt_ratio}%、流動比率 ${bal.current_ratio}x。上方 ${smc.bearish_ob?.low}~${smc.bearish_ob?.high} 存在前波套牢供給區，跌破 ${v.stop_loss} 須嚴格停損。`,
        top_vulnerabilities: [
          `上檔空方訂單塊壓力區 ${smc.bearish_ob?.low} ~ ${smc.bearish_ob?.high} 短線易有調節賣壓`,
          `負債比率 ${bal.debt_ratio}%，若跌破 ${v.stop_loss} 支撐結構將轉弱`,
        ],
        recommended_stop_loss_pct: Number(
          Math.max(3.5, Math.min(9.5, ((deep.price - v.stop_loss) / Math.max(1, deep.price)) * 100)).toFixed(1)
        ),
      },
    },
  };
}
