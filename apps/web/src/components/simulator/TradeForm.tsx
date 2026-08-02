"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";

export default function TradeForm() {
  const [reason, setReason] = useState("");

  return (
    <form className="space-y-4" onSubmit={e => e.preventDefault()}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-secondary mb-1">股票代號</label>
          <input type="text" className="input-field" placeholder="e.g. 2330" />
        </div>
        <div>
          <label className="block text-sm text-secondary mb-1">方向</label>
          <select className="input-field">
            <option value="BUY">買進</option>
            <option value="SELL">賣出</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-secondary mb-1">價格</label>
          <input type="number" className="input-field" placeholder="市價" />
        </div>
        <div>
          <label className="block text-sm text-secondary mb-1">數量</label>
          <input type="number" className="input-field" defaultValue={1000} />
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
      <Button className="w-full">送出委託</Button>
    </form>
  );
}
