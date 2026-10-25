export interface ETFHolding {
  symbol: string;
  name: string;
  weight: number;
}

export interface ETFSectorWeight {
  sector: string;
  weight: number;
}

export interface ETFDividendItem {
  date: string;
  amount: number;
  period_yield?: number | null;
}

export interface ETFProfileSeed {
  name: string;
  issuer: string;
  category: string;
  tracking_index: string;
  expense_ratio: string;
  dividend_freq: string;
  aum: string;
  dividend_yield_est?: number | null;
  focus_points: string[];
  holdings: ETFHolding[];
  sector_weights: ETFSectorWeight[];
  dividends?: ETFDividendItem[];
}

/**
 * 根據台股 ETF 名稱自動解析精確的發行投信公司名稱
 */
export function inferTwIssuer(name: string): string {
  if (name.includes("元大")) return "元大投信";
  if (name.includes("富邦")) return "富邦投信";
  if (name.includes("國泰")) return "國泰投信";
  if (name.includes("群益")) return "群益投信";
  if (name.includes("復華")) return "復華投信";
  if (name.includes("中信")) return "中國信託投信";
  if (name.includes("統一")) return "統一投信";
  if (name.includes("凱基")) return "凱基投信";
  if (name.includes("大華")) return "大華銀投信";
  if (name.includes("台新")) return "台新投信";
  if (name.includes("野村")) return "野村投信";
  if (name.includes("兆豐")) return "兆豐投信";
  if (name.includes("永豐")) return "永豐投信";
  if (name.includes("新光")) return "新光投信";
  if (name.includes("FT") || name.includes("富蘭克林")) return "富蘭克林華美投信";
  if (name.includes("街口")) return "街口投信";
  if (name.includes("第一金")) return "第一金投信";
  if (name.includes("合庫")) return "合庫投信";
  if (name.includes("華南")) return "華南永昌投信";
  if (name.includes("保德信")) return "PGIM 保德信投信";
  if (name.includes("日盛")) return "日盛投信";
  if (name.includes("聯博")) return "聯博投信";
  return "台灣投信機構";
}

