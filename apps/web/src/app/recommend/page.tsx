"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import QuantPage from "@/app/quant/page";
import BacktestPage from "@/app/backtest/page";
import LowPricePotentialScreener from "@/components/recommend/LowPricePotentialScreener";
import { apiResearch, apiErrorMessage } from "@/lib/api";
import { getChangeColorClass } from "@/lib/utils";
import { Sparkles, RefreshCw, RotateCw, Layers } from "lucide-react";
import { Term } from "@/components/ui/TermTooltip";

interface Pick {
  symbol: string;
  name: string;
  market: 'TW' | 'US';
  industry: string;
  price: number;
  change_pct: number;
  ret_20d: number;
  score: number;
  scores: { tech: number | null; chips: number | null; growth: number | null };
  action: string;
  signals: string[];
  entry_zone: [number, number];
  stop_loss: number;
  target: number;
  volatility_pct: number;
}

const CHINESE_NAME_FALLBACK: Record<string, string> = {
  // 台股重要權值與代表股
  "2330": "台積電", "2317": "鴻海", "2454": "聯發科", "2382": "廣達", "3231": "緯創",
  "2308": "台達電", "2881": "富邦金", "2882": "國泰金", "2891": "中信金", "2303": "聯電",
  "3711": "日月光投控", "2412": "中華電", "2603": "長榮", "2609": "陽明", "2615": "萬海",
  "3037": "欣興", "2357": "華碩", "3017": "奇鋐", "2376": "技嘉", "6669": "緯穎",
  "2356": "英業達", "2383": "台光電", "1519": "華城", "1503": "士電", "1513": "中興電",
  "1514": "亞力", "1609": "大亞", "6806": "森崴能源", "3045": "台灣大", "4904": "遠傳",
  "2345": "智邦", "5388": "中磊", "3450": "聯鈞", "4977": "眾達-KY", "2886": "兆豐金",
  "2884": "玉山金", "2892": "第一金", "2880": "華南金", "5880": "合庫金", "2618": "長榮航",
  "2610": "華航", "1301": "台塑", "1303": "南亞", "1326": "台化", "2002": "中鋼",
  "1101": "台泥", "1216": "統一", "2207": "和泰車", "2201": "裕隆", "1590": "亞德客-KY",
  "2049": "上銀", "2359": "所羅門", "4583": "台灣精銳", "6446": "藥華藥", "4743": "合一",
  "1760": "寶齡富錦", "4128": "中天", "6547": "高端疫苗", "3443": "創意", "3661": "世芯-KY",
  "3035": "智原", "6488": "環球晶", "2379": "瑞昱", "3034": "聯詠", "8069": "元太",
  "3293": "鈊象", "5347": "世界", "3324": "雙鴻", "8299": "群聯", "6223": "旺矽",
  "3529": "力旺", "6187": "萬潤", "5483": "中美晶", "3105": "穩懋", "3680": "家登",
  "3131": "弘塑", "6274": "台燿", "8358": "金居", "2409": "友達", "3481": "群創",
  "6116": "彩晶", "2449": "京元電子", "2344": "華邦電", "2388": "威盛", "2458": "義隆",
  // 美股科技與主流股 (一律顯示正體中文)
  "NVDA": "輝達", "MSFT": "微軟", "AAPL": "蘋果", "GOOGL": "Alphabet (谷歌)", "GOOG": "谷歌",
  "AMZN": "亞馬遜", "META": "Meta (臉書)", "AVGO": "博通", "TSM": "台積電 ADR",
  "AMD": "超微", "INTC": "英特爾", "QCOM": "高通", "MU": "美光", "ASML": "艾司摩爾",
  "AMAT": "應用材料", "ARM": "安謀", "MRVL": "邁威爾", "TSLA": "特斯拉", "PLTR": "Palantir",
  "SMH": "費半 ETF", "SOXX": "半導體 ETF", "QQQ": "那斯達克 ETF", "SPY": "標普500 ETF",
};

function getDisplayName(symbol: string, rawName?: string): string {
  const code = symbol.replace(/\.(TW|TWO)$/i, "").toUpperCase();
  if (rawName && rawName !== symbol && rawName !== code) {
    if (CHINESE_NAME_FALLBACK[code]) return CHINESE_NAME_FALLBACK[code];
    return rawName;
  }
  return CHINESE_NAME_FALLBACK[code] || CHINESE_NAME_FALLBACK[symbol] || rawName || symbol;
}

