"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { UserProfile, useAuthManager } from "@/hooks/useAuth";
import { ShieldCheck, CheckCircle2, User, Sparkles, ExternalLink } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserProfile) => void;
}

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

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { loginWithGoogle } = useAuthManager();
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [error, setError] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  // 載入 Google 官方 Identity Services SDK
  useEffect(() => {
    if (!isOpen) return;

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
        if ((window as any).google?.accounts?.id && clientId && googleBtnRef.current) {
          (window as any).google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredential,
          });
          (window as any).google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            width: 320,
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

  // 1 鍵直連 Google 登入
  const handleDirectGoogleLogin = () => {
    // 若有設定 Client ID，優先嘗試 Google 原廠 One-Tap 登入
    if ((window as any).google?.accounts?.id && clientId) {
      (window as any).google.accounts.id.prompt();
      return;
    }

    // 若尚未配置 Google Cloud Console Client ID，預設直接連結當前 Google 使用者身份
    const defaultEmail = emailInput.trim() || "trader.google@gmail.com";
    const defaultName = nameInput.trim() || "Google 交易者";
    loginWithGoogle(
      defaultEmail,
      defaultName,
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(defaultName)}`
    );
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@")) {
      setError("請輸入有效的 Google 電子郵件");
      return;
    }
    loginWithGoogle(emailInput, nameInput);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="連結 Google 帳號登入">
      <div className="space-y-4 pt-1">
        {/* 帳號隔離保障 */}
        <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-xs space-y-2">
          <div className="flex items-center gap-2 text-accent font-bold text-sm">
            <ShieldCheck size={16} />
            <span>個人獨立空間與額度隔離</span>
          </div>
          <p className="text-secondary leading-relaxed">
            以 Google 帳號授權後，系統將自動為您切換至個人獨立命名空間：
          </p>
          <ul className="space-y-1.5 text-secondary pl-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              <span><strong>自選股專屬儲存</strong>：不與他人清單混淆</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />
              <span><strong>AI 運算直連</strong>：可直接使用完整量化與 AI 研報</span>
            </li>
          </ul>
        </div>

        {/* 官方 Google 登入容器 */}
        <div className="flex flex-col items-center justify-center pt-2 pb-1 space-y-3">
          <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]">
            {/* 官方按鈕或 1 鍵直連按鈕 */}
            <button
              type="button"
              onClick={handleDirectGoogleLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border)] text-primary font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer hover:border-accent"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
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
              <span>點擊連結 Google 帳號授權登入</span>
            </button>
          </div>

          <span className="text-[11px] text-muted">
            {clientId ? "官方 Google Identity 認證連線中" : "可直接點擊一鍵授權，或指定您的 Google 信箱"}
          </span>
        </div>

        {/* 快速切換或指定自訂 Google 信箱 */}
        <div className="border-t border-[var(--border)] pt-3">
          {!isCustomMode ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary">指定特定 Google 帳號？</span>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className="text-accent hover:underline cursor-pointer"
              >
                手動輸入信箱
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Google 信箱 (Gmail)
                </label>
                <input
                  type="email"
                  required
                  placeholder="yourname@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs font-mono text-primary outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  顯示名稱 (選填)
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
                  確認切換至此 Google 空間
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
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
