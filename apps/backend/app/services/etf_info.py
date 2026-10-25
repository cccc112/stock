"""
ETF 追蹤資訊服務 (ETF Tracking & Profile Service)

針對台美股 ETF（如 0050、0056、00878、00919、00929、00679B、SPY、QQQ、VOO、TLT、SOXX 等），
提供追蹤指數、發行投信、內扣費用率、配息頻率、前十大成分股權重、產業分佈、歷史報酬率與配息紀錄。
"""
import asyncio
import logging
from typing import Any, Dict, List, Optional

from app.services import market_data
from app.services.finmind import finmind_service

logger = logging.getLogger(__name__)

# 熱門台美股 ETF 追蹤規格與前十大成分股資料庫
ETF_PROFILES: Dict[str, Dict[str, Any]] = {
    "0050": {
        "name": "元大台灣50",
        "issuer": "元大投信",
        "category": "市值大盤型",
        "tracking_index": "臺灣50指數 (FTSE TWSE Taiwan 50 Index)",
        "expense_ratio": "0.43%",
        "dividend_freq": "半年配 (1月、7月)",
        "aum": "約 4,380 億 TWD",
        "dividend_yield_est": 2.85,
        "focus_points": [
            "追蹤台股市值最大前 50 家上市企業，與加權指數(^TWII)相關係數達 0.98 以上。",
            "台積電(2330)單一成分股權重超過 54%，需同步關注半導體景氣與外資買賣超動向。",
            "適合長期指數化投資與捕捉大型權值股行情。"
        ],
        "holdings": [
            {"symbol": "2330", "name": "台積電", "weight": 54.8},
            {"symbol": "2317", "name": "鴻海", "weight": 5.2},
            {"symbol": "2454", "name": "聯發科", "weight": 4.3},
            {"symbol": "2382", "name": "廣達", "weight": 1.8},
            {"symbol": "2881", "name": "富邦金", "weight": 1.6},
            {"symbol": "2308", "name": "台達電", "weight": 1.6},
            {"symbol": "2882", "name": "國泰金", "weight": 1.4},
            {"symbol": "2891", "name": "中信金", "weight": 1.3},
            {"symbol": "3711", "name": "日月光投控", "weight": 1.1},
            {"symbol": "2412", "name": "中華電", "weight": 1.0},
        ],
        "sector_weights": [
            {"sector": "半導體業", "weight": 62.5},
            {"sector": "電腦及週邊設備", "weight": 11.4},
            {"sector": "金融保險", "weight": 10.8},
            {"sector": "電子零組件", "weight": 4.9},
            {"sector": "通信網路與其他", "weight": 10.4},
        ],
    },
    "006208": {
        "name": "富邦台50",
        "issuer": "富邦投信",
        "category": "市值大盤型",
        "tracking_index": "臺灣50指數 (FTSE TWSE Taiwan 50 Index)",
        "expense_ratio": "0.24%",
        "dividend_freq": "半年配 (7月、11月)",
        "aum": "約 1,920 億 TWD",
        "dividend_yield_est": 2.90,
        "focus_points": [
            "與 0050 追蹤完全相同的「臺灣50指數」，但經理費(0.15%)與保管費較低，長期內扣成本更具優勢。",
            "台積電(2330)、鴻海(2317)、聯發科(2454)合計佔比逾 64%，反映台股龍頭企業表現。"
        ],
        "holdings": [
            {"symbol": "2330", "name": "台積電", "weight": 54.7},
            {"symbol": "2317", "name": "鴻海", "weight": 5.2},
            {"symbol": "2454", "name": "聯發科", "weight": 4.3},
            {"symbol": "2382", "name": "廣達", "weight": 1.8},
            {"symbol": "2881", "name": "富邦金", "weight": 1.6},
            {"symbol": "2308", "name": "台達電", "weight": 1.6},
            {"symbol": "2882", "name": "國泰金", "weight": 1.4},
            {"symbol": "2891", "name": "中信金", "weight": 1.3},
            {"symbol": "3711", "name": "日月光投控", "weight": 1.1},
            {"symbol": "2412", "name": "中華電", "weight": 1.0},
        ],
        "sector_weights": [
            {"sector": "半導體業", "weight": 62.5},
            {"sector": "電腦及週邊設備", "weight": 11.4},
            {"sector": "金融保險", "weight": 10.8},
            {"sector": "電子零組件", "weight": 4.9},
            {"sector": "其他產業", "weight": 10.4},
        ],
    },
    "0056": {
        "name": "元大高股息",
        "issuer": "元大投信",
        "category": "高股息型",
        "tracking_index": "臺灣高股息指數 (預估未來一年現金股利殖利率最高前50名)",
        "expense_ratio": "0.70%",
        "dividend_freq": "季配息 (1、4、7、10月)",
        "aum": "約 3,650 億 TWD",
        "dividend_yield_est": 7.80,
        "focus_points": [
            "從臺灣50與臺灣中型100指數中，挑選「預測未來一年現金股利殖利率最高」之 50 檔股票。",
            "每年 6 月與 12 月進行成分股定期審核換股，投信換股期間常引發成分股籌碼波動。"
        ],
        "holdings": [
            {"symbol": "2454", "name": "聯發科", "weight": 4.6},
            {"symbol": "2603", "name": "長榮", "weight": 4.4},
            {"symbol": "2303", "name": "聯電", "weight": 4.1},
            {"symbol": "2382", "name": "廣達", "weight": 3.8},
            {"symbol": "2891", "name": "中信金", "weight": 3.6},
            {"symbol": "2886", "name": "兆豐金", "weight": 3.4},
            {"symbol": "2357", "name": "華碩", "weight": 3.3},
            {"symbol": "3034", "name": "聯詠", "weight": 3.1},
            {"symbol": "2890", "name": "永豐金", "weight": 2.9},
            {"symbol": "3231", "name": "緯創", "weight": 2.7},
        ],
        "sector_weights": [
            {"sector": "電腦及週邊設備", "weight": 26.5},
            {"sector": "半導體業", "weight": 23.0},
            {"sector": "金融保險", "weight": 18.5},
            {"sector": "航運與傳產", "weight": 16.0},
            {"sector": "電子通路與其他", "weight": 16.0},
        ],
    },
    "00878": {
        "name": "國泰永續高股息",
        "issuer": "國泰投信",
        "category": "高股息 / ESG 型",
        "tracking_index": "MSCI臺灣ESG永續高股息精選30指數",
        "expense_ratio": "0.42%",
        "dividend_freq": "季配息 (2、5、8、11月)",
        "aum": "約 3,820 億 TWD",
        "dividend_yield_est": 6.95,
        "focus_points": [
            "以過去三年平均年化殖利率與 MSCI ESG 評級篩選 30 檔大型穩健股，金融與電子權重均衡。",
            "波動度通常低於純科技型 ETF，每年 5 月與 11 月進行成分股調整。"
        ],
        "holdings": [
            {"symbol": "2454", "name": "聯發科", "weight": 5.2},
            {"symbol": "2303", "name": "聯電", "weight": 4.9},
            {"symbol": "2891", "name": "中信金", "weight": 4.5},
            {"symbol": "2357", "name": "華碩", "weight": 4.2},
            {"symbol": "3034", "name": "聯詠", "weight": 4.0},
            {"symbol": "2882", "name": "國泰金", "weight": 3.8},
            {"symbol": "2881", "name": "富邦金", "weight": 3.7},
            {"symbol": "2382", "name": "廣達", "weight": 3.5},
            {"symbol": "3711", "name": "日月光投控", "weight": 3.4},
            {"symbol": "2886", "name": "兆豐金", "weight": 3.2},
        ],
        "sector_weights": [
            {"sector": "電腦及週邊設備", "weight": 28.0},
            {"sector": "金融保險", "weight": 26.5},
            {"sector": "半導體業", "weight": 24.0},
            {"sector": "通信網路與其他", "weight": 21.5},
        ],
    },
    "00919": {
        "name": "群益台灣精選高息",
        "issuer": "群益投信",
        "category": "高股息型",
        "tracking_index": "臺灣指數公司特選臺灣上市上櫃精選高息指數",
        "expense_ratio": "0.52%",
        "dividend_freq": "季配息 (3、6、9、12月)",
        "aum": "約 2,950 億 TWD",
        "dividend_yield_est": 8.90,
        "focus_points": [
            "每年 5 月依「已宣告現金股利」精準卡位高息股，12 月依「前三季 EPS 成長率」預選隔年潛力高息股。",
            "航運、半導體與金融股佔比較高，需留意除權息旺季後之填息動能。"
        ],
        "holdings": [
            {"symbol": "2603", "name": "長榮", "weight": 9.8},
            {"symbol": "2303", "name": "聯電", "weight": 9.2},
            {"symbol": "3034", "name": "聯詠", "weight": 8.5},
            {"symbol": "2454", "name": "聯發科", "weight": 8.1},
            {"symbol": "2891", "name": "中信金", "weight": 6.4},
            {"symbol": "2609", "name": "陽明", "weight": 4.5},
            {"symbol": "5347", "name": "世界", "weight": 4.1},
            {"symbol": "6239", "name": "力成", "weight": 3.8},
            {"symbol": "2404", "name": "漢唐", "weight": 3.4},
            {"symbol": "6176", "name": "瑞儀", "weight": 3.1},
        ],
        "sector_weights": [
            {"sector": "半導體業", "weight": 42.0},
            {"sector": "航運業", "weight": 18.5},
            {"sector": "金融保險", "weight": 14.0},
            {"sector": "電子零組件與其他", "weight": 25.5},
        ],
    },
    "00929": {
        "name": "復華台灣科技優息",
        "issuer": "復華投信",
        "category": "科技高股息 (月配型)",
        "tracking_index": "特選臺灣科技優息指數",
        "expense_ratio": "0.41%",
        "dividend_freq": "月配息",
        "aum": "約 2,480 億 TWD",
        "dividend_yield_est": 6.80,
        "focus_points": [
            "100% 聚焦台灣上市櫃電子科技股，結合 ROE、股息變異性與本益比篩選 40 檔成分股。",
            "每年 6 月定審換股，受台灣電子產業庫存週期與消費性電子需求影響較大。"
        ],
        "holdings": [
            {"symbol": "2303", "name": "聯電", "weight": 8.6},
            {"symbol": "3034", "name": "聯詠", "weight": 7.8},
            {"symbol": "2454", "name": "聯發科", "weight": 7.4},
            {"symbol": "3711", "name": "日月光投控", "weight": 6.9},
            {"symbol": "4938", "name": "和碩", "weight": 6.2},
            {"symbol": "2385", "name": "群光", "weight": 5.1},
            {"symbol": "6239", "name": "力成", "weight": 4.8},
            {"symbol": "3702", "name": "大聯大", "weight": 4.5},
            {"symbol": "5347", "name": "世界", "weight": 4.2},
            {"symbol": "2347", "name": "聯強", "weight": 3.9},
        ],
        "sector_weights": [
            {"sector": "半導體業", "weight": 48.5},
            {"sector": "電子通路業", "weight": 16.0},
            {"sector": "電腦及週邊設備", "weight": 15.5},
            {"sector": "電子零組件與其他", "weight": 20.0},
        ],
    },
    "00881": {
        "name": "國泰台灣5G+",
        "issuer": "國泰投信",
        "category": "科技主題型",
        "tracking_index": "臺灣5G+通訊指數",
        "expense_ratio": "0.49%",
        "dividend_freq": "半年配 (1月、8月)",
        "aum": "約 620 億 TWD",
        "dividend_yield_est": 4.20,
        "focus_points": [
            "涵蓋台灣 AI 伺服器、半導體、5G 通訊供應鏈龍頭，前三大成分股為台積電、鴻海、聯發科。",
            "波動度與成長性高於市值型 ETF，適合看多台灣 AI 硬體與半導體趨勢者。"
        ],
        "holdings": [
            {"symbol": "2330", "name": "台積電", "weight": 32.5},
            {"symbol": "2317", "name": "鴻海", "weight": 13.8},
            {"symbol": "2454", "name": "聯發科", "weight": 11.4},
            {"symbol": "2382", "name": "廣達", "weight": 5.6},
            {"symbol": "2308", "name": "台達電", "weight": 4.8},
            {"symbol": "2303", "name": "聯電", "weight": 4.1},
            {"symbol": "3231", "name": "緯創", "weight": 3.5},
            {"symbol": "2345", "name": "智邦", "weight": 3.2},
        ],
        "sector_weights": [
            {"sector": "半導體業", "weight": 54.0},
            {"sector": "電腦及AI伺服器", "weight": 26.0},
            {"sector": "網通與電子零組件", "weight": 20.0},
        ],
    },
    "00679B": {
        "name": "元大美債20年",
        "issuer": "元大投信",
        "category": "長天期美國公債 ETF",
        "tracking_index": "ICE 美國政府 20+ 年期債券指數",
        "expense_ratio": "0.18%",
        "dividend_freq": "季配息 (2、5、8、11月)",
        "aum": "約 3,100 億 TWD",
        "dividend_yield_est": 4.35,
        "focus_points": [
            "存續期間(Duration)約 16～17 年，對美國長天期公債殖利率(^TNX / ^TYX)極度敏感：殖利率每降 1%，價格理論上漲約 16%。",
            "以台幣計價但持有美元資產，除聯準會利率政策外，需同步追蹤美元兌台幣匯率(TWD=X)與折溢價幅度。"
        ],
        "holdings": [
            {"symbol": "^TYX", "name": "美國30年期政府公債組合 (2044-2054到期)", "weight": 99.2},
            {"symbol": "TWD=X", "name": "美元流動性部位與應收利息", "weight": 0.8},
        ],
        "sector_weights": [
            {"sector": "美國財政部 20 年以上主權公債 (AAA/AA+)", "weight": 99.2},
            {"sector": "現金與約當現金", "weight": 0.8},
        ],
    },
    "00687B": {
        "name": "國泰20年美債",
        "issuer": "國泰投信",
        "category": "長天期美國公債 ETF",
        "tracking_index": "彭博 20 年期以上美國公債指數",
        "expense_ratio": "0.18%",
        "dividend_freq": "季配息 (3、6、9、12月)",
        "aum": "約 2,650 億 TWD",
        "dividend_yield_est": 4.35,
        "focus_points": [
            "存續期間約 16.5 年，直接反映美國 20～30 年期公債殖利率走勢。",
            "觀察重點：美國 CPI 通膨數據、Fed 點陣圖、10年期美債殖利率(^TNX)及美元兌台幣(TWD=X)匯率。"
        ],
        "holdings": [
            {"symbol": "^TYX", "name": "美國財政部 20+ 年期公債組合", "weight": 99.4},
            {"symbol": "TWD=X", "name": "美元現金部位", "weight": 0.6},
        ],
        "sector_weights": [
            {"sector": "美國政府長天期公債", "weight": 99.4},
            {"sector": "美元流動資產", "weight": 0.6},
        ],
    },
    "SPY": {
        "name": "SPDR S&P 500 ETF Trust",
        "issuer": "State Street Global Advisors",
        "category": "美股市值大盤型",
        "tracking_index": "S&P 500 Index (標準普爾500指數)",
        "expense_ratio": "0.09%",
        "dividend_freq": "季配息 (3、6、9、12月)",
        "aum": "$615B USD",
        "dividend_yield_est": 1.25,
        "focus_points": [
            "全球流動性最高的美股大盤 ETF，涵蓋美國市值前 500 大上市企業。",
            "美股科技七巨頭(Magnificent 7)合計權重約 31%，AI 資本支出與美股財報季為核心驅動因子。"
        ],
        "holdings": [
            {"symbol": "AAPL", "name": "Apple Inc.", "weight": 7.1},
            {"symbol": "NVDA", "name": "NVIDIA Corp.", "weight": 6.8},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "weight": 6.5},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "weight": 3.8},
            {"symbol": "META", "name": "Meta Platforms", "weight": 2.6},
            {"symbol": "GOOGL", "name": "Alphabet Inc.", "weight": 2.1},
            {"symbol": "BRK-B", "name": "Berkshire Hathaway", "weight": 1.7},
            {"symbol": "AVGO", "name": "Broadcom Inc.", "weight": 1.6},
            {"symbol": "TSLA", "name": "Tesla Inc.", "weight": 1.5},
            {"symbol": "LLY", "name": "Eli Lilly & Co.", "weight": 1.4},
        ],
        "sector_weights": [
            {"sector": "Information Technology (科技)", "weight": 31.8},
            {"sector": "Financials (金融)", "weight": 13.4},
            {"sector": "Health Care (醫療保健)", "weight": 11.2},
            {"sector": "Consumer Discretionary (非必需消費)", "weight": 10.5},
            {"sector": "Communication Services & Others", "weight": 33.1},
        ],
    },
    "VOO": {
        "name": "Vanguard S&P 500 ETF",
        "issuer": "Vanguard (先鋒集團)",
        "category": "美股市值大盤型",
        "tracking_index": "S&P 500 Index (標準普爾500指數)",
        "expense_ratio": "0.03%",
        "dividend_freq": "季配息",
        "aum": "$540B USD",
        "dividend_yield_est": 1.28,
        "focus_points": [
            "與 SPY 追蹤相同 S&P 500 指數，但內扣費用率僅 0.03%，適合中長期持有。",
            "前十大持股集中於 AI、雲端運算與大型金融醫療龍頭。"
        ],
        "holdings": [
            {"symbol": "AAPL", "name": "Apple Inc.", "weight": 7.1},
            {"symbol": "NVDA", "name": "NVIDIA Corp.", "weight": 6.8},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "weight": 6.5},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "weight": 3.8},
            {"symbol": "META", "name": "Meta Platforms", "weight": 2.6},
            {"symbol": "GOOGL", "name": "Alphabet Inc.", "weight": 2.1},
            {"symbol": "BRK-B", "name": "Berkshire Hathaway", "weight": 1.7},
            {"symbol": "AVGO", "name": "Broadcom Inc.", "weight": 1.6},
            {"symbol": "TSLA", "name": "Tesla Inc.", "weight": 1.5},
            {"symbol": "LLY", "name": "Eli Lilly & Co.", "weight": 1.4},
        ],
        "sector_weights": [
            {"sector": "Information Technology (科技)", "weight": 31.8},
            {"sector": "Financials (金融)", "weight": 13.4},
            {"sector": "Health Care (醫療保健)", "weight": 11.2},
            {"sector": "Consumer & Others", "weight": 43.6},
        ],
    },
    "QQQ": {
        "name": "Invesco QQQ Trust",
        "issuer": "Invesco (景順)",
        "category": "美股科技成長型",
        "tracking_index": "Nasdaq-100 Index (那斯達克100指數)",
        "expense_ratio": "0.20%",
        "dividend_freq": "季配息",
        "aum": "$310B USD",
        "dividend_yield_est": 0.60,
        "focus_points": [
            "追蹤那斯達克市值前 100 大非金融企業，重倉 AI、半導體、雲端軟體與消費科技巨頭。",
            "對美債殖利率(^TNX)與科技巨頭資本支出指引高度敏感。"
        ],
        "holdings": [
            {"symbol": "AAPL", "name": "Apple Inc.", "weight": 8.9},
            {"symbol": "NVDA", "name": "NVIDIA Corp.", "weight": 8.4},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "weight": 8.1},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "weight": 5.3},
            {"symbol": "AVGO", "name": "Broadcom Inc.", "weight": 5.1},
            {"symbol": "META", "name": "Meta Platforms", "weight": 4.9},
            {"symbol": "TSLA", "name": "Tesla Inc.", "weight": 3.2},
            {"symbol": "COST", "name": "Costco Wholesale", "weight": 2.7},
            {"symbol": "GOOGL", "name": "Alphabet Inc.", "weight": 2.6},
            {"symbol": "NFLX", "name": "Netflix Inc.", "weight": 2.2},
        ],
        "sector_weights": [
            {"sector": "Technology (科技與半導體)", "weight": 59.5},
            {"sector": "Communication Services (通訊服務)", "weight": 15.8},
            {"sector": "Consumer Discretionary (消費科技)", "weight": 13.2},
            {"sector": "Healthcare & Staples", "weight": 11.5},
        ],
    },
    "SOXX": {
        "name": "iShares Semiconductor ETF",
        "issuer": "BlackRock iShares",
        "category": "半導體產業型",
        "tracking_index": "NYSE Semiconductor Index",
        "expense_ratio": "0.35%",
        "dividend_freq": "季配息",
        "aum": "$15.8B USD",
        "dividend_yield_est": 0.72,
        "focus_points": [
            "聚焦美國掛牌之 30 大半導體設計、設備與晶圓代工龍頭，與費城半導體指數(^SOX)及台積電(2330)高度連動。"
        ],
        "holdings": [
            {"symbol": "NVDA", "name": "NVIDIA Corp.", "weight": 9.8},
            {"symbol": "AVGO", "name": "Broadcom Inc.", "weight": 8.9},
            {"symbol": "AMD", "name": "Advanced Micro Devices", "weight": 7.6},
            {"symbol": "QCOM", "name": "Qualcomm Inc.", "weight": 6.4},
            {"symbol": "TXN", "name": "Texas Instruments", "weight": 6.1},
            {"symbol": "AMAT", "name": "Applied Materials", "weight": 4.8},
            {"symbol": "TSM", "name": "Taiwan Semiconductor (ADR)", "weight": 4.4},
            {"symbol": "LRCX", "name": "Lam Research", "weight": 4.2},
            {"symbol": "MU", "name": "Micron Technology", "weight": 4.0},
            {"symbol": "KLAC", "name": "KLA Corp.", "weight": 3.9},
        ],
        "sector_weights": [
            {"sector": "IC 設計與 AI 晶片", "weight": 52.0},
            {"sector": "半導體設備 (SPE)", "weight": 24.5},
            {"sector": "晶圓代工與記憶體", "weight": 23.5},
        ],
    },
    "TLT": {
        "name": "iShares 20+ Year Treasury Bond ETF",
        "issuer": "BlackRock iShares",
        "category": "長天期美國公債 ETF",
        "tracking_index": "ICE U.S. Treasury 20+ Year Bond Index",
        "expense_ratio": "0.15%",
        "dividend_freq": "月配息",
        "aum": "$58B USD",
        "dividend_yield_est": 4.40,
        "focus_points": [
            "全球規模最大之 20 年期以上美國公債 ETF，每月月初除息，存續期間約 16.5 年。",
            "價格與美國 10 年/30 年期公債殖利率(^TNX / ^TYX)呈反向變動。"
        ],
        "holdings": [
            {"symbol": "^TYX", "name": "U.S. Treasury Bonds (20+ Years Maturity)", "weight": 99.5},
        ],
        "sector_weights": [
            {"sector": "U.S. Treasury (美國主權公債)", "weight": 99.5},
            {"sector": "Cash", "weight": 0.5},
        ],
    },
    "00940": {
        "name": "元大台灣價值高息",
        "issuer": "元大投信",
        "category": "價值高股息 (月配型)",
        "tracking_index": "臺灣價值高息指數",
        "expense_ratio": "0.41%",
        "dividend_freq": "月配息",
        "aum": "約 1,560 億 TWD",
        "dividend_yield_est": 5.80,
        "focus_points": [
            "導入巴菲特價值投資指標（自由現金流量收益率、ROE、本益比）篩選 50 檔低估值高息股。",
            "單一成分股權重上限 8%，產業分佈涵蓋航運、金融、半導體與電子通路。"
        ],
        "holdings": [
            {"symbol": "2603", "name": "長榮", "weight": 8.1},
            {"symbol": "2303", "name": "聯電", "weight": 5.4},
            {"symbol": "2891", "name": "中信金", "weight": 5.1},
            {"symbol": "2357", "name": "華碩", "weight": 4.8},
            {"symbol": "3034", "name": "聯詠", "weight": 4.3},
            {"symbol": "4938", "name": "和碩", "weight": 3.9},
            {"symbol": "2618", "name": "長榮航", "weight": 3.7},
            {"symbol": "3711", "name": "日月光投控", "weight": 3.5},
        ],
        "sector_weights": [
            {"sector": "半導體業", "weight": 29.0},
            {"sector": "航運業", "weight": 18.0},
            {"sector": "電腦及週邊設備", "weight": 17.5},
            {"sector": "金融與電子通路", "weight": 35.5},
        ],
    },
    "00939": {
        "name": "統一台灣高息動能",
        "issuer": "統一投信",
        "category": "動能高股息 (月配型)",
        "tracking_index": "特選臺灣高息動能指數",
        "expense_ratio": "0.41%",
        "dividend_freq": "月配息",
        "aum": "約 520 億 TWD",
        "dividend_yield_est": 6.10,
        "focus_points": [
            "每年 5 月依股利率選股，9 月與 1 月利用夏普值動態加減碼強勢動能股。"
        ],
        "holdings": [
            {"symbol": "2454", "name": "聯發科", "weight": 7.5},
            {"symbol": "2412", "name": "中華電", "weight": 6.8},
            {"symbol": "2891", "name": "中信金", "weight": 6.2},
            {"symbol": "2303", "name": "聯電", "weight": 5.9},
            {"symbol": "3045", "name": "台灣大", "weight": 5.4},
            {"symbol": "2603", "name": "長榮", "weight": 5.1},
        ],
        "sector_weights": [
            {"sector": "半導體業", "weight": 34.0},
            {"sector": "通信網路業", "weight": 18.5},
            {"sector": "電腦及週邊設備", "weight": 17.0},
            {"sector": "金融與航運", "weight": 30.5},
        ],
    },
    "00713": {
        "name": "元大台灣高息低波",
        "issuer": "元大投信",
        "category": "高息低波動型",
        "tracking_index": "臺灣指數公司特選高股息低波動指數",
        "expense_ratio": "0.48%",
        "dividend_freq": "季配息 (3、6、9、12月)",
        "aum": "約 1,180 億 TWD",
        "dividend_yield_est": 7.40,
        "focus_points": [
            "透過最小變異數演算法控制投資組合整體波動度，回撤控制能力優異。"
        ],
        "holdings": [
            {"symbol": "2412", "name": "中華電", "weight": 7.2},
            {"symbol": "1216", "name": "統一", "weight": 6.8},
            {"symbol": "3045", "name": "台灣大", "weight": 6.1},
            {"symbol": "2891", "name": "中信金", "weight": 5.4},
            {"symbol": "2303", "name": "聯電", "weight": 4.8},
        ],
        "sector_weights": [
            {"sector": "通信網路與民生消費", "weight": 31.0},
            {"sector": "金融保險", "weight": 24.5},
            {"sector": "電腦及電子通路", "weight": 23.5},
            {"sector": "半導體與其他", "weight": 21.0},
        ],
    },
    "00692": {
        "name": "富邦公司治理",
        "issuer": "富邦投信",
        "category": "市值 / ESG 公司治理型",
        "tracking_index": "臺灣公司治理100指數",
        "expense_ratio": "0.24%",
        "dividend_freq": "半年配 (7月、11月)",
        "aum": "約 340 億 TWD",
        "dividend_yield_est": 3.80,
        "focus_points": [
            "以公司治理評鑑前 20% 加上 ROE、營收成長篩選 100 檔成分股。"
        ],
        "holdings": [
            {"symbol": "2330", "name": "台積電", "weight": 43.2},
            {"symbol": "2454", "name": "聯發科", "weight": 4.8},
            {"symbol": "2881", "name": "富邦金", "weight": 3.1},
            {"symbol": "2308", "name": "台達電", "weight": 2.7},
            {"symbol": "2882", "name": "國泰金", "weight": 2.5},
        ],
        "sector_weights": [
            {"sector": "半導體業", "weight": 52.0},
            {"sector": "金融保險", "weight": 18.5},
            {"sector": "電腦及週邊設備", "weight": 14.0},
            {"sector": "電子零組件與其他", "weight": 15.5},
        ],
    },
    "00891": {
        "name": "中信關鍵半導體",
        "issuer": "中國信託投信",
        "category": "半導體產業型",
        "tracking_index": "ICE FactSet 臺灣ESG永續關鍵半導體指數",
        "expense_ratio": "0.49%",
        "dividend_freq": "季配息 (2、5、8、11月)",
        "aum": "約 210 億 TWD",
        "dividend_yield_est": 5.10,
        "focus_points": [
            "純度 100% 台灣半導體上中下游（IC設計、晶圓代工、封測）。"
        ],
        "holdings": [
            {"symbol": "2454", "name": "聯發科", "weight": 20.4},
            {"symbol": "2330", "name": "台積電", "weight": 19.8},
            {"symbol": "2303", "name": "聯電", "weight": 8.5},
            {"symbol": "3711", "name": "日月光投控", "weight": 8.1},
            {"symbol": "3034", "name": "聯詠", "weight": 6.2},
        ],
        "sector_weights": [
            {"sector": "IC 設計", "weight": 46.0},
            {"sector": "晶圓代工", "weight": 34.0},
            {"sector": "半導體封測與材料", "weight": 20.0},
        ],
    },
    "00830": {
        "name": "國泰費城半導體",
        "issuer": "國泰投信",
        "category": "海外半導體產業型",
        "tracking_index": "美國費城半導體指數 (PHLX Semiconductor Sector Index)",
        "expense_ratio": "0.55%",
        "dividend_freq": "年配息 (1月)",
        "aum": "約 315 億 TWD",
        "dividend_yield_est": 1.50,
        "focus_points": [
            "直接追蹤美國費城半導體指數(^SOX)，涵蓋 NVIDIA、Broadcom、AMD、ASML 與台積電 ADR。"
        ],
        "holdings": [
            {"symbol": "NVDA", "name": "NVIDIA Corp.", "weight": 12.4},
            {"symbol": "AVGO", "name": "Broadcom Inc.", "weight": 10.8},
            {"symbol": "AMD", "name": "Advanced Micro Devices", "weight": 8.2},
            {"symbol": "TSM", "name": "Taiwan Semiconductor (ADR)", "weight": 7.6},
            {"symbol": "ASML", "name": "ASML Holding", "weight": 6.5},
        ],
        "sector_weights": [
            {"sector": "AI 與 IC 設計巨頭", "weight": 54.0},
            {"sector": "先進半導體設備", "weight": 26.0},
            {"sector": "晶圓代工與記憶體", "weight": 20.0},
        ],
    },
    "00757": {
        "name": "統一FANG+",
        "issuer": "統一投信",
        "category": "海外美股尖牙科技巨頭 ETF",
        "tracking_index": "NYSE FANG+ Index (洲際交易所 FANG+ 指數)",
        "expense_ratio": "1.03%",
        "dividend_freq": "不配息（資本利得與股息100%滾入淨值複利）",
        "aum": "約 420 億 TWD",
        "dividend_yield_est": None,
        "focus_points": [
            "採平均等權重（每檔約 10%）集中投資美股 10 大 AI、雲端、串流與資安科技巨頭，完全不配息。"
        ],
        "holdings": [
            {"symbol": "NVDA", "name": "NVIDIA Corp.", "weight": 10.6},
            {"symbol": "META", "name": "Meta Platforms", "weight": 10.4},
            {"symbol": "AVGO", "name": "Broadcom Inc.", "weight": 10.3},
            {"symbol": "AAPL", "name": "Apple Inc.", "weight": 10.1},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "weight": 10.0},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "weight": 9.9},
            {"symbol": "GOOGL", "name": "Alphabet Inc.", "weight": 9.8},
            {"symbol": "NFLX", "name": "Netflix Inc.", "weight": 9.7},
            {"symbol": "NOW", "name": "ServiceNow Inc.", "weight": 9.6},
            {"symbol": "CRWD", "name": "CrowdStrike Holdings", "weight": 9.6},
        ],
        "sector_weights": [
            {"sector": "美股七巨頭 (AI 雲端與消費科技)", "weight": 60.5},
            {"sector": "AI 算力晶片 (NVIDIA / Broadcom)", "weight": 20.9},
            {"sector": "SaaS 企業軟體與 AI 資安", "weight": 18.6},
        ],
    },
    "00662": {
        "name": "富邦NASDAQ",
        "issuer": "富邦投信",
        "category": "海外美股科技指數 ETF",
        "tracking_index": "Nasdaq-100 Index (美國那斯達克100指數)",
        "expense_ratio": "0.49%",
        "dividend_freq": "不配息（收益滾入淨值）",
        "aum": "約 260 億 TWD",
        "dividend_yield_est": None,
        "focus_points": [
            "台股版 QQQ，直接追蹤美國 Nasdaq-100 指數，且不配息免除海外所得稅與二代健保補充保費。"
        ],
        "holdings": [
            {"symbol": "AAPL", "name": "Apple Inc.", "weight": 8.9},
            {"symbol": "NVDA", "name": "NVIDIA Corp.", "weight": 8.4},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "weight": 8.1},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "weight": 5.3},
            {"symbol": "AVGO", "name": "Broadcom Inc.", "weight": 5.1},
            {"symbol": "META", "name": "Meta Platforms", "weight": 4.9},
        ],
        "sector_weights": [
            {"sector": "Technology (美國科技與半導體)", "weight": 59.5},
            {"sector": "Communication Services", "weight": 15.8},
            {"sector": "Consumer Discretionary & Others", "weight": 24.7},
        ],
    },
    "00646": {
        "name": "元大S&P500",
        "issuer": "元大投信",
        "category": "海外美股大盤指數 ETF",
        "tracking_index": "S&P 500 Index (標準普爾500指數)",
        "expense_ratio": "0.46%",
        "dividend_freq": "不配息（收益滾入淨值）",
        "aum": "約 280 億 TWD",
        "dividend_yield_est": None,
        "focus_points": [
            "台股版 SPY / VOO，直接用台幣帳戶投資美國標普 500 大企業，且不配息自動再投資。"
        ],
        "holdings": [
            {"symbol": "AAPL", "name": "Apple Inc.", "weight": 7.1},
            {"symbol": "NVDA", "name": "NVIDIA Corp.", "weight": 6.8},
            {"symbol": "MSFT", "name": "Microsoft Corp.", "weight": 6.5},
            {"symbol": "AMZN", "name": "Amazon.com Inc.", "weight": 3.8},
            {"symbol": "META", "name": "Meta Platforms", "weight": 2.6},
        ],
        "sector_weights": [
            {"sector": "Information Technology (科技)", "weight": 31.8},
            {"sector": "Financials & Healthcare", "weight": 24.6},
            {"sector": "Consumer & Industrials", "weight": 43.6},
        ],
    },
    "00631L": {
        "name": "元大台灣50正2",
        "issuer": "元大投信",
        "category": "2倍槓桿型台股期貨 ETF",
        "tracking_index": "臺灣50指數單日正向 2 倍報酬",
        "expense_ratio": "1.04%",
        "dividend_freq": "不配息（期貨轉倉收益直接滾入淨值）",
        "aum": "約 260 億 TWD",
        "dividend_yield_est": None,
        "focus_points": [
            "透過台指期與臺灣50期貨合約提供單日正向 2 倍曝險（非直接持有現股），不配息。"
        ],
        "holdings": [
            {"symbol": "^TWII", "name": "臺股期貨 (TX) 與臺灣50期貨近月多頭契約 (約 200% 曝險)", "weight": 100.0},
        ],
        "sector_weights": [
            {"sector": "台指期貨多頭部位 (200% 曝險) 與保證金", "weight": 100.0},
        ],
    },
    "00632R": {
        "name": "元大台灣50反1",
        "issuer": "元大投信",
        "category": "1倍反向避險型期貨 ETF",
        "tracking_index": "臺灣50指數單日反向 1 倍報酬",
        "expense_ratio": "1.04%",
        "dividend_freq": "不配息（反向期貨避險工具）",
        "aum": "約 350 億 TWD",
        "dividend_yield_est": None,
        "focus_points": [
            "透過放空台指期貨達成單日反向 1 倍報酬，不配息，僅適合短期大盤避險。"
        ],
        "holdings": [
            {"symbol": "^TWII", "name": "臺股期貨 (TX) 空頭避險部位 (-100% 曝險)", "weight": 100.0},
        ],
        "sector_weights": [
            {"sector": "台指期貨反向空頭部位 (-100%) 與保證金", "weight": 100.0},
        ],
    },
    "00937B": {
        "name": "群益ESG投等債20+",
        "issuer": "群益投信",
        "category": "月配長天期投資等級公司債 ETF",
        "tracking_index": "ICE ESG 20年期以上BBB級成熟市場大型美元公司債指數",
        "expense_ratio": "0.26%",
        "dividend_freq": "月配息",
        "aum": "約 2,400 億 TWD",
        "dividend_yield_est": 6.10,
        "focus_points": [
            "台股規模最大的月配息 BBB 級投資等級公司債 ETF，鎖定票面利率 > 4.5% 之 20 年以上大型企業債。"
        ],
        "holdings": [
            {"symbol": "LQD", "name": "美國與成熟市場 BBB 級大型企業長天期公司債組合", "weight": 98.8},
        ],
        "sector_weights": [
            {"sector": "BBB 級跨國大型企業長債", "weight": 98.8},
            {"sector": "美元流動準備金", "weight": 1.2},
        ],
    },
}


