# 📈 台美股 AI 戰情室 (AI Stock Monitor & Simulator)

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-Neon%20Serverless%20Postgres-00E599?style=flat-square&logo=postgresql)](https://neon.tech/)
[![TradingView](https://img.shields.io/badge/Charts-Lightweight--Charts%20v5-blue?style=flat-square)](https://tradingview.github.io/lightweight-charts/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%203.8%20Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)

> **全方位台美股量化監控、多智能體 AI 投資委員會與交易模擬系統**  
> 結合台灣證券交易所 (TWSE) 即時報價、FinMind 法人籌碼與財報、Yahoo Finance 行情，透過向量化量化引擎（VAP 籌碼密集區、6 大策略回測）與 Google Gemini 3.8 Flash（MarketSenseAI 多角色投資委員會），打造機構級個人交易戰情室。

---

## 📑 目錄

1. [近期重大改動與演進分析](#-近期重大改動與演進分析)
2. [系統架構圖](#-系統架構圖)
3. [技術堆疊與使用工具清單](#-技術堆疊與使用工具清單詳細說明)
   - [前端視覺與互動層 (Frontend)](#1-前端視覺與互動層-appsweb)
   - [後端核心與量化引擎 (Backend & Quant)](#2-後端核心與量化引擎-appsbackend)
   - [行情資料源與外部 API (Data Providers)](#3-行情資料源與外部-api)
   - [AI 智能與多代理人 (AI & Multi-Agent)](#4-ai-智能與多代理人-gemini)
   - [資料庫與基礎設施 (Database & Infra)](#5-資料庫與基礎設施)
4. [核心功能模組說明](#-核心功能模組說明)
5. [資料庫結構 (Neon Schema)](#-資料庫結構-neon-schema)
6. [本機開發與快速啟動](#-本機開發與快速啟動)
7. [環境變數設定指南](#-環境變數設定指南)
8. [免責聲明](#-免責聲明)

---

## 🚀 近期重大改動與演進分析

本專案經歷了架構與可靠性的關鍵升級，從最初的單純報價原型演進為具備容錯降級的機構級個人交易工作站：

| 範疇 | 改動前問題 | 改動後解決方案 | 核心價值 |
|---|---|---|---|
| **資料庫架構** | 原使用 Supabase，建表 SQL 與前後端欄位完全脫節，模擬交易/警報/投資組合從未真正串通。 | **全面遷移至 Neon (Postgres)**，重構自研輕量鏈式 ORM (`app.core.db`)，開機自動執行 DDL 建表與索引優化。 | 零維護成本、啟動即建表、29 項整合測試全數通過。 |
| **報價可靠性** | 依賴單一資料來源，遇收盤後價格歸零、上櫃股 404、Yahoo 假日假 K 棒、限流等問題。 | 打造**統一備援行情層**：台股 `TWSE MIS → Yahoo → FinMind`，美股 `Yahoo → yfinance`，全失敗退回前次快取並標記 `stale=True`。 | 杜絕 404 與破圖，盤後與休市自動適應。 |
| **量化與回測** | 僅有前端簡易技術線圖，缺乏實質回測與多策略模型。 | 引進 **向量化回測引擎 (`BacktestEngine`)** 與 **6 大經典策略**，納入台股手續費折讓、0.3% 證交稅、滑價及風控出場機制。 | 策略客觀可驗證，避免過度擬合與紙上談兵。 |
| **AI 決策體系** | 僅有單一 Prompt 生成簡單文字評語，模型易過期 (404)。 | 導入 **MarketSenseAI 多智能體投資委員會**（巴菲特、西蒙斯、風控長、投資總監），升級至 **Gemini 3.8 Flash**，加入 95s 總時限與故障重試機制。 | 多觀點辯論降低幻覺，數字全由程式預算，AI 僅解讀。 |
| **專業級畫線工具** | 僅依賴 TradingView 預設唯讀顯示，無法自訂分析。 | 自研 **疊加式 SVG 畫線圖層 (`ChartDrawings`)**：趨勢線、射線、水平線、垂直線、斐波那契回撤、矩形；AI 支撐壓力線一鍵轉可編輯線。 | 坐標即時跟隨 K 棒平移縮放，日線與分時分離保存。 |
| **雲端部署體驗** | Render 免費方案休眠導致前端直接噴 502/紅色錯誤橫幅。 | 前端實作 **Axios 自適應退避重試（累計 54 秒覆蓋喚醒期）**，UI 呈現「後端喚醒中」，健康檢查全面輕量化。 | 提供近乎付費伺服器的平滑體驗。 |

---

## 🏗 系統架構圖

```
┌────────────────────────────────────────────────────────────────────────┐
│                        使用者瀏覽器 (Client)                            │
│  - Next.js 16 App Router  - TradingView Lightweight Charts (SVG 圖層)  │
│  - Recharts (財報/回測)   - Axios 喚醒防護與 BYOK 金鑰管理             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / WSS
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Render Cloud (FastAPI 後端)                         │
│                                                                        │
│  [API 路由層]                                                          │
│   ├── /stocks (即時五檔/歷史K線)      ├── /portfolio (庫存/損益試算)   │
│   ├── /research (財報/推薦/產業)     ├── /simulator (模擬交易帳戶)    │
│   ├── /quant (VAP/異常掃描/策略回測)  └── /alerts (智慧價格量能條件)    │
│                                                                        │
│  [核心服務與運算層]                                                     │
│   ├── market_data.py   : 多層 Fallback 統一報價層                       │
│   ├── fundamentals.py  : 財務指標/成長率/估值向量計算                   │
│   ├── screener.py      : 技術+籌碼+營收多因子評分 (Curated/Hot 60)      │
│   ├── backtester.py    : 6 大策略回測 (海龜/Supertrend/DualThrust...)  │
│   └── multi_agent.py   : 4 角色 AI 投資委員會 (MarketSenseAI)          │
└────────┬─────────────────┬───────────────────┬─────────────────────────┘
         │                 │                   │
         ▼                 ▼                   ▼
┌────────────────┐ ┌────────────────┐ ┌──────────────────────────────────┐
│  Neon Postgres │ │  Google Gemini │ │           外部行情與數據源       │
│  (Serverless)  │ │ (3.8 Flash API)│ │                                  │
│ - 自選清單     │ │ - 多角色辯論會 │ ├── TWSE MIS (台股即時五檔)        │
│ - 投資組合損益 │ │ - 財報診斷     │ ├── Yahoo Finance (美股/台股日線)  │
│ - 模擬交易記錄 │ │ - 產業研究     │ ├── FinMind (台股法人籌碼/月營收)  │
│ - 智慧警報條件 │ │ - 推薦理由生成 │ └── yfinance (美股基本面季報)      │
└────────────────┘ └────────────────┘ └──────────────────────────────────┘
```

---

## 🛠 技術堆疊與使用工具清單詳細說明

本專案經過精挑細選的技術搭配，各工具定位與使用場景如下：

### 1. 前端視覺與互動層 (`apps/web`)

| 工具 / 套件 | 版本 | 在本專案中的具體用途 |
|---|---|---|
| **Next.js** | `16.2.12` | 前端應用框架，採用 App Router 架構，負責路由管理、SSR 靜態生成與極速頁面分頁載入。 |
| **React** | `19.2.4` | UI 核心庫，搭配 React 19 Hooks (`useCallback`, `useRef`, `useTransition`) 處理高頻率股票數據渲染。 |
| **TypeScript** | `^5` | 提供前後端資料模型 (DTO) 的嚴格型別定義，避免金融數值計算出現 `undefined` 或 NaN。 |
| **Lightweight Charts** | `^5.2.0` | TradingView 開源金融圖表庫，負責毫秒級渲染 K 線圖、分時走勢、成交量柱狀圖與均線指標。 |
| **自研 SVG 繪圖圖層** | 自行開發 | 疊加在 Lightweight Charts 上的向量繪圖引擎，透過座標轉換演算法將「像素座標」錨定於「價格與時間」，支援**趨勢線、射線、水平線、垂直線、斐波那契回撤、矩形標註**，並可將 AI 算出的支撐壓力線直接轉為手動編輯線。 |
| **Recharts** | `^3.10.1` | 繪製財務報表視覺化（三率趨勢、營收成長率長條圖）、三大法人籌碼淨買賣超走勢圖、回測資金累積曲線 (Equity Curve)。 |
| **Axios** | `^1.19.0` | HTTP 客戶端，實作 **自動攔截器 (Interceptors)**：<br>1. 注入使用者於前端儲存的 BYOK Gemini API Key；<br>2. 處理 Render 後端冷啟動休眠，讀取請求遇 502/503 自動執行階梯式重試（3s, 6s, 10s, 15s, 20s 累計 54s），並派發 `api:waking` 事件通知 UI。 |
| **Lucide React** | `^1.28.0` | 現代化金融 UI 圖示集，提供清晰的買賣信號、漲跌箭頭、工具箱、警報與分析指標圖示。 |
| **Tailwind CSS** | 內建 | 極簡暗色系金融介面樣式系統，專為高密度資訊戰情室調校。 |

---

### 2. 後端核心與量化引擎 (`apps/backend`)

| 工具 / 套件 | 版本 | 在本專案中的具體用途 |
|---|---|---|
| **FastAPI** | `>=0.115.0` | 高效能非同步 Web 框架，提供自動 OpenAPI (Swagger) 文件的 RESTful API，並處理 WebSocket 報價推播。 |
| **Uvicorn** | `>=0.30.0` | 基於 `uvloop` 的極速 ASGI 伺服器，負責驅動 FastAPI。 |
| **Pydantic v2** | `>=2.0.0` | 嚴格的資料驗證與結構模型，包含雙幣別轉換、K 線 Bar、報價物件與回測參數的校驗。 |
| **Pandas & NumPy** | 最新版 | 量化核心計算函式庫：<br>1. 向量化計算技術指標 (MA, EMA, RSI, ATR, Bollinger Bands, MACD)；<br>2. 執行 **VAP (Volume at Price)** 籌碼密集區分佈演算法；<br>3. 執行財務報表損益表/資產負債表的時間軸樞紐分析 (Pivot) 與同比 (YoY)/環比 (QoQ) 計算。 |
| **量化回測引擎** | 自研模組 | 向量化加逐棒 (Bar-by-bar) 模擬引擎，內建**台股手續費 (0.1425% × 折讓) 與 0.3% 證交稅**、滑價模型、停損停利 (ATR Trailing Stop) 與基準對比 (Benchmark Return)。 |
| **psycopg3** | `>=3.2.0` | PostgreSQL 現代非同步與連線池驅動 (`ConnectionPool`)，直接對接 Neon，並封裝成相容 Supabase-py 鏈式呼叫風格的 ORM。 |
| **APScheduler** | `>=3.10.0` | 背景任務排程器，負責後端啟動時快取預熱、定時拉取最新收盤資訊與警報檢查。 |

---

### 3. 行情資料源與外部 API

| 服務 / 套件 | 類型 | 在本專案中的具體用途 |
|---|---|---|
| **TWSE MIS** | 證交所 API | **台股即時第一優先報價源**：取得盤中即時五檔價格、即時累計成交量，自動探測上市公司 (`tse`) 與上櫃公司 (`otc`)。 |
| **Yahoo Finance Chart API** | REST API | **美股主力報價 + 台股歷史日線備援**：支援盤中與收盤價、長週期歷史 K 線；修復了官方 API 週末「假 K 棒」造成價格無故歸零的瑕疵。 |
| **FinMind API** | 金融資料平台 | **台股籌碼與基本面主力來源**：<br>1. 三大法人買賣超（外資、投信、自營商）；<br>2. 每月營收數據；<br>3. 季報損益表與資產負債表；<br>4. 本益比 (PER)、股價淨值比 (PBR)、歷年股利發放記錄；<br>5. 具備 API Key 額度枯竭自我降級保護機制（僅使用技術面指標，不阻斷系統運行）。 |
| **yfinance** | Python 套件 | 美股歷史資料與季報基本面備用爬蟲函式庫。 |

---

### 4. AI 智能與多代理人 (Gemini)

| 技術 / 模型 | 具體實現 | 在本專案中的具體用途 |
|---|---|---|
| **Google GenAI SDK** | `google-genai` | 官方最新版 Google AI SDK，支援結構化 JSON 輸出 (`response_mime_type`)、自適應超時與重試。 |
| **Gemini 3.8 Flash** | 旗艦輕量模型 | 預設 AI 模型。若遭遇 Google 伺服器短暫過載 (503/429)，自動重試並具備 `gemini-flash-latest` 自動別名容錯。 |
| **Multi-Agent 投資委員會** | 論文架構實現 | 借鑑 **Stanford MarketSenseAI** 與 **FinGPT** 架構，由 4 大智慧代理人共同決策：<br>1. **Warren Buffett Agent**：專注商業護城河、資本報酬率、財務穩健度與安全邊際；<br>2. **Jim Simons Agent**：專注價量結構、均線突破、動量趨勢與技術指標；<br>3. **Chief Risk Officer (CRO)**：專注最大回撤、部位暴露、下檔風險防守；<br>4. **Chief Investment Officer (CIO)**：綜合上述視角 arbitration（仲裁），產出最終評級（買進/持有/賣出）與資金配置比例。 |
| **AI 輔助分析模組** | 提示詞工程 | 1. **AI 財報診斷**：指標全部由 Python 先行運算，AI 只負責脈絡解讀，杜絕幻覺；<br>2. **全市場股票推薦理由**；<br>3. **產業鏈上下游研究報告**；<br>4. **模擬交易覆盤教練**。 |
| **BYOK (自帶金鑰模式)** | 資安架構 | 使用者可於設定介面輸入個人 Google AI Studio API Key，存於瀏覽器端，直接透傳後端使用，保障隱私且零平台成本。 |

---

### 5. 資料庫與基礎設施

| 工具 / 服務 | 方案 / 特性 | 在本專案中的具體用途 |
|---|---|---|
| **Neon** | Serverless Postgres | 雲端無伺服器 PostgreSQL（部署於新加坡節點），提供即時自動擴展、分支管理與高連線可用性。 |
| **Render** | Web Service (Free) | 後端 FastAPI 主機，支援 Git Push 自動建置部署與健康度檢查 `/health`。 |
| **Vercel** | Edge Network | 前端 Next.js 託管平台，具備全域 CDN 加速與即時預覽部署。 |
| **GitHub Actions** | CI/CD & Cron | 定時執行健康檢查與 Keepalive Ping，防止免費雲端主機長期休眠。 |
| **LocalTunnel** | 開發輔助 | `start-dev.ps1` 內建工具，本機開發時可將本地 FastAPI (8000 port) 產生臨時外網 HTTPS 網址，直接供線上 Vercel 前端連線偵錯。 |

---

## 💡 核心功能模組說明

### 1. 戰情總覽 (Market Overview)
- 台美大盤指數（加權指數、S&P 500、Nasdaq、費城半導體）實時看板。
- 全市場資金流向、強弱勢板塊與今日熱門族群監控。
- 內建 WebSocket 報價推播引擎。

### 2. 進階 K 線與手動畫線系統
- TradingView 等級專業圖表，支援日線、分時（1分、5分、15分、60分）切換。
- 自研 SVG 圖層支援 6 種常用繪圖工具（趨勢線、水平支撐壓力、斐波那契波段回撤、區間框選等）。
- **AI 支撐壓力線實體化**：AI 分析出的支撐壓力點位，可一鍵轉為畫布上的可拖曳調整線條。

### 3. 量化策略庫與回測沙盒 (`/backtest`)
內建 6 種經過市場驗證的量化交易策略，使用者可自由調整參數並即時獲得完整回測統計：
1. **海龜交易法 (Turtle Trading)**：經典 20 日突破進場、10 日反向出場通道。
2. **SuperTrend 超級趨勢**：結合 ATR 波動度之動態趨勢追蹤。
3. **Dual Thrust 區間突破**：日線開盤區間突破策略。
4. **布林通道 + RSI 均值回歸**：逆勢波段超賣反彈模型。
5. **法人籌碼動能策略**：跟隨外資與投信連續性淨買超。
6. **雙重均線交叉策略**：多週期 MA 濾網交叉模型。
- **回測產出數據**：累積總報酬率、年化報酬率 (CAGR)、最大回撤 (MDD)、勝率、夏普比率 (Sharpe Ratio)、盈虧比 (Profit Factor)、每筆交易明細表。

### 4. 股票推薦與篩選引擎 (`/recommend`)
- 提供 4 種選股策略權重配置：**均衡型 (Balanced)**、**動能型 (Momentum)**、**成長型 (Growth)**、**籌碼型 (Chips)**。
- 支援「**核心產業代表股**」與「**全市場成交值前 60 大熱門股**」兩種股票池。
- 每檔推薦標的附帶量化雷達圖分數（技術面、籌碼面、營收成長面）、進場區間、停損建議與 AI 生成之推薦綜述。

### 5. 財報多維度診斷 (`/stock/[symbol]`)
- 一鍵彙整近 8 季損益表、毛利率/營益率/淨利率三率走勢、月營收 YoY 趨勢。
- 自動評定估值指標：本益比 (PER) 歷史區間位階、股價淨值比 (PBR)、歷年股息殖利率。
- 一鍵呼叫 Gemini 產出「結構化財報診斷報告」，包含獲利體質、成長潛力與下檔風險。

### 6. 投資組合與模擬交易 (`/portfolio` & `/simulator`)
- **實體投資組合**：記錄個人實際買賣、手續費、稅金，自動計算未實現損益、報酬率與資產分佈餅圖。
- **虛擬模擬競賽**：建立獨立虛擬本金帳戶，支援市價/限價模擬下單，並可呼叫 **AI 覆盤教練** 針對歷史交易記錄給予具體交易心理與風控改善建議。

---

## 🗄 資料庫結構 (Neon Schema)

系統內建輕量自動化 DDL 管理，後端啟動時將自動確認資料表與索引完整性：

```sql
-- 1. 自選股清單
CREATE TABLE IF NOT EXISTS watchlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      VARCHAR(20) NOT NULL UNIQUE,
  market      VARCHAR(10) NOT NULL CHECK (market IN ('TW', 'US')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 實體投資組合交易日誌
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      VARCHAR(20) NOT NULL,
  market      VARCHAR(10) NOT NULL CHECK (market IN ('TW', 'US')),
  type        VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL')),
  price       NUMERIC(18,4) NOT NULL,
  shares      NUMERIC(18,4) NOT NULL,
  fee         NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax         NUMERIC(18,2) NOT NULL DEFAULT 0,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 智慧警報條件
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol      VARCHAR(20) NOT NULL,
  condition   TEXT NOT NULL DEFAULT 'VOLUME_ANOMALY',
  value       TEXT,
  message     TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 模擬交易帳戶
CREATE TABLE IF NOT EXISTS sim_portfolios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(100) NOT NULL,
  cash_balance     NUMERIC(18,2) NOT NULL,
  is_ai_auto_trade BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. 模擬交易訂單明細
CREATE TABLE IF NOT EXISTS sim_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES sim_portfolios(id) ON DELETE CASCADE,
  symbol       VARCHAR(20) NOT NULL,
  type         VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL')),
  price        NUMERIC(18,4) NOT NULL,
  shares       NUMERIC(18,4) NOT NULL,
  reason       TEXT,
  "timestamp"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. 全域 AI 快取 (壓低 API 成本)
CREATE TABLE IF NOT EXISTS ai_cache (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(50) NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 💻 本機開發與快速啟動

### 系統需求
- Node.js `>= 18`
- Python `>= 3.11` (建議 3.11 ~ 3.14)
- Git

### 1. 複製專案
```bash
git clone https://github.com/<your-username>/stock.git
cd stock
```

### 2. 後端環境配置
```bash
cd apps/backend
python -m venv venv
# Windows 啟動虛擬環境:
.\venv\Scripts\activate
# Linux/macOS 啟動虛擬環境:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# 請編輯 .env 填入 DATABASE_URL、FINMIND_API_KEY 等
uvicorn app.main:app --reload --port 8000
```

### 3. 前端環境配置
```bash
cd ../../apps/web
npm install
npm run dev
# 前端伺服器將啟動於 http://localhost:3000
```

### 4. 一鍵本機 + 外網穿透腳本 (Windows PowerShell)
專案根目錄提供快捷啟動腳本，會自動啟動後端並透過 LocalTunnel 建立安全連線字串：
```powershell
.\start-dev.ps1
```

---

## ⚙️ 環境變數設定指南

### 後端環境變數 (`apps/backend/.env` 或 Render 儀表板)

| 變數名稱 | 必要性 | 說明 |
|---|---|---|
| `DATABASE_URL` | **必要** | Neon PostgreSQL 連線字串，格式為 `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`。 |
| `FINMIND_API_KEY` | **強烈建議** | FinMind 官方金鑰（至 [finmindtrade.com](https://finmindtrade.com) 免費申請），未設定時籌碼與財報將降級或受頻率限制。 |
| `GEMINI_API_KEY` | 選填 | 伺服器預設的 Google Gemini API Key。若不填，使用者可在前端「設定」頁面輸入個人 Key (BYOK)。 |
| `GEMINI_MODEL` | 選填 | 預設為 `gemini-3.8-flash`。 |

### 前端環境變數 (`apps/web/.env.local` 或 Vercel 儀表板)

| 變數名稱 | 必要性 | 說明 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | **必要** | 指向後端 API 位址，例如 `https://stock-backend-lz9p.onrender.com` 或本機 `http://localhost:8000`。 |

---

## ⚠️ 免責聲明

1. 本專案所有報價資料、技術指標、回測模擬數據、評分篩選及 AI 生成之報告（包括但不限於 Gemini 與多角色投資委員會之論點），**僅供量化研究、學術探討與程式開發學習參考，絕不構成任何實質投資建議、要約或獲利保證**。
2. 金融市場具有高度波動性與資金損失風險，投資人應獨立思考、審慎評估，並自負一切盈虧風險。
3. 系統雖已建立多層資料備援與清洗機制，但第三方資料源（TWSE / Yahoo / FinMind）仍可能因官方連線限制、延遲或維護產生誤差，交易前請務必以券商或官方交易所公布之正式資訊為準。
