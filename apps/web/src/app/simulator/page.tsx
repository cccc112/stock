"use client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import TradeForm from "@/components/simulator/TradeForm";
import ReviewReport from "@/components/simulator/ReviewReport";
import { formatCurrency } from "@/lib/utils";

export default function SimulatorPage() {
  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">模擬交易</h1>
          <p className="text-secondary text-sm">無風險練習，並讓 AI 協助覆盤您的交易邏輯</p>
        </div>
        <Button>建立新投資組合</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card title="模擬帳戶概況" variant="accent-border">
            <div className="text-secondary text-sm mb-1">可用資金</div>
            <div className="text-3xl font-bold mb-4">{formatCurrency(1000000, 'TWD')}</div>
            <div className="flex justify-between text-sm py-2 border-t border-[var(--border)]">
              <span className="text-secondary">持股市值</span>
              <span>{formatCurrency(250000, 'TWD')}</span>
            </div>
            <div className="flex justify-between text-sm py-2">
              <span className="text-secondary">總損益</span>
              <span className="text-danger">+{formatCurrency(15000, 'TWD')}</span>
            </div>
          </Card>

          <Card title="下單匣">
            <TradeForm />
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="模擬庫存" className="mb-6">
            <div className="text-center py-8 text-secondary">
              尚無持股紀錄
            </div>
          </Card>
          
          <Card>
            <ReviewReport />
          </Card>
        </div>
      </div>
    </div>
  );
}
