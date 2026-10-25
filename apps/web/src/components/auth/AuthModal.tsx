"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { UserProfile, useAuthManager } from "@/hooks/useAuth";
import { ShieldCheck, CheckCircle2, User, ArrowRight, ExternalLink, Settings, Plus, Trash2, Check } from "lucide-react";

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
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
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
      let list: UserProfile[] = raw ? JSON.parse(raw) : [];

      // 確保至少包含站長與訪客預設選項
      const hasOwner = list.some((a) => a.email === OWNER_EMAIL);
      const hasGuest = list.some((a) => a.email === "trader.guest@gmail.com");

      if (!hasOwner) {
        list.unshift({
          id: `usr_${btoa(OWNER_EMAIL).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`,
          email: OWNER_EMAIL,
          name: "站長 (richhong0122)",
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=richhong0122`,
          provider: "google",
          createdAt: Date.now(),
        });
      }
      if (!hasGuest) {
        list.push({
          id: `usr_${btoa("trader.guest@gmail.com").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`,
          email: "trader.guest@gmail.com",
          name: "訪客交易者",
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=Guest`,
          provider: "google",
          createdAt: Date.now(),
        });
      }

      setSavedAccounts(list);

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
      const updated = [profile, ...savedAccounts.filter((a) => a.email !== profile.email)].slice(0, 8);
      localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(updated));
      setSavedAccounts(updated);
    } catch {}
  };

  const handleSelectAccount = (acc: UserProfile) => {
    loginWithGoogle(acc.email, acc.name, acc.avatar);
    saveAccountToList(acc);
    onClose();
  };

  const handleAddNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setErrorMsg("請輸入正確的電子郵件信箱 (例如: user@gmail.com)");
      return;
    }
    const name = newName.trim() || clean.split("@")[0];
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || clean)}`;
    const profile: UserProfile = {
      id: `usr_${btoa(clean).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`,
      email: clean,
      name,
      avatar,
      provider: "google",
      createdAt: Date.now(),
    };
    loginWithGoogle(clean, name, avatar);
    saveAccountToList(profile);
    setShowAddAccount(false);
    setNewEmail("");
    setNewName("");
    setErrorMsg("");
    onClose();
  };

  const handleRemoveAccount = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    if (email === OWNER_EMAIL || email === "trader.guest@gmail.com") return;
    const filtered = savedAccounts.filter((a) => a.email !== email);
    setSavedAccounts(filtered);
    localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(filtered));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="選擇 Google 帳戶登入">
      <div className="space-y-4 pt-1">
        {/* 帳號隔離安全說明卡 */}
        <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-xs space-y-2">
          <div className="flex items-center gap-2 text-accent font-bold text-sm">
            <ShieldCheck size={16} />
            <span>Google 帳戶獨立空間與自選股隔離</span>
          </div>
          <p className="text-secondary leading-relaxed">
            每個 Google 帳戶皆享有專屬獨立的自選股清單與分析記錄，換帳號自動切換，不與他人混淆。
          </p>
        </div>

        {/* 官方 Google 登入按鈕區 (若已配 Client ID 則由 Google GIS 渲染) */}
        {activeClientId && (
          <div className="flex flex-col items-center justify-center pt-1 pb-1">
            <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
            <span className="text-[11px] text-muted mt-2">Google 官方 OAuth 2.0 授權連線</span>
          </div>
        )}

        {/* 帳戶選擇清單 (像 Google 官方 Account Chooser) */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-secondary">
            選擇要使用的帳戶：
          </label>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {savedAccounts.map((acc) => {
              const isCurrent = currentUser?.email === acc.email;
              const isOwner = acc.email === OWNER_EMAIL;
              return (
                <div
                  key={acc.email}
                  onClick={() => handleSelectAccount(acc)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer shadow-sm ${
                    isCurrent
                      ? "bg-accent/15 border-accent text-primary"
                      : "bg-[var(--bg-secondary)] border-[var(--border)] hover:bg-[var(--bg-tertiary)] hover:border-accent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Google 頭貼或 Dicebear 圖示 */}
                    <div className="relative w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden border border-[var(--border)]">
                      {acc.avatar ? (
                        <img src={acc.avatar} alt={acc.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary">
                          {acc.name[0]?.toUpperCase() || "G"}
                        </span>
                      )}
                      {/* 右下角 Google 徽章 */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-xs">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                      </div>
                    </div>

                    <div className="text-left min-w-0">
                      <div className="text-xs font-bold text-primary truncate flex items-center gap-1.5">
                        <span>{acc.name}</span>
                        {isOwner && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-400 font-medium">
                            站長
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500 text-white font-bold flex items-center gap-0.5">
                            <Check size={9} /> 使用中
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-secondary truncate">{acc.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isOwner && acc.email !== "trader.guest@gmail.com" && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveAccount(e, acc.email)}
                        className="p-1 rounded-md text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="從選單移除此帳號"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <ArrowRight size={15} className={isCurrent ? "text-accent" : "text-muted"} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ➕ 登入其他 Google 帳戶 */}
        <div className="border-t border-[var(--border)] pt-2.5">
          {!showAddAccount ? (
            <button
              type="button"
              onClick={() => setShowAddAccount(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[var(--border)] hover:border-accent text-xs text-secondary hover:text-primary flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus size={14} className="text-accent" />
              <span>使用其他 Google 帳戶登入</span>
            </button>
          ) : (
            <form onSubmit={handleAddNewAccount} className="space-y-2.5 p-3 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border)] animate-fade-in">
              <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Plus size={13} className="text-accent" />
                <span>登入其他 Google 帳戶</span>
              </div>
              <div>
                <label className="block text-[11px] text-secondary mb-1">
                  Google (Gmail) 電子郵件信箱
                </label>
                <input
                  type="email"
                  required
                  placeholder="your.google.account@gmail.com"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setErrorMsg("");
                  }}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-primary outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] text-secondary mb-1">
                  顯示名稱 (選填)
                </label>
                <input
                  type="text"
                  placeholder="例如: 投資人 Alex"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-primary outline-none focus:border-accent"
                />
              </div>

              {errorMsg && <div className="text-xs text-rose-400">{errorMsg}</div>}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-lg bg-accent text-slate-950 font-bold text-xs hover:opacity-95 transition-opacity cursor-pointer"
                >
                  確認切換登入
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAccount(false)}
                  className="py-2 px-3 rounded-lg bg-[var(--bg-secondary)] text-secondary text-xs hover:text-primary transition-colors cursor-pointer"
                >
                  取消
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 進階：自訂 Google Cloud OAuth Client ID 設定 */}
        <div className="border-t border-[var(--border)] pt-2">
          {!showConfig ? (
            <button
              type="button"
              onClick={() => setShowConfig(true)}
              className="text-[11px] text-muted hover:text-secondary flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Settings size={11} />
              <span>進階：自訂 Google OAuth 2.0 Client ID</span>
            </button>
          ) : (
            <div className="space-y-2 pt-1 text-xs">
              <label className="block text-secondary font-medium text-[11px]">
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
              <div className="flex justify-between items-center text-[10px] text-muted">
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
                  className="text-secondary hover:text-primary cursor-pointer"
                >
                  收合
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
