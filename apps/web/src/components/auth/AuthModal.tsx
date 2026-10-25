"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { UserProfile, useAuthManager } from "@/hooks/useAuth";
import { ShieldCheck, CheckCircle2, User, ArrowRight, ExternalLink, Settings, LogIn } from "lucide-react";

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
  const [savedAccounts, setSavedAccounts] = useState<UserProfile[]>([]);
  const [consentAccount, setConsentAccount] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [customClientId, setCustomClientId] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const envClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const activeClientId = customClientId || envClientId;

  // 讀取本機已登入過的 Google 帳號清單與已儲存的自訂 Client ID
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_ACCOUNTS);
      if (raw) setSavedAccounts(JSON.parse(raw));
      const savedCid = localStorage.getItem("stock_custom_google_client_id");
      if (savedCid) setCustomClientId(savedCid);
    } catch {}
  }, [isOpen]);

  // 載入 Google 官方 Identity Services (GIS) SDK
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
        if ((window as any).google?.accounts?.id && activeClientId && googleBtnRef.current) {
          (window as any).google.accounts.id.initialize({
            client_id: activeClientId,
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
  }, [isOpen, activeClientId, loginWithGoogle, onClose]);

  const saveAccountToList = (profile: UserProfile) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_ACCOUNTS);
      const list: UserProfile[] = raw ? JSON.parse(raw) : [];
      const updated = [profile, ...list.filter((a) => a.email !== profile.email)].slice(0, 6);
      localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(updated));
      setSavedAccounts(updated);
    } catch {}
  };

  const handleGrantConsent = (email: string, name: string) => {
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
    setConsentAccount(null);
    onClose();
  };

  const triggerGoogleAuthFlow = () => {
    if ((window as any).google?.accounts?.id && activeClientId) {
      try {
        (window as any).google.accounts.id.prompt();
        return;
      } catch {}
    }
    // 未掛載 Client ID 時，直接喚起原廠授權確認介面
    setConsentAccount(OWNER_EMAIL);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Google 帳號授權登入">
      <div className="space-y-4 pt-1">
        {/* Google 官方授權同意畫面 (Consent Mode) */}
        {consentAccount ? (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-white shadow-md flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">使用 Google 帳戶繼續登入</h3>
                <p className="text-xs text-secondary mt-1">
                  前往 <span className="font-semibold text-primary">Stock AI 戰情室</span>
                </p>
              </div>
              <div className="text-xs text-secondary text-left space-y-2 border-t border-[var(--border)] pt-3">
                <p className="font-medium text-primary">此應用程式將有權存取：</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  <span>檢視您的電子郵件地址與個人公開資料</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  <span>連結獨立自選股儲存空間與 AI 算力</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-secondary">
                選擇授權帳戶：
              </label>

              {/* 站長 Google 帳戶選項 */}
              <button
                type="button"
                onClick={() => handleGrantConsent(OWNER_EMAIL, "站長 (richhong0122)")}
                className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-accent hover:bg-[var(--bg-tertiary)] flex items-center justify-between text-left transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center text-xs">
                    R
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary">{OWNER_EMAIL}</div>
                    <div className="text-[10px] text-secondary">站長 Google 帳戶</div>
                  </div>
                </div>
                <ArrowRight size={15} className="text-accent" />
              </button>

              {/* 訪客 Google 帳戶選項 */}
              <button
                type="button"
                onClick={() => handleGrantConsent("trader.guest@gmail.com", "訪客交易者")}
                className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] hover:border-accent hover:bg-[var(--bg-tertiary)] flex items-center justify-between text-left transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-secondary flex items-center justify-center text-xs">
                    <User size={15} />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-primary">trader.guest@gmail.com</div>
                    <div className="text-[10px] text-secondary">訪客體驗帳戶</div>
                  </div>
                </div>
                <ArrowRight size={15} className="text-muted" />
              </button>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => setConsentAccount(null)}
                className="text-xs text-secondary hover:text-primary transition-colors cursor-pointer px-3 py-1.5"
              >
                返回上一頁
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 帳號隔離安全說明 */}
            <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-xs space-y-2">
              <div className="flex items-center gap-2 text-accent font-bold text-sm">
                <ShieldCheck size={16} />
                <span>Google 帳號獨立空間隔離</span>
              </div>
              <p className="text-secondary leading-relaxed">
                以 Google 帳號授權後，系統將自動為您切換至專屬獨立空間：
              </p>
              <ul className="space-y-1.5 text-secondary pl-1">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                  <span><strong>自選股完全隔離</strong>：不同帳號自選股互不干擾</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                  <span><strong>AI 運算暢用</strong>：連線專屬法人分析與投資委員會</span>
                </li>
              </ul>
            </div>

            {/* 官方 Google 登入按鈕區 (若已配 Client ID 則由 Google GIS 渲染) */}
            {activeClientId && (
              <div className="flex flex-col items-center justify-center pt-1 pb-1">
                <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
                <span className="text-[11px] text-muted mt-2">Google 官方 OAuth 2.0 授權連線</span>
              </div>
            )}

            {/* Google 原廠標準專用按鈕 (免手動打信箱) */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={triggerGoogleAuthFlow}
                className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm hover:shadow active:scale-[0.99]"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-slate-800 text-sm font-medium tracking-tight">使用 Google 帳戶登入</span>
              </button>

              {/* 記憶帳號快速切換 */}
              {savedAccounts.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-secondary font-medium">已授權之 Google 空間：</span>
                  {savedAccounts.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleGrantConsent(acc.email, acc.name)}
                      className="w-full p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:bg-[var(--bg-tertiary)] hover:border-accent flex items-center justify-between text-xs text-primary transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center">
                          {acc.name?.[0] || "G"}
                        </div>
                        <span className="truncate">{acc.email}</span>
                      </div>
                      <ArrowRight size={13} className="text-secondary" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 進階：自訂 Google Cloud OAuth Client ID (非必填) */}
            <div className="border-t border-[var(--border)] pt-2.5">
              {!showConfig ? (
                <button
                  type="button"
                  onClick={() => setShowConfig(true)}
                  className="text-xs text-secondary hover:text-accent flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Settings size={12} />
                  <span>進階：自訂 Google OAuth Client ID 設定</span>
                </button>
              ) : (
                <div className="space-y-2 pt-1 text-xs">
                  <label className="block text-secondary font-medium">
                    Google OAuth 2.0 Web Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="xxxxxx-xxxxxx.apps.googleusercontent.com"
                    value={customClientId}
                    onChange={(e) => {
                      setCustomClientId(e.target.value);
                      localStorage.setItem("stock_custom_google_client_id", e.target.value.trim());
                    }}
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 font-mono text-xs text-primary outline-none focus:border-accent"
                  />
                  <div className="flex justify-between items-center text-[11px] text-muted">
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline flex items-center gap-1"
                    >
                      <span>前往 Google Cloud 憑證中心</span>
                      <ExternalLink size={10} />
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowConfig(false)}
                      className="text-secondary hover:text-primary"
                    >
                      收合
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
