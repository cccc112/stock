import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import BackendStatusBanner from "@/components/layout/BackendStatusBanner";
import WatchlistRadarListener from "@/components/layout/WatchlistRadarListener";
import { BeginnerModeProvider } from "@/components/ui/TermTooltip";

export const metadata: Metadata = {
  title: "AI Stock Monitor - 智慧台美股投資系統",
  description: "結合 AI 與量化分析的台美股即時監控戰情室",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <head>
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
            </div>
          </div>
        </BeginnerModeProvider>
      </body>
    </html>
  );
}
