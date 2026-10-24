"use client";

import Tabs from "@/components/ui/Tabs";
import WatchlistPanel from "@/components/dashboard/WatchlistPanel";
import AlertsPage from "@/app/alerts/page";

export default function WatchlistPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight mb-1">自選標的與價格警報</h1>
        <p className="text-secondary text-sm">
          集中管理您的台美股、ETF 與跨資產自選清單，並設定關鍵價位觸發提醒
        </p>
      </header>

      <Tabs
        tabs={[
          {
            id: "watchlist",
            label: "我的自選清單",
            content: (
              <div className="min-h-[420px]">
                <WatchlistPanel />
              </div>
            ),
          },
          {
            id: "alerts",
            label: "智慧價格警報",
            content: <AlertsPage />,
          },
        ]}
      />
    </div>
  );
}
