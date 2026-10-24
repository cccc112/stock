export interface ParamDetail {
  key: string;
  label: string;
  increaseEffect: string; // 調大產生的結果
  decreaseEffect: string; // 調小產生的結果
  tuningTip: string;      // 專家調校建議
}

export interface StrategyExplanation {
  id: string;
  name: string;
  category: string;
  concept: string;        // 策略核心哲學與運作原理
  entryRule: string;      // 具體買進/做多觸發條件
  exitRule: string;       // 具體出場/停利條件
  suitableMarket: string; // 最佳適用市場環境
  drawback: string;       // 致命缺點與洗盤情境
  winRateProfile: string; // 勝率與盈虧比風格
  paramDetails: ParamDetail[];
}

export const STRATEGY_EXPLANATIONS: Record<string, StrategyExplanation> = {
  turtle: {
    id: "turtle",
    name: "海龜交易法則 (Turtle Trading System)",
    category: "趨勢突破",
    concept: "由傳奇交易大師 Richard Dennis 與 William Eckhardt 開創。核心哲學是『絕不預測頂部與底部，只跟隨價格客觀突破』，透過唐奇安通道 (Donchian Channel) 捕捉全市場大級別主升段。",
    entryRule: "當日收盤價突破前 N 日最高價 (Donchian Channel 上軌) 時確立多頭突破進場。",
    exitRule: "當日收盤價跌破前 M 日最低價 (Donchian Channel 下軌) 時即刻觸發停損或獲利了結平倉。",
    suitableMarket: "波瀾壯闊的單邊大牛市（如產業爆發期的半導體、AI 伺服器飆股）。",
    drawback: "無趨勢的箱型橫盤震盪。價格在上下軌間來回穿梭時，極易陷入『買在假突破最高點、砍在假跌破最低點』的連續停損磨損 (Whipsaw 洗盤)。",
    winRateProfile: "典型低勝率 (35% ~ 45%)、高盈虧比 (3:1 ~ 5:1)。靠少數幾次超大主升段的暴利彌補多次小額停損。",
    paramDetails: [
      {
        key: "lookback_enter",
        label: "進場突破天數",
        increaseEffect: "調大 (如 30~55 天)：大幅過濾短期隨機震盪與假突破，勝率提升、交易頻率降低；但進場成本偏高，錯過初期起漲點。",
        decreaseEffect: "調小 (如 10~15 天)：對趨勢發動極度敏銳，進場成本極低；但在震盪橫盤中會被頻繁誘多，假突破停損次數暴增。",
        tuningTip: "台股波動較大，建議 20~30 天；若標的為大型指數 ETF (如 0050、SPY)，可調大至 40~55 天。"
      },
      {
        key: "lookback_exit",
        label: "出場停損天數",
        increaseEffect: "調大 (如 15~20 天)：給予波段充裕的回檔防守空間，不易在主升段正常洗盤中被甩轎；但高檔獲利吐回幅度較大。",
        decreaseEffect: "調小 (如 5~8 天)：鎖定利潤迅速，回撤控制更佳；但在強勢股正常中段整理時極易被震出場，痛失後續倍數利潤。",
        tuningTip: "經典參數為 10 天；若想保護短期浮動利潤可微調為 7~8 天。"
      }
    ]
  },
  supertrend: {
    id: "supertrend",
    name: "超級趨勢策略 (SuperTrend)",
    category: "動量趨勢",
    concept: "全球最普及的動態波幅追蹤策略。以 (High+Low)/2 為基準，上下加減真實波幅乘數 (ATR Multiplier) 作為自適應軌道。在上升趨勢中，下軌線隨價格走高持續上移（絕不向下回退），直到價格收破下軌才反轉平倉。",
    entryRule: "價格由下往上穿破超級趨勢上軌，指標翻多轉為綠色波段即買進。",
    exitRule: "價格收盤跌破超級趨勢下軌支撐線，立即觸發移動停利平倉。",
    suitableMarket: "具備強烈動能的中長線趨勢股、高成長科技股、台股權值股。",
    drawback: "成交量低迷、振幅微弱的無量盤整期。上下軌距離收窄，易反覆碰觸造成多空雙巴。",
    winRateProfile: "中等勝率 (42% ~ 52%)，以移動停利 (Trailing Stop) 鎖定大波段見長，最大回撤 (MDD) 控制通常優於固定均線。",
    paramDetails: [
      {
        key: "period",
        label: "ATR 週期",
        increaseEffect: "調大 (如 14~20)：計算真實波幅時平滑度高，反映長週期平均波動，軌道變動較穩定不躁進。",
        decreaseEffect: "調小 (如 5~8)：高度貼近近期急遽波動，適合超短線即時風控，但雜訊變多。",
        tuningTip: "日線級別推薦 10 或 14；波動劇烈的中小型股可設 14。"
      },
      {
        key: "multiplier",
        label: "波動率乘數",
        increaseEffect: "調大 (如 3.5~4.5)：通道大幅放寬，耐受盤中劇烈洗盤能力極強，能抱住超大飆股；但出場時回吐利潤較多。",
        decreaseEffect: "調小 (如 1.5~2.2)：通道緊貼現價，微幅回檔即鎖利出場；但在正常技術性回測中容易過早被洗掉。",
        tuningTip: "一般股票預設 3.0；高貝塔值 (Beta > 1.5) 標的建議 3.5；低波動穩健股可設 2.0~2.5。"
      }
    ]
  },
  dual_thrust: {
    id: "dual_thrust",
    name: "Dual Thrust 區間突破策略",
    category: "CTA突破",
    concept: "由 Michael Chalek 開發的經典量化 CTA 突破模型。透過歷史前 N 日的高、低、收盤價計算出真實波動振幅 Range，開盤價加上 K1*Range 形成多頭攻擊線，突破即強勢順勢做多。",
    entryRule: "當日價格突破 (今日開盤價 + K1 * Range) 時即刻觸發多頭進場。",
    exitRule: "當日價格跌破 (今日開盤價 - K2 * Range) 時觸發反向停損出場。",
    suitableMarket: "開盤跳空有量、日內具備強烈單邊延伸動能的強勢股與短線動能股。",
    drawback: "遇到開高走低、長上下影線的假突破或十字星收斂行情，容易高點追多後當日套牢。",
    winRateProfile: "勝率約 45% ~ 55%，爆發力強，單筆交易持有天數通常偏短（3~7 天）。",
    paramDetails: [
      {
        key: "lookback",
        label: "區間回顧天數",
        increaseEffect: "調大 (如 8~15 天)：計算的 Range 波動區間更廣，代表性強，能過濾單日極端毛刺干擾。",
        decreaseEffect: "調小 (如 2~4 天)：迅速貼近最近幾天的爆發動能，進場極為敏捷，但波動雜訊偏大。",
        tuningTip: "波段回測預設 5 天最佳；短線當沖/隔日沖可測 3 天。"
      },
      {
        key: "k1",
        label: "多頭突破係數 K1",
        increaseEffect: "調大 (如 0.7~1.0)：拉大多頭觸發價位，必須出現超強買盤大長紅才進場，能大幅避開誘多假突破；但開倉次數降低。",
        decreaseEffect: "調小 (如 0.2~0.4)：進場門檻低、非常激進，盤初稍微放量上衝即開倉；但在開高走低盤面會頻繁受傷。",
        tuningTip: "單邊牛市可降至 0.4 搶進；震盪市建議提高至 0.7 防守。"
      },
      {
        key: "k2",
        label: "空頭防守係數 K2",
        increaseEffect: "調大 (如 0.7~1.0)：給予多單充裕停損緩衝，不易被下影線洗盤掃出場；但一旦真正轉空虧損幅度擴大。",
        decreaseEffect: "調小 (如 0.2~0.4)：防守嚴格，稍有轉弱即立刻砍單保本，但勝率可能下降。",
        tuningTip: "與 K1 保持對稱 (0.5)，或採偏多架構 (K1=0.4, K2=0.6)。"
      }
    ]
  },
  bollinger_rsi: {
    id: "bollinger_rsi",
    name: "布林通道 + RSI 均值回歸策略",
    category: "逆勢回歸",
    concept: "經典統計套利模型。假設常態分佈下股價有 95% 機率落在布林上下軌 (±2 個標準差) 之間。當股價跌破下軌且 RSI 呈現極度恐慌超賣時，代表市場情緒非理性宣洩，進場抄底博取向 20MA 中軌回歸。",
    entryRule: "收盤價 <= 布林下軌 * 1.01 且 RSI(14) <= 超賣門檻 (預設 32) 時進場接反彈。",
    exitRule: "收盤價反彈回到布林中軌 (20MA) 或 RSI(14) >= 超買門檻 (預設 65) 時獲利了結。",
    suitableMarket: "處於箱型整理、區間波動的大盤 ETF（0050、SPY）或基本面穩健的大型權值股。",
    drawback: "遇到斷頭式單邊崩跌（如系統性黑天鵝、產業衰退）。股價會『貼著布林下軌一路破底』，RSI 鈍化在低檔，盲目接刀恐遭斷頭。",
    winRateProfile: "高勝率 (60% ~ 75%)、中低盈虧比 (1:1 ~ 1.5:1)。核心在於高勝率累積小勝，但必須搭配嚴格停損 (Stop Loss) 防範尾端風險。",
    paramDetails: [
      {
        key: "rsi_oversold",
        label: "RSI 超賣進場點",
        increaseEffect: "調大 (如 35~42)：放寬超賣標準，出手次數增多；但容易在回檔中途過早接刀 (接飛刀)。",
        decreaseEffect: "調小 (如 20~28)：必須出現非理性崩跌恐慌才進場，勝率極高且反彈空間大；但整年交易次數寥寥無幾。",
        tuningTip: "權值股設 30~32 兼具頻率與勝率；高波動投機股建議降至 25 以下。"
      },
      {
        key: "rsi_overbought",
        label: "RSI 超買出場點",
        increaseEffect: "調大 (如 70~80)：期待強勁反彈波段，追求更佳報酬；但若反彈乏力未達標，可能利潤回吐甚至轉盈為虧。",
        decreaseEffect: "調小 (如 55~60)：一有利潤迅速落袋為安，勝率最高；但吃不到主升段反彈大行情。",
        tuningTip: "中軌 (20MA) 已作為第一道防線，超買門檻設在 65 最為均衡。"
      }
    ]
  },
  institutional_momentum: {
    id: "institutional_momentum",
    name: "外資投信籌碼動量策略",
    category: "法人籌碼",
    concept: "專為台股量身打造的『主力聰明錢跟隨模型』。結合外資與投信近 5 日連續淨買超動能，並以 20MA（月線）作為趨勢過濾器，確保資金與價格同向發動。",
    entryRule: "外資+投信近 5 日淨買超 > 0 且股價站穩 20MA 上方時進場。",
    exitRule: "股價跌破 20MA 或三大法人由買轉賣時出場避險。",
    suitableMarket: "台股多頭格局、季底投信認養作帳股、外資大舉回補週期。",
    drawback: "法人籌碼為盤後公佈，遇法人隔日沖或高檔出貨結帳時，信號反應略有滯後。",
    winRateProfile: "勝率約 50% ~ 60%，在台股強勢題材股上績效顯著。",
    paramDetails: [
      {
        key: "ma_period",
        label: "趨勢均線週期",
        increaseEffect: "調大 (如 60 季線)：確認中長線大底完成才進場，安全性最高；但切入成本較高。",
        decreaseEffect: "調小 (如 5~10 日線)：短線爆發力極強，第一時間跟進法人起漲點；但容易被短線洗盤洗出場。",
        tuningTip: "波段波長以 20MA 月線最貼合法人操盤節奏。"
      }
    ]
  },
  ma_cross: {
    id: "ma_cross",
    name: "雙均線金叉動量策略 (EMA Ribbon)",
    category: "均線動態",
    concept: "技術分析經典鼻祖。使用指數平滑移動平均線 (EMA)，當短期快線向上穿越長期慢線（黃金交叉）時做多，死亡交叉時出場。",
    entryRule: "快線向上穿破慢線 (Golden Cross) 確認多頭轉向買進。",
    exitRule: "快線跌破慢線 (Death Cross) 確認動能衰退平倉離場。",
    suitableMarket: "走勢連續、波段階梯分明的健康上升趨勢。",
    drawback: "均線天生具備滯後性。橫盤震盪中快慢線頻繁糾結，極易反覆追高殺低損耗本金。",
    winRateProfile: "勝率 38% ~ 48%，盈虧比 2.5:1 ~ 4:1，靠大賺小賠戰勝市場。",
    paramDetails: [
      {
        key: "fast_ma",
        label: "快線週期",
        increaseEffect: "調大：過濾雜訊，進場更穩健；但反應變慢。",
        decreaseEffect: "調小 (如 3~5)：極為敏捷，第一根轉折即捕捉；但假信號多。",
        tuningTip: "日線級別 8 EMA 為最佳短線動能平衡點。"
      },
      {
        key: "slow_ma",
        label: "慢線週期",
        increaseEffect: "調大 (如 34~60)：跨度拉大，專抓季度大主升段，抗洗盤；但高檔鈍化出場吐回較多。",
        decreaseEffect: "調小 (如 13~18)：反應快速，適合靈活快打；但震盪盤交叉過於頻繁。",
        tuningTip: "經典斐波那契搭配為 8 / 21，中長線可測 12 / 26。"
      }
    ]
  }
};

export const GLOBAL_PARAM_GUIDE = [
  {
    name: "停損百分比 (Stop Loss %)",
    effect: "單筆最大容許虧損限制。設太緊 (<3%) 容易被隨機跳空掃出場；設太寬 (>15%) 失去保護本金意義；建議設 5% ~ 8% 截斷黑天鵝大跌風險。"
  },
  {
    name: "回測週期 (Period)",
    effect: "回測時間跨度。長週期 (2y~3y) 歷經牛市、熊市考驗，數據公信力高；短週期 (6mo) 易受近期單一牛熊行情偏差影響。"
  },
  {
    name: "起始本金 (Initial Capital)",
    effect: "決定部位大小與手續費/證交稅在淨值中的占比比例。本金越小，固定交易成本的摩擦損耗越明顯。"
  }
];