const STYLES = [
  { id: 'balanced', label: '均衡多因子', desc: '技術35% 籌碼35% 成長30% 均衡篩選' },
  { id: 'momentum', label: '強勢動能', desc: '偏重創高突破、均線多頭、RSI動能與價量齊揚' },
  { id: 'growth', label: '營收成長', desc: '偏重近季營收高年增爆發與最新單月成長加速' },
  { id: 'chips', label: '籌碼追蹤', desc: '偏重外資投信土洋同步大額買超與籌碼集中度' },
];
const MARKETS = [{ id: 'tw', label: '台股' }, { id: 'us', label: '美股' }, { id: 'all', label: '全部' }];

const scoreColor = (s: number) => (s >= 75 ? 'text-green-500' : s >= 60 ? 'text-yellow-500' : 'text-secondary');

function Bar({ label, term, v }: { label: string; term?: string; v: number | null }) {
  if (v == null) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 text-secondary">{term ? <Term term={term} label={label} /> : label}</span>
      <div className="flex-1 h-1.5 rounded bg-[var(--bg-tertiary)]">
        <div className="h-full rounded bg-[var(--accent)]" style={{ width: `${v}%` }} />
      </div>
      <span className="w-6 text-right">{v}</span>
    </div>
  );
}

export default function RecommendPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight mb-1">AI 選股與量化策略中心</h1>
        <p className="text-secondary text-sm">
          整合多因子 AI 選股推薦、全市場技術指標量化掃描與歷史策略回測驗證
        </p>
      </header>

      <Tabs
        tabs={[
          {
            id: "ai-picks",
            label: "AI 多因子選股推薦",
            content: <RecommendInner />,
          },
          {
            id: "low-price-potential",
            label: "低價潛力股發掘",
            content: <LowPricePotentialScreener />,
          },
          {
            id: "quant-scan",
            label: "量化技術掃描器",
            content: <QuantPage />,
          },
          {
            id: "backtest",
            label: "歷史策略回測",
            content: <BacktestPage />,
          },
        ]}
      />
    </div>
  );
}

