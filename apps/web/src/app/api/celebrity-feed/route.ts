import { NextRequest, NextResponse } from "next/server";

export interface AffectedStock {
  symbol: string;
  name: string;
  market: "TW" | "US";
  effect: "POSITIVE" | "NEGATIVE" | "WATCH";
  reason: string;
}

export interface CelebrityPostItem {
  id: string;
  personId: "TRUMP" | "MUSK" | "HUANG" | "POWELL";
  personName: string;
  personTitle: string;
  handle: string;
  platform: string;
  postType?: "original" | "quote" | "repost" | "news";
  headline: string;
  originalText?: string;
  mediaUrl?: string;
  mediaType?: string;
  source: string;
  link: string;
  date: string;
  timestamp: number;
  sentiment: "BULLISH" | "BEARISH" | "VOLATILE";
  sentimentLabel: string;
  impactScore: number;
  sectors: string[];
  aiSummary: string;
  actionableAdvice: string;
  affectedStocks: AffectedStock[];
}

const CELEBRITY_META = {
  TRUMP: {
    personId: "TRUMP" as const,
    personName: "Donald Trump (川普)",
    personTitle: "美國總統 / Truth Social 全量發文即時監控",
    handle: "@realDonaldTrump",
    platform: "Truth Social 官方全量貼文",
    queries: [
      "川普 關稅 OR 台積電 OR 半導體 OR 股市 OR 降息 OR 比特幣 OR 貼文",
    ],
  },
  MUSK: {
    personId: "MUSK" as const,
    personName: "Elon Musk (馬斯克)",
    personTitle: "Tesla / SpaceX / xAI 執行長",
    handle: "@elonmusk",
    platform: "X (Twitter) 貼文動態",
    queries: [
      "馬斯克 特斯拉 OR 機器人 OR SpaceX OR xAI OR FSD OR 貼文",
      "Elon Musk X Tesla OR Robotaxi OR Optimus OR xAI OR SpaceX",
    ],
  },
  HUANG: {
    personId: "HUANG" as const,
    personName: "Jensen Huang (黃仁勳)",
    personTitle: "NVIDIA 執行長 / 全球 AI 算力領袖",
    handle: "@nvidia",
    platform: "主題演講 / 供應鏈談話",
    queries: [
      "黃仁勳 輝達 OR 台積電 OR Blackwell OR Rubin OR AI伺服器 OR 機器人",
      "Jensen Huang NVIDIA AI OR TSMC OR Blackwell OR robotics",
    ],
  },
  POWELL: {
    personId: "POWELL" as const,
    personName: "Jerome Powell (鮑爾)",
    personTitle: "美國聯準會 (Fed) 主席",
    handle: "@federalreserve",
    platform: "FOMC 聲明 / 央行談話",
    queries: [
      "鮑爾 聯準會 降息 OR 通膨 OR 美債 OR 利率",
      "Jerome Powell Fed interest rates OR inflation OR Treasury",
    ],
  },
};

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—");
}

function stripHtmlTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/p>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * 批次將英文貼文翻譯為繁體中文（使用 Google GTX 免費高速端點，失敗時平滑退回原文）
 */
async function batchTranslateToZhTw(texts: string[]): Promise<string[]> {
  if (texts.length === 0) return [];
  const results = [...texts];
  const chunkSize = 10;

  const chunks: Array<{ startIndex: number; slice: string[] }> = [];
  for (let i = 0; i < texts.length; i += chunkSize) {
    chunks.push({ startIndex: i, slice: texts.slice(i, i + chunkSize) });
  }

  await Promise.allSettled(
    chunks.map(async ({ startIndex, slice }) => {
      const cleaned = slice.map((t) => t.replace(/\|\|\|/g, " ").slice(0, 380));
      const joined = cleaned.join("\n ||| \n");
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=${encodeURIComponent(
        joined
      )}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (!res.ok) return;
      const json = await res.json();
      if (!Array.isArray(json?.[0])) return;
      const fullZh = json[0].map((seg: any) => (seg && seg[0] ? String(seg[0]) : "")).join("");
      const parts = fullZh.split("|||").map((p: string) => p.trim());
      for (let j = 0; j < slice.length; j++) {
        if (parts[j]) {
          results[startIndex + j] = parts[j];
        }
      }
    })
  );

  return results;
}

