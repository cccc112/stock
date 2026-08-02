"use client";
import { useState } from "react";
import Tabs from "@/components/ui/Tabs";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PnLSummary from "@/components/portfolio/PnLSummary";
import HoldingTable from "@/components/portfolio/HoldingTable";
import TransactionForm from "@/components/portfolio/TransactionForm";
import { Plus } from "lucide-react";

const mockHoldings = [
  { symbol: '2330', name: '台積電', avgCost: 850, qty: 1000, currentPrice: 950, pnl: 100000, pnlPercent: 11.76, market: 'TW' },
  { symbol: 'AAPL', name: 'Apple Inc.', avgCost: 180.5, qty: 100, currentPrice: 215.3, pnl: 3480, pnlPercent: 19.28, market: 'US' },
];

export default function PortfolioPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">投資組合</h1>
          <p className="text-secondary text-sm">追蹤您的真實庫存與交易績效</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}><Plus size={16} className="mr-2" /> 新增交易</Button>
      </div>

      <PnLSummary />

      <Card className="min-h-[400px]">
        <Tabs 
          tabs={[
            {
              id: 'holdings',
              label: '庫存總覽',
              content: <HoldingTable holdings={mockHoldings} />
            },
            {
              id: 'history',
              label: '交易紀錄',
              content: (
                <div className="text-center py-12 text-secondary">
                  載入中...
                </div>
              )
            }
          ]}
        />
      </Card>

      <TransactionForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>
  );
}