function RecommendInner() {
  const [market, setMarket] = useState('tw');
  const [style, setStyle] = useState('balanced');
  const [universe, setUniverse] = useState('curated');
  const [picks, setPicks] = useState<Pick[]>([]);
  const [allPicks, setAllPicks] = useState<Pick[]>([]);
  const [avoid, setAvoid] = useState<Pick[]>([]);
  const [meta, setMeta] = useState({ universe: 0, evaluated: 0 });
  const [notes, setNotes] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rationale, setRationale] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const [nonce, setNonce] = useState(0);
  const [forceNext, setForceNext] = useState(false);
  const [page, setPage] = useState(0);
  const [sortCriteria, setSortCriteria] = useState<'score' | 'momentum' | 'chips' | 'growth' | 'shuffle'>('score');
  const [shuffleNonce, setShuffleNonce] = useState(0);
  const PAGE_SIZE = 10;

  // 變更條件或手動強制刷新
  const refetch = (fn?: () => void, forceRefresh = false) => {
    setLoading(true); setError(''); setRationale(''); setAiError('');
    fn?.();
    setForceNext(forceRefresh);
    setPage(0);
    setShuffleNonce(n => n + 1);
    setNonce(n => n + 1);
  };

  useEffect(() => {
    let alive = true;
    const isForce = forceNext;
    setForceNext(false);

    apiResearch.getRecommendations({
      market,
      style,
      top: 40,
      universe,
      refresh: isForce,
      _t: isForce ? Date.now() : undefined,
    })
      .then(r => {
        if (!alive) return;
        const rawAll = (r.data.all_picks && r.data.all_picks.length > 0) ? r.data.all_picks : (r.data.picks || []);
        setAllPicks(rawAll);
        setPicks(r.data.picks || []);
        setAvoid(r.data.avoid || []);
        setMeta({ universe: r.data.universe, evaluated: r.data.evaluated });
        setNotes(r.data.notes || []);
        if (r.data.generated_at) {
          try {
            const d = new Date(r.data.generated_at);
            setGeneratedAt(d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
          } catch {
            setGeneratedAt('');
          }
        }
      })
      .catch(e => alive && setError(apiErrorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [market, style, universe, nonce]);

  const sortedPool = useMemo(() => {
    const base = [...(allPicks.length > 0 ? allPicks : picks)];
    if (base.length === 0) return [];

    if (sortCriteria === 'momentum') {
      return base.sort((a, b) => (b.change_pct || 0) - (a.change_pct || 0) || (b.ret_20d || 0) - (a.ret_20d || 0));
    }
    if (sortCriteria === 'chips') {
      return base.sort((a, b) => (b.scores?.chips ?? b.score) - (a.scores?.chips ?? a.score));
    }
    if (sortCriteria === 'growth') {
      return base.sort((a, b) => (b.scores?.growth ?? b.score) - (a.scores?.growth ?? a.score));
    }
    if (sortCriteria === 'shuffle') {
      const arr = [...base];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    return base.sort((a, b) => b.score - a.score);
  }, [allPicks, picks, sortCriteria, shuffleNonce]);

  const pool = sortedPool;
  const totalPages = Math.max(1, Math.ceil(pool.length / PAGE_SIZE));
  const displayedPicks = pool.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const startRank = page * PAGE_SIZE;

  const explain = async () => {
    setAiLoading(true); setAiError('');
    try {
      const r = await apiResearch.explainRecommendations({ market, style, universe });
      setRationale(r.data.rationale);
    } catch (e) {
      setAiError(apiErrorMessage(e));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold">股票推薦</h1>
          <p className="text-sm text-secondary mt-1">
            多因子量化評分（技術面 + 籌碼面 + 營收成長），真實市場數據客觀計分。
            {meta.evaluated > 0 && ` 已評估 ${meta.evaluated}/${meta.universe} 檔。`}
            {generatedAt && <span className="ml-2 text-xs text-[var(--accent)] font-mono">運算時間：{generatedAt}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShuffleNonce(n => n + 1);
              setPage(p => (p + 1) % totalPages);
            }}
            title="輪流探索股票池內其他高評分潛力標的"
          >
            <RotateCw size={14} className="mr-1" />
            換一批 (第 {page + 1}/{totalPages} 批)
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch(undefined, true)}
            isLoading={loading}
            title="清除後端快取，強制抓取最新盤中價與法人數據重新計算"
          >
            <RefreshCw size={14} className="mr-1" />
            重新篩選 (強制刷新)
          </Button>
          <Button size="sm" onClick={explain} isLoading={aiLoading} disabled={!displayedPicks.length}>
            <Sparkles size={14} className="mr-1" />
            AI 推薦理由
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <div className="flex gap-2 items-center">
          <span className="text-secondary">市場</span>
          {MARKETS.map(m => (
            <button key={m.id} onClick={() => refetch(() => setMarket(m.id))}
              className={`px-3 py-1 rounded-md border ${market === m.id ? 'border-[var(--accent)] text-accent' : 'border-[var(--border)] text-secondary'}`}>{m.label}</button>
          ))}
        </div>
        {market !== 'us' && (
          <div className="flex gap-2 items-center">
            <span className="text-secondary">股票池</span>
            {[{ id: 'curated', label: '產業代表股', tip: '內建各產業大型代表股' }, { id: 'hot', label: '全市場熱門 60', tip: '上市+上櫃當日成交值前 60 名' }].map(u => (
              <button key={u.id} title={u.tip} onClick={() => refetch(() => setUniverse(u.id))}
                className={`px-3 py-1 rounded-md border ${universe === u.id ? 'border-[var(--accent)] text-accent' : 'border-[var(--border)] text-secondary'}`}>{u.label}</button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center flex-wrap">
          <span className="text-secondary">風格</span>
          {STYLES.map(s => (
            <button key={s.id} onClick={() => refetch(() => setStyle(s.id))} title={s.desc}
              className={`px-3 py-1 rounded-md border ${style === s.id ? 'border-[var(--accent)] text-accent' : 'border-[var(--border)] text-secondary'}`}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* 排序維度過濾標籤 */}
      <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-[var(--border)]">
        <span className="text-secondary font-medium">排序方式：</span>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSortCriteria('score')}
            className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
              sortCriteria === 'score'
                ? 'bg-accent/15 text-accent border border-accent/30 font-bold'
                : 'text-secondary hover:text-primary'
            }`}
          >
            綜合評分榜
          </button>
          <button
            onClick={() => setSortCriteria('momentum')}
            className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
              sortCriteria === 'momentum'
                ? 'bg-red-500/15 text-red-400 border border-red-500/30 font-bold'
                : 'text-secondary hover:text-primary'
            }`}
          >
            強勢動能榜
          </button>
          <button
            onClick={() => setSortCriteria('chips')}
            className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
              sortCriteria === 'chips'
                ? 'bg-accent/15 text-accent border border-accent/30 font-bold'
                : 'text-secondary hover:text-primary'
            }`}
          >
            主力籌碼集中榜
          </button>
          <button
            onClick={() => setSortCriteria('growth')}
            className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
              sortCriteria === 'growth'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold'
                : 'text-secondary hover:text-primary'
            }`}
          >
            營收成長榜
          </button>
          <button
            onClick={() => {
              setSortCriteria('shuffle');
              setShuffleNonce(n => n + 1);
            }}
            className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors ${
              sortCriteria === 'shuffle'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold'
                : 'text-secondary hover:text-primary'
            }`}
          >
            隨機探索標的
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading && <div className="text-secondary text-center py-16">正在掃描並評分（首次約需 20～40 秒，之後 20 分鐘內使用快取）...</div>}

      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {displayedPicks.map((p, i) => (
            <Card key={p.symbol}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-secondary text-sm">#{startRank + i + 1}</span>
                    <Link href={`/stock/${p.symbol}`} className="text-lg font-bold hover:text-accent">{p.symbol}</Link>
                    <span className="text-secondary font-medium">{getDisplayName(p.symbol, p.name)}</span>
                    {p.industry && <span style={{ fontSize: 10 }} className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)]">{p.industry}</span>}
                  </div>
                  <div className="text-sm mt-1">
                    <span className="font-medium">{p.price}</span>
                    <span className={`ml-2 ${getChangeColorClass(p.change_pct, p.market)}`}>{p.change_pct > 0 ? '+' : ''}{p.change_pct}%</span>
                    <span className="ml-3 text-secondary">20日 {p.ret_20d > 0 ? '+' : ''}{p.ret_20d}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${scoreColor(p.score)}`}>{p.score}</div>
                  <div className="text-xs text-secondary">綜合評分</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Bar label="技術" term="ma" v={p.scores.tech} />
                <Bar label="籌碼" term="institutional_net" v={p.scores.chips} />
                <Bar label="成長" term="rev_yoy" v={p.scores.growth} />
              </div>
              <div className="mt-3 text-sm font-medium">{p.action}</div>
              <ul className="mt-1 text-xs text-secondary space-y-0.5 list-disc pl-4">
                {p.signals.slice(0, 6).map((s, j) => <li key={j}>{s}</li>)}
              </ul>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-center">
                <div className="rounded bg-[var(--bg-tertiary)] p-2">
                  <div className="text-secondary"><Term term="entry_zone" label="參考進場" /></div>
                  {p.entry_zone[0]} ~ {p.entry_zone[1]}
                </div>
                <div className="rounded bg-[var(--bg-tertiary)] p-2">
                  <div className="text-secondary"><Term term="stop_loss" label="停損" /></div>
                  {p.stop_loss}
                </div>
                <div className="rounded bg-[var(--bg-tertiary)] p-2">
                  <div className="text-secondary"><Term term="target_price" label="目標" /></div>
                  {p.target}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {aiError && <div className="text-red-500 text-sm">{aiError}</div>}
      {rationale && (
        <Card title="AI 推薦理由（前 5 名）">
          <div className="ai-report-prose prose prose-invert max-w-none text-sm p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]"><ReactMarkdown>{rationale}</ReactMarkdown></div>
        </Card>
      )}

      {!loading && avoid.length > 0 && (
        <Card title="相對偏弱，暫不建議追">
          <div className="flex flex-wrap gap-3 text-sm">
            {avoid.map(p => (
              <Link key={p.symbol} href={`/stock/${p.symbol}`} className="px-3 py-1 rounded-md bg-[var(--bg-tertiary)]">
                {p.symbol} {getDisplayName(p.symbol, p.name)} <span className="text-secondary">({p.score})</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <p className="text-xs text-secondary">
        進場區間、停損、目標價以 <Term term="atr" label="ATR（平均真實波幅）" /> 估算：停損 = 現價 − 2×ATR，目標 = 現價 + 3×ATR。推薦清單來自你所選的股票池（產業代表股或全市場成交值前 60 名），僅供研究參考，非投資建議。
      </p>
    </div>
  );
}
