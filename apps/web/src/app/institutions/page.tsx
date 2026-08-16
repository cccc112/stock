"use client";

import { useState, useEffect } from "react";
import { apiInstitutions } from "@/lib/api";
import Card from "@/components/ui/Card";
import Tabs from "@/components/ui/Tabs";
import Badge from "@/components/ui/Badge";
import LoadingSkeleton from "@/components/ui/LoadingSkeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { Landmark, TrendingUp, TrendingDown, DollarSign, Calendar, User } from "lucide-react";

export default function InstitutionsPage() {
  const [activeTab, setActiveTab] = useState<'TW' | 'US'>('TW');
  const [loading, setLoading] = useState(true);
  const [twData, setTwData] = useState<any[]>([]);
  const [usData, setUsData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'TW') {
        try {
          const res = await apiInstitutions.getTw();
          if (res.data && Array.isArray(res.data)) {
            setTwData(res.data);
          } else {
            // Mock data if backend doesn't return proper array
            setTwData(generateMockTwData());
          }
        } catch (e) {
          console.log('Failed to fetch TW data, using mock', e);
          setTwData(generateMockTwData());
        }
      } else {
        try {
          const res = await apiInstitutions.getUs13F();
          if (res.data && Array.isArray(res.data)) {
            setUsData(res.data);
          } else {
            setUsData(generateMockUsData());
          }
        } catch (e) {
          console.log('Failed to fetch US data, using mock', e);
          setUsData(generateMockUsData());
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const generateMockTwData = () => {
    const data = [];
    const today = new Date();
    for (let i = 14; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      
      data.push({
        date: d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }),
        foreign: Math.floor(Math.random() * 200) - 100, // -100 to 100 billion
        trust: Math.floor(Math.random() * 50) - 10,     // -10 to 40 billion
        dealer: Math.floor(Math.random() * 60) - 30,    // -30 to 30 billion
      });
    }
    return data;
  };

  const generateMockUsData = () => {
    return [
      {
        id: "berkshire",
        fundName: "Berkshire Hathaway Inc",
        manager: "Warren Buffett",
        reportDate: "2024-02-14",
        portfolioValue: "$347.36B",
        topBuys: ["OXY", "CVX", "SIRI"],
        topSells: ["AAPL", "HPQ", "PYPL"],
      },
      {
        id: "bridgewater",
        fundName: "Bridgewater Associates",
        manager: "Ray Dalio",
        reportDate: "2024-02-13",
        portfolioValue: "$17.8B",
        topBuys: ["IVV", "IEMG", "GOOGL"],
        topSells: ["PG", "JNJ", "PEP"],
      },
      {
        id: "renaissance",
        fundName: "Renaissance Technologies",
        manager: "Peter Brown",
        reportDate: "2024-02-12",
        portfolioValue: "$64.5B",
        topBuys: ["META", "VRTX", "GILD"],
        topSells: ["TSLA", "AMZN", "MSFT"],
      },
      {
        id: "pershing",
        fundName: "Pershing Square Capital",
        manager: "Bill Ackman",
        reportDate: "2024-02-14",
        portfolioValue: "$10.4B",
        topBuys: ["CMG", "HLT", "QSR"],
        topSells: ["LOW", "BHF", "HHC"],
      }
    ];
  };

  const renderTwTab = () => {
    if (loading) return <LoadingSkeleton variant="card" />;
    
    return (
      <div className="space-y-6 animate-fade-in">
        <Card title="三大法人買賣超 (億台幣)" className="h-[500px]">
          <div className="h-full pb-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={twData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-secondary)" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  fontSize={12} 
                  tickFormatter={(value) => `${value}億`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }}
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-secondary)', 
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px'
                  }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Bar dataKey="foreign" name="外資" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="trust" name="投信" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dealer" name="自營商" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

  const renderUsTab = () => {
    if (loading) return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <LoadingSkeleton variant="card" />
        <LoadingSkeleton variant="card" />
      </div>
    );
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
        {usData.map((fund) => (
          <Card key={fund.id} variant="elevated" className="hover:border-accent transition-colors border border-[var(--border)]">
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start mb-4 border-b border-[var(--border)] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                    <Landmark size={20} className="text-accent" />
                    {fund.fundName}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-secondary">
                    <span className="flex items-center gap-1">
                      <User size={14} /> {fund.manager}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-primary">{fund.portfolioValue}</div>
                  <div className="flex items-center justify-end gap-1 text-xs text-secondary mt-1">
                    <Calendar size={12} /> {fund.reportDate}
                  </div>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-green-500">
                    <TrendingUp size={16} />
                    <span>Top Buys (本季加碼)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fund.topBuys.map((ticker: string) => (
                      <Badge key={ticker} value={1} isPercent={false} size="sm" className="bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1">
                        {ticker}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-red-500">
                    <TrendingDown size={16} />
                    <span>Top Sells (本季減碼)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {fund.topSells.map((ticker: string) => (
                      <Badge key={ticker} value={-1} isPercent={false} size="sm" className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-1">
                        {ticker}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Landmark className="text-accent" />
            機構追蹤
          </h1>
          <p className="text-secondary text-sm">追蹤台股三大法人動向與美股 13F 機構持倉</p>
        </div>
      </header>

      <div className="flex gap-4 border-b border-[var(--border)] mb-6">
        <button
          onClick={() => setActiveTab('TW')}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'TW' ? 'text-accent' : 'text-secondary hover:text-primary'
          }`}
        >
          台股三大法人
          {activeTab === 'TW' && (
            <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[var(--accent)] rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('US')}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeTab === 'US' ? 'text-accent' : 'text-secondary hover:text-primary'
          }`}
        >
          美股 13F 報告
          {activeTab === 'US' && (
            <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[var(--accent)] rounded-t-full" />
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
          {error}
        </div>
      )}

      {activeTab === 'TW' ? renderTwTab() : renderUsTab()}
    </div>
  );
}
