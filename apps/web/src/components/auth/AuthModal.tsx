"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { UserProfile, useAuthManager } from "@/hooks/useAuth";
import { ShieldCheck, Sparkles, CheckCircle2, User } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { loginWithGoogle } = useAuthManager();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("請輸入有效的 Google 電子郵件地址");
      return;
    }

    loginWithGoogle(email, name);
    onClose();
  };

  const handleQuickDemo = (demoEmail: string, demoName: string) => {
    loginWithGoogle(demoEmail, demoName);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Google 帳號獨立登入">
      <div className="space-y-4 pt-1">
        <div className="p-4 rounded-xl bg-accent/10 border border-accent/30 text-xs space-y-2">
          <div className="flex items-center gap-2 text-accent font-bold text-sm">
            <ShieldCheck size={16} />
            <span>個人帳號與額度獨立保障</span>
          </div>
          <p className="text-secondary leading-relaxed">
            登入後，系統將自動為您切換至<strong>個人專屬獨立空間</strong>：
          </p>
          <ul className="space-y-1.5 text-secondary pl-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              <span><strong>自選股完全隔離</strong>：僅您個人可見，不與其他使用者混淆</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              <span><strong>AI 額度獨立</strong>：綁定您自己的 Google 官方免費 Key，不消耗站長配額</span>
            </li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              Google 帳號 (Email)
            </label>
            <input
              type="email"
              required
              placeholder="e.g. yourname@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary mb-1">
              您的稱呼 (選填)
            </label>
            <input
              type="text"
              placeholder="e.g. 投資人 Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            />
          </div>

          {error && <div className="text-xs text-danger">{error}</div>}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-accent text-black font-bold text-sm hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>以 Google 帳號授權登入</span>
            </button>
          </div>
        </form>

        <div className="pt-2 border-t border-[var(--border)] text-center">
          <span className="text-[11px] text-secondary block mb-2">或快速切換為測試帳號體驗隔離：</span>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo("trader_alpha@gmail.com", "操盤手 Alpha")}
              className="text-xs px-2.5 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              登入 Alpha 帳號
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo("investor_beta@gmail.com", "價值者 Beta")}
              className="text-xs px-2.5 py-1 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-secondary hover:text-primary transition-colors cursor-pointer"
            >
              登入 Beta 帳號
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
