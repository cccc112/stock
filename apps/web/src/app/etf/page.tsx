"use client";

import { useEffect, useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Link from "next/link";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { apiStocks } from "@/lib/api";
import { Search } from "lucide-react";

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
  market: {
    label: "台美市值 ETF 與全球指數",
    items: [
      { symbol: "0050", name: "元大台灣50", tag: "台股市值 ETF" },
      { symbol: "006208", name: "富邦台50", tag: "台股市值 ETF" },
      { symbol: "00692", name: "富邦公司治理", tag: "台股市值 ETF" },
      { symbol: "SPY", name: "SPDR S&P 500 ETF", tag: "美股大盤 ETF" },
      { symbol: "VOO", name: "Vanguard S&P 500 ETF", tag: "美股大盤 ETF" },
      { symbol: "QQQ", name: "Invesco Nasdaq 100 ETF", tag: "美股科技 ETF" },
      { symbol: "^TWII", name: "台股加權指數", tag: "全球指數" },
      { symbol: "^SOX", name: "費城半導體指數", tag: "全球指數" },
      { symbol: "^N225", name: "日經 225 指數", tag: "全球指數" },
      { symbol: "^VIX", name: "VIX 波動率恐慌指數", tag: "波動率指數" },
    ],
  },
  dividend: {
    label: "高股息與 REITs 不動產",
    items: [
      { symbol: "0056", name: "元大高股息", tag: "季配高股息" },
      { symbol: "00878", name: "國泰永續高股息", tag: "季配高股息" },
      { symbol: "00919", name: "群益台灣精選高息", tag: "季配高股息" },
      { symbol: "00929", name: "復華台灣科技優息", tag: "月配高股息" },
      { symbol: "00713", name: "元大台灣高息低波", tag: "高息低波" },
      { symbol: "VYM", name: "Vanguard 美股高股息 ETF", tag: "美股高息" },
      { symbol: "VNQ", name: "Vanguard 美國不動產 REITs", tag: "REITs 不動產" },
      { symbol: "00712", name: "復華富時不動產", tag: "REITs 不動產" },
    ],
  },
  crypto: {
    label: "加密貨幣 (Crypto)",
    items: [
      { symbol: "BTC-USD", name: "比特幣 (Bitcoin)", tag: "主流加密貨幣" },
      { symbol: "ETH-USD", name: "以太坊 (Ethereum)", tag: "智能合約公鏈" },
      { symbol: "SOL-USD", name: "Solana (SOL)", tag: "高速公鏈" },
      { symbol: "BNB-USD", name: "幣安幣 (BNB)", tag: "交易所生態" },
      { symbol: "XRP-USD", name: "瑞波幣 (XRP)", tag: "跨境支付" },
      { symbol: "DOGE-USD", name: "狗狗幣 (Dogecoin)", tag: "迷因龍頭" },
      { symbol: "IBIT", name: "iShares 比特幣現貨 ETF", tag: "美股加密 ETF" },
    ],
  },
  commodity: {
    label: "黃金與大宗原物料",
    items: [
      { symbol: "GC=F", name: "黃金期貨 (Gold)", tag: "貴金屬避險" },
      { symbol: "SI=F", name: "白銀期貨 (Silver)", tag: "貴金屬/工業" },
      { symbol: "CL=F", name: "西德州原油 (WTI Crude)", tag: "能源期貨" },
      { symbol: "BZ=F", name: "布蘭特原油 (Brent)", tag: "能源期貨" },
      { symbol: "HG=F", name: "銅期貨 (Copper)", tag: "工業金屬景氣" },
      { symbol: "NG=F", name: "天然氣期貨 (Natural Gas)", tag: "能源期貨" },
      { symbol: "GLD", name: "SPDR 黃金現貨 ETF", tag: "商品 ETF" },
      { symbol: "SLV", name: "iShares 白銀現貨 ETF", tag: "商品 ETF" },
    ],
  },
  forex_bond: {
    label: "外匯匯率與美債殖利率",
    items: [
      { symbol: "TWD=X", name: "美元/台幣 (USD/TWD)", tag: "外匯匯率" },
      { symbol: "JPY=X", name: "美元/日圓 (USD/JPY)", tag: "外匯匯率" },
      { symbol: "EURUSD=X", name: "歐元/美元 (EUR/USD)", tag: "外匯匯率" },
      { symbol: "CNY=X", name: "美元/人民幣 (USD/CNY)", tag: "外匯匯率" },
      { symbol: "DX-Y.NYB", name: "美元指數 (DXY)", tag: "全球資金風向" },
      { symbol: "^TNX", name: "美國10年期公債殖利率", tag: "無風險利率基準" },
      { symbol: "^TYX", name: "美國30年期公債殖利率", tag: "長債利率基準" },
      { symbol: "00679B", name: "元大美債20年", tag: "台幣美債 ETF" },
      { symbol: "00687B", name: "國泰20年美債", tag: "台幣美債 ETF" },
      { symbol: "TLT", name: "iShares 20+年美債 ETF", tag: "美股長債 ETF" },
      { symbol: "IEF", name: "iShares 7-10年美債 ETF", tag: "美股中債 ETF" },
      { symbol: "LQD", name: "iShares 投資級公司債 ETF", tag: "公司債 ETF" },
    ],
  },
  tech: {
    label: "AI 科技與半導體",
    items: [
      { symbol: "00881", name: "國泰台灣5G+", tag: "台灣 AI 供應鏈" },
      { symbol: "00891", name: "中信關鍵半導體", tag: "台灣半導體" },
      { symbol: "00830", name: "國泰費城半導體", tag: "全球半導體" },
      { symbol: "SOXX", name: "iShares 半導體 ETF", tag: "美股半導體" },
      { symbol: "XLK", name: "SPDR 美國科技板塊 ETF", tag: "美股大型科技" },
    ],
  },
};

