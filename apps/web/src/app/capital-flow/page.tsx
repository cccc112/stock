import CapitalFlowChart from "@/components/dashboard/CapitalFlowChart";

export default function CapitalFlowPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">資金流向與 ETF 動態追蹤</h1>
        <p className="text-secondary text-sm">掌握即時法人籌碼動向與 ETF 資金淨流入流出狀況</p>
      </header>

      <div className="h-[calc(100vh-160px)] min-h-[500px]">
        <CapitalFlowChart />
      </div>
    </div>
  );
}
