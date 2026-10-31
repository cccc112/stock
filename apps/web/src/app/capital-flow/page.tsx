"use client";

import Tabs from "@/components/ui/Tabs";
import CapitalFlowChart from "@/components/dashboard/CapitalFlowChart";
import EtfCapitalFlowTracker from "@/components/dashboard/EtfCapitalFlowTracker";
import InstitutionsPage from "@/app/institutions/page";
import IndustryPage from "@/app/industry/page";
import DcaCalculator from "@/components/calculator/DcaCalculator";

export default function CapitalFlowPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight mb-1">資金流向與籌碼中心</h1>
        <p className="text-secondary text-sm">
          整合各大 ETF 資金申贖動向、成分股持股變動、定期定額複利收益預測、台股三大法人買賣超、美股 13F 機構持倉與產業資金輪動
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
            id: "dca-calc",
            label: "定期定額收益預測",
            content: <DcaCalculator />,
          },
          {
            id: "institutions",
            label: "三大法人與美股 13F 機構",
            content: <InstitutionsPage />,
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