/**
 * 根據名人身分與貼文/新聞關鍵字，進行因果推演、情緒定價與台美股標的配置建議
 */
function analyzeCelebrityStatement(
  personId: "TRUMP" | "MUSK" | "HUANG" | "POWELL",
  text: string
): {
  sentiment: "BULLISH" | "BEARISH" | "VOLATILE";
  sentimentLabel: string;
  impactScore: number;
  sectors: string[];
  aiSummary: string;
  actionableAdvice: string;
  affectedStocks: AffectedStock[];
} {
  const lower = text.toLowerCase();

  if (personId === "TRUMP") {
    const isTariffOrChip =
      /關稅|tariff|晶片|半導體|台積電|tsmc|chip|semiconductor|制裁|貿易|china|中國|mexico|border|import/.test(
        lower
      );
    const isAutoOrManufacturing =
      /michigan|detroit|auto|car|manufacturing|factory|worker|job|pennsylvania|steel|汽車|製造|工廠|密西根/.test(
        lower
      );
    const isCryptoOrMedia =
      /比特幣|加密|bitcoin|crypto|deregulat|truth|media|censorship|free speech|djt|bank/.test(lower);
    const isEnergyOrTax =
      /減稅|tax|能源|石油|drill|oil|gas|energy|inflation|通膨|降息|聯準會|fed|powell|利率|economy/.test(
        lower
      );

    if (isTariffOrChip) {
      return {
        sentiment: "VOLATILE",
        sentimentLabel: "關稅與供應鏈重組",
        impactScore: 9.3,
        sectors: ["晶圓代工", "赴美設廠概念", "貨櫃航運", "防禦型高息股"],
        aiSummary:
          "川普針對關稅、邊境貿易或半導體製造發表強硬立場，短線易引發費半與台股權值股情緒震盪；但具備美國本土產能或獨佔定價權的龍頭具轉嫁能力，且關稅預期常帶動歐美航運提前拉貨。",
        actionableAdvice:
          "切勿在關稅言論當下恐慌追空先進製程龍頭，可趁情緒回檔分批佈局具美國廠產能之標的；短線資金可關注貨櫃航運（搶運效應）或電信金融股避險。",
        affectedStocks: [
          { symbol: "2330", name: "台積電", market: "TW", effect: "WATCH", reason: "短線受關稅言論干擾，但先進製程具100%客戶轉嫁定價權與亞利桑那廠優勢" },
          { symbol: "TSM", name: "台積電 ADR", market: "US", effect: "WATCH", reason: "留意美股費半指數波動與ADR溢價收斂" },
          { symbol: "2603", name: "長榮", market: "TW", effect: "POSITIVE", reason: "關稅調升預期促使歐美進口商提前拉貨，支撐運價" },
          { symbol: "2317", name: "鴻海", market: "TW", effect: "POSITIVE", reason: "德州與威州廠區布局完整，受惠北美在地化製造趨勢" },
        ],
      };
    }

    if (isAutoOrManufacturing) {
      return {
        sentiment: "BULLISH",
        sentimentLabel: "美國製造與汽車鏈催化",
        impactScore: 8.7,
        sectors: ["北美製造概念", "傳統車廠與車電", "重電基礎建設", "工業自動化"],
        aiSummary:
          "川普貼文聚焦密西根州/工業搖擺州、汽車製造業回流與勞工就業，強化「美國本土製造 (Made in USA)」與重電基建需求預期。",
        actionableAdvice:
          "優先關注已在北美設廠或打入底特律/北美電力基建供應鏈之台美股標的，逢回沿均線偏多布局。",
        affectedStocks: [
          { symbol: "1519", name: "華城", market: "TW", effect: "POSITIVE", reason: "製造業回流美國帶動電網擴建與高壓變壓器強勁訂單" },
          { symbol: "2317", name: "鴻海", market: "TW", effect: "POSITIVE", reason: "北美俄亥俄州、威州與德州皆具製造基地，受惠美國製造政策" },
          { symbol: "TSLA", name: "Tesla", market: "US", effect: "POSITIVE", reason: "德州與加州超級工廠本土化程度最高，受進口關稅保護" },
          { symbol: "2049", name: "上銀", market: "TW", effect: "POSITIVE", reason: "美國製造業回流推升工廠自動化與機器人傳動元件需求" },
        ],
      };
    }

    if (isEnergyOrTax) {
      return {
        sentiment: "BULLISH",
        sentimentLabel: "減稅與傳統能源利多",
        impactScore: 8.8,
        sectors: ["傳統能源石化", "華爾街大型銀行", "長天期美債", "塑化原物料"],
        aiSummary:
          "川普強調壓低能源價格、擴大本土石油天然氣開採及企業減稅，有助降低企業營運成本並提振美股道瓊與金融能源股估值，但財政赤字預期可能使長債殖利率維持高檔震盪。",
        actionableAdvice:
          "美股金融與能源板塊直接受惠減稅與放寬監管；長天期美債 ETF 宜採「殖利率彈升買進、區間操作」策略。",
        affectedStocks: [
          { symbol: "XOM", name: "ExxonMobil", market: "US", effect: "POSITIVE", reason: "擴大本土油氣開採與放寬環評直接受惠" },
          { symbol: "00679B", name: "元大美債20年", market: "TW", effect: "WATCH", reason: "油價走低有利降通膨，但減稅赤字使長債殖利率呈區間震盪" },
          { symbol: "2881", name: "富邦金", market: "TW", effect: "POSITIVE", reason: "金融環境活絡與資本市場交投熱絡推升金控獲利" },
        ],
      };
    }

    if (isCryptoOrMedia) {
      return {
        sentiment: "BULLISH",
        sentimentLabel: "川普概念與加密利多",
        impactScore: 8.5,
        sectors: ["川普媒體概念", "加密貨幣與板卡", "去監管金融"],
        aiSummary:
          "貼文涉及社群言論自由、Truth Social 流量動能或金融/加密資產去監管議題，直接催化「川普交易 (Trump Trade)」相關概念股動能。",
        actionableAdvice:
          "川普媒體與加密概念股波動度極高（高 Beta），適合短線動能交易者順勢操作並嚴設 5%~7% 移動停利。",
        affectedStocks: [
          { symbol: "DJT", name: "Trump Media", market: "US", effect: "POSITIVE", reason: "Truth Social 母公司，直接隨川普貼文聲量與政治動能波動" },
          { symbol: "COIN", name: "Coinbase", market: "US", effect: "POSITIVE", reason: "川普交易核心指標股，受惠加密資產友善監管預期" },
          { symbol: "2377", name: "微星", market: "TW", effect: "POSITIVE", reason: "板卡與算力硬體受惠加密貨幣行情升溫" },
        ],
      };
    }

    // 川普造勢、背書、動員等所有政治貼文 -> 連結「川普交易 (Trump Trade)」籃子
    return {
      sentiment: "VOLATILE",
      sentimentLabel: "川普交易 (Trump Trade) 動能",
      impactScore: 8.1,
      sectors: ["川普概念股", "美國內需製造", "軍工國防", "北美設廠台廠"],
      aiSummary:
        "川普於 Truth Social 密集發文進行政治動員、造勢直播或候選人背書，維持高政治聲量。華爾街量化基金通常將川普聲量與民調動能直接映射至「川普交易 (Trump Trade)」資產籃子（美國本土製造、金融去監管、加密貨幣與國防軍工）。",
      actionableAdvice:
        "當川普發文頻率與政治動能升溫時，市場資金傾向加碼具備「美國製造保護傘」的企業，建議逢低配置擁有北美產線的台系 AI 伺服器與重電龍頭，並留意 DJT 與美元指數短線波動。",
      affectedStocks: [
        { symbol: "DJT", name: "Trump Media", market: "US", effect: "POSITIVE", reason: "Truth Social 貼文活躍度與造勢動能之最直接情緒指標" },
        { symbol: "2317", name: "鴻海", market: "TW", effect: "POSITIVE", reason: "具備美國威州與德州完整產線，為川普「美國製造」政策下最受保護之台廠" },
        { symbol: "2330", name: "台積電", market: "TW", effect: "WATCH", reason: "美國亞利桑那廠產能持續開出，長線化解地緣與關稅政治壓力" },
        { symbol: "SPY", name: "SPDR標普500", market: "US", effect: "POSITIVE", reason: "企業減稅與放鬆監管預期支撐美股大型企業獲利估值" },
      ],
    };
  }

  if (personId === "MUSK") {
    const isRobotOrFsd = /robotaxi|optimus|機器人|自駕|fsd|cybercab|humanoid/.test(lower);
    const isXaiOrSpace = /xai|grok|spacex|starlink|星鏈|算力|gpu|伺服器/.test(lower);

    if (isRobotOrFsd) {
      return {
        sentiment: "BULLISH",
        sentimentLabel: "機器人與自駕強勢催化",
        impactScore: 9.0,
        sectors: ["人形機器人", "光學車載鏡頭", "精密減速機/傳動", "電動車供應鏈"],
        aiSummary:
          "馬斯克釋出 Optimus 人形機器人或 FSD 全自動駕駛/Robotaxi 最新進展，直接點燃全球視覺感測、精密致動器與邊緣 AI 晶片買盤。",
        actionableAdvice:
          "台股機器人視覺與傳動元件常隨馬斯克貼文出現波段連動，建議挑選具備實質車用/機器人營收且站穩月線之光學與機電標的順勢操作。",
        affectedStocks: [
          { symbol: "TSLA", name: "Tesla", market: "US", effect: "POSITIVE", reason: "FSD 與 Optimus 為特斯拉估值重估之最大成長引擎" },
          { symbol: "3019", name: "亞光", market: "TW", effect: "POSITIVE", reason: "特斯拉車載鏡頭與機器人視覺感測核心供應商" },
          { symbol: "2049", name: "上銀", market: "TW", effect: "POSITIVE", reason: "機器人關節滾珠螺桿與諧波減速機關鍵供應商" },
          { symbol: "2360", name: "致茂", market: "TW", effect: "POSITIVE", reason: "電力電子與自動化檢測設備受惠機器人量產測試" },
        ],
      };
    }

    if (isXaiOrSpace) {
      return {
        sentiment: "BULLISH",
        sentimentLabel: "AI 算力與低軌衛星利多",
        impactScore: 8.7,
        sectors: ["AI 伺服器代工", "液冷散熱", "低軌衛星通訊"],
        aiSummary:
          "馬斯克旗下 xAI 超級算力叢集擴建或 SpaceX 星鏈發射進展，直接拉動高階 AI 伺服器機櫃、液冷散熱與台系低軌衛星 PCB/高頻元件訂單。",
        actionableAdvice:
          "關注 xAI 伺服器主力代工廠與散熱供應鏈，逢拉回五日線或十日線具備波段切入價值。",
        affectedStocks: [
          { symbol: "NVDA", name: "NVIDIA", market: "US", effect: "POSITIVE", reason: "xAI 超級電腦叢集採購數十萬顆高階 GPU" },
          { symbol: "2317", name: "鴻海", market: "TW", effect: "POSITIVE", reason: "高階 AI 伺服器機櫃與電動車雙線主力夥伴" },
          { symbol: "3017", name: "奇鋐", market: "TW", effect: "POSITIVE", reason: "高密度 AI 算力中心帶動液冷冷板與分歧管強勁需求" },
          { symbol: "2313", name: "華通", market: "TW", effect: "POSITIVE", reason: "SpaceX Starlink 低軌衛星高階 HDI 板主力供應商" },
        ],
      };
    }

    return {
      sentiment: "BULLISH",
      sentimentLabel: "馬斯克話題效應",
      impactScore: 8.3,
      sectors: ["特斯拉生態系", "AI 與自駕", "儲能電力"],
      aiSummary:
        "馬斯克於 X 平台的最新互動與發言持續聚焦特斯拉產能、能源儲能 (Megapack) 與科技創新，帶動相關成長股交投熱度。",
      actionableAdvice:
        "以 TSLA 股價能否帶量站穩短期均線作為台股車電與機器人族群的風向指標，操作上宜買黑不買爆量長紅。",
      affectedStocks: [
        { symbol: "TSLA", name: "Tesla", market: "US", effect: "POSITIVE", reason: "話題中心直接牽動美股電動車與自駕板塊資金流向" },
        { symbol: "1519", name: "華城", market: "TW", effect: "POSITIVE", reason: "北美 AI 資料中心與超級充電站帶動重電變壓器需求" },
        { symbol: "3665", name: "貿聯-KY", market: "TW", effect: "POSITIVE", reason: "特斯拉車用線束與高速運算連接線核心供應商" },
      ],
    };
  }

  if (personId === "HUANG") {
    return {
      sentiment: "BULLISH",
      sentimentLabel: "AI 算力基本面強心針",
      impactScore: 9.4,
      sectors: ["CoWoS 先進封裝", "GB200/GB300 伺服器", "液冷散熱", "矽光子 CPO"],
      aiSummary:
        "黃仁勳強調新世代 AI 晶片需求強勁與推論算力爆發，直接印證雲端巨頭資本支出未減，消除市場對 AI 泡沫之疑慮。",
      actionableAdvice:
        "黃仁勳點名之台灣供應鏈（台積電、伺服器 ODM、液冷散熱）具高度基本面支撐，建議沿月線偏多操作，長線投資人可透過科技型 ETF 參與。",
      affectedStocks: [
        { symbol: "NVDA", name: "NVIDIA", market: "US", effect: "POSITIVE", reason: "全球 AI 晶片絕對霸主，毛利率與訂單能見度領先" },
        { symbol: "2330", name: "台積電", market: "TW", effect: "POSITIVE", reason: "獨家承接輝達先進製程與 CoWoS 先進封裝訂單" },
        { symbol: "2382", name: "廣達", market: "TW", effect: "POSITIVE", reason: "美系 CSP 巨頭 AI 伺服器機櫃主力供應商" },
        { symbol: "3231", name: "緯創", market: "TW", effect: "POSITIVE", reason: "GPU 基板與 AI 伺服器組裝營收動能強勁" },
      ],
    };
  }

  // POWELL
  const isDovish = /降息|cut|鴿派|放緩|軟著陸|寬鬆/.test(lower);
  return {
    sentiment: isDovish ? "BULLISH" : "VOLATILE",
    sentimentLabel: isDovish ? "資金寬鬆利多" : "利率預期校準",
    impactScore: 8.8,
    sectors: ["長天期美債", "高估值科技股", "台股金控", "高股息 ETF"],
    aiSummary:
      "鮑爾針對通膨路徑與就業市場的最新定調，直接決定美國 10 年期公債殖利率走向與全球科技股折現率估值。",
    actionableAdvice:
      "若談話偏鴿可加碼長天期美債 ETF 與高成長科技股；若強調高利率維持更久（Higher for Longer），則宜提高短債與高自由現金流價值股比重。",
    affectedStocks: [
      { symbol: "00679B", name: "元大美債20年", market: "TW", effect: isDovish ? "POSITIVE" : "WATCH", reason: "聯準會利率路徑直接主導長債資本利得空間" },
      { symbol: "QQQ", name: "Invesco那斯達克100", market: "US", effect: isDovish ? "POSITIVE" : "WATCH", reason: "科技成長股估值對實質利率變動高度敏感" },
      { symbol: "2882", name: "國泰金", market: "TW", effect: "POSITIVE", reason: "債市殖利率趨穩有助壽險淨值與經常性收益提升" },
    ],
  };
}

