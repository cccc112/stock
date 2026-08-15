"use client";
import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { apiPortfolio } from "@/lib/api";

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
}

export default function TransactionForm({ isOpen, onClose, defaultSymbol }: TransactionFormProps) {
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [symbol, setSymbol] = useState(defaultSymbol || '');
  const [market, setMarket] = useState<'TW' | 'US'>(defaultSymbol && defaultSymbol.match(/^\d/) ? 'TW' : 'US');
  const [price, setPrice] = useState<number | ''>('');
  const [shares, setShares] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auto-calculate fee and tax
  const calcFee = () => {
    if (!price || !shares || market !== 'TW') return 0;
    return Math.floor(Number(price) * Number(shares) * 0.001425);
  };

  const calcTax = () => {
    if (!price || !shares || market !== 'TW' || action !== 'SELL') return 0;
    return Math.floor(Number(price) * Number(shares) * 0.003);
  };

  const fee = calcFee();
  const tax = calcTax();

  useEffect(() => {
    if (defaultSymbol) {
      setSymbol(defaultSymbol);
      setMarket(defaultSymbol.match(/^\d/) ? 'TW' : 'US');
    }
  }, [defaultSymbol]);

  useEffect(() => {
    if (isOpen) {
      setSuccess(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !price || !shares) {
      setError('請填寫完整資訊');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiPortfolio.addTransaction({
        symbol,
        market,
        type: action,
        price: Number(price),
        shares: Number(shares),
        fee,
        tax,
        date
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || '新增失敗');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="新增交易紀錄">
      {success ? (
        <div className="py-8 text-center text-success">
          <div className="text-xl font-bold mb-2">新增成功</div>
          <p className="text-sm text-secondary">交易紀錄已儲存</p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <div className="p-3 rounded bg-danger-light border border-danger text-danger text-sm">{error}</div>}
          
          <div className="flex gap-4">
            <button type="button" className={`flex-1 py-2 rounded-md border ${action === 'BUY' ? 'bg-danger-light border-danger text-danger' : 'border-[var(--border)] text-secondary'}`} onClick={() => setAction('BUY')}>買進</button>
            <button type="button" className={`flex-1 py-2 rounded-md border ${action === 'SELL' ? 'bg-success-light border-success text-success' : 'border-[var(--border)] text-secondary'}`} onClick={() => setAction('SELL')}>賣出</button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-secondary mb-1">股票代號</label>
              <input type="text" className="input-field" placeholder="e.g. 2330" value={symbol} onChange={e => setSymbol(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-secondary mb-1">市場</label>
              <select className="input-field" value={market} onChange={e => setMarket(e.target.value as 'TW' | 'US')}>
                <option value="TW">台股</option>
                <option value="US">美股</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-secondary mb-1">成交價</label>
              <input type="number" step="0.01" className="input-field" value={price} onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')} required />
            </div>
            <div>
              <label className="block text-sm text-secondary mb-1">數量 (股)</label>
              <input type="number" className="input-field" value={shares} onChange={e => setShares(e.target.value ? Number(e.target.value) : '')} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-secondary mb-1">預估手續費</label>
              <input type="number" className="input-field bg-[var(--bg-tertiary)]" value={fee} readOnly disabled />
            </div>
            <div>
              <label className="block text-sm text-secondary mb-1">預估交易稅</label>
              <input type="number" className="input-field bg-[var(--bg-tertiary)]" value={tax} readOnly disabled />
            </div>
          </div>

          <div>
            <label className="block text-sm text-secondary mb-1">日期</label>
            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} required />
          </div>

          <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={loading}>{loading ? '儲存中...' : '儲存紀錄'}</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
