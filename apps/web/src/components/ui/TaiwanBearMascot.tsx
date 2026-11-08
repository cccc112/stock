"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Bell,
  X,
  Flame,
  Calculator,
  Compass,
  Dices,
  Volume2,
  VolumeX,
  Heart,
  Zap,
  RotateCcw,
  Award,
  Layers,
} from "lucide-react";

type BearMood = "BULLISH" | "FEAR" | "NEUTRAL";
type ActiveTab = "insight" | "fortune" | "interact";

interface FortuneSlip {
  level: "大吉" | "上吉" | "中吉" | "小吉" | "平";
  tag: string;
  advice: string;
  luckySector: string;
  luckyIndicator: string;
}

const FORTUNES: FortuneSlip[] = [
  {
    level: "大吉",
    tag: "主力鎖籌 • 乘風破浪",
    advice: "盤面熱門標的量價齊揚，主力買盤堅定，可逢回檔沿短期均線加碼具備業績支撐之強勢股。",
    luckySector: "半導體高階製程 / AI 伺服器",
    luckyIndicator: "5日均線 (5MA) 向上斜率",
  },
  {
    level: "上吉",
    tag: "量縮打底 • 黃金交叉",
    advice: "低檔量縮整理完畢，技術指標即將低檔黃金交叉，宜分批佈局營收年增穩健之價值標的。",
    luckySector: "高速傳輸 / 網通光通訊",
    luckyIndicator: "KD 黃金交叉 (KD < 30)",
  },
  {
    level: "中吉",
    tag: "震盪洗盤 • 耐心守候",
    advice: "大盤處於區間箱型整理，切勿追高殺低，設定好支撐價位，逢低承接勝率較高。",
    luckySector: "高股息 ETF / 穩健金融龍頭",
    luckyIndicator: "布林通道中軌 (20MA)",
  },
  {
    level: "小吉",
    tag: "順勢操作 • 嚴設停損",
    advice: "資金輪動加速，盤中個股強弱分化明顯。盤前預設好 3-5% 停損點，保護資本為第一要務。",
    luckySector: "綠能儲能 / 重電自動化",
    luckyIndicator: "前波突破紅K實體低點",
  },
  {
    level: "平",
    tag: "觀望為上 • 靜待明朗",
    advice: "多空力道膠著，國際局勢或重磅財報公佈前夕，建議降低槓桿持股比例，保留現金彈性。",
    luckySector: "防禦型內需 / 醫療保健",
    luckyIndicator: "季線 (60MA) 防守關卡",
  },
];

const POKE_QUOTES = [
  "哎呀！被抓到了！胸前的純白大 V 字就是勝利反轉訊號！",
  "呼嚕呼嚕... 主力正在甩轎洗盤，抓緊別被甩出場！",
  "量化雷達全天候在線，偵測到主力爆量第一時間提醒你！",
  "摸一摸熊霸，下單不衝動，嚴守紀律穩健獲利！",
  "今天也是元氣滿滿的一天！多頭空頭都能找出獲利勝率！",
  "別盯盤盯太累，喝口水，好行情是等出來的！",
];