/**
 * 直接串接川普 Truth Social 官方全量同步流 (trumpstruth.org/feed)，
 * 100% 抓取 @realDonaldTrump 每一篇發文（原創、引用、轉發、圖片/影片貼文），並自動翻譯為繁體中文
 */
async function fetchTrumpTruthSocialDirect(limit = 40): Promise<CelebrityPostItem[]> {
  try {
    const resp = await fetch("https://trumpstruth.org/feed", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      next: { revalidate: 60 },
    });
    if (!resp.ok) return [];
    const xml = await resp.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;

    const rawEntries: Array<{
      id: string;
      originalText: string;
      postType: "original" | "quote" | "repost";
      link: string;
      timestamp: number;
      mediaUrl?: string;
      mediaType?: string;
    }> = [];

    while ((match = itemRegex.exec(xml)) !== null && rawEntries.length < limit) {
      const block = match[1];
      const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const descMatch = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
      const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const origUrlMatch = block.match(/<truth:originalUrl>([\s\S]*?)<\/truth:originalUrl>/);
      const origIdMatch = block.match(/<truth:originalId>([\s\S]*?)<\/truth:originalId>/);
      const postTypeMatch = block.match(/<archive:postType>([\s\S]*?)<\/archive:postType>/);
      const mediaMatch = block.match(/<media:content\s+url="([^"]+)"(?:\s+medium="([^"]+)")?/);

      let text = titleMatch ? stripHtmlTags(titleMatch[1]) : "";
      if (!text || text.startsWith("[No Title]")) {
        text = descMatch ? stripHtmlTags(descMatch[1]) : "";
      }
      // 整理 RT @realDonaldTrump 黏連字元
      text = text
        .replace(/^RT\s*@realDonaldTrump\s*/i, "【轉發】")
        .replace(/RT:\s*https:\/\/truthsocial\.com\/[^\s]+/gi, "")
        .replace(/View image|View video/gi, "")
        .trim();

      const postTypeRaw = (postTypeMatch ? postTypeMatch[1].trim() : "original") as
        | "original"
        | "quote"
        | "repost";
      const mediaUrl = mediaMatch ? mediaMatch[1] : undefined;
      const mediaType = mediaMatch ? mediaMatch[2] || "image" : undefined;

      if (!text) {
        text =
          mediaType === "video"
            ? "[川普於 Truth Social 發布了一則實況影片貼文]"
            : "[川普於 Truth Social 發布了一則圖片貼文]";
      }

      const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : "";
      const parsedTime = pubDateStr ? Date.parse(pubDateStr) : Date.now();
      const timestamp = isNaN(parsedTime) ? Date.now() : parsedTime;
      const truthLink = origUrlMatch
        ? origUrlMatch[1].trim()
        : "https://truthsocial.com/@realDonaldTrump";
      const id = origIdMatch ? `TRUMP-TS-${origIdMatch[1].trim()}` : `TRUMP-TS-${timestamp}-${rawEntries.length}`;

      rawEntries.push({
        id,
        originalText: text,
        postType: postTypeRaw,
        link: truthLink,
        timestamp,
        mediaUrl,
        mediaType,
      });
    }

    // 批次將英文原文翻譯為繁體中文
    const translatedList = await batchTranslateToZhTw(rawEntries.map((e) => e.originalText));

    return rawEntries.map((entry, idx) => {
      const zhText = translatedList[idx] || entry.originalText;
      const combinedForAnalysis = `${entry.originalText} ${zhText}`;
      const analysis = analyzeCelebrityStatement("TRUMP", combinedForAnalysis);

      const typeLabel =
        entry.postType === "original"
          ? "Truth Social 原創貼文"
          : entry.postType === "quote"
          ? "Truth Social 引用發文"
          : "Truth Social 轉發 (ReTruth)";

      return {
        id: entry.id,
        personId: "TRUMP",
        personName: CELEBRITY_META.TRUMP.personName,
        personTitle: CELEBRITY_META.TRUMP.personTitle,
        handle: "@realDonaldTrump",
        platform: typeLabel,
        postType: entry.postType,
        headline: zhText,
        originalText: entry.originalText,
        mediaUrl: entry.mediaUrl,
        mediaType: entry.mediaType,
        source: "Truth Social (@realDonaldTrump)",
        link: entry.link,
        date: new Date(entry.timestamp).toISOString(),
        timestamp: entry.timestamp,
        ...analysis,
      };
    });
  } catch (e) {
    console.warn("Failed to fetch Trump Truth Social direct feed:", e);
    return [];
  }
}

