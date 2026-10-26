"use client";

import { useEffect, useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { apiStocks } from "@/lib/api";
import { Search, Sparkles, Flame, Layers } from "lucide-react";
import { Term } from "@/components/ui/TermTooltip";
import EtfCapitalFlowTracker from "@/components/dashboard/EtfCapitalFlowTracker";

interface AssetQuote {
  symbol: string;
  name: string;
  tag: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market: "TW" | "US";
}

const ASSET_CATEGORIES: Record<
  string,
  { label: string; items: { symbol: string; name: string; tag: string }[] }
> = {
  tw_market: {
    label: "台股市值與槓反 ETF",
    items: [
      { symbol: "0050", name: "元大台灣50", tag: "台股市值龍頭" },
      { symbol: "006208", name: "富邦台50", tag: "低內扣市值型" },
      { symbol: "00692", name: "富邦公司治理", tag: "ESG 市值型" },
      { symbol: "00850", name: "元大臺灣ESG永續", tag: "ESG 市值型" },
      { symbol: "00922", name: "國泰台灣領袖50", tag: "低碳市值型" },
      { symbol: "00923", name: "群益台ESG低碳50", tag: "低碳市值型" },
      { symbol: "00905", name: "FT臺灣Smart", tag: "多因子市值型" },
      { symbol: "0051", name: "元大中型100", tag: "中型股動能" },
      { symbol: "00733", name: "富邦臺灣中小", tag: "中小型 Alpha" },
      { symbol: "0057", name: "富邦摩台", tag: "大型權值" },
      { symbol: "006203", name: "元大MSCI台灣", tag: "MSCI 權值" },
      { symbol: "006204", name: "永豐臺灣加權", tag: "大盤加權" },
      { symbol: "00631L", name: "元大台灣50正2", tag: "2倍槓桿做多" },
      { symbol: "00632R", name: "元大台灣50反1", tag: "1倍反向避險" },
      { symbol: "00675L", name: "富邦臺灣加權正2", tag: "2倍槓桿做多" },
      { symbol: "00676R", name: "富邦臺灣加權反1", tag: "1倍反向避險" },
      { symbol: "00663L", name: "國泰臺灣加權正2", tag: "2倍槓桿做多" },
      { symbol: "00685L", name: "群益臺灣加權正2", tag: "2倍槓桿做多" },
    ],
  },
  dividend: {
    label: "高股息、月配息與低波",
    items: [
      { symbol: "0056", name: "元大高股息", tag: "季配高股息" },
      { symbol: "00878", name: "國泰永續高股息", tag: "季配高股息" },
      { symbol: "00919", name: "群益台灣精選高息", tag: "季配高股息" },
      { symbol: "00929", name: "復華台灣科技優息", tag: "月配科技高息" },
      { symbol: "00940", name: "元大台灣價值高息", tag: "月配價值高息" },
      { symbol: "00939", name: "統一台灣高息動能", tag: "月配高息動能" },
      { symbol: "00713", name: "元大台灣高息低波", tag: "高息低波動" },
      { symbol: "00915", name: "凱基優選高股息30", tag: "低波高息王" },
      { symbol: "00918", name: "大華優利高填息30", tag: "高填息動能" },
      { symbol: "00900", name: "富邦特選高股息30", tag: "高周轉高息" },
      { symbol: "00934", name: "中信成長高股息", tag: "月配成長高息" },
      { symbol: "00936", name: "台新永續高息中小", tag: "月配中小高息" },
      { symbol: "00946", name: "群益科技高息成長", tag: "月配科技高息" },
      { symbol: "00944", name: "野村趨勢動能高息", tag: "月配動能高息" },
      { symbol: "00943", name: "兆豐電子高息等權", tag: "月配等權高息" },
      { symbol: "00701", name: "國泰股利精選30", tag: "金融傳產高息" },
      { symbol: "00730", name: "富邦臺灣優質高息", tag: "價值高股息" },
      { symbol: "00731", name: "復華富時高息低波", tag: "高息低波動" },
      { symbol: "00907", name: "永豐優息存股", tag: "雙月配傳產金融" },
      { symbol: "00712", name: "復華富時不動產", tag: "REITs 高配息" },
      { symbol: "VYM", name: "Vanguard 美股高股息 ETF", tag: "美股高股息" },
      { symbol: "SCHD", name: "Schwab 美國紅利股票 ETF", tag: "美股價值紅利" },
      { symbol: "JEPI", name: "JPMorgan 美股掩護性買權高息 ETF", tag: "美股月配高息" },
      { symbol: "JEPQ", name: "JPMorgan 那斯達克掩護性買權 ETF", tag: "美股科技月配" },
      { symbol: "VNQ", name: "Vanguard 美國不動產 REITs", tag: "美國 REITs" },
    ],
  },
  tech: {
    label: "AI 科技、半導體與主題",
    items: [
      { symbol: "00881", name: "國泰台灣5G+", tag: "台灣 AI 供應鏈" },
      { symbol: "00891", name: "中信關鍵半導體", tag: "台灣半導體龍頭" },
      { symbol: "00892", name: "富邦台灣半導體", tag: "台灣半導體" },
      { symbol: "00904", name: "新光臺灣半導體30", tag: "台灣半導體" },
      { symbol: "00927", name: "群益半導體收益", tag: "半導體高息" },
      { symbol: "00947", name: "台新臺灣IC設計", tag: "台灣 IC 設計" },
      { symbol: "0052", name: "富邦科技", tag: "高含積量科技" },
      { symbol: "0053", name: "元大電子", tag: "台灣電子股" },
      { symbol: "00735", name: "國泰臺韓科技", tag: "台韓半導體" },
      { symbol: "00894", name: "中信小資高價30", tag: "千金高價成長股" },
      { symbol: "00935", name: "野村臺灣新科技50", tag: "台灣創新科技" },
      { symbol: "00830", name: "國泰費城半導體", tag: "全球半導體龍頭" },
      { symbol: "00757", name: "統一FANG+", tag: "美股十大科技巨頭" },
      { symbol: "00662", name: "富邦NASDAQ", tag: "那斯達克 100" },
      { symbol: "00941", name: "中信上游半導體", tag: "全球半導體設備材料" },
      { symbol: "00893", name: "國泰智能電動車", tag: "全球電動車與 AI" },
      { symbol: "00895", name: "富邦未來車", tag: "AI 自動駕駛" },
      { symbol: "00911", name: "兆豐洲際半導體", tag: "美國費半指數" },
      { symbol: "QQQ", name: "Invesco Nasdaq 100 ETF", tag: "美股科技巨頭" },
      { symbol: "SOXX", name: "iShares 半導體 ETF", tag: "美股費半成分" },
      { symbol: "SMH", name: "VanEck 半導體 ETF", tag: "全球晶片龍頭" },
      { symbol: "XLK", name: "SPDR 美國科技板塊 ETF", tag: "美股大型科技" },
      { symbol: "ARKK", name: "ARK 創新主動型 ETF", tag: "破壞式創新" },
    ],
  },
  bond: {
    label: "美債、公司債與外匯",
    items: [
      { symbol: "00679B", name: "元大美債20年", tag: "台幣長天期美債" },
      { symbol: "00687B", name: "國泰20年美債", tag: "台幣長天期美債" },
      { symbol: "00696B", name: "富邦美債20年", tag: "台幣長天期美債" },
      { symbol: "00764B", name: "群益25年美債", tag: "超長天期美債" },
      { symbol: "00795B", name: "中信美國公債20年", tag: "台幣長天期美債" },
      { symbol: "00937B", name: "群益ESG投等債20+", tag: "月配長天期投等債" },
      { symbol: "00720B", name: "元大投資級公司債", tag: "投資級公司債" },
      { symbol: "00751B", name: "元大AAA至A公司債", tag: "高評級公司債" },
      { symbol: "00772B", name: "中信高評級公司債", tag: "月配高評級債" },
      { symbol: "00725B", name: "國泰投資級公司債", tag: "季配投等債" },
      { symbol: "00933B", name: "國泰10Y+金融債", tag: "月配金融債" },
      { symbol: "00948B", name: "中信優息投資級債", tag: "月配投等債" },
      { symbol: "00953B", name: "群益優選非投等債", tag: "月配非投等債" },
      { symbol: "00740B", name: "富邦全球投等債", tag: "全球投資級債" },
      { symbol: "00680L", name: "元大美債20正2", tag: "美債2倍槓桿" },
      { symbol: "00688L", name: "國泰20年美債正2", tag: "美債2倍槓桿" },
      { symbol: "TLT", name: "iShares 20+年美債 ETF", tag: "美股長債基準" },
      { symbol: "IEF", name: "iShares 7-10年美債 ETF", tag: "美股中債基準" },
      { symbol: "SHY", name: "iShares 1-3年美債 ETF", tag: "美股短債現金流" },
      { symbol: "BND", name: "Vanguard 總體債券市場 ETF", tag: "美國綜合債券" },
      { symbol: "LQD", name: "iShares 投資級公司債 ETF", tag: "美股投等公司債" },
      { symbol: "HYG", name: "iShares 高收益公司債 ETF", tag: "美股非投等債" },
      { symbol: "^TNX", name: "美國10年期公債殖利率", tag: "全球定價錨點" },
      { symbol: "^TYX", name: "美國30年期公債殖利率", tag: "長債利率基準" },
      { symbol: "TWD=X", name: "美元/台幣 (USD/TWD)", tag: "外匯匯率" },
      { symbol: "JPY=X", name: "美元/日圓 (USD/JPY)", tag: "外匯匯率" },
      { symbol: "EURUSD=X", name: "歐元/美元 (EUR/USD)", tag: "外匯匯率" },
      { symbol: "CNY=X", name: "美元/人民幣 (USD/CNY)", tag: "外匯匯率" },
      { symbol: "DX-Y.NYB", name: "美元指數 (DXY)", tag: "全球資金風向" },
    ],
  },
  us_global: {
    label: "美股大盤、日股與全球指數",
    items: [
      { symbol: "SPY", name: "SPDR S&P 500 ETF", tag: "美股標普500" },
      { symbol: "VOO", name: "Vanguard S&P 500 ETF", tag: "低費用標普500" },
      { symbol: "IVV", name: "iShares Core S&P 500 ETF", tag: "美股標普500" },
      { symbol: "DIA", name: "SPDR 道瓊工業指數 ETF", tag: "美股道瓊藍籌" },
      { symbol: "IWM", name: "iShares 羅素2000小型股 ETF", tag: "美股中小型股" },
      { symbol: "XLF", name: "SPDR 美國金融板塊 ETF", tag: "美股金融股" },
      { symbol: "XLE", name: "SPDR 美國能源板塊 ETF", tag: "美股能源股" },
      { symbol: "XLV", name: "SPDR 美國醫療保健 ETF", tag: "美股醫療生技" },
      { symbol: "00646", name: "元大S&P500", tag: "台股掛牌標普500" },
      { symbol: "00645", name: "富邦日本", tag: "日本東證指數" },
      { symbol: "00657", name: "國泰日經225", tag: "日本日經225" },
      { symbol: "00949", name: "復華日本龍頭", tag: "日本商社半導體" },
      { symbol: "00951", name: "台新日本半導體", tag: "日本半導體供應鏈" },
      { symbol: "00752", name: "中信中國50", tag: "中國科技龍頭" },
      { symbol: "00882", name: "中信中國高股息", tag: "香港掛牌高息股" },
      { symbol: "00637L", name: "元大滬深300正2", tag: "陸股2倍槓桿" },
      { symbol: "00885", name: "富邦越南", tag: "東協新興市場" },
      { symbol: "^TWII", name: "台股加權指數", tag: "全球指數" },
      { symbol: "^SOX", name: "費城半導體指數", tag: "全球指數" },
      { symbol: "^N225", name: "日經 225 指數", tag: "全球指數" },
      { symbol: "^VIX", name: "VIX 波動率恐慌指數", tag: "避險情緒指標" },
    ],
  },
  crypto: {
    label: "加密貨幣與現貨 ETF",
    items: [
      { symbol: "BTC-USD", name: "比特幣 (Bitcoin)", tag: "主流加密貨幣" },
      { symbol: "ETH-USD", name: "以太坊 (Ethereum)", tag: "智能合約公鏈" },
      { symbol: "SOL-USD", name: "Solana (SOL)", tag: "高速公鏈" },
      { symbol: "BNB-USD", name: "幣安幣 (BNB)", tag: "交易所生態" },
      { symbol: "XRP-USD", name: "瑞波幣 (XRP)", tag: "跨境支付" },
      { symbol: "DOGE-USD", name: "狗狗幣 (Dogecoin)", tag: "迷因龍頭" },
      { symbol: "ADA-USD", name: "艾達幣 (Cardano)", tag: "PoS 公鏈" },
      { symbol: "AVAX-USD", name: "雪崩幣 (Avalanche)", tag: "子網生態公鏈" },
      { symbol: "IBIT", name: "iShares 比特幣現貨 ETF", tag: "美股加密 ETF" },
      { symbol: "FBTC", name: "Fidelity 比特幣現貨 ETF", tag: "美股加密 ETF" },
      { symbol: "ETHA", name: "iShares 以太坊現貨 ETF", tag: "美股加密 ETF" },
      { symbol: "00909", name: "國泰數位支付服務", tag: "區塊鏈與加密生態" },
    ],
  },
  commodity: {
    label: "黃金、白銀與大宗原物料",
    items: [
      { symbol: "GC=F", name: "黃金期貨 (Gold)", tag: "貴金屬避險" },
      { symbol: "SI=F", name: "白銀期貨 (Silver)", tag: "貴金屬/工業" },
      { symbol: "CL=F", name: "西德州原油 (WTI Crude)", tag: "能源期貨" },
      { symbol: "BZ=F", name: "布蘭特原油 (Brent)", tag: "能源期貨" },
      { symbol: "HG=F", name: "銅期貨 (Copper)", tag: "工業金屬景氣" },
      { symbol: "NG=F", name: "天然氣期貨 (Natural Gas)", tag: "能源期貨" },
      { symbol: "00635U", name: "期元大S&P黃金", tag: "台股黃金 ETF" },
      { symbol: "00738U", name: "期元大道瓊白銀", tag: "台股白銀 ETF" },
      { symbol: "00642U", name: "期元大S&P石油", tag: "台股原油 ETF" },
      { symbol: "00715L", name: "期街口布蘭特油正2", tag: "原油2倍槓桿" },
      { symbol: "GLD", name: "SPDR 黃金現貨 ETF", tag: "美股黃金 ETF" },
      { symbol: "SLV", name: "iShares 白銀現貨 ETF", tag: "美股白銀 ETF" },
      { symbol: "USO", name: "United States 原油基金 ETF", tag: "美股原油 ETF" },
      { symbol: "DBA", name: "Invesco 農業大宗商品 ETF", tag: "農產品原物料" },
    ],
  },
};

const ALL_CATALOG_ITEMS = Object.values(ASSET_CATEGORIES).flatMap((cat) => cat.items);

export default function EtfAndMultiAssetPage() {
  const [mainView, setMainView] = useState<"flow" | "catalog">("flow");
  const [quotes, setQuotes] = useState<Record<string, AssetQuote>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("tw_market");
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteSearchItems, setRemoteSearchItems] = useState<{ symbol: string; name: string; tag: string }[]>([]);

  useEffect(() => {
    let alive = true;
    const fetchTabAssets = async () => {
      setLoading(true);
      const category = ASSET_CATEGORIES[activeTab];
      if (!category) return;

      const results = await Promise.all(
        category.items.map(async (item) => {
          try {
            const res = await apiStocks.getQuote(item.symbol);
            return {
              ...res.data,
              symbol: item.symbol,
              name: item.name || res.data?.name || item.symbol,
              tag: item.tag,
            } as AssetQuote;
          } catch {
            return null;
          }
        })
      );

      if (!alive) return;
      setQuotes((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          if (r) next[r.symbol] = r;
        });
        return next;
      });
      setLoading(false);
    };

    fetchTabAssets();
    const timer = setInterval(fetchTabAssets, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [activeTab]);

  // Live full-market search across all TWSE / TPEx / US ETFs & stocks when typing in search box
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setRemoteSearchItems([]);
      return;
    }
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const res = await apiStocks.searchStocks(q);
        const list = Array.isArray(res.data) ? res.data : [];
        const items = list.slice(0, 18).map((s: any) => ({
          symbol: s.symbol,
          name: s.name || s.symbol,
          tag: s.industry || (s.symbol.startsWith("00") ? "台股 ETF" : `${s.market || "全市場"} 標的`),
        }));
        if (!alive) return;
        setRemoteSearchItems(items);

        // Fetch live quotes for matched items not yet in cache
        const missing = items.filter((it) => !quotes[it.symbol]);
        if (missing.length > 0) {
          const fetched = await Promise.all(
            missing.map(async (it) => {
              try {
                const qRes = await apiStocks.getQuote(it.symbol);
                return {
                  ...qRes.data,
                  symbol: it.symbol,
                  name: it.name || qRes.data?.name || it.symbol,
                  tag: it.tag,
                } as AssetQuote;
              } catch {
                return null;
              }
            })
          );
          if (!alive) return;
          setQuotes((prev) => {
            const next = { ...prev };
            fetched.forEach((r) => {
              if (r) next[r.symbol] = r;
            });
            return next;
          });
        }
      } catch {
        // ignore
      }
    }, 220);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const displayedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // When not searching, display active tab's items
    if (!q) {
      const category = ASSET_CATEGORIES[activeTab];
      if (!category) return [];
      return category.items.map(
        (item) =>
          quotes[item.symbol] || {
            symbol: item.symbol,
            name: item.name,
            tag: item.tag,
            price: 0,
            change: 0,
            change_pct: 0,
            volume: 0,
            market: /^\d/.test(item.symbol) || item.symbol === "^TWII" ? "TW" : "US",
          }
      );
    }

    // When searching, search across ALL categories + remote search results (all 250+ ETFs in TW/US)
    const seen = new Set<string>();
    const combined: { symbol: string; name: string; tag: string }[] = [];

    for (const item of ALL_CATALOG_ITEMS) {
      if (
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q)
      ) {
        if (!seen.has(item.symbol)) {
          seen.add(item.symbol);
          combined.push(item);
        }
      }
    }

    for (const item of remoteSearchItems) {
      if (!seen.has(item.symbol)) {
        seen.add(item.symbol);
        combined.push(item);
      }
    }

    return combined.map(
      (item) =>
        quotes[item.symbol] || {
          symbol: item.symbol,
          name: item.name,
          tag: item.tag,
          price: 0,
          change: 0,
          change_pct: 0,
          volume: 0,
          market: /^\d/.test(item.symbol) || item.symbol === "^TWII" ? "TW" : "US",
        }
    );
  }, [activeTab, quotes, searchQuery, remoteSearchItems]);

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">多元資產與全市場 ETF 中心</h1>
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium">
              <Sparkles size={12} /> 支援全台股 250+ 檔上市櫃 ETF 與美股 ETF 即時檢索
            </span>
          </div>
          <p className="text-secondary text-sm">
            涵蓋台股市值/高股息/科技/債券/槓反 ETF、美股主流 ETF、加密貨幣、黃金原物料與外匯（點擊任一標的可看 K 線與 ETF 成分股/折溢價/配息追蹤）
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <Search size={16} className="text-secondary" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="跨分類搜尋全市場 ETF 與多元資產標的..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </header>

      {/* 視圖切換：每日資金流向與申贖動態 VS 全市場 250+ 標的行情檢索 */}
      <div className="flex border-b border-[var(--border)] gap-2 pb-1">
        <button
          onClick={() => setMainView("flow")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            mainView === "flow" && !searchQuery.trim()
              ? "bg-accent text-white shadow-sm"
              : "text-secondary hover:text-primary hover:bg-[var(--bg-secondary)]"
          }`}
        >
          <Flame size={16} />
          <span>每日 ETF 資金流向與申贖動向</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/30 text-white font-mono">LIVE</span>
        </button>

        <button
          onClick={() => setMainView("catalog")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
            mainView === "catalog" || searchQuery.trim()
              ? "bg-accent text-white shadow-sm"
              : "text-secondary hover:text-primary hover:bg-[var(--bg-secondary)]"
          }`}
        >
          <Layers size={16} />
          <span>全市場 250+ 標的即時報價總覽</span>
        </button>
      </div>

      {mainView === "flow" && !searchQuery.trim() ? (
        <EtfCapitalFlowTracker />
      ) : (
        <Card className="w-full">
        <div className="border-b border-[var(--border)] flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-4">
          {Object.entries(ASSET_CATEGORIES).map(([id, cat]) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                setSearchQuery("");
              }}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === id && !searchQuery.trim()
                  ? "bg-accent text-white shadow-md"
                  : "text-secondary hover:text-primary hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  activeTab === id && !searchQuery.trim()
                    ? "bg-white/20 text-white"
                    : "bg-[var(--bg-tertiary)] text-muted"
                }`}
              >
                {cat.items.length}
              </span>
            </button>
          ))}
        </div>

        {searchQuery.trim() && (
          <div className="mb-3 px-1 flex items-center justify-between text-xs text-secondary">
            <span>
              正在跨全市場搜尋「<strong className="text-accent">{searchQuery}</strong>」，共找到{" "}
              <strong className="text-primary">{displayedItems.length}</strong> 檔 ETF / 資產標的
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-accent hover:underline"
            >
              清除搜尋返回分類
            </button>
          </div>
        )}

        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>代碼</th>
                <th>標的名稱</th>
                <th>
                  <Term k="etf_expense" label="資產類別 / 主題" />
                </th>
                <th className="text-right">最新市價</th>
                <th className="text-right">漲跌</th>
                <th className="text-right">漲跌幅</th>
                <th className="text-right">成交量</th>
              </tr>
            </thead>
            <tbody className={loading && Object.keys(quotes).length === 0 ? "opacity-50" : ""}>
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-secondary">
                    找不到符合條件的投資標的，請嘗試輸入代號或名稱
                  </td>
                </tr>
              ) : (
                displayedItems.map((item) => (
                  <tr key={item.symbol}>
                    <td>
                      <Link
                        href={`/stock/${encodeURIComponent(item.symbol)}`}
                        className="font-mono font-semibold text-accent hover:underline"
                      >
                        {item.symbol}
                      </Link>
                    </td>
                    <td>
                      <Link
                        href={`/stock/${encodeURIComponent(item.symbol)}`}
                        className="font-medium text-primary hover:text-accent transition-colors"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td>
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-secondary border border-[var(--border)]">
                        {item.tag}
                      </span>
                    </td>
                    <td className="text-right font-mono tabular-nums font-semibold">
                      {item.price > 0 ? formatNumber(item.price, item.price < 10 ? 3 : 2) : "載入中..."}
                    </td>
                    <td className={`text-right font-mono tabular-nums ${getChangeColorClass(item.change, item.market)}`}>
                      {item.price > 0 ? `${item.change > 0 ? "+" : ""}${item.change.toFixed(2)}` : "—"}
                    </td>
                    <td className="text-right">
                      {item.price > 0 ? <Badge value={item.change_pct} market={item.market} /> : "—"}
                    </td>
                    <td className="text-right font-mono tabular-nums text-secondary">
                      {item.volume > 0 ? formatVolume(item.volume) : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      )}
    </div>
  );
}
