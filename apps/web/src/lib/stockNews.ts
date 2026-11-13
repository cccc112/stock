export interface NewsHeadlineItem {
  title: string;
  link: string;
  source: string;
  date: string;
  timestamp: number;
}

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

function parseGoogleRss(xml: string, limit: number): NewsHeadlineItem[] {
  const items: NewsHeadlineItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit * 2) {
    const block = match[1];
    const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
    const rawLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
    const rawPubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
    const rawSource = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "";

    let title = decodeHtmlEntities(rawTitle);
    let source = decodeHtmlEntities(rawSource) || "財經快訊";

    const dashIdx = title.lastIndexOf(" - ");
    if (dashIdx > 8) {
      if (!rawSource) {
        source = title.slice(dashIdx + 3).trim();
      }
      title = title.slice(0, dashIdx).trim();
    }

    const parsedTime = rawPubDate ? Date.parse(rawPubDate) : Date.now();
    const timestamp = Number.isNaN(parsedTime) ? Date.now() : parsedTime;

    if (title) {
      items.push({
        title,
        link: decodeHtmlEntities(rawLink),
        source,
        date: new Date(timestamp).toISOString(),
        timestamp,
      });
    }
  }

  items.sort((a, b) => b.timestamp - a.timestamp);
  const seen = new Set<string>();
  const unique: NewsHeadlineItem[] = [];
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

export async function fetchStockNewsQuery(query: string, limit = 3): Promise<NewsHeadlineItem[]> {
  if (!query.trim()) return [];
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query
    )}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

    const res = await fetch(rssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseGoogleRss(xml, limit);
  } catch {
    return [];
  }
}
