import { NextRequest, NextResponse } from "next/server";

const CHINESE_NAME_MAP: Record<string, string> = {
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
  "0050": "元大台灣50",
  "0056": "元大高股息",
  "00878": "國泰永續高股息",
  "00919": "群益台灣精選高息",
  "00929": "復華台灣科技優息",
  "00940": "元大台灣價值高息",
  "006208": "富邦台50",
  NVDA: "輝達 NVIDIA",
  TSLA: "特斯拉 Tesla",
  AAPL: "蘋果 Apple",
  MSFT: "微軟 Microsoft",
  GOOGL: "Google 谷歌",
  AMZN: "亞馬遜 Amazon",
  META: "Meta 臉書",
  AMD: "超微 AMD",
  TSM: "台積電ADR",
  SPY: "標普500 美股",
  QQQ: "那斯達克 美股",
};

const TOPIC_QUERIES: Record<string, string> = {
  MACRO_TW: "台股 OR 加權指數 OR 外資買賣超 OR 台灣經濟 OR 央行",
  MACRO_US: "美股 OR 聯準會 OR 那斯達克 OR 華爾街 OR 輝達 OR 科技股",
  MACRO_ETF: "台股ETF OR 高股息ETF OR 美債ETF OR 0050 OR 00878 OR 殖利率",
  MACRO_GLOBAL: "全球財經 OR 總體經濟 OR 黃金 原油 OR 美元匯率 OR 半導體",
};

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

function parseRssItems(xml: string, limit = 30) {
  const items: {
    title: string;
    link: string;
    date: string;
    timestamp: number;
    source: string;
  }[] = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit * 2) {
    const block = match[1];
    const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
    const rawLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
    const rawPubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
    const rawSource = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "";

    let title = decodeHtmlEntities(rawTitle);
    let source = decodeHtmlEntities(rawSource) || "財經即時快訊";

    // Google News title often ends with " - SourceName"
    const dashIdx = title.lastIndexOf(" - ");
    if (dashIdx > 8) {
      if (!rawSource) {
        source = title.slice(dashIdx + 3).trim();
      }
      title = title.slice(0, dashIdx).trim();
    }

    const parsedTime = rawPubDate ? Date.parse(rawPubDate) : Date.now();
    const timestamp = isNaN(parsedTime) ? Date.now() : parsedTime;
    const dateIso = new Date(timestamp).toISOString();

    if (title) {
      items.push({
        title,
        link: decodeHtmlEntities(rawLink),
        date: dateIso,
        timestamp,
        source,
      });
    }
  }

  // Sort newest first
  items.sort((a, b) => b.timestamp - a.timestamp);

  // Deduplicate by title
  const seen = new Set<string>();
  const unique = [];
  for (const it of items) {
    const key = it.title.slice(0, 24);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(it);
      if (unique.length >= limit) break;
    }
  }

  return unique;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") || "";
  const symbol = (searchParams.get("symbol") || "").trim().toUpperCase();

  let searchQuery = TOPIC_QUERIES.MACRO_TW;

  if (symbol && TOPIC_QUERIES[symbol]) {
    searchQuery = TOPIC_QUERIES[symbol];
  } else if (topic && TOPIC_QUERIES[topic.toUpperCase()]) {
    searchQuery = TOPIC_QUERIES[topic.toUpperCase()];
  } else if (symbol) {
    const cleanCode = symbol.replace(/\.(TW|TWO)$/i, "");
    const cnName = CHINESE_NAME_MAP[cleanCode] || "";
    searchQuery = cnName ? `${cleanCode} ${cnName}` : `${cleanCode} 股價 財經`;
  }

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      searchQuery
    )}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

    const res = await fetch(rssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const xml = await res.text();
    const items = parseRssItems(xml, 30);

    return NextResponse.json({
      query: searchQuery,
      count: items.length,
      data: items,
    });
  } catch (err) {
    console.error("News RSS route error:", err);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
