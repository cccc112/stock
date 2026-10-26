"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiResearch, apiErrorMessage } from "@/lib/api";
import { getChangeColorClass } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine 
} from "recharts";
import { 
  Sparkles, 
  Flame, 
  Compass, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2
} from "lucide-react";

interface Industry {
  industry: string;
  market: 'TW' | 'US';
  members: number;
  ret_1d: number; 
  ret_5d: number; 
  ret_20d: number; 
  ret_60d: number;
  breadth_up_pct: number;
  above_ma20_pct: number;
  avg_tech_score: number;
  leader: { symbol: string; name: string; ret_20d: number };
  laggard: { symbol: string; name: string; ret_20d: number };
}

interface Member {
  symbol: string; 
  name: string; 
  market: 'TW' | 'US'; 
  price: number; 
  change_pct: number;
  ret_20d: number; 
  score: number; 
  revenue_yoy_3m?: number | null; 
  signals: string[];
}

type TimeHorizon = '1d' | '5d' | '20d' | '60d';

const TIME_OPTIONS: { id: TimeHorizon; label: string; desc: string }[] = [
  { id: '1d', label: '今日即時 (1D)', desc: '當日盤中即時資金進出與強弱' },
  { id: '5d', label: '近 1 週 (5D)', desc: '短線 5 個交易日法人資金動向' },
  { id: '20d', label: '近 1 月 (20D)', desc: '中線月線級別主流板塊輪動' },
  { id: '60d', label: '近 1 季 (60D)', desc: '長線季度產業基本面趨勢' },
];

const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;

