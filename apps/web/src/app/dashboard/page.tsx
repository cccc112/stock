import MarketOverview from "@/components/dashboard/MarketOverview";
import WatchlistPanel from "@/components/dashboard/WatchlistPanel";
import AlertFeed from "@/components/dashboard/AlertFeed";
import AIInsightCard from "@/components/dashboard/AIInsightCard";
import TrendingPanel from "@/components/dashboard/TrendingPanel";

export default function DashboardPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">戰情總覽</h1>
        <p className="text-secondary text-sm">掌握即時大盤動態與自選股表現</p>
      </header>

      <MarketOverview />

      <div className="dashboard-grid h-[calc(100vh-280px)] min-h-[500px]">
        <div className="flex flex-col h-full overflow-y-auto pr-2 hide-scrollbar space-y-6">
          <TrendingPanel />
          <WatchlistPanel />
        </div>
        <div className="flex flex-col h-full overflow-y-auto pr-2 hide-scrollbar space-y-6">
          <AlertFeed />
          <AIInsightCard />
        </div>
      </div>
    </div>
  );
}
