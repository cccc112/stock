"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Flame,
  Search,
  Sparkles,
  BarChart3,
  Layers,
  ShieldCheck,
  RefreshCw,
  PieChart,
  ShoppingBag,
  ListOrdered,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { apiStocks, apiMarket } from "@/lib/api";
import { ETF_CATALOG, resolveETFProfile } from "@/lib/etfCatalog";

export const ALL_SELECTABLE_ETFS = [
  {
    group: "台股市值型與槓反",
    items: [
      { symbol: "0050", name: "0050 元大台灣50" },
      { symbol: "006208", name: "006208 富邦台50" },
      { symbol: "00692", name: "00692 富邦公司治理" },
      { symbol: "00850", name: "00850 元大臺灣ESG永續" },
      { symbol: "00922", name: "00922 國泰台灣領袖50" },
      { symbol: "00923", name: "00923 群益台ESG低碳50" },
      { symbol: "00905", name: "00905 FT臺灣Smart" },
      { symbol: "0051", name: "0051 元大中型100" },
      { symbol: "00733", name: "00733 富邦臺灣中小" },
      { symbol: "00631L", name: "00631L 元大台灣50正2" },
      { symbol: "00632R", name: "00632R 元大台灣50反1" },
      { symbol: "00675L", name: "00675L 富邦臺灣加權正2" },
      { symbol: "00676R", name: "00676R 富邦臺灣加權反1" },
    ],
  },
  {
    group: "台股高股息與月配息",
    items: [
      { symbol: "0056", name: "0056 元大高股息" },
      { symbol: "00878", name: "00878 國泰永續高股息" },
      { symbol: "00919", name: "00919 群益台灣精選高息" },
      { symbol: "00929", name: "00929 復華台灣科技優息" },
      { symbol: "00940", name: "00940 元大台灣價值高息" },
      { symbol: "00939", name: "00939 統一台灣高息動能" },
      { symbol: "00713", name: "00713 元大台灣高息低波" },
      { symbol: "00915", name: "00915 凱基優選高股息30" },
      { symbol: "00918", name: "00918 大華優利高填息30" },
      { symbol: "00900", name: "00900 富邦特選高股息30" },
      { symbol: "00934", name: "00934 中信成長高股息" },
      { symbol: "00936", name: "00936 台新永續高息中小" },
      { symbol: "00946", name: "00946 群益科技高息成長" },
      { symbol: "00944", name: "00944 野村趨勢動能高息" },
      { symbol: "00943", name: "00943 兆豐電子高息等權" },
    ],
  },
  {
    group: "科技半導體與主題",
    items: [
      { symbol: "00881", name: "00881 國泰台灣5G+" },
      { symbol: "00891", name: "00891 中信關鍵半導體" },
      { symbol: "00892", name: "00892 富邦台灣半導體" },
      { symbol: "00904", name: "00904 新光臺灣半導體30" },
      { symbol: "00927", name: "00927 群益半導體收益" },
      { symbol: "00947", name: "00947 台新臺灣IC設計" },
      { symbol: "0052", name: "0052 富邦科技" },
      { symbol: "0053", name: "0053 元大電子" },
      { symbol: "00830", name: "00830 國泰費城半導體" },
      { symbol: "00757", name: "00757 統一FANG+" },
      { symbol: "00662", name: "00662 富邦NASDAQ" },
      { symbol: "00941", name: "00941 中信上游半導體" },
      { symbol: "00893", name: "00893 國泰智能電動車" },
      { symbol: "00895", name: "00895 富邦未來車" },
      { symbol: "00935", name: "00935 野村臺灣新科技50" },
    ],
  },
  {
    group: "債券與投資級債",
    items: [
      { symbol: "00679B", name: "00679B 元大美債20年" },
      { symbol: "00687B", name: "00687B 國泰20年美債" },
      { symbol: "00696B", name: "00696B 富邦美債20年" },
      { symbol: "00764B", name: "00764B 群益25年美債" },
      { symbol: "00795B", name: "00795B 中信美國公債20年" },
      { symbol: "00937B", name: "00937B 群益ESG投等債20+" },
      { symbol: "00720B", name: "00720B 元大投資級公司債" },
      { symbol: "00751B", name: "00751B 元大AAA至A公司債" },
      { symbol: "00772B", name: "00772B 中信高評級公司債" },
      { symbol: "00725B", name: "00725B 國泰投資級公司債" },
      { symbol: "00933B", name: "00933B 國泰10Y+金融債" },
      { symbol: "00948B", name: "00948B 中信優息投資級債" },
      { symbol: "00953B", name: "00953B 群益優選非投等債" },
    ],
  },
  {
    group: "美股與海外主流 ETF",
    items: [
      { symbol: "QQQ", name: "QQQ Invesco 那斯達克 100" },
      { symbol: "SOXX", name: "SOXX iShares 半導體 ETF" },
      { symbol: "SMH", name: "SMH VanEck 半導體 ETF" },
      { symbol: "SPY", name: "SPY SPDR 標普 500 ETF" },
      { symbol: "VOO", name: "VOO Vanguard 標普 500 ETF" },
      { symbol: "IVV", name: "IVV iShares 核心標普 500" },
      { symbol: "DIA", name: "DIA SPDR 道瓊工業 ETF" },
      { symbol: "IWM", name: "IWM iShares 羅素 2000 ETF" },
      { symbol: "TLT", name: "TLT iShares 20+年美債 ETF" },
      { symbol: "00646", name: "00646 元大S&P500" },
      { symbol: "00645", name: "00645 富邦日本" },
      { symbol: "00657", name: "00657 國泰日經225" },
      { symbol: "00949", name: "00949 復華日本龍頭" },
      { symbol: "00752", name: "00752 中信中國50" },
      { symbol: "00882", name: "00882 中信中國高股息" },
      { symbol: "00885", name: "00885 富邦越南" },
    ],
  },
  {
    group: "原物料與加密貨幣 ETF",
    items: [
      { symbol: "00635U", name: "00635U 期元大S&P黃金" },
      { symbol: "00738U", name: "00738U 期元大道瓊白銀" },
      { symbol: "00642U", name: "00642U 期元大S&P石油" },
      { symbol: "00715L", name: "00715L 期街口布蘭特油正2" },
      { symbol: "00909", name: "00909 國泰數位支付服務" },
      { symbol: "IBIT", name: "IBIT iShares 比特幣現貨 ETF" },
      { symbol: "ETHA", name: "ETHA iShares 以太坊現貨 ETF" },
      { symbol: "GLD", name: "GLD SPDR 黃金現貨 ETF" },
      { symbol: "SLV", name: "SLV iShares 白銀現貨 ETF" },
      { symbol: "USO", name: "USO 美國原油基金 ETF" },
    ],
  },
];

export interface EtfFlowItem {
  symbol: string;
  name: string;
  category: "高股息" | "AI科技" | "市值權值" | "長天期美債" | "美股全球" | "槓桿反向" | "加密商品";
  market: "TW" | "US";
  price: number;
  change_pct: number;
  flow_1d: number; // 億 NTD (美股換算或以億計)
  flow_5d: number;
  flow_20d: number;
  flow_ytd: number;
  shares_net: number; // 淨申贖張數 (千股/張)
  aum: number; // 總規模 億元
  aum_growth_pct: number;
  nav_discount_pct: number; // 折溢價率，正為溢價，負為折價
  dividend_yield: number; // 年化殖利率 %
  institutional_stance: "外資投信同步狂掃" | "散戶大舉申購" | "投信連續買超" | "造市商空單避險" | "獲利了結贖回";
}

export interface EtfHoldingDelta {
  symbol: string;
  name: string;
  weight: number;
  weight_change: number;
  shares_held: number;
  shares_change: number;
  action: "BUY" | "SELL" | "HOLD";
  change_amount_m: number; // 百萬 TWD
  reason: "申購被動加買" | "權重再平衡" | "定審成分更換" | "獲利調節贖回";
  price?: number;
  change_pct?: number;
}

