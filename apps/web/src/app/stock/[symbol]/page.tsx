"use client";

import { useState, useEffect, use } from "react";
import dynamic from 'next/dynamic';
import Tabs from "@/components/ui/Tabs";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatNumber, formatVolume, getChangeColorClass } from "@/lib/utils";
import { Sparkles, Plus, Check, Layers } from "lucide-react";
import { apiStocks, apiResearch } from "@/lib/api";
import { fetchOrBuildDeepReport } from "@/lib/clientDeepReport";
import QuantDashboard from "@/components/dashboard/QuantDashboard";
import NewsSection from "@/components/dashboard/NewsSection";
import InstitutionalSection from "@/components/dashboard/InstitutionalSection";
import TransactionForm from "@/components/portfolio/TransactionForm";
import AISection from "@/components/dashboard/AISection";
import AIChartAnalyzer from "@/components/charts/AIChartAnalyzer";
import FinancialsSection from "@/components/stock/FinancialsSection";
import ETFInfoSection from "@/components/stock/ETFInfoSection";
import AICommitteeSection from "@/components/dashboard/AICommitteeSection";
import { Term, InfoTip } from "@/components/ui/TermTooltip";

const CandlestickChart = dynamic(() => import('@/components/charts/CandlestickChart'), { ssr: false });

const US_ETF_SET = new Set([
  "SPY", "VOO", "QQQ", "DIA", "IWM", "VYM", "SCHD", "JEPI", "JEPQ", "XLK", "XLF", "XLE", "XLV",
  "SOXX", "SMH", "ARKK", "TLT", "BND", "IEF", "SHY", "LQD", "HYG", "GLD", "SLV", "USO", "DBA",
  "IBIT", "FBTC", "ETHA", "VNQ", "IVV", "VTI", "VXUS", "EEM", "FXI", "EWJ",
]);

function detectAssetType(sym: string): "ETF" | "ASSET" | "STOCK" {
  const s = sym.trim().toUpperCase();
  const clean = s.replace(/\.TWO?$/, "");
  if (clean.startsWith("00") || US_ETF_SET.has(clean)) return "ETF";
  if (s.startsWith("^") || s.includes("=F") || s.includes("=X") || s.endsWith("-USD") || s.startsWith("DX-Y")) {
    return "ASSET";
  }
  return "STOCK";
}

const STORAGE_KEY = 'watchlist_symbols';