def infer_tw_issuer(name: str) -> str:
    issuer_map = [
        ("元大", "元大投信"),
        ("國泰", "國泰投信"),
        ("富邦", "富邦投信"),
        ("群益", "群益投信"),
        ("復華", "復華投信"),
        ("中信", "中國信託投信"),
        ("統一", "統一投信"),
        ("台新", "台新投信"),
        ("凱基", "凱基投信"),
        ("大華", "大華銀投信"),
        ("野村", "野村投信"),
        ("兆豐", "兆豐投信"),
        ("永豐", "永豐投信"),
        ("FT", "富蘭克林華美投信"),
        ("新光", "新光投信"),
        ("街口", "街口投信"),
    ]
    for prefix, issuer in issuer_map:
        if prefix in name:
            return issuer
    return "台灣投信發行"


def is_etf_or_multi_asset(symbol: str) -> str:
    """回傳 'ETF' | 'ASSET' | 'STOCK'"""
    s = symbol.strip().upper()
    code, kind, _ = market_data.split_symbol(s)
    if code in ETF_PROFILES or s in ETF_PROFILES:
        return "ETF"
    if kind == "TW" and code.startswith("00"):
        return "ETF"
    if s in market_data.GLOBAL_ASSET_MAP:
        ind = market_data.GLOBAL_ASSET_MAP[s].get("industry", "")
        if "ETF" in ind:
            return "ETF"
        return "ASSET"
    if s in (
        "DIA", "IWM", "VYM", "SCHD", "JEPI", "JEPQ", "XLK", "XLF", "XLE", "XLV",
        "SOXX", "SMH", "ARKK", "TLT", "BND", "IEF", "SHY", "LQD", "HYG",
        "GLD", "SLV", "USO", "DBA", "IBIT", "FBTC", "ETHA", "VNQ", "IVV"
    ):
        return "ETF"
    return "STOCK"


