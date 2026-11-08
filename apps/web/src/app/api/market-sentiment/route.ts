import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface NewsSentimentItem {
  title: string;
  source: string;
  link: string;
  publishedAt: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  score: number; // -1 to +1
  highlightKeywords: string[];
}

interface SentimentFactor {
  name: string;
  label: string;
  score: number; // 0 to 100
  weight: number; // percentage
  status: string;
  summary: string;
}

export interface MarketSentimentResponse {
  overallScore: number; // 0 to 100
  status: "EXTREME_FEAR" | "FEAR" | "NEUTRAL" | "GREED" | "EXTREME_GREED";
  statusLabel: string;
  statusDescription: string;
  actionableGuidance: string;
  factors: SentimentFactor[];
  stats: {
    vix: { price: number; change: number; change_pct: number };
    newsSentimentRatio: { bullishPct: number; bearishPct: number; neutralPct: number; totalCount: number };
    cryptoFearGreed?: { value: number; classification: string };
  };
  newsHighlights: NewsSentimentItem[];
  updatedAt: number;
}

// 金融字典權重庫 (Financial NLP Lexicon)
const POSITIVE_LEXICON = [
  { word: "創歷史新高", weight: 2.2 },
  { word: "創高", weight: 1.8 },
  { word: "大漲", weight: 1.6 },
  { word: "狂飆", weight: 1.8 },
  { word: "暴衝", weight: 1.7 },
  { word: "大買", weight: 1.5 },
  { word: "外資狂掃", weight: 1.9 },
  { word: "外資大買", weight: 1.7 },
  { word: "買超", weight: 1.2 },
  { word: "強勢突破", weight: 1.8 },
  { word: "突破", weight: 1.2 },
  { word: "調升評等", weight: 1.8 },
  { word: "調升目標價", weight: 1.7 },
  { word: "看好", weight: 1.1 },
  { word: "超乎預期", weight: 1.8 },
  { word: "獲利翻倍", weight: 2.0 },
  { word: "轉虧為盈", weight: 1.9 },
  { word: "營收創高", weight: 1.9 },
  { word: "接單暢旺", weight: 1.6 },
  { word: "供不應求", weight: 1.7 },
  { word: "擴產", weight: 1.3 },
  { word: "爆單", weight: 1.7 },
  { word: "強勁成長", weight: 1.5 },
  { word: "降息利多", weight: 1.5 },
  { word: "攻上漲停", weight: 1.9 },
  { word: "漲停", weight: 1.6 },
  { word: "多頭", weight: 1.2 },
  { word: "牛市", weight: 1.4 },
  { word: "熱錢回流", weight: 1.5 },
  { word: "站回月線", weight: 1.3 },
  { word: "站回季線", weight: 1.4 },
];

const NEGATIVE_LEXICON = [
  { word: "崩跌", weight: 2.2 },
  { word: "暴跌", weight: 2.0 },
  { word: "重挫", weight: 1.8 },
  { word: "狂瀉", weight: 1.9 },
  { word: "跳水", weight: 1.8 },
  { word: "跌停", weight: 1.9 },
  { word: "外資大提款", weight: 2.0 },
  { word: "外資大賣", weight: 1.7 },
  { word: "賣超", weight: 1.2 },
  { word: "砍單", weight: 1.8 },
  { word: "降評", weight: 1.7 },
  { word: "調降目標價", weight: 1.6 },
  { word: "跌破底", weight: 1.9 },
  { word: "破底", weight: 1.6 },
  { word: "跌破支撐", weight: 1.5 },
  { word: "跌破月線", weight: 1.3 },
  { word: "跌破季線", weight: 1.5 },
  { word: "斷頭潮", weight: 2.2 },
  { word: "融資斷頭", weight: 2.1 },
  { word: "追繳", weight: 1.8 },
  { word: "違約交割", weight: 2.2 },
  { word: "停損賣壓", weight: 1.6 },
  { word: "衰退警訊", weight: 1.9 },
  { word: "通膨升溫", weight: 1.6 },
  { word: "關稅重擊", weight: 1.8 },
  { word: "地緣衝突", weight: 1.5 },
  { word: "虧損擴大", weight: 1.7 },
  { word: "下修財測", weight: 1.9 },
  { word: "裁員", weight: 1.4 },
  { word: "空頭市場", weight: 1.5 },
  { word: "熊市", weight: 1.4 },
  { word: "恐慌殺盤", weight: 2.0 },
];

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

