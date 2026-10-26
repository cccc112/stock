"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { UserProfile, useAuthManager, parseJwt } from "@/hooks/useAuth";
import { ShieldCheck, ArrowRight, Trash2, Check, LogOut, AlertCircle } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
}

const STORAGE_KEY_SAVED_ACCOUNTS = "stock_saved_google_accounts";

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { loginWithGoogle, user: currentUser, logout } = useAuthManager();
  const [savedAccounts, setSavedAccounts] = useState<UserProfile[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const activeClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  // 讀取真實登入過的 Google 帳號清單（徹底清理任何模擬假帳號）
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_ACCOUNTS);
      let list: UserProfile[] = raw ? JSON.parse(raw) : [];

      // 清除歷史遺留的模擬帳號 (例如 trader.guest@gmail.com 或 假站長)
      list = list.filter(
        (a) =>
          a.email &&
          a.email !== "trader.guest@gmail.com" &&
          !a.name?.includes("訪客交易者") &&
          !(a.email === "richhong0122@gmail.com" && a.avatar?.includes("dicebear"))
      );
      localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(list));
      setSavedAccounts(list);
    } catch {}
  }, [isOpen]);

  // 載入 Google 官方 Identity Services (GIS) SDK
  useEffect(() => {
    if (!isOpen || !activeClientId) return;

    const handleCredential = (response: any) => {
      if (response?.credential) {
        const payload = parseJwt(response.credential);
        if (payload?.email) {
          loginWithGoogle(payload.email, payload.name, payload.picture);
          onClose();
        }
      }
    };

    if (typeof window !== "undefined") {
      const initGsi = () => {
        if ((window as any).google?.accounts?.id && activeClientId && googleBtnRef.current) {
          try {
            (window as any).google.accounts.id.initialize({
              client_id: activeClientId,
              callback: handleCredential,
            });
            googleBtnRef.current.innerHTML = "";
            (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
              theme: "outline",
              size: "large",
              width: 320,
              text: "signin_with",
              shape: "pill",
            });
          } catch (e: any) {
            console.error("GIS render button failed", e);
          }
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

  // 觸發 Google 原生 OAuth 彈窗 (Account Chooser)
  const handleTriggerGoogleOAuth = () => {
    setErrorMsg("");
    if (!activeClientId) {
      setErrorMsg("Google 登入服務準備中（請洽系統管理員設定 Client ID）。");
      return;
    }

    if (typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
      try {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid",
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              setErrorMsg(`Google 授權中斷: ${tokenResponse.error}`);
              return;
            }
            if (tokenResponse?.access_token) {
              try {
                const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const info = await res.json();
                if (info?.email) {
                  loginWithGoogle(info.email, info.name, info.picture);
                  onClose();
                } else {
                  setErrorMsg("無法從 Google 取得使用者資訊，請重試。");
                }
              } catch (e: any) {
                setErrorMsg(`取得 Google Profile 失敗: ${e.message}`);
              }
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: "select_account" });
      } catch (err: any) {
        setErrorMsg(`喚起 Google 彈窗失敗: ${err.message}`);
      }
    } else {
      setErrorMsg("Google 登入服務載入中，請稍候重試。");
    }
  };

  const handleSelectSavedAccount = (acc: UserProfile) => {
    loginWithGoogle(acc.email, acc.name, acc.avatar);
    onClose();
  };

  const handleRemoveSavedAccount = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    const filtered = savedAccounts.filter((a) => a.email !== email);
    setSavedAccounts(filtered);
    localStorage.setItem(STORAGE_KEY_SAVED_ACCOUNTS, JSON.stringify(filtered));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Google 帳戶登入">
      <div className="space-y-4 pt-1">
        {/* 安全提示說明 */}
        <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-accent font-bold text-sm">
            <ShieldCheck size={16} />
            <span>Google 帳戶資料隔離</span>
          </div>
          <p className="text-secondary leading-relaxed">
            每個 Google 帳戶皆享有獨立專屬的自選股與分析設定，換帳號即切換，不與他人混淆。
          </p>
        </div>

        {/* 目前登入狀態 */}
        {currentUser && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 border border-emerald-500/40">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xs text-primary">
                    {currentUser.name[0]}
                  </div>
                )}
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-primary truncate flex items-center gap-1">
                  <span>{currentUser.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">
                    已登入
                  </span>
                </div>
                <div className="text-[11px] text-secondary truncate">{currentUser.email}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="text-xs px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <LogOut size={12} />
              <span>登出</span>
            </button>
          </div>
        )}

        {/* 官方原生 Google 登入按鈕區 */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleTriggerGoogleOAuth}
            className="w-full py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99]"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="text-slate-800 text-sm font-semibold tracking-tight">
              {currentUser ? "切換至其他 Google 帳戶" : "使用 Google 帳戶登入"}
            </span>
          </button>

          {/* GIS 官方渲染按鈕 */}
          {activeClientId && (
            <div className="flex flex-col items-center justify-center">
              <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* 歷史真實登入過的 Google 帳戶清單（只在真正登入過多個 Google 帳號時顯示） */}
        {savedAccounts.length > 0 && (
          <div className="space-y-2 border-t border-[var(--border)] pt-3">
            <label className="block text-xs font-semibold text-secondary">
              本機已授權的 Google 帳戶：
            </label>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {savedAccounts.map((acc) => {
                const isCurrent = currentUser?.email === acc.email;
                return (
                  <div
                    key={acc.email}
                    onClick={() => handleSelectSavedAccount(acc)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer shadow-sm ${
                      isCurrent
                        ? "bg-accent/15 border-accent text-primary"
                        : "bg-[var(--bg-secondary)] border-[var(--border)] hover:bg-[var(--bg-tertiary)] hover:border-accent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700 border border-[var(--border)]">
                        {acc.avatar ? (
                          <img src={acc.avatar} alt={acc.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs text-primary">
                            {acc.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-xs font-bold text-primary truncate flex items-center gap-1">
                          <span>{acc.name}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-600 text-white font-bold flex items-center gap-0.5">
                              <Check size={8} /> 使用中
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-secondary truncate">{acc.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleRemoveSavedAccount(e, acc.email)}
                        className="p-1 rounded-md text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="從清單移除"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ArrowRight size={14} className={isCurrent ? "text-accent" : "text-muted"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
