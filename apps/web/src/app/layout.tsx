import type { Metadata } from "next";
import "@/styles/globals.css";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import BackendStatusBanner from "@/components/layout/BackendStatusBanner";

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
      <body>
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
            <BackendStatusBanner />
            <TopBar />
            <main className="page-content">
              {children}
            </main>
            <footer className="disclaimer">
              免責聲明：本系統僅供模擬與學術討論，非投資建議。
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
