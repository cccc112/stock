import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI 戰情室 | 專業台美股分析",
  description: "專業台美股 AI 戰情室，提供即時報價、量化分析與 AI 診斷",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="zh-TW" className="dark">
      <body className={inter.className}>
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
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
