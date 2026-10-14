"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiQuant } from "@/lib/api";
import {
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Percent,
  Award,
  Calendar,
  GitBranch,
  Sliders,
  DollarSign,
  Info,
  Loader2,
  ChevronRight
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface StrategyMeta {
  id: string;
  name: string;
  category: string;
  github_ref: string;
  description: string;
  params: Array<{
    key: string;
    label: string;
    type: string;
    default: number;
    min?: number;
    max?: number;
    step?: number;
  }>;
}

interface BacktestSummary {
  initial_capital: number;
  final_equity: number;
  total_return_pct: number;
  benchmark_return_pct: number;
  alpha_pct: number;
  cagr_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  win_rate_pct: number;
  profit_factor: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_trade_return_pct: number;
  avg_holding_days: number;
  max_win_pct: number;
  max_loss_pct: number;
}

interface TradeLog {
  id: number;
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  shares: number;
  pnl: number;
  return_pct: number;
  hold_days: number;
  exit_reason: string;
}

export default function BacktestPage() {
  const [strategies, setStrategies] = useState<StrategyMeta[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("supertrend");
  const [symbol, setSymbol] = useState<string>("2330.TW");
  const [period, setPeriod] = useState<string>("1y");
  const [initialCapital, setInitialCapital] = useState<number>(1000000);
  const [stopLossPct, setStopLossPct] = useState<string>("");
  const [strategyParams, setStrategyParams] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    summary: BacktestSummary;
    equity_curve: any[];
    trades: TradeLog[];
  } | null>(null);

  const [tradeFilter, setTradeFilter] = useState<'all' | 'win' | 'loss'>('all');

  const POPULAR_SYMBOLS = [
    { label: "台積電", symbol: "2330.TW" },
    { label: "元大台灣50", symbol: "0050.TW" },
    { label: "聯發科", symbol: "2454.TW" },
    { label: "鴻海", symbol: "2317.TW" },
    { label: "長榮", symbol: "2603.TW" },
    { label: "緯創", symbol: "3231.TW" },
  ];

  // 載入策略清單
  useEffect(() => {
    async function loadStrategies() {
      try {
        const res = await apiQuant.getStrategyList();
        const list: StrategyMeta[] = res.data || [];
        setStrategies(list);
        if (list.length > 0) {
          setSelectedStrategyId(list[0].id);
          // 初始化預設參數
          const initParams: Record<string, any> = {};
          list[0].params.forEach(p => {
            initParams[p.key] = p.default;
          });
          setStrategyParams(initParams);
        }
      } catch (err) {
        console.error("Failed to load strategies:", err);
      }
    }
    loadStrategies();
  }, []);

  // 當切換策略時，重置為該策略的預設參數
  const handleStrategyChange = (stratId: string) => {
    setSelectedStrategyId(stratId);
    const target = strategies.find(s => s.id === stratId);
    if (target) {
      const newParams: Record<string, any> = {};
      target.params.forEach(p => {
        newParams[p.key] = p.default;
      });
      setStrategyParams(newParams);
    }
  };

  const handleRunBacktest = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        symbol: symbol.trim(),
        strategy_id: selectedStrategyId,
        period,
        initial_capital: Number(initialCapital),
        stop_loss_pct: stopLossPct ? Number(stopLossPct) / 100 : null,
        params: strategyParams
      };
      const res = await apiQuant.runBacktest(payload);
      setResult(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || "回測計算發生錯誤，請檢查股票代碼或縮短回測天數");
    } finally {
      setLoading(false);
    }
  };

  // 初始載入自動跑一次 2330.TW
  useEffect(() => {
    if (strategies.length > 0) {
      handleRunBacktest();
    }
  }, [strategies]);

  const currentStrategy = strategies.find(s => s.id === selectedStrategyId);

  const filteredTrades = (result?.trades || []).filter(t => {
    if (tradeFilter === 'win') return t.pnl > 0;
    if (tradeFilter === 'loss') return t.pnl <= 0;
    return true;
  });

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* 標題區塊 */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">量化策略研究與歷史回測系統</h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              GitHub Open-Source Quant
            </span>
          </div>
          <p className="text-secondary text-sm">
            代入經典量化模型（海龜法則、SuperTrend、Dual Thrust、布林RSI均值回歸），透過真實歷史價量逐筆驗證策略報酬率與風控表現。
          </p>
        </div>
      </header>

      {/* 控制設定面板 */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 1. 標的設定 */}
          <div>
            <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
              選擇回測標的
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="例如: 2330.TW"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            {/* 快速標的 Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {POPULAR_SYMBOLS.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => setSymbol(item.symbol)}
                  className={`text-xs px-2 py-1 rounded-md transition-all ${
                    symbol === item.symbol
                      ? "bg-accent text-white font-medium"
                      : "bg-[var(--bg-secondary)] hover:bg-[var(--border)] text-secondary"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 策略選擇 */}
          <div>
            <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
              量化交易策略
            </label>
            <select
              value={selectedStrategyId}
              onChange={(e) => handleStrategyChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
            {currentStrategy && (
              <div className="mt-2 text-xs text-secondary flex items-center gap-1">
                <GitBranch size={12} className="text-accent" />
                <span className="truncate">{currentStrategy.github_ref}</span>
              </div>
            )}
          </div>

          {/* 3. 回測區間與資金 */}
          <div>
            <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
              回測週期 & 起始本金
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg focus:outline-none"
              >
                <option value="6mo">最近 6 個月</option>
                <option value="1y">最近 1 年</option>
                <option value="2y">最近 2 年</option>
                <option value="3y">最近 3 年</option>
              </select>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                placeholder="本金"
                className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg focus:outline-none"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-secondary">停損 % (可選):</span>
              <input
                type="number"
                value={stopLossPct}
                onChange={(e) => setStopLossPct(e.target.value)}
                placeholder="如 7%"
                className="w-20 px-2 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none"
              />
            </div>
          </div>

          {/* 4. 執行按鈕 */}
          <div className="flex flex-col justify-end">
            <Button
              variant="primary"
              onClick={handleRunBacktest}
              disabled={loading}
              className="w-full py-2.5 font-bold shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  回測運算中...
                </>
              ) : (
                <>
                  <Play size={18} />
                  開始策略回測
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 策略說明與自訂參數調校 */}
        {currentStrategy && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-accent mt-0.5 flex-shrink-0" />
                <span className="text-xs text-secondary leading-relaxed">
                  {currentStrategy.description}
                </span>
              </div>
            </div>

            {/* 參數輸入欄位 */}
            {currentStrategy.params.length > 0 && (
              <div className="flex flex-wrap items-center gap-4 bg-[var(--bg-secondary)]/50 p-3 rounded-lg border border-[var(--border)]">
                <span className="text-xs font-semibold text-secondary flex items-center gap-1">
                  <Sliders size={14} /> 策略參數微調:
                </span>
                {currentStrategy.params.map((param) => (
                  <div key={param.key} className="flex items-center gap-2">
                    <label className="text-xs text-secondary">{param.label}:</label>
                    <input
                      type="number"
                      step={param.step || 1}
                      min={param.min}
                      max={param.max}
                      value={strategyParams[param.key] ?? param.default}
                      onChange={(e) =>
                        setStrategyParams({
                          ...strategyParams,
                          [param.key]: Number(e.target.value),
                        })
                      }
                      className="w-20 px-2 py-1 text-xs bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 錯誤提示 */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
          <ShieldAlert size={18} />
          {error}
        </div>
      )}

      {/* 回測統計績效指標 (KPI Cards) */}
      {result && result.summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* 累積報酬率 */}
            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-secondary">策略累積報酬</span>
              <div className="my-1">
                <span
                  className={`text-2xl font-bold font-mono ${
                    result.summary.total_return_pct >= 0 ? "text-up-tw" : "text-down-tw"
                  }`}
                >
                  {result.summary.total_return_pct >= 0 ? "+" : ""}
                  {result.summary.total_return_pct.toFixed(2)}%
                </span>
              </div>
              <span className="text-xs text-secondary flex items-center gap-1">
                基準: {result.summary.benchmark_return_pct.toFixed(1)}%
              </span>
            </Card>

            {/* 超額報酬 (Alpha) */}
            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-secondary">超額報酬 (Alpha)</span>
              <div className="my-1">
                <span
                  className={`text-2xl font-bold font-mono ${
                    result.summary.alpha_pct >= 0 ? "text-up-tw" : "text-down-tw"
                  }`}
                >
                  {result.summary.alpha_pct >= 0 ? "+" : ""}
                  {result.summary.alpha_pct.toFixed(2)}%
                </span>
              </div>
              <span className="text-xs text-secondary">打敗買入持有</span>
            </Card>

            {/* 最大回撤 (MDD) */}
            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-secondary">最大回撤 (MDD)</span>
              <div className="my-1">
                <span className="text-2xl font-bold font-mono text-down-tw">
                  -{result.summary.max_drawdown_pct.toFixed(2)}%
                </span>
              </div>
              <span className="text-xs text-secondary">最差下跌風險</span>
            </Card>

            {/* 夏普比率 (Sharpe) */}
            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-secondary">夏普比率 (Sharpe)</span>
              <div className="my-1">
                <span className="text-2xl font-bold font-mono text-primary">
                  {result.summary.sharpe_ratio.toFixed(2)}
                </span>
              </div>
              <span className="text-xs text-secondary">風險調整後收益</span>
            </Card>

            {/* 勝率 (Win Rate) */}
            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-secondary">交易勝率</span>
              <div className="my-1">
                <span className="text-2xl font-bold font-mono text-primary">
                  {result.summary.win_rate_pct.toFixed(1)}%
                </span>
              </div>
              <span className="text-xs text-secondary">
                {result.summary.winning_trades}勝 / {result.summary.losing_trades}敗
              </span>
            </Card>

            {/* 盈虧比 (Profit Factor) */}
            <Card className="p-4 flex flex-col justify-between">
              <span className="text-xs text-secondary">獲利因子 (P/L Ratio)</span>
              <div className="my-1">
                <span className="text-2xl font-bold font-mono text-primary">
                  {result.summary.profit_factor.toFixed(2)}
                </span>
              </div>
              <span className="text-xs text-secondary">
                總筆數: {result.summary.total_trades} 次
              </span>
            </Card>
          </div>

          {/* 策略資產累積曲線 (Equity Curve) */}
          <Card title="資產淨值走勢 (策略 vs 買入持有基準)" className="p-5">
            <div className="h-[380px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.equity_curve} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--color-secondary)", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: "var(--color-secondary)", fontSize: 11 }}
                    tickFormatter={(val) => `$${(val / 10000).toFixed(0)}萬`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-bg-secondary)",
                      borderColor: "var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(val: any, name: any) => [
                      `$${Number(val).toLocaleString()} (${name === "equity" ? "策略淨值" : "標的基準"})`,
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(val) => (val === "equity" ? "📈 策略淨值 (Strategy)" : "📊 買入持有基準 (Benchmark)")}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={false}
                    name="equity"
                  />
                  <Line
                    type="monotone"
                    dataKey="benchmark_equity"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="benchmark_equity"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 回撤水下圖 (Underwater Drawdown Chart) */}
          <Card title="回撤風險走勢 (Underwater Drawdown %)" className="p-5">
            <div className="h-[200px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.equity_curve} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--color-secondary)", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[-30, 0]}
                    tick={{ fill: "var(--color-secondary)", fontSize: 11 }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--color-bg-secondary)",
                      borderColor: "var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [`${val}%`, "回撤幅度"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="drawdown_pct"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.25}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 歷史交易記錄明細 (Trade Logs) */}
          <Card
            title={`回測交易明細清單 (${result.trades.length} 筆)`}
            headerAction={
              <div className="flex gap-1">
                {(['all', 'win', 'loss'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTradeFilter(filter)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      tradeFilter === filter
                        ? "bg-accent text-white"
                        : "bg-[var(--bg-secondary)] text-secondary hover:text-primary"
                    }`}
                  >
                    {filter === 'all' && `全部 (${result.trades.length})`}
                    {filter === 'win' && `獲利 (${result.summary.winning_trades})`}
                    {filter === 'loss' && `虧損 (${result.summary.losing_trades})`}
                  </button>
                ))}
              </div>
            }
          >
            {filteredTrades.length === 0 ? (
              <div className="py-12 text-center text-secondary text-sm">
                此篩選條件下無任何交易記錄
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--bg-secondary)]/60 text-secondary uppercase text-xs">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">進場日期</th>
                      <th className="py-3 px-4">出場日期</th>
                      <th className="py-3 px-4">進場價格</th>
                      <th className="py-3 px-4">出場價格</th>
                      <th className="py-3 px-4">交易股數</th>
                      <th className="py-3 px-4">獲利金額 (TWD)</th>
                      <th className="py-3 px-4">報酬率 (%)</th>
                      <th className="py-3 px-4">持有天數</th>
                      <th className="py-3 px-4">出場原因</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-[var(--bg-secondary)]/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-secondary">{t.id}</td>
                        <td className="py-3 px-4 font-mono">{t.entry_date}</td>
                        <td className="py-3 px-4 font-mono">{t.exit_date}</td>
                        <td className="py-3 px-4 font-mono">${t.entry_price.toFixed(2)}</td>
                        <td className="py-3 px-4 font-mono">${t.exit_price.toFixed(2)}</td>
                        <td className="py-3 px-4 font-mono">{t.shares.toLocaleString()}</td>
                        <td
                          className={`py-3 px-4 font-mono font-semibold ${
                            t.pnl > 0 ? "text-up-tw" : "text-down-tw"
                          }`}
                        >
                          {t.pnl > 0 ? "+" : ""}${t.pnl.toLocaleString()}
                        </td>
                        <td
                          className={`py-3 px-4 font-mono font-semibold ${
                            t.return_pct > 0 ? "text-up-tw" : "text-down-tw"
                          }`}
                        >
                          {t.return_pct > 0 ? "+" : ""}
                          {t.return_pct.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 font-mono">{t.hold_days} 天</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              t.exit_reason.includes("停損")
                                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            {t.exit_reason}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
