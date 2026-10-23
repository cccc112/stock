"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiResearch, apiErrorMessage } from "@/lib/api";
import { getChangeColorClass } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface Industry {
  industry: string;
  market: 'TW' | 'US';
  members: number;
  ret_1d: number; ret_5d: number; ret_20d: number; ret_60d: number;
  breadth_up_pct: number;
  above_ma20_pct: number;
  avg_tech_score: number;
  leader: { symbol: string; name: string; ret_20d: number };
  laggard: { symbol: string; name: string; ret_20d: number };
}

interface Member {
  symbol: string; name: string; market: 'TW' | 'US'; price: number; change_pct: number;
  ret_20d: number; score: number; revenue_yoy_3m?: number | null; signals: string[];
}

const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;

export default function IndustryPage() {
  const [list, setList] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    setSelected(name); setReport(''); setReportError(''); setDetailLoading(true);
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
    setReportLoading(true); setReportError('');
    try {
      const r = await apiResearch.getIndustryReport(selected);
      setReport(r.data.report);
    } catch (e) {
      setReportError(apiErrorMessage(e));
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">產業研究</h1>
        <p className="text-sm text-secondary mt-1">依近 20 日表現排序各產業；點選產業查看成分股評分與 AI 產業報告。</p>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading && <div className="text-secondary text-center py-16">正在彙整各產業資料（首次約需 10～20 秒）...</div>}

      {!loading && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-xs text-secondary text-right border-b border-[var(--border)]">
                  <th className="text-left py-2">產業</th><th>1日</th><th>5日</th><th>20日</th><th>60日</th>
                  <th>上漲家數</th><th>站上月線</th><th>技術分</th><th className="text-left pl-4">領漲</th><th className="text-left pl-2">落後</th>
                </tr>
              </thead>
              <tbody>
                {list.map(i => (
                  <tr key={i.industry} onClick={() => open(i.industry)}
                    className={`text-right border-b border-[var(--border)]/50 cursor-pointer hover:bg-[var(--bg-tertiary)] ${selected === i.industry ? 'bg-[var(--bg-tertiary)]' : ''}`}>
                    <td className="text-left py-2 font-medium">{i.industry}<span className="text-xs text-secondary ml-1">({i.members})</span></td>
                    <td className={getChangeColorClass(i.ret_1d, i.market)}>{pct(i.ret_1d)}</td>
                    <td className={getChangeColorClass(i.ret_5d, i.market)}>{pct(i.ret_5d)}</td>
                    <td className={`font-semibold ${getChangeColorClass(i.ret_20d, i.market)}`}>{pct(i.ret_20d)}</td>
                    <td className={getChangeColorClass(i.ret_60d, i.market)}>{pct(i.ret_60d)}</td>
                    <td>{i.breadth_up_pct}%</td>
                    <td>{i.above_ma20_pct}%</td>
                    <td>{i.avg_tech_score}</td>
                    <td className="text-left pl-4">{i.leader.name} <span className="text-xs text-secondary">{pct(i.leader.ret_20d)}</span></td>
                    <td className="text-left pl-2">{i.laggard.name} <span className="text-xs text-secondary">{pct(i.laggard.ret_20d)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && (
        <Card title={`${selected} 成分股`}
          headerAction={<Button size="sm" onClick={genReport} isLoading={reportLoading}><Sparkles size={14} className="mr-1" />AI 產業報告</Button>}>
          {detailLoading ? <div className="text-secondary py-8 text-center">載入中...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-xs text-secondary text-right border-b border-[var(--border)]">
                    <th className="text-left py-2">股票</th><th>現價</th><th>今日</th><th>20日</th><th>近3月營收YoY</th><th>評分</th><th className="text-left pl-4">訊號</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.symbol} className="text-right border-b border-[var(--border)]/50">
                      <td className="text-left py-2"><Link href={`/stock/${m.symbol}`} className="hover:text-accent font-medium">{m.symbol}</Link> <span className="text-secondary">{m.name !== m.symbol ? m.name : ''}</span></td>
                      <td>{m.price}</td>
                      <td className={getChangeColorClass(m.change_pct, m.market)}>{pct(m.change_pct)}</td>
                      <td className={getChangeColorClass(m.ret_20d, m.market)}>{pct(m.ret_20d)}</td>
                      <td>{m.revenue_yoy_3m != null ? pct(m.revenue_yoy_3m) : '—'}</td>
                      <td className="font-semibold">{m.score}</td>
                      <td className="text-left pl-4 text-xs text-secondary max-w-[360px] truncate">{m.signals.slice(0, 3).join('、')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {reportError && <div className="text-red-500 text-sm mt-4">{reportError}</div>}
          {report && (
            <div className="prose prose-invert max-w-none text-sm bg-[var(--bg-tertiary)] p-4 rounded-lg mt-4">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
