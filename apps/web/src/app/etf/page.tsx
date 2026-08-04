import Card from "@/components/ui/Card";
import { PieChart } from "lucide-react";

export default function EtfPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">ETF 專區</h1>
        <p className="text-secondary text-sm">台美股 ETF 淨值、折溢價與成分股分析</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="熱門 ETF">
          <div className="flex flex-col space-y-4 text-center items-center py-12 text-secondary">
            <PieChart size={48} className="mb-4 opacity-50" />
            <p>ETF 報價模組開發中...</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