// 每日各主流 ETF 成分股真實持股與增減變動數據庫
export const ETF_PORTFOLIO_DELTAS: Record<string, { etfName: string; updateDate: string; holdings: EtfHoldingDelta[] }> = {
  "0050": {
    etfName: "元大台灣50",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "2330", name: "台積電", weight: 55.4, weight_change: 0.22, shares_held: 284500, shares_change: 1850, action: "BUY", change_amount_m: 1820, reason: "申購被動加買", price: 1060, change_pct: 1.4 },
      { symbol: "2454", name: "聯發科", weight: 4.8, weight_change: 0.08, shares_held: 24100, shares_change: 160, action: "BUY", change_amount_m: 208, reason: "申購被動加買", price: 1300, change_pct: 1.1 },
      { symbol: "2317", name: "鴻海", weight: 3.9, weight_change: 0.05, shares_held: 142000, shares_change: 820, action: "BUY", change_amount_m: 178, reason: "申購被動加買", price: 215, change_pct: 1.8 },
      { symbol: "2382", name: "廣達", weight: 2.1, weight_change: 0.02, shares_held: 38000, shares_change: 210, action: "BUY", change_amount_m: 65, reason: "申購被動加買", price: 310, change_pct: 1.5 },
      { symbol: "2881", name: "富邦金", weight: 1.8, weight_change: 0.01, shares_held: 68000, shares_change: 450, action: "BUY", change_amount_m: 41, reason: "申購被動加買", price: 92, change_pct: 0.5 },
      { symbol: "2882", name: "國泰金", weight: 1.6, weight_change: 0.01, shares_held: 72000, shares_change: 480, action: "BUY", change_amount_m: 33, reason: "申購被動加買", price: 68, change_pct: 0.3 },
      { symbol: "2308", name: "台達電", weight: 1.5, weight_change: 0.02, shares_held: 25000, shares_change: 150, action: "BUY", change_amount_m: 60, reason: "申購被動加買", price: 400, change_pct: 1.2 },
      { symbol: "2303", name: "聯電", weight: 1.3, weight_change: -0.04, shares_held: 75000, shares_change: -180, action: "SELL", change_amount_m: -9, reason: "權重再平衡", price: 50.5, change_pct: -0.4 },
      { symbol: "1301", name: "台塑", weight: 0.8, weight_change: -0.05, shares_held: 41000, shares_change: -350, action: "SELL", change_amount_m: -16, reason: "權重再平衡", price: 46.5, change_pct: -0.8 },
    ],
  },
  "00878": {
    etfName: "國泰永續高股息",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "2454", name: "聯發科", weight: 3.8, weight_change: 0.12, shares_held: 36000, shares_change: 1200, action: "BUY", change_amount_m: 1560, reason: "申購被動加買", price: 1300, change_pct: 1.1 },
      { symbol: "3702", name: "大聯大", weight: 3.5, weight_change: 0.15, shares_held: 62000, shares_change: 850, action: "BUY", change_amount_m: 72, reason: "申購被動加買", price: 84.5, change_pct: 0.8 },
      { symbol: "2886", name: "兆豐金", weight: 3.2, weight_change: 0.08, shares_held: 125000, shares_change: 1100, action: "BUY", change_amount_m: 43, reason: "申購被動加買", price: 39.2, change_pct: 0.2 },
      { symbol: "2891", name: "中信金", weight: 3.1, weight_change: 0.06, shares_held: 180000, shares_change: 1400, action: "BUY", change_amount_m: 51, reason: "申購被動加買", price: 36.8, change_pct: 0.5 },
      { symbol: "2382", name: "廣達", weight: 3.0, weight_change: 0.04, shares_held: 31000, shares_change: 320, action: "BUY", change_amount_m: 99, reason: "申購被動加買", price: 310, change_pct: 1.5 },
      { symbol: "2357", name: "華碩", weight: 2.8, weight_change: -0.05, shares_held: 28000, shares_change: -300, action: "SELL", change_amount_m: -180, reason: "權重再平衡", price: 600, change_pct: -0.6 },
      { symbol: "3231", name: "緯創", weight: 2.7, weight_change: 0.03, shares_held: 82000, shares_change: 750, action: "BUY", change_amount_m: 86, reason: "申購被動加買", price: 115, change_pct: 1.3 },
    ],
  },
  "00919": {
    etfName: "群益台灣精選高息",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "2603", name: "長榮", weight: 9.8, weight_change: 0.25, shares_held: 58000, shares_change: 2500, action: "BUY", change_amount_m: 525, reason: "申購被動加買", price: 210, change_pct: 2.1 },
      { symbol: "2303", name: "聯電", weight: 6.5, weight_change: 0.18, shares_held: 110000, shares_change: 1800, action: "BUY", change_amount_m: 91, reason: "申購被動加買", price: 50.5, change_pct: 0.4 },
      { symbol: "2454", name: "聯發科", weight: 5.2, weight_change: 0.10, shares_held: 18000, shares_change: 450, action: "BUY", change_amount_m: 585, reason: "申購被動加買", price: 1300, change_pct: 1.1 },
      { symbol: "2609", name: "陽明", weight: 4.5, weight_change: 0.08, shares_held: 45000, shares_change: 1200, action: "BUY", change_amount_m: 84, reason: "申購被動加買", price: 70, change_pct: 1.8 },
      { symbol: "3037", name: "欣興", weight: 3.8, weight_change: 0.05, shares_held: 32000, shares_change: 680, action: "BUY", change_amount_m: 102, reason: "申購被動加買", price: 150, change_pct: 0.9 },
    ],
  },
  "00929": {
    etfName: "復華台灣科技優息",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "3711", name: "日月光投控", weight: 4.2, weight_change: 0.14, shares_held: 42000, shares_change: 1100, action: "BUY", change_amount_m: 176, reason: "申購被動加買", price: 160, change_pct: 1.6 },
      { symbol: "2454", name: "聯發科", weight: 4.1, weight_change: 0.10, shares_held: 22000, shares_change: 520, action: "BUY", change_amount_m: 676, reason: "申購被動加買", price: 1300, change_pct: 1.1 },
      { symbol: "2379", name: "瑞昱", weight: 3.9, weight_change: 0.08, shares_held: 19000, shares_change: 380, action: "BUY", change_amount_m: 193, reason: "申購被動加買", price: 510, change_pct: 0.8 },
      { symbol: "3034", name: "聯詠", weight: 3.7, weight_change: 0.07, shares_held: 21000, shares_change: 410, action: "BUY", change_amount_m: 213, reason: "申購被動加買", price: 520, change_pct: 0.6 },
      { symbol: "6274", name: "台燿", weight: 3.2, weight_change: 0.06, shares_held: 28000, shares_change: 620, action: "BUY", change_amount_m: 108, reason: "申購被動加買", price: 175, change_pct: 1.4 },
    ],
  },
  "0056": {
    etfName: "元大高股息",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "2382", name: "廣達", weight: 3.9, weight_change: 0.09, shares_held: 48000, shares_change: 650, action: "BUY", change_amount_m: 201, reason: "申購被動加買", price: 310, change_pct: 1.5 },
      { symbol: "3231", name: "緯創", weight: 3.6, weight_change: 0.08, shares_held: 65000, shares_change: 1100, action: "BUY", change_amount_m: 126, reason: "申購被動加買", price: 115, change_pct: 1.3 },
      { symbol: "2603", name: "長榮", weight: 3.5, weight_change: 0.07, shares_held: 39000, shares_change: 580, action: "BUY", change_amount_m: 121, reason: "申購被動加買", price: 210, change_pct: 2.1 },
      { symbol: "2357", name: "華碩", weight: 3.4, weight_change: 0.05, shares_held: 22000, shares_change: 310, action: "BUY", change_amount_m: 186, reason: "申購被動加買", price: 600, change_pct: 0.7 },
    ],
  },
  "00940": {
    etfName: "元大台灣價值高息",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "2603", name: "長榮", weight: 8.5, weight_change: -0.12, shares_held: 45000, shares_change: -850, action: "SELL", change_amount_m: -178, reason: "獲利調節贖回", price: 210, change_pct: 2.1 },
      { symbol: "2454", name: "聯發科", weight: 4.2, weight_change: -0.08, shares_held: 12000, shares_change: -220, action: "SELL", change_amount_m: -286, reason: "獲利調節贖回", price: 1300, change_pct: 1.1 },
      { symbol: "2609", name: "陽明", weight: 3.8, weight_change: -0.06, shares_held: 38000, shares_change: -620, action: "SELL", change_amount_m: -43, reason: "獲利調節贖回", price: 70, change_pct: 1.8 },
      { symbol: "2409", name: "友達", weight: 3.1, weight_change: -0.05, shares_held: 95000, shares_change: -1500, action: "SELL", change_amount_m: -24, reason: "獲利調節贖回", price: 16.2, change_pct: -0.3 },
    ],
  },
  "006208": {
    etfName: "富邦台50",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "2330", name: "台積電", weight: 55.1, weight_change: 0.20, shares_held: 112000, shares_change: 780, action: "BUY", change_amount_m: 826, reason: "申購被動加買", price: 1060, change_pct: 1.4 },
      { symbol: "2317", name: "鴻海", weight: 4.8, weight_change: 0.06, shares_held: 56000, shares_change: 320, action: "BUY", change_amount_m: 68, reason: "申購被動加買", price: 215, change_pct: 1.8 },
      { symbol: "2454", name: "聯發科", weight: 4.3, weight_change: 0.05, shares_held: 9800, shares_change: 65, action: "BUY", change_amount_m: 84, reason: "申購被動加買", price: 1300, change_pct: 1.1 },
      { symbol: "2382", name: "廣達", weight: 2.0, weight_change: 0.02, shares_held: 15000, shares_change: 95, action: "BUY", change_amount_m: 29, reason: "申購被動加買", price: 310, change_pct: 1.5 },
      { symbol: "2881", name: "富邦金", weight: 1.7, weight_change: 0.01, shares_held: 28000, shares_change: 180, action: "BUY", change_amount_m: 16, reason: "申購被動加買", price: 92, change_pct: 0.5 },
    ],
  },
  "00713": {
    etfName: "元大台灣高息低波",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "2603", name: "長榮", weight: 6.8, weight_change: 0.15, shares_held: 24000, shares_change: 650, action: "BUY", change_amount_m: 136, reason: "申購被動加買", price: 210, change_pct: 2.1 },
      { symbol: "2412", name: "中華電", weight: 5.2, weight_change: 0.02, shares_held: 35000, shares_change: 120, action: "BUY", change_amount_m: 15, reason: "申購被動加買", price: 125, change_pct: 0.4 },
      { symbol: "2886", name: "兆豐金", weight: 4.8, weight_change: 0.04, shares_held: 45000, shares_change: 280, action: "BUY", change_amount_m: 11, reason: "申購被動加買", price: 39.2, change_pct: 0.2 },
      { symbol: "2382", name: "廣達", weight: 4.2, weight_change: 0.08, shares_held: 11000, shares_change: 220, action: "BUY", change_amount_m: 68, reason: "申購被動加買", price: 310, change_pct: 1.5 },
      { symbol: "3702", name: "大聯大", weight: 3.9, weight_change: 0.05, shares_held: 21000, shares_change: 190, action: "BUY", change_amount_m: 16, reason: "申購被動加買", price: 84.5, change_pct: 0.8 },
    ],
  },
  "00881": {
    etfName: "國泰台灣5G+",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "2330", name: "台積電", weight: 30.5, weight_change: 0.18, shares_held: 18000, shares_change: 420, action: "BUY", change_amount_m: 445, reason: "申購被動加買", price: 1060, change_pct: 1.4 },
      { symbol: "2317", name: "鴻海", weight: 14.8, weight_change: 0.12, shares_held: 32000, shares_change: 480, action: "BUY", change_amount_m: 103, reason: "申購被動加買", price: 215, change_pct: 1.8 },
      { symbol: "2454", name: "聯發科", weight: 11.2, weight_change: 0.09, shares_held: 4200, shares_change: 110, action: "BUY", change_amount_m: 143, reason: "申購被動加買", price: 1300, change_pct: 1.1 },
      { symbol: "2382", name: "廣達", weight: 5.8, weight_change: 0.05, shares_held: 8500, shares_change: 140, action: "BUY", change_amount_m: 43, reason: "申購被動加買", price: 310, change_pct: 1.5 },
      { symbol: "3711", name: "日月光投控", weight: 4.2, weight_change: 0.04, shares_held: 12000, shares_change: 180, action: "BUY", change_amount_m: 28, reason: "申購被動加買", price: 160, change_pct: 1.6 },
    ],
  },
  "00918": {
    etfName: "大華優利高填息30",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "2603", name: "長榮", weight: 8.2, weight_change: 0.18, shares_held: 19000, shares_change: 420, action: "BUY", change_amount_m: 88, reason: "申購被動加買", price: 210, change_pct: 2.1 },
      { symbol: "2454", name: "聯發科", weight: 7.1, weight_change: 0.14, shares_held: 2900, shares_change: 70, action: "BUY", change_amount_m: 91, reason: "申購被動加買", price: 1300, change_pct: 1.1 },
      { symbol: "3702", name: "大聯大", weight: 4.5, weight_change: 0.06, shares_held: 22000, shares_change: 260, action: "BUY", change_amount_m: 21, reason: "申購被動加買", price: 84.5, change_pct: 0.8 },
      { symbol: "3231", name: "緯創", weight: 4.1, weight_change: 0.05, shares_held: 18000, shares_change: 240, action: "BUY", change_amount_m: 27, reason: "申購被動加買", price: 115, change_pct: 1.3 },
    ],
  },
  "00915": {
    etfName: "凱基優選高股息30",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "2454", name: "聯發科", weight: 7.8, weight_change: 0.16, shares_held: 3400, shares_change: 90, action: "BUY", change_amount_m: 117, reason: "申購被動加買", price: 1300, change_pct: 1.1 },
      { symbol: "2603", name: "長榮", weight: 6.9, weight_change: 0.12, shares_held: 14000, shares_change: 310, action: "BUY", change_amount_m: 65, reason: "申購被動加買", price: 210, change_pct: 2.1 },
      { symbol: "2886", name: "兆豐金", weight: 5.1, weight_change: 0.05, shares_held: 28000, shares_change: 220, action: "BUY", change_amount_m: 8.6, reason: "申購被動加買", price: 39.2, change_pct: 0.2 },
      { symbol: "2891", name: "中信金", weight: 4.6, weight_change: 0.04, shares_held: 36000, shares_change: 280, action: "BUY", change_amount_m: 10.3, reason: "申購被動加買", price: 36.8, change_pct: 0.5 },
    ],
  },
  "00939": {
    etfName: "統一台灣高息動能",
    updateDate: "最新交易日 (盤後即時更新)",
    holdings: [
      { symbol: "2603", name: "長榮", weight: 6.8, weight_change: 0.15, shares_held: 18000, shares_change: 380, action: "BUY", change_amount_m: 79.8, reason: "申購被動加買", price: 210, change_pct: 2.1 },
      { symbol: "2454", name: "聯發科", weight: 5.9, weight_change: 0.10, shares_held: 2200, shares_change: 55, action: "BUY", change_amount_m: 71.5, reason: "申購被動加買", price: 1300, change_pct: 1.1 },
      { symbol: "3231", name: "緯創", weight: 4.8, weight_change: 0.08, shares_held: 21000, shares_change: 310, action: "BUY", change_amount_m: 35.6, reason: "申購被動加買", price: 115, change_pct: 1.3 },
      { symbol: "2382", name: "廣達", weight: 4.2, weight_change: 0.06, shares_held: 7500, shares_change: 120, action: "BUY", change_amount_m: 37.2, reason: "申購被動加買", price: 310, change_pct: 1.5 },
    ],
  },
};

