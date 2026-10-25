"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useAuthManager } from "@/hooks/useAuth";
import { KeyRound, ExternalLink, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, Loader2 } from "lucide-react";

interface ApiKeyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ApiKeyGuideModal({ isOpen, onClose, onSuccess }: ApiKeyGuideModalProps) {
  const { getApiKey, setApiKey, user } = useAuthManager();
  const [keyInput, setKeyInput] = useState(() => getApiKey());
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = keyInput.trim();
    if (!clean) {
      setStatus("error");
      setStatusMsg("請輸入有效的 Gemini API Key");
      return;
    }

    if (!clean.startsWith("AIzaSy") && clean.length < 20) {
      setStatus("error");
      setStatusMsg("金鑰格式看起來不正確（通常以 AIzaSy 開頭）");
      return;
    }

    setTesting(true);
    setStatus("idle");
    setStatusMsg("");

    try {
      // 快速向 Google 原廠或後端發起一次輕量握手驗證
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${clean}`, {
        method: "GET",
      });

      if (res.ok) {
        setApiKey(clean);
        setStatus("success");
        setStatusMsg("驗證成功！個人專屬額度已啟用，所有 AI 分析功能已解鎖。");
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = data?.error?.message || "Google API 回傳金鑰無效或權限不足";
        setStatus("error");
        setStatusMsg(`驗證失敗: ${msg}`);
      }
    } catch {
      // 網路環境若直接連外受限，仍允許本地儲存
      setApiKey(clean);
      setStatus("success");
      setStatusMsg("金鑰已儲存！");
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } finally {
      setTesting(false);
    }
  };

  const handleRemoveKey = () => {
    setApiKey("");
    setKeyInput("");
    setStatus("idle");
    setStatusMsg("已清除個人 API Key。");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="個人專屬免費 AI 額度設定 (BYOK)" className="max-w-lg">
      <div className="space-y-4 pt-1">
        {/* 保障說明卡片 */}
        <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-xs space-y-2">
          <div className="flex items-center gap-2 text-accent font-bold text-sm">
            <ShieldCheck size={16} />
            <span>為什麼需要綁定個人金鑰？</span>
          </div>
          <p className="text-secondary leading-relaxed">
            為避免多位使用者共用伺服器額度導致<strong>瞬間限流 (429)</strong> 或<strong>配額耗盡</strong>，本站採用
            <strong>「BYOK 個人額度隔離機制」</strong>：
          </p>
          <ul className="space-y-1.5 text-secondary pl-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              <span>
                <strong>100% 完全免費</strong>：Google AI Studio 提供每分鐘 15 次、每月百萬 Token 免費配額
              </span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              <span>
                <strong>個人專屬頻寬</strong>：獨立使用自己的 Google 額度，不被其他人影響，推論最快最穩
              </span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              <span>
                <strong>資料安全儲存</strong>：金鑰僅存放在您本機瀏覽器
                {user ? ` (${user.email} 帳號空間)` : ""}，不回傳主機資料庫
              </span>
            </li>
          </ul>
        </div>

        {/* 領取教學步驟 */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-primary flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              如何 1 分鐘免費領取？
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent text-black font-semibold text-[11px] hover:opacity-90 transition-opacity"
            >
              <span>開啟 Google AI Studio</span>
              <ExternalLink size={12} />
            </a>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-secondary text-[11px] leading-relaxed">
            <li>點擊上方按鈕前往 Google AI Studio 官網並登入 Google 帳號</li>
            <li>點擊「<strong>Create API key</strong>」藍色按鈕</li>
            <li>複製產生的金鑰（以 <code className="text-accent font-mono">AIzaSy...</code> 開頭）</li>
            <li>貼回下方輸入框，按下「測試並儲存」即可完成綁定！</li>
          </ol>
        </div>

        {/* 輸入與綁定表單 */}
        <form onSubmit={handleTestAndSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1 flex items-center gap-1.5">
              <KeyRound size={13} className="text-accent" />
              <span>您的 Gemini API Key</span>
            </label>
            <input
              type="password"
              placeholder="貼上 AIzaSy 开头的 Gemini API Key"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setStatus("idle");
              }}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-primary outline-none focus:border-accent"
            />
          </div>

          {status === "success" && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={15} className="flex-shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {status === "error" && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="flex-shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={testing || !keyInput.trim()}
              className="flex-1 py-2 px-3 rounded-lg bg-accent text-black font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {testing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>連線 Google 驗證中...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>測試並儲存金鑰</span>
                </>
              )}
            </button>

            {getApiKey() && (
              <button
                type="button"
                onClick={handleRemoveKey}
                className="py-2 px-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-secondary hover:text-danger text-xs transition-colors cursor-pointer"
              >
                清除金鑰
              </button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
}
