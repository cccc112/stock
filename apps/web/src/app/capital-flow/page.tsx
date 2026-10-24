"use client";

import Tabs from "@/components/ui/Tabs";
import CapitalFlowChart from "@/components/dashboard/CapitalFlowChart";
import InstitutionsPage from "@/app/institutions/page";
import IndustryPage from "@/app/industry/page";

export default function CapitalFlowPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight mb-1">資金流向與籌碼中心</h1>
        <p className="text-secondary text-sm">
          整合主力資金淨流向、台股三大法人買賣超、美股 13F 機構持倉與產業資金輪動
        </p>
      </header>

      <Tabs
        tabs={[
          {
            id: "flow",
            label: "個股與 ETF 資金流向",
            content: <CapitalFlowChart />,
          },
          {
            id: "institutions",
            label: "三大法人與美股 13F 機構",
            content: <InstitutionsPage />,
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
