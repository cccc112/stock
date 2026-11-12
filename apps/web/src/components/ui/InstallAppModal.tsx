"use client";

import { useState, useEffect } from "react";
import { Smartphone, Download, Share, PlusSquare, CheckCircle2, X, Sparkles, Monitor, Layers } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<"ios" | "android" | "native">("ios");

  useEffect(() => {
    // 註冊 PWA Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // 偵測是否已經處於獨立 App 模式 (Standalone)
    if (
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true)
    ) {
      setIsInstalled(true);
    }

    // 自動根據裝置切換預設頁籤
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      if (/android/.test(ua)) {
        setActiveTab("android");
      } else if (/iphone|ipad|ipod/.test(ua)) {
        setActiveTab("ios");
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setActiveTab("android");
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstalled(true);
        setIsOpen(false);
      }
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all cursor-pointer active:scale-95 flex-shrink-0 shadow-sm"
        title="將 OmniTick 安裝為手機或桌面原生感全螢幕 APP"
      >
        <Smartphone size={14} className="text-cyan-400" />
        <span className="hidden sm:inline">{isInstalled ? "APP 已安裝" : "下載 APP"}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[var(--bg-secondary)] border border-cyan-500/40 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 頂部 Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/60 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandLogo size={36} />
                <div>
                  <h3 className="text-sm font-extrabold text-primary flex items-center gap-1.5">
                    <span>安裝 OmniTick 手機 / 桌面 APP</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                      PWA 原生全螢幕
                    </span>
                  </h3>
                  <p className="text-[11px] text-secondary mt-0.5">
                    免過商店審核，3 秒安裝至主畫面，享受無網址列全螢幕極速看盤
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 平台切換 Tabs */}
            <div className="grid grid-cols-3 border-b border-[var(--border)] bg-[var(--bg-primary)] text-xs font-bold">
              <button
                onClick={() => setActiveTab("ios")}
                className={`py-2.5 text-center transition-colors cursor-pointer border-b-2 ${
                  activeTab === "ios"
                    ? "border-cyan-400 text-cyan-400 bg-cyan-500/10"
                    : "border-transparent text-secondary hover:text-primary"
                }`}
              >
                iPhone / iPad
              </button>
              <button
                onClick={() => setActiveTab("android")}
                className={`py-2.5 text-center transition-colors cursor-pointer border-b-2 ${
                  activeTab === "android"
                    ? "border-cyan-400 text-cyan-400 bg-cyan-500/10"
                    : "border-transparent text-secondary hover:text-primary"
                }`}
              >
                Android / 電腦
              </button>
              <button
                onClick={() => setActiveTab("native")}
                className={`py-2.5 text-center transition-colors cursor-pointer border-b-2 ${
                  activeTab === "native"
                    ? "border-amber-400 text-amber-400 bg-amber-500/10"
                    : "border-transparent text-secondary hover:text-primary"
                }`}
              >
                雙商店打包 (APK)
              </button>
            </div>

            {/* 內容區 */}
            <div className="p-5 space-y-4 text-xs">
              {activeTab === "ios" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <div className="font-bold text-primary mb-0.5 flex items-center gap-1.5">
                        <span>在 Safari 點擊底部「分享」按鈕</span>
                        <Share size={14} className="text-cyan-400" />
                      </div>
                      <p className="text-secondary leading-relaxed">
                        請使用 iPhone 的 Safari 或 Chrome 瀏覽器，點擊畫面正下方（或右上角）的「分享」圖示。
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <div className="font-bold text-primary mb-0.5 flex items-center gap-1.5">
                        <span>選擇「加入主畫面 (Add to Home Screen)」</span>
                        <PlusSquare size={14} className="text-cyan-400" />
                      </div>
                      <p className="text-secondary leading-relaxed">
                        往下滑動選單，點擊「加入主畫面」後按右上角「新增」，台灣黑熊 APP 圖示即會出現在您的手機桌面！
                      </p>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={15} className="flex-shrink-0" />
                    <span>從桌面點開即為全螢幕原生 APP 模式，並支援 iOS 桌面推播通知！</span>
                  </div>
                </div>
              )}

              {activeTab === "android" && (
                <div className="space-y-3">
                  {deferredPrompt ? (
                    <div className="text-center py-4 space-y-3">
                      <p className="text-secondary">
                        您的瀏覽器支援一鍵直接安裝 OmniTick 原生全螢幕應用程式：
                      </p>
                      <button
                        onClick={handleInstallClick}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Download size={16} />
                        <span>立即一鍵安裝 OmniTick APP</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold flex-shrink-0">
                          1
                        </div>
                        <div>
                          <div className="font-bold text-primary mb-0.5 flex items-center gap-1.5">
                            <span>手機 Chrome：點擊右上角「⋮」選單</span>
                          </div>
                          <p className="text-secondary leading-relaxed">
                            點選選單中的「**安裝應用程式 (Install App)**」或「**加到主畫面**」，即可在手機桌面生成獨立 APP。
                          </p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-bold flex-shrink-0">
                          2
                        </div>
                        <div>
                          <div className="font-bold text-primary mb-0.5 flex items-center gap-1.5">
                            <span>電腦 Chrome / Edge：點擊網址列右側安裝圖示</span>
                            <Monitor size={14} className="text-cyan-400" />
                          </div>
                          <p className="text-secondary leading-relaxed">
                            點擊網址列最右方的「電腦下載圖示」，即可將戰情室固定在 Windows 工作列或 Mac Dock 獨立視窗執行。
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "native" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-amber-500/30 space-y-2">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Layers size={14} />
                      <span>Capacitor 雙平台原生打包架構已內建</span>
                    </div>
                    <p className="text-secondary leading-relaxed">
                      專案已預先配置好 <code className="text-amber-300 font-mono">capacitor.config.ts</code>，可隨時將網站直接打包成 Android <code className="text-primary font-mono">.apk / .aab</code> 與 iOS <code className="text-primary font-mono">Xcode</code> 原生安裝包上架 Google Play 與 App Store：
                    </p>
                    <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
{`# 產生 Android APK / iOS 專案
npx cap add android
npx cap add ios
npx cap sync
npx cap open android`}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-[var(--bg-primary)] border-t border-[var(--border)] flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-accent hover:text-white text-secondary text-xs font-bold transition-colors cursor-pointer"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
