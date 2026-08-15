"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { apiSimulator } from "@/lib/api";

export default function TradeForm({ portfolioId, onTradeSuccess }: { portfolioId?: string, onTradeSuccess?: () => void }) {
  const [symbol, setSymbol] = useState("");
  const [action, setAction] = useState("BUY");
  const [price, setPrice] = useState("");
  const [shares, setShares] = useState(1000);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioId) return alert("請先建立投資組合");
    if (!symbol) return;

    setLoading(true);
    try {
      await apiSimulator.executeTrade({
        portfolio_id: portfolioId,
        symbol,
        action,
        price: price ? Number(price) : null,
        shares,
        reason
      });
      if (onTradeSuccess) onTradeSuccess();
      setSymbol("");
      setPrice("");
      setReason("");
    } catch (err: any) {
      alert(err?.response?.data?.message || "交易失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-secondary mb-1">股票代號</label>
          <input type="text" className="input-field" placeholder="e.g. 2330" value={symbol} onChange={e => setSymbol(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm text-secondary mb-1">方向</label>
          <select className="input-field" value={action} onChange={e => setAction(e.target.value)}>
            <option value="BUY">買進</option>
            <option value="SELL">賣出</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-secondary mb-1">價格</label>
          <input type="number" step="0.01" className="input-field" placeholder="市價" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-secondary mb-1">數量</label>
          <input type="number" className="input-field" value={shares} onChange={e => setShares(Number(e.target.value))} required />
        </div>
      </div>
      <div>
        <label className="block text-sm text-secondary mb-1">交易理由 (必填，供 AI 覆盤使用)</label>
        <textarea 
          className="input-field min-h-[100px] resize-none" 
          placeholder="例如：突破月線，外資連買三天，預期Q3營收成長..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
      </div>
      <Button className="w-full" disabled={loading}>{loading ? '送出中...' : '送出委託'}</Button>
    </form>
  );
}
