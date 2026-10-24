"use client";

import { useState, useEffect } from "react";
import Tabs from "@/components/ui/Tabs";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PnLSummary from "@/components/portfolio/PnLSummary";
import HoldingTable from "@/components/portfolio/HoldingTable";
import TransactionForm from "@/components/portfolio/TransactionForm";
import SimulatorPage from "@/app/simulator/page";
import { Plus } from "lucide-react";
import { apiPortfolio } from "@/lib/api";

export default function PortfolioPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHoldings = async () => {
    try {
      const [holdingsRes, summaryRes] = await Promise.all([
        apiPortfolio.getHoldings(),
        apiPortfolio.getSummary(),
      ]);
      setHoldings(holdingsRes.data);
      setSummary(summaryRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
  }, []);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">投資組合與模擬交易</h1>
          <p className="text-secondary text-sm">
            追蹤真實部位損益，或使用模擬資金進行無風險練習與 AI 交易覆盤
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus size={16} />
          <span>新增真實交易</span>
        </Button>
      </div>

      <Tabs
        tabs={[
          {
            id: "real-portfolio",
            label: "真實庫存與損益",
            content: (
              <div className="space-y-6">
                <PnLSummary summary={summary} holdings={holdings} />
                <Card className="min-h-[360px]">
                  {loading ? (
                    <div className="text-center py-12 text-secondary">載入中...</div>
                  ) : (
                    <HoldingTable holdings={holdings} onUpdate={fetchHoldings} />
                  )}
                </Card>
              </div>
            ),
          },
          {
            id: "simulator",
            label: "AI 模擬交易練習",
            content: <SimulatorPage />,
          },
        ]}
      />

      <TransactionForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          fetchHoldings();
        }}
      />
    </div>
  );
}