const Bear3DModel = dynamic(() => import("@/components/ui/Bear3DModel"), {
  ssr: false,
  loading: () => (
    <div className="w-[180px] h-[180px] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  ),
});

export default function TaiwanBearMascot() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("insight");
  const [hasAlert, setHasAlert] = useState(false);
  const [sentimentScore, setSentimentScore] = useState<number>(55);
  const [speechBubble, setSpeechBubble] = useState<string>("盤中即時掃描中...");
  
  // 互動狀態
  const [isBlinking, setIsBlinking] = useState(false);
  const [isPoked, setIsPoked] = useState(false);
  const [pokeCount, setPokeCount] = useState(0);
  const [energyLevel, setEnergyLevel] = useState(60);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [floatingParticles, setFloatingParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  
  // 抽籤狀態
  const [todayFortune, setTodayFortune] = useState<FortuneSlip | null>(null);
  const [isDrawingFortune, setIsDrawingFortune] = useState(false);

  // Web Audio 輕量音效生成器 (無外部音檔相依)
  const playSound = useCallback((type: "poke" | "fortune" | "ping" = "poke") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;

      if (type === "poke") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === "fortune") {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);
          gain.gain.setValueAtTime(0.08, now + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.22);
        });
      } else if (type === "ping") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // Audio context blocked or not permitted
    }
  }, [soundEnabled]);

  // 定期眨眼動畫
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 160);
    }, 3800);
    return () => clearInterval(blinkInterval);
  }, []);

  // 讀取市場情緒以決定黑熊心情
  useEffect(() => {
    const fetchSentiment = async () => {
      try {
        const res = await fetch("/api/market-sentiment");
        if (res.ok) {
          const data = await res.json();
          if (typeof data.overallScore === "number") {
            setSentimentScore(data.overallScore);
          }
        }
      } catch {
        // fallback to default
      }
    };
    fetchSentiment();
    const interval = setInterval(fetchSentiment, 120000);
    return () => clearInterval(interval);
  }, []);

  // 根據市場指數與情緒決定黑熊狀態
  const mood: BearMood = useMemo(() => {
    if (sentimentScore >= 65) return "BULLISH";
    if (sentimentScore <= 40) return "FEAR";
    return "NEUTRAL";
  }, [sentimentScore]);

  useEffect(() => {
    if (mood === "BULLISH") {
      setSpeechBubble("多頭氣勢如虹！胸前 V 字發光，跟緊主力 V 轉突破節奏！");
    } else if (mood === "FEAR") {
      setSpeechBubble("市場恐慌殺盤？別慌，真大戶都在暴跌找 V 轉黃金坑！");
    } else {
      setSpeechBubble("全市場監控中！盤整期耐心等待量化爆量突破訊號。");
    }
  }, [mood]);

  // 監聽即時雷達警報廣播
  useEffect(() => {
    const handleRadarAlert = () => {
      setHasAlert(true);
      playSound("ping");
      setSpeechBubble("主力突破訊號！偵測到爆量關鍵異動，點擊查看即時雷達。");
      setTimeout(() => setHasAlert(false), 15000);
    };

    window.addEventListener("stock_radar_alert", handleRadarAlert);
    return () => window.removeEventListener("stock_radar_alert", handleRadarAlert);
  }, [playSound]);

  // 戳熊互動
  const handlePokeBear = (e?: React.MouseEvent) => {
    setIsPoked(true);
    playSound("poke");
    setPokeCount((c) => c + 1);
    setEnergyLevel((prev) => Math.min(100, prev + 5));

    // 隨機話語
    const randomQuote = POKE_QUOTES[Math.floor(Math.random() * POKE_QUOTES.length)];
    setSpeechBubble(randomQuote);

    // 產生浮動愛心/星星粒子
    const id = Date.now() + Math.random();
    const x = e ? (e.clientX % 40) - 20 : 0;
    const y = e ? -30 : -25;
    setFloatingParticles((prev) => [...prev.slice(-6), { id, x, y }]);
    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== id));
    }, 900);

    setTimeout(() => setIsPoked(false), 550);
  };

  // 抽今日籤詩
  const handleDrawFortune = () => {
    if (isDrawingFortune) return;
    setIsDrawingFortune(true);
    playSound("fortune");

    setTimeout(() => {
      const drawn = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      setTodayFortune(drawn);
      setIsDrawingFortune(false);
      setEnergyLevel((prev) => Math.min(100, prev + 10));
    }, 750);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 select-none print:hidden flex flex-col items-end">
      {/* 1. 互動彈出式對話視窗 (Pop-over) */}
      {isOpen && (
        <div className="mb-3 w-84 sm:w-92 rounded-2xl border border-[var(--border)] bg-[var(--bg-glass)] shadow-2xl backdrop-blur-xl p-4 animate-slide-up text-primary">
          {/* 視窗頂部欄 */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-primary">熊霸 (V-Bear)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-semibold border border-amber-500/30">
                  AI 守護吉祥物
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSoundEnabled((prev) => !prev)}
                className="text-secondary hover:text-primary p-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                title={soundEnabled ? "音效開啟中 (點擊靜音)" : "音效已靜音 (點擊開啟)"}
              >
                {soundEnabled ? <Volume2 size={14} className="text-accent" /> : <VolumeX size={14} className="text-secondary" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-secondary hover:text-primary p-1 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                title="收合"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* 視窗頁籤切換 */}
          <div className="flex items-center gap-1 p-1 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border)] mb-3 text-xs">
            <button
              onClick={() => setActiveTab("insight")}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "insight"
                  ? "bg-[var(--bg-primary)] text-primary shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              <Compass size={13} />
              <span>今日盤勢</span>
            </button>
            <button
              onClick={() => setActiveTab("fortune")}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "fortune"
                  ? "bg-[var(--bg-primary)] text-primary shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              <Dices size={13} />
              <span>每日靈籤</span>
            </button>
            <button
              onClick={() => setActiveTab("interact")}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "interact"
                  ? "bg-[var(--bg-primary)] text-primary shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              <Heart size={13} />
              <span>熊霸互動</span>
            </button>
          </div>

          {/* 頁籤內容 1: 今日盤勢 (Insight) */}
          {activeTab === "insight" && (
            <div className="space-y-3">
              {/* 黑熊即時心語 */}
              <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <div className="flex items-start gap-2.5">
                  <div
                    onClick={(e) => handlePokeBear(e)}
                    className="w-9 h-9 rounded-full bg-slate-900 border border-amber-400/50 flex-shrink-0 flex items-center justify-center text-xs font-black text-amber-400 shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                    title="點我互動"
                  >
                    V
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary leading-relaxed">
                      {speechBubble}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-secondary">
                      <div className="flex items-center gap-1.5">
                        <span>市場情緒:</span>
                        <span className="font-mono font-bold text-primary">{Number(sentimentScore).toFixed(2)}</span>
                        <span className="text-[10px] text-muted">/100</span>
                      </div>
                      <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                        mood === "BULLISH"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          : mood === "FEAR"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      }`}>
                        {mood === "BULLISH" ? "多方主導" : mood === "FEAR" ? "防禦觀望" : "量縮整理"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 快捷行動按鈕 */}
              <div className="space-y-1.5 text-xs">
                <Link
                  href="/alerts"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 hover:border-emerald-500 transition-all font-semibold text-emerald-700 dark:text-emerald-300 group"
                >
                  <div className="flex items-center gap-2">
                    <Bell size={14} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span>綁定 LINE 官方推播 (開通 14 天 Pro)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded">
                    FREE
                  </span>
                </Link>

                <Link
                  href="/capital-flow"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--border)] border border-[var(--border)] transition-all text-secondary hover:text-primary"
                >
                  <div className="flex items-center gap-2">
                    <Flame size={14} className="text-rose-500" />
                    <span>全市場 ETF 聯手大買 TOP 8</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted">盤後籌碼 →</span>
                </Link>

                <Link
                  href="/dca"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--border)] border border-[var(--border)] transition-all text-secondary hover:text-primary"
                >
                  <div className="flex items-center gap-2">
                    <Calculator size={14} className="text-accent" />
                    <span>定期定額複利收益試算器</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted">試算 →</span>
                </Link>
              </div>
            </div>
          )}

          {/* 頁籤內容 2: 每日靈籤 (Fortune) */}
          {activeTab === "fortune" && (
            <div className="space-y-3">
              {todayFortune ? (
                <div className="p-3.5 rounded-xl bg-[var(--bg-tertiary)] border border-amber-500/30 space-y-2.5 animate-scale-up">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                        {todayFortune.level}
                      </span>
                      <span className="font-bold text-xs text-primary">{todayFortune.tag}</span>
                    </div>
                    <button
                      onClick={handleDrawFortune}
                      disabled={isDrawingFortune}
                      className="text-secondary hover:text-primary p-1 rounded hover:bg-[var(--border)] transition-colors text-[11px] flex items-center gap-1"
                      title="重抽靈籤"
                    >
                      <RotateCcw size={12} className={isDrawingFortune ? "animate-spin" : ""} />
                      <span>重抽</span>
                    </button>
                  </div>

                  <p className="text-xs text-secondary leading-relaxed">
                    {todayFortune.advice}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                      <div className="text-[10px] text-muted font-medium">聚焦族群</div>
                      <div className="font-bold text-primary truncate mt-0.5">{todayFortune.luckySector}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                      <div className="text-[10px] text-muted font-medium">防守關鍵</div>
                      <div className="font-bold text-primary truncate mt-0.5">{todayFortune.luckyIndicator}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 px-4 rounded-xl bg-[var(--bg-tertiary)] border border-dashed border-[var(--border)]">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Dices size={24} className={isDrawingFortune ? "animate-bounce" : ""} />
                  </div>
                  <h4 className="font-bold text-sm text-primary mb-1">今日操盤靈籤</h4>
                  <p className="text-xs text-secondary mb-3.5">
                    讓黑熊依據即時量化與多空規律，為你抽取今日操盤戰術靈感！
                  </p>
                  <button
                    onClick={handleDrawFortune}
                    disabled={isDrawingFortune}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>{isDrawingFortune ? "熊霸感應抽籤中..." : "立即抽取今日靈籤"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 頁籤內容 3: 熊霸互動 (Interact - 內嵌 3D 互動手辦模型) */}
          {activeTab === "interact" && (
            <div className="space-y-3">
              {/* 3D 熊霸立體手辦互動視窗 */}
              <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-tertiary)] border border-[var(--border)] overflow-hidden shadow-inner">
                <div className="text-[10px] text-muted font-mono mb-1 flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" />
                  <span>3D 手辦模式（按住可 360° 旋轉）</span>
                </div>
                <Bear3DModel size={190} compact={true} interactive={true} showQuote={false} />
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] space-y-3">
                {/* 能量條與好感度 */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-primary flex items-center gap-1.5">
                      <Zap size={13} className="text-amber-500" />
                      <span>量化靈魂能量</span>
                    </span>
                    <span className="font-mono font-bold text-accent">{Number(energyLevel).toFixed(2)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-emerald-500 transition-all duration-500 rounded-full"
                      style={{ width: `${energyLevel}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                    <div className="text-[10px] text-muted">今日撫摸次數</div>
                    <div className="font-mono font-bold text-base text-primary mt-0.5">{pokeCount} 次</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
                    <div className="text-[10px] text-muted">守護等級</div>
                    <div className="font-mono font-bold text-base text-emerald-500 mt-0.5">
                      LV.{Math.floor(pokeCount / 5) + 1}
                    </div>
                  </div>
                </div>

                {/* 戳戳按鈕 */}
                <button
                  onClick={(e) => handlePokeBear(e)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 text-amber-400 hover:bg-slate-800 border border-amber-400/30 font-bold text-xs shadow transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <Heart size={14} className="text-rose-500 group-hover:scale-125 transition-transform" />
                  <span>撫摸熊霸 (充填能量與觸發對話)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. 懸浮常駐吉祥物圖示 (Formosan Black Bear) */}
      <div className="relative group">
        {/* 常駐小氣泡提醒（未點開時偶爾冒泡） */}
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="absolute -top-10 right-0 whitespace-nowrap bg-[var(--bg-glass)] text-primary text-[11px] font-bold py-1 px-2.5 rounded-full border border-[var(--border)] shadow-md backdrop-blur-md cursor-pointer hover:border-accent transition-all animate-bounce flex items-center gap-1.5"
          >
            {hasAlert ? (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            ) : (
              <Sparkles size={11} className="text-amber-400" />
            )}
            <span>{hasAlert ? "主力異動！" : "看今日解盤"}</span>
          </div>
        )}

        {/* 浮動點擊粒子特效 (Heart/Star) */}
        {floatingParticles.map((p) => (
          <div
            key={p.id}
            className="absolute pointer-events-none text-rose-500 z-50 animate-bounce"
            style={{
              top: `${p.y}px`,
              left: `${20 + p.x}px`,
              animation: "bearPokeBounce 0.8s ease-out forwards",
            }}
          >
            <Sparkles size={16} className="text-amber-400 fill-amber-400" />
          </div>
        ))}

        {/* 台灣黑熊實體按鈕 (精緻 SVG 動畫，呼吸 + 眨眼 + 耳朵律動 + 戳擊彈跳) */}
        <button
          onClick={(e) => {
            if (!isOpen) {
              setIsOpen(true);
            } else {
              handlePokeBear(e);
            }
            setHasAlert(false);
          }}
          className={`relative p-1.5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer border ${
            isPoked ? "bear-poked" : "bear-idle"
          } ${
            hasAlert
              ? "bg-gradient-to-tr from-rose-600 to-amber-500 border-amber-300 ring-4 ring-rose-500/30"
              : mood === "BULLISH"
              ? "bg-gradient-to-tr from-slate-900 via-slate-900 to-rose-950 border-rose-500/60 ring-2 ring-rose-500/20"
              : mood === "FEAR"
              ? "bg-gradient-to-tr from-slate-900 via-slate-900 to-emerald-950 border-emerald-500/60 ring-2 ring-emerald-500/20"
              : "bg-slate-900 border-amber-400/50 hover:border-amber-400"
          }`}
          title="點擊與台灣黑熊「熊霸」互動，查看今日解盤與靈籤"
        >
          {/* 頂級手辦級台灣黑熊 SVG */}
          <svg
            className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-xl overflow-visible"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* 頭部與身體黑曜石立體球形漸層 */}
              <radialGradient id="bearBodyGrad" cx="40%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="35%" stopColor="#1e293b" />
                <stop offset="75%" stopColor="#0b0f17" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>

              {/* 耳窩粉嫩肉球漸層 */}
              <radialGradient id="bearEarInnerGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#fecdd3" />
                <stop offset="60%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#e11d48" />
              </radialGradient>

              {/* 口鼻部奶油米白立體漸層 */}
              <radialGradient id="bearMuzzleGrad" cx="45%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="65%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </radialGradient>

              {/* 瞳孔深邃水潤漸層 */}
              <radialGradient id="bearEyeGrad" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="40%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>

              {/* 腮紅柔和漸層 */}
              <radialGradient id="bearBlushGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.55" />
                <stop offset="70%" stopColor="#fb7185" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
              </radialGradient>

              {/* 胸前純白立體大 V 領陰影微光 */}
              <filter id="vGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.4" />
              </filter>
            </defs>

            {/* 左耳與右耳 (帶微幅 ear-wiggle 擺動動畫與立體外圈) */}
            <g className="bear-ear-wiggle origin-[24px_24px]">
              <circle cx="24" cy="24" r="14" fill="url(#bearBodyGrad)" stroke="#475569" strokeWidth="1.5" />
              <circle cx="24" cy="24" r="8.5" fill="url(#bearEarInnerGrad)" opacity="0.9" />
            </g>
            <g className="bear-ear-wiggle origin-[76px_24px]">
              <circle cx="76" cy="24" r="14" fill="url(#bearBodyGrad)" stroke="#475569" strokeWidth="1.5" />
              <circle cx="76" cy="24" r="8.5" fill="url(#bearEarInnerGrad)" opacity="0.9" />
            </g>

            {/* 科技耳機天線 (量化雷達感應器) */}
            <path
              d="M 22 17 Q 50 4 78 17"
              stroke={hasAlert ? "#f43f5e" : "#38bdf8"}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
            <circle
              cx="50"
              cy="7.5"
              r="4"
              fill={hasAlert ? "#f43f5e" : "#38bdf8"}
              className={hasAlert ? "animate-ping" : ""}
            />
            <circle cx="50" cy="7.5" r="2.5" fill="#ffffff" />

            {/* 頭部主體 (手辦級圓潤膠囊立體球形) */}
            <rect
              x="13"
              y="19"
              width="74"
              height="70"
              rx="37"
              fill="url(#bearBodyGrad)"
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* 頭頂高光光澤弧線 (手辦 PVC 質感) */}
            <path
              d="M 28 26 Q 50 20 72 26"
              stroke="#94a3b8"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.25"
              fill="none"
            />

            {/* 圓滾滾粉嫩紅暈 */}
            <circle cx="27" cy="61" r="7" fill="url(#bearBlushGrad)" />
            <circle cx="73" cy="61" r="7" fill="url(#bearBlushGrad)" />

            {/* 靈動大眼睛 (支援自動眨眼動畫與星芒高光) */}
            {isBlinking ? (
              // 眨眼閉眼弧線
              <>
                <path d="M 32 46 Q 38 49 44 46" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M 56 46 Q 62 49 68 46" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" fill="none" />
              </>
            ) : mood === "BULLISH" ? (
              // 歡樂笑瞇眼 (弧線)
              <>
                <path d="M 31 47 Q 38 40 45 47" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M 55 47 Q 62 40 69 47" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              </>
            ) : mood === "FEAR" ? (
              // 堅定專注大眼 (立體漸層瞳孔 + 銳利雙高光)
              <>
                <circle cx="38" cy="46" r="6" fill="#f8fafc" />
                <circle cx="38.5" cy="46" r="4.2" fill="url(#bearEyeGrad)" />
                <circle cx="37" cy="44" r="1.6" fill="#ffffff" />
                <circle cx="40" cy="47.5" r="0.8" fill="#38bdf8" />

                <circle cx="62" cy="46" r="6" fill="#f8fafc" />
                <circle cx="61.5" cy="46" r="4.2" fill="url(#bearEyeGrad)" />
                <circle cx="60" cy="44" r="1.6" fill="#ffffff" />
                <circle cx="63" cy="47.5" r="0.8" fill="#38bdf8" />
              </>
            ) : (
              // 智慧探索眼 (深邃大眼 + 雙點靈動高光)
              <>
                <circle cx="38" cy="46" r="5.8" fill="#ffffff" />
                <circle cx="38.5" cy="46" r="4.2" fill="url(#bearEyeGrad)" />
                <circle cx="37" cy="44.2" r="1.6" fill="#ffffff" />
                <circle cx="40" cy="47.5" r="0.7" fill="#ffffff" opacity="0.8" />

                <circle cx="62" cy="46" r="5.8" fill="#ffffff" />
                <circle cx="61.5" cy="46" r="4.2" fill="url(#bearEyeGrad)" />
                <circle cx="60" cy="44.2" r="1.6" fill="#ffffff" />
                <circle cx="63" cy="47.5" r="0.7" fill="#ffffff" opacity="0.8" />
              </>
            )}

            {/* 立體口鼻部 (立體米白奶油微凸橢圓) */}
            <ellipse cx="50" cy="58" rx="14.5" ry="10.5" fill="url(#bearMuzzleGrad)" stroke="#cbd5e1" strokeWidth="0.8" />
            
            {/* 黑熊黑色立體三角小鼻子 (帶高光點) */}
            <path d="M 44.5 53.5 Q 50 51.5 55.5 53.5 Q 50 60 44.5 53.5 Z" fill="#090d16" />
            <circle cx="49" cy="54" r="0.8" fill="#94a3b8" />

            {/* 療癒微笑小嘴 */}
            <path d="M 46.5 61.5 Q 50 64.5 53.5 61.5" stroke="#090d16" strokeWidth="1.8" strokeLinecap="round" fill="none" />

            {/* ★ 核心靈魂：胸前巨大純白立體「V」字胸標 (正宗台灣黑熊標誌，永久純白，帶手辦陰影) ★ */}
            <path
              d="M 33 75 L 50 91 L 67 75"
              stroke="#ffffff"
              strokeWidth="6.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter="url(#vGlow)"
            />
          </svg>

          {/* 右上角警報未讀小徽章 */}
          {hasAlert && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-[9px] font-black text-white">
              !
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
