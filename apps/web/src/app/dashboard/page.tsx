import MarketOverview from "@/components/dashboard/MarketOverview";
import MarketSentimentSection from "@/components/dashboard/MarketSentimentSection";
import SectorHeatmap from "@/components/dashboard/SectorHeatmap";
import WatchlistPanel from "@/components/dashboard/WatchlistPanel";
import AlertFeed from "@/components/dashboard/AlertFeed";
import AIInsightCard from "@/components/dashboard/AIInsightCard";
import TrendingPanel from "@/components/dashboard/TrendingPanel";
import AITradeCard from "@/components/dashboard/AITradeCard";
import BearHeroRadar from "@/components/dashboard/BearHeroRadar";
import WhaleOrderStream from "@/components/dashboard/WhaleOrderStream";

export default function DashboardPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight mb-1">戰情總覽</h1>
        <p className="text-secondary text-sm">掌握即時大盤動態與自選股表現</p>
      </header>

      {/* 3D 熊霸智慧量化哨兵站 */}
      <BearHeroRadar />

      <MarketOverview />

      {/* AI 即時市場情緒與恐慌雷達 */}
      <MarketSentimentSection />

      {/* 台股盤中資金板塊方塊熱力圖 (Sector Treemap Heatmap) */}
      <SectorHeatmap />

      <div className="dashboard-grid items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <TrendingPanel />
          <WatchlistPanel />
        </div>
        <div className="flex flex-col gap-6 min-w-0">
          <WhaleOrderStream />
          <AITradeCard />
          <AlertFeed />
          <AIInsightCard />
        </div>
      </div>
    </div>
  );
}
