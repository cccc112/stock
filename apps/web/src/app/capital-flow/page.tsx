"use client";

import Tabs from "@/components/ui/Tabs";
import CapitalFlowChart from "@/components/dashboard/CapitalFlowChart";
import EtfCapitalFlowTracker from "@/components/dashboard/EtfCapitalFlowTracker";
import IndustryPage from "@/app/industry/page";

export default function CapitalFlowPage() {
  return (
    <div className="animate-fade-in space-y-5 sm:space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">資金流向與產業輪動</h1>
        <p className="text-secondary text-xs sm:text-sm">
          整合各大 ETF 資金申贖動向、成分股持股變動明細、權值股資金散佈圖與產業資金輪動
        </p>
      </header>

      <Tabs
        tabs={[
          {
            id: "etf-flow",
            label: "ETF 資金流向與申贖動向",
            content: <EtfCapitalFlowTracker subView="flow" />,
          },
          {
            id: "etf-holdings",
            label: "ETF 成分股每日持股變動明細",
            content: <EtfCapitalFlowTracker subView="holdings" />,
          },
          {
            id: "flow",
            label: "個股與 ETF 散佈圖",
            content: <CapitalFlowChart />,
          },
          {
            id: "industry",
            label: "產業資金輪動",
            content: <IndustryPage />,
          },
        ]}
      />
    </div>
  );
}