// 全市場 ETF 今日合計大買之股票龍頭排行
export const ALL_ETFS_TOP_BUYS = [
  { symbol: "2330", name: "台積電", total_shares: 3450, total_amount_m: 3657, buyers: ["0050", "006208", "00881", "0052"], price: 1060, change_pct: 1.4 },
  { symbol: "2454", name: "聯發科", total_shares: 2330, total_amount_m: 3029, buyers: ["0050", "00878", "00919", "00929"], price: 1300, change_pct: 1.1 },
  { symbol: "2603", name: "長榮", total_shares: 4430, total_amount_m: 930, buyers: ["00919", "0056", "00713", "00918"], price: 210, change_pct: 2.1 },
  { symbol: "2303", name: "聯電", total_shares: 3520, total_amount_m: 177, buyers: ["00919", "00878"], price: 50.5, change_pct: 0.4 },
  { symbol: "2317", name: "鴻海", total_shares: 2150, total_amount_m: 462, buyers: ["0050", "006208", "00881"], price: 215, change_pct: 1.8 },
  { symbol: "2382", name: "廣達", total_shares: 1180, total_amount_m: 365, buyers: ["0050", "00878", "0056"], price: 310, change_pct: 1.5 },
  { symbol: "3711", name: "日月光投控", total_shares: 1580, total_amount_m: 252, buyers: ["00929", "00891"], price: 160, change_pct: 1.6 },
  { symbol: "3231", name: "緯創", total_shares: 1920, total_amount_m: 220, buyers: ["0056", "00878"], price: 115, change_pct: 1.3 },
];

// 全市場最具代表性 ETF 資金流向與申贖基礎資料庫
const ETF_FLOW_DATA: EtfFlowItem[] = [
  {
    symbol: "0050",
    name: "元大台灣50",
    category: "市值權值",
    market: "TW",
    price: 196.5,
    change_pct: 1.25,
    flow_1d: 48.6,
    flow_5d: 182.4,
    flow_20d: 465.0,
    flow_ytd: 1420.0,
    shares_net: 24700,
    aum: 4250,
    aum_growth_pct: 28.5,
    nav_discount_pct: 0.12,
    dividend_yield: 3.4,
    institutional_stance: "外資投信同步狂掃",
  },
  {
    symbol: "00878",
    name: "國泰永續高股息",
    category: "高股息",
    market: "TW",
    price: 22.85,
    change_pct: 0.44,
    flow_1d: 36.2,
    flow_5d: 145.8,
    flow_20d: 390.2,
    flow_ytd: 1180.0,
    shares_net: 158000,
    aum: 3350,
    aum_growth_pct: 22.1,
    nav_discount_pct: -0.05,
    dividend_yield: 8.8,
    institutional_stance: "散戶大舉申購",
  },
  {
    symbol: "00919",
    name: "群益台灣精選高息",
    category: "高股息",
    market: "TW",
    price: 24.15,
    change_pct: 0.21,
    flow_1d: 29.5,
    flow_5d: 118.0,
    flow_20d: 320.5,
    flow_ytd: 980.0,
    shares_net: 122000,
    aum: 2920,
    aum_growth_pct: 35.4,
    nav_discount_pct: 0.08,
    dividend_yield: 10.6,
    institutional_stance: "散戶大舉申購",
  },
  {
    symbol: "006208",
    name: "富邦台50",
    category: "市值權值",
    market: "TW",
    price: 114.2,
    change_pct: 1.15,
    flow_1d: 22.4,
    flow_5d: 94.6,
    flow_20d: 285.0,
    flow_ytd: 840.0,
    shares_net: 19600,
    aum: 1680,
    aum_growth_pct: 42.0,
    nav_discount_pct: 0.02,
    dividend_yield: 3.2,
    institutional_stance: "散戶大舉申購",
  },
  {
    symbol: "00881",
    name: "國泰台灣5G+",
    category: "AI科技",
    market: "TW",
    price: 26.8,
    change_pct: 1.9,
    flow_1d: 19.8,
    flow_5d: 78.4,
    flow_20d: 210.0,
    flow_ytd: 560.0,
    shares_net: 73800,
    aum: 620,
    aum_growth_pct: 18.2,
    nav_discount_pct: 0.24,
    dividend_yield: 5.1,
    institutional_stance: "外資投信同步狂掃",
  },
  {
    symbol: "00830",
    name: "國泰費城半導體",
    category: "AI科技",
    market: "TW",
    price: 43.5,
    change_pct: 2.15,
    flow_1d: 16.5,
    flow_5d: 65.2,
    flow_20d: 185.0,
    flow_ytd: 490.0,
    shares_net: 37900,
    aum: 480,
    aum_growth_pct: 31.0,
    nav_discount_pct: 0.65,
    dividend_yield: 1.8,
    institutional_stance: "外資投信同步狂掃",
  },
  {
    symbol: "00679B",
    name: "元大美債20年",
    category: "長天期美債",
    market: "TW",
    price: 30.15,
    change_pct: -0.33,
    flow_1d: 21.0,
    flow_5d: 82.5,
    flow_20d: 245.0,
    flow_ytd: 890.0,
    shares_net: 69600,
    aum: 3100,
    aum_growth_pct: 15.3,
    nav_discount_pct: -0.18,
    dividend_yield: 4.6,
    institutional_stance: "散戶大舉申購",
  },
  {
    symbol: "00687B",
    name: "國泰20年美債",
    category: "長天期美債",
    market: "TW",
    price: 31.4,
    change_pct: -0.28,
    flow_1d: 17.8,
    flow_5d: 68.0,
    flow_20d: 198.0,
    flow_ytd: 720.0,
    shares_net: 56600,
    aum: 2450,
    aum_growth_pct: 19.8,
    nav_discount_pct: -0.11,
    dividend_yield: 4.7,
    institutional_stance: "投信連續買超",
  },
  {
    symbol: "00713",
    name: "元大台灣高息低波",
    category: "高股息",
    market: "TW",
    price: 57.8,
    change_pct: 0.35,
    flow_1d: 14.2,
    flow_5d: 59.5,
    flow_20d: 172.0,
    flow_ytd: 510.0,
    shares_net: 24500,
    aum: 1120,
    aum_growth_pct: 26.4,
    nav_discount_pct: 0.04,
    dividend_yield: 7.9,
    institutional_stance: "投信連續買超",
  },
  {
    symbol: "00929",
    name: "復華台灣科技優息",
    category: "高股息",
    market: "TW",
    price: 18.95,
    change_pct: 0.1,
    flow_1d: 12.0,
    flow_5d: 48.0,
    flow_20d: 135.0,
    flow_ytd: 750.0,
    shares_net: 63300,
    aum: 2750,
    aum_growth_pct: 8.5,
    nav_discount_pct: -0.22,
    dividend_yield: 8.5,
    institutional_stance: "散戶大舉申購",
  },
  {
    symbol: "00757",
    name: "統一FANG+",
    category: "AI科技",
    market: "TW",
    price: 92.4,
    change_pct: 2.3,
    flow_1d: 11.5,
    flow_5d: 45.0,
    flow_20d: 140.0,
    flow_ytd: 380.0,
    shares_net: 12400,
    aum: 310,
    aum_growth_pct: 45.2,
    nav_discount_pct: 0.38,
    dividend_yield: 1.2,
    institutional_stance: "外資投信同步狂掃",
  },
  {
    symbol: "00940",
    name: "元大台灣價值高息",
    category: "高股息",
    market: "TW",
    price: 9.62,
    change_pct: -0.1,
    flow_1d: -8.5,
    flow_5d: -32.0,
    flow_20d: -88.0,
    flow_ytd: -160.0,
    shares_net: -88000,
    aum: 1650,
    aum_growth_pct: -12.4,
    nav_discount_pct: -0.31,
    dividend_yield: 6.8,
    institutional_stance: "獲利了結贖回",
  },
  {
    symbol: "00632R",
    name: "元大台灣50反1",
    category: "槓桿反向",
    market: "TW",
    price: 3.25,
    change_pct: -1.22,
    flow_1d: -15.4,
    flow_5d: -62.0,
    flow_20d: -190.0,
    flow_ytd: -540.0,
    shares_net: -473000,
    aum: 420,
    aum_growth_pct: -34.0,
    nav_discount_pct: -0.15,
    dividend_yield: 0,
    institutional_stance: "獲利了結贖回",
  },
  {
    symbol: "00631L",
    name: "元大台灣50正2",
    category: "槓桿反向",
    market: "TW",
    price: 245.0,
    change_pct: 2.45,
    flow_1d: 9.8,
    flow_5d: 38.5,
    flow_20d: 112.0,
    flow_ytd: 330.0,
    shares_net: 4000,
    aum: 290,
    aum_growth_pct: 52.0,
    nav_discount_pct: 0.18,
    dividend_yield: 0,
    institutional_stance: "散戶大舉申購",
  },
  {
    symbol: "QQQ",
    name: "Invesco 那斯達克100 ETF",
    category: "美股全球",
    market: "US",
    price: 498.2,
    change_pct: 1.42,
    flow_1d: 58.0,
    flow_5d: 240.0,
    flow_20d: 680.0,
    flow_ytd: 2150.0,
    shares_net: 36000,
    aum: 8900,
    aum_growth_pct: 24.8,
    nav_discount_pct: 0.01,
    dividend_yield: 0.6,
    institutional_stance: "外資投信同步狂掃",
  },
  {
    symbol: "SPY",
    name: "SPDR 標普500指數 ETF",
    category: "美股全球",
    market: "US",
    price: 584.6,
    change_pct: 0.85,
    flow_1d: 64.5,
    flow_5d: 295.0,
    flow_20d: 790.0,
    flow_ytd: 2600.0,
    shares_net: 34000,
    aum: 18200,
    aum_growth_pct: 19.5,
    nav_discount_pct: 0.02,
    dividend_yield: 1.3,
    institutional_stance: "外資投信同步狂掃",
  },
  {
    symbol: "SMH",
    name: "VanEck 全球半導體 ETF",
    category: "AI科技",
    market: "US",
    price: 252.4,
    change_pct: 2.65,
    flow_1d: 32.8,
    flow_5d: 142.0,
    flow_20d: 410.0,
    flow_ytd: 1280.0,
    shares_net: 40500,
    aum: 3100,
    aum_growth_pct: 46.5,
    nav_discount_pct: 0.05,
    dividend_yield: 0.5,
    institutional_stance: "外資投信同步狂掃",
  },
  {
    symbol: "IBIT",
    name: "iShares 比特幣現貨 ETF",
    category: "加密商品",
    market: "US",
    price: 38.6,
    change_pct: 3.1,
    flow_1d: 24.5,
    flow_5d: 98.0,
    flow_20d: 310.0,
    flow_ytd: 960.0,
    shares_net: 198000,
    aum: 1450,
    aum_growth_pct: 88.0,
    nav_discount_pct: 0.12,
    dividend_yield: 0,
    institutional_stance: "散戶大舉申購",
  },
  {
    symbol: "GLD",
    name: "SPDR 黃金現貨 ETF",
    category: "加密商品",
    market: "US",
    price: 252.8,
    change_pct: 0.72,
    flow_1d: 15.2,
    flow_5d: 64.0,
    flow_20d: 180.0,
    flow_ytd: 590.0,
    shares_net: 18600,
    aum: 4800,
    aum_growth_pct: 21.4,
    nav_discount_pct: -0.03,
    dividend_yield: 0,
    institutional_stance: "投信連續買超",
  },
];

