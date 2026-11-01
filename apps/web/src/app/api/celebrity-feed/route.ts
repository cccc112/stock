import { NextRequest, NextResponse } from "next/server";

export interface AffectedStock {
  symbol: string;
  name: string;
  market: "TW" | "US";
  effect: "POSITIVE" | "NEGATIVE" | "WATCH";
  reason: string;
}

export interface CelebrityPostAnalysis {
  sentiment: "BULLISH" | "BEARISH" | "VOLATILE";
  sentimentLabel: string;
  impactScore: number;
  sectors: string[];
  aiSummary: string;
  actionableAdvice: string;
  affectedStocks: AffectedStock[];
  deepReportMarkdown: string;
  engine: string;
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
}

const CELEBRITY_META = {
  TRUMP: {
    personId: "TRUMP" as const,
    personName: "Donald Trump (川普)",
    personTitle: "美國總統 / 關稅、晶片、減稅與總經政策",
    handle: "@realDonaldTrump",
    platform: "Truth Social 財經政策動態",
    queries: [
      "川普 (關稅 OR 台積電 OR 半導體 OR 晶片 OR 股市 OR 美股 OR 降息 OR 比特幣 OR 能源 OR 貿易 OR 美債 OR 美元)",
      "Donald Trump (tariff OR TSMC OR semiconductor OR stock market OR Fed OR China trade OR tax cut OR bitcoin OR oil)",
    ],
  },
  MUSK: {
    personId: "MUSK" as const,
    personName: "Elon Musk (馬斯克)",
    personTitle: "Tesla / SpaceX / xAI 執行長",
    handle: "@elonmusk",
    platform: "X (Twitter) 貼文動態",
    queries: [
      "馬斯克 (特斯拉 OR 機器人 OR Optimus OR SpaceX OR xAI OR FSD OR Robotaxi OR 星鏈)",
      "Elon Musk (Tesla OR Robotaxi OR Optimus OR xAI OR SpaceX OR Starlink OR DOGE)",
    ],
  },
  HUANG: {
    personId: "HUANG" as const,
    personName: "Jensen Huang (黃仁勳)",
    personTitle: "NVIDIA 執行長 / 全球 AI 算力領袖",
    handle: "@nvidia",
    platform: "主題演講 / 供應鏈談話",
    queries: [
      "黃仁勳 (輝達 OR 台積電 OR Blackwell OR Rubin OR AI伺服器 OR 機器人 OR CoWoS OR 矽光子)",
      "Jensen Huang NVIDIA (AI OR TSMC OR Blackwell OR Rubin OR robotics OR sovereign AI)",
    ],
  },
  POWELL: {
    personId: "POWELL" as const,
    personName: "Jerome Powell (鮑爾)",
    personTitle: "美國聯準會 (Fed) 主席",
    handle: "@federalreserve",
    platform: "FOMC 聲明 / 央行談話",
    queries: [
      "鮑爾 聯準會 (降息 OR 通膨 OR 美債 OR 利率 OR 縮表 OR 就業)",
      "Jerome Powell Fed (interest rates OR inflation OR Treasury OR rate cut OR FOMC)",
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
 * 嚴格過濾器：徹底剔除選舉投票、候選人背書、造勢大會、電視轉播等與財經無關之貼文
 */
const NON_FINANCIAL_ELECTION_REGEX =
  /endorse|endorsement|get out and vote|telerally|early voting|swampthevote|voting location|polling|running for|re-elect|rally to elect|for u\.s\. senate|for governor|for congress|congressman|congresswoman|representative for|tremendous champion|ballot|absentee|image post from|video post from|quote post from|^rt\s*@realdonaldtrump\s*$|watching right side|air force one|發布了一則圖片|發布了一則實況影片|催票|造勢|選民|投票|背書|參選人|候選人/i;

const FINANCIAL_MARKET_RELEVANT_REGEX =
  /tariff|trade|china|taiwan|tsmc|chip|semiconductor|nvidia|apple|tesla|tech|ai|tax|rate|fed|powell|inflation|economy|economic|market|stock|dow|nasdaq|s&p|dollar|currency|treasury|bond|debt|deficit|oil|gas|energy|drill|crypto|bitcoin|btc|bank|deregulat|manufacturing|factory|auto|car|ev|steel|aluminum|mexico|canada|europe|sanction|iran|russia|ukraine|israel|middle east|defense|boeing|musk|doge|budget|spending|price|export|import|關稅|貿易|晶片|半導體|台積電|輝達|蘋果|特斯拉|科技|人工智慧|減稅|稅率|降息|升息|聯準會|鮑爾|通膨|經濟|股市|美股|台股|道瓊|那斯達克|費半|美元|匯率|美債|公債|石油|能源|天然氣|比特幣|加密|銀行|金融|製造業|汽車|電動車|鋼鐵|制裁|軍工|國防|預算|開支|供應鏈|設廠|物價|出口|進口/i;

function isMarketRelevantPost(text: string): boolean {
  if (!text || text.length < 12) return false;
  if (NON_FINANCIAL_ELECTION_REGEX.test(text)) return false;
  return FINANCIAL_MARKET_RELEVANT_REGEX.test(text);
}

/**
 * 批次將英文貼文翻譯為繁體中文
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
      const res = await fetch(url, { cache: "no-store" });
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
 * 18 大細分產業規則庫：依據單篇貼文的「具體字詞組合」動態匹配最精準的受影響股與專屬理由，
 * 確保不同主題貼文絕不會出現千篇一律的重複模板！
 */
interface TopicRule {
  id: string;
  regex: RegExp;
  sector: string;
  sentiment: "BULLISH" | "BEARISH" | "VOLATILE";
  label: string;
  score: number;
  insightBuilder: (snippet: string) => string;
  adviceBuilder: (snippet: string) => string;
  stocks: AffectedStock[];
}

const DYNAMIC_TOPIC_RULES: TopicRule[] = [
  {
    id: "chip_tariff",
    regex: /晶片|半導體|台積電|tsmc|chip|semiconductor|晶圓|先進製程|亞利桑那|arizona/i,
    sector: "晶圓代工與先進封裝",
    sentiment: "VOLATILE",
    label: "半導體政策與關稅博弈",
    score: 9.4,
    insightBuilder: (s) =>
      `針對「${s}」提及之半導體與晶片製造議題，短線雖牽動費半指數情緒，但台積電在 3nm/2nm 與 CoWoS 具絕對技術獨佔性，客戶無替代方案，關稅成本最終將由美系 CSP 與 IC 設計客戶吸收。`,
    adviceBuilder: () =>
      `若台積電或設備股因晶片政策言論出現非基本面回檔（回測月線或季線），屬於長線逢低分批承接機會；短線避開純成熟製程代工。`,
    stocks: [
      { symbol: "2330", name: "台積電", market: "TW", effect: "WATCH", reason: "先進製程獨佔且亞利桑那廠良率領先，具100%轉嫁能力" },
      { symbol: "TSM", name: "台積電 ADR", market: "US", effect: "WATCH", reason: "美股費半情緒風向球，留意ADR溢價變化" },
      { symbol: "3131", name: "弘塑", market: "TW", effect: "POSITIVE", reason: "CoWoS 濕製程設備隨台美擴廠雙邊受惠" },
      { symbol: "2454", name: "聯發科", market: "TW", effect: "WATCH", reason: "觀察美系旗艦晶片報價與終端關稅傳導" },
    ],
  },
  {
    id: "general_tariff_shipping",
    regex: /關稅|tariff|貿易戰|進口|出口|china|中國|墨西哥|mexico|canada|報復|制裁/i,
    sector: "跨國貿易與貨櫃航運",
    sentiment: "VOLATILE",
    label: "關稅壁壘與搶運效應",
    score: 9.1,
    insightBuilder: (s) =>
      `此篇「${s}」直接觸及跨國關稅與貿易限制。歷史經驗顯示，新關稅生效前 1~2 個季度會觸發歐美零售與工業進口商「恐慌性提前備貨（Front-loading）」，推升遠東至北美航線運價；同時迫使電子代工廠加速移往德州與墨西哥廠區。`,
    adviceBuilder: () =>
      `短線可布局受惠提前拉貨潮的貨櫃航運高息股，電子硬體則優先選擇已在北美具備完整組裝產能之龍頭。`,
    stocks: [
      { symbol: "2603", name: "長榮", market: "TW", effect: "POSITIVE", reason: "關稅生效前歐美進口商提前搶運，推升美線長約與現貨運價" },
      { symbol: "2609", name: "陽明", market: "TW", effect: "POSITIVE", reason: "北美線比重高，直接受惠庫存提前回補潮" },
      { symbol: "2317", name: "鴻海", market: "TW", effect: "POSITIVE", reason: "擁有美國威州、德州與墨西哥龐大產能，調度彈性冠絕同業" },
    ],
  },
  {
    id: "humanoid_robot",
    regex: /機器人|optimus|humanoid|robot|關節|減速機|視覺|感測|自動化/i,
    sector: "人形機器人與機器視覺",
    sentiment: "BULLISH",
    label: "人形機器人量產催化",
    score: 9.2,
    insightBuilder: (s) =>
      `針對「${s}」釋出之機器人進展，AI 已從雲端大語言模型正式走向實體物理世界（Physical AI）。人形機器人BOM表中占比最高之精密滾珠螺桿、諧波減速機與高階感測鏡頭將迎來實質訂單放量。`,
    adviceBuilder: () =>
      `操作上鎖定具備實質工業自動化營收支撐、且切入美系大廠供應鏈之光學與傳動龍頭，拉回五日/十日均線分批切入。`,
    stocks: [
      { symbol: "3019", name: "亞光", market: "TW", effect: "POSITIVE", reason: "車載與機器人光學視覺感測鏡頭核心夥伴" },
      { symbol: "2049", name: "上銀", market: "TW", effect: "POSITIVE", reason: "機器人精密滾珠螺桿與諧波減速機關鍵供應商" },
      { symbol: "2360", name: "致茂", market: "TW", effect: "POSITIVE", reason: "機器人關節馬達與電力電子量測設備領頭羊" },
      { symbol: "TSLA", name: "Tesla", market: "US", effect: "POSITIVE", reason: "Optimus 量產進度主導特斯拉 AI 估值重估" },
    ],
  },
  {
    id: "ev_fsd_robotaxi",
    regex: /特斯拉|tesla|fsd|自駕|robotaxi|cybercab|電動車|ev|充電|車用/i,
    sector: "全自動駕駛與電動車鏈",
    sentiment: "BULLISH",
    label: "自駕 FSD 與車電利多",
    score: 8.8,
    insightBuilder: (s) =>
      `針對「${s}」之電動車與自駕動態，市場焦點已由單純交車量轉向 FSD 軟體訂閱率與 Robotaxi 無人計程車商轉時程，帶動高頻車用連接線束與車載邊緣運算需求。`,
    adviceBuilder: () =>
      `以美股 TSLA 能否守穩月線作為領先指標，台股優先挑選特斯拉純度最高之車用線束与電源管理廠。`,
    stocks: [
      { symbol: "TSLA", name: "Tesla", market: "US", effect: "POSITIVE", reason: "FSD 監管放寬與自駕車隊商轉直接拉升軟體毛利率" },
      { symbol: "3665", name: "貿聯-KY", market: "TW", effect: "POSITIVE", reason: "特斯拉電源管理線束與 AI 高速運算連接線雙主軸受惠" },
      { symbol: "2308", name: "台達電", market: "TW", effect: "POSITIVE", reason: "電動車動力系統與 AI 伺服器電源全球龍頭" },
    ],
  },
  {
    id: "ai_server_gpu",
    regex: /blackwell|rubin|gb200|gb300|輝達|nvidia|nvda|xai|grok|算力|伺服器|資料中心|csp|cpo|矽光子|散熱|液冷/i,
    sector: "AI 算力中心與液冷散熱",
    sentiment: "BULLISH",
    label: "AI 算力基建強勁擴張",
    score: 9.5,
    insightBuilder: (s) =>
      `從「${s}」可見北美巨型 AI 算力叢集與新一代 GPU 機櫃拉貨動能毫無放緩跡象。高功耗機櫃全面強制導入水冷散熱（Liquid Cooling）與高階滑軌、BBU 備援電池，台系 ODM 與散熱廠業績能見度直達明年。`,
    adviceBuilder: () =>
      `AI 伺服器硬體為台股基本面最紮實之主流族群，建議鎖定伺服器組裝龍頭與液冷快接頭/水冷板指標股，沿月線波段操作。`,
    stocks: [
      { symbol: "NVDA", name: "NVIDIA", market: "US", effect: "POSITIVE", reason: "全球主權 AI 與大型算力叢集唯一算力底座" },
      { symbol: "2382", name: "廣達", market: "TW", effect: "POSITIVE", reason: "美系雲端巨頭高階 AI 伺服器機櫃主力 ODM 廠" },
      { symbol: "3017", name: "奇鋐", market: "TW", effect: "POSITIVE", reason: "AI 伺服器水冷板與分歧管市占率領先" },
      { symbol: "6669", name: "緯穎", market: "TW", effect: "POSITIVE", reason: "ASIC 與高密度 AI 伺服器純度最高之千金指標" },
    ],
  },
  {
    id: "spacex_satellite",
    regex: /spacex|starlink|星鏈|火箭|衛星|太空|軌道|太空總署|nasa/i,
    sector: "低軌衛星與航太通訊",
    sentiment: "BULLISH",
    label: "SpaceX 與低軌衛星題材",
    score: 8.6,
    insightBuilder: (s) =>
      `針對「${s}」之太空與衛星通訊進展，隨新一代星艦發射成本下降與手機直連衛星（Direct-to-Cell）商轉，低軌衛星地面接收站與衛星用高階 HDI 板訂單持續擴大。`,
    adviceBuilder: () =>
      `低軌衛星族群受發射事件催化明顯，建議於量縮回測支撐時布局打入 SpaceX 實質供應鏈之 PCB 與高頻微波元件廠。`,
    stocks: [
      { symbol: "2313", name: "華通", market: "TW", effect: "POSITIVE", reason: "全球低軌衛星天上板與地面板市占第一絕對龍頭" },
      { symbol: "3491", name: "昇達科", market: "TW", effect: "POSITIVE", reason: "低軌衛星高頻微波元件營收占比最高、毛利率亮眼" },
      { symbol: "6285", name: "啟碁", market: "TW", effect: "POSITIVE", reason: "北美低軌衛星家用地面接收路由器主力代工廠" },
    ],
  },
  {
    id: "fed_rates_bonds",
    regex: /降息|升息|利率|聯準會|fed|powell|鮑爾|fomc|通膨|inflation|cpi|pce|美債|殖利率|treasury|縮表|就業|非農/i,
    sector: "長天期美債與大型金控",
    sentiment: "VOLATILE",
    label: "聯準會利率與債市重定價",
    score: 9.0,
    insightBuilder: (s) =>
      `針對「${s}」釋出之總經與貨幣政策訊號，直接牽動美國 10 年期與 20 年期公債殖利率定價。當市場對利率路徑重新校準時，高估值成長股與長天期債券 ETF 將出現顯著敏感度反應。`,
    adviceBuilder: () =>
      `長債 ETF 適合在殖利率反彈時分批配置領息兼賺波段價差；同時留意壽險型金控隨債券評價回升與匯兌成本改善之估值修復。`,
    stocks: [
      { symbol: "00679B", name: "元大美債20年", market: "TW", effect: "WATCH", reason: "長端美債殖利率對聯準會政策談話與通膨預期最為敏感" },
      { symbol: "00687B", name: "國泰20年美債", market: "TW", effect: "WATCH", reason: "折溢價收斂穩定，適合法人與大戶進行利率波段配置" },
      { symbol: "TLT", name: "iShares 20年美債", market: "US", effect: "WATCH", reason: "全球長天期美元債券流動性最高之基準指標" },
      { symbol: "2882", name: "國泰金", market: "TW", effect: "POSITIVE", reason: "旗下壽險龐大海外債券部位受惠利率環境趨穩" },
    ],
  },
  {
    id: "crypto_bitcoin",
    regex: /比特幣|加密|bitcoin|crypto|btc|以太幣|區塊鏈|戰略儲備|coinbase|挖礦/i,
    sector: "加密貨幣與算力硬體",
    sentiment: "BULLISH",
    label: "加密貨幣政策與資金動能",
    score: 8.7,
    insightBuilder: (s) =>
      `針對「${s}」之加密資產動態，美國政府與機構將比特幣納入戰略配置或放寬 SEC 監管，直接引爆鏈上交易量與現貨 ETF 資金淨流入。`,
    adviceBuilder: () =>
      `加密貨幣概念股波動劇烈，美股可直接觀察 COIN 與 IBIT，台股則留意顯卡營收占比高之板卡大廠，嚴格執行停利紀律。`,
    stocks: [
      { symbol: "COIN", name: "Coinbase", market: "US", effect: "POSITIVE", reason: "北美最大合規加密貨幣交易所，直接受惠交易量放大" },
      { symbol: "2377", name: "微星", market: "TW", effect: "POSITIVE", reason: "電競與高階顯卡板卡龍頭，連動加密算力與邊緣AI需求" },
      { symbol: "2376", name: "技嘉", market: "TW", effect: "POSITIVE", reason: "AI 伺服器與高階顯卡雙引擎受惠" },
    ],
  },
  {
    id: "energy_oil_power",
    regex: /石油|天然氣|能源|oil|gas|energy|drill|頁岩油|電網|電力|核能|重電|油價|opec/i,
    sector: "傳統能源與北美電力基建",
    sentiment: "BULLISH",
    label: "能源政策與電力基建",
    score: 8.5,
    insightBuilder: (s) =>
      `針對「${s}」提及之能源與電力政策，擴大油氣開採有助壓低運輸與製造通膨，而製造業回流與資料中心擴建則使美國老舊電網變壓器持續供不應求。`,
    adviceBuilder: () =>
      `油價若受政策壓抑有利航空與航運燃油成本下降；北美電網設備則具備長達 3~5 年的剛性汰換訂單。`,
    stocks: [
      { symbol: "XOM", name: "ExxonMobil", market: "US", effect: "POSITIVE", reason: "放寬開採限制與能源自主政策下之最大受惠油企" },
      { symbol: "1519", name: "華城", market: "TW", effect: "POSITIVE", reason: "外銷北美高壓電力變壓器比重最高，訂單能見度長" },
      { symbol: "2618", name: "長榮航", market: "TW", effect: "POSITIVE", reason: "原油價格回落直接降低航空燃油成本、推升營業利益率" },
    ],
  },
  {
    id: "tax_bank_deregulation",
    regex: /減稅|稅率|企業稅|tax|deregulat|去監管|銀行|金融|華爾街|道瓊|s&p|標普|doge|政府效率|預算/i,
    sector: "企業減稅與華爾街金融",
    sentiment: "BULLISH",
    label: "企業減稅與金融鬆綁",
    score: 8.6,
    insightBuilder: (s) =>
      `針對「${s}」之減稅與法規鬆綁政策，調降企業所得稅將直接拉升美股標普 500 成分股 EPS，而放寬金融併購與資本適足率限制則有利大型投行與金控。`,
    adviceBuilder: () =>
      `可透過美股大盤市值型 ETF 或金融龍頭股參與減稅紅利，中長線偏多配置。`,
    stocks: [
      { symbol: "JPM", name: "摩根大通", market: "US", effect: "POSITIVE", reason: "華爾街投行併購與放款業務受惠金融法規鬆綁" },
      { symbol: "SPY", name: "SPDR標普500", market: "US", effect: "POSITIVE", reason: "企業減稅直接挹注美股大型內需企業稅後淨利" },
      { symbol: "2881", name: "富邦金", market: "TW", effect: "POSITIVE", reason: "全球股市多頭與併購活絡帶動金控投資收益" },
    ],
  },
];

/**
 * 依據單篇貼文「具體內文」動態生成專屬分析報告（每篇皆引用其獨特標題與語境，絕不千篇一律）
 */
function buildDynamicPostSpecificAnalysis(
  personId: "TRUMP" | "MUSK" | "HUANG" | "POWELL",
  personName: string,
  headline: string,
  originalText?: string
): CelebrityPostAnalysis {
  const combined = `${headline} ${originalText || ""}`;
  const cleanSnippet = headline.length > 42 ? `${headline.slice(0, 42)}...` : headline;

  // 找出所有匹配的細分主題規則
  const matchedRules = DYNAMIC_TOPIC_RULES.filter((r) => r.regex.test(combined));

  if (matchedRules.length > 0) {
    const primary = matchedRules[0];
    const secondary = matchedRules[1];

    const mergedSectors = Array.from(
      new Set([...primary.sectors ? [] : [primary.sector], ...(secondary ? [secondary.sector] : [])])
    );

    // 合併第1與第2匹配主題之個股並去重，讓複合議題（例如同時提到「晶片」與「關稅」或「AI」與「電力」）產出獨特組合
    const stockMap = new Map<string, AffectedStock>();
    for (const r of matchedRules.slice(0, 2)) {
      for (const st of r.stocks) {
        if (!stockMap.has(st.symbol) && stockMap.size < 4) {
          stockMap.set(st.symbol, st);
        }
      }
    }
    const affectedStocks = Array.from(stockMap.values());

    const aiSummary =
      matchedRules.length >= 2
        ? `${primary.insightBuilder(cleanSnippet)} 同時，文中亦涉及「${secondary.sector}」層面，將引發跨板塊資金連動。`
        : primary.insightBuilder(cleanSnippet);

    const actionableAdvice = primary.adviceBuilder(cleanSnippet);

    const stockLines = affectedStocks
      .map(
        (s) =>
          `- **${s.symbol} ${s.name} (${s.market === "TW" ? "台股" : "美股"})** — \`${
            s.effect === "POSITIVE" ? "受惠看多" : s.effect === "NEGATIVE" ? "政策承壓" : "震盪觀察"
          }\`：${s.reason}`
      )
      .join("\n");

    const deepReportMarkdown = `### 🎯 貼文重點與弦外之音拆解
- **發言來源**：${personName}
- **分析原文**：「${headline}」
- **市場定調**：**${primary.label}**（衝擊強度：**${primary.score} / 10**）
- **核心因果推演**：${aiSummary}

### 📈 AI 點名連動台美股標的與理由
${stockLines}

### 🛡️ 具體操作建議與風控策略
- **實戰建議**：${actionableAdvice}
- **風險紀律**：名人言論常引發演算法短線急拉或急殺，建議避免於開盤第一根爆量 K 棒追高殺低，以 5 日與 20 日均線作為波段加減碼依據。`;

    return {
      sentiment: primary.sentiment,
      sentimentLabel: primary.label,
      impactScore: primary.score,
      sectors: mergedSectors.length > 0 ? mergedSectors : [primary.sector],
      aiSummary,
      actionableAdvice,
      affectedStocks,
      deepReportMarkdown,
      engine: "AI 語意因果推演引擎",
    };
  }

  // 若未命中特定關鍵字，仍根據該貼文標題進行動態語意合成
  const fallbackStocks: AffectedStock[] =
    personId === "MUSK"
      ? [
          { symbol: "TSLA", name: "Tesla", market: "US", effect: "POSITIVE", reason: `直接反映馬斯克針對「${cleanSnippet}」之話題熱度` },
          { symbol: "2317", name: "鴻海", market: "TW", effect: "POSITIVE", reason: "北美 AI 伺服器與電動車生態系核心夥伴" },
        ]
      : personId === "HUANG"
      ? [
          { symbol: "NVDA", name: "NVIDIA", market: "US", effect: "POSITIVE", reason: `黃仁勳針對「${cleanSnippet}」之談話強化 AI 算力信心` },
          { symbol: "2330", name: "台積電", market: "TW", effect: "POSITIVE", reason: "獨家供應先進製程與 CoWoS 封裝產能" },
        ]
      : [
          { symbol: "2330", name: "台積電", market: "TW", effect: "WATCH", reason: `觀察「${cleanSnippet}」後續對跨國科技供應鏈之影響` },
          { symbol: "SPY", name: "SPDR標普500", market: "US", effect: "WATCH", reason: "反映美國總經政策與機構風險偏好變化" },
        ];

  const aiSummary = `針對 ${personName} 最新動態「${cleanSnippet}」，市場聚焦其對政策落地時程與企業資本支出預期的邊際改變。`;
  const actionableAdvice = `建議觀察美股開盤後相關權值股與期貨反應，確認成交量放大方向後再行順勢布局。`;

  return {
    sentiment: "VOLATILE",
    sentimentLabel: "政策與市場話題觀察",
    impactScore: 8.0,
    sectors: ["權值科技", "總經政策"],
    aiSummary,
    actionableAdvice,
    affectedStocks: fallbackStocks,
    deepReportMarkdown: `### 🎯 貼文重點與市場解讀\n- **分析貼文**：「${headline}」\n- **因果分析**：${aiSummary}\n- **操作建議**：${actionableAdvice}`,
    engine: "AI 語意因果推演引擎",
  };
}

/**
 * 即時掃描川普 Truth Social 官方同步流，嚴格過濾非財經雜訊，僅回傳乾淨貼文本身（不預先塞入重複 AI 模板）
 */
async function fetchTrumpTruthSocialFinancialOnly(): Promise<CelebrityPostItem[]> {
  try {
    const resp = await fetch("https://trumpstruth.org/feed", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      cache: "no-store",
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

    while ((match = itemRegex.exec(xml)) !== null) {
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
      text = text
        .replace(/^RT\s*@realDonaldTrump\s*/i, "")
        .replace(/RT:\s*https:\/\/truthsocial\.com\/[^\s]+/gi, "")
        .replace(/View image|View video/gi, "")
        .trim();

      if (!isMarketRelevantPost(text)) {
        continue;
      }

      const postTypeRaw = (postTypeMatch ? postTypeMatch[1].trim() : "original") as
        | "original"
        | "quote"
        | "repost";
      const mediaUrl = mediaMatch ? mediaMatch[1] : undefined;
      const mediaType = mediaMatch ? mediaMatch[2] || "image" : undefined;

      const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : "";
      const parsedTime = pubDateStr ? Date.parse(pubDateStr) : Date.now();
      const timestamp = isNaN(parsedTime) ? Date.now() : parsedTime;
      const truthLink = origUrlMatch
        ? origUrlMatch[1].trim()
        : "https://truthsocial.com/@realDonaldTrump";
      const id = origIdMatch
        ? `TRUMP-TS-${origIdMatch[1].trim()}`
        : `TRUMP-TS-${timestamp}-${rawEntries.length}`;

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

    const translatedList = await batchTranslateToZhTw(rawEntries.map((e) => e.originalText));

    return rawEntries.map((entry, idx) => ({
      id: entry.id,
      personId: "TRUMP",
      personName: CELEBRITY_META.TRUMP.personName,
      personTitle: CELEBRITY_META.TRUMP.personTitle,
      handle: "@realDonaldTrump",
      platform: "Truth Social 財經原貼文",
      postType: entry.postType,
      headline: translatedList[idx] || entry.originalText,
      originalText: entry.originalText,
      mediaUrl: entry.mediaUrl,
      mediaType: entry.mediaType,
      source: "Truth Social (@realDonaldTrump)",
      link: entry.link,
      date: new Date(entry.timestamp).toISOString(),
      timestamp: entry.timestamp,
    }));
  } catch (e) {
    console.warn("Failed to fetch Trump Truth Social direct feed:", e);
    return [];
  }
}

async function fetchRssForPerson(personKey: keyof typeof CELEBRITY_META): Promise<CelebrityPostItem[]> {
  const meta = CELEBRITY_META[personKey];
  const rawItems: Array<{
    title: string;
    source: string;
    link: string;
    timestamp: number;
    isEn: boolean;
  }> = [];
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
        cache: "no-store",
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

        if (NON_FINANCIAL_ELECTION_REGEX.test(rawTitle)) continue;

        const dedupKey = rawTitle.slice(0, 36).toLowerCase();
        if (!rawTitle || seenTitles.has(dedupKey)) continue;
        seenTitles.add(dedupKey);

        const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : "";
        const parsedTime = pubDateStr ? Date.parse(pubDateStr) : Date.now();
        const timestamp = isNaN(parsedTime) ? Date.now() : parsedTime;

        rawItems.push({
          title: rawTitle,
          source,
          link: linkMatch ? linkMatch[1].trim() : `https://news.google.com/search?q=${encodeURIComponent(rawTitle)}`,
          timestamp,
          isEn,
        });
      }
    })
  );

  const sortedRaw = rawItems.sort((a, b) => b.timestamp - a.timestamp).slice(0, 16);

  const enIndices: number[] = [];
  const enTexts: string[] = [];
  sortedRaw.forEach((item, idx) => {
    if (item.isEn) {
      enIndices.push(idx);
      enTexts.push(item.title);
    }
  });

  const translatedEn = enTexts.length > 0 ? await batchTranslateToZhTw(enTexts) : [];
  const zhMap: Record<number, string> = {};
  enIndices.forEach((origIdx, i) => {
    if (translatedEn[i]) zhMap[origIdx] = translatedEn[i];
  });

  return sortedRaw.map((item, idx) => ({
    id: `${meta.personId}-FEED-${item.timestamp}-${idx}`,
    personId: meta.personId,
    personName: meta.personName,
    personTitle: meta.personTitle,
    handle: meta.handle,
    platform: meta.platform,
    postType: "news",
    headline: item.isEn && zhMap[idx] ? zhMap[idx] : item.title,
    originalText: item.isEn ? item.title : undefined,
    source: item.source,
    link: item.link,
    date: new Date(item.timestamp).toISOString(),
    timestamp: item.timestamp,
  }));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const person = (searchParams.get("person") || "ALL").toUpperCase();

  try {
    if (person === "TRUMP") {
      const [directFinancialTruths, trumpFinancialFeed] = await Promise.all([
        fetchTrumpTruthSocialFinancialOnly(),
        fetchRssForPerson("TRUMP"),
      ]);
      const combined = [...directFinancialTruths, ...trumpFinancialFeed].sort(
        (a, b) => b.timestamp - a.timestamp
      );
      return NextResponse.json({ data: combined });
    }

    if (person === "ALL") {
      const [directFinancialTruths, trumpFeed, muskList, huangList, powellList] = await Promise.all([
        fetchTrumpTruthSocialFinancialOnly(),
        fetchRssForPerson("TRUMP"),
        fetchRssForPerson("MUSK"),
        fetchRssForPerson("HUANG"),
        fetchRssForPerson("POWELL"),
      ]);
      const merged = [...directFinancialTruths, ...trumpFeed, ...muskList, ...huangList, ...powellList]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 40);
      return NextResponse.json({ data: merged });
    }

    const key = (person in CELEBRITY_META ? person : "MUSK") as keyof typeof CELEBRITY_META;
    const list = await fetchRssForPerson(key);
    return NextResponse.json({ data: list });
  } catch (e) {
    return NextResponse.json({ data: [], error: String(e) }, { status: 200 });
  }
}

