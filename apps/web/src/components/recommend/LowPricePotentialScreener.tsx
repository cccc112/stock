"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Star,
  ExternalLink,
  ShieldCheck,
  Activity,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { apiStocks } from "@/lib/api";
import {
  isSymbolInWatchlist,
  addSymbolToWatchlist,
  removeSymbolFromWatchlist,
} from "@/hooks/useWatchlist";

export interface LowPriceStockItem {
  symbol: string;
  name: string;
  industry: string;
  price: number;
  change_pct: number;
  volume: number; // 張
  volume_mult: number; // 較月均量放大倍數
  pbr: number; // 股價淨值比
  per: number | null; // 本益比
  pattern: "底部放量突破" | "均線多頭排列" | "布林通道壓縮" | "營運轉虧為盈" | "法人主力吸籌";
  category: string;
  signals: string[];
  score_total: number; // 綜合潛力評分 0~100
  score_tech: number; // 技術面評分
  score_turnaround: number; // 轉機潛力評分
  score_chips: number; // 籌碼評分
  entry_zone: [number, number]; // 建議進場區間
  stop_loss: number; // 停損價
  target_price: number; // 目標價
  upside_pct: number; // 潛在上檔空間 %
}

// 精選 24 檔具備技術形態突破與轉機基本面之低價潛力股票資料庫
const LOW_PRICE_POTENTIAL_SEEDS: LowPriceStockItem[] = [
  {
    symbol: "2409",
    name: "友達",
    industry: "光電面板",
    price: 16.2,
    change_pct: 1.25,
    volume: 58200,
    volume_mult: 2.6,
    pbr: 0.68,
    per: null,
    pattern: "營運轉虧為盈",
    category: "面板與車用座艙轉型",
    signals: ["MicroLED 與車用顯示比重升至 28%", "單季毛利率回升轉正", "PBR 0.68 具實質資產防守", "外資近 5 日回補 3.2 萬張"],
    score_total: 91,
    score_tech: 88,
    score_turnaround: 94,
    score_chips: 89,
    entry_zone: [15.8, 16.5],
    stop_loss: 14.8,
    target_price: 21.5,
    upside_pct: 32.7,
  },
  {
    symbol: "3481",
    name: "群創",
    industry: "光電面板",
    price: 15.5,
    change_pct: 1.95,
    volume: 64800,
    volume_mult: 3.1,
    pbr: 0.62,
    per: null,
    pattern: "底部放量突破",
    category: "先進封裝 FOPLP 轉型",
    signals: ["面板級扇出型封裝 (FOPLP) 切入半導體量產", "南科廠資產活化利益挹注", "PBR 0.62 位於歷史極限低檔", "投信連續買超加碼"],
    score_total: 93,
    score_tech: 92,
    score_turnaround: 95,
    score_chips: 90,
    entry_zone: [15.0, 15.8],
    stop_loss: 14.2,
    target_price: 20.8,
    upside_pct: 34.2,
  },
  {
    symbol: "6116",
    name: "彩晶",
    industry: "光電零組件",
    price: 9.85,
    change_pct: 0.82,
    volume: 18500,
    volume_mult: 2.2,
    pbr: 0.58,
    per: null,
    pattern: "布林通道壓縮",
    category: "超低價銅板股",
    signals: ["股價低於 10 元票面價值", "工控與醫療高毛利訂單回溫", "日 KD 低檔 25 黃金交叉", "波動率壓縮至近 1 年低點"],
    score_total: 86,
    score_tech: 87,
    score_turnaround: 84,
    score_chips: 86,
    entry_zone: [9.5, 10.0],
    stop_loss: 9.1,
    target_price: 12.8,
    upside_pct: 29.9,
  },
  {
    symbol: "2401",
    name: "凌陽",
    industry: "半導體 IC 設計",
    price: 28.5,
    change_pct: 2.15,
    volume: 14200,
    volume_mult: 2.8,
    pbr: 1.15,
    per: 19.5,
    pattern: "均線多頭排列",
    category: "車用 IC 與邊緣運算",
    signals: ["車載資訊娛樂 Display SoC 市佔擴張", "20MA 穿過 60MA 形成黃金交叉", "單月營收年增 24.5%", "主力籌碼集中度連續 5 日提升"],
    score_total: 90,
    score_tech: 93,
    score_turnaround: 89,
    score_chips: 88,
    entry_zone: [27.8, 29.0],
    stop_loss: 26.2,
    target_price: 36.5,
    upside_pct: 28.1,
  },
  {
    symbol: "2344",
    name: "華邦電",
    industry: "半導體記憶體",
    price: 24.5,
    change_pct: 1.65,
    volume: 38400,
    volume_mult: 2.5,
    pbr: 0.88,
    per: null,
    pattern: "底部放量突破",
    category: "景氣循環復甦底",
    signals: ["利基型 DRAM 與 NOR Flash 報價落底回升", "高雄新廠 20nm 稼動率達 85%", "帶量長紅突破 2 個月整理區", "PBR 0.88 具備循環底安全邊際"],
    score_total: 92,
    score_tech: 91,
    score_turnaround: 93,
    score_chips: 91,
    entry_zone: [23.8, 25.0],
    stop_loss: 22.8,
    target_price: 32.0,
    upside_pct: 30.6,
  },
  {
    symbol: "2337",
    name: "旺宏",
    industry: "半導體記憶體",
    price: 26.2,
    change_pct: 0.95,
    volume: 24600,
    volume_mult: 2.0,
    pbr: 0.95,
    per: null,
    pattern: "均線多頭排列",
    category: "車用與工規 NOR Flash",
    signals: ["車用 ArmorFlash 獲國際車廠導入", "3D NAND 庫存回歸健康水位", "短中期均線糾結後向上發散", "外資連續 3 個交易日轉買"],
    score_total: 88,
    score_tech: 89,
    score_turnaround: 88,
    score_chips: 87,
    entry_zone: [25.5, 26.8],
    stop_loss: 24.5,
    target_price: 34.0,
    upside_pct: 29.8,
  },
  {
    symbol: "2353",
    name: "宏碁",
    industry: "電腦週邊",
    price: 41.5,
    change_pct: 1.1,
    volume: 31000,
    volume_mult: 1.8,
    pbr: 1.32,
    per: 16.5,
    pattern: "均線多頭排列",
    category: "AI PC 普及換機潮",
    signals: ["Copilot+ PC 全系列鋪貨成長", "多元事業引擎小金雞獲利挹注", "月線支撐量縮有守", "預估現金殖利率達 4.8%"],
    score_total: 89,
    score_tech: 88,
    score_turnaround: 89,
    score_chips: 90,
    entry_zone: [40.5, 42.0],
    stop_loss: 38.5,
    target_price: 52.0,
    upside_pct: 25.3,
  },
  {
    symbol: "2324",
    name: "仁寶",
    industry: "電子代工",
    price: 36.8,
    change_pct: 0.55,
    volume: 29500,
    volume_mult: 1.9,
    pbr: 1.18,
    per: 13.8,
    pattern: "法人主力吸籌",
    category: "高毛利伺服器轉型",
    signals: ["AI 伺服器與車用電子營收比重攀升", "淡出純代工，營業利益率顯著改善", "外資近 10 日累計買超逾 2.5 萬張", "本益比 13.8 倍估值偏低"],
    score_total: 89,
    score_tech: 87,
    score_turnaround: 90,
    score_chips: 92,
    entry_zone: [36.0, 37.5],
    stop_loss: 34.2,
    target_price: 46.5,
    upside_pct: 26.4,
  },
  {
    symbol: "2367",
    name: "燿華",
    industry: "電子零組件 PCB",
    price: 33.5,
    change_pct: 2.45,
    volume: 36200,
    volume_mult: 3.4,
    pbr: 1.22,
    per: 14.2,
    pattern: "營運轉虧為盈",
    category: "低軌衛星地面接收端",
    signals: ["美系低軌衛星大客戶地面板出貨倍增", "高階 HDI 產能稼動率達 88%", "單季獲利虧轉盈顯著跳升", "MACD 柱狀體在零軸上方持續擴大"],
    score_total: 94,
    score_tech: 95,
    score_turnaround: 96,
    score_chips: 90,
    entry_zone: [32.5, 34.2],
    stop_loss: 30.5,
    target_price: 44.0,
    upside_pct: 31.3,
  },
  {
    symbol: "2605",
    name: "新興",
    industry: "散裝航運",
    price: 25.5,
    change_pct: 1.8,
    volume: 21500,
    volume_mult: 2.7,
    pbr: 0.92,
    per: 11.5,
    pattern: "底部放量突破",
    category: "高股利與航運景氣",
    signals: ["波羅的海海岬型指數 (BCI) 短線強彈", "超大型油輪 (VLCC) 租金維持高檔", "突破 4 個月箱型整理上緣", "PBR 0.92 股價低於淨值"],
    score_total: 90,
    score_tech: 91,
    score_turnaround: 90,
    score_chips: 89,
    entry_zone: [24.8, 26.0],
    stop_loss: 23.8,
    target_price: 33.5,
    upside_pct: 31.4,
  },
  {
    symbol: "2002",
    name: "中鋼",
    industry: "鋼鐵龍頭",
    price: 22.5,
    change_pct: 0.45,
    volume: 28000,
    volume_mult: 1.6,
    pbr: 0.98,
    per: 24.0,
    pattern: "布林通道壓縮",
    category: "原物料景氣週期大底",
    signals: ["亞洲鋼廠盤價止跌盤整", "全球去產能政策有利供需結構翻轉", "週 KD 指標在超賣區黃金交叉", "殖利率具長期防守價值"],
    score_total: 85,
    score_tech: 84,
    score_turnaround: 86,
    score_chips: 86,
    entry_zone: [22.0, 23.0],
    stop_loss: 21.0,
    target_price: 28.5,
    upside_pct: 26.7,
  },
  {
    symbol: "6770",
    name: "力積電",
    industry: "半導體代工",
    price: 19.5,
    change_pct: 1.35,
    volume: 42000,
    volume_mult: 2.4,
    pbr: 0.72,
    per: null,
    pattern: "營運轉虧為盈",
    category: "3D 封裝與授權技術",
    signals: ["與國際大廠合作 3D AI 晶圓代工授權", "折舊高峰過去，單季自由現金流轉正", "股價低於 20 元具資產估值保護", "主力分點連續 4 日低檔布局"],
    score_total: 89,
    score_tech: 88,
    score_turnaround: 92,
    score_chips: 88,
    entry_zone: [18.8, 20.0],
    stop_loss: 17.8,
    target_price: 26.0,
    upside_pct: 33.3,
  },
  {
    symbol: "2365",
    name: "昆盈",
    industry: "電腦週邊",
    price: 45.0,
    change_pct: 3.2,
    volume: 38900,
    volume_mult: 3.5,
    pbr: 1.65,
    per: 21.0,
    pattern: "底部放量突破",
    category: "機器人視覺與智慧周邊",
    signals: ["切入工業機器人感測模組供應鏈", "單月自結獲利年增翻倍", "長紅放量突破頸線密集反壓", "日成交量較月均量擴增 3.5 倍"],
    score_total: 93,
    score_tech: 96,
    score_turnaround: 91,
    score_chips: 91,
    entry_zone: [43.8, 46.0],
    stop_loss: 41.5,
    target_price: 58.0,
    upside_pct: 28.9,
  },
  {
    symbol: "3047",
    name: "訊舟",
    industry: "通信網路",
    price: 38.0,
    change_pct: 2.15,
    volume: 27500,
    volume_mult: 2.6,
    pbr: 1.45,
    per: 18.2,
    pattern: "均線多頭排列",
    category: "Wi-Fi 7 與邊緣通訊",
    signals: ["歐洲電信客戶 Wi-Fi 7 專案啟動出貨", "子公司康全電訊虧轉盈貢獻獲利", "短中天期均線呈標準多頭排列", "近 20 日法人買超持股比例攀升"],
    score_total: 91,
    score_tech: 92,
    score_turnaround: 91,
    score_chips: 90,
    entry_zone: [37.0, 39.0],
    stop_loss: 35.0,
    target_price: 49.0,
    upside_pct: 28.9,
  },
  {
    symbol: "2328",
    name: "廣宇",
    industry: "電子零組件",
    price: 34.5,
    change_pct: 0.88,
    volume: 16800,
    volume_mult: 1.9,
    pbr: 1.1,
    per: 15.5,
    pattern: "法人主力吸籌",
    category: "電動車線束與連接器",
    signals: ["受惠電動車與伺服器高壓線束出貨", "東南亞泰國與馬來西亞產能開出", "投信持股比例自低檔持續回補", "季線 60MA 形成下檔強勁防守"],
    score_total: 88,
    score_tech: 87,
    score_turnaround: 88,
    score_chips: 90,
    entry_zone: [33.5, 35.2],
    stop_loss: 32.0,
    target_price: 43.5,
    upside_pct: 26.1,
  },
  {
    symbol: "2352",
    name: "佳世達",
    industry: "電腦週邊",
    price: 35.2,
    change_pct: 0.57,
    volume: 19200,
    volume_mult: 1.7,
    pbr: 1.08,
    per: 14.5,
    pattern: "布林通道壓縮",
    category: "醫療與高附加價值轉型",
    signals: ["醫療器材與醫院獲利佔集團比重逾 50%", "PBR 1.08 具顯著價值防守性", "布林通道帶寬壓縮至 3% 極限整理", "連續配發高股息"],
    score_total: 87,
    score_tech: 86,
    score_turnaround: 88,
    score_chips: 88,
    entry_zone: [34.5, 36.0],
    stop_loss: 33.0,
    target_price: 44.0,
    upside_pct: 25.0,
  },
  {
    symbol: "4960",
    name: "誠美材",
    industry: "光電零組件",
    price: 13.5,
    change_pct: 1.5,
    volume: 15200,
    volume_mult: 2.3,
    pbr: 0.65,
    per: null,
    pattern: "營運轉虧為盈",
    category: "超低價轉機偏光板",
    signals: ["高值化車載與 OLED 偏光板比重提高", "稼動率維持 8 成以上，本業營運轉正", "每股淨值逾 20 元，PBR 僅 0.65", "低檔換手量能連續增溫"],
    score_total: 88,
    score_tech: 87,
    score_turnaround: 91,
    score_chips: 86,
    entry_zone: [13.0, 13.8],
    stop_loss: 12.2,
    target_price: 18.0,
    upside_pct: 33.3,
  },
  {
    symbol: "3576",
    name: "聯合再生",
    industry: "太陽能與儲能",
    price: 12.2,
    change_pct: 0.82,
    volume: 14500,
    volume_mult: 2.0,
    pbr: 0.82,
    per: null,
    pattern: "底部放量突破",
    category: "超低價綠能儲能轉型",
    signals: ["儲能案場陸續併網認列營收", "新世代 Topcon 電池產線稼動率提升", "突破 12 元整數底部整理平台", "融資籌碼沉澱，法人小幅加碼"],
    score_total: 86,
    score_tech: 86,
    score_turnaround: 87,
    score_chips: 85,
    entry_zone: [11.8, 12.5],
    stop_loss: 11.2,
    target_price: 16.0,
    upside_pct: 31.1,
  },
  {
    symbol: "9105",
    name: "泰金寶-KY",
    industry: "電子代工",
    price: 6.5,
    change_pct: 0.62,
    volume: 28400,
    volume_mult: 2.1,
    pbr: 1.02,
    per: 15.0,
    pattern: "布林通道壓縮",
    category: "個位數極低價股",
    signals: ["東南亞泰國生產基地具地緣優勢", "固態硬碟與網通代工出貨穩定", "極低單價具散戶資金流動性", "長期均線在 6.2~6.4 元高度收斂"],
    score_total: 84,
    score_tech: 85,
    score_turnaround: 83,
    score_chips: 84,
    entry_zone: [6.2, 6.7],
    stop_loss: 5.9,
    target_price: 8.8,
    upside_pct: 35.4,
  },
  {
    symbol: "2349",
    name: "錸德",
    industry: "光電與綠能",
    price: 14.8,
    change_pct: 1.37,
    volume: 21000,
    volume_mult: 2.4,
    pbr: 0.85,
    per: null,
    pattern: "均線多頭排列",
    category: "綠能電廠與儲能系統",
    signals: ["旗下太陽能電廠發電利益穩定進帳", "儲能系統工程陸續進入驗收認列期", "短中期均線金叉向上發散", "低價資產轉型具防守性"],
    score_total: 87,
    score_tech: 88,
    score_turnaround: 87,
    score_chips: 86,
    entry_zone: [14.2, 15.2],
    stop_loss: 13.5,
    target_price: 19.5,
    upside_pct: 31.8,
  },
  {
    symbol: "2303",
    name: "聯電",
    industry: "半導體晶圓代工",
    price: 50.5,
    change_pct: 0.4,
    volume: 68500,
    volume_mult: 1.6,
    pbr: 1.45,
    per: 11.2,
    pattern: "法人主力吸籌",
    category: "成熟製程與高股息",
    signals: ["12nm 合作案強化長期獲利穩定度", "現金殖利率逾 6% 提供實質下檔支撐", "各大主流 ETF 權重被動買盤承接", "本益比 11.2 倍位於近 5 年下緣"],
    score_total: 90,
    score_tech: 88,
    score_turnaround: 89,
    score_chips: 94,
    entry_zone: [49.5, 51.5],
    stop_loss: 47.0,
    target_price: 62.0,
    upside_pct: 22.8,
  },
  {
    symbol: "1722",
    name: "台肥",
    industry: "肥料化工與資產",
    price: 54.0,
    change_pct: 0.75,
    volume: 11200,
    volume_mult: 1.5,
    pbr: 1.12,
    per: 16.8,
    pattern: "布林通道壓縮",
    category: "南港資產收益與乾淨能源",
    signals: ["南港商辦每年穩定挹注逾 10 億租金收益", "投入低碳藍氨潔淨能源供應", "長達 5 個月橫盤整理籌碼乾淨", "資產實質價值顯著高於帳面淨值"],
    score_total: 87,
    score_tech: 85,
    score_turnaround: 88,
    score_chips: 88,
    entry_zone: [52.5, 55.0],
    stop_loss: 50.5,
    target_price: 68.0,
    upside_pct: 25.9,
  },
  {
    symbol: "2323",
    name: "中環",
    industry: "光碟與轉投資",
    price: 11.5,
    change_pct: 0.88,
    volume: 15400,
    volume_mult: 1.8,
    pbr: 0.75,
    per: null,
    pattern: "布林通道壓縮",
    category: "超低價資產轉投資",
    signals: ["每股淨值達 15.2 元，PBR 僅 0.75", "轉投資半導體與高殖利率標的獲利穩健", "長達半年橫盤整理，浮額洗淨", "成交量連續兩週溫和放大"],
    score_total: 85,
    score_tech: 85,
    score_turnaround: 84,
    score_chips: 86,
    entry_zone: [11.0, 11.8],
    stop_loss: 10.5,
    target_price: 15.0,
    upside_pct: 30.4,
  },
  {
    symbol: "2481",
    name: "強茂",
    industry: "半導體功率元件",
    price: 58.0,
    change_pct: 1.93,
    volume: 22500,
    volume_mult: 2.8,
    pbr: 1.38,
    per: 17.5,
    pattern: "均線多頭排列",
    category: "車用功率半導體",
    signals: ["中高壓車用 MOSFET 與 SiC 出貨放量", "工控與伺服器電源需求回溫", "突破 58 元半年頸線反壓", "外資與投信近一週同步買超"],
    score_total: 91,
    score_tech: 93,
    score_turnaround: 90,
    score_chips: 90,
    entry_zone: [56.0, 59.0],
    stop_loss: 53.0,
    target_price: 75.0,
    upside_pct: 29.3,
  },
];