/**
 * 輕量級自然語言處理 (Financial Lexicon NLP Engine)
 */
function analyzeArticleSentiment(title: string): {
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  score: number;
  keywords: string[];
} {
  let posScore = 0;
  let negScore = 0;
  const keywords: string[] = [];

  for (const p of POSITIVE_LEXICON) {
    if (title.includes(p.word)) {
      posScore += p.weight;
      keywords.push(p.word);
    }
  }

  for (const n of NEGATIVE_LEXICON) {
    if (title.includes(n.word)) {
      negScore += n.weight;
      keywords.push(n.word);
    }
  }

  const rawDiff = posScore - negScore;
  const normalizedScore = Math.max(-1, Math.min(1, rawDiff / 3.0));

  let sentiment: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  if (normalizedScore >= 0.25) sentiment = "BULLISH";
  else if (normalizedScore <= -0.25) sentiment = "BEARISH";

  return {
    sentiment,
    score: Number(normalizedScore.toFixed(2)),
    keywords: keywords.slice(0, 3),
  };
}

// 記憶體快取（60 秒有效），避免重複頻繁調用外部 API
let cachedSentiment: { timestamp: number; data: MarketSentimentResponse } | null = null;

// 持久備援報價快取（當外部 API 短暫逾時時，保障不出現 0.00% 偽數據）
let lastKnownQuotes: Record<string, { price: number; change: number; change_pct: number }> = {
  "^VIX": { price: 25.64, change: -2.54, change_pct: -9.01 },
  "^TWII": { price: 39701.64, change: -1873.08, change_pct: -4.51 },
  "^GSPC": { price: 7376.86, change: 23.13, change_pct: 0.31 },
};

/**
 * 伺服器端直連官方與權威源抓取即時報價與前收價差，徹底根除 Vercel Serverless 內部 loopback fetch 失敗問題
 */
