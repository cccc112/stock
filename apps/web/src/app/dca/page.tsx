"use client";

import DcaCalculator from "@/components/calculator/DcaCalculator";
import { Calculator, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function DcaCalculatorPage() {
  return (
    <div className="animate-fade-in space-y-5 sm:space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Calculator size={20} />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary">
              定期定額試算與複利收益預測
            </h1>
          </div>
          <p className="text-secondary text-xs sm:text-sm">
            支援台美股熱門 ETF 與權值股，透過長期歷史年化報酬率與股息再投入模型，精準預測長期資產增長與時間複利效果。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/etf"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-xs font-semibold text-secondary hover:text-primary transition-colors"
          >
            <TrendingUp size={14} className="text-accent" />
            查看全市場 ETF
          </Link>
        </div>
      </header>

      <DcaCalculator />
    </div>
  );
}
