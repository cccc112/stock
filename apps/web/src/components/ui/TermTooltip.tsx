"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface BeginnerContextType {
  beginnerMode: boolean;
  setBeginnerMode: (v: boolean) => void;
  toggleBeginnerMode: () => void;
}

const BeginnerModeContext = createContext<BeginnerContextType>({
  beginnerMode: true,
  setBeginnerMode: () => {},
  toggleBeginnerMode: () => {},
});

const STORAGE_KEY = "stock_beginner_mode";

export function BeginnerModeProvider({ children }: { children: React.ReactNode }) {
  const [beginnerMode, setBeginnerModeState] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setBeginnerModeState(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  const setBeginnerMode = (v: boolean) => {
    setBeginnerModeState(v);
    try {
      localStorage.setItem(STORAGE_KEY, String(v));
    } catch {
      // ignore
    }
  };

  const toggleBeginnerMode = () => setBeginnerMode(!beginnerMode);

  return (
    <BeginnerModeContext.Provider value={{ beginnerMode, setBeginnerMode, toggleBeginnerMode }}>
      {children}
    </BeginnerModeContext.Provider>
  );
}

export function useBeginnerMode() {
  return useContext(BeginnerModeContext);
}

export interface GlossaryEntry {
  title: string;
  plain: string;
  guide: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ================= 五維雷達與裁決卡 =================
  snowflake_radar: {
    title: "五維雪花體質雷達 (Snowflake Radar)",
    plain: "把一家公司拆成「賺不賺錢、有沒有長大、會不會倒、貴不貴、主力買不買」五個面向同時打分。",
    guide: "五角形面積越大、越飽滿，代表公司沒有明顯短板；若某一角特別凹陷，就是投資前要注意的弱點。",
  },
  profitability: {
    title: "獲利能力 (Profitability)",
    plain: "公司做生意到底賺不賺錢、利潤率高不高。",
    guide: "分數越高（≥70）代表毛利率、營業利益率與 ROE 表現優異，具備產品定價權或成本優勢。",
  },
  growth: {
    title: "成長動能 (Growth)",
    plain: "公司最近的營收跟獲利有沒有比去年同期明顯增加。",
    guide: "分數越高代表月營收與單季 EPS 正在加速成長，是股價上漲最核心的推力。",
  },
  safety: {
    title: "財務安全 (Financial Health)",
    plain: "公司欠債多不多、手頭現金夠不夠付短期帳單。",
    guide: "分數越高代表負債比低、流動比率充裕，遇到景氣寒冬或升息時不容易出事。",
  },
  valuation: {
    title: "估值吸引力 (Valuation)",
    plain: "現在的股價相對於它賺的錢跟歷史行情，到底算便宜還是貴。",
    guide: "分數越高代表目前本益比 (PER) 處於歷史相對低檔，買貴套牢的風險較低。",
  },
  momentum: {
    title: "技術與籌碼動能 (Momentum & Chips)",
    plain: "股價趨勢是不是在往上走、外資跟投信大戶有沒有在買。",
    guide: "分數越高代表均線多頭排列且法人資金偏多卡位，短中期順風。",
  },
  entry_zone: {
    title: "建議分批進場區間 (Entry Zone)",
    plain: "系統根據下檔機構支撐與波動度，算出比較安全、不追高的買進價位範圍。",
    guide: "股價回測此區間且守穩時分批布局，成本會比追高更有優勢。",
  },
  stop_loss: {
    title: "嚴格防守停損價 (Stop Loss)",
    plain: "如果看錯方向、股價跌破這個價位，代表支撐失效，應該先出場保護本金。",
    guide: "新手最忌諱「套牢不賣」，跌破停損價代表原先看多的理由消失，先砍單才能保留資金。",
  },
  target_price: {
    title: "波段目標價 (Target Price)",
    plain: "這波上漲若順利展開，上方可能遇到較大獲利了結賣壓的目標價位。",
    guide: "接近目標價時可分批停利落袋為安，或把停損點往上移來鎖住獲利。",
  },
  risk_reward: {
    title: "預估風險報酬比 (Risk / Reward Ratio)",
    plain: "「如果看錯會賠1塊錢，那看對能賺幾塊錢」的划算程度。",
    guide: "一般建議至少要 1 : 1.5 以上才值得出手；若大於 1 : 2 代表下檔停損小、上檔獲利空間大。",
  },

  // ================= 四大經典交易模型 =================
  piotroski: {
    title: "Piotroski F-Score 財報排雷模型 (0~9分)",
    plain: "美國史丹佛會計學教授發明的「9道財報照妖鏡」，專門抓出假賺錢、真缺錢的地雷股。",
    guide: "滿分 9 分。7~9 分代表財報極度健康；0~4 分代表獲利品質或負債結構轉差，新手應避開。",
  },
  canslim: {
    title: "William O'Neil CANSLIM 成長飆股模型 (0~7分)",
    plain: "華爾街傳奇投資人歐奈爾總結百年飆股在起漲前共同具備的 7 個特徵。",
    guide: "包含當季盈餘大增(C)、年度高ROE(A)、創新高(N)、量增(S)、強勢領漲(L)、法人買(I)、順勢(M)。5分以上為強勢成長股。",
  },
  minervini: {
    title: "Mark Minervini VCP 第二階段趨勢模板 (0~7分)",
    plain: "全美投資冠軍米奈爾維尼用來確認股票是否已經脫離底部、進入「主升段多頭趨勢」的檢核表。",
    guide: "把股票週期分為四階段：第1階段打底、第2階段主升段、第3階段做頭、第4階段下跌。只買在第2階段（5分以上）。",
  },
  vcp_ratio: {
    title: "VCP 波動收斂型態 (Volatility Contraction Pattern)",
    plain: "股價在突破創高前，上下震盪幅度越來越小、成交量縮乾，代表想賣的散戶都賣光了，籌碼被大戶鎖定。",
    guide: "當近10日振幅小於近40日振幅的 65%（收斂比 ≤ 0.65），一旦帶量突破就容易展開波段大漲。",
  },
  smc: {
    title: "SMC 聰明錢機構足跡模型 (Smart Money Concepts)",
    plain: "追蹤外資、主力大戶在 K 線圖上留下的「大單吃貨區」與「結構突破痕跡」。",
    guide: "散戶看均線，大戶看流動性與訂單塊。4~5 分代表主力結構偏多且下檔有明確大戶防守區。",
  },
  bull_ob: {
    title: "多方機構訂單塊 (Bullish Order Block, Bull OB)",
    plain: "主力大戶在發動大漲前，最後一波大量壓低吃貨的 K 棒成本區間。",
    guide: "當股價未來拉回跌進這個價位區間時，主力為了保護自己的成本，通常會再度出手買進形成強支撐。",
  },
  bear_ob: {
    title: "空方機構訂單塊 (Bearish Order Block, Bear OB)",
    plain: "主力大戶在發動大跌前，最後一波拉高出貨留下的套牢壓力區間。",
    guide: "當股價反彈漲到這個價位區間時，容易遇到解套賣壓與主力空單壓制。",
  },
  bos: {
    title: "結構突破 (BOS, Break of Structure)",
    plain: "股價正式衝破前一波的高點，宣告多頭趨勢延續、主力願意用更高價買進。",
    guide: "出現多頭 BOS 代表趨勢向上，拉回找支撐買進的勝率高。",
  },
  fvg: {
    title: "公允價值失衡缺口 (FVG, Fair Value Gap)",
    plain: "因為主力大單急拉或急殺，導致三根 K 棒中間出現沒有成交到的「真空跳空帶」。",
    guide: "多方 FVG 代表買盤極度強勁，未來股價回測該缺口上緣常有支撐。",
  },

  // ================= 杜邦分析與財報指標 =================
  dupont: {
    title: "杜邦分析 (DuPont Identity)",
    plain: "把公司的 ROE（替股東賺錢的效率）拆開來檢查：到底是靠「高利潤」、「賣得快」還是「借錢開槓桿」賺來的。",
    guide: "最優質的是靠「高稅後淨利率」或「高資產週轉率」推升 ROE；若是靠高「權益乘數（借很多錢）」撐起來的要小心風險。",
  },
  roe: {
    title: "ROE 股東權益報酬率 (Return on Equity)",
    plain: "股東每拿 100 元給公司做生意，公司一年能幫股東賺回幾塊錢。巴菲特最看重的指標。",
    guide: "長期穩定 > 15% 代表是一流好公司；< 8% 代表賺錢效率偏低。",
  },
  roa: {
    title: "ROA 資產報酬率 (Return on Assets)",
    plain: "把股東的錢跟借來的錢全部算進去，公司運用所有資產賺錢的真實效率。",
    guide: "ROA > 0 是基本門檻，越高代表資產沒有閒置浪費。",
  },
  net_margin: {
    title: "稅後淨利率 (Net Profit Margin)",
    plain: "公司每做 100 元生意，扣掉所有成本、費用、利息跟稅金後，最後真正放進口袋的淨賺比例。",
    guide: "淨利率 > 15% 代表非常會賺；若毛利率高但淨利率很低，代表被管銷費用或業外虧損吃掉了。",
  },
  gross_margin: {
    title: "毛利率 (Gross Margin)",
    plain: "賣產品的錢扣掉「直接生產成本」後的利潤比例，代表產品有沒有競爭力與護城河。",
    guide: "毛利率越高、越穩定甚至往上升，代表產品不怕同行殺價競爭（例如台積電毛利率常在 50% 以上）。",
  },
  operating_margin: {
    title: "營業利益率 / 營益率 (Operating Margin)",
    plain: "毛利再扣掉員工薪水、研發、廣告等本業開銷後的利潤率，最能看出「本業」賺不賺錢。",
    guide: "營益率上升代表本業規模經濟發酵；若營益率低但稅後淨利高，通常是靠賣土地或業外收入，無法長久。",
  },
  asset_turnover: {
    title: "總資產週轉率 (Asset Turnover)",
    plain: "公司投入的廠房、設備與資金，一年能翻轉做出幾倍的營收（翻桌率的概念）。",
    guide: "數值越高代表資產運用效率越好、貨賣得越快。",
  },
  equity_multiplier: {
    title: "權益乘數 (Equity Multiplier / 財務槓桿)",
    plain: "總資產除以股東權益，用來衡量公司「借錢做生意（開槓桿）」的倍數。",
    guide: "1~2 倍屬穩健；若高達 3 倍以上（金融業除外），代表負債比很高，景氣反轉時利息壓力大。",
  },
  eps: {
    title: "EPS 每股稅後盈餘 (Earnings Per Share)",
    plain: "平均「每一股股票」幫你賺了幾塊錢，是決定股價高低最直接的數字。",
    guide: "看 EPS 要看它有沒有「一季比一季高」或「比去年同期成長 (YoY > 0)」。",
  },
  ocf: {
    title: "營業現金流 (OCF, Operating Cash Flow)",
    plain: "公司本業做生意「真正收到銀行帳戶裡的現金」，不是帳面上的應收帳款白條。",
    guide: "必須為正數！如果帳面 EPS 賺錢，但營業現金流卻是負的，代表錢都卡在客戶欠款或賣不掉的庫存裡。",
  },
  fcf: {
    title: "自由現金流 (FCF, Free Cash Flow)",
    plain: "本業收進來的現金，扣掉蓋廠房、買設備（資本支出）後，真正可以自由拿來發股息或還債的錢。",
    guide: "長期為正代表公司是「現金奶牛」；若因擴廠偶爾為負但未來營收大爆發則屬良性投資。",
  },
  ocf_to_ni: {
    title: "獲利含金量 (營業現金流 / 稅後淨利)",
    plain: "檢驗公司帳面上賺的 100 元裡面，有幾塊錢是真正收到現金入袋的。",
    guide: "80% ~ 100% 以上代表獲利品質極佳（真金白銀）；長期低於 50% 要小心呆帳或存貨風險。",
  },

  // ================= 估值與成長率 =================
  per: {
    title: "本益比 (PER, Price-to-Earnings Ratio)",
    plain: "現在的股價除以每年賺的 EPS，相當於「買這檔股票要幾年才能靠它賺的錢回本」。",
    guide: "例如股價 100 元、每年賺 5 元，本益比就是 20 倍。要跟它自己的「歷史本益比位階」或同業相比才準。",
  },
  per_band: {
    title: "本益比歷史位階尺 / 百分位 (PER Percentile)",
    plain: "把現在的本益比放到過去 5 年的歷史紀錄裡排隊，看現在處於歷史便宜區還是昂貴區。",
    guide: "百分位 < 30% 代表比過去七成時間都便宜（低估區）；> 80% 代表處於歷史昂貴區，追高要謹慎。",
  },
  pbr: {
    title: "股價淨值比 (PBR, Price-to-Book Ratio)",
    plain: "現在的股價是公司「清算拍賣後每股帳面價值（淨值）」的幾倍。",
    guide: "景氣循環股（如航運、鋼鐵、面板）跟金融股常用 PBR 看高低；PBR < 1 代表股價比公司清算價值還便宜。",
  },
  dividend_yield: {
    title: "現金殖利率 (Dividend Yield)",
    plain: "把買股票當成存錢，每年發的現金股息除以現在股價，算出來的「年息百分比」。",
    guide: "台股平均約 3.5%~4%。殖利率 > 5% 具高股息保護，但記得一定要能「填息（股價漲回除息前）」才算真正賺到。",
  },
  debt_ratio: {
    title: "負債比率 (Debt Ratio)",
    plain: "公司全部資產裡面，有多少百分比是「跟銀行或別人借來的錢」。",
    guide: "一般製造業 < 50% 算安全；若 > 65%（金控/營建業除外）代表財務槓桿偏高。",
  },
  current_ratio: {
    title: "流動比率 (Current Ratio)",
    plain: "公司一年內能變現的資產，是一年內必須還清債務的幾倍（短期救急能力）。",
    guide: "大於 1.5 倍（150%）代表短期資金很寬裕；小於 1 倍代表短期周轉有壓力。",
  },
  yoy: {
    title: "YoY 年增率 (Year-over-Year)",
    plain: "跟「去年同一個月或同一季」相比，成長或衰退了多少百分比。",
    guide: "因為產業有淡旺季，看 YoY 可以避開季節影響，是判斷公司是否真正成長最重要的指標（正數代表成長）。",
  },
  qoq: {
    title: "QoQ 季增率 (Quarter-over-Quarter)",
    plain: "跟「上一季」相比，成長或衰退了多少百分比。",
    guide: "可快速看出最新一季景氣有沒有馬上轉強，但要注意電子業 Q1 通常是傳統淡季、Q3/Q4 是旺季。",
  },
  ret_20d: {
    title: "20日相對動能 (20-Day Return)",
    plain: "過去 20 個交易日（約一個月）的股價累積漲跌幅，用來比較誰是同產業裡的領頭羊。",
    guide: "強者恆強，同產業裡 20 日漲幅最強且基本面好的標的，通常是主力資金最集中的首選。",
  },

  // ================= K線、趨勢線與量化技術指標 =================
  ma: {
    title: "MA 移動平均線 (Moving Average)",
    plain: "過去 N 天所有買進這檔股票的人的「平均持倉成本線」。",
    guide: "股價站在均線之上，代表近期買的人都賺錢（均線變成支撐）；跌破均線代表大家開始套牢（均線變成壓力）。",
  },
  ma5: {
    title: "5MA 週線 (5日移動平均線)",
    plain: "過去 5 個交易日（一週）的平均成交價，是極短線強弱的分水嶺。",
    guide: "飆股在急漲時通常沿著 5MA 往上走，只要收盤沒跌破 5MA 就不用急著賣。",
  },
  ma20: {
    title: "20MA 月線 / 生命線 (20日移動平均線)",
    plain: "過去 20 個交易日（一個月）的平均成本，是波段操作最重要的「生命線」。",
    guide: "月線往上且股價在月線之上為波段多頭；跌破月線且月線下彎代表波段轉弱。",
  },
  ma60: {
    title: "60MA 季線 (60日移動平均線)",
    plain: "過去 60 個交易日（一季）的平均成本，外資與投信法人最看重的中長期趨勢線。",
    guide: "季線向上代表中長線多頭保護，拉回靠近季線常是波段好買點；跌破季線則需提防趨勢反轉。",
  },
  ma120: {
    title: "120MA 半年線 (120日移動平均線)",
    plain: "過去半年市場投資人的平均成本，代表長期牛熊分界。",
    guide: "股價在半年線之上屬於長線多頭格局；跌破半年線代表長線進入整理或空頭。",
  },
  vol_ma: {
    title: "均量線 (Volume Moving Average)",
    plain: "過去 N 天的平均成交量，用來判斷今天成交量是「放量」還是「縮量」。",
    guide: "當日成交量大於均量線 1.5~2 倍以上稱為「帶量突破」，代表主力資金正式進場。",
  },
  auto_trendlines: {
    title: "自動上下趨勢線 (Upper / Lower Trendlines)",
    plain: "系統自動去趨勢化找出波段高點連成的「上壓力線（紅虛線）」與波段低點連成的「下支撐線（綠虛線）」。",
    guide: "股價靠近下趨勢支撐線不破是買點參考；帶量突破上趨勢壓力線代表整理結束、新一波漲勢啟動。",
  },
  fib_tool: {
    title: "斐波那契回撤 / 黃金分割率 (Fibonacci Retracement)",
    plain: "測量一波上漲後，拉回整理最容易止跌反彈的黃金比例位置（最關鍵是 0.382、0.5、0.618）。",
    guide: "強勢股拉回通常在 0.382 或 0.5 就會止跌；0.618 則是多頭最後防線。",
  },
  channel_tool: {
    title: "平行上下通道 (Parallel Trend Channel)",
    plain: "畫出一條主趨勢線後，自動產生上下對稱的平行軌道，標出股價波動的上下界。",
    guide: "在上升通道中，碰到下軌買進、碰到上軌部分獲利了結。",
  },
  rsi: {
    title: "RSI 相對強弱指標 (Relative Strength Index)",
    plain: "衡量最近 14 天買盤跟賣盤誰比較兇的溫度計（範圍 0 ~ 100）。",
    guide: "RSI > 50 代表多方佔優；> 70 代表短線買太兇過熱（超買區，別亂追高）；< 30 代表跌過頭（超賣區，容易反彈）。",
  },
  macd: {
    title: "MACD 趨勢動能指標",
    plain: "利用快線(12日)與慢線(26日)的差距，判斷中長期大趨勢是正在加速往上還是轉弱。",
    guide: "快線向上穿過訊號線（黃金交叉，柱狀體翻正）為波段買進訊號；反之柱狀體翻負為轉弱訊號。",
  },
  macd_hist: {
    title: "MACD 柱狀體 (Histogram / OSC)",
    plain: "快線(DIF)減去慢線(DEA)的差值，用來觀察多空力道是在「增強」還是「減弱」。",
    guide: "柱狀體 > 0 代表多頭控盤；當負柱狀體開始縮短，代表跌勢趨緩即將反彈。",
  },
  kd: {
    title: "KD / KDJ 隨機指標 (Stochastic Oscillator)",
    plain: "反應非常靈敏的短線轉折指標，常用來抓盤整或波段拉回後的起漲點。",
    guide: "K 值在 20 以下由下往上穿過 D 值（低檔黃金交叉）是短線買進訊號；80 以上死亡交叉代表短線轉弱。",
  },
  bollinger: {
    title: "布林通道 (Bollinger Bands)",
    plain: "用 20 日均線當中心，上下各加 2 個標準差畫出的「股價正常活動走廊」（涵蓋 95% 的價格落點）。",
    guide: "通道縮口變窄代表即將大變盤；帶量衝破上軌是強勢突破；跌到下軌守住常有短線反彈。",
  },
  boll_std: {
    title: "布林通道標準差倍數 (Standard Deviation)",
    plain: "決定布林通道上下軌道寬度的倍數，預設為 2 倍標準差（涵蓋約 95.4% 的價格波動）。",
    guide: "調大（如 2.5）訊號變少但更極端；調小（如 1.5）會更容易觸發突破訊號但假訊號也會增加。",
  },
  vap: {
    title: "VAP 價量分佈 / 籌碼密集區 (Volume at Price)",
    plain: "統計過去一段時間「在哪個價位成交了最多股票」，找出市場最大筆資金真正換手的成本區。",
    guide: "橫條最長的那根叫 POC（最大量控制點）。如果現在股價在最長橫條之上，那個密集區就是超強鐵板支撐；若在之下就是沉重套牢區。",
  },
  poc: {
    title: "POC 最大成交量控制點 (Point of Control)",
    plain: "價量分佈圖上「紫色最長的那一條價位區」，代表過去這段時間最多人買賣成交的關鍵成本價。",
    guide: "現價高於 POC 代表這批最大量籌碼都賺錢，拉回 POC 會有強力護盤；現價低於 POC 則代表上檔有大量解套賣壓。",
  },
  quant_signals: {
    title: "量化策略訊號 (Quantitative Strategy Signals)",
    plain: "系統自動用電腦程式掃描均線、RSI、MACD、布林通道與成交量，當符合特定買賣條件時自動亮燈提示。",
    guide: "出現「買進」代表符合該策略的多方觸發條件，可搭配信心度與停損價位評估是否進場。",
  },
  signal_confidence: {
    title: "訊號信心度 (Signal Confidence)",
    plain: "系統根據多項指標共振程度與量價配合度，給這個買賣訊號打的把握度分數（0%~100%）。",
    guide: "信心度 ≥ 70% 代表量價與技術指標高度吻合，可靠度較高；< 55% 則建議多觀察一根 K 棒確認。",
  },
  volume_anomaly: {
    title: "異常量價偵測 (Volume Anomaly Detection)",
    plain: "抓出成交量突然比平常暴增 2 倍以上，且伴隨股價在波段高點或低點的不尋常大戶動作。",
    guide: "「低檔爆量」常是主力逢低承接換手（偏多）；「高檔爆量收黑」則要提防主力拉高出貨（偏空）。",
  },
  support_resistance: {
    title: "關鍵價位雷達 (Support & Resistance Radar)",
    plain: "自動找出過去幾個月多次止跌反彈的「地板價（支撐區）」與多次漲不過去的「天花板（壓力區）」。",
    guide: "買股票盡量在靠近「支撐區」時買，靠近「壓力區」時不要盲目追高（除非帶大量正式突破壓力）。",
  },
  level_strength: {
    title: "支撐/壓力強度 (Level Strength)",
    plain: "歷史上股價碰到這個價位而轉折的次數與成交量權重，數字越高代表這道牆越厚。",
    guide: "強度 ≥ 3 代表多次測試有效的關鍵防線，一旦帶量突破高強度壓力區，往往會開啟大波段。",
  },

  // ================= 量化掃描器與回測專有名詞 =================
  quant_scanner: {
    title: "量化訊號掃描儀 (Quant Scanner)",
    plain: "不用一檔一檔翻 K 線，電腦一鍵幫你把全市場符合「黃金交叉、布林擠壓、爆量突破」的股票全部抓出來。",
    guide: "可切換上方標籤篩選不同型態，或點「參數設定」切換極短線（當沖/隔日沖）與波段參數。",
  },
  golden_death_cross: {
    title: "均線交叉 (黃金交叉 / 死亡交叉)",
    plain: "短天期均線（如5MA）由下往上穿過長天期均線（如20MA）叫「黃金交叉（轉多）」；由上往下跌破叫「死亡交叉（轉空）」。",
    guide: "黃金交叉代表近期買進力道轉強，是順勢波段最經典的起漲訊號。",
  },
  macd_divergence: {
    title: "MACD 背離 (MACD Divergence)",
    plain: "股價創了新低，但 MACD 指標卻沒有跟著創新低（底背離），代表下跌動能已經衰竭、隨時準備反彈。",
    guide: "「底背離」是抓波段底部反轉勝率極高的訊號；反之股價創高但指標沒創高叫「頂背離」，要小心拉回。",
  },
  bollinger_squeeze: {
    title: "布林擠壓 (Bollinger Squeeze)",
    plain: "布林通道上下軌縮到非常窄，代表市場波動壓縮到極致，就像彈簧被壓到底，隨時準備噴出大行情。",
    guide: "出現布林擠壓後，只要第一根帶量紅 K 棒突破上軌，往往就是波段主升段的起點。",
  },
  volume_breakout: {
    title: "爆量突破 (Volume Breakout)",
    plain: "成交量突然暴增到均量的 2 倍以上，同時股價衝破近期盤整區高點，代表主力砸大錢點火進場。",
    guide: "真突破必須「價漲量增」，沒有成交量配合的突破容易變成假突破。",
  },
  atr: {
    title: "ATR 平均真實波幅 (Average True Range)",
    plain: "衡量這檔股票「平均一天上下震盪幾塊錢」的波動指標。",
    guide: "專業交易員都用 ATR 設停損（例如進場價減去 2 倍 ATR 當停損），才不會被日常正常的上下洗盤掃出場。",
  },
  backtest_intro: {
    title: "歷史策略回測 (Historical Backtesting)",
    plain: "把一套買賣規則放到過去 1~3 年的真實歷史行情裡跑一遍，看如果照這套方法操作到底會賺錢還是賠錢。",
    guide: "已自動扣除台股手續費與證交稅。上線實盤前先跑回測，才不會憑感覺亂交易。",
  },
  total_return: {
    title: "策略累積報酬率 (Total Return)",
    plain: "在回測期間內，完全照著這個策略買進賣出，最後總資產增加或減少的百分比。",
    guide: "要跟下方的「基準報酬（買著不動）」比較，如果策略報酬高於基準，代表主動操作有價值。",
  },
  alpha: {
    title: "超額報酬 (Alpha, α)",
    plain: "「策略報酬率」減去「傻傻買著抱到尾（買入持有）」多賺出來的報酬百分比。",
    guide: "Alpha > 0 代表這個策略能幫你打敗大盤或打敗單純死抱；Alpha < 0 代表還不如買著不動。",
  },
  mdd: {
    title: "最大回撤 (MDD, Maximum Drawdown)",
    plain: "在回測期間內，你的帳戶從最高峰一路跌到最谷底「曾經出現過最慘的虧損幅度」。",
    guide: "用來測試你的心理承受度！如果一個策略賺 80% 但 MDD 高達 -50%，一般人通常在跌 30% 時就嚇到認賠出場了。MDD 越小越穩健（建議 < 20%）。",
  },
  sharpe: {
    title: "夏普比率 (Sharpe Ratio)",
    plain: "衡量「每承受一單位的震盪風險，能換來多少超額報酬」的性價比指標。",
    guide: "夏普比率 > 1 代表表現良好；> 1.5 代表極為優秀（賺得多又震盪小）；< 0 代表虧損。",
  },
  win_rate: {
    title: "交易勝率 (Win Rate)",
    plain: "所有買賣交易次數裡面，最後賺錢出場的筆數佔百分之幾。",
    guide: "注意：趨勢突破策略勝率通常只有 40%~50%，但靠「大賺小賠（高獲利因子）」一樣能大賺；均值回歸策略勝率則常在 60% 以上。",
  },
  profit_factor: {
    title: "獲利因子 / 盈虧比 (Profit Factor)",
    plain: "「所有賺錢交易的總獲利金額」除以「所有賠錢交易的總虧損金額」。",
    guide: "必須大於 1 才會賺錢！大於 1.5 代表策略具明顯正期望值；大於 2.0 代表大賺小賠非常出色。",
  },
  equity_curve: {
    title: "資產淨值走勢 (Equity Curve)",
    plain: "把你帳戶每天的總資金畫成折線圖（藍線），直接跟「第一天買進後死抱不賣（灰虛線）」PK。",
    guide: "理想的淨值曲線應該「左下往右上穩定爬升」，且在大盤下跌時（灰線往下）藍線能抗跌持平。",
  },
  underwater_dd: {
    title: "回撤水下圖 (Underwater Drawdown Chart)",
    plain: "顯示你的資金從歷史最高點拉回「套牢在水面下」的深度與持續時間。",
    guide: "紅色坑洞越淺、越快回到 0%，代表策略遇到逆風時恢復創高的能力越強。",
  },

  // ================= ETF 與跨資產專有名詞 =================
  etf_index: {
    title: "追蹤指數 (Tracking Index)",
    plain: "這檔 ETF 背後完全複製、照著買進的一籃子股票選股規則（例如 0050 就是照著臺灣50指數買進前50大公司）。",
    guide: "買 ETF 最重要就是看它追蹤什麼指數，指數規則決定了它會買進哪些股票。",
  },
  expense_ratio: {
    title: "總費用率 / 內扣費用 (Expense Ratio)",
    plain: "投信公司幫你管理這檔 ETF 每年暗中從淨值裡扣掉的「管理費＋保管費」。",
    guide: "內扣費用越低越好！長期存股差 0.5% 累積十年會差好幾萬元（例如美股 VOO 僅 0.03%，台股市值型約 0.2%~0.4%）。",
  },
  dividend_freq: {
    title: "配息頻率 (Dividend Frequency)",
    plain: "這檔 ETF 一年發幾次現金股息給你（年配、半年配、季配、月配）。",
    guide: "有現金流需求者可選季配或月配；長期累積資產者把股息再投入（複利）效果最好。",
  },
  aum: {
    title: "資產規模 (AUM, Assets Under Management)",
    plain: "全市場投資人總共買了多少錢在這檔 ETF 裡面（基金池子的總大小）。",
    guide: "規模越大（台股 > 100億、熱門 > 1000億）代表流動性越好、買賣價差小，且絕對不會有下市清算風險。",
  },
  bias_20ma: {
    title: "月線乖離率 (20MA Bias)",
    plain: "現在的股價比過去 20 天平均成本（月線）高出或低了多少百分比。",
    guide: "ETF 很少暴漲暴跌，當正乖離過大（> +5%~8%）代表短線漲多別追高；當負乖離（< -3%~-5%）往往是分批逢低買進的好時機。",
  },
  volatility_annual: {
    title: "年化波動率 (Annualized Volatility)",
    plain: "衡量這檔標的一年下來價格上下震盪劇烈程度的百分比。",
    guide: "波動率越低（如美債 ETF 約 10~12%、高股息約 15%）代表走勢越溫和適合保守族；科技股與加密貨幣波動率常在 25%~60% 以上。",
  },
  etf_holdings: {
    title: "核心成分股與權重 (Top Holdings & Weights)",
    plain: "你買進 100 元這檔 ETF，裡面實際上有幾塊錢是買在台積電、鴻海或蘋果身上。",
    guide: "看前十大持股才知道你真正的風險在哪（例如 0050 有超過一半都是台積電，所以台積電漲跌直接決定 0050 漲跌）。",
  },

  // ================= 法人與市場分類 =================
  twse_tpex: {
    title: "上市 (TWSE) vs 上櫃 (TPEx)",
    plain: "上市是在「台灣證券交易所」掛牌的大型成熟公司（如台積電）；上櫃是在「櫃買中心」掛牌的中小型高成長公司（如元太、環球晶）。",
    guide: "上市權值股走勢穩健、受外資影響大；上櫃中小型股股性活潑、受投信與內資主力影響大。",
  },
  foreign_inv: {
    title: "外資 (Foreign Investors)",
    plain: "台灣以外的國際投資機構（如摩根大通、高盛、主權基金），資金最龐大。",
    guide: "外資連續買超是大型權值股（台積電、鴻海等）上漲的最大推手。",
  },
  trust_inv: {
    title: "投信 (Investment Trust / 國內基金與ETF)",
    plain: "國內基金公司跟高股息/市值型 ETF 經理人，研究本土中小型股最深入。",
    guide: "「投信連續買超」常是季底作帳行情與中小型飆股發動的明確信號。",
  },
  dealer_inv: {
    title: "自營商 (Dealers)",
    plain: "證券公司自己拿自有資金操作，或為了民眾買權證而進行的避險買賣。",
    guide: "自營商操作週期極短（常隔日沖或幾天就賣），參考權重低於外資與投信。",
  },
};

export function InfoTip({
  term,
  customTitle,
  customPlain,
  customGuide,
}: {
  term?: keyof typeof GLOSSARY | string;
  customTitle?: string;
  customPlain?: string;
  customGuide?: string;
}) {
  const { beginnerMode } = useBeginnerMode();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placeAbove: boolean }>({
    top: 0,
    left: 0,
    placeAbove: true,
  });
  const btnRef = useRef<HTMLButtonElement>(null);

  const entry: GlossaryEntry | undefined = term ? GLOSSARY[term] : undefined;
  const title = customTitle || entry?.title;
  const plain = customPlain || entry?.plain;
  const guide = customGuide || entry?.guide;

  const updatePosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const tooltipWidth = 288;
    const vw = window.innerWidth;
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - tooltipWidth / 2),
      vw - tooltipWidth - 12
    );
    const placeAbove = rect.top > 190;
    const top = placeAbove ? rect.top - 8 : rect.bottom + 8;
    setCoords({ top, left, placeAbove });
  };

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (btnRef.current && btnRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  if (!beginnerMode || !plain) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`名詞說明：${title}`}
        onMouseEnter={() => {
          updatePosition();
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          updatePosition();
          setOpen((prev) => !prev);
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-mono font-bold leading-none ml-1 align-middle cursor-help hover:bg-amber-500 hover:text-slate-950 transition-colors flex-shrink-0"
      >
        !
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform: coords.placeAbove ? "translateY(-100%)" : "none",
              width: 288,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl bg-[#0f172a] border border-amber-500/40 shadow-2xl p-3.5 text-left pointer-events-auto animate-fade-in"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                !
              </span>
              <span className="text-xs font-bold text-amber-400 leading-snug">{title}</span>
            </div>
            <p className="text-xs text-slate-100 leading-relaxed mb-2">{plain}</p>
            {guide && (
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                <span className="text-emerald-400 font-semibold mr-1">[實戰判讀]</span>
                {guide}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

export function Term({
  k,
  term,
  label,
  className = "",
}: {
  k?: keyof typeof GLOSSARY | string;
  term?: keyof typeof GLOSSARY | string;
  label: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span>{label}</span>
      <InfoTip term={k || term} />
    </span>
  );
}