export default function EtfAndMultiAssetPage() {
  const [quotes, setQuotes] = useState<Record<string, AssetQuote>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("market");
  const [searchQuery, setSearchQuery] = useState("");

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
              name: item.name,
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

  const displayedItems = useMemo(() => {
    const category = ASSET_CATEGORIES[activeTab];
    if (!category) return [];
    const list: AssetQuote[] = category.items.map(
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

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (x) =>
        x.symbol.toLowerCase().includes(q) ||
        x.name.toLowerCase().includes(q) ||
        x.tag.toLowerCase().includes(q)
    );
  }, [activeTab, quotes, searchQuery]);

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">多元資產與 ETF 中心</h1>
          <p className="text-secondary text-sm">
            一站式追蹤台美股 ETF、加密貨幣、黃金/原物料期貨、外匯匯率、美債殖利率與全球指數（點擊任一標的可看 K 線與追蹤資訊）
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <Search size={16} className="text-secondary" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="篩選此分類標的 (例: 黃金, BTC, 0050)"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </header>

      <Card className="w-full">
        <div className="border-b border-[var(--border)] flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-4">
          {Object.entries(ASSET_CATEGORIES).map(([id, cat]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === id
                  ? "bg-accent text-white"
                  : "text-secondary hover:text-primary hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>代碼</th>
                <th>標的名稱</th>
                <th>資產類別</th>
                <th className="text-right">最新報價</th>
                <th className="text-right">漲跌</th>
                <th className="text-right">漲跌幅</th>
                <th className="text-right">成交量</th>
              </tr>
            </thead>
            <tbody className={loading && Object.keys(quotes).length === 0 ? "opacity-50" : ""}>
              {displayedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-secondary">
                    找不到符合條件的投資標的
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
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-secondary">
                        {item.tag}
                      </span>
                    </td>
                    <td className="text-right font-mono tabular-nums font-semibold">
                      {item.price > 0 ? formatNumber(item.price, item.price < 10 ? 3 : 2) : "—"}
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
    </div>
  );
}