export const ETF_CATALOG: Record<string, ETFProfileSeed> = {
  // ==================== 1. 台股市值型 / ESG / 中小型 / 槓反 ETF ====================
  "0050": {
    name: "元大台灣50",
    issuer: "元大投信",
    category: "台股市值大盤型 ETF",
    tracking_index: "臺灣50指數 (FTSE TWSE Taiwan 50 Index)",
    expense_ratio: "約 0.15% ~ 0.22% (採規模階梯式調降經管費)",
    dividend_freq: "半年配 (1月、7月除息)",
    aum: "約 5,200 億 TWD",
    dividend_yield_est: 2.75,
    focus_points: [
      "追蹤台股市值最大前 50 家上市企業，與台股加權指數(^TWII)相關係數達 0.98 以上。",
      "台積電(2330)單一成分股權重約 57%，高度連動全球 AI 晶片需求與外資期現貨動向。",
      "2025 年調降經理費與保管費後，長期持有內扣成本大幅降低。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 57.2 },
      { symbol: "2317", name: "鴻海", weight: 4.9 },
      { symbol: "2454", name: "聯發科", weight: 4.4 },
      { symbol: "2308", name: "台達電", weight: 1.8 },
      { symbol: "2382", name: "廣達", weight: 1.7 },
      { symbol: "2881", name: "富邦金", weight: 1.6 },
      { symbol: "2891", name: "中信金", weight: 1.4 },
      { symbol: "2882", name: "國泰金", weight: 1.4 },
      { symbol: "3711", name: "日月光投控", weight: 1.1 },
      { symbol: "2412", name: "中華電", weight: 1.0 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 64.2 },
      { sector: "電腦及週邊設備", weight: 10.8 },
      { sector: "金融保險", weight: 10.5 },
      { sector: "電子零組件", weight: 4.8 },
      { sector: "通信網路與其他", weight: 9.7 },
    ],
  },
  "006208": {
    name: "富邦台50",
    issuer: "富邦投信",
    category: "台股市值大盤型 ETF",
    tracking_index: "臺灣50指數 (FTSE TWSE Taiwan 50 Index)",
    expense_ratio: "0.24% (經理費 0.15% + 保管費 0.035%)",
    dividend_freq: "半年配 (7月、11月除息)",
    aum: "約 2,150 億 TWD",
    dividend_yield_est: 2.8,
    focus_points: [
      "與 0050 追蹤完全相同的「臺灣50指數」，前十大成分股與權重結構一致。",
      "台積電(2330)、鴻海(2317)、聯發科(2454)合計佔比約 66%，直接反映台股大型權值表現。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 57.1 },
      { symbol: "2317", name: "鴻海", weight: 4.9 },
      { symbol: "2454", name: "聯發科", weight: 4.4 },
      { symbol: "2308", name: "台達電", weight: 1.8 },
      { symbol: "2382", name: "廣達", weight: 1.7 },
      { symbol: "2881", name: "富邦金", weight: 1.6 },
      { symbol: "2891", name: "中信金", weight: 1.4 },
      { symbol: "2882", name: "國泰金", weight: 1.4 },
      { symbol: "3711", name: "日月光投控", weight: 1.1 },
      { symbol: "2412", name: "中華電", weight: 1.0 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 64.2 },
      { sector: "電腦及週邊設備", weight: 10.8 },
      { sector: "金融保險", weight: 10.5 },
      { sector: "電子零組件與其他", weight: 14.5 },
    ],
  },
  "00692": {
    name: "富邦公司治理",
    issuer: "富邦投信",
    category: "市值 / ESG 公司治理型 ETF",
    tracking_index: "臺灣公司治理100指數",
    expense_ratio: "0.24%",
    dividend_freq: "半年配 (7月、11月除息)",
    aum: "約 350 億 TWD",
    dividend_yield_est: 3.6,
    focus_points: [
      "以公司治理評鑑前 20% 加上 ROE、營收成長篩選 100 檔成分股，兼顧大型權值與高獲利品質。",
      "台積電權重約 44%，金融與穩健大型股比重高於 0050，波動略低。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 44.5 },
      { symbol: "2454", name: "聯發科", weight: 4.6 },
      { symbol: "2881", name: "富邦金", weight: 3.2 },
      { symbol: "2308", name: "台達電", weight: 2.6 },
      { symbol: "2882", name: "國泰金", weight: 2.5 },
      { symbol: "2382", name: "廣達", weight: 2.2 },
      { symbol: "2891", name: "中信金", weight: 2.0 },
      { symbol: "2412", name: "中華電", weight: 1.8 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 52.5 },
      { sector: "金融保險", weight: 18.2 },
      { sector: "電腦及週邊設備", weight: 13.8 },
      { sector: "電子零組件與其他", weight: 15.5 },
    ],
  },
  "00850": {
    name: "元大臺灣ESG永續",
    issuer: "元大投信",
    category: "台股 ESG 市值型 ETF",
    tracking_index: "臺灣永續指數 (FTSE4Good TIP Taiwan ESG Index)",
    expense_ratio: "0.38%",
    dividend_freq: "季配息 (2、5、8、11月除息)",
    aum: "約 230 億 TWD",
    dividend_yield_est: 3.9,
    focus_points: [
      "設有單一成分股 30% 權重上限，避免台積電佔比過高，同時納入鴻海、聯發科、金融與電子權值股。",
      "被市場視為「有單一個股上限 + 季配息」版的 0050。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 30.8 },
      { symbol: "2317", name: "鴻海", weight: 7.4 },
      { symbol: "2454", name: "聯發科", weight: 6.9 },
      { symbol: "2308", name: "台達電", weight: 3.5 },
      { symbol: "2881", name: "富邦金", weight: 3.3 },
      { symbol: "2382", name: "廣達", weight: 3.1 },
      { symbol: "2882", name: "國泰金", weight: 2.9 },
      { symbol: "2891", name: "中信金", weight: 2.8 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 44.5 },
      { sector: "電腦及AI硬體", weight: 19.5 },
      { sector: "金融保險", weight: 18.0 },
      { sector: "其他電子與傳產", weight: 18.0 },
    ],
  },
  "00922": {
    name: "國泰台灣領袖50",
    issuer: "國泰投信",
    category: "低碳轉型市值型 ETF",
    tracking_index: "MSCI 台灣領袖 50 精選指數",
    expense_ratio: "0.28%",
    dividend_freq: "半年配 (3月、10月除息)",
    aum: "約 220 億 TWD",
    dividend_yield_est: 4.1,
    focus_points: [
      "追蹤 MSCI 台灣領袖 50 指數，單一成分股權重上限 30%，兼顧台積電成長與金融/AI伺服器龍頭配置。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 31.2 },
      { symbol: "2317", name: "鴻海", weight: 6.5 },
      { symbol: "2454", name: "聯發科", weight: 5.8 },
      { symbol: "2308", name: "台達電", weight: 3.4 },
      { symbol: "2382", name: "廣達", weight: 3.1 },
      { symbol: "2881", name: "富邦金", weight: 3.0 },
      { symbol: "2891", name: "中信金", weight: 2.8 },
      { symbol: "2882", name: "國泰金", weight: 2.7 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 43.0 },
      { sector: "電腦及週邊設備", weight: 20.5 },
      { sector: "金融保險", weight: 19.5 },
      { sector: "其他電子與傳產", weight: 17.0 },
    ],
  },
  "00923": {
    name: "群益台ESG低碳50",
    issuer: "群益投信",
    category: "ESG 低碳市值型 ETF",
    tracking_index: "臺灣指數公司特選臺灣ESG低碳50指數",
    expense_ratio: "0.38%",
    dividend_freq: "半年配 (2月、8月除息)",
    aum: "約 195 億 TWD",
    dividend_yield_est: 3.8,
    focus_points: [
      "排除高排碳傳產（如傳統塑化、鋼鐵、水泥），聚焦台積電、聯發科、日月光與低碳科技權值股。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 30.5 },
      { symbol: "2454", name: "聯發科", weight: 7.2 },
      { symbol: "2317", name: "鴻海", weight: 6.1 },
      { symbol: "2308", name: "台達電", weight: 4.2 },
      { symbol: "3711", name: "日月光投控", weight: 3.8 },
      { symbol: "2382", name: "廣達", weight: 3.5 },
      { symbol: "2303", name: "聯電", weight: 3.2 },
      { symbol: "2881", name: "富邦金", weight: 3.0 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 51.0 },
      { sector: "電腦及電子零組件", weight: 24.0 },
      { sector: "金融與通信", weight: 25.0 },
    ],
  },
  "00905": {
    name: "FT臺灣Smart",
    issuer: "富蘭克林華美投信",
    category: "多因子 Smart Beta 市值型 ETF",
    tracking_index: "特選Smart多因子指數",
    expense_ratio: "0.35%",
    dividend_freq: "季配息 (1、4、7、10月除息)",
    aum: "約 85 億 TWD",
    dividend_yield_est: 4.5,
    focus_points: [
      "結合品質、價值、動能三因子選股，台積電上限約 30%，其餘分散於高動能價值股。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 30.2 },
      { symbol: "2317", name: "鴻海", weight: 6.8 },
      { symbol: "2454", name: "聯發科", weight: 4.5 },
      { symbol: "2881", name: "富邦金", weight: 3.6 },
      { symbol: "2303", name: "聯電", weight: 3.1 },
      { symbol: "2891", name: "中信金", weight: 2.9 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 42.0 },
      { sector: "電子硬體與零組件", weight: 28.0 },
      { sector: "金融與傳產", weight: 30.0 },
    ],
  },
  "0051": {
    name: "元大中型100",
    issuer: "元大投信",
    category: "台股中大型動能 ETF",
    tracking_index: "臺灣中型100指數 (市值第51至150名上市企業)",
    expense_ratio: "0.43%",
    dividend_freq: "年配息 (10月/11月)",
    aum: "約 22 億 TWD",
    dividend_yield_est: 3.5,
    focus_points: [
      "完全不含前 50 大權值股，專門捕捉台股市值排名第 51～150 名的中小型成長股。",
      "當內資與投信主導中小型題材股作帳行情時，表現常優於大盤。",
    ],
    holdings: [
      { symbol: "2345", name: "智邦", weight: 3.2 },
      { symbol: "3017", name: "奇鋐", weight: 2.9 },
      { symbol: "2360", name: "致茂", weight: 2.5 },
      { symbol: "3661", name: "世芯-KY", weight: 2.4 },
      { symbol: "2383", name: "台光電", weight: 2.3 },
      { symbol: "1519", name: "華城", weight: 2.1 },
      { symbol: "2618", name: "長榮航", weight: 2.0 },
      { symbol: "3037", name: "欣興", weight: 1.9 },
    ],
    sector_weights: [
      { sector: "AI 散熱/CCL/網通零組件", weight: 42.0 },
      { sector: "IC設計與半導體設備", weight: 25.0 },
      { sector: "重電機電與傳產航運", weight: 33.0 },
    ],
  },
  "00733": {
    name: "富邦臺灣中小",
    issuer: "富邦投信",
    category: "中小型 Alpha 動能型 ETF",
    tracking_index: "臺灣指數公司中小型A級動能50指數",
    expense_ratio: "0.62%",
    dividend_freq: "半年配 (1月、7月除息)",
    aum: "約 95 億 TWD",
    dividend_yield_est: 4.8,
    focus_points: [
      "排除市值前 50 大企業，專門挑選具備「高 Alpha 超額報酬動能」的 50 檔上市中小型強勢股。",
      "換股周轉率高，多頭時期爆發力強，空頭整理期波動亦較大。",
    ],
    holdings: [
      { symbol: "3017", name: "奇鋐", weight: 7.8 },
      { symbol: "2383", name: "台光電", weight: 6.5 },
      { symbol: "2404", name: "漢唐", weight: 5.4 },
      { symbol: "6176", name: "瑞儀", weight: 4.9 },
      { symbol: "2368", name: "金像電", weight: 4.3 },
      { symbol: "3032", name: "偉訓", weight: 3.8 },
    ],
    sector_weights: [
      { sector: "電子零組件 (PCB/散熱)", weight: 38.0 },
      { sector: "電腦週邊與光電", weight: 32.0 },
      { sector: "機電工程與其他", weight: 30.0 },
    ],
  },
  "00631L": {
    name: "元大台灣50正2",
    issuer: "元大投信",
    category: "台股 2 倍槓桿型期貨 ETF",
    tracking_index: "臺灣50指數單日正向 2 倍報酬",
    expense_ratio: "1.15%",
    dividend_freq: "不配息（期貨轉倉收益直接滾入淨值）",
    aum: "約 260 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "透過持有臺指期貨 (TX) 與小臺指/臺灣50期貨多頭部位，提供臺灣50指數「單日正向 2 倍」報酬，並非持有現股。",
      "不配發股息，在台指期長期逆價差環境下享有轉倉正收益與連續上漲時的複利效應，但盤整或空頭回檔時耗損與波動亦為 2 倍。",
    ],
    holdings: [
      { symbol: "^TWII", name: "臺股期貨 (TX) 近月多頭契約 (約 185% 曝險)", weight: 92.5 },
      { symbol: "0050", name: "臺灣50期貨 / 元大台灣50 ETF 部位 (約 15% 曝險)", weight: 7.5 },
    ],
    sector_weights: [
      { sector: "臺指期貨正向 200% 多頭部位", weight: 92.5 },
      { sector: "保證金與台幣附買回債券準備金", weight: 7.5 },
    ],
  },
  "00632R": {
    name: "元大台灣50反1",
    issuer: "元大投信",
    category: "台股 1 倍反向避險型期貨 ETF",
    tracking_index: "臺灣50指數單日反向 1 倍報酬",
    expense_ratio: "1.15%",
    dividend_freq: "不配息（反向期貨避險工具）",
    aum: "約 310 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "透過放空臺指期貨提供「單日反向 1 倍」報酬，僅適合短線空頭避險，不適合長期持有。",
      "因每日重新平衡機制與管理費、期貨轉倉成本，長期持有淨值具有自然扣血效應。",
    ],
    holdings: [
      { symbol: "^TWII", name: "臺股期貨 (TX) 近月空頭避險契約 (-100% 曝險)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "臺指期貨反向空頭部位 (-100%)", weight: 100.0 },
    ],
  },
  "00675L": {
    name: "富邦臺灣加權正2",
    issuer: "富邦投信",
    category: "台股 2 倍槓桿型期貨 ETF",
    tracking_index: "臺灣加權股價指數單日正向 2 倍報酬指數",
    expense_ratio: "0.81%",
    dividend_freq: "不配息（期貨收益滾入淨值）",
    aum: "約 75 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "追蹤台股大盤加權指數單日 2 倍正向報酬，內扣經管費（約 0.81%）低於 00631L。",
      "100% 透過臺指期貨達成 200% 多頭曝險，不配息。",
    ],
    holdings: [
      { symbol: "^TWII", name: "臺股期貨 (TX) 近月多頭契約 (200% 曝險)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "臺指期貨多頭契約與保證金準備", weight: 100.0 },
    ],
  },
  "00676R": {
    name: "富邦臺灣加權反1",
    issuer: "富邦投信",
    category: "台股 1 倍反向避險型期貨 ETF",
    tracking_index: "臺灣加權股價指數單日反向 1 倍報酬指數",
    expense_ratio: "0.80%",
    dividend_freq: "不配息",
    aum: "約 35 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "透過放空臺指期貨達成台股加權指數單日反向 1 倍報酬，供短線避險使用，不適合長期存股。",
    ],
    holdings: [
      { symbol: "^TWII", name: "臺股期貨 (TX) 空頭契約 (-100% 曝險)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "臺指期貨空頭部位與保證金", weight: 100.0 },
    ],
  },
  "00663L": {
    name: "國泰臺灣加權正2",
    issuer: "國泰投信",
    category: "台股 2 倍槓桿型期貨 ETF",
    tracking_index: "臺灣加權指數單日正向 2 倍",
    expense_ratio: "0.79%",
    dividend_freq: "不配息",
    aum: "約 42 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "透過持有臺指期貨多單達成大盤單日 2 倍漲跌曝險，不配息，內扣費用率為台股正2 ETF 中最低之一。",
    ],
    holdings: [
      { symbol: "^TWII", name: "臺股期貨 (TX) 多頭契約 (200% 曝險)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "臺指期貨多頭契約與保證金", weight: 100.0 },
    ],
  },
  "00685L": {
    name: "群益臺灣加權正2",
    issuer: "群益投信",
    category: "台股 2 倍槓桿型期貨 ETF",
    tracking_index: "臺灣加權指數單日正向 2 倍",
    expense_ratio: "0.84%",
    dividend_freq: "不配息",
    aum: "約 25 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "透過臺指期貨多頭部位追蹤台股大盤單日 2 倍報酬，不配息。",
    ],
    holdings: [
      { symbol: "^TWII", name: "臺股期貨 (TX) 多頭契約 (200% 曝險)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "臺指期貨多頭契約與保證金", weight: 100.0 },
    ],
  },

  // ==================== 2. 台美高股息、月配息與低波動 ETF ====================
  "0056": {
    name: "元大高股息",
    issuer: "元大投信",
    category: "高股息型 ETF",
    tracking_index: "臺灣高股息指數 (預估未來一年現金股利殖利率最高前50名)",
    expense_ratio: "0.43% ~ 0.65%",
    dividend_freq: "季配息 (1、4、7、10月除息)",
    aum: "約 3,750 億 TWD",
    dividend_yield_est: 7.8,
    focus_points: [
      "從臺灣50與臺灣中型100指數中，挑選「預測未來一年現金股利殖利率最高」之 50 檔股票（不含台積電）。",
      "每年 6 月與 12 月進行成分股定期審核換股，投信換股期間常引發成分股籌碼波動。",
    ],
    holdings: [
      { symbol: "1303", name: "南亞", weight: 8.37 },
      { symbol: "2408", name: "南亞科", weight: 4.36 },
      { symbol: "2357", name: "華碩", weight: 4.18 },
      { symbol: "2890", name: "永豐金", weight: 4.02 },
      { symbol: "2880", name: "華南金", weight: 3.94 },
      { symbol: "2344", name: "華邦電", weight: 3.83 },
      { symbol: "2891", name: "中信金", weight: 3.73 },
      { symbol: "3231", name: "緯創", weight: 3.59 },
      { symbol: "2382", name: "廣達", weight: 3.52 },
      { symbol: "2886", name: "兆豐金", weight: 3.32 },
    ],
    sector_weights: [
      { sector: "電腦及週邊設備", weight: 26.5 },
      { sector: "半導體業", weight: 23.0 },
      { sector: "金融保險", weight: 18.5 },
      { sector: "航運與傳產", weight: 16.0 },
      { sector: "電子通路與其他", weight: 16.0 },
    ],
  },
  "00878": {
    name: "國泰永續高股息",
    issuer: "國泰投信",
    category: "高股息 / ESG 型 ETF",
    tracking_index: "MSCI臺灣ESG永續高股息精選30指數",
    expense_ratio: "0.42%",
    dividend_freq: "季配息 (2、5、8、11月除息)",
    aum: "約 3,850 億 TWD",
    dividend_yield_est: 6.95,
    focus_points: [
      "以過去三年平均年化殖利率與 MSCI ESG 評級篩選 30 檔大型穩健股，金融與電子權重均衡（不含台積電）。",
      "波動度低於純科技型 ETF，每年 5 月與 11 月進行成分股調整。",
    ],
    holdings: [
      { symbol: "2891", name: "中信金", weight: 9.65 },
      { symbol: "2382", name: "廣達", weight: 9.14 },
      { symbol: "2882", name: "國泰金", weight: 6.43 },
      { symbol: "2357", name: "華碩", weight: 5.80 },
      { symbol: "2303", name: "聯電", weight: 4.50 },
      { symbol: "2454", name: "聯發科", weight: 4.35 },
      { symbol: "2881", name: "富邦金", weight: 4.12 },
      { symbol: "3034", name: "聯詠", weight: 3.85 },
      { symbol: "2308", name: "台達電", weight: 3.60 },
      { symbol: "3711", name: "日月光投控", weight: 3.40 },
    ],
    sector_weights: [
      { sector: "電腦及週邊設備", weight: 28.0 },
      { sector: "金融保險", weight: 26.5 },
      { sector: "半導體業", weight: 24.0 },
      { sector: "通信網路與其他", weight: 21.5 },
    ],
  },
  "00919": {
    name: "群益台灣精選高息",
    issuer: "群益投信",
    category: "高股息型 ETF",
    tracking_index: "臺灣指數公司特選臺灣上市上櫃精選高息指數",
    expense_ratio: "0.45%",
    dividend_freq: "季配息 (3、6、9、12月除息)",
    aum: "約 2,980 億 TWD",
    dividend_yield_est: 8.9,
    focus_points: [
      "每年 5 月依「已宣告現金股利」精準卡位高息股，12 月依「前三季 EPS 成長率」預選隔年潛力高息股。",
      "航運、半導體與金融股佔比較高，需留意除權息旺季後之填息動能。",
    ],
    holdings: [
      { symbol: "2603", name: "長榮", weight: 9.8 },
      { symbol: "2303", name: "聯電", weight: 9.2 },
      { symbol: "3034", name: "聯詠", weight: 8.5 },
      { symbol: "2454", name: "聯發科", weight: 8.1 },
      { symbol: "2891", name: "中信金", weight: 6.4 },
      { symbol: "2609", name: "陽明", weight: 4.5 },
      { symbol: "5347", name: "世界", weight: 4.1 },
      { symbol: "6239", name: "力成", weight: 3.8 },
      { symbol: "2404", name: "漢唐", weight: 3.4 },
      { symbol: "6176", name: "瑞儀", weight: 3.1 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 42.0 },
      { sector: "航運業", weight: 18.5 },
      { sector: "金融保險", weight: 14.0 },
      { sector: "電子零組件與其他", weight: 25.5 },
    ],
  },
  "00929": {
    name: "復華台灣科技優息",
    issuer: "復華投信",
    category: "科技高股息 (月配型)",
    tracking_index: "特選臺灣科技優息指數",
    expense_ratio: "0.38%",
    dividend_freq: "月配息",
    aum: "約 2,450 億 TWD",
    dividend_yield_est: 6.5,
    focus_points: [
      "100% 聚焦台灣上市櫃電子科技股，結合 ROE、股息變異性與本益比篩選 40 檔成分股。",
      "每年 6 月定審換股，受台灣電子產業庫存週期與消費性電子需求影響較大。",
    ],
    holdings: [
      { symbol: "2303", name: "聯電", weight: 8.6 },
      { symbol: "3034", name: "聯詠", weight: 7.8 },
      { symbol: "2454", name: "聯發科", weight: 7.4 },
      { symbol: "3711", name: "日月光投控", weight: 6.9 },
      { symbol: "4938", name: "和碩", weight: 6.2 },
      { symbol: "2385", name: "群光", weight: 5.1 },
      { symbol: "6239", name: "力成", weight: 4.8 },
      { symbol: "3702", name: "大聯大", weight: 4.5 },
      { symbol: "5347", name: "世界", weight: 4.2 },
      { symbol: "2347", name: "聯強", weight: 3.9 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 48.5 },
      { sector: "電子通路業", weight: 16.0 },
      { sector: "電腦及週邊設備", weight: 15.5 },
      { sector: "電子零組件與其他", weight: 20.0 },
    ],
  },
  "00940": {
    name: "元大台灣價值高息",
    issuer: "元大投信",
    category: "價值高股息 (月配型)",
    tracking_index: "臺灣價值高息指數",
    expense_ratio: "0.39%",
    dividend_freq: "月配息",
    aum: "約 1,550 億 TWD",
    dividend_yield_est: 5.8,
    focus_points: [
      "導入巴菲特價值投資指標（自由現金流量收益率、ROE、本益比）篩選 50 檔低估值高息股。",
      "單一成分股權重上限 8%，產業分佈涵蓋航運、金融、半導體與電子通路。",
    ],
    holdings: [
      { symbol: "2603", name: "長榮", weight: 8.1 },
      { symbol: "2303", name: "聯電", weight: 5.4 },
      { symbol: "2891", name: "中信金", weight: 5.1 },
      { symbol: "2357", name: "華碩", weight: 4.8 },
      { symbol: "3034", name: "聯詠", weight: 4.3 },
      { symbol: "4938", name: "和碩", weight: 3.9 },
      { symbol: "2618", name: "長榮航", weight: 3.7 },
      { symbol: "3711", name: "日月光投控", weight: 3.5 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 29.0 },
      { sector: "航運業", weight: 18.0 },
      { sector: "電腦及週邊設備", weight: 17.5 },
      { sector: "金融與電子通路", weight: 35.5 },
    ],
  },
  "00939": {
    name: "統一台灣高息動能",
    issuer: "統一投信",
    category: "動能高股息 (月配型)",
    tracking_index: "特選臺灣高息動能指數",
    expense_ratio: "0.40%",
    dividend_freq: "月配息",
    aum: "約 480 億 TWD",
    dividend_yield_est: 6.1,
    focus_points: [
      "每年 5 月依股利率選股，9 月與 1 月利用夏普值(Sharpe Ratio)動態加減碼強勢動能股。",
    ],
    holdings: [
      { symbol: "2454", name: "聯發科", weight: 7.5 },
      { symbol: "2412", name: "中華電", weight: 6.8 },
      { symbol: "2891", name: "中信金", weight: 6.2 },
      { symbol: "2303", name: "聯電", weight: 5.9 },
      { symbol: "3045", name: "台灣大", weight: 5.4 },
      { symbol: "2603", name: "長榮", weight: 5.1 },
      { symbol: "3711", name: "日月光投控", weight: 4.6 },
      { symbol: "2382", name: "廣達", weight: 4.2 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 34.0 },
      { sector: "通信網路業", weight: 18.5 },
      { sector: "電腦及週邊設備", weight: 17.0 },
      { sector: "金融與航運", weight: 30.5 },
    ],
  },
  "00713": {
    name: "元大台灣高息低波",
    issuer: "元大投信",
    category: "高息低波動型 ETF",
    tracking_index: "臺灣指數公司特選高股息低波動指數",
    expense_ratio: "0.42%",
    dividend_freq: "季配息 (3、6、9、12月除息)",
    aum: "約 1,220 億 TWD",
    dividend_yield_est: 7.4,
    focus_points: [
      "透過最小變異數演算法控制投資組合整體波動度，回撤控制能力在台股高息 ETF 中名列前茅。",
      "電信、食品、金融與低本益比電子股配置均衡，適合防禦型資產配置。",
    ],
    holdings: [
      { symbol: "2412", name: "中華電", weight: 7.2 },
      { symbol: "1216", name: "統一", weight: 6.8 },
      { symbol: "3045", name: "台灣大", weight: 6.1 },
      { symbol: "2891", name: "中信金", weight: 5.4 },
      { symbol: "2303", name: "聯電", weight: 4.8 },
      { symbol: "4904", name: "遠傳", weight: 4.5 },
      { symbol: "2886", name: "兆豐金", weight: 4.1 },
      { symbol: "2357", name: "華碩", weight: 3.8 },
    ],
    sector_weights: [
      { sector: "通信網路與民生消費", weight: 31.0 },
      { sector: "金融保險", weight: 24.5 },
      { sector: "電腦及電子通路", weight: 23.5 },
      { sector: "半導體與其他", weight: 21.0 },
    ],
  },
  "00915": {
    name: "凱基優選高股息30",
    issuer: "凱基投信",
    category: "低波高股息型 ETF",
    tracking_index: "臺灣指數公司特選臺灣上市上櫃多因子優選高股息30指數",
    expense_ratio: "0.39%",
    dividend_freq: "季配息 (3、6、9、12月除息)",
    aum: "約 380 億 TWD",
    dividend_yield_est: 8.2,
    focus_points: [
      "以獲利品質、下行風險指標剔除弱勢股，再結合高股息與低波動排序，近年含息總報酬率居高股息 ETF 前段班。",
    ],
    holdings: [
      { symbol: "1216", name: "統一", weight: 8.1 },
      { symbol: "2891", name: "中信金", weight: 7.8 },
      { symbol: "2303", name: "聯電", weight: 7.4 },
      { symbol: "2886", name: "兆豐金", weight: 6.8 },
      { symbol: "3034", name: "聯詠", weight: 6.2 },
      { symbol: "3711", name: "日月光投控", weight: 5.5 },
      { symbol: "2885", name: "元大金", weight: 4.9 },
      { symbol: "5871", name: "中租-KY", weight: 4.2 },
    ],
    sector_weights: [
      { sector: "金融保險", weight: 34.0 },
      { sector: "半導體與電子零組件", weight: 35.0 },
      { sector: "食品民生與其他", weight: 31.0 },
    ],
  },
  "00918": {
    name: "大華優利高填息30",
    issuer: "大華銀投信",
    category: "高填息動能高息 ETF",
    tracking_index: "特選臺灣上市上櫃優利高填息30指數",
    expense_ratio: "0.41%",
    dividend_freq: "季配息 (3、6、9、12月除息)",
    aum: "約 420 億 TWD",
    dividend_yield_est: 8.5,
    focus_points: [
      "首創將「歷史填息率」納入選股條件，挑選過去至多 15 次除息中填息成功率最高的高殖利率股。",
    ],
    holdings: [
      { symbol: "2603", name: "長榮", weight: 8.4 },
      { symbol: "2303", name: "聯電", weight: 7.2 },
      { symbol: "2891", name: "中信金", weight: 6.5 },
      { symbol: "2357", name: "華碩", weight: 5.9 },
      { symbol: "3034", name: "聯詠", weight: 5.4 },
      { symbol: "2382", name: "廣達", weight: 5.1 },
      { symbol: "2881", name: "富邦金", weight: 4.7 },
    ],
    sector_weights: [
      { sector: "電腦及AI硬體", weight: 29.0 },
      { sector: "半導體業", weight: 27.0 },
      { sector: "金融與航運", weight: 44.0 },
    ],
  },
  "00900": {
    name: "富邦特選高股息30",
    issuer: "富邦投信",
    category: "高周轉真高息型 ETF",
    tracking_index: "特選臺灣上市上櫃高股息30指數",
    expense_ratio: "0.45%",
    dividend_freq: "月配息 (已由季配改為月配息)",
    aum: "約 310 億 TWD",
    dividend_yield_est: 7.9,
    focus_points: [
      "每年 4、7、12 月三次貼近除權息宣告時點換股，全力鎖定當年度實際配息最高之 30 檔個股。",
    ],
    holdings: [
      { symbol: "2454", name: "聯發科", weight: 5.6 },
      { symbol: "2303", name: "聯電", weight: 5.3 },
      { symbol: "2891", name: "中信金", weight: 5.0 },
      { symbol: "2603", name: "長榮", weight: 4.8 },
      { symbol: "3034", name: "聯詠", weight: 4.6 },
      { symbol: "2882", name: "國泰金", weight: 4.4 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 32.0 },
      { sector: "金融保險", weight: 28.0 },
      { sector: "電腦週邊與航運", weight: 40.0 },
    ],
  },
  "00712": {
    name: "復華富時不動產",
    issuer: "復華投信",
    category: "海外不動產 REITs 型 ETF",
    tracking_index: "富時 NAREIT 抵押權型不動產投資信託指數",
    expense_ratio: "0.85%",
    dividend_freq: "季配息 (3、6、9、12月除息)",
    aum: "約 310 億 TWD",
    dividend_yield_est: 9.2,
    focus_points: [
      "主要投資美國抵押權型 REITs (mREITs)，直接受美國房貸利差與聯準會降息循環影響。",
    ],
    holdings: [
      { symbol: "NLY", name: "Annaly Capital Management", weight: 19.5 },
      { symbol: "AGNC", name: "AGNC Investment Corp.", weight: 15.8 },
      { symbol: "STWD", name: "Starwood Property Trust", weight: 11.4 },
      { symbol: "BXMT", name: "Blackstone Mortgage Trust", weight: 6.2 },
      { symbol: "RITM", name: "Rithm Capital Corp.", weight: 5.9 },
    ],
    sector_weights: [
      { sector: "住宅抵押權 REITs (Agency RMBS)", weight: 58.0 },
      { sector: "商用不動產抵押權 REITs (CMBS)", weight: 32.0 },
      { sector: "混合型與現金部位", weight: 10.0 },
    ],
  },

  // ==================== 3. AI 科技、半導體與海外美股科技 ETF ====================
  "00881": {
    name: "國泰台灣5G+",
    issuer: "國泰投信",
    category: "台灣 AI 與 5G 科技主題 ETF",
    tracking_index: "臺灣5G+通訊指數",
    expense_ratio: "0.49%",
    dividend_freq: "半年配 (1月、8月除息)",
    aum: "約 620 億 TWD",
    dividend_yield_est: 4.2,
    focus_points: [
      "涵蓋台灣 AI 伺服器、半導體、5G 通訊供應鏈龍頭，前三大成分股為台積電、鴻海、聯發科。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 32.5 },
      { symbol: "2317", name: "鴻海", weight: 13.8 },
      { symbol: "2454", name: "聯發科", weight: 11.4 },
      { symbol: "2382", name: "廣達", weight: 5.6 },
      { symbol: "2308", name: "台達電", weight: 4.8 },
      { symbol: "2303", name: "聯電", weight: 4.1 },
      { symbol: "3231", name: "緯創", weight: 3.5 },
      { symbol: "2345", name: "智邦", weight: 3.2 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 54.0 },
      { sector: "電腦及AI伺服器", weight: 26.0 },
      { sector: "網通與電子零組件", weight: 20.0 },
    ],
  },
  "00891": {
    name: "中信關鍵半導體",
    issuer: "中國信託投信",
    category: "台灣半導體產業型 ETF",
    tracking_index: "ICE FactSet 臺灣ESG永續關鍵半導體指數",
    expense_ratio: "0.49%",
    dividend_freq: "季配息 (2、5、8、11月除息)",
    aum: "約 210 億 TWD",
    dividend_yield_est: 5.1,
    focus_points: [
      "純度 100% 台灣半導體上中下游（IC設計、晶圓代工、封測），單一成分股上限 20%。",
      "聯發科(2454)與台積電(2330)雙核心配置，對費城半導體指數(^SOX)敏感度極高。",
    ],
    holdings: [
      { symbol: "2454", name: "聯發科", weight: 20.4 },
      { symbol: "2330", name: "台積電", weight: 19.8 },
      { symbol: "2303", name: "聯電", weight: 8.5 },
      { symbol: "3711", name: "日月光投控", weight: 8.1 },
      { symbol: "3034", name: "聯詠", weight: 6.2 },
      { symbol: "2379", name: "瑞昱", weight: 5.4 },
      { symbol: "3661", name: "世芯-KY", weight: 4.1 },
      { symbol: "6488", name: "環球晶", weight: 3.5 },
    ],
    sector_weights: [
      { sector: "IC 設計", weight: 46.0 },
      { sector: "晶圓代工", weight: 34.0 },
      { sector: "半導體封測與材料", weight: 20.0 },
    ],
  },
  "00892": {
    name: "富邦台灣半導體",
    issuer: "富邦投信",
    category: "台灣半導體產業型 ETF",
    tracking_index: "ICE FactSet 台灣核心半導體指數",
    expense_ratio: "0.48%",
    dividend_freq: "半年配 (1月、7月除息)",
    aum: "約 72 億 TWD",
    dividend_yield_est: 4.0,
    focus_points: [
      "以獲利指標（GPA）篩選台灣 30 檔核心半導體股，台積電上限 25%。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 25.2 },
      { symbol: "2454", name: "聯發科", weight: 15.8 },
      { symbol: "2303", name: "聯電", weight: 8.9 },
      { symbol: "3711", name: "日月光投控", weight: 7.5 },
      { symbol: "3034", name: "聯詠", weight: 6.1 },
      { symbol: "2379", name: "瑞昱", weight: 5.2 },
    ],
    sector_weights: [
      { sector: "IC 設計", weight: 44.0 },
      { sector: "晶圓代工", weight: 36.0 },
      { sector: "封測與設備材料", weight: 20.0 },
    ],
  },
  "00904": {
    name: "新光臺灣半導體30",
    issuer: "新光投信",
    category: "台灣半導體市值型 ETF",
    tracking_index: "臺灣指數公司臺灣全市場半導體精選30指數",
    expense_ratio: "0.49%",
    dividend_freq: "季配息 (2、5、8、11月除息)",
    aum: "約 45 億 TWD",
    dividend_yield_est: 4.3,
    focus_points: [
      "純按市值排序挑選台灣前 30 大半導體公司，台積電權重上限 30%，被稱為半導體版 0050。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 30.5 },
      { symbol: "2454", name: "聯發科", weight: 16.2 },
      { symbol: "3711", name: "日月光投控", weight: 6.8 },
      { symbol: "2303", name: "聯電", weight: 6.5 },
      { symbol: "3034", name: "聯詠", weight: 4.2 },
      { symbol: "2379", name: "瑞昱", weight: 3.9 },
    ],
    sector_weights: [
      { sector: "晶圓代工", weight: 40.0 },
      { sector: "IC 設計", weight: 42.0 },
      { sector: "半導體封測與矽晶圓", weight: 18.0 },
    ],
  },
  "00927": {
    name: "群益半導體收益",
    issuer: "群益投信",
    category: "半導體高股息型 ETF",
    tracking_index: "臺灣指數公司特選臺灣上市上櫃半導體收益指數",
    expense_ratio: "0.48%",
    dividend_freq: "季配息 (1、4、7、10月除息)",
    aum: "約 190 億 TWD",
    dividend_yield_est: 6.2,
    focus_points: [
      "結合台灣半導體成長性與高現金股息篩選，兼顧台積電、聯發科、聯電、日月光與高息 IC 設計股。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 15.8 },
      { symbol: "2454", name: "聯發科", weight: 15.2 },
      { symbol: "2303", name: "聯電", weight: 12.1 },
      { symbol: "3711", name: "日月光投控", weight: 9.6 },
      { symbol: "3034", name: "聯詠", weight: 8.4 },
      { symbol: "2379", name: "瑞昱", weight: 5.5 },
    ],
    sector_weights: [
      { sector: "IC 設計", weight: 48.0 },
      { sector: "晶圓代工", weight: 32.0 },
      { sector: "半導體封測", weight: 20.0 },
    ],
  },
  "00947": {
    name: "台新臺灣IC設計",
    issuer: "台新投信",
    category: "純 IC 設計產業型 ETF",
    tracking_index: "臺灣指數公司特選臺灣上市上櫃IC設計動能指數",
    expense_ratio: "0.49%",
    dividend_freq: "季配息 (1、4、7、10月除息)",
    aum: "約 42 億 TWD",
    dividend_yield_est: 3.5,
    focus_points: [
      "全台唯一 100% 純 IC 設計與 IP 矽智財 ETF（不含晶圓代工與封測），重倉聯發科、世芯-KY、聯詠、瑞昱、信驊。",
    ],
    holdings: [
      { symbol: "2454", name: "聯發科", weight: 11.2 },
      { symbol: "3661", name: "世芯-KY", weight: 9.8 },
      { symbol: "3034", name: "聯詠", weight: 9.4 },
      { symbol: "2379", name: "瑞昱", weight: 9.1 },
      { symbol: "5274", name: "信驊", weight: 7.5 },
      { symbol: "3443", name: "創意", weight: 6.2 },
      { symbol: "6415", name: "矽力*-KY", weight: 5.8 },
    ],
    sector_weights: [
      { sector: "手機/網通/消費 IC 設計", weight: 55.0 },
      { sector: "AI ASIC 客製化晶片與 IP 矽智財", weight: 30.0 },
      { sector: "伺服器 BMC 與電源管理 IC", weight: 15.0 },
    ],
  },
  "0052": {
    name: "富邦科技",
    issuer: "富邦投信",
    category: "高含積量台灣科技型 ETF",
    tracking_index: "臺灣資訊科技指數",
    expense_ratio: "0.24%",
    dividend_freq: "年配息 (4月除息)",
    aum: "約 145 億 TWD",
    dividend_yield_est: 2.5,
    focus_points: [
      "台積電(2330)單一成分股權重高達 62% 以上，為全市場「含積量」最高的台股 ETF，走勢幾乎與台積電同步。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 63.5 },
      { symbol: "2317", name: "鴻海", weight: 5.8 },
      { symbol: "2454", name: "聯發科", weight: 5.2 },
      { symbol: "2382", name: "廣達", weight: 2.4 },
      { symbol: "3711", name: "日月光投控", weight: 1.6 },
      { symbol: "2303", name: "聯電", weight: 1.5 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 76.5 },
      { sector: "電腦及AI伺服器硬體", weight: 17.5 },
      { sector: "電子零組件與光電", weight: 6.0 },
    ],
  },
  "00757": {
    name: "統一FANG+",
    issuer: "統一投信",
    category: "海外美股尖牙科技巨頭 ETF",
    tracking_index: "NYSE FANG+ Index (洲際交易所 FANG+ 指數)",
    expense_ratio: "1.03%",
    dividend_freq: "不配息（資本利得與股息100%滾入淨值複利）",
    aum: "約 420 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "採「平均等權重（每檔約 10%）」集中投資美股 10 大 AI、雲端、串流與資安科技巨頭。",
      "完全不配息，所有美股股息自動再投資，為台股掛牌海外科技 ETF 中長期淨值成長動能最強勁的代表之一。",
    ],
    holdings: [
      { symbol: "NVDA", name: "NVIDIA Corp. (輝達)", weight: 10.6 },
      { symbol: "META", name: "Meta Platforms (臉書)", weight: 10.4 },
      { symbol: "AVGO", name: "Broadcom Inc. (博通)", weight: 10.3 },
      { symbol: "AAPL", name: "Apple Inc. (蘋果)", weight: 10.1 },
      { symbol: "AMZN", name: "Amazon.com Inc. (亞馬遜)", weight: 10.0 },
      { symbol: "MSFT", name: "Microsoft Corp. (微軟)", weight: 9.9 },
      { symbol: "GOOGL", name: "Alphabet Inc. (Google)", weight: 9.8 },
      { symbol: "NFLX", name: "Netflix Inc. (網飛)", weight: 9.7 },
      { symbol: "NOW", name: "ServiceNow Inc. (企業AI軟體)", weight: 9.6 },
      { symbol: "CRWD", name: "CrowdStrike Holdings (AI雲端資安)", weight: 9.6 },
    ],
    sector_weights: [
      { sector: "美股七巨頭 (Magnificent 7 / AI 雲端)", weight: 60.5 },
      { sector: "AI 算力晶片 (NVIDIA / Broadcom)", weight: 20.9 },
      { sector: "SaaS 企業軟體與 AI 資安", weight: 18.6 },
    ],
  },
  "00662": {
    name: "富邦NASDAQ",
    issuer: "富邦投信",
    category: "海外美股科技指數 ETF",
    tracking_index: "Nasdaq-100 Index (美國那斯達克100指數)",
    expense_ratio: "0.49%",
    dividend_freq: "不配息（收益滾入淨值）",
    aum: "約 260 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "台股版 QQQ，直接追蹤美國 Nasdaq-100 指數，且不配息免除海外所得稅與二代健保補充保費，適合長期定期定額。",
    ],
    holdings: [
      { symbol: "AAPL", name: "Apple Inc.", weight: 8.9 },
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 8.4 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 8.1 },
      { symbol: "AMZN", name: "Amazon.com Inc.", weight: 5.3 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 5.1 },
      { symbol: "META", name: "Meta Platforms", weight: 4.9 },
      { symbol: "TSLA", name: "Tesla Inc.", weight: 3.2 },
      { symbol: "COST", name: "Costco Wholesale", weight: 2.7 },
      { symbol: "GOOGL", name: "Alphabet Inc.", weight: 2.6 },
      { symbol: "NFLX", name: "Netflix Inc.", weight: 2.2 },
    ],
    sector_weights: [
      { sector: "Technology (美國科技與半導體)", weight: 59.5 },
      { sector: "Communication Services (通訊社群)", weight: 15.8 },
      { sector: "Consumer Discretionary & Others", weight: 24.7 },
    ],
  },
  "00646": {
    name: "元大S&P500",
    issuer: "元大投信",
    category: "海外美股大盤指數 ETF",
    tracking_index: "S&P 500 Index (標準普爾500指數)",
    expense_ratio: "0.46%",
    dividend_freq: "不配息（收益滾入淨值）",
    aum: "約 280 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "台股版 SPY / VOO，直接用台幣帳戶投資美國標普 500 大企業，且不配息自動再投資，免自行換匯與複委託手續費。",
    ],
    holdings: [
      { symbol: "AAPL", name: "Apple Inc.", weight: 7.1 },
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 6.8 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 6.5 },
      { symbol: "AMZN", name: "Amazon.com Inc.", weight: 3.8 },
      { symbol: "META", name: "Meta Platforms", weight: 2.6 },
      { symbol: "GOOGL", name: "Alphabet Inc.", weight: 2.1 },
      { symbol: "BRK-B", name: "Berkshire Hathaway", weight: 1.7 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 1.6 },
    ],
    sector_weights: [
      { sector: "Information Technology (科技)", weight: 31.8 },
      { sector: "Financials (金融)", weight: 13.4 },
      { sector: "Health Care (醫療保健)", weight: 11.2 },
      { sector: "Consumer & Industrials", weight: 43.6 },
    ],
  },
  "00830": {
    name: "國泰費城半導體",
    issuer: "國泰投信",
    category: "海外半導體產業型 ETF",
    tracking_index: "美國費城半導體指數 (PHLX Semiconductor Sector Index)",
    expense_ratio: "0.55%",
    dividend_freq: "年配息 (1月除息)",
    aum: "約 315 億 TWD",
    dividend_yield_est: 1.5,
    focus_points: [
      "台股唯一直接追蹤「美國費城半導體指數(^SOX)」的 ETF，一次囊括 NVIDIA、Broadcom、AMD、ASML 與台積電 ADR。",
    ],
    holdings: [
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 12.4 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 10.8 },
      { symbol: "AMD", name: "Advanced Micro Devices", weight: 8.2 },
      { symbol: "TSM", name: "Taiwan Semiconductor (ADR)", weight: 7.6 },
      { symbol: "ASML", name: "ASML Holding", weight: 6.5 },
      { symbol: "QCOM", name: "Qualcomm Inc.", weight: 5.9 },
      { symbol: "AMAT", name: "Applied Materials", weight: 5.1 },
      { symbol: "MU", name: "Micron Technology", weight: 4.6 },
    ],
    sector_weights: [
      { sector: "AI 與 IC 設計巨頭", weight: 54.0 },
      { sector: "先進半導體設備 (曝光機/蝕刻)", weight: 26.0 },
      { sector: "晶圓代工與記憶體", weight: 20.0 },
    ],
  },
  "00941": {
    name: "中信上游半導體",
    issuer: "中國信託投信",
    category: "全球半導體設備與材料 ETF",
    tracking_index: "ICE FactSet 上游半導體指數",
    expense_ratio: "0.95%",
    dividend_freq: "不配息（收益滾入淨值）",
    aum: "約 165 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "專門投資全球美、日、歐半導體上游「設備商（ASML、應用材料、科林、東京威力科創）」與「關鍵材料氣體（信越化學、林德）」，不配息。",
    ],
    holdings: [
      { symbol: "AMAT", name: "Applied Materials (應用材料)", weight: 8.5 },
      { symbol: "ASML", name: "ASML Holding (艾司摩爾)", weight: 8.2 },
      { symbol: "LRCX", name: "Lam Research (科林研發)", weight: 7.8 },
      { symbol: "KLAC", name: "KLA Corp. (科磊)", weight: 7.4 },
      { symbol: "8035.T", name: "Tokyo Electron (東京威力科創)", weight: 7.1 },
      { symbol: "4063.T", name: "Shin-Etsu Chemical (信越化學)", weight: 6.8 },
      { symbol: "LIN", name: "Linde plc (林德特殊氣體)", weight: 6.5 },
    ],
    sector_weights: [
      { sector: "半導體晶圓製造設備 (美國/荷蘭/日本)", weight: 52.0 },
      { sector: "矽晶圓、光阻劑與特殊氣體材料", weight: 48.0 },
    ],
  },
  "00893": {
    name: "國泰智能電動車",
    issuer: "國泰投信",
    category: "海外 AI 與電動車主題 ETF",
    tracking_index: "ICE FactSet 全球智能電動車指數",
    expense_ratio: "0.90%",
    dividend_freq: "不配息",
    aum: "約 145 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "重倉全球自駕晶片與車廠龍頭（NVIDIA、Tesla、AMD、比亞迪、恩智浦），不配息。",
    ],
    holdings: [
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 16.5 },
      { symbol: "TSLA", name: "Tesla Inc.", weight: 15.2 },
      { symbol: "AMD", name: "Advanced Micro Devices", weight: 11.4 },
      { symbol: "NXPI", name: "NXP Semiconductors (恩智浦)", weight: 7.8 },
      { symbol: "INFN", name: "Infineon Technologies (英飛凌)", weight: 6.9 },
    ],
    sector_weights: [
      { sector: "AI 自動駕駛與車用晶片", weight: 55.0 },
      { sector: "電動車整車製造與電池系統", weight: 45.0 },
    ],
  },
  "00895": {
    name: "富邦未來車",
    issuer: "富邦投信",
    category: "海外 AI 晶片與未來移動 ETF",
    tracking_index: "MSCI ACWI IMI 未來車指數",
    expense_ratio: "0.95%",
    dividend_freq: "不配息",
    aum: "約 110 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "NVIDIA、Tesla、台積電三大核心持股合計超過 50%，不配息，高度連動美股 AI 算力與自駕車行情。",
    ],
    holdings: [
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 23.5 },
      { symbol: "TSLA", name: "Tesla Inc.", weight: 18.2 },
      { symbol: "2330", name: "台積電", weight: 12.8 },
      { symbol: "AMD", name: "Advanced Micro Devices", weight: 7.4 },
      { symbol: "UBER", name: "Uber Technologies", weight: 5.2 },
    ],
    sector_weights: [
      { sector: "AI GPU 與先進晶圓代工", weight: 48.0 },
      { sector: "電動自駕車與共享移動平台", weight: 52.0 },
    ],
  },

  // ==================== 4. 台灣掛牌美債、投等債與非投等債 ETF ====================
  "00679B": {
    name: "元大美債20年",
    issuer: "元大投信",
    category: "長天期美國公債 ETF",
    tracking_index: "ICE 美國政府 20+ 年期債券指數",
    expense_ratio: "0.18%",
    dividend_freq: "季配息 (2、5、8、11月除息)",
    aum: "約 3,100 億 TWD",
    dividend_yield_est: 4.35,
    focus_points: [
      "存續期間(Duration)約 16～17 年，對美國長天期公債殖利率(^TNX / ^TYX)極度敏感：殖利率每降 1%，價格理論上漲約 16%。",
      "以台幣計價但持有美元公債，需同步追蹤聯準會利率決策、美元兌台幣匯率(TWD=X)與折溢價幅度。",
    ],
    holdings: [
      { symbol: "^TYX", name: "美國財政部 20~30 年期政府公債組合", weight: 99.2 },
      { symbol: "TWD=X", name: "美元現金與應收利息部位", weight: 0.8 },
    ],
    sector_weights: [
      { sector: "美國財政部 20 年以上主權公債 (AAA/AA+)", weight: 99.2 },
      { sector: "現金與約當現金", weight: 0.8 },
    ],
  },
  "00687B": {
    name: "國泰20年美債",
    issuer: "國泰投信",
    category: "長天期美國公債 ETF",
    tracking_index: "彭博 20 年期以上美國公債指數",
    expense_ratio: "0.18%",
    dividend_freq: "季配息 (3、6、9、12月除息)",
    aum: "約 2,650 億 TWD",
    dividend_yield_est: 4.35,
    focus_points: [
      "存續期間約 16.5 年，直接反映美國 20～30 年期公債殖利率走勢，溢價通常較穩定。",
    ],
    holdings: [
      { symbol: "^TYX", name: "美國財政部 20+ 年期公債組合", weight: 99.4 },
      { symbol: "TWD=X", name: "美元現金部位", weight: 0.6 },
    ],
    sector_weights: [
      { sector: "美國政府長天期公債", weight: 99.4 },
      { sector: "美元流動資產", weight: 0.6 },
    ],
  },
  "00937B": {
    name: "群益ESG投等債20+",
    issuer: "群益投信",
    category: "月配長天期投資等級公司債 ETF",
    tracking_index: "ICE ESG 20年期以上BBB級成熟市場大型美元公司債指數",
    expense_ratio: "0.26%",
    dividend_freq: "月配息",
    aum: "約 2,400 億 TWD",
    dividend_yield_est: 6.1,
    focus_points: [
      "台股規模最大的月配息 BBB 級投資等級公司債 ETF，鎖定票面利率 > 4.5% 之 20 年以上長天期大型企業債。",
      "存續期間約 12.5 年，兼具穩定月現金流與降息循環時的資本利得空間。",
    ],
    holdings: [
      { symbol: "LQD", name: "美國與成熟市場 BBB 級大型企業長天期公司債組合", weight: 98.8 },
      { symbol: "TWD=X", name: "美元流動準備金", weight: 1.2 },
    ],
    sector_weights: [
      { sector: "通訊、科技與媒體巨頭公司債", weight: 32.0 },
      { sector: "大型醫療保健與民生企業債", weight: 28.0 },
      { sector: "能源管道、公用事業與金融債", weight: 40.0 },
    ],
  },
  "00720B": {
    name: "元大投資級公司債",
    issuer: "元大投信",
    category: "長天期 BBB 級投資等級公司債 ETF",
    tracking_index: "彭博美國20+年期BBB公司債流動性指數",
    expense_ratio: "0.28%",
    dividend_freq: "季配息 (1、4、7、10月除息)",
    aum: "約 1,450 億 TWD",
    dividend_yield_est: 5.8,
    focus_points: [
      "聚焦美國 20 年期以上 BBB 級大型企業公司債，殖利率高於純美國公債約 120~150 bps。",
    ],
    holdings: [
      { symbol: "LQD", name: "美國 20+ 年期 BBB 級投資等級公司債組合", weight: 99.0 },
    ],
    sector_weights: [
      { sector: "BBB 級美國大型跨國企業債", weight: 99.0 },
      { sector: "美元現金部位", weight: 1.0 },
    ],
  },
  "00751B": {
    name: "元大AAA至A公司債",
    issuer: "元大投信",
    category: "高信評 A 級以上公司債 ETF",
    tracking_index: "彭博美國20+年期AAA-A公司債流動性指數",
    expense_ratio: "0.28%",
    dividend_freq: "季配息 (3、6、9、12月除息)",
    aum: "約 1,380 億 TWD",
    dividend_yield_est: 5.15,
    focus_points: [
      "只投資信評 A 級至 AAA 級的頂級跨國企業長債（如微軟、蘋果、嬌生、摩根大通），違約風險極低。",
    ],
    holdings: [
      { symbol: "LQD", name: "美國 AAA ~ A 級 20+ 年期頂級企業公司債組合", weight: 99.1 },
    ],
    sector_weights: [
      { sector: "AAA ~ A 級高信評企業長債", weight: 99.1 },
      { sector: "美元流動資產", weight: 0.9 },
    ],
  },
  "00772B": {
    name: "中信高評級公司債",
    issuer: "中國信託投信",
    category: "月配高信評 A 級公司債 ETF",
    tracking_index: "彭博10年期以上高評級美元公司債指數",
    expense_ratio: "0.26%",
    dividend_freq: "月配息",
    aum: "約 1,420 億 TWD",
    dividend_yield_est: 5.1,
    focus_points: [
      "台股老牌月配息 A 級以上高信評公司債 ETF，信用違約風險極低，適合穩健領息族。",
    ],
    holdings: [
      { symbol: "LQD", name: "全球 10+ 年期 A 級以上美元公司債組合", weight: 99.0 },
    ],
    sector_weights: [
      { sector: "A ~ AAA 級大型科技/醫療/金融公司債", weight: 99.0 },
      { sector: "現金部位", weight: 1.0 },
    ],
  },
  "00933B": {
    name: "國泰10Y+金融債",
    issuer: "國泰投信",
    category: "月配大型銀行金融債 ETF",
    tracking_index: "彭博 10 年期以上美元金融債券指數",
    expense_ratio: "0.26%",
    dividend_freq: "月配息",
    aum: "約 760 億 TWD",
    dividend_yield_est: 5.6,
    focus_points: [
      "集中持有美國與全球大到不能倒 (G-SIBs) 系統性重要銀行（摩根大通、美銀、高盛、花旗、摩根士丹利）之 10 年以上金融債。",
    ],
    holdings: [
      { symbol: "JPM", name: "JPMorgan Chase & Co. 10Y+ 金融債", weight: 11.5 },
      { symbol: "BAC", name: "Bank of America Corp. 10Y+ 金融債", weight: 10.8 },
      { symbol: "MS", name: "Morgan Stanley 10Y+ 金融債", weight: 8.6 },
      { symbol: "C", name: "Citigroup Inc. 10Y+ 金融債", weight: 8.2 },
      { symbol: "GS", name: "Goldman Sachs Group 10Y+ 金融債", weight: 7.9 },
    ],
    sector_weights: [
      { sector: "全球系統性重要大型銀行債 (A/BBB+)", weight: 98.8 },
      { sector: "美元流動準備", weight: 1.2 },
    ],
  },
  "00680L": {
    name: "元大美債20正2",
    issuer: "元大投信",
    category: "美國長債 2 倍槓桿期貨 ETF",
    tracking_index: "NYSE 美國政府20+年期債券單日正向 2 倍指數",
    expense_ratio: "0.89%",
    dividend_freq: "不配息（槓桿期貨型債券 ETF）",
    aum: "約 360 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "透過美國長天期公債期貨與美債 ETF 部位提供 20 年美債「單日正向 2 倍」漲跌幅，不配息，存續期間效果約達 32 年。",
    ],
    holdings: [
      { symbol: "TLT", name: "美國超長天期公債期貨 (Ultra T-Bond) / 美債20+年部位 (200%曝險)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "美國長天期公債 2 倍多頭期貨曝險", weight: 100.0 },
    ],
  },

  // ==================== 5. 黃金、白銀、原油期貨與跨國日/陸/越 ETF ====================
  "00635U": {
    name: "期元大S&P黃金",
    issuer: "元大投信",
    category: "商品期貨型黃金 ETF",
    tracking_index: "標普高盛黃金超額回報指數 (S&P GSCI Gold Excess Return)",
    expense_ratio: "1.15%",
    dividend_freq: "不配息（商品期貨型 ETF）",
    aum: "約 38 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "透過持有 COMEX 紐約黃金期貨合約追蹤國際金價(GC=F)，免換匯即可在台股盤中參與黃金避險行情，不配息。",
    ],
    holdings: [
      { symbol: "GC=F", name: "COMEX 黃金期貨近遠月多頭合約 (100% 曝險)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "國際黃金期貨多頭部位與保證金", weight: 100.0 },
    ],
  },
  "00738U": {
    name: "期元大道瓊白銀",
    issuer: "元大投信",
    category: "商品期貨型白銀 ETF",
    tracking_index: "道瓊白銀超額回報指數 (Dow Jones Commodity Index Silver ER)",
    expense_ratio: "1.15%",
    dividend_freq: "不配息（商品期貨型 ETF）",
    aum: "約 15 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "100% 追蹤 COMEX 白銀期貨(SI=F)，兼具貴金屬抗通膨與太陽能/AI導電材料工業需求，波動度高於黃金，不配息。",
    ],
    holdings: [
      { symbol: "SI=F", name: "COMEX 白銀期貨多頭合約 (100% 曝險)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "國際白銀期貨合約與保證金", weight: 100.0 },
    ],
  },
  "00642U": {
    name: "期元大S&P石油",
    issuer: "元大投信",
    category: "商品期貨型原油 ETF",
    tracking_index: "標普高盛原油增強超額回報指數 (WTI 西德州原油期貨)",
    expense_ratio: "1.15%",
    dividend_freq: "不配息（商品期貨型 ETF）",
    aum: "約 22 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "追蹤 NYMEX 西德州輕原油期貨(CL=F)，受 OPEC+ 減產決策、中東地緣政治與轉倉正逆價差影響，不配息。",
    ],
    holdings: [
      { symbol: "CL=F", name: "NYMEX 西德州原油 (WTI) 期貨合約", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "國際原油期貨多頭部位與保證金", weight: 100.0 },
    ],
  },
  "00645": {
    name: "富邦日本",
    issuer: "富邦投信",
    category: "海外日本股市 ETF (匯率避險)",
    tracking_index: "日本東證股價指數 (TOPIX)",
    expense_ratio: "1.05%",
    dividend_freq: "不配息",
    aum: "約 62 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "追蹤日本東證指數 (TOPIX)，且具備「日圓匯率避險」機制，減少日圓貶值對淨值的侵蝕，不配息。",
    ],
    holdings: [
      { symbol: "^N225", name: "Toyota Motor / 三菱UFJ / Sony / 日立 等日本東證權值股組合", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "日本工業製造與汽車龍頭", weight: 38.0 },
      { sector: "日本大型商社與銀行金融", weight: 32.0 },
      { sector: "日本半導體設備與消費電子", weight: 30.0 },
    ],
  },
  "00949": {
    name: "復華日本龍頭",
    issuer: "復華投信",
    category: "海外日本大型護城河龍頭 ETF",
    tracking_index: "NYSE FactSet 日本護城河優勢龍頭企業指數",
    expense_ratio: "0.90%",
    dividend_freq: "年配息 (11月除息)",
    aum: "約 75 億 TWD",
    dividend_yield_est: 1.8,
    focus_points: [
      "精選 30 檔日本具備全球競爭力的商社、半導體設備、汽車與娛樂巨頭（豐田、Sony、三菱商事、東京威力科創、任天堂）。",
    ],
    holdings: [
      { symbol: "^N225", name: "Toyota (豐田汽車) / Sony / 三菱商事 / 東京威力科創 / 武田藥品", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "日本製造與汽車工業", weight: 35.0 },
      { sector: "日本五大商社與金融", weight: 28.0 },
      { sector: "日本半導體設備與遊戲娛樂", weight: 37.0 },
    ],
  },
  "00882": {
    name: "中信中國高股息",
    issuer: "中國信託投信",
    category: "香港掛牌中國高股息 ETF",
    tracking_index: "恒生中國高股息率指數",
    expense_ratio: "0.85%",
    dividend_freq: "半年配 (1月、7月除息)",
    aum: "約 520 億 TWD",
    dividend_yield_est: 6.8,
    focus_points: [
      "投資於香港掛牌之 50 檔高殖利率中國國企股（四大國有銀行、能源煤炭、電信與地產基建），受中國降準救市政策影響顯著。",
    ],
    holdings: [
      { symbol: "FXI", name: "中國工商銀行 / 中國建設銀行 / 中國移動 / 中國海洋石油 (H股)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "中國大型國有銀行與保險 (H股)", weight: 42.0 },
      { sector: "能源、公用事業與電信央企", weight: 35.0 },
      { sector: "工業基建與消費", weight: 23.0 },
    ],
  },

  // ==================== 6. 美股主流 ETF ====================
  "SPY": {
    name: "SPDR S&P 500 ETF Trust",
    issuer: "State Street Global Advisors (道富)",
    category: "美股市值大盤型 ETF",
    tracking_index: "S&P 500 Index (標準普爾500指數)",
    expense_ratio: "0.09%",
    dividend_freq: "季配息 (3、6、9、12月)",
    aum: "$615B USD",
    dividend_yield_est: 1.25,
    focus_points: [
      "全球流動性最高的美股大盤 ETF，涵蓋美國市值前 500 大上市企業。",
      "美股科技七巨頭(Magnificent 7)合計權重約 31%，AI 資本支出與美股財報季為核心驅動因子。",
    ],
    holdings: [
      { symbol: "AAPL", name: "Apple Inc.", weight: 7.1 },
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 6.8 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 6.5 },
      { symbol: "AMZN", name: "Amazon.com Inc.", weight: 3.8 },
      { symbol: "META", name: "Meta Platforms", weight: 2.6 },
      { symbol: "GOOGL", name: "Alphabet Inc.", weight: 2.1 },
      { symbol: "BRK-B", name: "Berkshire Hathaway", weight: 1.7 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 1.6 },
      { symbol: "TSLA", name: "Tesla Inc.", weight: 1.5 },
      { symbol: "LLY", name: "Eli Lilly & Co.", weight: 1.4 },
    ],
    sector_weights: [
      { sector: "Information Technology (科技)", weight: 31.8 },
      { sector: "Financials (金融)", weight: 13.4 },
      { sector: "Health Care (醫療保健)", weight: 11.2 },
      { sector: "Consumer Discretionary (非必需消費)", weight: 10.5 },
      { sector: "Communication Services & Others", weight: 33.1 },
    ],
  },
  "VOO": {
    name: "Vanguard S&P 500 ETF",
    issuer: "Vanguard (先鋒集團)",
    category: "美股市值大盤型 ETF",
    tracking_index: "S&P 500 Index (標準普爾500指數)",
    expense_ratio: "0.03%",
    dividend_freq: "季配息 (3、6、9、12月)",
    aum: "$540B USD",
    dividend_yield_est: 1.28,
    focus_points: [
      "與 SPY 追蹤相同 S&P 500 指數，但內扣費用率僅 0.03%，適合中長期退休與核心資產配置。",
    ],
    holdings: [
      { symbol: "AAPL", name: "Apple Inc.", weight: 7.1 },
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 6.8 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 6.5 },
      { symbol: "AMZN", name: "Amazon.com Inc.", weight: 3.8 },
      { symbol: "META", name: "Meta Platforms", weight: 2.6 },
      { symbol: "GOOGL", name: "Alphabet Inc.", weight: 2.1 },
      { symbol: "BRK-B", name: "Berkshire Hathaway", weight: 1.7 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 1.6 },
    ],
    sector_weights: [
      { sector: "Information Technology (科技)", weight: 31.8 },
      { sector: "Financials (金融)", weight: 13.4 },
      { sector: "Health Care (醫療保健)", weight: 11.2 },
      { sector: "Consumer & Others", weight: 43.6 },
    ],
  },
  "IVV": {
    name: "iShares Core S&P 500 ETF",
    issuer: "BlackRock iShares (貝萊德)",
    category: "美股市值大盤型 ETF",
    tracking_index: "S&P 500 Index (標準普爾500指數)",
    expense_ratio: "0.03%",
    dividend_freq: "季配息 (3、6、9、12月)",
    aum: "$560B USD",
    dividend_yield_est: 1.28,
    focus_points: [
      "貝萊德發行之 S&P 500 核心低費用 ETF，總費用率僅 0.03%，與 VOO、SPY 成分股完全一致。",
    ],
    holdings: [
      { symbol: "AAPL", name: "Apple Inc.", weight: 7.1 },
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 6.8 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 6.5 },
      { symbol: "AMZN", name: "Amazon.com Inc.", weight: 3.8 },
      { symbol: "META", name: "Meta Platforms", weight: 2.6 },
      { symbol: "GOOGL", name: "Alphabet Inc.", weight: 2.1 },
    ],
    sector_weights: [
      { sector: "Information Technology (科技)", weight: 31.8 },
      { sector: "Financials (金融)", weight: 13.4 },
      { sector: "Health Care & Others", weight: 54.8 },
    ],
  },
  "QQQ": {
    name: "Invesco QQQ Trust",
    issuer: "Invesco (景順)",
    category: "美股科技成長型 ETF",
    tracking_index: "Nasdaq-100 Index (那斯達克100指數)",
    expense_ratio: "0.20%",
    dividend_freq: "季配息",
    aum: "$310B USD",
    dividend_yield_est: 0.6,
    focus_points: [
      "追蹤那斯達克市值前 100 大非金融企業，重倉 AI、半導體、雲端軟體與消費科技巨頭。",
    ],
    holdings: [
      { symbol: "AAPL", name: "Apple Inc.", weight: 8.9 },
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 8.4 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 8.1 },
      { symbol: "AMZN", name: "Amazon.com Inc.", weight: 5.3 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 5.1 },
      { symbol: "META", name: "Meta Platforms", weight: 4.9 },
      { symbol: "TSLA", name: "Tesla Inc.", weight: 3.2 },
      { symbol: "COST", name: "Costco Wholesale", weight: 2.7 },
    ],
    sector_weights: [
      { sector: "Technology (科技與半導體)", weight: 59.5 },
      { sector: "Communication Services (通訊服務)", weight: 15.8 },
      { sector: "Consumer Discretionary & Others", weight: 24.7 },
    ],
  },
  "SOXX": {
    name: "iShares Semiconductor ETF",
    issuer: "BlackRock iShares (貝萊德)",
    category: "美股半導體產業型 ETF",
    tracking_index: "NYSE Semiconductor Index",
    expense_ratio: "0.35%",
    dividend_freq: "季配息",
    aum: "$15.8B USD",
    dividend_yield_est: 0.72,
    focus_points: [
      "聚焦美國掛牌之 30 大半導體設計、設備與晶圓代工龍頭，與費城半導體指數(^SOX)及台積電(2330)高度連動。",
    ],
    holdings: [
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 9.8 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 8.9 },
      { symbol: "AMD", name: "Advanced Micro Devices", weight: 7.6 },
      { symbol: "QCOM", name: "Qualcomm Inc.", weight: 6.4 },
      { symbol: "TXN", name: "Texas Instruments", weight: 6.1 },
      { symbol: "AMAT", name: "Applied Materials", weight: 4.8 },
      { symbol: "TSM", name: "Taiwan Semiconductor (ADR)", weight: 4.4 },
      { symbol: "MU", name: "Micron Technology", weight: 4.0 },
    ],
    sector_weights: [
      { sector: "IC 設計與 AI 晶片", weight: 52.0 },
      { sector: "半導體設備 (SPE)", weight: 24.5 },
      { sector: "晶圓代工與記憶體", weight: 23.5 },
    ],
  },
  "SMH": {
    name: "VanEck Semiconductor ETF",
    issuer: "VanEck",
    category: "全球半導體龍頭 ETF",
    tracking_index: "MVIS US Listed Semiconductor 25 Index",
    expense_ratio: "0.35%",
    dividend_freq: "年配息 (12月)",
    aum: "$26B USD",
    dividend_yield_est: 0.48,
    focus_points: [
      "按市值加權集中度極高，NVIDIA (~20%) 與台積電 ADR (~12%) 兩大龍頭合計權重超過 32%，AI 純度高於 SOXX。",
    ],
    holdings: [
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 20.4 },
      { symbol: "TSM", name: "Taiwan Semiconductor (ADR)", weight: 12.6 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 7.8 },
      { symbol: "AMD", name: "Advanced Micro Devices", weight: 5.4 },
      { symbol: "ASML", name: "ASML Holding", weight: 4.9 },
      { symbol: "AMAT", name: "Applied Materials", weight: 4.6 },
    ],
    sector_weights: [
      { sector: "AI GPU 與先進晶圓代工", weight: 58.0 },
      { sector: "半導體設備與記憶體", weight: 42.0 },
    ],
  },
  "SCHD": {
    name: "Schwab U.S. Dividend Equity ETF",
    issuer: "Charles Schwab (嘉信理財)",
    category: "美股高股息成長價值型 ETF",
    tracking_index: "Dow Jones U.S. Dividend 100 Index",
    expense_ratio: "0.06%",
    dividend_freq: "季配息 (3、6、9、12月)",
    aum: "$64B USD",
    dividend_yield_est: 3.45,
    focus_points: [
      "要求連續 10 年以上配息，並以自由現金流負債比、ROE、殖利率與 5 年股息成長率篩選 100 檔美股高品質價值股。",
    ],
    holdings: [
      { symbol: "LMT", name: "Lockheed Martin Corp.", weight: 4.3 },
      { symbol: "ABBV", name: "AbbVie Inc.", weight: 4.2 },
      { symbol: "HD", name: "Home Depot Inc.", weight: 4.1 },
      { symbol: "BLK", name: "BlackRock Inc.", weight: 4.0 },
      { symbol: "KO", name: "Coca-Cola Co.", weight: 4.0 },
      { symbol: "VZ", name: "Verizon Communications", weight: 3.9 },
      { symbol: "CSCO", name: "Cisco Systems", weight: 3.8 },
    ],
    sector_weights: [
      { sector: "Financials (金融資產管理)", weight: 17.5 },
      { sector: "Health Care (醫療製藥)", weight: 15.8 },
      { sector: "Consumer Staples (民生必需品)", weight: 14.2 },
      { sector: "Industrials & Energy (工業軍工與能源)", weight: 28.5 },
      { sector: "Technology & Telecom", weight: 24.0 },
    ],
  },
  "JEPI": {
    name: "JPMorgan Equity Premium Income ETF",
    issuer: "J.P. Morgan Asset Management (摩根資產管理)",
    category: "美股掩護性買權 (Covered Call) 月配高息 ETF",
    tracking_index: "S&P 500 低波動價值股 + ELN 標普500掩護性買權策略",
    expense_ratio: "0.35%",
    dividend_freq: "月配息",
    aum: "$37B USD",
    dividend_yield_est: 7.3,
    focus_points: [
      "80% 持有低波動 S&P 500 大型股，20% 透過 ELN 賣出 S&P 500 價外買權收取權利金，轉化為每月高配息現金流。",
    ],
    holdings: [
      { symbol: "META", name: "Meta Platforms", weight: 1.8 },
      { symbol: "AMZN", name: "Amazon.com Inc.", weight: 1.7 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 1.7 },
      { symbol: "PG", name: "Procter & Gamble", weight: 1.6 },
      { symbol: "V", name: "Visa Inc.", weight: 1.6 },
    ],
    sector_weights: [
      { sector: "S&P 500 低波動大型防禦股組合", weight: 85.0 },
      { sector: "S&P 500 掩護性買權 ELN 權利金部位", weight: 15.0 },
    ],
  },
  "JEPQ": {
    name: "JPMorgan Nasdaq Equity Premium Income ETF",
    issuer: "J.P. Morgan Asset Management (摩根資產管理)",
    category: "那斯達克掩護性買權月配高息 ETF",
    tracking_index: "Nasdaq-100 成分股 + ELN 那斯達克100掩護性買權策略",
    expense_ratio: "0.35%",
    dividend_freq: "月配息",
    aum: "$19B USD",
    dividend_yield_est: 9.2,
    focus_points: [
      "結合 Nasdaq-100 科技巨頭成長性與賣出買權(Covered Call)權利金收益，提供約 9% 年化月配息率。",
    ],
    holdings: [
      { symbol: "AAPL", name: "Apple Inc.", weight: 7.8 },
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 7.4 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 7.1 },
      { symbol: "AMZN", name: "Amazon.com Inc.", weight: 4.8 },
      { symbol: "META", name: "Meta Platforms", weight: 4.2 },
    ],
    sector_weights: [
      { sector: "Nasdaq-100 大型科技股現貨", weight: 84.0 },
      { sector: "NDX 100 掩護性買權 ELN 部位", weight: 16.0 },
    ],
  },
  "VYM": {
    name: "Vanguard High Dividend Yield ETF",
    issuer: "Vanguard (先鋒集團)",
    category: "美股高股息價值型 ETF",
    tracking_index: "FTSE High Dividend Yield Index",
    expense_ratio: "0.06%",
    dividend_freq: "季配息",
    aum: "$59B USD",
    dividend_yield_est: 2.85,
    focus_points: [
      "囊括超過 500 檔美股成熟價值與高配息龍頭（金融、醫療、民生消費、能源），波動顯著低於那斯達克。",
    ],
    holdings: [
      { symbol: "BRK-B", name: "Berkshire Hathaway", weight: 3.4 },
      { symbol: "JPM", name: "JPMorgan Chase & Co.", weight: 3.3 },
      { symbol: "XOM", name: "Exxon Mobil Corp.", weight: 3.0 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 2.9 },
      { symbol: "PG", name: "Procter & Gamble", weight: 2.5 },
      { symbol: "JNJ", name: "Johnson & Johnson", weight: 2.4 },
      { symbol: "HD", name: "Home Depot Inc.", weight: 2.3 },
    ],
    sector_weights: [
      { sector: "Financials (金融銀行)", weight: 21.8 },
      { sector: "Consumer Staples (民生必需品)", weight: 13.5 },
      { sector: "Health Care (醫療製藥)", weight: 12.4 },
      { sector: "Industrials & Energy", weight: 52.3 },
    ],
  },
  "VNQ": {
    name: "Vanguard Real Estate ETF",
    issuer: "Vanguard (先鋒集團)",
    category: "美國商用不動產 REITs ETF",
    tracking_index: "MSCI US Investable Market Real Estate 25/50 Index",
    expense_ratio: "0.13%",
    dividend_freq: "季配息",
    aum: "$36B USD",
    dividend_yield_est: 3.9,
    focus_points: [
      "涵蓋美國電信鐵塔、AI 資料中心機房、物流倉儲、醫療照護與零售商用不動產 REITs。",
    ],
    holdings: [
      { symbol: "PLD", name: "Prologis Inc. (物流倉儲龍頭)", weight: 7.4 },
      { symbol: "AMT", name: "American Tower (通訊鐵塔)", weight: 6.2 },
      { symbol: "EQIX", name: "Equinix Inc. (AI 資料中心機房)", weight: 5.5 },
      { symbol: "WELL", name: "Welltower Inc. (醫療養老地產)", weight: 4.8 },
      { symbol: "SPG", name: "Simon Property Group (頂級商場)", weight: 3.9 },
    ],
    sector_weights: [
      { sector: "工業物流與 AI 資料中心 REITs", weight: 29.5 },
      { sector: "通訊電塔與基礎設施 REITs", weight: 16.0 },
      { sector: "醫療、零售與住宅 REITs", weight: 54.5 },
    ],
  },
  "TLT": {
    name: "iShares 20+ Year Treasury Bond ETF",
    issuer: "BlackRock iShares (貝萊德)",
    category: "長天期美國公債 ETF",
    tracking_index: "ICE U.S. Treasury 20+ Year Bond Index",
    expense_ratio: "0.15%",
    dividend_freq: "月配息",
    aum: "$58B USD",
    dividend_yield_est: 4.4,
    focus_points: [
      "全球規模最大之 20 年期以上美國公債 ETF，每月月初除息，存續期間約 16.5 年。",
      "價格與美國 10 年/30 年期公債殖利率(^TNX / ^TYX)呈反向變動。",
    ],
    holdings: [
      { symbol: "^TYX", name: "U.S. Treasury Bonds (20+ Years Maturity)", weight: 99.5 },
    ],
    sector_weights: [
      { sector: "U.S. Treasury (美國主權公債)", weight: 99.5 },
      { sector: "Cash", weight: 0.5 },
    ],
  },
  "IEF": {
    name: "iShares 7-10 Year Treasury Bond ETF",
    issuer: "BlackRock iShares (貝萊德)",
    category: "中天期美國公債 ETF",
    tracking_index: "ICE U.S. Treasury 7-10 Year Bond Index",
    expense_ratio: "0.15%",
    dividend_freq: "月配息",
    aum: "$32B USD",
    dividend_yield_est: 4.1,
    focus_points: [
      "聚焦 7～10 年期美國公債，存續期間約 7.2 年，波動度約為 TLT 的一半。",
    ],
    holdings: [
      { symbol: "^TNX", name: "U.S. Treasury Notes (7-10 Years Maturity)", weight: 99.6 },
    ],
    sector_weights: [
      { sector: "美國中天期政府公債 (7-10Y)", weight: 99.6 },
      { sector: "美元流動準備", weight: 0.4 },
    ],
  },
  "SHY": {
    name: "iShares 1-3 Year Treasury Bond ETF",
    issuer: "BlackRock iShares (貝萊德)",
    category: "短天期美國公債 ETF",
    tracking_index: "ICE U.S. Treasury 1-3 Year Bond Index",
    expense_ratio: "0.15%",
    dividend_freq: "月配息",
    aum: "$24B USD",
    dividend_yield_est: 4.3,
    focus_points: [
      "存續期間僅約 1.8 年，價格波動極低，直接反映聯準會基準利率水準，常作為美元資金停泊工具。",
    ],
    holdings: [
      { symbol: "^TNX", name: "U.S. Short-Term Treasury Notes (1-3Y)", weight: 99.7 },
    ],
    sector_weights: [
      { sector: "美國短天期國庫券/公債 (1-3Y)", weight: 99.7 },
      { sector: "Cash", weight: 0.3 },
    ],
  },
  "BND": {
    name: "Vanguard Total Bond Market ETF",
    issuer: "Vanguard (先鋒集團)",
    category: "美國總體綜合債券 ETF",
    tracking_index: "Bloomberg U.S. Aggregate Float Adjusted Index",
    expense_ratio: "0.03%",
    dividend_freq: "月配息",
    aum: "$118B USD",
    dividend_yield_est: 4.35,
    focus_points: [
      "一檔囊括美國政府公債(約67%)、投資等級公司債與政府機構房貸抵押債(MBS)的核心綜合債券 ETF。",
    ],
    holdings: [
      { symbol: "IEF", name: "U.S. Treasury Bonds & Notes", weight: 67.2 },
      { symbol: "LQD", name: "U.S. Investment Grade Corporate Bonds", weight: 20.5 },
      { symbol: "VNQ", name: "Agency Mortgage-Backed Securities (MBS)", weight: 12.3 },
    ],
    sector_weights: [
      { sector: "美國政府主權公債", weight: 67.2 },
      { sector: "投資級企業債", weight: 20.5 },
      { sector: "機構房貸抵押債券 (MBS)", weight: 12.3 },
    ],
  },
  "LQD": {
    name: "iShares iBoxx $ Investment Grade Corporate Bond ETF",
    issuer: "BlackRock iShares (貝萊德)",
    category: "美國投資等級公司債 ETF",
    tracking_index: "Markit iBoxx USD Liquid Investment Grade Index",
    expense_ratio: "0.14%",
    dividend_freq: "月配息",
    aum: "$31B USD",
    dividend_yield_est: 5.15,
    focus_points: [
      "分散持有超過 2,500 檔美國大型跨國企業發行之 BBB 級以上投資等級公司債。",
    ],
    holdings: [
      { symbol: "JPM", name: "JPMorgan Chase Senior Notes", weight: 2.8 },
      { symbol: "BAC", name: "Bank of America Corp. Bonds", weight: 2.6 },
      { symbol: "MSFT", name: "Microsoft / Apple Investment Grade Bonds", weight: 2.4 },
    ],
    sector_weights: [
      { sector: "Banking & Finance (大型金融機構債)", weight: 28.5 },
      { sector: "Technology & Telecom (科技與電信巨頭債)", weight: 22.0 },
      { sector: "Consumer, Healthcare & Energy", weight: 49.5 },
    ],
  },
  "GLD": {
    name: "SPDR Gold Shares",
    issuer: "World Gold Trust Services",
    category: "實體黃金商品 ETF",
    tracking_index: "LBMA 倫敦黃金現貨午盤定盤價 (Gold Bullion)",
    expense_ratio: "0.40%",
    dividend_freq: "無配息（實體黃金資產）",
    aum: "$74B USD",
    dividend_yield_est: null,
    focus_points: [
      "100% 由倫敦金庫實體黃金條塊支撐，走勢與黃金期貨(GC=F)完全同步，不配息。",
    ],
    holdings: [
      { symbol: "GC=F", name: "倫敦金庫託管實體黃金條塊 (Physical Gold Bullion)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "實體黃金儲備 (Physical Gold)", weight: 100.0 },
    ],
  },
  "SLV": {
    name: "iShares Silver Trust",
    issuer: "BlackRock iShares (貝萊德)",
    category: "實體白銀商品 ETF",
    tracking_index: "LBMA 倫敦白銀現貨價格 (Silver Bullion)",
    expense_ratio: "0.50%",
    dividend_freq: "無配息（實體白銀資產）",
    aum: "$14.5B USD",
    dividend_yield_est: null,
    focus_points: [
      "兼具貴金屬抗通膨屬性與工業金屬需求（太陽能光電板、電動車與 AI 電子導電材料），不配息。",
    ],
    holdings: [
      { symbol: "SI=F", name: "實體白銀條塊儲備 (Physical Silver Bullion)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "實體白銀儲備 (Physical Silver)", weight: 100.0 },
    ],
  },
  "IBIT": {
    name: "iShares Bitcoin Trust ETF",
    issuer: "BlackRock iShares (貝萊德)",
    category: "現貨比特幣 ETF",
    tracking_index: "CME CF Bitcoin Reference Rate (比特幣現貨基準價)",
    expense_ratio: "0.25%",
    dividend_freq: "無配息（數位資產）",
    aum: "$42B USD",
    dividend_yield_est: null,
    focus_points: [
      "全球規模最大之合規比特幣現貨 ETF，由 Coinbase Custody 進行冷錢包實體比特幣託管，不配息。",
    ],
    holdings: [
      { symbol: "BTC-USD", name: "Bitcoin 現貨冷錢包持倉 (Spot Bitcoin)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "Bitcoin (BTC 現貨資產)", weight: 100.0 },
    ],
  },
  "FBTC": {
    name: "Fidelity Wise Origin Bitcoin Fund",
    issuer: "Fidelity Investments (富達)",
    category: "現貨比特幣 ETF",
    tracking_index: "Fidelity Bitcoin Reference Rate",
    expense_ratio: "0.25%",
    dividend_freq: "無配息（數位資產）",
    aum: "$16B USD",
    dividend_yield_est: null,
    focus_points: [
      "富達發行之比特幣現貨 ETF，由 Fidelity Digital Assets 自家託管冷錢包比特幣，不配息。",
    ],
    holdings: [
      { symbol: "BTC-USD", name: "Bitcoin 現貨冷錢包持倉 (Spot Bitcoin)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "Bitcoin (BTC 現貨資產)", weight: 100.0 },
    ],
  },
  "ETHA": {
    name: "iShares Ethereum Trust ETF",
    issuer: "BlackRock iShares (貝萊德)",
    category: "現貨以太坊 ETF",
    tracking_index: "CME CF Ether-Dollar Reference Rate",
    expense_ratio: "0.25%",
    dividend_freq: "無配息（數位資產）",
    aum: "$3.2B USD",
    dividend_yield_est: null,
    focus_points: [
      "貝萊德發行之美股以太坊(ETH)現貨 ETF，100% 持有實體以太幣，不配息。",
    ],
    holdings: [
      { symbol: "ETH-USD", name: "Ethereum 現貨冷錢包持倉 (Spot Ether)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "Ethereum (ETH 現貨資產)", weight: 100.0 },
    ],
  },

  // ==================== 7. 補充台美股熱門 ETF 與產業/原物料 ETF ====================
  "0057": {
    name: "富邦摩台",
    issuer: "富邦投信",
    category: "台股大型權值市值型 ETF",
    tracking_index: "MSCI 臺灣指數 (MSCI Taiwan Index)",
    expense_ratio: "0.40%",
    dividend_freq: "年配息 (10月除息)",
    aum: "約 15 億 TWD",
    dividend_yield_est: 2.8,
    focus_points: [
      "追蹤外資最常用的 MSCI 台灣指數（涵蓋約 90 檔台灣大型與中型權值股），台積電佔比約 52%。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 52.4 },
      { symbol: "2317", name: "鴻海", weight: 6.1 },
      { symbol: "2454", name: "聯發科", weight: 4.8 },
      { symbol: "2382", name: "廣達", weight: 2.3 },
      { symbol: "2881", name: "富邦金", weight: 1.9 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 62.5 },
      { sector: "電子硬體與組件", weight: 18.5 },
      { sector: "金融與傳產", weight: 19.0 },
    ],
  },
  "006203": {
    name: "元大MSCI台灣",
    issuer: "元大投信",
    category: "台股大型權值市值型 ETF",
    tracking_index: "MSCI 臺灣指數 (MSCI Taiwan Index)",
    expense_ratio: "0.40%",
    dividend_freq: "半年配 (5月、11月除息)",
    aum: "約 16 億 TWD",
    dividend_yield_est: 2.9,
    focus_points: [
      "追蹤 MSCI 台灣指數，成分股約 90 檔，比 0050 多納入了部分具國際競爭力的中型權值股。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 52.1 },
      { symbol: "2317", name: "鴻海", weight: 6.0 },
      { symbol: "2454", name: "聯發科", weight: 4.8 },
      { symbol: "2382", name: "廣達", weight: 2.3 },
      { symbol: "2308", name: "台達電", weight: 1.8 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 62.0 },
      { sector: "電子代工與零組件", weight: 19.0 },
      { sector: "金融與傳統產業", weight: 19.0 },
    ],
  },
  "006204": {
    name: "永豐臺灣加權",
    issuer: "永豐投信",
    category: "全市場大盤加權型 ETF",
    tracking_index: "臺灣證券交易所發行量加權股價指數 (TAIEX)",
    expense_ratio: "0.42%",
    dividend_freq: "年配息 (10月除息)",
    aum: "約 3 億 TWD",
    dividend_yield_est: 2.8,
    focus_points: [
      "台股唯一直接追蹤「加權股價指數(^TWII)」的原型 ETF，涵蓋上市全市場權值與中小型股。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 36.8 },
      { symbol: "2317", name: "鴻海", weight: 4.2 },
      { symbol: "2454", name: "聯發科", weight: 3.5 },
      { symbol: "2382", name: "廣達", weight: 1.7 },
      { symbol: "2881", name: "富邦金", weight: 1.5 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 46.5 },
      { sector: "電腦週邊與電子零組件", weight: 24.5 },
      { sector: "金融保險與傳產", weight: 29.0 },
    ],
  },
  "00934": {
    name: "中信成長高股息",
    issuer: "中國信託投信",
    category: "月配高股息成長型 ETF",
    tracking_index: "臺灣指數公司特選臺灣上市上櫃優選成長高股息指數",
    expense_ratio: "0.38%",
    dividend_freq: "月配息",
    aum: "約 310 億 TWD",
    dividend_yield_est: 6.8,
    focus_points: [
      "每年 4 月（除權息旺季鎖定高股息）與 9 月（除息後切換高成長動能）兩階段換股。",
    ],
    holdings: [
      { symbol: "2454", name: "聯發科", weight: 8.6 },
      { symbol: "3034", name: "聯詠", weight: 7.4 },
      { symbol: "2303", name: "聯電", weight: 6.9 },
      { symbol: "2891", name: "中信金", weight: 6.1 },
      { symbol: "2357", name: "華碩", weight: 5.2 },
      { symbol: "2379", name: "瑞昱", weight: 4.8 },
    ],
    sector_weights: [
      { sector: "半導體與 IC 設計", weight: 45.0 },
      { sector: "電子硬體與通路", weight: 31.0 },
      { sector: "金融與傳產", weight: 24.0 },
    ],
  },
  "00936": {
    name: "台新永續高息中小",
    issuer: "台新投信",
    category: "中小型月配高股息 ETF",
    tracking_index: "臺灣指數公司特選臺灣上市上櫃永續高息中小型股指數",
    expense_ratio: "0.43%",
    dividend_freq: "月配息",
    aum: "約 195 億 TWD",
    dividend_yield_est: 6.4,
    focus_points: [
      "排除市值前 50 大權值股，專門鎖定市值排名 51 名以後具高 ROE 與高殖利率的中小型潛力股，與 0056/00878 持股重疊度極低。",
    ],
    holdings: [
      { symbol: "2404", name: "漢唐", weight: 4.5 },
      { symbol: "6176", name: "瑞儀", weight: 4.2 },
      { symbol: "2886", name: "兆豐金 / 群益證等中型高息股", weight: 4.0 },
      { symbol: "3702", name: "大聯大", weight: 3.9 },
    ],
    sector_weights: [
      { sector: "中小型電子零組件與設備", weight: 52.0 },
      { sector: "半導體封測與通路", weight: 25.0 },
      { sector: "營建、航空與內需傳產", weight: 23.0 },
    ],
  },
  "00946": {
    name: "群益科技高息成長",
    issuer: "群益投信",
    category: "科技月配高股息 ETF",
    tracking_index: "臺灣指數公司特選臺灣上市上櫃科技高息成長指數",
    expense_ratio: "0.33%",
    dividend_freq: "月配息",
    aum: "約 140 億 TWD",
    dividend_yield_est: 6.6,
    focus_points: [
      "被稱為「科技版 00919」，首創納入「外資認同度（外資持股比例）」作為選股因子，精選 50 檔台灣科技高息股。",
    ],
    holdings: [
      { symbol: "2454", name: "聯發科", weight: 9.8 },
      { symbol: "3034", name: "聯詠", weight: 8.9 },
      { symbol: "2303", name: "聯電", weight: 8.5 },
      { symbol: "3711", name: "日月光投控", weight: 7.2 },
      { symbol: "2379", name: "瑞昱", weight: 6.1 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 56.0 },
      { sector: "電子通路與電腦週邊", weight: 28.0 },
      { sector: "電子零組件", weight: 16.0 },
    ],
  },
  "00944": {
    name: "野村趨勢動能高息",
    issuer: "野村投信",
    category: "動能與高股息雙因子月配 ETF",
    tracking_index: "臺灣指數公司特選臺灣上市上櫃趨勢動能高息指數",
    expense_ratio: "0.43%",
    dividend_freq: "月配息",
    aum: "約 35 億 TWD",
    dividend_yield_est: 6.2,
    focus_points: [
      "獨創「還原股價動能（距離 52 週高點越近分數越高）」結合「預估股利率」雙指標篩選 50 檔強勢高息股，單一持股權重不超過 3%。",
    ],
    holdings: [
      { symbol: "2891", name: "中信金", weight: 3.1 },
      { symbol: "2303", name: "聯電", weight: 2.9 },
      { symbol: "2412", name: "中華電", weight: 2.8 },
      { symbol: "2603", name: "長榮", weight: 2.8 },
      { symbol: "3034", name: "聯詠", weight: 2.7 },
    ],
    sector_weights: [
      { sector: "電子與半導體", weight: 48.0 },
      { sector: "金融保險", weight: 26.0 },
      { sector: "航運與非電傳產", weight: 26.0 },
    ],
  },
  "00943": {
    name: "兆豐電子高息等權",
    issuer: "兆豐投信",
    category: "等權重電子月配高息 ETF",
    tracking_index: "臺灣指數公司特選臺灣上市上櫃電子成長高息等權重指數",
    expense_ratio: "0.45%",
    dividend_freq: "月配息",
    aum: "約 25 億 TWD",
    dividend_yield_est: 6.0,
    focus_points: [
      "採用「等權重（每檔約 2%）」配置 50 檔台灣高息電子股，定期再平衡自動逢高獲利了結、逢低加碼。",
    ],
    holdings: [
      { symbol: "2357", name: "華碩", weight: 2.3 },
      { symbol: "2404", name: "漢唐", weight: 2.2 },
      { symbol: "3034", name: "聯詠", weight: 2.1 },
      { symbol: "2379", name: "瑞昱", weight: 2.1 },
      { symbol: "2303", name: "聯電", weight: 2.0 },
    ],
    sector_weights: [
      { sector: "半導體與 IC 設計", weight: 40.0 },
      { sector: "電腦週邊與零組件", weight: 42.0 },
      { sector: "網通與光電通路", weight: 18.0 },
    ],
  },
  "00701": {
    name: "國泰股利精選30",
    issuer: "國泰投信",
    category: "低波金融傳產高股息 ETF",
    tracking_index: "臺灣指數公司低波動股利精選30指數",
    expense_ratio: "0.45%",
    dividend_freq: "半年配 (1月、8月除息)",
    aum: "約 58 億 TWD",
    dividend_yield_est: 5.5,
    focus_points: [
      "金融股與電信民生權重合計超過 65%，在科技股震盪時具備極佳的抗跌防禦力。",
    ],
    holdings: [
      { symbol: "2891", name: "中信金", weight: 11.5 },
      { symbol: "2412", name: "中華電", weight: 9.8 },
      { symbol: "2886", name: "兆豐金", weight: 8.6 },
      { symbol: "2884", name: "玉山金", weight: 7.4 },
      { symbol: "1216", name: "統一", weight: 6.2 },
    ],
    sector_weights: [
      { sector: "金融保險", weight: 58.0 },
      { sector: "電信與民生食品", weight: 24.0 },
      { sector: "穩健型電子股", weight: 18.0 },
    ],
  },
  "00730": {
    name: "富邦臺灣優質高息",
    issuer: "富邦投信",
    category: "價值品質型高股息 ETF",
    tracking_index: "道瓊斯台灣優質高股息30指數",
    expense_ratio: "0.45%",
    dividend_freq: "年配息 (10月除息)",
    aum: "約 32 億 TWD",
    dividend_yield_est: 5.4,
    focus_points: [
      "以自由現金流收益率、ROE 與股息殖利率篩選 30 檔台灣優質高息企業。",
    ],
    holdings: [
      { symbol: "2454", name: "聯發科", weight: 9.5 },
      { symbol: "3034", name: "聯詠", weight: 8.2 },
      { symbol: "2303", name: "聯電", weight: 7.8 },
      { symbol: "1216", name: "統一", weight: 6.5 },
    ],
    sector_weights: [
      { sector: "電子與半導體", weight: 65.0 },
      { sector: "傳統產業與消費", weight: 35.0 },
    ],
  },
  "00731": {
    name: "復華富時高息低波",
    issuer: "復華投信",
    category: "季配高股息低波動 ETF",
    tracking_index: "富時台灣高股息低波動指數",
    expense_ratio: "0.45%",
    dividend_freq: "季配息 (3、6、9、12月除息)",
    aum: "約 62 億 TWD",
    dividend_yield_est: 6.3,
    focus_points: [
      "從市值前 150 大企業中先選高股息 60 檔、再取波動度最低 40 檔，重倉中信金、中華電、聯電、富邦金。",
    ],
    holdings: [
      { symbol: "2891", name: "中信金", weight: 10.4 },
      { symbol: "2412", name: "中華電", weight: 9.2 },
      { symbol: "2303", name: "聯電", weight: 8.5 },
      { symbol: "2881", name: "富邦金", weight: 7.8 },
      { symbol: "3034", name: "聯詠", weight: 6.4 },
    ],
    sector_weights: [
      { sector: "金融保險", weight: 38.0 },
      { sector: "半導體與低波電子", weight: 40.0 },
      { sector: "電信與民生傳產", weight: 22.0 },
    ],
  },
  "00907": {
    name: "永豐優息存股",
    issuer: "永豐投信",
    category: "非電子（金融+傳產）雙月配 ETF",
    tracking_index: "臺灣指數公司特選臺灣優息存股指數",
    expense_ratio: "0.42%",
    dividend_freq: "雙月配 (2、4、6、8、10、12月除息)",
    aum: "約 48 億 TWD",
    dividend_yield_est: 5.6,
    focus_points: [
      "全台唯一「完全排除電子股」、100% 鎖定金融股與傳統產業（航運、食品、塑化）的雙月配息存股 ETF。",
    ],
    holdings: [
      { symbol: "2603", name: "長榮", weight: 9.5 },
      { symbol: "2891", name: "中信金", weight: 8.2 },
      { symbol: "1216", name: "統一", weight: 7.6 },
      { symbol: "2886", name: "兆豐金", weight: 6.8 },
      { symbol: "2884", name: "玉山金", weight: 6.4 },
    ],
    sector_weights: [
      { sector: "金融保險", weight: 55.0 },
      { sector: "航運、食品與民生傳產", weight: 45.0 },
    ],
  },
  "0053": {
    name: "元大電子",
    issuer: "元大投信",
    category: "台灣電子科技市值型 ETF",
    tracking_index: "臺灣證券交易所電子類發行量加權股價指數",
    expense_ratio: "0.45%",
    dividend_freq: "年配息 (11月除息)",
    aum: "約 12 億 TWD",
    dividend_yield_est: 2.6,
    focus_points: [
      "直接追蹤台股上市「電子類股指數」，台積電權重約 48%，涵蓋全體上市電子與半導體族群。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 48.5 },
      { symbol: "2317", name: "鴻海", weight: 6.4 },
      { symbol: "2454", name: "聯發科", weight: 5.2 },
      { symbol: "2382", name: "廣達", weight: 2.6 },
      { symbol: "2308", name: "台達電", weight: 2.2 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 64.0 },
      { sector: "電腦及AI伺服器", weight: 20.0 },
      { sector: "電子零組件與網通", weight: 16.0 },
    ],
  },
  "00735": {
    name: "國泰臺韓科技",
    issuer: "國泰投信",
    category: "台韓跨國半導體科技 ETF",
    tracking_index: "臺韓資訊科技指數 (ITP)",
    expense_ratio: "0.65%",
    dividend_freq: "半年配 (1月、7月除息)",
    aum: "約 25 億 TWD",
    dividend_yield_est: 2.2,
    focus_points: [
      "同時重倉「台灣晶圓代工龍頭（台積電）」與「韓國 HBM 記憶體雙雄（三星電子、SK海力士）」，一次掌握 AI 晶片與 HBM 記憶體。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 32.5 },
      { symbol: "MU", name: "Samsung Electronics (三星電子)", weight: 18.2 },
      { symbol: "NVDA", name: "SK Hynix (SK海力士 HBM龍頭)", weight: 11.4 },
      { symbol: "2317", name: "鴻海", weight: 6.5 },
      { symbol: "2454", name: "聯發科", weight: 5.8 },
    ],
    sector_weights: [
      { sector: "台灣半導體與AI伺服器", weight: 62.0 },
      { sector: "韓國 HBM 高頻寬記憶體與科技龍頭", weight: 38.0 },
    ],
  },
  "00894": {
    name: "中信小資高價30",
    issuer: "中國信託投信",
    category: "台股千金與高價成長股 ETF",
    tracking_index: "臺灣指數公司特選小資高價30指數",
    expense_ratio: "0.49%",
    dividend_freq: "季配息 (2、5、8、11月除息)",
    aum: "約 38 億 TWD",
    dividend_yield_est: 3.2,
    focus_points: [
      "專挑台股股價最高、獲利能力最強的 30 檔高價股與千金股（台積電、聯發科、世芯-KY、信驊、大立光、奇鋐），讓小資族用一張 ETF 參與千金股行情。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 28.5 },
      { symbol: "2454", name: "聯發科", weight: 11.2 },
      { symbol: "3661", name: "世芯-KY", weight: 5.8 },
      { symbol: "2382", name: "廣達", weight: 5.4 },
      { symbol: "3017", name: "奇鋐", weight: 4.9 },
      { symbol: "3008", name: "大立光", weight: 4.5 },
    ],
    sector_weights: [
      { sector: "晶圓代工與千金 IC 設計", weight: 65.0 },
      { sector: "AI 散熱、伺服器與光學鏡頭", weight: 35.0 },
    ],
  },
  "00935": {
    name: "野村臺灣新科技50",
    issuer: "野村投信",
    category: "台灣研發創新科技型 ETF",
    tracking_index: "臺灣指數公司特選臺灣上市上櫃FactSet創新科技50指數",
    expense_ratio: "0.48%",
    dividend_freq: "半年配 (3月、9月除息)",
    aum: "約 110 億 TWD",
    dividend_yield_est: 3.5,
    focus_points: [
      "以「研發費用佔營收比重」作為核心篩選條件，鎖定台積電、聯發科、台達電等高研發護城河科技龍頭。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 31.2 },
      { symbol: "2454", name: "聯發科", weight: 13.8 },
      { symbol: "2308", name: "台達電", weight: 6.5 },
      { symbol: "3034", name: "聯詠", weight: 5.2 },
      { symbol: "2303", name: "聯電", weight: 4.8 },
      { symbol: "3711", name: "日月光投控", weight: 4.6 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 74.0 },
      { sector: "AI 電源與電子零組件", weight: 26.0 },
    ],
  },
  "00911": {
    name: "兆豐洲際半導體",
    issuer: "兆豐投信",
    category: "海外美股半導體 ETF",
    tracking_index: "ICE 半導體指數 (與美股 SOXX 同指數)",
    expense_ratio: "0.85%",
    dividend_freq: "不配息",
    aum: "約 18 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "追蹤與美股 SOXX 相同的 ICE 半導體指數，重倉博通、輝達、AMD、高通與台積電 ADR，不配息。",
    ],
    holdings: [
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 9.8 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 8.9 },
      { symbol: "AMD", name: "Advanced Micro Devices", weight: 7.6 },
      { symbol: "QCOM", name: "Qualcomm Inc.", weight: 6.4 },
      { symbol: "TSM", name: "Taiwan Semiconductor (ADR)", weight: 4.4 },
    ],
    sector_weights: [
      { sector: "美國與全球半導體巨頭", weight: 100.0 },
    ],
  },
  "00696B": {
    name: "富邦美債20年",
    issuer: "富邦投信",
    category: "長天期美國公債 ETF",
    tracking_index: "花旗美國政府債券20年期以上指數",
    expense_ratio: "0.18%",
    dividend_freq: "季配息 (2、5、8、11月除息)",
    aum: "約 620 億 TWD",
    dividend_yield_est: 4.35,
    focus_points: [
      "持有到期日 20 年以上之美國財政部公債，存續期間約 16.5 年，直接受美債殖利率(^TYX)與匯率驅動。",
    ],
    holdings: [
      { symbol: "^TYX", name: "美國財政部 20+ 年期公債組合", weight: 99.3 },
    ],
    sector_weights: [
      { sector: "美國政府長天期公債", weight: 99.3 },
      { sector: "美元流動資產", weight: 0.7 },
    ],
  },
  "00764B": {
    name: "群益25年美債",
    issuer: "群益投信",
    category: "超長天期美國公債 ETF",
    tracking_index: "ICE 25年期以上美國政府債券指數",
    expense_ratio: "0.18%",
    dividend_freq: "季配息 (3、6、9、12月除息)",
    aum: "約 480 億 TWD",
    dividend_yield_est: 4.3,
    focus_points: [
      "鎖定 25 年期以上超長天期美債，存續期間約 17.5 年，對降息資本利得的敏感度比一般 20 年美債更高。",
    ],
    holdings: [
      { symbol: "^TYX", name: "美國財政部 25+ 年期公債組合", weight: 99.4 },
    ],
    sector_weights: [
      { sector: "美國政府 25 年以上超長天期公債", weight: 99.4 },
      { sector: "現金部位", weight: 0.6 },
    ],
  },
  "00795B": {
    name: "中信美國公債20年",
    issuer: "中國信託投信",
    category: "長天期美國公債 ETF",
    tracking_index: "彭博 20 年期以上美國公債指數",
    expense_ratio: "0.18%",
    dividend_freq: "季配息 (1、4、7、10月除息)",
    aum: "約 650 億 TWD",
    dividend_yield_est: 4.35,
    focus_points: [
      "季配息月份為 1、4、7、10 月，可與 00679B(2/5/8/11) 及 00687B(3/6/9/12) 組合成月月領息美債組合。",
    ],
    holdings: [
      { symbol: "^TYX", name: "美國財政部 20+ 年期公債組合", weight: 99.3 },
    ],
    sector_weights: [
      { sector: "美國政府長天期公債", weight: 99.3 },
      { sector: "美元流動資產", weight: 0.7 },
    ],
  },
  "00725B": {
    name: "國泰投資級公司債",
    issuer: "國泰投信",
    category: "長天期 BBB 級投資等級公司債 ETF",
    tracking_index: "彭博10年期以上BBB美元息收公司債指數",
    expense_ratio: "0.28%",
    dividend_freq: "季配息 (1、4、7、10月除息)",
    aum: "約 1,280 億 TWD",
    dividend_yield_est: 5.9,
    focus_points: [
      "鎖定票面利率 > 4.5% 之 10 年期以上 BBB 級投資等級美元公司債，排除次順位債，兼顧高息收與信評品質。",
    ],
    holdings: [
      { symbol: "LQD", name: "10+ 年期 BBB 級大型企業美元公司債組合", weight: 99.0 },
    ],
    sector_weights: [
      { sector: "BBB 級跨國企業公司債", weight: 99.0 },
      { sector: "美元現金部位", weight: 1.0 },
    ],
  },
  "00948B": {
    name: "中信優息投資級債",
    issuer: "中國信託投信",
    category: "月配長天期投資等級公司債 ETF",
    tracking_index: "ICE 15年期以上已開發市場投資級優息美元公司債指數",
    expense_ratio: "0.26%",
    dividend_freq: "月配息",
    aum: "約 580 億 TWD",
    dividend_yield_est: 6.0,
    focus_points: [
      "台灣首檔 10 元發行之月配息 15 年以上投資級公司債 ETF，透過殖利率加權提高整體票息收益。",
    ],
    holdings: [
      { symbol: "LQD", name: "15+ 年期已開發市場投資等級高息公司債組合", weight: 99.0 },
    ],
    sector_weights: [
      { sector: "已開發國家 BBB/A 級企業長債", weight: 99.0 },
      { sector: "美元流動準備", weight: 1.0 },
    ],
  },
  "00953B": {
    name: "群益優選非投等債",
    issuer: "群益投信",
    category: "月配非投資等級高收益公司債 ETF",
    tracking_index: "ICE 1-5年BB-B級成熟市場信用優息美元非投資等級債指數",
    expense_ratio: "0.45%",
    dividend_freq: "月配息",
    aum: "約 420 億 TWD",
    dividend_yield_est: 7.8,
    focus_points: [
      "排除 CCC 級垃圾債，鎖定成熟市場 1～5 年短中期 BB～B 級高票息企業債，存續期間短、違約率受控且票息高達 7.5%+。",
    ],
    holdings: [
      { symbol: "HYG", name: "美國與成熟市場 BB~B 級高票息企業債組合", weight: 98.8 },
    ],
    sector_weights: [
      { sector: "成熟市場 BB~B 級短天期高收益企業債", weight: 98.8 },
      { sector: "美元流動準備", weight: 1.2 },
    ],
  },
  "00740B": {
    name: "富邦全球投等債",
    issuer: "富邦投信",
    category: "長天期 BBB 級投資等級公司債 ETF",
    tracking_index: "彭博美元計價全球投資等級公司債流動性指數",
    expense_ratio: "0.28%",
    dividend_freq: "季配息 (2、5、8、11月除息)",
    aum: "約 540 億 TWD",
    dividend_yield_est: 5.7,
    focus_points: [
      "聚焦全球大型企業發行之 10 年期以上美元投資等級公司債。",
    ],
    holdings: [
      { symbol: "LQD", name: "全球 10+ 年期美元投資等級公司債組合", weight: 99.0 },
    ],
    sector_weights: [
      { sector: "全球投資等級企業長債", weight: 99.0 },
      { sector: "現金部位", weight: 1.0 },
    ],
  },
  "00688L": {
    name: "國泰20年美債正2",
    issuer: "國泰投信",
    category: "美國長債 2 倍槓桿期貨 ETF",
    tracking_index: "彭博20年期以上美國公債單日正向2倍指數",
    expense_ratio: "0.88%",
    dividend_freq: "不配息（槓桿期貨型債券 ETF）",
    aum: "約 185 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "提供 20 年期美債單日正向 2 倍漲跌幅，完全不配息，僅適合明確降息波段操作。",
    ],
    holdings: [
      { symbol: "TLT", name: "美國長天期公債期貨與美債 ETF 部位 (200% 曝險)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "美國長天期公債 2 倍多頭期貨曝險", weight: 100.0 },
    ],
  },
  "00657": {
    name: "國泰日經225",
    issuer: "國泰投信",
    category: "海外日本股市 ETF",
    tracking_index: "日經 225 指數 (Nikkei 225 Index)",
    expense_ratio: "0.85%",
    dividend_freq: "年配息 (10月除息)",
    aum: "約 38 億 TWD",
    dividend_yield_est: 1.5,
    focus_points: [
      "直接追蹤日本最具代表性的「日經225指數(^N225)」，重倉東京威力科創、迅銷(Uniqlo)、愛德萬測試、軟銀與豐田。",
    ],
    holdings: [
      { symbol: "^N225", name: "Fast Retailing (迅銷) / 東京威力科創 / 愛德萬測試 / 軟銀集團", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "日本半導體設備與精密工業", weight: 42.0 },
      { sector: "日本消費零售與商社金融", weight: 58.0 },
    ],
  },
  "00951": {
    name: "台新日本半導體",
    issuer: "台新投信",
    category: "日本半導體產業型 ETF",
    tracking_index: "NYSE FactSet 日本半導體指數",
    expense_ratio: "0.88%",
    dividend_freq: "年配息 (10月除息)",
    aum: "約 45 億 TWD",
    dividend_yield_est: 1.2,
    focus_points: [
      "聚焦日本半導體復興核心供應鏈：設備巨頭（東京威力科創、愛德萬測試、Disco）與矽晶圓材料（信越化學、瑞薩電子）。",
    ],
    holdings: [
      { symbol: "^N225", name: "Tokyo Electron / 瑞薩電子 / Advantest (愛德萬測試) / Disco / 信越化學", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "日本晶圓製造與測試設備", weight: 62.0 },
      { sector: "日本車用晶片與半導體材料", weight: 38.0 },
    ],
  },
  "00752": {
    name: "中信中國50",
    issuer: "中國信託投信",
    category: "海外中國科技與大型股 ETF",
    tracking_index: "MSCI 中國外資自由投資50不含A及B股指數",
    expense_ratio: "0.90%",
    dividend_freq: "不配息",
    aum: "約 68 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "重倉香港與美國掛牌之中國網科與消費巨頭（騰訊、阿里巴巴、美團、拼多多、小米、建設銀行），不配息。",
    ],
    holdings: [
      { symbol: "FXI", name: "騰訊控股 / 阿里巴巴 / 美團 / 拼多多 / 小米集團", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "中國網路平台與電商巨頭", weight: 60.0 },
      { sector: "中國大型銀行與新能源車", weight: 40.0 },
    ],
  },
  "00637L": {
    name: "元大滬深300正2",
    issuer: "元大投信",
    category: "中國A股 2 倍槓桿期貨 ETF",
    tracking_index: "滬深300日報酬正向兩倍指數",
    expense_ratio: "1.15%",
    dividend_freq: "不配息（槓桿期貨型 ETF）",
    aum: "約 190 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "透過富時中國 A50 / 滬深 300 期貨提供陸股單日正向 2 倍報酬，完全不配息，波動極劇烈且受陸股救市政策驅動。",
    ],
    holdings: [
      { symbol: "FXI", name: "滬深300 / 中國A股期貨多頭部位 (200% 曝險)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "中國 A 股正向 2 倍期貨曝險", weight: 100.0 },
    ],
  },
  "00885": {
    name: "富邦越南",
    issuer: "富邦投信",
    category: "海外東協越南股市 ETF",
    tracking_index: "富時越南 30 指數 (FTSE Vietnam 30 Index)",
    expense_ratio: "1.12%",
    dividend_freq: "不配息",
    aum: "約 145 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "聚焦胡志明證券交易所前 30 大大型龍頭股（和發鋼鐵、Vingroup、外貿銀行、FPT科技），受惠全球供應鏈移轉東協，不配息。",
    ],
    holdings: [
      { symbol: "EEM", name: "Hoa Phat Group (和發鋼鐵) / Vingroup / Vietcombank / Vinhomes", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "越南金融銀行與地產基建", weight: 58.0 },
      { sector: "越南鋼鐵製造與消費零售", weight: 42.0 },
    ],
  },
  "00909": {
    name: "國泰數位支付服務",
    issuer: "國泰投信",
    category: "全球加密生態與數位支付 ETF",
    tracking_index: "Solactive 全球數位支付服務指數",
    expense_ratio: "0.95%",
    dividend_freq: "年配息 (10月除息)",
    aum: "約 52 億 TWD",
    dividend_yield_est: 1.5,
    focus_points: [
      "台股唯一重倉「加密貨幣交易所與持幣企業（MicroStrategy、Coinbase、Marathon、Riot）」及數位支付（Visa、Mastercard、Block）的主題 ETF，與比特幣(BTC-USD)高度連動。",
    ],
    holdings: [
      { symbol: "BTC-USD", name: "MicroStrategy / Coinbase Global / Marathon Digital (加密生態)", weight: 55.0 },
      { symbol: "V", name: "Visa / Mastercard / Block / PayPal (全球數位支付)", weight: 45.0 },
    ],
    sector_weights: [
      { sector: "加密貨幣交易所、比特幣持倉與礦企", weight: 55.0 },
      { sector: "Fintech 金融科技與跨國支付網路", weight: 45.0 },
    ],
  },
  "00715L": {
    name: "期街口布蘭特油正2",
    issuer: "街口投信",
    category: "國際原油 2 倍槓桿期貨 ETF",
    tracking_index: "標普高盛布蘭特原油日報酬正向兩倍ER指數",
    expense_ratio: "1.15%",
    dividend_freq: "不配息（槓桿期貨型商品 ETF）",
    aum: "約 65 億 TWD",
    dividend_yield_est: null,
    focus_points: [
      "透過 ICE 布蘭特原油期貨(BZ=F)提供單日正向 2 倍曝險，完全不配息，轉倉耗損與波動極高，僅適合短線地緣政治波段。",
    ],
    holdings: [
      { symbol: "BZ=F", name: "ICE 布蘭特原油期貨多頭部位 (200% 曝險)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "布蘭特原油期貨 2 倍多頭合約", weight: 100.0 },
    ],
  },
  "XLK": {
    name: "Technology Select Sector SPDR Fund",
    issuer: "State Street Global Advisors (道富)",
    category: "美股純科技板塊 ETF",
    tracking_index: "Technology Select Sector Index (S&P 500 科技板塊)",
    expense_ratio: "0.09%",
    dividend_freq: "季配息",
    aum: "$72B USD",
    dividend_yield_est: 0.65,
    focus_points: [
      "100% 純 S&P 500 科技板塊，Apple、NVIDIA、Microsoft 三大巨頭合計佔比逾 45%，加上博通、Salesforce、Oracle。",
    ],
    holdings: [
      { symbol: "AAPL", name: "Apple Inc.", weight: 15.2 },
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 14.8 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 14.1 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 5.4 },
      { symbol: "CRM", name: "Salesforce Inc.", weight: 3.1 },
    ],
    sector_weights: [
      { sector: "雲端軟體與作業系統", weight: 38.0 },
      { sector: "半導體與 AI 算力硬體", weight: 36.0 },
      { sector: "消費電子與企業 IT 服務", weight: 26.0 },
    ],
  },
  "ARKK": {
    name: "ARK Innovation ETF",
    issuer: "ARK Invest (方舟投資 / Cathie Wood)",
    category: "主動型破壞式創新科技 ETF",
    tracking_index: "主動式管理（無被動追蹤指數，聚焦 AI、自駕、基因、區塊鏈）",
    expense_ratio: "0.75%",
    dividend_freq: "不定期（通常無配息）",
    aum: "$6.2B USD",
    dividend_yield_est: null,
    focus_points: [
      "由木頭姐 Cathie Wood 主動操盤，高集中度押注 Tesla、Coinbase、Roku、Roblox、Palantir 等高 Beta 成長股。",
    ],
    holdings: [
      { symbol: "TSLA", name: "Tesla Inc.", weight: 14.5 },
      { symbol: "BTC-USD", name: "Coinbase Global (COIN)", weight: 9.8 },
      { symbol: "NFLX", name: "Roku Inc. / Roblox Corp.", weight: 8.6 },
      { symbol: "CRM", name: "Palantir Technologies (PLTR)", weight: 7.4 },
    ],
    sector_weights: [
      { sector: "AI 軟體、自駕車與機器人", weight: 48.0 },
      { sector: "區塊鏈金融與雲端娛樂", weight: 32.0 },
      { sector: "基因編輯與精準醫療", weight: 20.0 },
    ],
  },
  "HYG": {
    name: "iShares iBoxx $ High Yield Corporate Bond ETF",
    issuer: "BlackRock iShares (貝萊德)",
    category: "美國非投資等級（高收益）公司債 ETF",
    tracking_index: "Markit iBoxx USD Liquid High Yield Index",
    expense_ratio: "0.49%",
    dividend_freq: "月配息",
    aum: "$16.5B USD",
    dividend_yield_est: 5.95,
    focus_points: [
      "全球流動性最高的美國非投資等級債(高收益債) ETF，與美股風險偏好及信用利差(Credit Spread)高度連動。",
    ],
    holdings: [
      { symbol: "LQD", name: "U.S. High Yield BB/B Corporate Bonds Portfolio", weight: 99.2 },
    ],
    sector_weights: [
      { sector: "美國非投資等級企業債 (BB/B級為主)", weight: 99.2 },
      { sector: "Cash", weight: 0.8 },
    ],
  },
  "DIA": {
    name: "SPDR Dow Jones Industrial Average ETF Trust",
    issuer: "State Street Global Advisors (道富)",
    category: "美股道瓊 30 大藍籌價值型 ETF",
    tracking_index: "Dow Jones Industrial Average (道瓊工業平均指數)",
    expense_ratio: "0.16%",
    dividend_freq: "月配息",
    aum: "$38B USD",
    dividend_yield_est: 1.75,
    focus_points: [
      "追蹤美國 30 家最知名藍籌巨頭（聯合健康、高盛、微軟、家得寶、卡特彼勒、麥當勞），採「股價加權」且每月配息。",
    ],
    holdings: [
      { symbol: "UNH", name: "UnitedHealth Group", weight: 8.4 },
      { symbol: "GS", name: "Goldman Sachs Group", weight: 7.9 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 6.4 },
      { symbol: "HD", name: "Home Depot Inc.", weight: 5.8 },
      { symbol: "CAT", name: "Caterpillar Inc.", weight: 5.5 },
    ],
    sector_weights: [
      { sector: "Financials & Healthcare (金融與醫療藍籌)", weight: 42.0 },
      { sector: "Industrials & Consumer (工業製造與消費)", weight: 36.0 },
      { sector: "Technology (大型科技)", weight: 22.0 },
    ],
  },
  "IWM": {
    name: "iShares Russell 2000 ETF",
    issuer: "BlackRock iShares (貝萊德)",
    category: "美股羅素 2000 中小型股 ETF",
    tracking_index: "Russell 2000 Index (美國羅素2000小型股指數)",
    expense_ratio: "0.19%",
    dividend_freq: "季配息",
    aum: "$71B USD",
    dividend_yield_est: 1.35,
    focus_points: [
      "代表美國本土 2,000 家中小型內需企業，對聯準會降息循環、融資成本下降與美國製造業回流最為敏感。",
    ],
    holdings: [
      { symbol: "SPY", name: "美國 2,000 家中小型工業/金融/醫療/科技成長股組合", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "Industrials & Financials (區域銀行與工業)", weight: 36.0 },
      { sector: "Healthcare & Biotech (中小型醫療生技)", weight: 17.5 },
      { sector: "Technology & Consumer", weight: 46.5 },
    ],
  },
  "XLF": {
    name: "Financial Select Sector SPDR Fund",
    issuer: "State Street Global Advisors (道富)",
    category: "美股金融板塊 ETF",
    tracking_index: "Financial Select Sector Index (S&P 500 金融板塊)",
    expense_ratio: "0.09%",
    dividend_freq: "季配息",
    aum: "$46B USD",
    dividend_yield_est: 1.55,
    focus_points: [
      "囊括波克夏海瑟威、摩根大通、Visa、Mastercard、美國銀行、高盛等美國金融霸主。",
    ],
    holdings: [
      { symbol: "BRK-B", name: "Berkshire Hathaway", weight: 13.2 },
      { symbol: "JPM", name: "JPMorgan Chase & Co.", weight: 10.4 },
      { symbol: "V", name: "Visa Inc.", weight: 7.8 },
      { symbol: "MA", name: "Mastercard Inc.", weight: 6.6 },
      { symbol: "BAC", name: "Bank of America Corp.", weight: 4.5 },
    ],
    sector_weights: [
      { sector: "大型投資銀行與商業銀行", weight: 48.0 },
      { sector: "跨國支付與金融服務", weight: 32.0 },
      { sector: "保險與資產管理", weight: 20.0 },
    ],
  },
  "XLE": {
    name: "Energy Select Sector SPDR Fund",
    issuer: "State Street Global Advisors (道富)",
    category: "美股傳統能源與石油巨頭 ETF",
    tracking_index: "Energy Select Sector Index (S&P 500 能源板塊)",
    expense_ratio: "0.09%",
    dividend_freq: "季配息",
    aum: "$37B USD",
    dividend_yield_est: 3.35,
    focus_points: [
      "艾克森美孚(ExxonMobil)與雪佛龍(Chevron)兩大石油巨頭合計權重逼近 40%，與國際油價(CL=F)及地緣政治同步。",
    ],
    holdings: [
      { symbol: "XOM", name: "Exxon Mobil Corp.", weight: 23.5 },
      { symbol: "CVX", name: "Chevron Corp.", weight: 15.8 },
      { symbol: "COP", name: "ConocoPhillips", weight: 7.2 },
      { symbol: "WMB", name: "Williams Companies (天然氣管線)", weight: 4.5 },
      { symbol: "SLB", name: "Schlumberger N.V. (油服龍頭)", weight: 4.3 },
    ],
    sector_weights: [
      { sector: "整合型跨國石油與天然氣巨頭", weight: 62.0 },
      { sector: "能源管線運輸與油田設備服務", weight: 38.0 },
    ],
  },
  "XLV": {
    name: "Health Care Select Sector SPDR Fund",
    issuer: "State Street Global Advisors (道富)",
    category: "美股醫療保健與製藥巨頭 ETF",
    tracking_index: "Health Care Select Sector Index (S&P 500 醫療板塊)",
    expense_ratio: "0.09%",
    dividend_freq: "季配息",
    aum: "$40B USD",
    dividend_yield_est: 1.55,
    focus_points: [
      "重倉減肥藥霸主禮來(Eli Lilly)、聯合健康(UnitedHealth)、嬌生、艾伯維、默克藥廠，具剛性需求與抗衰退防禦力。",
    ],
    holdings: [
      { symbol: "LLY", name: "Eli Lilly & Co.", weight: 12.8 },
      { symbol: "UNH", name: "UnitedHealth Group", weight: 9.6 },
      { symbol: "JNJ", name: "Johnson & Johnson", weight: 7.1 },
      { symbol: "ABBV", name: "AbbVie Inc.", weight: 6.4 },
      { symbol: "MRK", name: "Merck & Co.", weight: 5.2 },
    ],
    sector_weights: [
      { sector: "大型創新製藥與生技", weight: 52.0 },
      { sector: "醫療設備器材與健康保險", weight: 48.0 },
    ],
  },
  "USO": {
    name: "United States Oil Fund LP",
    issuer: "USCF Investments",
    category: "美國原油期貨 ETF",
    tracking_index: "Benchmark Oil Futures Contract (WTI 西德州輕原油期貨)",
    expense_ratio: "0.60%",
    dividend_freq: "無配息（商品期貨型 ETF）",
    aum: "$1.4B USD",
    dividend_yield_est: null,
    focus_points: [
      "直接持有 NYMEX WTI 西德州原油近月與次月期貨合約(CL=F)，不配息。",
    ],
    holdings: [
      { symbol: "CL=F", name: "NYMEX WTI Crude Oil Futures Contracts", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "WTI 西德州原油期貨與美國國庫券擔保品", weight: 100.0 },
    ],
  },
  "DBA": {
    name: "Invesco DB Agriculture Fund",
    issuer: "Invesco (景順)",
    category: "全球農產品大宗商品期貨 ETF",
    tracking_index: "DBIQ Diversified Agriculture Index Excess Return",
    expense_ratio: "0.85%",
    dividend_freq: "年配息（視美國國庫券擔保利息而定）",
    aum: "$850M USD",
    dividend_yield_est: 3.2,
    focus_points: [
      "分散持有可可(Cocoa)、咖啡、活牛、玉米、黃豆、小麥、糖等 10 大農產品期貨合約，為對抗糧食通膨與極端氣候的代表工具。",
    ],
    holdings: [
      { symbol: "GC=F", name: "可可、咖啡、活牛、玉米、黃豆、小麥期貨組合", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "軟性商品期貨 (可可/咖啡/糖)", weight: 38.0 },
      { sector: "穀物與畜牧期貨 (玉米/黃豆/小麥/活牛)", weight: 62.0 },
    ],
  },
};

