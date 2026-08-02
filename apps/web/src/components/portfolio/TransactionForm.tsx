"use client";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function TransactionForm({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [action, setAction] = useState('BUY');
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="新增交易紀錄">
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); onClose(); }}>
        <div className="flex gap-4">
          <button type="button" className={`flex-1 py-2 rounded-md border ${action === 'BUY' ? 'bg-danger-light border-danger text-danger' : 'border-[var(--border)] text-secondary'}`} onClick={() => setAction('BUY')}>買進</button>
          <button type="button" className={`flex-1 py-2 rounded-md border ${action === 'SELL' ? 'bg-success-light border-success text-success' : 'border-[var(--border)] text-secondary'}`} onClick={() => setAction('SELL')}>賣出</button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-secondary mb-1">股票代號</label>
            <input type="text" className="input-field" placeholder="e.g. 2330" />
          </div>
          <div>
            <label className="block text-sm text-secondary mb-1">市場</label>
            <select className="input-field">
              <option value="TW">台股</option>
              <option value="US">美股</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-secondary mb-1">成交價</label>
            <input type="number" className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-secondary mb-1">數量 (股)</label>
            <input type="number" className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-secondary mb-1">日期</label>
          <input type="date" className="input-field" defaultValue={new Date().toISOString().split('T')[0]} />
        </div>

        <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
          <Button type="submit">儲存紀錄</Button>
        </div>
      </form>
    </Modal>
  );
}
