"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Tabs from "@/components/ui/Tabs";
import QuantPage from "@/app/quant/page";
import BacktestPage from "@/app/backtest/page";
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
  const PAGE_SIZE = 10;

  // 變更條件或手動強制刷新
  const refetch = (fn?: () => void, forceRefresh = false) => {
    setLoading(true); setError(''); setRationale(''); setAiError('');
    fn?.();
    setForceNext(forceRefresh);
    setPage(0);
    setNonce(n => n + 1);
  };

  useEffect(() => {
    let alive = true;
    const isForce = forceNext;
    setForceNext(false);

    apiResearch.getRecommendations({
      market,
      style,
      top: 30,
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

  const pool = allPicks.length > 0 ? allPicks : picks;
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
            {generatedAt && <span className="ml-2 text-xs text-[var(--accent)] font-mono">⚡ 最新運算時間：{generatedAt}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {totalPages > 1 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(p => (p + 1) % totalPages)}
              title="輪流探索股票池內其他高評分潛力標的"
            >
              <RotateCw size={14} className="mr-1" />
              換一批 (第 {page + 1}/{totalPages} 批)
            </Button>
          )}
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
                    <span className="text-secondary">{p.name !== p.symbol ? p.name : ''}</span>
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
                {p.symbol} {p.name !== p.symbol ? p.name : ''} <span className="text-secondary">({p.score})</span>
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
