import { Sparkles, CheckCircle, AlertTriangle } from "lucide-react";

export default function ReviewReport() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-accent">
          <Sparkles size={20} /> AI 交易覆盤報告
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-secondary text-sm">評分：</span>
          <span className="text-2xl font-bold text-success">85</span>
          <span className="text-secondary">/ 100</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg">
          <h4 className="flex items-center gap-2 text-success font-medium mb-3">
            <CheckCircle size={18} /> 做得好的地方
          </h4>
          <ul className="list-disc list-inside text-sm text-secondary space-y-2">
            <li>進場點位優良，精準捕捉到突破均線的時機。</li>
            <li>有考量到籌碼面外資連續買超的因素，邏輯合理。</li>
            <li>資金控管得宜，單筆交易未超過總資金的 10%。</li>
          </ul>
        </div>

        <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg">
          <h4 className="flex items-center gap-2 text-warning font-medium mb-3">
            <AlertTriangle size={18} /> 可改善的空間
          </h4>
          <ul className="list-disc list-inside text-sm text-secondary space-y-2">
            <li>未設定明確的停損點，若行情反轉風險較高。</li>
            <li>出場理由稍顯薄弱，建議配合技術指標(如 KD 死叉)作為輔助。</li>
          </ul>
        </div>
      </div>

      <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg">
        <h4 className="font-medium mb-2">AI 總評</h4>
        <p className="text-sm text-secondary leading-relaxed">
          本次交易邏輯清晰，結合了技術面與籌碼面的優勢。然而在風險控管上仍有進步空間。建議未來在寫下交易理由時，一併設定好預期報酬率與停損點，以維持長期交易的穩定性。
        </p>
      </div>
    </div>
  );
}
