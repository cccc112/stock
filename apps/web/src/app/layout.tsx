import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import BackendStatusBanner from "@/components/layout/BackendStatusBanner";
import WatchlistRadarListener from "@/components/layout/WatchlistRadarListener";
import TaiwanBearMascot from "@/components/ui/TaiwanBearMascot";
import { BeginnerModeProvider } from "@/components/ui/TermTooltip";

export const metadata: Metadata = {
  title: "OmniTick - 奧米全時智投終端 · 證交所直連 0 秒即時撮合",
  description: "直連證交所 0 秒極速撮合、AI 多因子量化模型、ETF 申報持股異動與全球政經即時雷達",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var c = localStorage.getItem('stock_color_preference') || 'red-up';
                document.documentElement.setAttribute('data-color-scheme', c);
                var t = localStorage.getItem('theme_mode') || 'dark';
                document.documentElement.setAttribute('data-theme', t);
              } catch (e) {}
            `,
          }}
        />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>
      <body>
        <BeginnerModeProvider>
          <div className="app-layout">
            <Sidebar />
            <div className="main-content">
              <BackendStatusBanner />
              <TopBar />
              <WatchlistRadarListener />
              <main className="page-content">
                {children}
              </main>
              <footer className="disclaimer">
                免責聲明：本系統僅供模擬與學術討論，非投資建議。
              </footer>
              <TaiwanBearMascot />
            </div>
          </div>
        </BeginnerModeProvider>
      </body>
    </html>
  );
}
