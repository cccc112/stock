import WatchlistPanel from "@/components/dashboard/WatchlistPanel";

export default function WatchlistPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">自選股</h1>
        <p className="text-secondary text-sm">追蹤您的自選清單與即時報價</p>
      </header>

      <div className="min-h-[500px]">
        <WatchlistPanel />
      </div>
    </div>
  );
}
