"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthManager } from "@/hooks/useAuth";
import AuthModal from "@/components/auth/AuthModal";
import ApiKeyGuideModal from "@/components/auth/ApiKeyGuideModal";
import {
  User,
  LogOut,
  KeyRound,
  ChevronDown,
  Settings as SettingsIcon,
  Sun,
  Moon,
  HelpCircle,
  Check,
  ExternalLink,
  Loader2,
  Bell,
} from "lucide-react";
import { useBeginnerMode } from "@/components/ui/TermTooltip";

export default function UserMenu() {
  const { user, logout, isApiKeyConfigured, loginWithGoogle } = useAuthManager();
  const { beginnerMode, toggleBeginnerMode } = useBeginnerMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const saved = (localStorage.getItem("theme_mode") as "dark" | "light") || "dark";
    setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme_mode", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDirectGoogleLogin = () => {
    const activeClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

    if (!activeClientId) {
      setAuthModalOpen(true);
      return;
    }

    const startGIS = () => {
      try {
        setIsRedirecting(true);
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid",
          callback: async (tokenResponse: any) => {
            setIsRedirecting(false);
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const info = await res.json();
                if (info?.email) {
                  loginWithGoogle(info.email, info.name, info.picture);
                }
              } catch (err) {
                console.error("Failed to fetch userinfo", err);
              }
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: "select_account" });
      } catch (e) {
        console.error(e);
        setIsRedirecting(false);
      }
    };

    if (typeof window !== "undefined") {
      if ((window as any).google?.accounts?.oauth2) {
        startGIS();
      } else {
        setIsRedirecting(true);
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = () => startGIS();
        script.onerror = () => setIsRedirecting(false);
        document.body.appendChild(script);
      }
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        {!user ? (
          <div className="flex items-center gap-1.5">
            {/* 未登入時：唯一 Google 官方登入按鈕 */}
            <button
              type="button"
              disabled={isRedirecting}
              onClick={handleDirectGoogleLogin}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:border-accent text-xs font-semibold text-primary transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-75"
              title="使用 Google 官方帳號登入"
            >
              {isRedirecting ? (
                <Loader2 className="w-4 h-4 animate-spin text-accent" />
              ) : (
                <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
              )}
              <span>{isRedirecting ? "連線 Google 中..." : "Google 登入"}</span>
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
          /* 登入後：右上角呈現真實 Google 大頭貼與標章 */
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-accent hover:shadow-sm text-xs transition-all cursor-pointer group"
            title="點擊展開 Google 帳號與網站個人設定"
          >
            {/* Google 大頭貼 (清晰大圖 + 右下角 Google 徽章) */}
            <div className="relative w-8 h-8 rounded-full flex-shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover border border-accent/40 group-hover:border-accent transition-colors shadow-xs"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              {/* 微型 Google 官方 4 彩標章 */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-xs border border-slate-200">
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
            </div>

            <div className="hidden sm:flex flex-col text-left leading-tight min-w-0 max-w-[105px]">
              <span className="font-semibold text-primary text-xs truncate">
                {user.name}
              </span>
              <span className="text-[10px] text-muted truncate">
                {user.email.split("@")[0]}
              </span>
            </div>
            <ChevronDown size={13} className="text-muted group-hover:text-primary transition-colors ml-0.5" />
          </button>
        )}

        {/* 點擊頭貼後展開的帳號與網站個人設定選單 */}
        {menuOpen && user && (
          <div className="absolute right-0 mt-2 w-72 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden z-50 text-xs animate-slide-up">
            {/* 帳號頂部資訊卡 */}
            <div className="p-3.5 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/50">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full flex-shrink-0">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover border-2 border-accent shadow-xs"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-sm">
                      {user.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {/* Google 徽章 */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs border border-slate-200">
                    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-primary truncate text-sm flex items-center gap-1.5">
                    <span>{user.name}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                      Google 認證
                    </span>
                  </div>
                  <div className="text-[11px] text-secondary truncate">{user.email}</div>
                </div>
              </div>

              {/* 獨立自選股隔離狀態 */}
              <div className="mt-2.5 p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[11px] space-y-1">
                <div className="flex items-center justify-between text-secondary">
                  <span>自選股儲存：</span>
                  <span className="text-emerald-400 font-mono font-semibold flex items-center gap-1">
                    <Check size={11} /> 獨立個人空間
                  </span>
                </div>
                <div className="flex items-center justify-between text-secondary">
                  <span>AI 算力通道：</span>
                  <span className="text-accent font-mono font-medium">
                    {isApiKeyConfigured ? "個人免費 Key" : "共享服務端算力"}
                  </span>
                </div>
              </div>
            </div>

            {/* 網站個人設定項目 */}
            <div className="p-2 space-y-1 border-b border-[var(--border)]">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                網站個人化偏好
              </div>

              {/* ⚙️ 前往「網站個人設定」主頁面 */}
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="w-full px-2.5 py-2 rounded-xl hover:bg-[var(--bg-tertiary)] flex items-center gap-2.5 text-primary transition-colors cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-lg bg-accent/15 text-accent flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <SettingsIcon size={14} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>網站個人設定</span>
                    <ExternalLink size={11} className="text-muted" />
                  </div>
                  <div className="text-[10px] text-secondary">後端連線、快取與各項自訂參數</div>
                </div>
              </Link>

              {/* 外觀主題快速切換 (淺色 / 深色) */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full px-2.5 py-2 rounded-xl hover:bg-[var(--bg-tertiary)] flex items-center justify-between text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                    {theme === "dark" ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-sky-500" />}
                  </div>
                  <span className="text-xs font-medium">外觀主題切換</span>
                </div>
                <span className="text-[11px] font-semibold text-primary px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)]">
                  {theme === "dark" ? "深色科技" : "淺色模式"}
                </span>
              </button>

              {/* 新手模式快速切換 (整合取代原本按鈕) */}
              <button
                type="button"
                onClick={toggleBeginnerMode}
                className="w-full px-2.5 py-2 rounded-xl hover:bg-[var(--bg-tertiary)] flex items-center justify-between text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold ${
                    beginnerMode ? "bg-amber-500/20 text-amber-500" : "bg-[var(--bg-tertiary)] text-muted"
                  }`}>
                    !
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-medium block text-primary">新手模式</span>
                    <span className="text-[10px] text-muted block">專有名詞顯示白話解說</span>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                  beginnerMode
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-500"
                    : "bg-[var(--bg-tertiary)] border-[var(--border)] text-muted"
                }`}>
                  {beginnerMode ? "已開啟" : "已關閉"}
                </span>
              </button>

              {/* 即時量化雷達推播通知開關 */}
              <button
                type="button"
                onClick={() => {
                  const curr = localStorage.getItem("watchlist_radar_enabled") !== "false";
                  const next = !curr;
                  localStorage.setItem("watchlist_radar_enabled", next ? "true" : "false");
                  window.dispatchEvent(new CustomEvent("watchlist_radar_toggle", { detail: next }));
                  // 強制觸發重渲染
                  setTheme((t) => (t === "dark" ? "dark" : "light"));
                }}
                className="w-full px-2.5 py-2 rounded-xl hover:bg-[var(--bg-tertiary)] flex items-center justify-between text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                    <Bell size={14} className={typeof window !== 'undefined' && localStorage.getItem("watchlist_radar_enabled") === "false" ? "text-muted" : "text-accent"} />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-medium block text-primary">即時雷達推播</span>
                    <span className="text-[10px] text-muted block">自選股突破與訊號提示</span>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                  typeof window !== 'undefined' && localStorage.getItem("watchlist_radar_enabled") === "false"
                    ? "bg-[var(--bg-tertiary)] border-[var(--border)] text-muted"
                    : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                }`}>
                  {typeof window !== 'undefined' && localStorage.getItem("watchlist_radar_enabled") === "false" ? "已關閉" : "已開啟"}
                </span>
              </button>
            </div>

            {/* 帳戶操作管理 */}
            <div className="p-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setApiKeyModalOpen(true);
                }}
                className="w-full px-2.5 py-2 rounded-xl hover:bg-[var(--bg-tertiary)] flex items-center gap-2.5 text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                  <KeyRound size={14} className="text-accent" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-xs text-primary">
                    {isApiKeyConfigured ? "管理個人 Gemini API Key" : "綁定個人免費 Gemini Key"}
                  </div>
                  <div className="text-[10px] text-secondary">Google AI Studio 免費額度</div>
                </div>
              </button>

              {/* 切換其他 Google 帳戶 (像藝廊一樣調用 Google 官方帳號選擇跳轉) */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleDirectGoogleLogin();
                }}
                className="w-full px-2.5 py-2 rounded-xl hover:bg-[var(--bg-tertiary)] flex items-center gap-2.5 text-secondary hover:text-primary transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center flex-shrink-0">
                  <User size={14} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-xs text-primary">換登其他 Google 帳戶</div>
                  <div className="text-[10px] text-secondary">開啟 Google 官方帳號選擇器</div>
                </div>
              </button>

              {/* 登出 */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full px-2.5 py-2 rounded-xl hover:bg-rose-500/10 flex items-center gap-2.5 text-rose-400 transition-colors cursor-pointer border-t border-[var(--border)] mt-1"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  <LogOut size={14} />
                </div>
                <span className="font-medium text-xs">登出目前 Google 帳戶</span>
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
