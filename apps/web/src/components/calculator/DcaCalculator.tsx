"use client";

import { useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Percent,
  Sparkles,
  PieChart,
  Repeat,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  PiggyBank,
  Coffee,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface PresetTarget {
  symbol: string;
  name: string;
  market: "TW" | "US";
  historicalCagr: number;
  dividendYield: number;
  category: string;
  description: string;
}

const PRESET_TARGETS: PresetTarget[] = [
  {
    symbol: "0050",
    name: "元大台灣50",
    market: "TW",
    historicalCagr: 12.5,
    dividendYield: 3.2,
    category: "台股市值型",
    description: "追蹤台股前 50 大龍頭權值股，受惠台積電與 AI 供應鏈長期成長",
  },
  {
    symbol: "006208",
    name: "富邦台50",
    market: "TW",
    historicalCagr: 12.8,
    dividendYield: 3.1,
    category: "台股市值型",
    description: "極低經理費（0.15%），長期累積複利效果勝過同類市值型",
  },
  {
    symbol: "00878",
    name: "國泰永續高股息",
    market: "TW",
    historicalCagr: 9.6,
    dividendYield: 7.2,
    category: "台股高股息",
    description: "ESG + 季配息，兼具波動穩定與豐沛現金流，受存股族廣泛青睞",
  },
  {
    symbol: "00919",
    name: "群益台灣精選高息",
    market: "TW",
    historicalCagr: 10.5,
    dividendYield: 9.8,
    category: "台股高股息",
    description: "聚焦高宣告股利標的，換股機制精準卡位除息行情",
  },
  {
    symbol: "0056",
    name: "元大高股息",
    market: "TW",
    historicalCagr: 8.5,
    dividendYield: 7.8,
    category: "台股高股息",
    description: "老牌高股息指標，預測未來一年現金股利殖利率最高標的",
  },
  {
    symbol: "2330",
    name: "台積電",
    market: "TW",
    historicalCagr: 22.4,
    dividendYield: 1.5,
    category: "權值龍頭個股",
    description: "全球半導體代工霸主，先進製程寡占，長期資本利得爆發力極高",
  },
  {
    symbol: "VOO",
    name: "Vanguard S&P 500 ETF",
    market: "US",
    historicalCagr: 12.0,
    dividendYield: 1.5,
    category: "美股大盤",
    description: "追蹤美國標普 500 指數，享受全球最強經濟體與科技巨頭成長紅利",
  },
  {
    symbol: "QQQ",
    name: "Invesco 那斯達克 100 ETF",
    market: "US",
    historicalCagr: 16.5,
    dividendYield: 0.6,
    category: "美股科技",
    description: "集中投資微軟、蘋果、輝達等全球頂尖科技創新龍頭",
  },
  {
    symbol: "SCHD",
    name: "Schwab 美國紅利股 ETF",
    market: "US",
    historicalCagr: 11.2,
    dividendYield: 3.5,
    category: "美股高股息",
    description: "篩選現金流強勁且連續 10 年股息增長的高品質美股企業",
  },
  {
    symbol: "NVDA",
    name: "輝達 (NVIDIA)",
    market: "US",
    historicalCagr: 35.0,
    dividendYield: 0.1,
    category: "AI 晶片霸主",
    description: "生成式 AI 與資料中心 GPU 核心，高速成長題材",
  },
];

export default function DcaCalculator() {
  const [selectedTarget, setSelectedTarget] = useState<PresetTarget>(PRESET_TARGETS[0]);
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState("自訂投資組合");
  const [monthlyAmount, setMonthlyAmount] = useState<number>(10000);
  const [years, setYears] = useState<number>(10);
  const [annualRate, setAnnualRate] = useState<number>(12.5);
  const [dividendYield, setDividendYield] = useState<number>(3.2);
  const [reinvestDividend, setReinvestDividend] = useState<boolean>(true);
  const [adjustInflation, setAdjustInflation] = useState<boolean>(false);
  const [currency, setCurrency] = useState<"TWD" | "USD">("TWD");
  const [showScheduleTable, setShowScheduleTable] = useState<boolean>(false);

  // 當切換預設標的
  const handleSelectPreset = (target: PresetTarget) => {
    setSelectedTarget(target);
    setIsCustom(false);
    setAnnualRate(target.historicalCagr);
    setDividendYield(target.dividendYield);
    if (target.market === "US" && currency === "TWD") {
      setCurrency("USD");
      setMonthlyAmount(300);
    } else if (target.market === "TW" && currency === "USD") {
      setCurrency("TWD");
      setMonthlyAmount(10000);
    }
  };

  // 複利計算核心
  const simulation = useMemo(() => {
    const inflationRate = 0.025; // 2.5% 年通膨
    const nominalRate = annualRate / 100;
    const effectiveRate = adjustInflation
      ? (1 + nominalRate) / (1 + inflationRate) - 1
      : nominalRate;

    const divRate = dividendYield / 100;

    // 若未再投入股息，資本利得率為有效報酬扣除現金殖利率
    const priceGrowthRate = reinvestDividend ? effectiveRate : Math.max(0, effectiveRate - divRate);
    const monthlyGrowthRate = Math.pow(1 + priceGrowthRate, 1 / 12) - 1;

    let accumulatedPrincipal = 0;
    let portfolioValue = 0;
    let accumulatedCashDividends = 0;

    const yearlyData = [];

    for (let yr = 1; yr <= years; yr++) {
      const yearStartVal = portfolioValue;
      let yearlyInvested = 0;

      for (let m = 1; m <= 12; m++) {
        portfolioValue = (portfolioValue + monthlyAmount) * (1 + monthlyGrowthRate);
        accumulatedPrincipal += monthlyAmount;
        yearlyInvested += monthlyAmount;

        if (!reinvestDividend) {
          const monthlyDiv = (portfolioValue * divRate) / 12;
          accumulatedCashDividends += monthlyDiv;
        }
      }

      const totalVal = portfolioValue + accumulatedCashDividends;
      const profit = totalVal - accumulatedPrincipal;
      const roiPct = accumulatedPrincipal > 0 ? (profit / accumulatedPrincipal) * 100 : 0;
      const annualDividendEst = totalVal * divRate;
      const monthlyPassiveIncome = annualDividendEst / 12;

      yearlyData.push({
        year: yr,
        yearlyInvested,
        accumulatedPrincipal,
        portfolioValue: Math.round(portfolioValue),
        accumulatedCashDividends: Math.round(accumulatedCashDividends),
        totalVal: Math.round(totalVal),
        profit: Math.round(profit),
        roiPct: Number(roiPct.toFixed(1)),
        annualDividendEst: Math.round(annualDividendEst),
        monthlyPassiveIncome: Math.round(monthlyPassiveIncome),
      });
    }

    const finalRow = yearlyData[yearlyData.length - 1] || {
      totalVal: 0,
      accumulatedPrincipal: 0,
      profit: 0,
      roiPct: 0,
      monthlyPassiveIncome: 0,
    };

    return {
      finalTotalVal: finalRow.totalVal,
      finalPrincipal: finalRow.accumulatedPrincipal,
      finalProfit: finalRow.profit,
      finalRoiPct: finalRow.roiPct,
      finalMonthlyPassiveIncome: finalRow.monthlyPassiveIncome,
      multiplier:
        finalRow.accumulatedPrincipal > 0
          ? (finalRow.totalVal / finalRow.accumulatedPrincipal).toFixed(2)
          : "1.0",
      yearlyData,
    };
  }, [monthlyAmount, years, annualRate, dividendYield, reinvestDividend, adjustInflation]);

  const currSymbol = currency === "USD" ? "$" : "NT$";

  return (
    <div className="space-y-6">
      {/* 標題與簡介 */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-accent/10 border border-[var(--border)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-lg bg-accent/20 text-accent">
                <PiggyBank size={20} />
              </span>
              <h2 className="text-xl font-bold tracking-tight text-primary">
                定期定額 (DCA) 複利投資收益預測模型
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 font-medium text-[11px]">
                全市場真實 CAGR 連動
              </span>
            </div>
            <p className="text-secondary text-xs sm:text-sm max-w-3xl leading-relaxed">
              根據台股與美股熱門 ETF、權值股真實長期年化報酬率（CAGR）與股息殖利率，精確試算每月定額存股、微笑曲線平攤與股息再投入滾雪球效應，規劃財富自由被動現金流。
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="text-xs text-muted">計價幣別:</span>
            <div className="flex bg-[var(--bg-tertiary)] p-0.5 rounded-lg border border-[var(--border)] text-xs">
              <button
                type="button"
                onClick={() => setCurrency("TWD")}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  currency === "TWD" ? "bg-accent text-white shadow-sm" : "text-secondary hover:text-primary"
                }`}
              >
                新台幣 (TWD)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  currency === "USD" ? "bg-accent text-white shadow-sm" : "text-secondary hover:text-primary"
                }`}
              >
                美元 (USD)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 標的選擇快捷區 */}
      <div>
        <div className="text-xs font-semibold text-secondary mb-2 flex items-center justify-between">
          <span>選擇定期定額標的 (載入歷史真實年化績效)</span>
          <button
            type="button"
            onClick={() => setIsCustom(!isCustom)}
            className="text-accent hover:underline cursor-pointer"
          >
            {isCustom ? "← 返回熱門標的" : "+ 自訂標的與參數"}
          </button>
        </div>

        {!isCustom ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {PRESET_TARGETS.map((t) => {
              const isSelected = selectedTarget.symbol === t.symbol;
              return (
                <button
                  key={t.symbol}
                  type="button"
                  onClick={() => handleSelectPreset(t)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-accent/15 border-accent shadow-md shadow-accent/5 ring-1 ring-accent"
                      : "bg-[var(--bg-secondary)] border-[var(--border)] hover:border-accent/40 hover:bg-[var(--bg-tertiary)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono font-bold text-sm text-primary">{t.symbol}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        t.market === "TW" ? "bg-blue-500/15 text-blue-400" : "bg-purple-500/15 text-purple-400"
                      }`}
                    >
                      {t.market}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-secondary truncate mb-2">{t.name}</div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[var(--border)]">
                    <span className="text-muted">歷史年化:</span>
                    <span className="font-mono font-bold text-emerald-400">+{t.historicalCagr}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-0.5">
                    <span className="text-muted">殖利率:</span>
                    <span className="font-mono text-secondary">{t.dividendYield}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-accent/40 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-muted mb-1 font-medium">標的代碼或自訂名稱</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-accent"
              />
            </div>
            <div className="text-xs text-secondary max-w-sm">
              已開啟自訂模式，您可以在下方自由調節預期年化報酬率與年現金殖利率，進行個人化資產配置試算。
            </div>
          </div>
        )}
      </div>

      {/* 試算參數控制面板 */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-accent" />
          <span>定期定額扣款參數設定</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. 每月扣款金額 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="text-secondary font-medium">每月投資扣款金額</label>
              <span className="font-mono font-bold text-accent text-sm">
                {currSymbol} {formatNumber(monthlyAmount)}
              </span>
            </div>
            <input
              type="number"
              min={currency === "USD" ? 50 : 1000}
              step={currency === "USD" ? 50 : 1000}
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(Math.max(0, Number(e.target.value)))}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-accent"
            />
            {/* 快速金額按鈕 */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(currency === "USD"
                ? [100, 300, 500, 1000, 2000]
                : [3000, 5000, 10000, 20000, 50000]
              ).map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setMonthlyAmount(amt)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    monthlyAmount === amt
                      ? "bg-accent/20 border-accent text-accent font-bold"
                      : "bg-[var(--bg-secondary)] border-[var(--border)] text-muted hover:text-primary"
                  }`}
                >
                  {formatNumber(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 投資年限 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="text-secondary font-medium">預計持續扣款年限</label>
              <span className="font-mono font-bold text-accent text-sm">{years} 年</span>
            </div>
            <input
              type="range"
              min={1}
              max={35}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[3, 5, 10, 15, 20, 30].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setYears(yr)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    years === yr
                      ? "bg-accent/20 border-accent text-accent font-bold"
                      : "bg-[var(--bg-secondary)] border-[var(--border)] text-muted hover:text-primary"
                  }`}
                >
                  {yr}年
                </button>
              ))}
            </div>
          </div>

          {/* 3. 預期年化報酬率 CAGR */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="text-secondary font-medium">預期年化報酬率 (CAGR)</label>
              <span className="font-mono font-bold text-emerald-400 text-sm">+{annualRate}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={35}
              step={0.5}
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
            <div className="flex items-center justify-between text-[11px] text-muted pt-1">
              <span>保守 (5%)</span>
              <span>穩健 (10%)</span>
              <span>積極 (18%+)</span>
            </div>
          </div>

          {/* 4. 股息殖利率與複利開關 */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <label className="text-secondary font-medium">預估現金殖利率</label>
              <span className="font-mono font-bold text-secondary text-sm">{dividendYield}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={0.2}
              value={dividendYield}
              onChange={(e) => setDividendYield(Number(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />

            <div className="pt-1 space-y-1.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={reinvestDividend}
                  onChange={(e) => setReinvestDividend(e.target.checked)}
                  className="rounded border-[var(--border)] accent-[var(--accent)] cursor-pointer"
                />
                <span className="text-primary font-medium">股息自動再投入 (DRIP 複利)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={adjustInflation}
                  onChange={(e) => setAdjustInflation(e.target.checked)}
                  className="rounded border-[var(--border)] accent-[var(--accent)] cursor-pointer"
                />
                <span className="text-muted">扣除 2.5% 通膨實質購買力</span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* 核心收益結果大卡片看板 (4 大指標) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 指標 1: 期末總資產 */}
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-accent/40 shadow-lg shadow-black/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-accent">
            <PiggyBank size={64} />
          </div>
          <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <DollarSign size={14} className="text-accent" />
            <span>期末累積總資產價值</span>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            {currSymbol} {formatNumber(simulation.finalTotalVal)}
          </div>
          <div className="flex items-center gap-1.5 text-xs mt-2 text-emerald-400 font-medium">
            <ArrowUpRight size={14} />
            <span>資產累積放大 {simulation.multiplier} 倍</span>
          </div>
        </div>

        {/* 指標 2: 投入本金 */}
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-md">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Calendar size={14} className="text-blue-400" />
            <span>累積投入總本金</span>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
            {currSymbol} {formatNumber(simulation.finalPrincipal)}
          </div>
          <div className="text-xs text-muted mt-2">
            佔總資產{" "}
            {simulation.finalTotalVal > 0
              ? ((simulation.finalPrincipal / simulation.finalTotalVal) * 100).toFixed(1)
              : 0}
            %（共扣款 {years * 12} 個月）
          </div>
        </div>

        {/* 指標 3: 複利淨獲利 */}
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-md">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-emerald-400" />
            <span>複利淨獲利金額</span>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
            +{currSymbol} {formatNumber(simulation.finalProfit)}
          </div>
          <div className="text-xs text-secondary mt-2">
            總投資報酬率{" "}
            <span className="font-bold text-emerald-400 font-mono">
              +{simulation.finalRoiPct}%
            </span>
          </div>
        </div>

        {/* 指標 4: 未來退休被動月配現金流 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border border-amber-500/30 shadow-md">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Coffee size={14} />
            <span>預估未來每月被動現金流</span>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-tight">
            {currSymbol} {formatNumber(simulation.finalMonthlyPassiveIncome)}
            <span className="text-xs font-normal text-muted ml-1">/ 月</span>
          </div>
          <div className="text-xs text-secondary mt-2">
            以年殖利率 {dividendYield}% 估算未來每年配發 {currSymbol}{" "}
            {formatNumber(simulation.finalMonthlyPassiveIncome * 12)}
          </div>
        </div>
      </div>

      {/* 資產成長階梯可視化圖表 (長條圖展示) */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <span>複利滾雪球資產成長曲線 (本金 VS 獲利累積)</span>
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              直觀觀察隨著時間拉長，複利收益超越本金的「黃金交叉轉折點」
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500/60 inline-block"></span>
              <span className="text-secondary">累積投入本金</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
              <span className="text-emerald-400 font-semibold">複利獲利總額</span>
            </div>
          </div>
        </div>

        {/* 柱狀分佈圖 */}
        <div className="space-y-3">
          {simulation.yearlyData.map((row) => {
            const maxVal = simulation.finalTotalVal || 1;
            const principalWidth = (row.accumulatedPrincipal / maxVal) * 100;
            const profitWidth = (Math.max(0, row.profit) / maxVal) * 100;

            // 僅在年限較長時選擇性展示代表年份，避免畫面過度擁擠
            if (years > 15 && row.year % 2 !== 0 && row.year !== years) return null;

            return (
              <div key={row.year} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-mono text-muted text-right font-medium">
                  第 {row.year} 年
                </span>

                <div className="flex-1 h-6 bg-[var(--bg-tertiary)] rounded-lg overflow-hidden flex items-center relative">
                  {/* 本金條 */}
                  <div
                    style={{ width: `${principalWidth}%` }}
                    className="h-full bg-blue-500/60 transition-all duration-500 flex items-center justify-end px-2"
                    title={`本金: ${currSymbol} ${formatNumber(row.accumulatedPrincipal)}`}
                  ></div>
                  {/* 獲利條 */}
                  <div
                    style={{ width: `${profitWidth}%` }}
                    className="h-full bg-emerald-500 transition-all duration-500 flex items-center justify-end px-2"
                    title={`獲利: ${currSymbol} ${formatNumber(row.profit)}`}
                  ></div>
                </div>

                <div className="w-28 sm:w-36 text-right font-mono font-bold text-primary truncate">
                  {currSymbol} {formatNumber(row.totalVal)}
                  <span className="text-[10px] text-emerald-400 ml-1.5 font-normal">
                    (+{row.roiPct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 年度逐年明細展開表格 */}
      <Card className="p-5">
        <button
          type="button"
          onClick={() => setShowScheduleTable(!showScheduleTable)}
          className="w-full flex items-center justify-between text-sm font-bold text-primary cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <PieChart size={16} className="text-accent" />
            <span>查看第 1 年至第 {years} 年逐年詳細投資收益排程表</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-accent">
            <span>{showScheduleTable ? "收起明細" : "展開完整明細"}</span>
            {showScheduleTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showScheduleTable && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border)] text-muted font-medium">
                  <th className="py-2.5 px-3">年份</th>
                  <th className="py-2.5 px-3 text-right">當年累積投入</th>
                  <th className="py-2.5 px-3 text-right">累積投入本金</th>
                  <th className="py-2.5 px-3 text-right">累積獲利金額</th>
                  <th className="py-2.5 px-3 text-right">期末總資產價值</th>
                  <th className="py-2.5 px-3 text-right">累積報酬率</th>
                  <th className="py-2.5 px-3 text-right">預期月配息金</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] font-mono">
                {simulation.yearlyData.map((row) => (
                  <tr key={row.year} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-primary font-sans">第 {row.year} 年</td>
                    <td className="py-2.5 px-3 text-right text-secondary">
                      {currSymbol} {formatNumber(row.yearlyInvested)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-400">
                      {currSymbol} {formatNumber(row.accumulatedPrincipal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                      +{currSymbol} {formatNumber(row.profit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-primary">
                      {currSymbol} {formatNumber(row.totalVal)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                      +{row.roiPct}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-300">
                      {currSymbol} {formatNumber(row.monthlyPassiveIncome)} /月
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 定期定額致勝心法與微笑曲線指南 */}
      <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3 text-primary font-bold text-sm">
          <ShieldCheck size={18} className="text-emerald-400" />
          <span>法人存股部：定期定額「微笑曲線」致勝法則與大跌加碼策略</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-secondary leading-relaxed">
          <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1.5 font-bold">1. 微笑曲線平攤成本效應</strong>
            <p>
              定期定額最大的優勢在於克服人性恐懼。當市場回檔大跌時，相同扣款金額能買進更多股數；待景氣循環翻揚回升，累積的大量低成本持股將迎來爆發性資本利得。
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1.5 font-bold">2. 股息再投入滾雪球定律</strong>
            <p>
              若將每季領到的股息再次買入標的（DRIP），資產成長將呈現幾何級數非線性上升。以 0050 或 VOO 試算，再投入相比領現花掉，20 年後的總財富差距可達 1.8 至 2.4 倍。
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <strong className="text-primary block mb-1.5 font-bold">3. 扣款日挑選與加碼時機</strong>
            <p>
              歷史統計顯示，每月 5~6 號（領薪日）或 15~16 號為多數投資人首選。若遇大盤跌破年線（200MA）或技術指標日 KD &lt; 20 時啟動「加倍定額」，能顯著縮短等待翻正時間。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
