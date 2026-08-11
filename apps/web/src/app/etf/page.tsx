"use client";

import { useEffect, useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import Link from "next/link";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { apiStocks } from "@/lib/api";
import { Search } from "lucide-react";

interface ETFQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market: 'TW' | 'US';
}

const ETF_CATEGORIES = {
  'market': [
    { symbol: '0050.TW', name: '元大台灣50' },
    { symbol: '006208.TW', name: '富邦台50' },
    { symbol: '00692.TW', name: '富邦公司治理' },
    { symbol: 'SPY', name: 'SPDR S&P 500' },
    { symbol: 'VOO', name: 'Vanguard S&P 500' },
    { symbol: 'QQQ', name: 'Invesco QQQ (Nasdaq)' },
    { symbol: 'DIA', name: 'SPDR Dow Jones' },
  ],
  'dividend': [
    { symbol: '0056.TW', name: '元大高股息' },
    { symbol: '00878.TW', name: '國泰永續高股息' },
    { symbol: '00929.TW', name: '復華台灣科技優息' },
    { symbol: '00919.TW', name: '群益台灣精選高息' },
    { symbol: '00713.TW', name: '元大台灣高息低波' },
    { symbol: 'VYM', name: 'Vanguard High Dividend' },
  ],
  'tech': [
    { symbol: '00881.TW', name: '國泰台灣5G+' },
    { symbol: '00891.TW', name: '中信關鍵半導體' },
    { symbol: '00830.TW', name: '國泰費城半導體' },
    { symbol: 'XLK', name: 'Technology Select Sector' },
    { symbol: 'SOXX', name: 'iShares Semiconductor' },
  ],
  'bond': [
    { symbol: '00679B.TW', name: '元大美債20年' },
    { symbol: '00687B.TW', name: '國泰20年美債' },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury' },
    { symbol: 'BND', name: 'Vanguard Total Bond' },
  ]
};

export default function EtfPage() {
  const [etfs, setEtfs] = useState<Record<string, ETFQuote>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('market');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch quotes for the currently active tab
  useEffect(() => {
    const fetchTabETFs = async () => {
      setLoading(true);
      const symbolsToFetch = ETF_CATEGORIES[activeTab as keyof typeof ETF_CATEGORIES];
      
      const promises = symbolsToFetch.map(async (item) => {
        // Skip if we already fetched this symbol and it has data
        if (etfs[item.symbol]) return null;
        try {
          const res = await apiStocks.getQuote(item.symbol);
          return { ...res.data, name: item.name }; // override with our clean name
        } catch (e) {
          return null;
        }
      });

      const results = await Promise.all(promises);
      const newEtfs = { ...etfs };
      let updated = false;
      
      results.forEach(res => {
        if (res) {
          newEtfs[res.symbol] = res;
          updated = true;
        }
      });

      if (updated) {
        setEtfs(newEtfs);
      }
      setLoading(false);
    };

    fetchTabETFs();
    // Auto-refresh every 30s
    const timer = setInterval(fetchTabETFs, 30000);
    return () => clearInterval(timer);
  }, [activeTab]); // Note: intentional omission of `etfs` dependency to prevent infinite loops

  // Filter based on search query
  const displayedEtfs = useMemo(() => {
    const currentCategoryList = ETF_CATEGORIES[activeTab as keyof typeof ETF_CATEGORIES];
    const rawList = currentCategoryList
      .map(item => etfs[item.symbol] || { 
        symbol: item.symbol, name: item.name, price: 0, change: 0, change_pct: 0, volume: 0, market: item.symbol.includes('.TW') ? 'TW' : 'US' 
      });
      
    if (!searchQuery.trim()) return rawList;
    
    const query = searchQuery.toLowerCase();
    return rawList.filter(etf => 
      etf.symbol.toLowerCase().includes(query) || 
      etf.name.toLowerCase().includes(query)
    );
  }, [activeTab, etfs, searchQuery]);


  const renderTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left py-3 px-4">代號</th>
              <th className="text-left py-3 px-4">名稱</th>
              <th className="text-right py-3 px-4">市價</th>
              <th className="text-right py-3 px-4">漲跌</th>
              <th className="text-right py-3 px-4">漲跌幅</th>
              <th className="text-right py-3 px-4">成交量</th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
            {displayedEtfs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-secondary">找不到符合的 ETF</td>
              </tr>
            ) : (
              displayedEtfs.map(etf => (
                <tr key={etf.symbol}>
                  <td className="py-3 px-4">
                    <Link href={`/stock/${etf.symbol}`} className="font-medium text-accent hover:underline">
                      {etf.symbol}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-secondary">{etf.name}</td>
                  <td className="text-right py-3 px-4 font-medium">
                    {etf.price > 0 ? formatNumber(etf.price, etf.market === 'TW' ? 2 : 2) : '-'}
                  </td>
                  <td className={`text-right py-3 px-4 ${getChangeColorClass(etf.change, etf.market)}`}>
                    {etf.change > 0 ? '+' : ''}{etf.price > 0 ? etf.change.toFixed(2) : '-'}
                  </td>
                  <td className="text-right py-3 px-4">
                    <Badge value={etf.change_pct} market={etf.market} />
                  </td>
                  <td className="text-right py-3 px-4 text-secondary">
                    {etf.volume > 0 ? formatVolume(etf.volume) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const tabs = [
    { id: 'market', label: '市值大盤型', content: renderTable() },
    { id: 'dividend', label: '高股息/存股', content: renderTable() },
    { id: 'tech', label: '科技半導體', content: renderTable() },
    { id: 'bond', label: '債券型', content: renderTable() },
  ];

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl mx-auto mt-6">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">ETF 專區</h1>
          <p className="text-secondary">台美股熱門 ETF 報價與板塊分類</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={18} className="text-secondary" />
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋 ETF (例如: 0050, SPY)" 
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-accent transition-colors"
          />
        </div>
      </header>

      <Card className="w-full">
        {/* Custom Tab handling to trigger activeTab state change */}
        <div className="border-b border-[var(--border)] flex gap-6 px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-2 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tabs.find(t => t.id === activeTab)?.content}
        </div>
      </Card>
    </div>
  );
}
