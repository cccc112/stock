"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { UserProfile, useAuthManager } from "@/hooks/useAuth";
import { ShieldCheck, CheckCircle2, User, ArrowRight, Plus, Sparkles } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
}

const STORAGE_KEY_SAVED_ACCOUNTS = "stock_saved_google_accounts";
const OWNER_EMAIL = "richhong0122@gmail.com";

function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { loginWithGoogle, user: currentUser } = useAuthManager();
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [savedAccounts, setSavedAccounts] = useState<UserProfile[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [error, setError] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  // 讀取本機已登入過的 Google 帳號清單
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_ACCOUNTS);
      if (raw) {
        setSavedAccounts(JSON.parse(raw));
      }
    } catch {}
  }, [isOpen]);

  // 載入 Google 官方 Identity Services SDK
  useEffect(() => {
    if (!isOpen) return;

    const handleCredential = (response: any) => {
      if (response?.credential) {
        const payload = parseJwt(response.credential);
        if (payload?.email) {
          const profile: UserProfile = {
            id: `usr_${btoa(payload.email).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`,
            email: payload.email,
            name: payload.name || payload.email.split("@")[0],
            avatar: payload.picture,
            provider: "google",
            createdAt: Date.now(),
          };
          loginWithGoogle(payload.email, payload.name, payload.picture);
          saveAccountToList(profile);
          onClose();
        }
      }
    };

    if (typeof window !== "undefined") {
      const initGsi = () => {
        if ((window as any).google?.accounts?.id && clientId && googleBtnRef.current) {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredential,
          });
          (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            shape: "pill",
          });
        }
      };

      if ((window as any).google?.accounts?.id) {
        initGsi();
      } else {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = initGsi;
        document.body.appendChild(script);
      }
    }
  }, [isOpen, clientId, loginWithGoogle, onClose]);

  const saveAccountToList = (profile: UserProfile) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_ACCOUNTS);
      const list: UserProfile[] = raw ? JSON.parse(raw) : [];
      const updated = [profile, ...list.filter((a) => a.email !== profile.email)].slice(0, 6);
      localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(updated));
      setSavedAccounts(updated);
    } catch {}
  };

  const handleQuickLogin = (email: string, name: string) => {
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`;
    const profile: UserProfile = {
      id: `usr_${btoa(email).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`,
      email,
      name,
      avatar,
      provider: "google",
      createdAt: Date.now(),
    };
    loginWithGoogle(email, name, avatar);
    saveAccountToList(profile);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setError("請輸入有效的 Google (Gmail) 信箱");
      return;
    }
    const name = nameInput.trim() || clean.split("@")[0];
    handleQuickLogin(clean, name);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="連結 Google 帳號登入">
      <div className="space-y-4 pt-1">
        {/* 帳號隔離保障 */}
        <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-xs space-y-2">
          <div className="flex items-center gap-2 text-accent font-bold text-sm">
            <ShieldCheck size={16} />
            <span>個人獨立空間與自選股隔離</span>
          </div>
          <p className="text-secondary leading-relaxed">
            以 Google 帳號授權後，系統將自動為您切換至專屬獨立空間：
          </p>
          <ul className="space-y-1.5 text-secondary pl-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              <span><strong>自選股完全隔離</strong>：換帳號自動切換，不與他人混淆</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              <span><strong>AI 算力暢用</strong>：直接連線完整大模型法人分析與投資委員會</span>
            </li>
          </ul>
        </div>

        {/* 官方 Google 登入按鈕 (若有 Client ID 則由 Google GIS 渲染) */}
        {clientId && (
          <div className="flex flex-col items-center justify-center pt-1 pb-1">
            <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
            <span className="text-[11px] text-muted mt-2">Google 官方 OAuth 授權連線</span>
          </div>
        )}

        {/* 一鍵直接登入區塊 (免輸入任何文字) */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-secondary">
            快速一鍵登入 (免手動輸入)：
          </label>

          {/* 站長主要 Google 帳號 1-Click 按鈕 */}
          <button
            type="button"
            onClick={() => handleQuickLogin(OWNER_EMAIL, "站長 (richhong0122)")}
            className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer shadow-sm ${
              currentUser?.email === OWNER_EMAIL
                ? "bg-accent/15 border-accent text-primary"
                : "bg-accent text-slate-950 font-bold hover:opacity-95"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
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
              <div className="text-left min-w-0">
                <div className="text-xs truncate flex items-center gap-1.5">
                  <span>以 {OWNER_EMAIL} 一鍵登入</span>
                  {currentUser?.email === OWNER_EMAIL && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500 text-white font-bold">
                      使用中
                    </span>
                  )}
                </div>
                <div className="text-[10px] opacity-80 truncate">個人專屬獨立空間與自選股</div>
              </div>
            </div>
            <ArrowRight size={16} className="flex-shrink-0" />
          </button>

          {/* 訪客 Google 體驗帳號按鈕 */}
          <button
            type="button"
            onClick={() => handleQuickLogin("trader.guest@gmail.com", "訪客交易者")}
            className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:bg-[var(--bg-tertiary)] hover:border-accent text-primary text-xs font-semibold flex items-center justify-between cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2.5">
              <User size={15} className="text-secondary" />
              <span>訪客一鍵體驗登入 (免打信箱)</span>
            </div>
            <ArrowRight size={14} className="text-secondary" />
          </button>
        </div>

        {/* 已存帳號列表 (其他登入過的帳號) */}
        {savedAccounts.filter((a) => a.email !== OWNER_EMAIL).length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] text-secondary font-medium">其他已記憶帳號：</span>
            {savedAccounts
              .filter((a) => a.email !== OWNER_EMAIL)
              .map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleQuickLogin(acc.email, acc.name)}
                  className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:bg-[var(--bg-tertiary)] flex items-center justify-between text-xs text-primary transition-all cursor-pointer"
                >
                  <span className="truncate">{acc.email}</span>
                  <ArrowRight size={12} className="text-muted" />
                </button>
              ))}
          </div>
        )}

        {/* 手動輸入其他 Gmail (次要展開功能) */}
        <div className="border-t border-[var(--border)] pt-2.5">
          {!showCustomForm ? (
            <button
              type="button"
              onClick={() => setShowCustomForm(true)}
              className="text-xs text-secondary hover:text-accent flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>指定其他自訂 Google (Gmail) 信箱</span>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-2.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  其他 Google (Gmail) 信箱
                </label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setError("");
                  }}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-primary outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  顯示稱呼 (選填)
                </label>
                <input
                  type="text"
                  placeholder="自訂稱呼"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-primary outline-none focus:border-accent"
                />
              </div>

              {error && <div className="text-xs text-danger">{error}</div>}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-lg bg-accent text-black font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  確認登入
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="py-2 px-3 rounded-lg bg-[var(--bg-tertiary)] text-secondary text-xs hover:text-primary transition-colors cursor-pointer"
                >
                  取消
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
}
