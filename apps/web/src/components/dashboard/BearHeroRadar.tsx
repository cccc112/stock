"use client";

import dynamic from "next/dynamic";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  Flame,
  Radio,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

// 動態加載 3D 熊霸模型，杜絕 SSR 水合報錯
const Bear3DModel = dynamic(() => import("@/components/ui/Bear3DModel"), {
  ssr: false,
  loading: () => (
    <div className="w-[240px] h-[240px] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
    </div>
  ),
});

export default function BearHeroRadar() {
  return (
    <Card className="p-5 md:p-6 border-amber-500/30 bg-gradient-to-r from-[var(--bg-secondary)] via-[var(--bg-secondary)] to-amber-500/5 relative overflow-hidden">
      {/* 科技背景光暈裝飾 */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-gradient-to-br from-amber-500/10 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* 左側：3D 立體互動熊霸 */}
        <div className="flex-shrink-0 flex flex-col items-center">
          <Bear3DModel size={220} interactive={true} showQuote={true} />
        </div>

        {/* 右側：熊霸盤中哨兵解盤與量化雷達情報 */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs font-bold text-amber-400 tracking-wider">
                V-BEAR QUANT SENTINEL
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                3D 量化熊霸在線
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-secondary">
              <span>台股 0 秒撮合直連</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-primary flex items-center gap-2">
              <span>熊霸盤中即時情報站</span>
              <span className="text-amber-400 text-sm font-sans font-semibold px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20">
                金黃 V 領 · 突破哨兵
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-secondary mt-1 leading-relaxed">
              胸前的金黃 V 領象徵「VCP 波動收斂放量突破」與「V 型絕地反轉」！全天候監控全市場 1,900+ 檔標的主力籌碼、SMC 機構訂單塊與階梯掛單。
            </p>
          </div>

          {/* 3 個實時量化指標摘要卡 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-1">
              <span className="text-secondary text-[11px] flex items-center gap-1 font-semibold">
                <Flame size={12} className="text-rose-500" /> VCP 突破動能
              </span>
              <div className="text-base font-bold font-mono text-primary flex items-baseline gap-1">
                <span className="text-rose-500">偏多轉強</span>
                <span className="text-[10px] text-secondary font-normal">多頭占比 62%</span>
              </div>
              <p className="text-[10px] text-muted">台玻、友達、聯電成交爆量突破</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-1">
              <span className="text-secondary text-[11px] flex items-center gap-1 font-semibold">
                <Zap size={12} className="text-amber-400" /> 機構訂單防守
              </span>
              <div className="text-base font-bold font-mono text-primary flex items-baseline gap-1">
                <span className="text-emerald-400">強支撐確認</span>
                <span className="text-[10px] text-secondary font-normal">SMC 訂單塊</span>
              </div>
              <p className="text-[10px] text-muted">台積電 20MA 與頸線主力防守密實</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] space-y-1">
              <span className="text-secondary text-[11px] flex items-center gap-1 font-semibold">
                <MessageSquare size={12} className="text-emerald-400" /> LINE 機器人連動
              </span>
              <div className="text-base font-bold font-mono text-primary flex items-baseline gap-1">
                <span className="text-emerald-400">已串接 0 秒</span>
                <span className="text-[10px] text-secondary font-normal">秒查行情</span>
              </div>
              <p className="text-[10px] text-muted">聊天室輸入 2330 即可秒回即時卡片</p>
            </div>
          </div>

          {/* 快捷操作列 */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/alerts">
              <Button size="sm" variant="primary" className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm">
                <Radio size={14} /> 查看熊霸即時警報中心 <ArrowRight size={13} />
              </Button>
            </Link>

            <Link href="/recommend">
              <Button size="sm" variant="secondary" className="text-xs flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" /> 今日 AI 量化選股池
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
