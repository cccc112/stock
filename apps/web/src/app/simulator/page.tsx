"use client";
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import TradeForm from "@/components/simulator/TradeForm";
import ReviewReport from "@/components/simulator/ReviewReport";
import { formatCurrency, cn } from "@/lib/utils";
import { Bot } from "lucide-react";
import { apiSimulator } from "@/lib/api";

export default function SimulatorPage() {
  const [aiAutoTrading, setAiAutoTrading] = useState(false);
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPortName, setNewPortName] = useState('');
  const [newPortInitialCash, setNewPortInitialCash] = useState(1000000);

  const activePortfolio = portfolios[0] || null;

  const fetchPortfolios = async () => {
    setLoading(true);
    try {
      const res = await apiSimulator.getPortfolios();
      setPortfolios(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiSimulator.createPortfolio({ name: newPortName, initial_cash: newPortInitialCash });
      setIsModalOpen(false);
      fetchPortfolios();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">模擬交易</h1>
          <p className="text-secondary text-sm">無風險練習，並讓 AI 協助覆盤您的交易邏輯</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>建立新投資組合</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card 
            title="模擬帳戶概況" 
            variant="accent-border"
            headerAction={
              <button 
                onClick={() => setAiAutoTrading(!aiAutoTrading)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors border",
                  aiAutoTrading 
                    ? "bg-accent-light text-accent border-accent" 
                    : "bg-[var(--bg-tertiary)] text-secondary border-[var(--border)]"
                )}
              >
                <Bot size={14} />
                AI 自動交易 {aiAutoTrading ? 'ON' : 'OFF'}
              </button>
            }
          >
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3"></div>
                <div className="h-8 bg-[var(--bg-tertiary)] rounded w-1/2"></div>
              </div>
            ) : activePortfolio ? (
              <>
                <div className="text-secondary text-sm mb-1">可用資金 ({activePortfolio.name})</div>
                <div className="text-3xl font-bold mb-4">{formatCurrency(activePortfolio.cash || 0, 'TWD')}</div>
                <div className="flex justify-between text-sm py-2 border-t border-[var(--border)]">
                  <span className="text-secondary">持股市值</span>
                  <span>{formatCurrency(activePortfolio.holdings_value || 0, 'TWD')}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="text-secondary">總損益</span>
                  <span className={activePortfolio.pnl >= 0 ? 'text-danger' : 'text-success'}>
                    {activePortfolio.pnl > 0 ? '+' : ''}{formatCurrency(activePortfolio.pnl || 0, 'TWD')}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-secondary text-sm">請建立投資組合</div>
            )}
          </Card>

          <Card title="下單匣">
            <TradeForm portfolioId={activePortfolio?.id} onTradeSuccess={fetchPortfolios} />
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card title="模擬庫存" className="mb-6">
            {!activePortfolio || !activePortfolio.holdings || activePortfolio.holdings.length === 0 ? (
              <div className="text-center py-8 text-secondary">
                尚無持股紀錄
              </div>
            ) : (
              <div className="space-y-3">
                {activePortfolio.holdings.map((h: any, i: number) => (
                  <div key={i} className="flex justify-between p-3 bg-[var(--bg-tertiary)] rounded-md">
                    <div>
                      <div className="font-bold">{h.symbol}</div>
                      <div className="text-sm text-secondary">{h.shares} 股</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(h.current_price * h.shares, 'TWD')}</div>
                      <div className={`text-sm ${h.pnl >= 0 ? 'text-danger' : 'text-success'}`}>
                        {h.pnl > 0 ? '+' : ''}{formatCurrency(h.pnl, 'TWD')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          
          <Card>
            <ReviewReport portfolioId={activePortfolio?.id} />
          </Card>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="建立新投資組合">
        <form className="space-y-4" onSubmit={handleCreate}>
          <div>
            <label className="block text-sm text-secondary mb-1">投資組合名稱</label>
            <input type="text" className="input-field" value={newPortName} onChange={e => setNewPortName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm text-secondary mb-1">初始資金</label>
            <input type="number" className="input-field" value={newPortInitialCash} onChange={e => setNewPortInitialCash(Number(e.target.value))} required />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button type="submit">建立</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