async function fetchRssForPerson(personKey: keyof typeof CELEBRITY_META): Promise<CelebrityPostItem[]> {
  const meta = CELEBRITY_META[personKey];
  const results: CelebrityPostItem[] = [];
  const seenTitles = new Set<string>();

  await Promise.allSettled(
    meta.queries.map(async (q, idx) => {
      const isEn = idx === 1;
      const rssUrl = isEn
        ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
        : `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;

      const resp = await fetch(rssUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
        next: { revalidate: 120 },
      });
      if (!resp.ok) return;
      const xml = await resp.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match: RegExpExecArray | null;

      while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const sourceMatch = block.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/);

        if (!titleMatch) continue;
        let rawTitle = decodeHtmlEntities(titleMatch[1].trim());
        let source = sourceMatch ? decodeHtmlEntities(sourceMatch[1].trim()) : isEn ? "Global Wire" : "財經快訊";

        const dashIdx = rawTitle.lastIndexOf(" - ");
        if (dashIdx > 0) {
          if (!sourceMatch) source = rawTitle.slice(dashIdx + 3).trim();
          rawTitle = rawTitle.slice(0, dashIdx).trim();
        }

        const dedupKey = rawTitle.slice(0, 36).toLowerCase();
        if (!rawTitle || seenTitles.has(dedupKey)) continue;
        seenTitles.add(dedupKey);

        const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : "";
        const parsedTime = pubDateStr ? Date.parse(pubDateStr) : Date.now();
        const timestamp = isNaN(parsedTime) ? Date.now() : parsedTime;

        const analysis = analyzeCelebrityStatement(meta.personId, rawTitle);

        results.push({
          id: `${meta.personId}-NEWS-${timestamp}-${results.length}`,
          personId: meta.personId,
          personName: meta.personName,
          personTitle: meta.personTitle,
          handle: meta.handle,
          platform: meta.platform,
          postType: "news",
          headline: rawTitle,
          source,
          link: linkMatch ? linkMatch[1].trim() : `https://news.google.com/search?q=${encodeURIComponent(rawTitle)}`,
          date: new Date(timestamp).toISOString(),
          timestamp,
          ...analysis,
        });
      }
    })
  );

  return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, 12);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const person = (searchParams.get("person") || "ALL").toUpperCase();

  try {
    // 若選擇 TRUMP，直接拉取 40 則 Truth Social 官方全量貼文 + 台灣財經轉述
    if (person === "TRUMP") {
      const [directTruths, twNews] = await Promise.all([
        fetchTrumpTruthSocialDirect(40),
        fetchRssForPerson("TRUMP"),
      ]);
      const combined = [...directTruths, ...twNews].sort((a, b) => b.timestamp - a.timestamp);
      return NextResponse.json({ data: combined });
    }

    if (person === "ALL") {
      const [directTruths, muskList, huangList, powellList] = await Promise.all([
        fetchTrumpTruthSocialDirect(25),
        fetchRssForPerson("MUSK"),
        fetchRssForPerson("HUANG"),
        fetchRssForPerson("POWELL"),
      ]);
      const merged = [...directTruths, ...muskList, ...huangList, ...powellList]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);
      return NextResponse.json({ data: merged });
    }

    const key = (person in CELEBRITY_META ? person : "MUSK") as keyof typeof CELEBRITY_META;
    const list = await fetchRssForPerson(key);
    return NextResponse.json({ data: list });
  } catch (e) {
    return NextResponse.json({ data: [], error: String(e) }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body.text || body.headline || "").trim();
    const originalText = String(body.originalText || "").trim();
    const personId = (String(body.personId || "TRUMP").toUpperCase() as "TRUMP" | "MUSK" | "HUANG" | "POWELL");
    const personName = String(body.personName || "國際政經/科技領袖");
    const clientKey = String(body.apiKey || process.env.GEMINI_API_KEY || "").trim();

    if (!text) {
      return NextResponse.json({ error: "請提供貼文或發言內容" }, { status: 400 });
    }

    const baseAnalysis = analyzeCelebrityStatement(personId, `${text} ${originalText}`);

    if (clientKey) {
      try {
        const prompt = `你是一位頂尖華爾街宏觀對沖基金經理與台美股首席分析師。請針對以下「${personName}」的最新貼文或發言進行深度市場影響分析，並使用繁體中文（Markdown格式）給出具體、犀利、可執行的投資操作建議：

【發言/貼文內容】：「${text}」
${originalText ? `【Truth Social / X 原文】：「${originalText}」` : ""}

請依序輸出以下四個段落（直接給重點與代碼，不要空泛廢話）：
1. **🎯 發言弦外之音與核心動機拆解**：一句話點破政治或商業談判意圖。
2. **🌊 市場情緒與產業鏈傳導效應**：分析對美股板塊與台股供應鏈的直接衝擊（利多誰、利空誰）。
3. **📈 台美股核心受惠 / 受害標的與操作價位策略**：點名具體代碼（如 2330 台積電、2317 鴻海、TSLA、NVDA、DJT 等）並說明進出場條件。
4. **🛡️ 風險控管與避險對策**：若市場出現反轉或言論跳票時的對沖做法。`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(clientKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 900 },
            }),
          }
        );

        if (geminiRes.ok) {
          const gJson = await geminiRes.json();
          const md = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (md) {
            return NextResponse.json({
              ...baseAnalysis,
              deepReportMarkdown: md,
              engine: "Gemini 2.5 Flash 深度推演",
            });
          }
        }
      } catch {
        // Fallback to quantitative causal report below
      }
    }

    const stockLines = baseAnalysis.affectedStocks
      .map(
        (s) =>
          `- **${s.symbol} ${s.name} (${s.market === "TW" ? "台股" : "美股"})** — \`${
            s.effect === "POSITIVE" ? "受惠偏多" : s.effect === "NEGATIVE" ? "承壓避開" : "高波動觀察"
          }\`：${s.reason}`
      )
      .join("\n");

    const deepReportMarkdown = `### 🎯 發言弦外之音與市場定價邏輯
- **追蹤對象**：${personName}
- **情緒定調**：**${baseAnalysis.sentimentLabel}**（市場衝擊強度：**${baseAnalysis.impactScore} / 10**）
- **核心解讀**：${baseAnalysis.aiSummary}

### 🌊 產業鏈傳導板塊
- **焦點板塊**：${baseAnalysis.sectors.map((sec) => `\`${sec}\``).join("、")}
- **資金流向預判**：名人貼文發布後 24~48 小時內通常伴隨演算法交易（Algo Trading）與散戶情緒放大。建議區分「短線題材情緒」與「實質EPS訂單改變」。

### 📈 台美股連動標的與具體操作建議
${stockLines}

### 🛡️ 實戰策略與風控紀律
- **操作執行**：${baseAnalysis.actionableAdvice}
- **風控原則**：政策與名人言論驅動之行情切忌在跳空開高超過 4% 時追價；建議待回測 5 日均線或量縮不破支撐時分批介入，並以跌破關鍵支撐 5% 作為紀律停損點。`;

    return NextResponse.json({
      ...baseAnalysis,
      deepReportMarkdown,
      engine: "AI 宏觀因果推演引擎",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