async def build_etf_report(symbol: str) -> Dict[str, Any]:
    """整合 ETF / 跨資產標的追蹤資訊、真實歷史績效、波動度與配息紀錄"""
    symbol = await market_data.resolve_symbol_query(symbol)
    code, kind, _ = market_data.split_symbol(symbol)
    lookup_key = code if code in ETF_PROFILES else symbol.upper()
    profile = ETF_PROFILES.get(lookup_key, {})

    quote = await market_data.get_quote(symbol)
    bars = await market_data.get_history(symbol, "1y", "1d")

    name = profile.get("name") or (quote.name if quote else symbol)
    asset_info = market_data.GLOBAL_ASSET_MAP.get(symbol.upper(), {})
    asset_kind = is_etf_or_multi_asset(symbol)

    # 計算 1M / 3M / 6M / 1Y 報酬率、52週高低點、年化波動率、最大回撤、20MA乖離
    perf: Dict[str, Any] = {
        "ret_1m": None,
        "ret_3m": None,
        "ret_6m": None,
        "ret_1y": None,
        "high_52w": None,
        "low_52w": None,
        "volatility_annual": None,
        "max_drawdown_1y": None,
        "bias_20ma": None,
    }
    if bars and len(bars) >= 5:
        closes = [b.close for b in bars if b.close > 0]
        highs = [b.high for b in bars if b.high > 0]
        lows = [b.low for b in bars if b.low > 0]
        last = closes[-1]
        def ret_at(days: int) -> Optional[float]:
            if len(closes) > days and closes[-1 - days] > 0:
                return round((last - closes[-1 - days]) / closes[-1 - days] * 100, 2)
            return None

        perf["ret_1m"] = ret_at(min(21, len(closes) - 1))
        perf["ret_3m"] = ret_at(min(63, len(closes) - 1)) if len(closes) > 25 else None
        perf["ret_6m"] = ret_at(min(126, len(closes) - 1)) if len(closes) > 65 else None
        perf["ret_1y"] = ret_at(len(closes) - 1) if len(closes) > 130 else None
        perf["high_52w"] = round(max(highs), 2) if highs else None
        perf["low_52w"] = round(min(lows), 2) if lows else None

        if len(closes) >= 20:
            ma20 = sum(closes[-20:]) / 20
            perf["bias_20ma"] = round((last - ma20) / ma20 * 100, 2)

        # 年化波動率 & 最大回撤
        import math
        rets = [(closes[i] - closes[i - 1]) / closes[i - 1] for i in range(1, len(closes)) if closes[i - 1] > 0]
        if len(rets) > 10:
            mean_r = sum(rets) / len(rets)
            var_r = sum((r - mean_r) ** 2 for r in rets) / (len(rets) - 1)
            perf["volatility_annual"] = round(math.sqrt(var_r) * math.sqrt(252) * 100, 2)

        peak = closes[0]
        max_dd = 0.0
        for c in closes:
            if c > peak:
                peak = c
            dd = (c - peak) / peak * 100 if peak > 0 else 0.0
            if dd < max_dd:
                max_dd = dd
        perf["max_drawdown_1y"] = round(max_dd, 2)

    # 嘗試從 FinMind 取得台股 ETF 真實除息紀錄
    dividends: List[Dict[str, Any]] = []
    if kind == "TW":
        try:
            div_rows = await asyncio.wait_for(finmind_service.get_dividends(code, years=3), timeout=4.0)
            for r in sorted(div_rows or [], key=lambda x: x.get("CashExDividendTradingDate") or x.get("date") or "", reverse=True)[:8]:
                amt = float(r.get("CashEarningsDistribution", 0) or 0) + float(r.get("CashStatutorySurplus", 0) or 0)
                ex_date = r.get("CashExDividendTradingDate") or r.get("date") or ""
                if amt > 0 and ex_date:
                    dividends.append({
                        "date": ex_date,
                        "amount": round(amt, 3),
                        "period_yield": round(amt / quote.price * 100, 2) if quote and quote.price > 0 else None,
                    })
        except Exception:
            pass

    # 若為台股未知 ETF，根據名稱與尾碼自動推論追蹤類型、發行商與配息機制
    is_lev_or_inv = code.endswith("L") or code.endswith("R") or "正2" in name or "反1" in name
    is_cmdty_etf = code.endswith("U") or "黃金" in name or "白銀" in name or "石油" in name
    is_bond_etf = code.endswith("B") or "債" in name

    if is_lev_or_inv:
        default_cat = "槓桿 / 反向期貨型 ETF"
        default_div_freq = "不配息（期貨部位轉倉收益滾入淨值）"
    elif is_cmdty_etf:
        default_cat = "大宗商品期貨型 ETF"
        default_div_freq = "不配息（商品期貨型 ETF）"
    elif is_bond_etf:
        default_cat = "固定收益債券型 ETF"
        default_div_freq = "月配息 / 季配息"
    elif "息" in name:
        default_cat = "高股息策略型 ETF"
        default_div_freq = "季配息 / 月配息"
    else:
        default_cat = asset_info.get("industry") or "指數股票型基金 (ETF)"
        default_div_freq = "季配 / 半年配" if asset_kind == "ETF" else "無配息（價格報酬型標的）"

    default_focus = [
        f"追蹤 {name} ({symbol}) 與對應標的指數之淨值走勢、成交量能變化與均線乖離率。",
        "留意折溢價幅度（建議溢價超過 1% 時避免追高）與 20MA 月線支撐位階。"
    ]
    if asset_kind == "ASSET":
        default_focus = [
            f"{name} ({symbol}) 屬於全球宏觀跨資產標的，受美元指數(DX-Y.NYB)、美債殖利率(^TNX)與全球風險偏好影響顯著。",
            "可搭配 K 線上下趨勢線、20MA 乖離率與年化波動率判讀中期多空支撐壓力區。"
        ]

    return {
        "symbol": symbol,
        "name": name,
        "market": "TW" if kind == "TW" else "US",
        "asset_kind": asset_kind,
        "category": profile.get("category") or default_cat,
        "issuer": profile.get("issuer") or (infer_tw_issuer(name) if kind == "TW" else "國際資產管理機構"),
        "tracking_index": profile.get("tracking_index") or f"{name} 對應標的指數",
        "expense_ratio": profile.get("expense_ratio") or ("0.35% ~ 0.65%" if kind == "TW" else "0.09% ~ 0.35%"),
        "dividend_freq": profile.get("dividend_freq") or default_div_freq,
        "aum": profile.get("aum") or "即時追蹤中",
        "dividend_yield": profile.get("dividend_yield_est"),
        "performance": perf,
        "dividends": dividends,
        "holdings": profile.get("holdings", []),
        "sector_weights": profile.get("sector_weights", []),
        "focus_points": profile.get("focus_points") or default_focus,
    }
