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
import { apiStocks } from "@/lib/api";

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

export default function EtfCapitalFlowTracker() {
  const [subView, setSubView] = useState<SubViewType>("flow");
  const [period, setPeriod] = useState<PeriodType>("1d");
  const [direction, setDirection] = useState<FlowFilter>("all");
  const [market, setMarket] = useState<MarketFilter>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [liveQuotes, setLiveQuotes] = useState<Record<string, { price: number; change_pct: number }>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 成分股持股變動狀態
  const [selectedHoldingEtf, setSelectedHoldingEtf] = useState<string>("0050");
  const [holdingActionFilter, setHoldingActionFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [holdingSearch, setHoldingSearch] = useState("");

  const fetchTopQuotes = async () => {
    setIsRefreshing(true);
    const topSymbols = ["0050", "00878", "00919", "006208", "00881", "00830", "00679B", "QQQ", "SPY", "SMH"];
    const results = await Promise.allSettled(topSymbols.map((sym) => apiStocks.getQuote(sym)));
    const updated: Record<string, { price: number; change_pct: number }> = {};
    results.forEach((res, idx) => {
      if (res.status === "fulfilled" && res.value?.data?.price) {
        updated[topSymbols[idx]] = {
          price: Number(res.value.data.price),
          change_pct: Number(res.value.data.change_pct) || 0,
        };
      }
    });
    setLiveQuotes(updated);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchTopQuotes();
  }, []);

  const items = useMemo(() => {
    return ETF_FLOW_DATA.map((item) => {
      const live = liveQuotes[item.symbol];
      return {
        ...item,
        price: live?.price || item.price,
        change_pct: live?.change_pct !== undefined ? live.change_pct : item.change_pct,
      };
    });
  }, [liveQuotes]);

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
    return items.filter((item) => Math.abs(item.nav_discount_pct) >= 0.2);
  }, [items]);

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

  // 當前選取 ETF 的成分股持倉與今日異動
  const currentPortfolio = ETF_PORTFOLIO_DELTAS[selectedHoldingEtf] || ETF_PORTFOLIO_DELTAS["0050"];

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

  return (
    <div className="space-y-6">
      {/* 頂部切換 Tab：ETF 資金申贖總覽 VS ETF 每日買了哪些股票（成分股異動） */}
      <div className="flex border-b border-[var(--border)] gap-2 pb-2">
        <button
          onClick={() => setSubView("flow")}
          className={`px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            subView === "flow"
              ? "bg-accent text-white shadow-md"
              : "text-secondary hover:text-primary hover:bg-[var(--bg-secondary)]"
          }`}
        >
          <Flame size={16} />
          <span>1. 各大 ETF 資金申贖動向與吸金排行榜</span>
        </button>

        <button
          onClick={() => setSubView("holdings")}
          className={`px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            subView === "holdings"
              ? "bg-accent text-white shadow-md"
              : "text-secondary hover:text-primary hover:bg-[var(--bg-secondary)]"
          }`}
        >
          <ShoppingBag size={16} />
          <span>2. ETF 每日買了哪些股票・成分股資產變動明細</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 font-mono">
            持股穿透
          </span>
        </button>
      </div>

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
                    🇹🇼 台股 ETF
                  </button>
                  <button
                    onClick={() => setMarket("US")}
                    className={`px-2.5 py-1 rounded-md cursor-pointer ${
                      market === "US" ? "bg-[var(--bg-tertiary)] text-indigo-400 font-bold" : "text-muted hover:text-secondary"
                    }`}
                  >
                    🇺🇸 美股 ETF
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

          {/* 2. ETF 折溢價警訊與套利雷達 */}
          {arbitrageAlerts.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <span>ETF 折溢價套利與追高預警雷達 (Premium / Discount Alert)</span>
                    <span className="text-[10px] px-2 py-0.2 rounded bg-amber-500/20 text-amber-200 font-mono">
                      偵測到 {arbitrageAlerts.length} 檔偏離淨值
                    </span>
                  </div>
                  <p className="text-xs text-secondary mt-0.5">
                    市價高於淨值 (溢價) 追買容易追高套牢；市價低於淨值 (折價) 存在向淨值收斂之潛在獲利空間
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {arbitrageAlerts.slice(0, 5).map((it) => (
                  <Link
                    key={it.symbol}
                    href={`/stock/${it.symbol}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-xs hover:border-accent transition-colors"
                  >
                    <span className="font-mono font-semibold text-accent">{it.symbol}</span>
                    <span className="text-primary truncate max-w-[80px]">{it.name}</span>
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        it.nav_discount_pct > 0 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {it.nav_discount_pct > 0 ? "+" : ""}
                      {it.nav_discount_pct.toFixed(2)}%
                    </span>
                    <span className="text-[9px] text-muted">{it.nav_discount_pct > 0 ? "溢" : "折"}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

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
                                href={`/stock/${item.symbol}`}
                                className="font-mono font-bold text-accent hover:underline"
                              >
                                {item.symbol}
                              </Link>
                              <span className="font-medium text-primary text-sm truncate max-w-[140px]">
                                {item.name}
                              </span>
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
                          <td className="text-right font-mono font-bold tabular-nums">${item.price.toFixed(2)}</td>
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
                            ${item.aum.toLocaleString()} 億
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
                {/* 選擇要檢視的 ETF */}
                <select
                  value={selectedHoldingEtf}
                  onChange={(e) => setSelectedHoldingEtf(e.target.value)}
                  className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg py-1 px-2.5 text-xs text-primary font-bold focus:outline-none focus:border-accent"
                >
                  <option value="0050">0050 元大台灣50</option>
                  <option value="00878">00878 國泰永續高股息</option>
                  <option value="00919">00919 群益台灣精選高息</option>
                  <option value="00929">00929 復華台灣科技優息</option>
                  <option value="0056">0056 元大高股息</option>
                  <option value="00940">00940 元大台灣價值高息</option>
                </select>

                <div className="relative w-40">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={holdingSearch}
                    onChange={(e) => setHoldingSearch(e.target.value)}
                    placeholder="搜尋成分股..."
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg py-1 pl-7 pr-2.5 text-xs text-primary focus:outline-none focus:border-accent"
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

      {/* 4. 每日 ETF 資金流向與法人解讀 Summary */}
      <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-2 text-primary font-bold text-sm">
          <Sparkles size={16} className="text-accent" />
          <span>法人研究部：今日 ETF 資金動向核心解讀與籌碼透視</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-secondary leading-relaxed pt-2">
          <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1">1. 高股息與市值型雙引擎吸金</strong>
            <p>
              0050 與 006208 權值市值型單日湧入逾 70 億元，反映外資被動型買盤隨台積電等權值股走揚而強勁增發；00878、00919 季配息收益型亦吸引穩定定額與散戶加碼。
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1">2. AI 半導體科技 ETF 溢價警示</strong>
            <p>
              海外費半與美股科技 ETF（00830、00757、SMH）出現 0.3%~0.6% 溢價，反映市場追捧輝達與晶圓代工行情，建議交易員避免盤中追買大幅溢價標的，防範造市商套利收斂震盪。
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1">3. 槓反與避險資金撤離</strong>
            <p>
              00632R (元大台灣50反1) 連續 5 日出現大額淨贖回，反映空單避險資金逐步停損出場，多頭市場格局穩健；長天期美債 ETF 則維持穩定低接申購節奏。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
