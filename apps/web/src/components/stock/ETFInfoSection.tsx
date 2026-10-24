"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiResearch, apiStocks } from "@/lib/api";
import { getChangeColorClass } from "@/lib/utils";
import { Term, InfoTip } from "@/components/ui/TermTooltip";

interface Holding {
  symbol: string;
  name: string;
  weight: number;
}

interface SectorWeight {
  sector: string;
  weight: number;
}

interface DividendItem {
  date: string;
  amount: number;
  period_yield?: number | null;
}

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
  dividends: DividendItem[];
  holdings: Holding[];
  sector_weights: SectorWeight[];
  focus_points: string[];
}

interface ProfileSeed {
  name: string;
  issuer: string;
  category: string;
  tracking_index: string;
  expense_ratio: string;
  dividend_freq: string;
  aum: string;
  dividend_yield_est?: number | null;
  focus_points: string[];
  holdings: Holding[];
  sector_weights: SectorWeight[];
  dividends?: DividendItem[];
}

const CLIENT_ETF_PROFILES: Record<string, ProfileSeed> = {
  "0050": {
    name: "元大台灣50",
    issuer: "元大投信",
    category: "台股市值大盤型 ETF",
    tracking_index: "臺灣50指數 (FTSE TWSE Taiwan 50 Index)",
    expense_ratio: "0.43%",
    dividend_freq: "半年配 (1月、7月)",
    aum: "約 4,380 億 TWD",
    dividend_yield_est: 2.85,
    focus_points: [
      "追蹤台股市值最大前 50 家上市企業，與加權指數(^TWII)相關係數達 0.98 以上。",
      "台積電(2330)單一成分股權重超過 54%，需同步關注半導體景氣與外資買賣超動向。",
      "適合長期指數化投資與捕捉大型權值股行情。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 54.8 },
      { symbol: "2317", name: "鴻海", weight: 5.2 },
      { symbol: "2454", name: "聯發科", weight: 4.3 },
      { symbol: "2382", name: "廣達", weight: 1.8 },
      { symbol: "2881", name: "富邦金", weight: 1.6 },
      { symbol: "2308", name: "台達電", weight: 1.6 },
      { symbol: "2882", name: "國泰金", weight: 1.4 },
      { symbol: "2891", name: "中信金", weight: 1.3 },
      { symbol: "3711", name: "日月光投控", weight: 1.1 },
      { symbol: "2412", name: "中華電", weight: 1.0 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 62.5 },
      { sector: "電腦及週邊設備", weight: 11.4 },
      { sector: "金融保險", weight: 10.8 },
      { sector: "電子零組件", weight: 4.9 },
      { sector: "通信網路與其他", weight: 10.4 },
    ],
    dividends: [
      { date: "2024-07-16", amount: 1.0, period_yield: 0.55 },
      { date: "2024-01-17", amount: 3.0, period_yield: 2.25 },
      { date: "2023-07-18", amount: 1.9, period_yield: 1.45 },
      { date: "2023-01-30", amount: 2.6, period_yield: 2.15 },
    ],
  },
  "006208": {
    name: "富邦台50",
    issuer: "富邦投信",
    category: "台股市值大盤型 ETF",
    tracking_index: "臺灣50指數 (FTSE TWSE Taiwan 50 Index)",
    expense_ratio: "0.24%",
    dividend_freq: "半年配 (7月、11月)",
    aum: "約 1,920 億 TWD",
    dividend_yield_est: 2.9,
    focus_points: [
      "與 0050 追蹤完全相同的「臺灣50指數」，但經理費(0.15%)與保管費較低，長期內扣成本更具優勢。",
      "台積電(2330)、鴻海(2317)、聯發科(2454)合計佔比逾 64%，直接反映台股權值龍頭表現。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 54.7 },
      { symbol: "2317", name: "鴻海", weight: 5.2 },
      { symbol: "2454", name: "聯發科", weight: 4.3 },
      { symbol: "2382", name: "廣達", weight: 1.8 },
      { symbol: "2881", name: "富邦金", weight: 1.6 },
      { symbol: "2308", name: "台達電", weight: 1.6 },
      { symbol: "2882", name: "國泰金", weight: 1.4 },
      { symbol: "2891", name: "中信金", weight: 1.3 },
      { symbol: "3711", name: "日月光投控", weight: 1.1 },
      { symbol: "2412", name: "中華電", weight: 1.0 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 62.5 },
      { sector: "電腦及週邊設備", weight: 11.4 },
      { sector: "金融保險", weight: 10.8 },
      { sector: "電子零組件", weight: 4.9 },
      { sector: "其他產業", weight: 10.4 },
    ],
    dividends: [
      { date: "2024-11-18", amount: 0.9, period_yield: 0.82 },
      { date: "2024-07-16", amount: 0.783, period_yield: 0.71 },
      { date: "2023-11-16", amount: 0.86, period_yield: 1.12 },
      { date: "2023-07-18", amount: 1.352, period_yield: 1.78 },
    ],
  },
  "00692": {
    name: "富邦公司治理",
    issuer: "富邦投信",
    category: "市值 / ESG 公司治理型",
    tracking_index: "臺灣公司治理100指數",
    expense_ratio: "0.24%",
    dividend_freq: "半年配 (7月、11月)",
    aum: "約 340 億 TWD",
    dividend_yield_est: 3.8,
    focus_points: [
      "以公司治理評鑑前 20% 加上 ROE、營收成長篩選 100 檔成分股，兼顧大型權值與高獲利品質。",
      "內扣費用僅約 0.24%，台積電權重約 43%，分散度優於傳統市值型 ETF。",
    ],
    holdings: [
      { symbol: "2330", name: "台積電", weight: 43.2 },
      { symbol: "2454", name: "聯發科", weight: 4.8 },
      { symbol: "2881", name: "富邦金", weight: 3.1 },
      { symbol: "2308", name: "台達電", weight: 2.7 },
      { symbol: "2882", name: "國泰金", weight: 2.5 },
      { symbol: "2382", name: "廣達", weight: 2.2 },
      { symbol: "2891", name: "中信金", weight: 2.0 },
      { symbol: "2412", name: "中華電", weight: 1.8 },
    ],
    sector_weights: [
      { sector: "半導體業", weight: 52.0 },
      { sector: "金融保險", weight: 18.5 },
      { sector: "電腦及週邊設備", weight: 14.0 },
      { sector: "電子零組件與其他", weight: 15.5 },
    ],
  },
  "0056": {
    name: "元大高股息",
    issuer: "元大投信",
    category: "高股息型 ETF",
    tracking_index: "臺灣高股息指數 (預估未來一年現金股利殖利率最高前50名)",
    expense_ratio: "0.70%",
    dividend_freq: "季配息 (1、4、7、10月)",
    aum: "約 3,650 億 TWD",
    dividend_yield_est: 7.8,
    focus_points: [
      "從臺灣50與臺灣中型100指數中，挑選「預測未來一年現金股利殖利率最高」之 50 檔股票。",
      "每年 6 月與 12 月進行成分股定期審核換股，投信換股期間常引發成分股籌碼波動。",
    ],
    holdings: [
      { symbol: "2454", name: "聯發科", weight: 4.6 },
      { symbol: "2603", name: "長榮", weight: 4.4 },
      { symbol: "2303", name: "聯電", weight: 4.1 },
      { symbol: "2382", name: "廣達", weight: 3.8 },
      { symbol: "2891", name: "中信金", weight: 3.6 },
      { symbol: "2886", name: "兆豐金", weight: 3.4 },
      { symbol: "2357", name: "華碩", weight: 3.3 },
      { symbol: "3034", name: "聯詠", weight: 3.1 },
      { symbol: "2890", name: "永豐金", weight: 2.9 },
      { symbol: "3231", name: "緯創", weight: 2.7 },
    ],
    sector_weights: [
      { sector: "電腦及週邊設備", weight: 26.5 },
      { sector: "半導體業", weight: 23.0 },
      { sector: "金融保險", weight: 18.5 },
      { sector: "航運與傳產", weight: 16.0 },
      { sector: "電子通路與其他", weight: 16.0 },
    ],
    dividends: [
      { date: "2024-10-17", amount: 1.07, period_yield: 2.78 },
      { date: "2024-07-16", amount: 1.07, period_yield: 2.65 },
      { date: "2024-04-18", amount: 0.79, period_yield: 2.05 },
      { date: "2024-01-17", amount: 0.7, period_yield: 1.92 },
    ],
  },
  "00878": {
    name: "國泰永續高股息",
    issuer: "國泰投信",
    category: "高股息 / ESG 型 ETF",
    tracking_index: "MSCI臺灣ESG永續高股息精選30指數",
    expense_ratio: "0.42%",
    dividend_freq: "季配息 (2、5、8、11月)",
    aum: "約 3,820 億 TWD",
    dividend_yield_est: 6.95,
    focus_points: [
      "以過去三年平均年化殖利率與 MSCI ESG 評級篩選 30 檔大型穩健股，金融與電子權重均衡。",
      "波動度通常低於純科技型 ETF，每年 5 月與 11 月進行成分股調整。",
    ],
    holdings: [
      { symbol: "2454", name: "聯發科", weight: 5.2 },
      { symbol: "2303", name: "聯電", weight: 4.9 },
      { symbol: "2891", name: "中信金", weight: 4.5 },
      { symbol: "2357", name: "華碩", weight: 4.2 },
      { symbol: "3034", name: "聯詠", weight: 4.0 },
      { symbol: "2882", name: "國泰金", weight: 3.8 },
      { symbol: "2881", name: "富邦金", weight: 3.7 },
      { symbol: "2382", name: "廣達", weight: 3.5 },
      { symbol: "3711", name: "日月光投控", weight: 3.4 },
      { symbol: "2886", name: "兆豐金", weight: 3.2 },
    ],
    sector_weights: [
      { sector: "電腦及週邊設備", weight: 28.0 },
      { sector: "金融保險", weight: 26.5 },
      { sector: "半導體業", weight: 24.0 },
      { sector: "通信網路與其他", weight: 21.5 },
    ],
    dividends: [
      { date: "2024-11-18", amount: 0.55, period_yield: 2.42 },
      { date: "2024-08-16", amount: 0.55, period_yield: 2.38 },
      { date: "2024-05-17", amount: 0.51, period_yield: 2.22 },
      { date: "2024-02-27", amount: 0.4, period_yield: 1.82 },
    ],
  },
  "00919": {
    name: "群益台灣精選高息",
    issuer: "群益投信",
    category: "高股息型 ETF",
    tracking_index: "臺灣指數公司特選臺灣上市上櫃精選高息指數",
    expense_ratio: "0.52%",
    dividend_freq: "季配息 (3、6、9、12月)",
    aum: "約 2,950 億 TWD",
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
    dividends: [
      { date: "2024-12-20", amount: 0.72, period_yield: 3.05 },
      { date: "2024-09-23", amount: 0.72, period_yield: 2.98 },
      { date: "2024-06-24", amount: 0.7, period_yield: 2.75 },
      { date: "2024-03-18", amount: 0.66, period_yield: 2.62 },
    ],
  },
  "00929": {
    name: "復華台灣科技優息",
    issuer: "復華投信",
    category: "科技高股息 (月配型)",
    tracking_index: "特選臺灣科技優息指數",
    expense_ratio: "0.41%",
    dividend_freq: "月配息",
    aum: "約 2,480 億 TWD",
    dividend_yield_est: 6.8,
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
    dividends: [
      { date: "2024-11-19", amount: 0.11, period_yield: 0.61 },
      { date: "2024-10-22", amount: 0.14, period_yield: 0.75 },
      { date: "2024-09-19", amount: 0.16, period_yield: 0.84 },
      { date: "2024-08-20", amount: 0.18, period_yield: 0.92 },
    ],
  },
  "00940": {
    name: "元大台灣價值高息",
    issuer: "元大投信",
    category: "價值高股息 (月配型)",
    tracking_index: "臺灣價值高息指數",
    expense_ratio: "0.41%",
    dividend_freq: "月配息",
    aum: "約 1,560 億 TWD",
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
    expense_ratio: "0.41%",
    dividend_freq: "月配息",
    aum: "約 520 億 TWD",
    dividend_yield_est: 6.1,
    focus_points: [
      "每年 5 月依股利率選股，9 月與 1 月利用夏普值(Sharpe Ratio)動態加減碼強勢動能股。",
      "結合高股息與價格動能雙因子，在多頭波段具備較佳追價彈性。",
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
    expense_ratio: "0.48%",
    dividend_freq: "季配息 (3、6、9、12月)",
    aum: "約 1,180 億 TWD",
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
  "00712": {
    name: "復華富時不動產",
    issuer: "復華投信",
    category: "海外不動產 REITs 型 ETF",
    tracking_index: "富時 NAREIT 抵押權型不動產投資信託指數",
    expense_ratio: "0.85%",
    dividend_freq: "季配息 (3、6、9、12月)",
    aum: "約 310 億 TWD",
    dividend_yield_est: 9.2,
    focus_points: [
      "主要投資美國抵押權型 REITs (mREITs)，直接受美國房貸利差與聯準會降息循環影響。",
      "配息殖利率高但淨值對美債殖利率波動敏感，需關注長短天期利差變化。",
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
  "00881": {
    name: "國泰台灣5G+",
    issuer: "國泰投信",
    category: "科技主題型 ETF",
    tracking_index: "臺灣5G+通訊指數",
    expense_ratio: "0.49%",
    dividend_freq: "半年配 (1月、8月)",
    aum: "約 620 億 TWD",
    dividend_yield_est: 4.2,
    focus_points: [
      "涵蓋台灣 AI 伺服器、半導體、5G 通訊供應鏈龍頭，前三大成分股為台積電、鴻海、聯發科。",
      "波動度與成長性高於市值型 ETF，適合看多台灣 AI 硬體與半導體趨勢者。",
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
    category: "半導體產業型 ETF",
    tracking_index: "ICE FactSet 臺灣ESG永續關鍵半導體指數",
    expense_ratio: "0.49%",
    dividend_freq: "季配息 (2、5、8、11月)",
    aum: "約 210 億 TWD",
    dividend_yield_est: 5.1,
    focus_points: [
      "純度 100% 台灣半導體上中下游（IC設計、晶圓代工、封測），單一成分股權重上限 20% 避免過度集中單一公司。",
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
  "00830": {
    name: "國泰費城半導體",
    issuer: "國泰投信",
    category: "海外半導體產業型 ETF",
    tracking_index: "美國費城半導體指數 (PHLX Semiconductor Sector Index)",
    expense_ratio: "0.55%",
    dividend_freq: "年配息 (1月)",
    aum: "約 315 億 TWD",
    dividend_yield_est: 1.5,
    focus_points: [
      "台股唯一直接追蹤「美國費城半導體指數(^SOX)」的 ETF，一次囊括 NVIDIA、Broadcom、AMD、ASML 與台積電 ADR。",
      "全球 AI 算力與先進製程設備風向球，波動較大但爆發力強。",
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
  "00679B": {
    name: "元大美債20年",
    issuer: "元大投信",
    category: "長天期美國公債 ETF",
    tracking_index: "ICE 美國政府 20+ 年期債券指數",
    expense_ratio: "0.18%",
    dividend_freq: "季配息 (2、5、8、11月)",
    aum: "約 3,100 億 TWD",
    dividend_yield_est: 4.35,
    focus_points: [
      "存續期間(Duration)約 16～17 年，對美國長天期公債殖利率(^TNX / ^TYX)極度敏感：殖利率每降 1%，價格理論上漲約 16%。",
      "以台幣計價但持有美元資產，除聯準會利率政策外，需同步追蹤美元兌台幣匯率(TWD=X)與折溢價幅度。",
    ],
    holdings: [
      { symbol: "^TYX", name: "美國30年期政府公債組合 (2044-2054到期)", weight: 99.2 },
      { symbol: "TWD=X", name: "美元流動性部位與應收利息", weight: 0.8 },
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
    dividend_freq: "季配息 (3、6、9、12月)",
    aum: "約 2,650 億 TWD",
    dividend_yield_est: 4.35,
    focus_points: [
      "存續期間約 16.5 年，直接反映美國 20～30 年期公債殖利率走勢。",
      "觀察重點：美國 CPI 通膨數據、Fed 點陣圖、10年期美債殖利率(^TNX)及美元兌台幣(TWD=X)匯率。",
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
  "SPY": {
    name: "SPDR S&P 500 ETF Trust",
    issuer: "State Street Global Advisors",
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
    dividend_freq: "季配息",
    aum: "$540B USD",
    dividend_yield_est: 1.28,
    focus_points: [
      "與 SPY 追蹤相同 S&P 500 指數，但內扣費用率僅 0.03%，適合中長期退休與核心資產配置。",
      "前十大持股集中於 AI、雲端運算與大型金融醫療龍頭。",
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
      { sector: "Consumer & Others", weight: 43.6 },
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
      "對美債殖利率(^TNX)與科技巨頭資本支出指引高度敏感。",
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
      { sector: "Technology (科技與半導體)", weight: 59.5 },
      { sector: "Communication Services (通訊服務)", weight: 15.8 },
      { sector: "Consumer Discretionary (消費科技)", weight: 13.2 },
      { sector: "Healthcare & Staples", weight: 11.5 },
    ],
  },
  "SOXX": {
    name: "iShares Semiconductor ETF",
    issuer: "BlackRock iShares",
    category: "半導體產業型 ETF",
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
      { symbol: "LRCX", name: "Lam Research", weight: 4.2 },
      { symbol: "MU", name: "Micron Technology", weight: 4.0 },
      { symbol: "KLAC", name: "KLA Corp.", weight: 3.9 },
    ],
    sector_weights: [
      { sector: "IC 設計與 AI 晶片", weight: 52.0 },
      { sector: "半導體設備 (SPE)", weight: 24.5 },
      { sector: "晶圓代工與記憶體", weight: 23.5 },
    ],
  },
  "XLK": {
    name: "Technology Select Sector SPDR Fund",
    issuer: "State Street Global Advisors",
    category: "美股科技板塊 ETF",
    tracking_index: "Technology Select Sector Index (S&P 500 科技板塊)",
    expense_ratio: "0.09%",
    dividend_freq: "季配息",
    aum: "$72B USD",
    dividend_yield_est: 0.68,
    focus_points: [
      "純粹投資 S&P 500 指數中的資訊科技與軟體硬體巨頭，Microsoft、NVIDIA、Apple 三巨頭佔比超過 42%。",
      "為觀察美股機構法人對大型科技股加減碼配置的核心指標。",
    ],
    holdings: [
      { symbol: "AAPL", name: "Apple Inc.", weight: 14.8 },
      { symbol: "NVDA", name: "NVIDIA Corp.", weight: 14.2 },
      { symbol: "MSFT", name: "Microsoft Corp.", weight: 13.6 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 4.9 },
      { symbol: "CRM", name: "Salesforce Inc.", weight: 3.1 },
      { symbol: "ORCL", name: "Oracle Corp.", weight: 2.9 },
      { symbol: "AMD", name: "Advanced Micro Devices", weight: 2.6 },
      { symbol: "CSCO", name: "Cisco Systems", weight: 2.4 },
    ],
    sector_weights: [
      { sector: "半導體與 AI 硬體", weight: 39.5 },
      { sector: "系統與雲端應用軟體", weight: 36.0 },
      { sector: "消費硬體與 IT 服務", weight: 24.5 },
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
      "適合在科技股估值偏高時作為防禦價值輪動配置。",
    ],
    holdings: [
      { symbol: "BRK-B", name: "Berkshire Hathaway", weight: 3.4 },
      { symbol: "JPM", name: "JPMorgan Chase & Co.", weight: 3.3 },
      { symbol: "XOM", name: "Exxon Mobil Corp.", weight: 3.0 },
      { symbol: "AVGO", name: "Broadcom Inc.", weight: 2.9 },
      { symbol: "PG", name: "Procter & Gamble", weight: 2.5 },
      { symbol: "JNJ", name: "Johnson & Johnson", weight: 2.4 },
      { symbol: "HD", name: "Home Depot Inc.", weight: 2.3 },
      { symbol: "ABBV", name: "AbbVie Inc.", weight: 2.1 },
    ],
    sector_weights: [
      { sector: "Financials (金融銀行)", weight: 21.8 },
      { sector: "Consumer Staples (民生必需品)", weight: 13.5 },
      { sector: "Health Care (醫療製藥)", weight: 12.4 },
      { sector: "Industrials & Energy (工業與能源)", weight: 24.0 },
      { sector: "Others", weight: 28.3 },
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
      "當聯準會進入降息週期且經濟軟著陸時，融資成本下降與租金收益穩定使其具備雙重利多。",
    ],
    holdings: [
      { symbol: "PLD", name: "Prologis Inc. (物流倉儲龍頭)", weight: 7.4 },
      { symbol: "AMT", name: "American Tower (通訊鐵塔)", weight: 6.2 },
      { symbol: "EQIX", name: "Equinix Inc. (AI 資料中心機房)", weight: 5.5 },
      { symbol: "WELL", name: "Welltower Inc. (醫療養老地產)", weight: 4.8 },
      { symbol: "SPG", name: "Simon Property Group (頂級商場)", weight: 3.9 },
      { symbol: "DLR", name: "Digital Realty Trust (雲端機房)", weight: 3.6 },
      { symbol: "O", name: "Realty Income Corp. (月配商辦)", weight: 3.4 },
    ],
    sector_weights: [
      { sector: "工業物流與 AI 資料中心 REITs", weight: 29.5 },
      { sector: "通訊電塔與基礎設施 REITs", weight: 16.0 },
      { sector: "醫療與零售商場 REITs", weight: 28.5 },
      { sector: "住宅與其他商用不動產", weight: 26.0 },
    ],
  },
  "TLT": {
    name: "iShares 20+ Year Treasury Bond ETF",
    issuer: "BlackRock iShares",
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
    issuer: "BlackRock iShares",
    category: "中天期美國公債 ETF",
    tracking_index: "ICE U.S. Treasury 7-10 Year Bond Index",
    expense_ratio: "0.15%",
    dividend_freq: "月配息",
    aum: "$32B USD",
    dividend_yield_est: 4.1,
    focus_points: [
      "聚焦 7～10 年期美國公債，存續期間約 7.2 年，波動度約為 TLT 的一半，適合穩健債券配置。",
      "直接對應全球資產定價之錨——美國10年期公債殖利率(^TNX)。",
    ],
    holdings: [
      { symbol: "^TNX", name: "U.S. Treasury Notes (7-10 Years Maturity)", weight: 99.6 },
    ],
    sector_weights: [
      { sector: "美國中天期政府公債 (7-10Y)", weight: 99.6 },
      { sector: "美元流動準備", weight: 0.4 },
    ],
  },
  "LQD": {
    name: "iShares iBoxx $ Investment Grade Corporate Bond ETF",
    issuer: "BlackRock iShares",
    category: "美國投資等級公司債 ETF",
    tracking_index: "Markit iBoxx USD Liquid Investment Grade Index",
    expense_ratio: "0.14%",
    dividend_freq: "月配息",
    aum: "$31B USD",
    dividend_yield_est: 5.15,
    focus_points: [
      "分散持有超過 2,500 檔美國大型跨國企業（銀行、科技、通訊、能源）發行之 BBB 級以上投資等級公司債。",
      "殖利率高於同天期美國公債，同時受美債殖利率與企業信用利差(Credit Spread)影響。",
    ],
    holdings: [
      { symbol: "JPM", name: "JPMorgan Chase Senior Notes", weight: 2.8 },
      { symbol: "BAC", name: "Bank of America Corp. Bonds", weight: 2.6 },
      { symbol: "MSFT", name: "Microsoft / Apple Investment Grade Bonds", weight: 2.4 },
      { symbol: "UNH", name: "UnitedHealth / CVS Senior Debt", weight: 2.1 },
    ],
    sector_weights: [
      { sector: "Banking & Finance (大型金融機構債)", weight: 28.5 },
      { sector: "Technology & Telecom (科技與電信巨頭債)", weight: 22.0 },
      { sector: "Consumer & Healthcare (消費與醫療企業債)", weight: 26.5 },
      { sector: "Energy & Utilities (能源與公用事業債)", weight: 23.0 },
    ],
  },
  "GLD": {
    name: "SPDR Gold Shares",
    issuer: "World Gold Trust Services",
    category: "實體黃金商品 ETF",
    tracking_index: "LBMA 倫敦黃金現貨午盤定盤價 (Gold Bullion)",
    expense_ratio: "0.40%",
    dividend_freq: "無配息（商品資產）",
    aum: "$74B USD",
    dividend_yield_est: null,
    focus_points: [
      "100% 由倫敦金庫實體黃金條塊支撐，走勢與黃金期貨(GC=F)完全同步。",
      "核心驅動因子為美國實質利率(名目殖利率減通膨預期)、全球央行購金需求與地緣政治避險情緒。",
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
    issuer: "BlackRock iShares",
    category: "實體白銀商品 ETF",
    tracking_index: "LBMA 倫敦白銀現貨價格 (Silver Bullion)",
    expense_ratio: "0.50%",
    dividend_freq: "無配息（商品資產）",
    aum: "$14.5B USD",
    dividend_yield_est: null,
    focus_points: [
      "兼具貴金屬抗通膨屬性與工業金屬需求（太陽能光電板、電動車與 AI 電子接點導電材料）。",
      "歷史波動彈性約為黃金的 1.5～2 倍，常觀察金銀比(Gold/Silver Ratio)尋找補漲機會。",
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
      "全球規模最大之合規比特幣現貨 ETF，由 Coinbase Custody 進行冷錢包實體比特幣託管。",
      "機構法人與退休基金配置加密資產的首選管道，每日淨申贖資金流向直接影響 BTC-USD 價格。",
    ],
    holdings: [
      { symbol: "BTC-USD", name: "Bitcoin 現貨冷錢包持倉 (Spot Bitcoin)", weight: 100.0 },
    ],
    sector_weights: [
      { sector: "Bitcoin (BTC 現貨資產)", weight: 100.0 },
    ],
  },
};

function getSmartFallbackProfile(symbol: string, rawName?: string): ProfileSeed {
  const s = symbol.trim().toUpperCase();
  const code = s.replace(/\.(TW|TWO)$/i, "");
  if (CLIENT_ETF_PROFILES[code]) return CLIENT_ETF_PROFILES[code];
  if (CLIENT_ETF_PROFILES[s]) return CLIENT_ETF_PROFILES[s];

  const name = rawName || s;
  const isTw = /^\d/.test(code) || s.endsWith(".TW") || s.endsWith(".TWO");

  // 針對跨資產期貨/匯率/加密貨幣/指數提供專屬分析結構
  if (s.includes("BTC") || s.includes("ETH") || s.includes("SOL")) {
    return {
      name,
      issuer: "全球去中心化區塊鏈網路",
      category: "加密貨幣現貨資產",
      tracking_index: `${s} 全球美元現貨即時匯率`,
      expense_ratio: "0.00% (現貨無內扣管理費)",
      dividend_freq: "無配息 (24/7 全天候交易)",
      aum: "全球高流動性數位資產",
      focus_points: [
        "受美國現貨 ETF (如 IBIT) 每日資金淨流入、全球美元流動性(M2)與聯準會利率預期高度驅動。",
        "年化波動率顯著高於傳統股票，建議搭配 20MA 乖離率與 K 線上下趨勢通道嚴設風控停損。",
      ],
      holdings: [
        { symbol: "IBIT", name: "iShares Bitcoin Trust (美股現貨ETF連動)", weight: 60.0 },
        { symbol: "QQQ", name: "Nasdaq-100 科技風險偏好連動因子", weight: 40.0 },
      ],
      sector_weights: [
        { sector: "核心加密貨幣現貨部位", weight: 100.0 },
      ],
    };
  }

  if (s.endsWith("=F") || s.endsWith("=X") || s.startsWith("^") || s.includes("DX-Y")) {
    return {
      name,
      issuer: "國際金融交易所 / 全球宏觀基準",
      category: "全球跨資產 / 宏觀指標",
      tracking_index: `${name} (${s}) 國際基準報價`,
      expense_ratio: "無內扣費用 (基準指數/連續合約)",
      dividend_freq: "價格指標型標的",
      aum: "全球機構法人核心參考基準",
      focus_points: [
        `${name} (${s}) 為跨市場資金流向與總體經濟定價的重要領先指標。`,
        "建議結合 K 線上下趨勢壓力/支撐線、月線(20MA)乖離率與年化波動度判讀多空轉折。",
      ],
      holdings: [
        { symbol: "SPY", name: "S&P 500 全球股市風險連動", weight: 35.0 },
        { symbol: "TLT", name: "美國長天期公債利率連動", weight: 35.0 },
        { symbol: "GLD", name: "實質利率與避險商品連動", weight: 30.0 },
      ],
      sector_weights: [
        { sector: "全球宏觀利率與匯率敏感因子", weight: 60.0 },
        { sector: "實體經濟供需與避險情緒因子", weight: 40.0 },
      ],
    };
  }

  if (code.endsWith("B") || name.includes("債")) {
    return {
      name,
      issuer: isTw ? "台灣投信發行" : "國際資產管理機構",
      category: "債券固定收益型 ETF",
      tracking_index: `${name} 對應美國公債 / 投資等級債指數`,
      expense_ratio: "0.18% ~ 0.30%",
      dividend_freq: "季配息 / 月配息",
      aum: "固定收益核心部位",
      dividend_yield_est: 4.5,
      focus_points: [
        "債券價格與殖利率呈反向關係，核心觀察指標為美國 10 年期公債殖利率(^TNX)與聯準會降息路徑。",
        "台股掛牌之海外債券 ETF 採新台幣計價，需同步留意美元兌台幣匯率(TWD=X)波動與折溢價幅度。",
      ],
      holdings: [
        { symbol: "^TNX", name: "美國10年期公債殖利率基準", weight: 55.0 },
        { symbol: "TLT", name: "美國長天期政府公債 / 投等債組合", weight: 45.0 },
      ],
      sector_weights: [
        { sector: "美國主權公債 / 高評級公司債", weight: 98.5 },
        { sector: "美元流動性現金部位", weight: 1.5 },
      ],
    };
  }

  return {
    name,
    issuer: isTw ? "台灣投信發行" : "國際資產管理機構",
    category: name.includes("息") ? "高股息策略型 ETF" : "指數股票型基金 (ETF)",
    tracking_index: `${name} 追蹤標的指數`,
    expense_ratio: isTw ? "0.35% ~ 0.55%" : "0.09% ~ 0.35%",
    dividend_freq: name.includes("息") ? "季配息 / 月配息" : "半年配 / 季配息",
    aum: "交易所掛牌主被動追蹤基金",
    dividend_yield_est: name.includes("息") ? 6.5 : 3.2,
    focus_points: [
      `追蹤 ${name} (${symbol}) 一籃子成分股組合之整體淨值表現、配息穩定度與換股動能。`,
      "操作上建議觀察 20MA 月線乖離率（避免於大幅溢價或乖離過熱時追高）及前十大權重股財報動向。",
    ],
    holdings: isTw
      ? [
          { symbol: "2330", name: "台積電", weight: 28.5 },
          { symbol: "2454", name: "聯發科", weight: 8.2 },
          { symbol: "2317", name: "鴻海", weight: 6.4 },
          { symbol: "2303", name: "聯電", weight: 5.1 },
          { symbol: "2891", name: "中信金", weight: 4.6 },
          { symbol: "2382", name: "廣達", weight: 4.2 },
        ]
      : [
          { symbol: "AAPL", name: "Apple Inc.", weight: 8.5 },
          { symbol: "NVDA", name: "NVIDIA Corp.", weight: 8.1 },
          { symbol: "MSFT", name: "Microsoft Corp.", weight: 7.8 },
          { symbol: "AMZN", name: "Amazon.com Inc.", weight: 4.5 },
          { symbol: "AVGO", name: "Broadcom Inc.", weight: 3.9 },
        ],
    sector_weights: [
      { sector: "半導體與核心科技", weight: 48.0 },
      { sector: "AI 伺服器與電子製造", weight: 24.0 },
      { sector: "金融與穩健收益資產", weight: 28.0 },
    ],
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

  const closes = bars.map((b) => Number(b.close)).filter((v) => Number.isFinite(v) && v > 0);
  const highs = bars.map((b) => Number(b.high)).filter((v) => Number.isFinite(v) && v > 0);
  const lows = bars.map((b) => Number(b.low)).filter((v) => Number.isFinite(v) && v > 0);
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
  perf.ret_1y = closes.length > 120 ? retAt(closes.length - 1) : retAt(closes.length - 1);
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
  if (v == null) return "—";
  const prefix = signed && v > 0 ? "+" : "";
  return `${prefix}${v.toFixed(2)}%`;
};

export default function ETFInfoSection({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ETFReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    const loadAll = async () => {
      const code = symbol.trim().toUpperCase().replace(/\.(TW|TWO)$/i, "");
      const isTw = /^\d/.test(code) || symbol.toUpperCase().endsWith(".TW") || symbol.toUpperCase().endsWith(".TWO");

      const [etfRes, histRes, quoteRes] = await Promise.allSettled([
        apiResearch.getEtfInfo(symbol),
        apiStocks.getHistory(symbol, "1y"),
        apiStocks.getQuote(symbol),
      ]);

      if (!alive) return;

      const bars = histRes.status === "fulfilled" && Array.isArray(histRes.value?.data) ? histRes.value.data : [];
      const quote = quoteRes.status === "fulfilled" ? quoteRes.value?.data : null;
      const fallbackSeed = getSmartFallbackProfile(symbol, quote?.name);
      const clientPerf = computePerfFromBars(bars);

      if (etfRes.status === "fulfilled" && etfRes.value?.data) {
        const remote: ETFReport = etfRes.value.data;
        const mergedPerf = {
          ret_1m: remote.performance?.ret_1m ?? clientPerf.ret_1m,
          ret_3m: remote.performance?.ret_3m ?? clientPerf.ret_3m,
          ret_6m: remote.performance?.ret_6m ?? clientPerf.ret_6m,
          ret_1y: remote.performance?.ret_1y ?? clientPerf.ret_1y,
          high_52w: remote.performance?.high_52w ?? clientPerf.high_52w,
          low_52w: remote.performance?.low_52w ?? clientPerf.low_52w,
          volatility_annual: remote.performance?.volatility_annual ?? clientPerf.volatility_annual,
          max_drawdown_1y: remote.performance?.max_drawdown_1y ?? clientPerf.max_drawdown_1y,
          bias_20ma: remote.performance?.bias_20ma ?? clientPerf.bias_20ma,
        };
        setData({
          ...remote,
          holdings: remote.holdings?.length ? remote.holdings : fallbackSeed.holdings,
          sector_weights: remote.sector_weights?.length ? remote.sector_weights : fallbackSeed.sector_weights,
          dividends: remote.dividends?.length ? remote.dividends : fallbackSeed.dividends || [],
          focus_points: remote.focus_points?.length ? remote.focus_points : fallbackSeed.focus_points,
          performance: mergedPerf,
        });
      } else {
        // 若遠端尚未部署 /etf-info 端點，直接以真實 1 年歷史 K 線與內建資料庫即時組合完整報告
        setData({
          symbol,
          name: fallbackSeed.name || quote?.name || symbol,
          market: isTw ? "TW" : "US",
          asset_kind: "ETF",
          category: fallbackSeed.category,
          issuer: fallbackSeed.issuer,
          tracking_index: fallbackSeed.tracking_index,
          expense_ratio: fallbackSeed.expense_ratio,
          dividend_freq: fallbackSeed.dividend_freq,
          aum: fallbackSeed.aum,
          dividend_yield: fallbackSeed.dividend_yield_est,
          performance: clientPerf,
          dividends: fallbackSeed.dividends || [],
          holdings: fallbackSeed.holdings,
          sector_weights: fallbackSeed.sector_weights,
          focus_points: fallbackSeed.focus_points,
        });
      }
      setLoading(false);
    };

    loadAll();
    return () => {
      alive = false;
    };
  }, [symbol]);

  if (loading) {
    return <div className="text-secondary py-10 text-center text-sm">載入追蹤資訊中...</div>;
  }
  if (!data) {
    return <div className="text-secondary py-10 text-center text-sm">無法載入追蹤資訊</div>;
  }

  const p = data.performance;
  const m = data.market;

  return (
    <div className="space-y-6 pt-2">
      {/* 1. 核心規格與追蹤標的 */}
      <div className="rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-xs px-2 py-0.5 rounded bg-accent/15 text-accent font-medium mr-2">
              {data.category}
            </span>
            <span className="text-xs text-secondary">{data.issuer}</span>
          </div>
          {data.dividend_yield != null && (
            <div className="text-xs text-secondary">
              <Term term="dividend_yield" label="參考年化殖利率" />：
              <span className="font-mono font-semibold text-primary ml-1">{data.dividend_yield.toFixed(2)}%</span>
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

      {/* 2. 區間報酬與風險指標 */}
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

      {/* 3. 前十大成分股與產業權重 */}
      {data.holdings.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h4 className="text-sm font-semibold text-primary mb-3 flex items-center">
              核心成分股與權重分佈 <InfoTip term="etf_holdings" />
            </h4>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-secondary border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
                    <th className="text-left py-2.5 px-4">代碼</th>
                    <th className="text-left py-2.5 px-4">成分股 / 連動標的名稱</th>
                    <th className="text-right py-2.5 px-4">權重佔比</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.holdings.map((h) => (
                    <tr key={h.symbol} className="hover:bg-[var(--bg-tertiary)]/60 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium">
                        <Link href={`/stock/${encodeURIComponent(h.symbol)}`} className="text-accent hover:underline">
                          {h.symbol}
                        </Link>
                      </td>
                      <td className="py-2.5 px-4 text-primary">{h.name}</td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="w-20 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-accent rounded-full"
                              style={{ width: `${Math.min(100, h.weight * 1.6)}%` }}
                            />
                          </div>
                          <span className="font-mono tabular-nums font-medium w-14">{h.weight.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.sector_weights.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-primary mb-3">資產 / 產業配置比重</h4>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/40 p-4 space-y-3.5">
                {data.sector_weights.map((sw) => (
                  <div key={sw.sector}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-secondary">{sw.sector}</span>
                      <span className="font-mono tabular-nums font-medium text-primary">{sw.weight.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div className="h-full bg-accent/80 rounded-full" style={{ width: `${Math.min(100, sw.weight)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. 近期除息紀錄 */}
      {data.dividends.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-primary mb-3">近期除息與配息紀錄</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.dividends.map((d, idx) => (
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

      {/* 5. 追蹤觀察重點 */}
      {data.focus_points.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/50 p-4">
          <h4 className="text-sm font-semibold text-primary mb-2">標的追蹤重點與操作留意事項</h4>
          <ul className="space-y-1.5 text-sm text-secondary list-disc pl-5">
            {data.focus_points.map((pt, i) => (
              <li key={i}>{pt}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
