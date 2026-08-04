import Card from "@/components/ui/Card";
import { Newspaper } from "lucide-react";

export default function NewsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">新聞</h1>
        <p className="text-secondary text-sm">即時財經新聞與 AI 總結摘要</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="最新重點新聞">
          <div className="flex flex-col space-y-4 text-center items-center py-12 text-secondary">
            <Newspaper size={48} className="mb-4 opacity-50" />
            <p>即時新聞模組開發中...</p>
          </div>
        </Card>
        
        <Card title="AI 每日摘要">
           <div className="flex flex-col space-y-4 text-center items-center py-12 text-secondary">
            <p>AI 自動摘要模組開發中...</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
