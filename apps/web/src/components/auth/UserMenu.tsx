"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthManager } from "@/hooks/useAuth";
import AuthModal from "@/components/auth/AuthModal";
import ApiKeyGuideModal from "@/components/auth/ApiKeyGuideModal";
import { User, LogOut, KeyRound, ShieldCheck, Sparkles, ChevronDown } from "lucide-react";

export default function UserMenu() {
  const { user, logout, isApiKeyConfigured } = useAuthManager();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div className="relative" ref={menuRef}>
        {!user ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] hover:border-accent text-xs font-medium text-primary transition-all cursor-pointer shadow-sm"
              title="登入 Google 帳號以啟用獨立自選股與專屬 AI 額度"
            >
              <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24">
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
              <span>Google 登入</span>
            </button>

            <button
              type="button"
              onClick={() => setApiKeyModalOpen(true)}
              className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                isApiKeyConfigured
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-[var(--bg-tertiary)] border-[var(--border)] text-muted hover:text-primary"
              }`}
              title={isApiKeyConfigured ? "個人免費 Gemini Key 已啟用" : "點擊綁定個人免費 Gemini Key"}
            >
              <KeyRound size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] hover:border-accent text-xs transition-all cursor-pointer"
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-5 h-5 rounded-full object-cover border border-accent/40"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-[10px]">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="font-semibold text-primary text-[11px] max-w-[85px] truncate">
                {user.name}
              </span>
              <span className="text-[9px] text-secondary flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isApiKeyConfigured ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                {isApiKeyConfigured ? "已綁 Key" : "未綁 Key"}
              </span>
            </div>
            <ChevronDown size={12} className="text-muted" />
          </button>
        )}

        {/* 帳號下拉面板 */}
        {menuOpen && user && (
          <div className="absolute right-0 mt-2 w-64 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden z-50 text-xs animate-slide-up">
            {/* 帳號基本資訊 */}
            <div className="p-3.5 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/50">
              <div className="flex items-center gap-2.5">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover border border-accent"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">
                    {user.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-primary truncate text-sm">{user.name}</div>
                  <div className="text-[11px] text-muted truncate">{user.email}</div>
                </div>
              </div>

              {/* 帳號隔離狀態卡 */}
              <div className="mt-3 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-secondary">
                  <span>自選股資料：</span>
                  <span className="text-emerald-400 font-mono font-medium">個人獨立空間</span>
                </div>
                <div className="flex items-center justify-between text-secondary">
                  <span>AI 算力配額：</span>
                  <span
                    className={`font-mono font-medium ${
                      isApiKeyConfigured ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {isApiKeyConfigured ? "個人專屬免費 Key" : "未綁定 (訪客模式)"}
                  </span>
                </div>
              </div>
            </div>

            {/* 操作選單 */}
            <div className="p-1.5 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setApiKeyModalOpen(true);
                }}
                className="w-full px-3 py-2 text-left rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center gap-2 text-primary transition-colors cursor-pointer"
              >
                <KeyRound size={14} className="text-accent" />
                <div className="flex-1">
                  <div className="font-semibold text-[11px]">
                    {isApiKeyConfigured ? "管理個人 Gemini Key" : "免費領取個人 Gemini Key"}
                  </div>
                  <div className="text-[10px] text-secondary">Google AI Studio 免費 15 次/分</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setAuthModalOpen(true);
                }}
                className="w-full px-3 py-2 text-left rounded-lg hover:bg-[var(--bg-tertiary)] flex items-center gap-2 text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <User size={14} />
                <span>切換 Google 帳號</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full px-3 py-2 text-left rounded-lg hover:bg-rose-500/10 flex items-center gap-2 text-rose-400 transition-colors cursor-pointer border-t border-[var(--border)] mt-1"
              >
                <LogOut size={14} />
                <span>登出目前帳號</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <ApiKeyGuideModal isOpen={apiKeyModalOpen} onClose={() => setApiKeyModalOpen(false)} />
    </>
  );
}