type PriceCapFilter = "ALL" | "P20" | "P35" | "P50";
type PatternFilter = "ALL" | "底部放量突破" | "均線多頭排列" | "布林通道壓縮" | "營運轉虧為盈" | "法人主力吸籌";
type SortOption = "SCORE" | "VOLUME_MULT" | "PBR" | "CHANGE_PCT" | "UPSIDE";

export default function LowPricePotentialScreener() {
  const [priceCap, setPriceCap] = useState<PriceCapFilter>("ALL");
  const [patternFilter, setPatternFilter] = useState<PatternFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("SCORE");
  const [search, setSearch] = useState("");
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; change_pct: number }>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [watchlistState, setWatchlistState] = useState<Record<string, boolean>>({});

  // 取得自選股即時狀態
  const refreshWatchlistStatus = useCallback(() => {
    const map: Record<string, boolean> = {};
    LOW_PRICE_POTENTIAL_SEEDS.forEach((stk) => {
      map[stk.symbol] = isSymbolInWatchlist(stk.symbol);
    });
    setWatchlistState(map);
  }, []);

  useEffect(() => {
    refreshWatchlistStatus();
    const handleChanged = () => refreshWatchlistStatus();
    window.addEventListener("watchlist_changed", handleChanged);
    return () => window.removeEventListener("watchlist_changed", handleChanged);
  }, [refreshWatchlistStatus]);

  // 切換自選股
  const toggleWatchlist = (symbol: string) => {
    if (watchlistState[symbol]) {
      removeSymbolFromWatchlist(symbol);
      setWatchlistState((prev) => ({ ...prev, [symbol]: false }));
    } else {
      addSymbolToWatchlist(symbol, "低價潛力");
      setWatchlistState((prev) => ({ ...prev, [symbol]: true }));
    }
  };

  // 即時報價同步
  const fetchLiveQuotes = async () => {
    setIsRefreshing(true);
    const topSymbols = LOW_PRICE_POTENTIAL_SEEDS.slice(0, 15).map((s) => s.symbol);
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
    setLivePrices(updated);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchLiveQuotes();
  }, []);

  // 結合最新報價與過濾計算
  const filteredAndSortedList = useMemo(() => {
    return LOW_PRICE_POTENTIAL_SEEDS.map((item) => {
      const live = livePrices[item.symbol];
      const currentPrice = live?.price || item.price;
      const currentChangePct = live?.change_pct !== undefined ? live.change_pct : item.change_pct;
      const upside = Number((((item.target_price - currentPrice) / currentPrice) * 100).toFixed(1));

      return {
        ...item,
        price: currentPrice,
        change_pct: currentChangePct,
        upside_pct: upside > 0 ? upside : item.upside_pct,
      };
    })
      .filter((item) => {
        // 價格區間過濾
        if (priceCap === "P20" && item.price > 20) return false;
        if (priceCap === "P35" && item.price > 35) return false;
        if (priceCap === "P50" && item.price > 50) return false;

        // 技術形態過濾
        if (patternFilter !== "ALL" && item.pattern !== patternFilter) return false;

        // 搜尋過濾
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const match =
            item.symbol.toLowerCase().includes(q) ||
            item.name.toLowerCase().includes(q) ||
            item.industry.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "SCORE") return b.score_total - a.score_total;
        if (sortBy === "VOLUME_MULT") return b.volume_mult - a.volume_mult;
        if (sortBy === "PBR") return a.pbr - b.pbr;
        if (sortBy === "CHANGE_PCT") return b.change_pct - a.change_pct;
        if (sortBy === "UPSIDE") return b.upside_pct - a.upside_pct;
        return 0;
      });
  }, [priceCap, patternFilter, sortBy, search, livePrices]);

  // 頂部統計指標
  const stats = useMemo(() => {
    const count = filteredAndSortedList.length;
    const avgScore = count > 0 ? Math.round(filteredAndSortedList.reduce((acc, it) => acc + it.score_total, 0) / count) : 0;
    const avgUpside = count > 0 ? (filteredAndSortedList.reduce((acc, it) => acc + it.upside_pct, 0) / count).toFixed(1) : "0";
    const lowPbrCount = filteredAndSortedList.filter((it) => it.pbr < 1.0).length;

    return { count, avgScore, avgUpside, lowPbrCount };
  }, [filteredAndSortedList]);

  return (
    <div className="space-y-6">
      {/* 頂部總覽看板 */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-accent/10 border border-[var(--border)]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="p-1.5 rounded-lg bg-accent/20 text-accent">
                <SlidersHorizontal size={18} />
              </span>
              <h2 className="text-xl font-bold text-primary">低價潛力股發掘模型</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                技術突破與轉機因子結合
              </span>
            </div>
            <p className="text-xs text-secondary">
              聚焦 10~60 元銅板與中低價區間，鎖定底部爆量長紅突破、均線多頭發散、單季營運轉虧為盈與低股價淨值比安全邊際
            </p>
          </div>

          <button
            onClick={fetchLiveQuotes}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs font-semibold text-secondary hover:text-primary transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
            title="同步即時盤中報價"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-accent" : ""} />
            <span>{isRefreshing ? "同步中..." : "重新掃描"}</span>
          </button>
        </div>

        {/* 核心數據卡 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[var(--border)]">
          <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
            <div className="text-xs text-secondary mb-1">符合篩選標的數</div>
            <div className="text-xl font-extrabold font-mono text-primary tabular-nums">
              {stats.count} 檔
            </div>
            <div className="text-[10px] text-muted mt-0.5">跨全市場低價資料庫</div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
            <div className="text-xs text-secondary mb-1">平均潛力綜合評分</div>
            <div className="text-xl font-extrabold font-mono text-accent tabular-nums">
              {stats.avgScore} 分
            </div>
            <div className="text-[10px] text-muted mt-0.5">技術與轉機多因子綜合</div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
            <div className="text-xs text-secondary mb-1">平均預期目標空間</div>
            <div className="text-xl font-extrabold font-mono text-red-400 tabular-nums">
              +{stats.avgUpside}%
            </div>
            <div className="text-[10px] text-muted mt-0.5">以頸線目標價為基準推算</div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)]">
            <div className="text-xs text-secondary mb-1">PBR 低於淨值標的</div>
            <div className="text-xl font-extrabold font-mono text-emerald-400 tabular-nums">
              {stats.lowPbrCount} 檔
            </div>
            <div className="text-[10px] text-muted mt-0.5">股價淨值比小於 1.0 倍</div>
          </div>
        </div>
      </div>

      {/* 控制與篩選列 */}
      <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] space-y-3.5">
        {/* 第一排：價格區間切換 & 搜尋 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-secondary font-semibold mr-1">股價上限:</span>
            <button
              onClick={() => setPriceCap("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                priceCap === "ALL"
                  ? "bg-accent text-white"
                  : "bg-[var(--bg-tertiary)] text-secondary hover:text-primary"
              }`}
            >
              全部低價 (≤ $60)
            </button>
            <button
              onClick={() => setPriceCap("P20")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                priceCap === "P20"
                  ? "bg-accent text-white"
                  : "bg-[var(--bg-tertiary)] text-secondary hover:text-primary"
              }`}
            >
              銅板股 (≤ $20)
            </button>
            <button
              onClick={() => setPriceCap("P35")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                priceCap === "P35"
                  ? "bg-accent text-white"
                  : "bg-[var(--bg-tertiary)] text-secondary hover:text-primary"
              }`}
            >
              主流低價 (≤ $35)
            </button>
            <button
              onClick={() => setPriceCap("P50")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                priceCap === "P50"
                  ? "bg-accent text-white"
                  : "bg-[var(--bg-tertiary)] text-secondary hover:text-primary"
              }`}
            >
              中低價轉機 (≤ $50)
            </button>
          </div>

          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋代碼、名稱或產業..."
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg py-1 pl-8 pr-3 text-xs text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* 第二排：技術形態與轉機分類 & 排序選單 */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-secondary font-semibold mr-1">型態特徵:</span>
            {[
              { id: "ALL", label: "全部型態" },
              { id: "底部放量突破", label: "底部放量突破" },
              { id: "均線多頭排列", label: "均線多頭排列" },
              { id: "布林通道壓縮", label: "布林通道壓縮" },
              { id: "營運轉虧為盈", label: "營運轉虧為盈" },
              { id: "法人主力吸籌", label: "法人主力吸籌" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPatternFilter(p.id as PatternFilter)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  patternFilter === p.id
                    ? "bg-accent/15 text-accent border border-accent/30 font-bold"
                    : "text-secondary hover:text-primary hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-secondary whitespace-nowrap">排序方式:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg py-1 px-2.5 text-xs text-primary font-medium focus:outline-none focus:border-accent"
            >
              <option value="SCORE">潛力綜合評分 (高至低)</option>
              <option value="VOLUME_MULT">今日量比放大 (高至低)</option>
              <option value="PBR">股價淨值比 PBR (低至高)</option>
              <option value="CHANGE_PCT">今日漲跌幅 (高至低)</option>
              <option value="UPSIDE">預期上檔空間 (大至小)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 標的卡片展示網格 */}
      {filteredAndSortedList.length === 0 ? (
        <Card className="p-10 text-center text-secondary text-sm">
          沒有符合當前價格與型態條件的低價潛力股票，請嘗試調整股價上限或型態過濾器。
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedList.map((stk) => {
            const isFav = Boolean(watchlistState[stk.symbol]);

            return (
              <div
                key={stk.symbol}
                className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-accent/40 transition-all flex flex-col justify-between"
              >
                {/* 卡片頭部 */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/stock/${stk.symbol}`}
                          className="font-mono font-extrabold text-base text-accent hover:underline flex items-center gap-1"
                        >
                          {stk.symbol}
                          <ExternalLink size={12} className="opacity-60" />
                        </Link>
                        <span className="font-bold text-sm text-primary">{stk.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--bg-tertiary)] text-secondary">
                          {stk.industry}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted mt-0.5">{stk.category}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleWatchlist(stk.symbol)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isFav
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-[var(--bg-tertiary)] text-muted hover:text-primary border-[var(--border)]"
                        }`}
                        title={isFav ? "自選股中 (點擊移除)" : "加入自選股"}
                      >
                        <Star size={13} fill={isFav ? "currentColor" : "none"} />
                      </button>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-accent/15 text-accent font-bold font-mono">
                        {stk.score_total} 分
                      </span>
                    </div>
                  </div>

                  {/* 價格與即時指標 */}
                  <div className="flex items-baseline justify-between my-2.5 pt-2 border-t border-[var(--border)]">
                    <div>
                      <div className="text-[10px] text-muted">最新現價</div>
                      <div className="text-xl font-extrabold font-mono text-primary tabular-nums">
                        ${stk.price.toFixed(2)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-muted">今日漲跌</div>
                      <Badge value={stk.change_pct} market="TW" />
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-muted">量比放大</div>
                      <span className="font-mono font-bold text-xs text-amber-400">
                        {stk.volume_mult.toFixed(1)}x 均量
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-muted">股價淨值比</div>
                      <span className="font-mono font-semibold text-xs text-primary">
                        {stk.pbr.toFixed(2)}x
                      </span>
                    </div>
                  </div>

                  {/* 三維度量化評分條 */}
                  <div className="space-y-1.5 my-3 p-2.5 rounded-lg bg-[var(--bg-tertiary)]/70 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-secondary">技術形態動能</span>
                      <span className="font-mono font-bold text-primary">{stk.score_tech}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${stk.score_tech}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-secondary">營運轉機潛力</span>
                      <span className="font-mono font-bold text-primary">{stk.score_turnaround}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${stk.score_turnaround}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-secondary">主力籌碼鎖碼</span>
                      <span className="font-mono font-bold text-primary">{stk.score_chips}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-primary)] overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${stk.score_chips}%` }} />
                    </div>
                  </div>

                  {/* 核心訊號標籤 */}
                  <div className="space-y-1 mb-3">
                    <div className="text-[10px] text-muted font-medium">觸發訊號與轉機條件:</div>
                    <div className="flex flex-wrap gap-1">
                      {stk.signals.map((sig, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-secondary border border-[var(--border)] leading-tight"
                        >
                          {sig}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 交易執行指引與按鈕 */}
                <div className="pt-3 border-t border-[var(--border)] mt-2">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                    <div className="p-1.5 rounded bg-[var(--bg-tertiary)]">
                      <div className="text-[10px] text-muted">進場區間</div>
                      <div className="font-mono font-semibold text-primary mt-0.5">
                        ${stk.entry_zone[0]}~{stk.entry_zone[1]}
                      </div>
                    </div>

                    <div className="p-1.5 rounded bg-[var(--bg-tertiary)]">
                      <div className="text-[10px] text-muted">防守停損</div>
                      <div className="font-mono font-semibold text-rose-400 mt-0.5">
                        ${stk.stop_loss}
                      </div>
                    </div>

                    <div className="p-1.5 rounded bg-red-500/10 border border-red-500/20">
                      <div className="text-[10px] text-red-300">目標價 (空間)</div>
                      <div className="font-mono font-bold text-red-400 mt-0.5">
                        ${stk.target_price} (+{stk.upside_pct}%)
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/stock/${stk.symbol}`}
                    className="w-full py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-accent hover:text-white text-secondary text-xs font-semibold transition-all text-center block cursor-pointer"
                  >
                    進入 {stk.symbol} 完整技術圖表與研報
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 專業操作守則 */}
      <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs text-secondary space-y-2">
        <div className="font-bold text-primary flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-accent" />
          <span>低價潛力股量化交易與風控準則</span>
        </div>
        <ul className="list-disc pl-4 space-y-1 leading-relaxed">
          <li>
            <strong>流動性門檻</strong>：優先選擇日成交量在 2,000 張以上之標的，防範低流動性難以停損脫身之滑價風險。
          </li>
          <li>
            <strong>嚴格執行價格紀律</strong>：低價股波動度通常高於權值股，進場前請恪守預設防守停損點（約 6%～8%），若收盤價跌破停損位應果斷執行出場。
          </li>
          <li>
            <strong>資產價值防守</strong>：優先挑選股價淨值比 (PBR) 位於 1.0 以下之標的，其下方具有清算與重置成本防守，不易出現無底深淵之重挫。
          </li>
        </ul>
      </div>
    </div>
  );
}