export default function IndustryPage() {
  const [list, setList] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('20d');
  const [marketFilter, setMarketFilter] = useState<'ALL' | 'TW' | 'US'>('ALL');
  
  const [selected, setSelected] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [report, setReport] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    apiResearch.getIndustries()
      .then(r => setList(r.data.industries))
      .catch(e => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const open = async (name: string) => {
    setSelected(name); 
    setReport(''); 
    setReportError(''); 
    setDetailLoading(true);
    try {
      const r = await apiResearch.getIndustry(name);
      setMembers(r.data.members);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const genReport = async () => {
    if (!selected) return;
    setReportLoading(true); 
    setReportError('');
    try {
      const r = await apiResearch.getIndustryReport(selected);
      setReport(r.data.report);
    } catch (e) {
      setReportError(apiErrorMessage(e));
    } finally {
      setReportLoading(false);
    }
  };

  // 依據選擇之時間區段動態計算與排序
  const processedList = useMemo(() => {
    let filtered = list;
    if (marketFilter !== 'ALL') {
      filtered = list.filter(i => i.market === marketFilter);
    }

    return [...filtered].sort((a, b) => {
      const retA = a[`ret_${timeHorizon}` as keyof Industry] as number;
      const retB = b[`ret_${timeHorizon}` as keyof Industry] as number;
      return retB - retA;
    });
  }, [list, timeHorizon, marketFilter]);

  // 準備圖表資料
  const chartData = useMemo(() => {
    return processedList.map(item => ({
      industry: item.industry,
      market: item.market,
      ret: item[`ret_${timeHorizon}` as keyof Industry] as number,
      above_ma20: item.above_ma20_pct,
      tech_score: item.avg_tech_score,
      members: item.members,
    }));
  }, [processedList, timeHorizon]);

  // 四象限資金輪動分類 (RRG Quadrant Classification)
  const quadrants = useMemo(() => {
    const leading: Industry[] = [];    // 🔥 領先強勢區：漲幅 > 0 且站上月線 >= 50%
    const improving: Industry[] = [];  // 🚀 潛力轉強區：漲幅 <= 0 但站上月線 >= 50% 或技術分高
    const weakening: Industry[] = [];  // 💤 高檔震盪區：漲幅 > 0 但跌破月線 (< 50%)
    const lagging: Industry[] = [];    // ⚠️ 弱勢落後區：漲幅 <= 0 且破月線

    processedList.forEach(ind => {
      const r = ind[`ret_${timeHorizon}` as keyof Industry] as number;
      const ma = ind.above_ma20_pct;
      if (r >= 0 && ma >= 50) {
        leading.push(ind);
      } else if (r < 0 && ma >= 50) {
        improving.push(ind);
      } else if (r >= 0 && ma < 50) {
        weakening.push(ind);
      } else {
        lagging.push(ind);
      }
    });

    return { leading, improving, weakening, lagging };
  }, [processedList, timeHorizon]);

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* 頁面標題與簡介 */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="text-accent" />
            產業資金輪動與多空矩陣
          </h1>
          <p className="text-sm text-secondary mt-1">
            全市場各產業資金流向強弱排行、多空四象限輪動矩陣與成分股穿透診斷
          </p>
        </div>

        {/* 時間區段切換按鈕組 */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-sm">
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setTimeHorizon(opt.id)}
              title={opt.desc}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                timeHorizon === opt.id
                  ? 'bg-[var(--accent)] text-white shadow-md shadow-accent/25'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 市場切換標籤 */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-secondary">市場篩選：</span>
        {(['ALL', 'TW', 'US'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMarketFilter(m)}
            className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              marketFilter === m
                ? 'border-[var(--accent)] text-accent bg-accent/10'
                : 'border-[var(--border)] text-secondary hover:text-primary'
            }`}
          >
            {m === 'ALL' ? '全市場板塊' : m === 'TW' ? '台股產業' : '美股板塊'}
          </button>
        ))}
      </div>

      {error && <div className="text-red-500 text-sm p-4 rounded-lg bg-red-500/10 border border-red-500/20">{error}</div>}
      
      {loading && (
        <div className="text-secondary text-center py-20 animate-pulse">
          正在彙整即時產業資金與均線數據（首次約需 10～20 秒）...
        </div>
      )}

      {!loading && (
        <>
          {/* 主視覺 1: 產業資金輪動走勢長條圖 (Horizontal Flow Ranking) */}
          <Card 
            title={`產業報酬與資金動能排行 (${TIME_OPTIONS.find(t => t.id === timeHorizon)?.label})`}
            className="border border-[var(--border)] shadow-md hover-lift"
          >
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis 
                    type="number" 
                    stroke="var(--text-secondary)" 
                    fontSize={12} 
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="industry" 
                    stroke="var(--text-primary)" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.3 }}
                    contentStyle={{ 
                      backgroundColor: 'var(--bg-secondary)', 
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                    }}
                    formatter={(val: any) => [`${Number(val) > 0 ? '+' : ''}${val}%`, '週期報酬率']}
                    labelFormatter={(lbl) => `產業名稱：${lbl}`}
                  />
                  <ReferenceLine x={0} stroke="var(--text-secondary)" strokeDasharray="3 3" />
                  <Bar dataKey="ret" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.ret >= 0 ? '#f43f5e' : '#10b981'} 
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => open(entry.industry)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-right text-[11px] text-secondary mt-1">
              * 點擊任意長條可直接穿透查看該產業所有成分股與 AI 產業研究報告
            </div>
          </Card>

          {/* 主視覺 2: 產業資金輪動四象限矩陣 (Sector Rotation Matrix) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. 領先強勢區 */}
            <Card className="hover-lift border-l-4 border-l-rose-500 border-[var(--border)] bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <Flame size={14} /> 🔥 領先強勢區 (Leading)
                </span>
                <span className="text-xs font-mono text-secondary">{quadrants.leading.length} 板塊</span>
              </div>
              <p className="text-[11px] text-secondary mb-3">報酬率收紅且高比例站上月線，主流資金強勢進駐</p>
              <div className="flex flex-wrap gap-1.5">
                {quadrants.leading.map(ind => (
                  <button
                    key={ind.industry}
                    onClick={() => open(ind.industry)}
                    className="px-2 py-1 rounded text-xs bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20 transition-all font-medium cursor-pointer"
                  >
                    {ind.industry} ({pct(ind[`ret_${timeHorizon}` as keyof Industry] as number)})
                  </button>
                ))}
                {quadrants.leading.length === 0 && <span className="text-xs text-secondary">暫無標的</span>}
              </div>
            </Card>

            {/* 2. 潛力轉強區 */}
            <Card className="hover-lift border-l-4 border-l-blue-500 border-[var(--border)] bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                  <TrendingUp size={14} /> 🚀 潛力轉強區 (Improving)
                </span>
                <span className="text-xs font-mono text-secondary">{quadrants.improving.length} 板塊</span>
              </div>
              <p className="text-[11px] text-secondary mb-3">多數成分股站穩月線，資金逢低築底轉強</p>
              <div className="flex flex-wrap gap-1.5">
                {quadrants.improving.map(ind => (
                  <button
                    key={ind.industry}
                    onClick={() => open(ind.industry)}
                    className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/25 hover:bg-blue-500/20 transition-all font-medium cursor-pointer"
                  >
                    {ind.industry} ({pct(ind[`ret_${timeHorizon}` as keyof Industry] as number)})
                  </button>
                ))}
                {quadrants.improving.length === 0 && <span className="text-xs text-secondary">暫無標的</span>}
              </div>
            </Card>

            {/* 3. 高檔震盪區 */}
            <Card className="hover-lift border-l-4 border-l-amber-500 border-[var(--border)] bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Clock size={14} /> 💤 高檔震盪區 (Weakening)
                </span>
                <span className="text-xs font-mono text-secondary">{quadrants.weakening.length} 板塊</span>
              </div>
              <p className="text-[11px] text-secondary mb-3">短線漲幅大但站上月線比率降溫，防禦性拉回</p>
              <div className="flex flex-wrap gap-1.5">
                {quadrants.weakening.map(ind => (
                  <button
                    key={ind.industry}
                    onClick={() => open(ind.industry)}
                    className="px-2 py-1 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 transition-all font-medium cursor-pointer"
                  >
                    {ind.industry} ({pct(ind[`ret_${timeHorizon}` as keyof Industry] as number)})
                  </button>
                ))}
                {quadrants.weakening.length === 0 && <span className="text-xs text-secondary">暫無標的</span>}
              </div>
            </Card>

            {/* 4. 弱勢落後區 */}
            <Card className="hover-lift border-l-4 border-l-emerald-500 border-[var(--border)] bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <ArrowDownRight size={14} /> ⚠️ 弱勢落後區 (Lagging)
                </span>
                <span className="text-xs font-mono text-secondary">{quadrants.lagging.length} 板塊</span>
              </div>
              <p className="text-[11px] text-secondary mb-3">跌幅較重且破月線下沉，資金持續流出</p>
              <div className="flex flex-wrap gap-1.5">
                {quadrants.lagging.map(ind => (
                  <button
                    key={ind.industry}
                    onClick={() => open(ind.industry)}
                    className="px-2 py-1 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all font-medium cursor-pointer"
                  >
                    {ind.industry} ({pct(ind[`ret_${timeHorizon}` as keyof Industry] as number)})
                  </button>
                ))}
                {quadrants.lagging.length === 0 && <span className="text-xs text-secondary">暫無標的</span>}
              </div>
            </Card>
          </div>

          {/* 完整產業多空詳細數據表 */}
          <Card title="產業資金多空數據總覽表" className="border border-[var(--border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-xs text-secondary text-right border-b border-[var(--border)] bg-[var(--bg-tertiary)]/50">
                    <th className="text-left py-2.5 px-3">產業板塊</th>
                    <th className="px-2">1日</th>
                    <th className="px-2">5日</th>
                    <th className="px-2">20日</th>
                    <th className="px-2">60日</th>
                    <th className="px-2">今日上漲比</th>
                    <th className="px-2">站上月線比</th>
                    <th className="px-2">技術綜合分</th>
                    <th className="text-left pl-4">🔥 領漲標的</th>
                    <th className="text-left pl-2">落後標的</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-xs font-mono">
                  {processedList.map(i => {
                    const isSelected = selected === i.industry;
                    return (
                      <tr 
                        key={i.industry} 
                        onClick={() => open(i.industry)}
                        className={`text-right cursor-pointer transition-colors hover:bg-[var(--bg-tertiary)] ${
                          isSelected ? 'bg-[var(--accent)]/10 font-semibold' : ''
                        }`}
                      >
                        <td className="text-left py-2.5 px-3 font-sans font-medium text-primary flex items-center gap-1.5">
                          {isSelected && <CheckCircle2 size={13} className="text-accent" />}
                          <span>{i.industry}</span>
                          <span className="text-[10px] text-secondary font-mono">({i.members}檔)</span>
                        </td>
                        <td className={`px-2 ${getChangeColorClass(i.ret_1d, i.market)}`}>{pct(i.ret_1d)}</td>
                        <td className={`px-2 ${getChangeColorClass(i.ret_5d, i.market)}`}>{pct(i.ret_5d)}</td>
                        <td className={`px-2 font-bold ${getChangeColorClass(i.ret_20d, i.market)}`}>{pct(i.ret_20d)}</td>
                        <td className={`px-2 ${getChangeColorClass(i.ret_60d, i.market)}`}>{pct(i.ret_60d)}</td>
                        <td className="px-2 text-primary">{i.breadth_up_pct}%</td>
                        <td className="px-2 text-primary font-bold">{i.above_ma20_pct}%</td>
                        <td className="px-2 text-accent">{i.avg_tech_score}</td>
                        <td className="text-left pl-4 font-sans text-primary">
                          {i.leader.name} <span className="text-xs text-rose-400 font-mono">{pct(i.leader.ret_20d)}</span>
                        </td>
                        <td className="text-left pl-2 font-sans text-secondary">
                          {i.laggard.name} <span className="text-xs text-emerald-400 font-mono">{pct(i.laggard.ret_20d)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* 點選產業時展開的成分股透視面板 */}
      {selected && (
        <Card 
          title={`${selected} 板塊成分股穿透`}
          className="border border-[var(--border)] animate-fade-in-up"
          headerAction={
            <Button size="sm" onClick={genReport} isLoading={reportLoading}>
              <Sparkles size={14} className="mr-1.5 text-accent" />
              生成 AI 產業研究報告
            </Button>
          }
        >
          {detailLoading ? (
            <div className="text-secondary py-12 text-center animate-pulse">載入成分股資料中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-xs text-secondary text-right border-b border-[var(--border)] bg-[var(--bg-tertiary)]/30">
                    <th className="text-left py-2.5 px-3">股票代碼/名稱</th>
                    <th className="px-2">收盤現價</th>
                    <th className="px-2">今日漲跌</th>
                    <th className="px-2">20日漲跌</th>
                    <th className="px-2">近3月營收YoY</th>
                    <th className="px-2">多因子評分</th>
                    <th className="text-left pl-4">量化指標與籌碼訊號</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-xs font-mono">
                  {members.map(m => (
                    <tr key={m.symbol} className="text-right hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                      <td className="text-left py-2.5 px-3 font-sans">
                        <Link href={`/stock/${m.symbol}`} className="hover:text-accent font-bold text-primary">
                          {m.symbol}
                        </Link>{" "}
                        <span className="text-secondary">{m.name !== m.symbol ? m.name : ''}</span>
                      </td>
                      <td className="px-2 text-primary font-semibold">${m.price}</td>
                      <td className={`px-2 ${getChangeColorClass(m.change_pct, m.market)}`}>{pct(m.change_pct)}</td>
                      <td className={`px-2 ${getChangeColorClass(m.ret_20d, m.market)}`}>{pct(m.ret_20d)}</td>
                      <td className="px-2 text-primary">{m.revenue_yoy_3m != null ? pct(m.revenue_yoy_3m) : '—'}</td>
                      <td className="px-2 font-bold text-accent">{m.score}</td>
                      <td className="text-left pl-4 font-sans text-secondary max-w-[360px] truncate">
                        {m.signals.slice(0, 3).join('、')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {reportError && <div className="text-red-500 text-sm mt-4 p-3 rounded bg-red-500/10">{reportError}</div>}
          
          {report && (
            <div className="ai-report-prose prose prose-invert max-w-none text-xs bg-[var(--bg-tertiary)] p-5 rounded-xl border border-[var(--border)] mt-4 leading-relaxed animate-fade-in">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