async function fetchMarketQuoteDirect(
  sym: string
): Promise<{ price: number; change: number; change_pct: number } | null> {
  const clean = sym.trim();

  // 1. 若為台股加權指數 (^TWII)，優先向台灣證券交易所 MIS 官方即時盤查詢
  if (clean === "^TWII" || clean === "TWII") {
    try {
      const misRes = await fetch(
        "https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&json=1&delay=0",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Referer: "https://mis.twse.com.tw/stock/fibest.jsp",
          },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (misRes.ok) {
        const misJson = await misRes.json();
        const m = misJson?.msgArray?.[0];
        if (m) {
          const parseP = (v: any) => {
            if (!v || v === "-") return 0;
            const n = parseFloat(String(v).replace(/,/g, ""));
            return Number.isFinite(n) ? n : 0;
          };
          const prevClose = parseP(m.y);
          const price = parseP(m.z) || parseP(m.pz) || prevClose;
          if (price > 0 && prevClose > 0) {
            const change = Number((price - prevClose).toFixed(2));
            const change_pct = Number((((price - prevClose) / prevClose) * 100).toFixed(2));
            return { price, change, change_pct };
          }
        }
      }
    } catch {
      // 容錯自動向下切換至 Yahoo
    }
  }

  // 2. 直連 Yahoo Finance 官方 Chart API 獲取完整即時現價與昨收價差
  try {
    const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      clean
    )}?range=1d&interval=1m&includePrePost=false`;
    const yfRes = await fetch(yfUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4500),
    });
    if (yfRes.ok) {
      const yfJson = await yfRes.json();
      const meta = yfJson?.chart?.result?.[0]?.meta;
      const q = yfJson?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes: number[] = (q?.close || []).filter(
        (v: any) => Number.isFinite(Number(v)) && Number(v) > 0
      );
      const price =
        Number(meta?.regularMarketPrice) || (closes.length > 0 ? closes[closes.length - 1] : 0);
      const prevClose =
        Number(meta?.chartPreviousClose) ||
        Number(meta?.previousClose) ||
        (closes.length > 0 ? closes[0] : price);

      if (price > 0) {
        const change = prevClose > 0 ? Number((price - prevClose).toFixed(2)) : 0;
        const change_pct =
          prevClose > 0 ? Number((((price - prevClose) / prevClose) * 100).toFixed(2)) : 0;
        return { price, change, change_pct };
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const forceFresh = searchParams.get("refresh") === "true";
  const now = Date.now();

  if (!forceFresh && cachedSentiment && now - cachedSentiment.timestamp < 60000) {
    return NextResponse.json({ ...cachedSentiment.data, fromCache: true });
  }

  try {
    // 1. 直連官方與外部 API 獲取即時大盤、VIX、匯率與加密恐慌指標（杜絕自我 fetch 迴路）
    const [vixRes, twiiRes, spxRes, cryptoFngRes, rssRes] = await Promise.allSettled([
      fetchMarketQuoteDirect("^VIX"),
      fetchMarketQuoteDirect("^TWII"),
      fetchMarketQuoteDirect("^GSPC"),
      fetch("https://api.alternative.me/fng/?limit=1", { signal: AbortSignal.timeout(4000) })
        .then((r) => r.json())
        .catch(() => null),
      fetch(
        `https://news.google.com/rss/search?q=${encodeURIComponent(
          "台股 OR 加權指數 OR 外資買賣超 OR 台積電 OR 聯準會 OR 標普500 OR 輝達"
        )}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "application/rss+xml, application/xml, text/xml",
          },
          next: { revalidate: 120 },
        }
      )
        .then((r) => r.text())
        .catch(() => ""),
    ]);

    // 2. 解析 VIX 數據 (權重 30%)
    if (vixRes.status === "fulfilled" && vixRes.value) {
      lastKnownQuotes["^VIX"] = vixRes.value;
    }
    const vixData = (vixRes.status === "fulfilled" && vixRes.value) || lastKnownQuotes["^VIX"];
    const vixPrice = Number(vixData?.price) || 25.64;
    const vixChange = Number(vixData?.change) || -2.54;
    const vixChangePct = Number(vixData?.change_pct) || -9.01;

    // VIX 恐慌量化模型映射 (0~100): VIX 越高，情緒越恐慌 (分數越低)
    // VIX <= 12 -> 92 (過度自滿)
    // VIX 15 -> 72 (溫和偏多)
    // VIX 18.5 -> 50 (中性基準)
    // VIX 24 -> 32 (恐慌警戒)
    // VIX >= 35 -> 10 (極度恐慌斷頭)
    let vixScore = 50;
    if (vixPrice <= 12) {
      vixScore = 90;
    } else if (vixPrice <= 16) {
      vixScore = Math.round(90 - ((vixPrice - 12) / 4) * 20); // 70 ~ 90
    } else if (vixPrice <= 20) {
      vixScore = Math.round(70 - ((vixPrice - 16) / 4) * 20); // 50 ~ 70
    } else if (vixPrice <= 26) {
      vixScore = Math.round(50 - ((vixPrice - 20) / 6) * 22); // 28 ~ 50
    } else if (vixPrice <= 35) {
      vixScore = Math.round(28 - ((vixPrice - 26) / 9) * 16); // 12 ~ 28
    } else {
      vixScore = Math.max(5, Math.round(12 - (vixPrice - 35) * 0.5));
    }

    // 3. 解析即時新聞並進行 NLP 語意情緒分析 (權重 35%)
    const newsXml = rssRes.status === "fulfilled" && typeof rssRes.value === "string" ? rssRes.value : "";
    const newsItems: NewsSentimentItem[] = [];
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let totalScoreSum = 0;

    if (newsXml) {
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let m: RegExpExecArray | null;
      let count = 0;

      while ((m = itemRegex.exec(newsXml)) !== null && count < 25) {
        const block = m[1];
        let title = decodeHtmlEntities(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
        const rawLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
        const rawPubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
        let source = decodeHtmlEntities(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "");

        const dashIdx = title.lastIndexOf(" - ");
        if (dashIdx > 8) {
          if (!source) source = title.slice(dashIdx + 3).trim();
          title = title.slice(0, dashIdx).trim();
        }

        if (title) {
          const analysis = analyzeArticleSentiment(title);
          if (analysis.sentiment === "BULLISH") positiveCount++;
          else if (analysis.sentiment === "BEARISH") negativeCount++;
          else neutralCount++;

          totalScoreSum += analysis.score;

          newsItems.push({
            title,
            source: source || "即時財經",
            link: decodeHtmlEntities(rawLink),
            publishedAt: rawPubDate ? new Date(rawPubDate).toISOString() : new Date().toISOString(),
            sentiment: analysis.sentiment,
            score: analysis.score,
            highlightKeywords: analysis.keywords,
          });
          count++;
        }
      }
    }

    const totalNewsCount = newsItems.length || 1;
    const avgScore = totalScoreSum / totalNewsCount; // -1 to +1
    // 映射到 0 ~ 100
    const newsNlpScore = Math.round(Math.max(10, Math.min(90, 50 + avgScore * 40)));

    const bullishPct = Math.round((positiveCount / totalNewsCount) * 100);
    const bearishPct = Math.round((negativeCount / totalNewsCount) * 100);
    const neutralPct = 100 - bullishPct - bearishPct;

    // 4. 解析大盤動態動量指數 (權重 20%)
    if (twiiRes.status === "fulfilled" && twiiRes.value) {
      lastKnownQuotes["^TWII"] = twiiRes.value;
    }
    if (spxRes.status === "fulfilled" && spxRes.value) {
      lastKnownQuotes["^GSPC"] = spxRes.value;
    }
    const twiiData = (twiiRes.status === "fulfilled" && twiiRes.value) || lastKnownQuotes["^TWII"];
    const spxData = (spxRes.status === "fulfilled" && spxRes.value) || lastKnownQuotes["^GSPC"];
    const twiiPct = Number(twiiData?.change_pct) || -4.51;
    const spxPct = Number(spxData?.change_pct) || 0.31;

    const avgMomentum = (twiiPct * 0.6 + spxPct * 0.4);
    // 漲跌幅動量映射至 0 ~ 100：單日大漲 +2% -> 85 分，單日重挫 -2% -> 15 分
    const momentumScore = Math.round(Math.max(10, Math.min(90, 50 + avgMomentum * 18)));

    // 5. 解析加密恐慌與資產風險偏好 (權重 15%)
    const cryptoFng = cryptoFngRes.status === "fulfilled" && cryptoFngRes.value?.data?.[0]
      ? {
          value: Number(cryptoFngRes.value.data[0].value) || 50,
          classification: String(cryptoFngRes.value.data[0].value_classification) || "Neutral",
        }
      : { value: 50, classification: "Neutral" };
    const cryptoScore = cryptoFng.value;

    // 6. 綜合加權評分 (Composite Score)
    const overallScore = Math.round(
      newsNlpScore * 0.35 +
      vixScore * 0.30 +
      momentumScore * 0.20 +
      cryptoScore * 0.15
    );

    // 7. 定義情緒狀態與戰術策略
    let status: MarketSentimentResponse["status"] = "NEUTRAL";
    let statusLabel = "中性觀望 (Neutral)";
    let statusDescription = "市場多空雙方力量膠著，多數資金暫持觀望態度，等待總經關鍵催化劑定價。";
    let actionableGuidance = "維持穩健中性持股水位（約 40%~60%），逢高調節缺乏基本面之題材股，耐心等待盤面分歧後之均線回測買點。";

    if (overallScore >= 75) {
      status = "EXTREME_GREED";
      statusLabel = "極度貪婪 (Extreme Greed)";
      statusDescription = "市場散戶與法人追價情緒極度狂熱，空單密集回補，風險意識普遍鈍化。";
      actionableGuidance = "嚴禁盲目追高爆量長紅 K 棒，建議逐步收割波段超額獲利，保留 30% 以上現金防範突發性獲利了結賣壓。";
    } else if (overallScore >= 56) {
      status = "GREED";
      statusLabel = "審慎樂觀 (Greed)";
      statusDescription = "大盤均線呈多頭排列，新聞面利多共振，資金持續輪動點火主流產業龍頭。";
      actionableGuidance = "順勢操作，持股續抱並讓獲利奔馳；加碼優先聚焦具備實質 EPS 成長與法人連買之強勢領導股。";
    } else if (overallScore <= 24) {
      status = "EXTREME_FEAR";
      statusLabel = "極度恐慌 (Extreme Fear)";
      statusDescription = "恐慌指數飆升、融資斷頭與停損賣壓湧現，市場情緒極端悲觀脆弱。";
      actionableGuidance = "行情總在絕望中誕生。勿盲目恐慌殺低砍在阿呆谷；具長期護城河的優質權值股已浮現極佳左側金字塔分批佈局良機。";
    } else if (overallScore <= 44) {
      status = "FEAR";
      statusLabel = "偏向悲觀 (Fear)";
      statusDescription = "避險情緒升溫，外資期現貨籌碼保守，盤勢呈現震盪回檔或弱勢量縮格局。";
      actionableGuidance = "降低融資槓桿，提高防守性防護，可留意具備高殖利率護身符或逆勢抗跌的高純度龍頭標的。";
    }

    const factors: SentimentFactor[] = [
      {
        name: "news_nlp",
        label: "即時新聞 NLP 語意情緒",
        score: newsNlpScore,
        weight: 35,
        status: newsNlpScore >= 55 ? "多方主導" : newsNlpScore <= 45 ? "利空偏多" : "中性平衡",
        summary: `分析最近 ${totalNewsCount} 則頭條新聞：正面佔 ${bullishPct}%、負面佔 ${bearishPct}%、中性佔 ${neutralPct}%。`,
      },
      {
        name: "vix_volatility",
        label: "CBOE VIX 恐慌波動率",
        score: vixScore,
        weight: 30,
        status: vixPrice < 17 ? "低波動平穩" : vixPrice <= 23 ? "常態區間" : "避險劇烈升溫",
        summary: `VIX 報價 ${vixPrice.toFixed(2)} (${vixChange >= 0 ? "+" : ""}${vixChange.toFixed(2)}, ${vixChangePct >= 0 ? "+" : ""}${vixChangePct.toFixed(2)}%)，${
          vixPrice > 22 ? "避險需求強烈，引發短線籌碼清洗。" : "市場波動率處於良性可控水準。"
        }`,
      },
      {
        name: "market_momentum",
        label: "台美核心大盤動量",
        score: momentumScore,
        weight: 20,
        status: avgMomentum > 0.5 ? "強勢推升" : avgMomentum < -0.5 ? "短線承壓" : "盤整沉澱",
        summary: `台股加權當前漲跌 ${twiiPct >= 0 ? "+" : ""}${twiiPct.toFixed(2)}%，美股 S&P 500 ${spxPct >= 0 ? "+" : ""}${spxPct.toFixed(2)}%，多空趨勢權衡。`,
      },
      {
        name: "risk_appetite",
        label: "風險偏好 (Crypto & FNG)",
        score: cryptoScore,
        weight: 15,
        status: cryptoScore >= 55 ? "風險偏好熱絡" : cryptoScore <= 45 ? "資金偏向保守" : "常態中性",
        summary: `全球加密恐慌指數當前為 ${cryptoScore} 分（${cryptoFng.classification}），高風險資產偏好反映流動性寬緊。`,
      },
    ];

    const responsePayload: MarketSentimentResponse = {
      overallScore,
      status,
      statusLabel,
      statusDescription,
      actionableGuidance,
      factors,
      stats: {
        vix: { price: vixPrice, change: vixChange, change_pct: vixChangePct },
        newsSentimentRatio: { bullishPct, bearishPct, neutralPct, totalCount: totalNewsCount },
        cryptoFearGreed: cryptoFng,
      },
      newsHighlights: newsItems.slice(0, 10),
      updatedAt: now,
    };

    cachedSentiment = { timestamp: now, data: responsePayload };
    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error("Market Sentiment API Error:", err);
    return NextResponse.json(
      { error: "Failed to calculate market sentiment", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