function getStoredSymbols(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function addToWatchlist(symbol: string) {
  const list = getStoredSymbols();
  if (!list.includes(symbol)) {
    list.push(symbol);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

function removeFromWatchlist(symbol: string) {
  const list = getStoredSymbols().filter(s => s !== symbol);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  prev_close: number;
  market: 'TW' | 'US';
  source?: string;
  stale?: boolean;
}

export default function StockDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: rawSymbol } = use(params);
  const symbol = decodeURIComponent(rawSymbol);

  const [stock, setStock] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("kline");
  const [priceLines, setPriceLines] = useState<{ price: number; color: string; title: string }[]>([]);
  const [deepSummary, setDeepSummary] = useState<any | null>(null);

  useEffect(() => {
    setInWatchlist(getStoredSymbols().includes(symbol));
    setDeepSummary(null);

    const fetchQuote = async () => {
      try {
        const res = await apiStocks.getQuote(symbol);
        setStock(res.data);
      } catch (e) {
        console.error("Failed to fetch quote", e);
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
    fetchOrBuildDeepReport(symbol)
      .then((resData) => setDeepSummary(resData))
      .catch(() => {});
    const timer = setInterval(fetchQuote, 30000);
    return () => clearInterval(timer);
  }, [symbol]);

  const toggleWatchlist = () => {
    if (inWatchlist) {
      removeFromWatchlist(symbol);
      setInWatchlist(false);
    } else {
      addToWatchlist(symbol);
      setInWatchlist(true);
    }
  };

  const market = stock?.market ?? (symbol.match(/^\d/) ? 'TW' : 'US');

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <div className="text-secondary">載入中...</div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="animate-fade-in flex items-center justify-center h-64">
        <div className="text-secondary">找不到此股票：{symbol}</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col h-full gap-6">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4 pb-2 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold font-mono tracking-tight">{stock.symbol}</h1>
            <span className="text-lg text-secondary font-medium">{stock.name}</span>
            <span className="text-xs px-2.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-secondary font-mono">{market}</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold font-mono tabular-nums">{formatNumber(stock.price, 2)}</span>
            <span className={`text-base font-mono tabular-nums font-medium ${getChangeColorClass(stock.change, market)}`}>
              {stock.change > 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.change_pct > 0 ? '+' : ''}{stock.change_pct.toFixed(2)}%)
            </span>
          </div>
          {(stock.stale || stock.source) && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted">
              <span>資料來源：{stock.source || '—'}</span>
              {stock.stale && (
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  非即時報價（休市或收盤最後成交價）
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2.5">
          <Button 
            variant="secondary"
            onClick={() => setIsFormOpen(true)}
          >
            <span>模擬下單</span>
          </Button>
          <Button 
            variant={inWatchlist ? "secondary" : "primary"} 
            onClick={toggleWatchlist}
          >
            {inWatchlist ? <Check size={15} /> : <Plus size={15} />}
            <span>{inWatchlist ? '已加自選' : '加自選'}</span>
          </Button>
        </div>
      </div>

      <TransactionForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        defaultSymbol={stock.symbol}
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[500px]">
        {/* Main Content Area */}
        <div className="lg:col-span-3 h-full">
          <Card className="h-full">
            {(() => {
              const canonical = stock.symbol;
              const assetType = detectAssetType(canonical);
              return (
                <Tabs 
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  tabs={[
                    {
                      id: 'kline',
                      label: 'K線與趨勢畫線',
                      content: (
                        <div className="pt-2">
                          <CandlestickChart symbol={canonical} market={market} priceLines={priceLines} />
                          <AIChartAnalyzer symbol={canonical} onLinesCalculated={setPriceLines} />
                        </div>
                      )
                    },
                    assetType === 'STOCK'
                      ? {
                          id: 'financials',
                          label: '財報與四大交易模型',
                          content: (
                            <FinancialsSection
                              key={canonical}
                              symbol={canonical}
                              onApplyStrategyLines={(lines) => {
                                setPriceLines(lines);
                                setActiveTab('kline');
                              }}
                            />
                          )
                        }
                      : {
                          id: 'etf-info',
                          label: assetType === 'ETF' ? 'ETF 追蹤資訊' : '標的規格與追蹤',
                          content: <ETFInfoSection key={canonical} symbol={canonical} />
                        },
                    {
                      id: 'quant',
                      label: '量化價量雷達',
                      content: <QuantDashboard symbol={canonical} currentPrice={stock.price} />
                    },
                    ...(market === 'TW' && assetType !== 'ASSET'
                      ? [{
                          id: 'institutional',
                          label: '法人籌碼',
                          content: <InstitutionalSection symbol={canonical} />
                        }]
                      : []),
                    {
                      id: 'ai-analysis',
                      label: 'AI 深度分析',
                      content: <AISection symbol={canonical} autoRun={true} />
                    },
                    {
                      id: 'ai-committee',
                      label: 'AI 投資委員會',
                      content: (
                        <div className="pt-2">
                          <AICommitteeSection symbol={canonical} />
                        </div>
                      )
                    },
                    {
                      id: 'news',
                      label: '即時新聞',
                      content: <NewsSection symbol={canonical} />
                    },
                  ]}
                />
              );
            })()}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {deepSummary?.verdict && activeTab !== 'financials' && (
            <Card
              title={<Term k="snowflake_radar" label="多空裁決與策略價位" />}
              subtitle={
                deepSummary.is_etf
                  ? "整合追蹤指數、內扣費用與趨勢位階"
                  : "整合財報體質、估值與四大策略模型"
              }
              variant="accent-border"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">綜合多空評級</span>
                  <span className="px-2.5 py-1 rounded-md bg-accent/15 text-accent text-xs font-bold font-mono">
                    {deepSummary.verdict.rating} ({deepSummary.verdict.total_score}/100)
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[var(--bg-primary)]/70 border border-[var(--border)] text-xs text-primary leading-relaxed">
                  <span className="font-semibold text-accent mr-1">結論:</span>
                  <span>{deepSummary.verdict.conclusion}</span>
                </div>

                {deepSummary.models && (
                  <div className="space-y-1.5 text-xs border-t border-[var(--border)] pt-3">
                    <div className="flex justify-between items-center">
                      {deepSummary.is_etf ? (
                        <Term k="expense_ratio" label="追蹤與費用結構" className="text-secondary" />
                      ) : (
                        <Term k="piotroski" label="Piotroski F-Score" className="text-secondary" />
                      )}
                      <span className="font-mono font-semibold text-primary">
                        {deepSummary.models.piotroski?.score}/{deepSummary.models.piotroski?.max_score} ({deepSummary.models.piotroski?.status})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      {deepSummary.is_etf ? (
                        <Term k="bias_20ma" label="波段相對強度" className="text-secondary" />
                      ) : (
                        <Term k="canslim" label="O'Neil CANSLIM" className="text-secondary" />
                      )}
                      <span className="font-mono font-semibold text-primary">
                        {deepSummary.models.canslim?.score}/{deepSummary.models.canslim?.max_score} ({deepSummary.models.canslim?.status})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Term k="minervini" label="Minervini VCP" className="text-secondary" />
                      <span className="font-mono font-semibold text-primary">
                        {deepSummary.models.minervini?.score}/{deepSummary.models.minervini?.max_score} ({deepSummary.models.minervini?.status})
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Term k="smc" label="SMC 聰明錢結構" className="text-secondary" />
                      <span className="font-mono font-semibold text-primary">
                        {deepSummary.models.smc?.score}/{deepSummary.models.smc?.max_score} ({deepSummary.models.smc?.status})
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1.5 text-center pt-2 border-t border-[var(--border)] text-xs">
                  <div className="p-1.5 rounded bg-[var(--bg-primary)]">
                    <div className="text-[10px] text-secondary flex items-center justify-center">
                      <span>進場區</span>
                      <InfoTip term="entry_zone" />
                    </div>
                    <div className="font-mono font-bold text-indigo-400">
                      {deepSummary.verdict.entry_zone?.[0]}
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-[var(--bg-primary)]">
                    <div className="text-[10px] text-secondary flex items-center justify-center">
                      <span>停損價</span>
                      <InfoTip term="stop_loss" />
                    </div>
                    <div className="font-mono font-bold text-rose-400">
                      {deepSummary.verdict.stop_loss}
                    </div>
                  </div>
                  <div className="p-1.5 rounded bg-[var(--bg-primary)]">
                    <div className="text-[10px] text-secondary flex items-center justify-center">
                      <span>目標價</span>
                      <InfoTip term="target_price" />
                    </div>
                    <div className="font-mono font-bold text-emerald-400">
                      {deepSummary.verdict.target_price}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      const v = deepSummary.verdict;
                      const smc = deepSummary.models?.smc;
                      const lines: { price: number; color: string; title: string }[] = [
                        { price: v.target_price, color: "#10b981", title: "目標價 (Target)" },
                        { price: v.entry_zone[1], color: "#6366f1", title: "建議進場上緣" },
                        { price: v.entry_zone[0], color: "#3b82f6", title: "建議進場下緣" },
                        { price: v.stop_loss, color: "#ef4444", title: "防守停損 (Stop)" },
                      ];
                      if (smc?.bullish_ob?.low) {
                        lines.push({
                          price: smc.bullish_ob.low,
                          color: "#22c55e",
                          title: "SMC 多方訂單塊支撐",
                        });
                      }
                      if (smc?.bearish_ob?.high) {
                        lines.push({
                          price: smc.bearish_ob.high,
                          color: "#f97316",
                          title: "SMC 空方訂單塊壓力",
                        });
                      }
                      setPriceLines(lines);
                      setActiveTab("kline");
                    }}
                  >
                    <Layers size={13} />
                    <span>套用模型價位與訂單塊至 K 線</span>
                  </Button>
                  {detectAssetType(stock.symbol) === "STOCK" && activeTab !== "financials" && (
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-full"
                      onClick={() => setActiveTab("financials")}
                    >
                      <span>查看完整財報與四大模型報告</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card title="今日行情明細">
            <div className="divide-y divide-[var(--border)] text-sm">
              <div className="flex justify-between py-2.5"><span className="text-secondary">開盤價</span><span className="font-mono tabular-nums font-medium">{formatNumber(stock.open, 2)}</span></div>
              <div className="flex justify-between py-2.5"><span className="text-secondary">最高價</span><span className="font-mono tabular-nums font-medium">{formatNumber(stock.high, 2)}</span></div>
              <div className="flex justify-between py-2.5"><span className="text-secondary">最低價</span><span className="font-mono tabular-nums font-medium">{formatNumber(stock.low, 2)}</span></div>
              <div className="flex justify-between py-2.5"><span className="text-secondary">昨收價</span><span className="font-mono tabular-nums font-medium">{formatNumber(stock.prev_close, 2)}</span></div>
              <div className="flex justify-between py-2.5"><span className="text-secondary">成交量</span><span className="font-mono tabular-nums font-medium">{formatVolume(stock.volume)}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