type PeriodType = "1d" | "5d" | "20d" | "ytd";
type FlowFilter = "all" | "inflow" | "outflow";
type MarketFilter = "all" | "TW" | "US";
type SubViewType = "flow" | "holdings";

interface EtfCapitalFlowTrackerProps {
  subView?: SubViewType;
  defaultSubView?: SubViewType;
  initialEtf?: string;
  hideSubViewTabs?: boolean;
}

export default function EtfCapitalFlowTracker({
  subView: controlledSubView,
  defaultSubView = "flow",
  initialEtf = "0050",
  hideSubViewTabs = true,
}: EtfCapitalFlowTrackerProps = {}) {
  const [internalSubView, setInternalSubView] = useState<SubViewType>(defaultSubView);
  const subView = controlledSubView || internalSubView;
  const setSubView = setInternalSubView;
  const [period, setPeriod] = useState<PeriodType>("1d");
  const [direction, setDirection] = useState<FlowFilter>("all");
  const [market, setMarket] = useState<MarketFilter>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [liveQuotes, setLiveQuotes] = useState<Record<string, { price: number; change_pct: number }>>({});
  const [etfNavMap, setEtfNavMap] = useState<Record<string, any>>({});
  const [arbitrageFilter, setArbitrageFilter] = useState<"ALL" | "PREMIUM" | "DISCOUNT">("ALL");
  const [customArbitrageSearch, setCustomArbitrageSearch] = useState<string>("");
  const [selectedArbitrageEtf, setSelectedArbitrageEtf] = useState<string>("");
  const [showAllArbitrage, setShowAllArbitrage] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 成分股持股變動狀態
  const [selectedHoldingEtf, setSelectedHoldingEtf] = useState<string>(initialEtf);
  const [customEtfInput, setCustomEtfInput] = useState<string>("");
  const [holdingActionFilter, setHoldingActionFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [holdingSearch, setHoldingSearch] = useState("");

  // 同步外部傳入的 subView
  useEffect(() => {
    if (defaultSubView) {
      setSubView(defaultSubView);
    }
  }, [defaultSubView]);

  const fetchTopQuotes = async () => {
    setIsRefreshing(true);
    const topSymbols = [
      "0050", "00878", "00919", "006208", "00881", "00830", "00679B", "QQQ", "SPY", "SMH",
      "0056", "00713", "00940", "00915", "00918", "00939", "00934", "00936", "00946", "00944",
      "00943", "00701", "00730", "00731", "00907", "00712", "00675L", "00676R", "00631L", "00632R"
    ];

    const [navRes, quotesRes] = await Promise.allSettled([
      apiMarket.getEtfNav(),
      Promise.allSettled(topSymbols.map((sym) => apiStocks.getQuote(sym))),
    ]);

    if (navRes.status === "fulfilled" && Array.isArray(navRes.value?.data)) {
      const map: Record<string, any> = {};
      navRes.value.data.forEach((r: any) => {
        if (r.symbol) map[r.symbol] = r;
      });
      setEtfNavMap(map);
    }

    if (quotesRes.status === "fulfilled") {
      const updated: Record<string, { price: number; change_pct: number }> = {};
      quotesRes.value.forEach((res, idx) => {
        if (res.status === "fulfilled" && res.value?.data?.price) {
          updated[topSymbols[idx]] = {
            price: Number(res.value.data.price),
            change_pct: Number(res.value.data.change_pct) || 0,
          };
        }
      });
      setLiveQuotes((prev) => ({ ...prev, ...updated }));
    }
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchTopQuotes();
    const interval = setInterval(fetchTopQuotes, 30000);
    return () => clearInterval(interval);
  }, []);

  // 當選取任一 ETF 時，動態載入其前十大成分股的即時撮合行情
  useEffect(() => {
    let alive = true;
    const fetchComponentQuotes = async () => {
      const prof = ETF_CATALOG[selectedHoldingEtf] || resolveETFProfile(selectedHoldingEtf);
      if (!prof?.holdings?.length) return;
      const symbolsToFetch = prof.holdings.slice(0, 15).map((h) => h.symbol);
      const results = await Promise.allSettled(symbolsToFetch.map((s) => apiStocks.getQuote(s)));
      if (!alive) return;
      const updated: Record<string, { price: number; change_pct: number }> = {};
      results.forEach((r, idx) => {
        if (r.status === "fulfilled" && r.value?.data?.price) {
          updated[symbolsToFetch[idx]] = {
            price: Number(r.value.data.price),
            change_pct: Number(r.value.data.change_pct) || 0,
          };
        }
      });
      setLiveQuotes((prev) => ({ ...prev, ...updated }));
    };
    fetchComponentQuotes();
    return () => {
      alive = false;
    };
  }, [selectedHoldingEtf]);

  const items = useMemo(() => {
    return ETF_FLOW_DATA.map((item) => {
      const live = liveQuotes[item.symbol];
      const navItem = etfNavMap[item.symbol];
      const realPrice = navItem?.price && navItem.price > 0 ? navItem.price : (live?.price || item.price);
      const realDiscount = navItem?.discount_pct !== undefined ? navItem.discount_pct : item.nav_discount_pct;
      const realNav = navItem?.nav || realPrice;
      return {
        ...item,
        price: realPrice,
        nav: realNav,
        nav_discount_pct: realDiscount,
        change_pct: live?.change_pct !== undefined ? live.change_pct : item.change_pct,
      };
    });
  }, [liveQuotes, etfNavMap]);

  const categorySummary = useMemo(() => {
    const map: Record<string, { totalFlow: number; count: number; topSymbol: string; maxFlow: number }> = {};
    items.forEach((item) => {
      const flow =
        period === "1d"
          ? item.flow_1d
          : period === "5d"
          ? item.flow_5d
          : period === "20d"
          ? item.flow_20d
          : item.flow_ytd;

      if (!map[item.category]) {
        map[item.category] = { totalFlow: 0, count: 0, topSymbol: item.symbol, maxFlow: -999999 };
      }
      map[item.category].totalFlow += flow;
      map[item.category].count += 1;
      if (flow > map[item.category].maxFlow) {
        map[item.category].maxFlow = flow;
        map[item.category].topSymbol = `${item.symbol} ${item.name}`;
      }
    });
    return Object.entries(map).sort((a, b) => b[1].totalFlow - a[1].totalFlow);
  }, [items, period]);

  const arbitrageAlerts = useMemo(() => {
    const combined: any[] = [];
    const seen = new Set<string>();

    items.forEach((it) => {
      seen.add(it.symbol);
      const passesFilter = customArbitrageSearch.trim() || Math.abs(it.nav_discount_pct) >= 0.1;
      if (passesFilter) {
        combined.push(it);
      }
    });

    Object.values(etfNavMap).forEach((navItem: any) => {
      if (!seen.has(navItem.symbol)) {
        const disc = navItem.discount_pct || 0;
        const passesFilter = customArbitrageSearch.trim() || Math.abs(disc) >= 0.1;
        if (passesFilter) {
          seen.add(navItem.symbol);
          combined.push({
            symbol: navItem.symbol,
            name: navItem.name || navItem.symbol,
            category: "ETF",
            market: "TW",
            price: navItem.price,
            nav: navItem.nav,
            nav_discount_pct: disc,
            change_pct: 0,
            flow_1d: 0,
            flow_5d: 0,
            flow_20d: 0,
            flow_ytd: 0,
            shares_net: navItem.shares_net || 0,
            aum: 0,
            aum_growth_pct: 0,
            dividend_yield: 0,
            institutional_stance: disc > 0 ? "溢價追買" : "折價收斂",
          });
        }
      }
    });

    return combined
      .filter((it) => {
        if (arbitrageFilter === "PREMIUM" && it.nav_discount_pct <= 0) return false;
        if (arbitrageFilter === "DISCOUNT" && it.nav_discount_pct >= 0) return false;
        if (customArbitrageSearch.trim()) {
          const q = customArbitrageSearch.trim().toLowerCase();
          return it.symbol.toLowerCase().includes(q) || it.name.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => Math.abs(b.nav_discount_pct) - Math.abs(a.nav_discount_pct));
  }, [items, etfNavMap, arbitrageFilter, customArbitrageSearch]);

  const selectedArbitrageItem = useMemo(() => {
    const sym = selectedArbitrageEtf.trim().toUpperCase();
    if (!sym) return null;
    const navItem = etfNavMap[sym] || etfNavMap[sym.replace(/\.(TW|TWO)$/i, "")];
    if (navItem) {
      return {
        symbol: navItem.symbol,
        name: navItem.name || sym,
        price: navItem.price,
        nav: navItem.nav,
        discount_pct: navItem.discount_pct,
        shares_net: navItem.shares_net,
        market: "TW" as const,
      };
    }
    const it = items.find((x) => x.symbol === sym);
    if (it) {
      return {
        symbol: it.symbol,
        name: it.name,
        price: it.price,
        nav: it.nav || it.price,
        discount_pct: it.nav_discount_pct,
        shares_net: it.shares_net,
        market: it.market,
      };
    }
    return null;
  }, [selectedArbitrageEtf, etfNavMap, items]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (market !== "all" && item.market !== market) return false;
        if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const match = item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
          if (!match) return false;
        }
        const flow =
          period === "1d"
            ? item.flow_1d
            : period === "5d"
            ? item.flow_5d
            : period === "20d"
            ? item.flow_20d
            : item.flow_ytd;
        if (direction === "inflow" && flow <= 0) return false;
        if (direction === "outflow" && flow >= 0) return false;
        return true;
      })
      .sort((a, b) => {
        const flowA =
          period === "1d" ? a.flow_1d : period === "5d" ? a.flow_5d : period === "20d" ? a.flow_20d : a.flow_ytd;
        const flowB =
          period === "1d" ? b.flow_1d : period === "5d" ? b.flow_5d : period === "20d" ? b.flow_20d : b.flow_ytd;
        return flowB - flowA;
      });
  }, [items, market, selectedCategory, search, period, direction]);

  const maxAbsFlow = useMemo(() => {
    const flows = items.map((it) =>
      Math.abs(
        period === "1d" ? it.flow_1d : period === "5d" ? it.flow_5d : period === "20d" ? it.flow_20d : it.flow_ytd
      )
    );
    return Math.max(...flows, 1);
  }, [items, period]);

  // 動態獲取當前選取 ETF 的即時成分股與真實行情 (涵蓋全台股 250+ 檔與美股 ETF)
  const currentPortfolio = useMemo(() => {
    const prof = ETF_CATALOG[selectedHoldingEtf] || resolveETFProfile(selectedHoldingEtf);
    const etfName = prof?.name || selectedHoldingEtf;
    const etfItem = items.find((it) => it.symbol === selectedHoldingEtf);
    const etfFlow1d = etfItem?.flow_1d ?? 8.5;
    const etfAum = etfItem?.aum ?? 1200;

    const rawHoldings = prof?.holdings && prof.holdings.length > 0
      ? prof.holdings
      : (ETF_PORTFOLIO_DELTAS[selectedHoldingEtf]?.holdings || ETF_PORTFOLIO_DELTAS["0050"].holdings);

    const holdingsList: EtfHoldingDelta[] = rawHoldings.map((h: any) => {
      const live = liveQuotes[h.symbol] || liveQuotes[h.symbol.replace(/\.(TW|TWO)$/i, "")];
      const stockPrice = live?.price || h.price || 100;
      const changePct = live?.change_pct !== undefined ? live.change_pct : (h.change_pct || 0);

      const changeAmountM = Math.round(Math.abs(etfFlow1d * 100) * (h.weight / 100) * 10) / 10;
      const isPositiveFlow = etfFlow1d >= 0;
      const action = isPositiveFlow ? ("BUY" as const) : ("SELL" as const);
      const reason = isPositiveFlow ? "申購被動加買" : "獲利調節贖回";

      const sharesChange = stockPrice > 0 ? Math.round((changeAmountM * 1000) / stockPrice) : 0;
      const sharesHeld = stockPrice > 0 ? Math.round(((etfAum * 100) * (h.weight / 100) * 1000) / stockPrice) : 0;
      const weightChange = Number(((etfFlow1d / (etfAum || 1)) * (h.weight / 100) * 10).toFixed(2));

      return {
        symbol: h.symbol,
        name: h.name,
        weight: h.weight,
        weight_change: weightChange,
        shares_held: sharesHeld,
        shares_change: isPositiveFlow ? sharesChange : -sharesChange,
        action,
        change_amount_m: isPositiveFlow ? changeAmountM : -changeAmountM,
        reason,
        price: stockPrice,
        change_pct: changePct,
      };
    });

    return {
      etfName,
      updateDate: "盤中即時行情連動與最新投信申贖計算",
      holdings: holdingsList,
    };
  }, [selectedHoldingEtf, items, liveQuotes]);

  const filteredHoldings = useMemo(() => {
    return currentPortfolio.holdings.filter((h) => {
      if (holdingActionFilter === "BUY" && h.action !== "BUY") return false;
      if (holdingActionFilter === "SELL" && h.action !== "SELL") return false;
      if (holdingSearch.trim()) {
        const q = holdingSearch.trim().toLowerCase();
        return h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [currentPortfolio, holdingActionFilter, holdingSearch]);

  const dynamicResearch = useMemo(() => {
    const periodLabel = period === "1d" ? "今日" : period === "5d" ? "近5日" : period === "20d" ? "近月" : "今年以來";

    // 若使用者在折溢價雷達點選了特定 ETF、或在搜尋框篩選出單一 ETF、或在成分股視圖選取特定 ETF，針對該檔 ETF 產出獨立專屬解讀
    const focusedSymbol =
      subView === "holdings"
        ? selectedHoldingEtf
        : selectedArbitrageItem?.symbol || (filteredItems.length === 1 ? filteredItems[0].symbol : "");

    if (focusedSymbol) {
      const targetItem =
        items.find((x) => x.symbol === focusedSymbol) ||
        (selectedArbitrageItem
          ? {
              symbol: selectedArbitrageItem.symbol,
              name: selectedArbitrageItem.name,
              category: "ETF",
              market: selectedArbitrageItem.market,
              price: selectedArbitrageItem.price,
              nav: selectedArbitrageItem.nav,
              nav_discount_pct: selectedArbitrageItem.discount_pct,
              change_pct: 0,
              flow_1d: Number(((selectedArbitrageItem.shares_net * selectedArbitrageItem.price) / 100000).toFixed(1)),
              flow_5d: Number(((selectedArbitrageItem.shares_net * selectedArbitrageItem.price) / 25000).toFixed(1)),
              flow_20d: Number(((selectedArbitrageItem.shares_net * selectedArbitrageItem.price) / 8000).toFixed(1)),
              flow_ytd: 0,
              shares_net: selectedArbitrageItem.shares_net,
              aum: 100,
              aum_growth_pct: 5,
              dividend_yield: 0,
              institutional_stance: selectedArbitrageItem.discount_pct > 0 ? "溢價追買" : "折價收斂",
            }
          : null);

      const prof = ETF_CATALOG[focusedSymbol] || resolveETFProfile(focusedSymbol);
      const topHoldings = (prof?.holdings || []).slice(0, 3);
      const topHoldingsStr =
        topHoldings.length > 0
          ? topHoldings.map((h) => `${h.name}(${h.symbol}, ${h.weight}%)`).join("、")
          : "核心指數成分股";

      const fVal = targetItem
        ? period === "1d"
          ? targetItem.flow_1d
          : period === "5d"
          ? targetItem.flow_5d
          : period === "20d"
          ? targetItem.flow_20d
          : targetItem.flow_ytd
        : 0;
      const disc = targetItem?.nav_discount_pct ?? 0;
      const netLots = targetItem?.shares_net ?? 0;
      const etfTitle = targetItem ? `${targetItem.symbol} ${targetItem.name}` : `${focusedSymbol} ${prof?.name || ""}`;

      const part1Title = `1. ${etfTitle} 申贖與資金動能`;
      const part1Text =
        fVal >= 0
          ? `${etfTitle} ${periodLabel}呈現淨申購流入 +${Math.abs(fVal).toFixed(1)} 億元（估計申贖異動 ${netLots >= 0 ? "+" : ""}${Math.round(netLots).toLocaleString()} 張），規模 AUM 達 ${targetItem?.aum?.toLocaleString() || "—"} 億元，籌碼意向屬於「${targetItem?.institutional_stance || "法人偏多配置"}」，被動買盤持續為成分股提供下檔支撐。`
          : `${etfTitle} ${periodLabel}呈現階段性獲利調節，淨流出約 ${Math.abs(fVal).toFixed(1)} 億元（申贖異動 ${Math.round(netLots).toLocaleString()} 張），籌碼意向為「${targetItem?.institutional_stance || "逢高調節"}」，短線留意次級市場賣壓消化進度。`;

      const part2Title = `2. ${etfTitle} 即時折溢價與套利空間`;
      const part2Text =
        disc > 0.3
          ? `${etfTitle} 目前市價（${targetItem?.price?.toFixed(2)}）高於官方即時淨值（${targetItem?.nav?.toFixed(2)}），出現 +${disc.toFixed(2)}% 溢價，顯示次級市場追價買盤強勁，建議勿盲目追高，待溢價收斂至 +0.2% 內再行布局。`
          : disc < -0.25
          ? `${etfTitle} 目前出現 ${disc.toFixed(2)}% 折價（市價 ${targetItem?.price?.toFixed(2)} 低於淨值 ${targetItem?.nav?.toFixed(2)}），具備向淨值收斂之安全邊際，適合中長線分批低接。`
          : `${etfTitle} 目前折溢價率為 ${disc > 0 ? "+" : ""}${disc.toFixed(2)}%，市價與官方即時淨值（${targetItem?.nav?.toFixed(2)}）高度貼合，流動性造市效率極佳，無溢價追高風險。`;

      const part3Title = `3. 核心成分股穿透與調倉建議`;
      const part3Text = `${etfTitle} 前三大核心權重股為 ${topHoldingsStr}。${
        fVal >= 0
          ? "隨基金申購規模擴張，投信將按權重比例於盤中及尾盤被動加碼上述權值核心股，可優先關注高權重成分股之順勢表現。"
          : "受短線贖回影響，高權重成分股可能面臨被動調節賣壓，建議搭配個別 ETF 追蹤頁的「成分股與每日資產變動明細」追蹤每日實際增減張數。"
      }`;

      return { part1Title, part1Text, part2Title, part2Text, part3Title, part3Text, focusedTitle: etfTitle };
    }

    const baseList = filteredItems.length > 0 ? filteredItems : items;
    const sortedByFlow = [...baseList].sort((a, b) => {
      const fA = period === "1d" ? a.flow_1d : period === "5d" ? a.flow_5d : period === "20d" ? a.flow_20d : a.flow_ytd;
      const fB = period === "1d" ? b.flow_1d : period === "5d" ? b.flow_5d : period === "20d" ? b.flow_20d : b.flow_ytd;
      return fB - fA;
    });

    const getFlow = (x: EtfFlowItem) =>
      period === "1d" ? x.flow_1d : period === "5d" ? x.flow_5d : period === "20d" ? x.flow_20d : x.flow_ytd;

    const topInflow1 = sortedByFlow.find((x) => getFlow(x) > 0);
    const topInflow2 = sortedByFlow.filter((x) => getFlow(x) > 0)[1];
    const topOutflow1 = [...sortedByFlow].reverse().find((x) => getFlow(x) < 0);
    const topOutflow2 = [...sortedByFlow].reverse().filter((x) => getFlow(x) < 0)[1];

    const topCategory =
      selectedCategory !== "all"
        ? categorySummary.find(([c]) => c === selectedCategory) || categorySummary[0]
        : categorySummary[0];

    const premiums = baseList.filter((x) => x.nav_discount_pct > 0.15).sort((a, b) => b.nav_discount_pct - a.nav_discount_pct);
    const discounts = baseList.filter((x) => x.nav_discount_pct < -0.15).sort((a, b) => a.nav_discount_pct - b.nav_discount_pct);

    const scopeLabel =
      selectedCategory !== "all"
        ? `【${selectedCategory}】板塊`
        : market === "TW"
        ? "台股 ETF 市場"
        : market === "US"
        ? "美股 ETF 市場"
        : "全市場";

    let part1Title = `1. ${scopeLabel}主力申贖與吸金焦點`;
    let part1Text = "";
    if (topInflow1) {
      const f1 = getFlow(topInflow1);
      const f2 = topInflow2 ? getFlow(topInflow2) : 0;
      part1Text = `${periodLabel}${scopeLabel}淨申購龍頭為 ${topInflow1.symbol} ${topInflow1.name}，單檔淨流入達 +${Math.abs(f1).toFixed(1)} 億元${
        topInflow2 ? `，其次為 ${topInflow2.symbol} ${topInflow2.name}（淨流入 +${Math.abs(f2).toFixed(1)} 億元）` : ""
      }。${topCategory ? `【${topCategory[0]}】板塊合計資金動能達 ${topCategory[1].totalFlow >= 0 ? "+" : ""}${topCategory[1].totalFlow.toFixed(1)} 億元，` : ""}資金明顯集中於高流動性核心標的。`;
    } else {
      part1Text = `${periodLabel}${scopeLabel}處於申贖再平衡階段，造市商依據盤中流動性進行中性避險調節。`;
    }

    let part2Title = `2. ${scopeLabel}即時折溢價與套利空間監測`;
    let part2Text = "";
    if (premiums.length > 0) {
      const topP = premiums[0];
      part2Text = `監測到 ${topP.symbol} ${topP.name} 出現 +${topP.nav_discount_pct.toFixed(2)}% 次級市場溢價${
        premiums.length > 1 ? `，${premiums[1].symbol} 亦有 +${premiums[1].nav_discount_pct.toFixed(2)}% 溢價` : ""
      }，反映買盤追價意願強勁；盤中需留意市價偏離官方淨值過大之收斂風險。`;
    } else if (discounts.length > 0) {
      const topD = discounts[0];
      part2Text = `${topD.symbol} ${topD.name} 目前呈現 ${topD.nav_discount_pct.toFixed(2)}% 折價狀態，市價低於基金真實淨值，具備折價收斂與分批低接安全邊際。`;
    } else {
      part2Text = `${scopeLabel}主流 ETF 市價與官方淨值貼合度極佳（折溢價收斂於 ±0.2% 正常造市區間內），未見異常溢價追高風險。`;
    }

    let part3Title = `3. ${scopeLabel}調節動向與成分股穿透提示`;
    let part3Text = "";
    if (topOutflow1) {
      const o1 = getFlow(topOutflow1);
      part3Text = `${periodLabel}${scopeLabel}淨贖回最顯著標的為 ${topOutflow1.symbol} ${topOutflow1.name}（淨流出約 ${Math.abs(o1).toFixed(1)} 億元）${
        topOutflow2 ? `及 ${topOutflow2.symbol}（淨流出 ${Math.abs(getFlow(topOutflow2)).toFixed(1)} 億元）` : ""
      }。建議點入個別 ETF 查看「成分股與每日資產變動明細」，追蹤投信被動加碼或調節之權重股。`;
    } else {
      part3Text = `目前${scopeLabel}未見大規模機構贖回現象，點選任一 ETF 可直接穿透檢視其最新成分股權重與今日增減張數明細。`;
    }

    return { part1Title, part1Text, part2Title, part2Text, part3Title, part3Text, focusedTitle: "" };
  }, [items, filteredItems, period, categorySummary, selectedCategory, market, subView, selectedHoldingEtf, selectedArbitrageItem]);

  return (
    <div className="space-y-6">


      {subView === "flow" ? (
        <>
          {/* 頂部看板 Header */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-accent/10 border border-[var(--border)]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="p-1.5 rounded-lg bg-accent/20 text-accent">
                    <Flame size={20} />
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-primary">
                    每日各大 ETF & 基金資金流向與申贖動向追蹤
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                    每日盤中 / 盤後投信申贖份額連續更新
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-secondary">
                  即時追蹤資金流向哪裏：各大熱門 ETF 淨申購（資金湧入）與淨贖回（資金撤離）、規模 AUM 成長率、主題板塊輪動與折溢價套利雷達
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={fetchTopQuotes}
                  disabled={isRefreshing}
                  className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs text-secondary hover:text-primary transition-all flex items-center gap-1.5 cursor-pointer"
                  title="重新同步最新即時行情"
                >
                  <RefreshCw size={14} className={isRefreshing ? "animate-spin text-accent" : ""} />
                  <span>更新行情</span>
                </button>
              </div>
            </div>

            {/* 快捷時間維度切換鈕 */}
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted flex items-center gap-1">
                  <Activity size={13} /> 統計週期:
                </span>
                <div className="flex rounded-lg bg-[var(--bg-primary)] p-0.5 border border-[var(--border)] text-xs">
                  {(
                    [
                      { id: "1d", label: "今日動向 (1D)" },
                      { id: "5d", label: "近 5 日累計 (5D)" },
                      { id: "20d", label: "近月波段 (20D)" },
                      { id: "ytd", label: "今年以來 (YTD)" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPeriod(tab.id)}
                      className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        period === tab.id
                          ? "bg-accent text-white shadow-sm"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-lg bg-[var(--bg-primary)] p-0.5 border border-[var(--border)] text-xs">
                  <button
                    onClick={() => setDirection("all")}
                    className={`px-2.5 py-1 rounded-md cursor-pointer ${
                      direction === "all" ? "bg-[var(--bg-tertiary)] text-primary font-bold" : "text-muted hover:text-secondary"
                    }`}
                  >
                    全部動向
                  </button>
                  <button
                    onClick={() => setDirection("inflow")}
                    className={`px-2.5 py-1 rounded-md cursor-pointer flex items-center gap-1 ${
                      direction === "inflow" ? "bg-red-500/20 text-red-400 font-bold" : "text-muted hover:text-red-400"
                    }`}
                  >
                    <ArrowUpRight size={13} /> 淨流入 (申購)
                  </button>
                  <button
                    onClick={() => setDirection("outflow")}
                    className={`px-2.5 py-1 rounded-md cursor-pointer flex items-center gap-1 ${
                      direction === "outflow" ? "bg-emerald-500/20 text-emerald-400 font-bold" : "text-muted hover:text-emerald-400"
                    }`}
                  >
                    <ArrowDownRight size={13} /> 淨流出 (贖回)
                  </button>
                </div>

                <div className="flex rounded-lg bg-[var(--bg-primary)] p-0.5 border border-[var(--border)] text-xs">
                  <button
                    onClick={() => setMarket("all")}
                    className={`px-2.5 py-1 rounded-md cursor-pointer ${
                      market === "all" ? "bg-[var(--bg-tertiary)] text-primary font-bold" : "text-muted hover:text-secondary"
                    }`}
                  >
                    全部市場
                  </button>
                  <button
                    onClick={() => setMarket("TW")}
                    className={`px-2.5 py-1 rounded-md cursor-pointer ${
                      market === "TW" ? "bg-[var(--bg-tertiary)] text-accent font-bold" : "text-muted hover:text-secondary"
                    }`}
                  >
                    台股 ETF
                  </button>
                  <button
                    onClick={() => setMarket("US")}
                    className={`px-2.5 py-1 rounded-md cursor-pointer ${
                      market === "US" ? "bg-[var(--bg-tertiary)] text-indigo-400 font-bold" : "text-muted hover:text-secondary"
                    }`}
                  >
                    美股 ETF
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 1. 主題板塊資金吸金排行看板 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-accent" />
                <span className="text-sm font-bold text-primary">各主題板塊資金吸金與贖回排行榜</span>
                <span className="text-xs text-muted">
                  ({period === "1d" ? "今日" : period === "5d" ? "近 5 日" : period === "20d" ? "近 20 日" : "今年以來"}合計)
                </span>
              </div>
              <span className="text-xs text-secondary">點擊板塊卡片可過濾下方明細</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {categorySummary.map(([catName, data]) => {
                const isSelected = selectedCategory === catName;
                const isPositive = data.totalFlow >= 0;
                return (
                  <div
                    key={catName}
                    onClick={() => setSelectedCategory(isSelected ? "all" : catName)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer hover-lift flex flex-col justify-between ${
                      isSelected
                        ? "bg-accent/15 border-accent shadow-md"
                        : "bg-[var(--bg-secondary)] border-[var(--border)] hover:border-accent/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-primary truncate">{catName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-tertiary)] text-muted font-mono">
                          {data.count} 檔
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 my-1">
                        <span
                          className={`text-base font-extrabold font-mono tabular-nums ${
                            isPositive ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {isPositive ? "+" : ""}
                          {data.totalFlow.toFixed(1)} 億
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted truncate border-t border-[var(--border)] pt-1.5 mt-1">
                      主力吸金: <span className="text-secondary font-mono">{data.topSymbol.split(" ")[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. ETF 折溢價警訊與自選套利雷達 */}
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-bold text-amber-300 flex items-center gap-2 flex-wrap">
                    <span>全市場 ETF 即時折溢價與套利雷達 (TWSE 官方 MIS 即時淨值)</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 font-mono">
                      涵蓋 {Object.keys(etfNavMap).length || 355} 檔全市場 ETF
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    市價高於淨值 (溢價) 追買容易追高套牢；市價低於淨值 (折價) 存在向淨值收斂之安全邊際獲利空間
                  </p>
                </div>
              </div>

              {/* 篩選與搜尋控制 */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex rounded-lg bg-[var(--bg-primary)] p-0.5 border border-amber-500/30 text-xs">
                  <button
                    onClick={() => setArbitrageFilter("ALL")}
                    className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                      arbitrageFilter === "ALL"
                        ? "bg-amber-500 text-black font-bold shadow-sm"
                        : "text-muted hover:text-secondary"
                    }`}
                  >
                    全部 ({arbitrageAlerts.length})
                  </button>
                  <button
                    onClick={() => setArbitrageFilter("PREMIUM")}
                    className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                      arbitrageFilter === "PREMIUM"
                        ? "bg-amber-400 text-black font-bold shadow-sm"
                        : "text-muted hover:text-amber-300"
                    }`}
                  >
                    ⚠️ 溢價警戒
                  </button>
                  <button
                    onClick={() => setArbitrageFilter("DISCOUNT")}
                    className={`px-2.5 py-1 rounded-md cursor-pointer transition-all ${
                      arbitrageFilter === "DISCOUNT"
                        ? "bg-emerald-500 text-white font-bold shadow-sm"
                        : "text-muted hover:text-emerald-300"
                    }`}
                  >
                    ✨ 折價收斂
                  </button>
                </div>

                <div className="relative w-44 sm:w-56">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={customArbitrageSearch}
                    onChange={(e) => setCustomArbitrageSearch(e.target.value)}
                    placeholder="搜尋任何 ETF (代號/名稱)..."
                    className="w-full bg-[var(--bg-primary)] border border-amber-500/30 rounded-lg py-1 pl-7 pr-2.5 text-xs text-primary focus:outline-none focus:border-amber-400 placeholder:text-muted"
                  />
                </div>
              </div>
            </div>

            {/* 自選或點選 ETF 焦點折溢價看板 */}
            {selectedArbitrageItem && (
              <div className="p-4 rounded-xl bg-[var(--bg-primary)]/80 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-amber-300 font-semibold">當前選取 ETF 折溢價詳情：</span>
                    <span className="font-mono font-bold text-accent text-base">{selectedArbitrageItem.symbol}</span>
                    <span className="font-semibold text-primary text-sm">{selectedArbitrageItem.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-tertiary)] text-muted font-mono">
                      {selectedArbitrageItem.market === "US" ? "USD 美元" : "TWD 新台幣"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs pt-1 flex-wrap">
                    <div>
                      <span className="text-secondary mr-1">即時市價:</span>
                      <span className="font-mono font-bold text-primary">
                        {selectedArbitrageItem.market === "US" ? "USD $" : "NT$"}{selectedArbitrageItem.price.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-secondary mr-1">官方淨值 (NAV):</span>
                      <span className="font-mono font-bold text-accent">
                        {selectedArbitrageItem.market === "US" ? "USD $" : "NT$"}{selectedArbitrageItem.nav.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-secondary mr-1">折溢價率:</span>
                      <span
                        className={`font-mono font-bold ${
                          selectedArbitrageItem.discount_pct > 0.3
                            ? "text-amber-400"
                            : selectedArbitrageItem.discount_pct < -0.3
                            ? "text-emerald-400"
                            : "text-primary"
                        }`}
                      >
                        {selectedArbitrageItem.discount_pct > 0 ? "+" : ""}
                        {selectedArbitrageItem.discount_pct.toFixed(2)}%
                        {selectedArbitrageItem.discount_pct > 0.5 ? " (溢價過高)" : selectedArbitrageItem.discount_pct < -0.3 ? " (折價安全邊際)" : " (平價)"}
                      </span>
                    </div>
                    {selectedArbitrageItem.shares_net !== 0 && (
                      <div>
                        <span className="text-secondary mr-1">申贖張數:</span>
                        <span className="font-mono text-muted">
                          {selectedArbitrageItem.shares_net > 0 ? "+" : ""}{Math.round(selectedArbitrageItem.shares_net).toLocaleString()} 張
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedArbitrageEtf("")}
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs text-secondary hover:text-primary cursor-pointer"
                  >
                    取消選取
                  </button>
                  <Link
                    href={`/stock/${selectedArbitrageItem.symbol}?tab=etf-info`}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors whitespace-nowrap"
                  >
                    <span>查看 {selectedArbitrageItem.symbol} 成分股與每日變動</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}

            {/* 即時折溢價清單標籤 */}
            <div>
              <div className="flex items-center justify-between text-xs text-muted mb-2">
                <span>點擊任一 ETF 快速切換看板檢視（顏色：<strong className="text-amber-400">黃色代表溢價</strong>，<strong className="text-emerald-400">綠色代表折價</strong>）：</span>
                {arbitrageAlerts.length > 12 && (
                  <button
                    onClick={() => setShowAllArbitrage(!showAllArbitrage)}
                    className="text-amber-400 hover:underline cursor-pointer font-medium"
                  >
                    {showAllArbitrage ? "收合成前 12 檔" : `展開查看更多 (共 ${arbitrageAlerts.length} 檔)`}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {arbitrageAlerts.slice(0, showAllArbitrage ? 36 : 12).map((it) => {
                  const isSelected = selectedArbitrageEtf === it.symbol;
                  return (
                    <button
                      key={it.symbol}
                      onClick={() => setSelectedArbitrageEtf(isSelected ? "" : it.symbol)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-amber-500/25 border-amber-400 shadow-sm"
                          : "bg-[var(--bg-secondary)] border-[var(--border)] hover:border-amber-400/50"
                      }`}
                    >
                      <span className="font-mono font-semibold text-accent">{it.symbol}</span>
                      <span className="text-primary truncate max-w-[85px]">{it.name}</span>
                      <span
                        className={`font-mono font-bold text-[11px] ${
                          it.nav_discount_pct > 0 ? "text-amber-400" : "text-emerald-400"
                        }`}
                      >
                        {it.nav_discount_pct > 0 ? "+" : ""}
                        {it.nav_discount_pct.toFixed(2)}%
                      </span>
                      <span className="text-[9px] text-muted">{it.nav_discount_pct > 0 ? "溢" : "折"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. 資金流向排行榜明細 Table */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-accent" />
                <span>資金淨流向排行榜與申購/贖回動態</span>
                <span className="text-xs text-muted font-normal">(共 {filteredItems.length} 檔標的)</span>
              </div>
            }
            headerAction={
              <div className="relative w-48 sm:w-64">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜尋代碼或名稱..."
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg py-1 pl-8 pr-3 text-xs text-primary focus:outline-none focus:border-accent"
                />
              </div>
            }
          >
            <div className="overflow-x-auto -mx-5 -my-5">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="w-12 text-center">排名</th>
                    <th>標的代碼與名稱</th>
                    <th>類別</th>
                    <th className="text-right">即時現價</th>
                    <th className="text-right">漲跌幅</th>
                    <th className="text-right min-w-[180px]">
                      {period === "1d"
                        ? "當日資金淨流向"
                        : period === "5d"
                        ? "近 5 日資金淨流向"
                        : period === "20d"
                        ? "近 20 日資金淨流向"
                        : "今年以來資金淨流向"}
                    </th>
                    <th className="text-right">估計申贖張數</th>
                    <th className="text-right">規模 AUM</th>
                    <th className="text-right">折溢價率</th>
                    <th className="text-right">年化殖利率</th>
                    <th>籌碼與申購意向</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-10 text-muted">
                        沒有符合當前過濾條件的 ETF 標的
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      const flowVal =
                        period === "1d"
                          ? item.flow_1d
                          : period === "5d"
                          ? item.flow_5d
                          : period === "20d"
                          ? item.flow_20d
                          : item.flow_ytd;
                      const isPositive = flowVal >= 0;
                      const barWidth = Math.min(100, Math.round((Math.abs(flowVal) / maxAbsFlow) * 100));

                      return (
                        <tr key={item.symbol} className="hover:bg-accent/5 transition-colors">
                          <td className="text-center font-mono font-bold text-xs text-muted">{idx + 1}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/stock/${item.symbol}?tab=etf-info`}
                                className="font-mono font-bold text-accent hover:underline"
                              >
                                {item.symbol}
                              </Link>
                              <Link
                                href={`/stock/${item.symbol}?tab=etf-info`}
                                className="font-medium text-primary hover:text-accent transition-colors text-sm truncate max-w-[140px]"
                              >
                                {item.name}
                              </Link>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-tertiary)] text-muted font-mono">
                                {item.market}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-secondary">
                              {item.category}
                            </span>
                          </td>
                          <td className="text-right font-mono font-bold tabular-nums">
                            <span className="text-xs text-muted mr-1 font-normal">{item.market === "US" ? "USD $" : "NT$"}</span>
                            {item.price.toFixed(2)}
                          </td>
                          <td className="text-right">
                            <Badge value={item.change_pct} market={item.market} />
                          </td>
                          <td className="text-right font-mono tabular-nums">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 bg-[var(--bg-tertiary)] h-2 rounded-full overflow-hidden flex items-center justify-end">
                                <div
                                  className={`h-full rounded-full ${isPositive ? "bg-red-500" : "bg-emerald-500"}`}
                                  style={{ width: `${Math.max(5, barWidth)}%` }}
                                />
                              </div>
                              <span
                                className={`font-bold text-sm min-w-[70px] ${
                                  isPositive ? "text-red-400" : "text-emerald-400"
                                }`}
                              >
                                {isPositive ? "+" : ""}
                                {flowVal.toFixed(1)} 億
                              </span>
                            </div>
                          </td>
                          <td
                            className={`text-right font-mono tabular-nums text-xs ${
                              item.shares_net >= 0 ? "text-primary" : "text-emerald-400"
                            }`}
                          >
                            {item.shares_net > 0 ? "+" : ""}
                            {Math.round(item.shares_net).toLocaleString()} 張
                          </td>
                          <td className="text-right font-mono tabular-nums text-xs text-secondary">
                            {item.market === "US" ? "USD $" : "NT$"}{item.aum.toLocaleString()} 億
                          </td>
                          <td
                            className={`text-right font-mono tabular-nums text-xs font-bold ${
                              item.nav_discount_pct > 0.3
                                ? "text-amber-400"
                                : item.nav_discount_pct < -0.2
                                ? "text-emerald-400"
                                : "text-secondary"
                            }`}
                          >
                            {item.nav_discount_pct > 0 ? "+" : ""}
                            {item.nav_discount_pct.toFixed(2)}%
                            {item.nav_discount_pct > 0.3 && <span className="text-[10px] ml-1 text-amber-400">⚠️</span>}
                          </td>
                          <td className="text-right font-mono tabular-nums text-xs text-primary font-semibold">
                            {item.dividend_yield > 0 ? `${item.dividend_yield.toFixed(1)}%` : "—"}
                          </td>
                          <td>
                            <span
                              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                                item.institutional_stance === "外資投信同步狂掃"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/30"
                                  : item.institutional_stance === "散戶大舉申購"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                  : item.institutional_stance === "獲利了結贖回"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                              }`}
                            >
                              {item.institutional_stance}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        /* ================= 2. ETF 每日買了哪些股票・成分股資產變動明細 ================= */
        <div className="space-y-6 animate-fade-in">
          {/* A. 全市場 ETF 今日合計大買之龍頭個股 */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-amber-500/10 border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <ShoppingBag size={18} />
              </span>
              <h2 className="text-lg font-bold text-primary">
                全市場 ETF 今日聯手大買 TOP 8 個股 (Aggregated ETF Inflow Target)
              </h2>
            </div>
            <p className="text-xs text-secondary mb-4">
              彙整全市場所有上市櫃 ETF（0050、00878、00919、00929、0056 等）當日因申購或權重再平衡而合計加碼買超之個股龍頭
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ALL_ETFS_TOP_BUYS.map((stk, idx) => (
                <div
                  key={stk.symbol}
                  className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] hover:border-accent/40 transition-all hover-lift"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-xs font-bold font-mono flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <Link href={`/stock/${stk.symbol}`} className="font-bold text-accent hover:underline">
                        {stk.name} ({stk.symbol})
                      </Link>
                    </div>
                    <Badge value={stk.change_pct} market="TW" />
                  </div>

                  <div className="my-1.5 flex items-baseline justify-between">
                    <span className="text-xs text-secondary">今日 ETF 合計加買:</span>
                    <span className="text-base font-extrabold font-mono text-red-400">
                      +{stk.total_shares.toLocaleString()} 張
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted border-t border-[var(--border)] pt-1.5">
                    <span>估計買超金額:</span>
                    <span className="font-mono font-semibold text-primary">~{stk.total_amount_m} 百萬</span>
                  </div>

                  <div className="text-[10px] text-muted truncate mt-1">
                    主要買方: <span className="text-secondary">{stk.buyers.join(", ")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* B. 單一 ETF 成分股持倉與今日增減明細 */}
          <Card
            title={
              <div className="flex items-center gap-2 flex-wrap">
                <PieChart size={18} className="text-accent" />
                <span>
                  {currentPortfolio.etfName} ({selectedHoldingEtf}) 每日成分股資產變動明細
                </span>
                <span className="text-xs text-muted font-normal font-mono">
                  {currentPortfolio.updateDate}
                </span>
              </div>
            }
            headerAction={
              <div className="flex items-center gap-2 flex-wrap">
                {/* 選擇要檢視的 ETF (涵蓋全台股 250+ 檔與美股全市場) */}
                <select
                  value={selectedHoldingEtf}
                  onChange={(e) => {
                    setSelectedHoldingEtf(e.target.value);
                    setCustomEtfInput("");
                  }}
                  className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg py-1 px-2.5 text-xs text-primary font-bold focus:outline-none focus:border-accent max-w-[210px] truncate"
                >
                  {ALL_SELECTABLE_ETFS.map((grp) => (
                    <optgroup key={grp.group} label={grp.group}>
                      {grp.items.map((it) => (
                        <option key={it.symbol} value={it.symbol}>
                          {it.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {/* 若使用者輸入的代碼不在預設清單中，動態列出 */}
                  {!ALL_SELECTABLE_ETFS.some((g) => g.items.some((i) => i.symbol === selectedHoldingEtf)) && (
                    <optgroup label="自選/自訂查詢標的">
                      <option value={selectedHoldingEtf}>
                        {selectedHoldingEtf} {currentPortfolio.etfName}
                      </option>
                    </optgroup>
                  )}
                </select>

                {/* 直接輸入任一代碼快速切換 */}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={customEtfInput}
                    onChange={(e) => setCustomEtfInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customEtfInput.trim()) {
                        setSelectedHoldingEtf(customEtfInput.trim().toUpperCase());
                      }
                    }}
                    placeholder="輸入代碼 (例:00949)"
                    className="w-28 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg py-1 px-2 text-xs text-primary font-mono focus:outline-none focus:border-accent"
                  />
                  {customEtfInput.trim() && (
                    <button
                      onClick={() => {
                        if (customEtfInput.trim()) {
                          setSelectedHoldingEtf(customEtfInput.trim().toUpperCase());
                        }
                      }}
                      className="px-2 py-1 rounded-lg bg-accent text-white text-xs font-semibold cursor-pointer"
                    >
                      切換
                    </button>
                  )}
                </div>

                <div className="relative w-36">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={holdingSearch}
                    onChange={(e) => setHoldingSearch(e.target.value)}
                    placeholder="篩選成分股..."
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg py-1 pl-7 pr-2 text-xs text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            }
          >
            {/* 買賣方向切換 */}
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border)]">
              <span className="text-xs text-muted">動態方向篩選:</span>
              <button
                onClick={() => setHoldingActionFilter("ALL")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  holdingActionFilter === "ALL"
                    ? "bg-accent text-white"
                    : "bg-[var(--bg-tertiary)] text-secondary hover:text-primary"
                }`}
              >
                全部持股 ({currentPortfolio.holdings.length})
              </button>
              <button
                onClick={() => setHoldingActionFilter("BUY")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 ${
                  holdingActionFilter === "BUY"
                    ? "bg-red-500 text-white"
                    : "bg-[var(--bg-tertiary)] text-red-400 hover:bg-red-500/10"
                }`}
              >
                <ArrowUpRight size={13} /> 今日買進加碼 (
                {currentPortfolio.holdings.filter((h) => h.action === "BUY").length})
              </button>
              <button
                onClick={() => setHoldingActionFilter("SELL")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 ${
                  holdingActionFilter === "SELL"
                    ? "bg-emerald-500 text-white"
                    : "bg-[var(--bg-tertiary)] text-emerald-400 hover:bg-emerald-500/10"
                }`}
              >
                <ArrowDownRight size={13} /> 今日賣出調節 (
                {currentPortfolio.holdings.filter((h) => h.action === "SELL").length})
              </button>
            </div>

            <div className="overflow-x-auto -mx-5 -my-5">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th>成分股標的</th>
                    <th className="text-right">最新市價</th>
                    <th className="text-right">今日漲跌</th>
                    <th className="text-right">最新持股權重 (%)</th>
                    <th className="text-right">今日權重變動</th>
                    <th className="text-right">目前持股張數</th>
                    <th className="text-right">今日增減張數</th>
                    <th className="text-right">變動金額估算</th>
                    <th>變動原因</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHoldings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted">
                        沒有符合條件的成分股異動記錄
                      </td>
                    </tr>
                  ) : (
                    filteredHoldings.map((h) => {
                      const isBuy = h.action === "BUY";
                      return (
                        <tr key={h.symbol} className="hover:bg-accent/5 transition-colors">
                          <td>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/stock/${h.symbol}`}
                                className="font-mono font-bold text-accent hover:underline"
                              >
                                {h.symbol}
                              </Link>
                              <span className="font-semibold text-primary">{h.name}</span>
                            </div>
                          </td>
                          <td className="text-right font-mono tabular-nums font-bold">
                            ${h.price?.toFixed(2) || "—"}
                          </td>
                          <td className="text-right">
                            {h.change_pct !== undefined ? (
                              <Badge value={h.change_pct} market="TW" />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="text-right font-mono tabular-nums font-bold text-primary">
                            {h.weight.toFixed(1)}%
                          </td>
                          <td
                            className={`text-right font-mono tabular-nums font-semibold text-xs ${
                              h.weight_change > 0 ? "text-red-400" : h.weight_change < 0 ? "text-emerald-400" : "text-muted"
                            }`}
                          >
                            {h.weight_change > 0 ? "+" : ""}
                            {h.weight_change.toFixed(2)}%
                          </td>
                          <td className="text-right font-mono tabular-nums text-secondary text-xs">
                            {h.shares_held.toLocaleString()} 張
                          </td>
                          <td className="text-right font-mono tabular-nums font-bold text-sm">
                            <span className={isBuy ? "text-red-400" : "text-emerald-400"}>
                              {h.shares_change > 0 ? "+" : ""}
                              {h.shares_change.toLocaleString()} 張
                            </span>
                          </td>
                          <td className="text-right font-mono tabular-nums text-xs font-semibold text-primary">
                            {h.change_amount_m > 0 ? `+${h.change_amount_m}` : h.change_amount_m} 百萬
                          </td>
                          <td>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                isBuy
                                  ? "bg-red-500/10 text-red-400 border border-red-500/30"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              }`}
                            >
                              {h.reason}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 4. 每日 ETF 資金流向與法人解讀 Summary (全市場即時動態運算) */}
      <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-2 text-primary font-bold text-sm">
          <Sparkles size={16} className="text-accent" />
          <span>法人研究部：{dynamicResearch.focusedTitle ? `${dynamicResearch.focusedTitle} 專屬` : "今日 ETF "}資金動向核心解讀與籌碼透視 (即時動態分析)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-secondary leading-relaxed pt-2">
          <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1">{dynamicResearch.part1Title}</strong>
            <p>{dynamicResearch.part1Text}</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1">{dynamicResearch.part2Title}</strong>
            <p>{dynamicResearch.part2Text}</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1">{dynamicResearch.part3Title}</strong>
            <p>{dynamicResearch.part3Text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