/**
 * 針對任何台美股 ETF 或跨資產標的，取得精準規格（杜絕把槓反/商品/海外/高息 ETF 誤標為台積電成分股或錯誤配息）
 */
export function resolveETFProfile(symbol: string, rawName?: string): ETFProfileSeed {
  const s = symbol.trim().toUpperCase();
  const code = s.replace(/\.(TW|TWO)$/i, "");
  if (ETF_CATALOG[code]) return ETF_CATALOG[code];
  if (ETF_CATALOG[s]) return ETF_CATALOG[s];

  const name = rawName || s;
  const isTw = /^\d/.test(code) || s.endsWith(".TW") || s.endsWith(".TWO");
  const issuer = isTw ? inferTwIssuer(name) : "國際資產管理機構";

  // 1. 加密貨幣現貨
  if (s.endsWith("-USD") || s.includes("BTC") || s.includes("ETH") || s.includes("SOL")) {
    return {
      name,
      issuer: "全球去中心化區塊鏈網路",
      category: "加密貨幣現貨資產",
      tracking_index: `${s} 全球美元現貨即時匯率`,
      expense_ratio: "0.00% (現貨無內扣管理費)",
      dividend_freq: "無配息 (24/7 全天候交易)",
      aum: "全球高流動性數位資產",
      dividend_yield_est: null,
      focus_points: [
        "受美國現貨 ETF (IBIT/FBTC/ETHA) 每日資金淨流入、全球美元流動性(M2)與聯準會利率預期高度驅動。",
        "年化波動率顯著高於傳統股票，建議搭配 20MA 乖離率與 K 線上下趨勢通道嚴設風控停損。",
      ],
      holdings: [
        { symbol: "IBIT", name: "iShares Bitcoin Trust (美股現貨ETF資金連動)", weight: 60.0 },
        { symbol: "QQQ", name: "Nasdaq-100 科技風險偏好連動因子", weight: 40.0 },
      ],
      sector_weights: [{ sector: "加密貨幣現貨部位", weight: 100.0 }],
    };
  }

  // 2. 期貨 / 外匯 / 全球指數
  if (s.endsWith("=F") || s.endsWith("=X") || s.startsWith("^") || s.includes("DX-Y")) {
    return {
      name,
      issuer: "國際金融交易所 / 全球宏觀基準",
      category: "全球跨資產 / 宏觀指標",
      tracking_index: `${name} (${s}) 國際基準報價`,
      expense_ratio: "無內扣費用 (基準指數/連續合約)",
      dividend_freq: "無配息 (價格指標型標的)",
      aum: "全球機構法人核心參考基準",
      dividend_yield_est: null,
      focus_points: [
        `${name} (${s}) 為跨市場資金流向與總體經濟定價的重要領先指標。`,
        "建議結合 K 線上下趨勢壓力/支撐線、月線(20MA)乖離率與年化波動度判讀多空轉折。",
      ],
      holdings: [],
      sector_weights: [
        { sector: "全球宏觀利率與匯率敏感因子", weight: 60.0 },
        { sector: "實體經濟供需與避險情緒因子", weight: 40.0 },
      ],
    };
  }

  // 3. 槓桿型 ETF (尾碼 L 或名稱含「正2」)
  if (code.endsWith("L") || name.includes("正2")) {
    return {
      name,
      issuer,
      category: "2倍槓桿型期貨 ETF",
      tracking_index: `${name.replace(/正2$/, "")} 單日正向 2 倍報酬指數`,
      expense_ratio: "0.80% ~ 1.15%",
      dividend_freq: "不配息（期貨轉倉與資本收益直接滾入淨值）",
      aum: "槓桿型期貨交易基金",
      dividend_yield_est: null,
      focus_points: [
        `${name} (${code}) 透過持有期貨合約達成「單日正向 2 倍」曝險，並非直接持有現股，且完全不配息。`,
        "具單日複利與波動耗損特性，操作上須嚴格搭配 20MA 均線與停損紀律。",
      ],
      holdings: [
        { symbol: "^TWII", name: `${name} 對應標的期貨多頭契約 (200% 曝險)`, weight: 100.0 },
      ],
      sector_weights: [{ sector: "期貨正向 200% 多頭部位與保證金", weight: 100.0 }],
    };
  }

  // 4. 反向型 ETF (尾碼 R 或名稱含「反1」)
  if (code.endsWith("R") || name.includes("反1")) {
    return {
      name,
      issuer,
      category: "1倍反向避險型期貨 ETF",
      tracking_index: `${name.replace(/反1$/, "")} 單日反向 1 倍報酬指數`,
      expense_ratio: "0.80% ~ 1.15%",
      dividend_freq: "不配息（反向期貨避險工具）",
      aum: "反向避險型期貨基金",
      dividend_yield_est: null,
      focus_points: [
        `${name} (${code}) 透過放空期貨合約提供單日反向 1 倍報酬，完全不配息，僅適合短線空頭避險，不宜長期持有。`,
      ],
      holdings: [
        { symbol: "^TWII", name: `${name} 對應標的期貨空頭契約 (-100% 曝險)`, weight: 100.0 },
      ],
      sector_weights: [{ sector: "期貨反向空頭部位 (-100%) 與保證金", weight: 100.0 }],
    };
  }

  // 5. 商品期貨型 ETF (尾碼 U 或名稱含黃金/白銀/石油/原油)
  if (code.endsWith("U") || name.includes("黃金") || name.includes("白銀") || name.includes("石油") || name.includes("原油")) {
    return {
      name,
      issuer,
      category: "大宗商品期貨型 ETF",
      tracking_index: `${name} 對應國際商品期貨超額回報指數`,
      expense_ratio: "1.00% ~ 1.15%",
      dividend_freq: "不配息（商品期貨型 ETF）",
      aum: "商品期貨交易基金",
      dividend_yield_est: null,
      focus_points: [
        `${name} (${code}) 透過持有國際商品期貨合約追蹤原物料價格，完全不配息，需留意期貨轉倉成本與美元匯率影響。`,
      ],
      holdings: [
        { symbol: name.includes("白銀") ? "SI=F" : name.includes("油") ? "CL=F" : "GC=F", name: `${name} 國際商品期貨近遠月合約`, weight: 100.0 },
      ],
      sector_weights: [{ sector: "國際大宗商品期貨合約與保證金", weight: 100.0 }],
    };
  }

  // 6. 債券型 ETF (尾碼 B 或名稱含債)
  if (code.endsWith("B") || name.includes("債")) {
    const isMonthly = ["00937B", "00933B", "00948B", "00953B", "00772B", "00773B"].includes(code) || name.includes("優息") || name.includes("月");
    const isCorp = name.includes("投等") || name.includes("公司") || name.includes("金融") || name.includes("非投等");
    return {
      name,
      issuer,
      category: isCorp ? "投資等級 / 企業公司債 ETF" : "美國政府公債 ETF",
      tracking_index: `${name} 對應美元債券指數`,
      expense_ratio: "0.18% ~ 0.30%",
      dividend_freq: isMonthly ? "月配息" : "季配息",
      aum: "固定收益債券基金",
      dividend_yield_est: isCorp ? 5.6 : 4.35,
      focus_points: [
        "債券價格與殖利率呈反向關係，核心觀察指標為美國 10 年期公債殖利率(^TNX)與聯準會利率路徑。",
        "台股掛牌之海外債券 ETF 採新台幣計價，需同步留意美元兌台幣匯率(TWD=X)波動與折溢價幅度。",
      ],
      holdings: [
        { symbol: isCorp ? "LQD" : "^TYX", name: isCorp ? `${name} 美元投資等級公司債組合` : `${name} 美國財政部公債組合`, weight: 99.0 },
        { symbol: "TWD=X", name: "美元流動性現金與應收利息", weight: 1.0 },
      ],
      sector_weights: [
        { sector: isCorp ? "美元跨國企業公司債 / 金融債" : "美國財政部主權公債", weight: 99.0 },
        { sector: "現金與流動準備", weight: 1.0 },
      ],
    };
  }

  // 7. 台股月配 / 季配高股息 ETF (名稱含「高息」、「優息」、「高股息」、「填息」、「存股」)
  if (name.includes("息") || name.includes("填息") || name.includes("存股")) {
    const isMonthly = ["00929", "00934", "00936", "00939", "00940", "00943", "00944", "00946", "00900"].includes(code);
    return {
      name,
      issuer,
      category: isMonthly ? "台股月配高股息型 ETF" : "台股季配高股息型 ETF",
      tracking_index: `臺灣指數公司特選 ${name} 指數`,
      expense_ratio: "0.38% ~ 0.45%",
      dividend_freq: isMonthly ? "月配息" : "季配息",
      aum: "台股高股息策略基金",
      dividend_yield_est: 6.5,
      focus_points: [
        `${name} (${code}) 依據現金股利殖利率、獲利品質(ROE)與流動性篩選台股高息成分股（高息型 ETF 通常不含低殖利率之台積電）。`,
        "建議關注除息前後之填息動能、收益平準金佔比，以及每年定審換股時的投信買賣超方向。",
      ],
      holdings: [
        { symbol: "2303", name: "聯電", weight: 6.8 },
        { symbol: "2454", name: "聯發科", weight: 6.2 },
        { symbol: "3034", name: "聯詠", weight: 5.8 },
        { symbol: "2891", name: "中信金", weight: 5.4 },
        { symbol: "2357", name: "華碩", weight: 4.9 },
        { symbol: "3711", name: "日月光投控", weight: 4.5 },
      ],
      sector_weights: [
        { sector: "半導體與高息 IC 設計", weight: 38.0 },
        { sector: "電腦週邊與電子通路", weight: 32.0 },
        { sector: "金融保險與航運傳產", weight: 30.0 },
      ],
    };
  }

  // 8. 海外跨國主題 ETF (日本/中國/越南/美國/全球/洲際/數位)
  if (
    name.includes("日本") ||
    name.includes("日經") ||
    name.includes("中國") ||
    name.includes("滬深") ||
    name.includes("越南") ||
    name.includes("美國") ||
    name.includes("S&P") ||
    name.includes("NASDAQ") ||
    name.includes("全球") ||
    name.includes("洲際") ||
    name.includes("數位")
  ) {
    return {
      name,
      issuer,
      category: "海外跨國股市主題型 ETF",
      tracking_index: `${name} 對應海外市場指數`,
      expense_ratio: "0.55% ~ 0.99%",
      dividend_freq: name.includes("高息") ? "半年配 / 季配息" : "不配息（海外資本利得滾入淨值）",
      aum: "跨國指數股票型基金",
      dividend_yield_est: name.includes("高息") ? 5.5 : null,
      focus_points: [
        `${name} (${code}) 投資於海外掛牌股票，無台股 10% 漲跌幅限制，操作時須特別注意盤中「折溢價幅度」與海外休市價差。`,
      ],
      holdings: [],
      sector_weights: [{ sector: `${name} 海外成分股組合`, weight: 100.0 }],
    };
  }

  // 9. 其他一般台美股 ETF
  return {
    name,
    issuer,
    category: isTw ? "台股主題 / 產業型 ETF" : "美股指數股票型基金 (ETF)",
    tracking_index: `${name} 追蹤標的指數`,
    expense_ratio: isTw ? "0.35% ~ 0.50%" : "0.09% ~ 0.35%",
    dividend_freq: "半年配 / 季配息",
    aum: "交易所掛牌指數基金",
    dividend_yield_est: isTw ? 3.5 : 1.5,
    focus_points: [
      `追蹤 ${name} (${symbol}) 一籃子成分股組合之整體淨值表現與均線趨勢。`,
      "操作上建議觀察 20MA 月線乖離率，避免於大幅溢價或短線乖離過大時追高。",
    ],
    holdings: [],
    sector_weights: [{ sector: `${name} 核心成分股組合`, weight: 100.0 }],
  };
}

/**
 * 判斷標的是否為 ETF 或跨資產宏觀標的（非一般單一公司股票）
 */
export function isETFOrMacroAsset(symbol: string): boolean {
  const s = symbol.trim().toUpperCase();
  const code = s.replace(/\.(TW|TWO)$/i, "");
  if (code.startsWith("00")) return true;
  if (ETF_CATALOG[code] || ETF_CATALOG[s]) return true;
  if (s.startsWith("^") || s.endsWith("=F") || s.endsWith("=X") || s.endsWith("-USD") || s.includes("DX-Y")) return true;
  return false;
}