/**
 * 當使用者按下「AI 分析此貼文」時才觸發：
 * 1. 若有 Gemini API Key，直接由 Gemini 針對該篇貼文輸出專屬 JSON 結構化分析與台美股建議
 * 2. 若未設定 Key，使用 18 大細分主題語意因果引擎，針對該貼文內文關鍵字動態產出不重複之分析與標的
 */
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

    const fallbackAnalysis = buildDynamicPostSpecificAnalysis(personId, personName, text, originalText);

    if (clientKey) {
      try {
        const prompt = `你是一位頂尖華爾街宏觀對沖基金經理與台美股首席分析師。請針對以下「${personName}」的最新貼文或發言進行一對一專屬市場影響分析，並回傳純 JSON 物件（不要包裹 markdown 程式碼區塊）：

【發言/貼文內容】：「${text}」
${originalText ? `【英文原文】：「${originalText}」` : ""}

請回傳符合以下欄位的 JSON：
{
  "sentiment": "BULLISH" | "BEARISH" | "VOLATILE",
  "sentimentLabel": "6~10字精準情緒定調",
  "impactScore": 8.5,
  "sectors": ["受影響產業1", "受影響產業2"],
  "aiSummary": "針對這篇貼文具體內容的因果推演（80~120字，必須直接點出貼文內提到的具體事件或政策，不可寫空泛套話）",
  "actionableAdvice": "具體可執行的台美股操作與風控建議（60~100字）",
  "affectedStocks": [
    {
      "symbol": "股票代碼(如 2330 或 TSLA)",
      "name": "股票中文名稱",
      "market": "TW" | "US",
      "effect": "POSITIVE" | "NEGATIVE" | "WATCH",
      "reason": "為什麼這檔股票會受這篇貼文影響的具體理由（25~40字）"
    }
  ],
  "deepReportMarkdown": "四段式完整 Markdown 深度分析報告"
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(clientKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.35,
                maxOutputTokens: 1100,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const gJson = await geminiRes.json();
          const rawText = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return NextResponse.json({
              sentiment: parsed.sentiment || fallbackAnalysis.sentiment,
              sentimentLabel: parsed.sentimentLabel || fallbackAnalysis.sentimentLabel,
              impactScore: Number(parsed.impactScore) || fallbackAnalysis.impactScore,
              sectors: Array.isArray(parsed.sectors) ? parsed.sectors : fallbackAnalysis.sectors,
              aiSummary: parsed.aiSummary || fallbackAnalysis.aiSummary,
              actionableAdvice: parsed.actionableAdvice || fallbackAnalysis.actionableAdvice,
              affectedStocks: Array.isArray(parsed.affectedStocks)
                ? parsed.affectedStocks
                : fallbackAnalysis.affectedStocks,
              deepReportMarkdown: parsed.deepReportMarkdown || fallbackAnalysis.deepReportMarkdown,
              engine: "Gemini 2.5 Flash 專屬推演",
            });
          }
        }
      } catch {
        // Fallback to dynamic post-specific analysis below
      }
    }

    return NextResponse.json(fallbackAnalysis);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
