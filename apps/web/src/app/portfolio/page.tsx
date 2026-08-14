"use client";
import { useState, useEffect } from "react";
import Tabs from "@/components/ui/Tabs";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PnLSummary from "@/components/portfolio/PnLSummary";
import HoldingTable from "@/components/portfolio/HoldingTable";
import TransactionForm from "@/components/portfolio/TransactionForm";
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
        apiPortfolio.getSummary()
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">投資組合</h1>
          <p className="text-secondary text-sm">追蹤您的真實庫存與交易績效</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}><Plus size={16} className="mr-2" /> 新增交易</Button>
      </div>

      <PnLSummary summary={summary} holdings={holdings} />

      <Card className="min-h-[400px]">
        <Tabs 
          tabs={[
            {
              id: 'holdings',
              label: '庫存總覽',
              content: loading ? <div className="text-center py-12 text-secondary">載入中...</div> : <HoldingTable holdings={holdings} onUpdate={fetchHoldings} />
            },
            {
              id: 'history',
              label: '交易紀錄',
              content: (
                <div className="text-center py-12 text-secondary">
                  功能開發中...
                </div>
              )
            }
          ]}
        />
      </Card>

      <TransactionForm isOpen={isFormOpen} onClose={() => {
        setIsFormOpen(false);
        fetchHoldings();
      }} />
    </div>
  );
}
