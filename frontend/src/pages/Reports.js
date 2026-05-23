import { useState, useEffect, useCallback } from 'react';
import { transactions as txApi, reports as reportsApi } from '../api';
import {
  FileBarChart2, Zap, ChevronDown, ChevronRight, RefreshCw, Trash2
} from 'lucide-react';
import {
  Page, Btn, Spinner, Empty, useToast,
  fmtMoney, fmtCat, CAT_COLORS, monthStr, monthRange, computeStats
} from '../components/UI';

// ── Parse the backend categorySummary JSON string ────────────────────
function parseCatSummary(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : Object.entries(parsed).map(([k, v]) => ({ category: k, ...v }));
  } catch { return []; }
}

// ── Single report card ───────────────────────────────────────────────
function ReportCard({ report, monthTxs, expanded, onToggle, onDelete }) {
  // ── KEY FIX: ALL financial figures computed from live tx list ──────
  // The backend report object is only used for healthScore, healthLabel,
  // categorySummary (structural), anomalyCount, topInsight, generatedAt.
  // Income / expense / savings are NEVER taken from the cached report —
  // they come from monthTxs which is fetched fresh from /api/transactions.
  const { income, expense, savings, savingsRate } = computeStats(monthTxs);
  const catSummary = parseCatSummary(report.categorySummary);
  const score = report.healthScore ?? 0;
  const scoreColor = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="month-group fade-up">
      <div className="month-group-header" onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-head)', fontSize: 15 }}>
            {report.monthYear}
          </span>
          <span className={`badge badge-${score >= 75 ? 'green' : score >= 50 ? 'amber' : 'red'}`}>
            {report.healthLabel || 'N/A'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>+₹{fmtMoney(income)}</span>
          <span style={{ color: 'var(--red)', fontWeight: 600 }}>−₹{fmtMoney(expense)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(report.monthYear);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--red)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '6px',
              transition: 'background 0.2s',
            }}
            className="delete-report-btn"
            title="Delete Report"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="month-group-body" style={{ padding: 20 }}>
          {/* Top metrics row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <MetricTile label="Income" value={`₹${fmtMoney(income)}`} color="var(--green)" />
            <MetricTile label="Expenses" value={`₹${fmtMoney(expense)}`} color="var(--red)" />
            <MetricTile label="Net Savings" value={`₹${fmtMoney(savings)}`} color={savings >= 0 ? 'var(--accent)' : 'var(--red)'} />
            <MetricTile label="Savings Rate" value={`${savingsRate.toFixed(1)}%`} color={savingsRate >= 20 ? 'var(--green)' : savingsRate >= 0 ? 'var(--amber)' : 'var(--red)'} />
            <MetricTile label="Health Score" value={`${score}/100`} color={scoreColor} />
            <MetricTile label="Anomalies" value={report.anomalyCount ?? monthTxs.filter(t => t.isAnomaly).length} color="var(--amber)" />
          </div>

          {/* Insight */}
          {report.topInsight && (
            <div style={{ background: 'var(--accent-glow)', border: '1px solid rgba(108,143,255,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--text2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Zap size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
              {report.topInsight}
            </div>
          )}

          {/* Category breakdown */}
          {catSummary.length > 0 && (
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>Category Breakdown</div>
              {catSummary.map((item, i) => {
                const cat = item.category || item.name || '';
                const spent = Number(item.spent || item.spentAmount || 0);
                const limit = Number(item.limit || item.limitAmount || 0);
                const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
                const color = CAT_COLORS[cat] || 'var(--accent)';
                return (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: 'var(--text2)' }}>{fmtCat(cat)}</span>
                      <span style={{ fontWeight: 600 }}>
                        ₹{fmtMoney(spent)}{limit > 0 ? ` / ₹${fmtMoney(limit)}` : ''}
                      </span>
                    </div>
                    {limit > 0 && (
                      <div className="budget-bar-bg">
                        <div className="budget-bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Live tx count for this month */}
          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text3)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            Based on {monthTxs.length} transaction{monthTxs.length !== 1 ? 's' : ''} •{' '}
            Report generated: {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : '—'} •{' '}
            Financial figures always reflect current transactions
          </div>
        </div>
      )}
    </div>
  );
}

function MetricTile({ label, value, color }) {
  return (
    <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 17, color }}>{value}</div>
    </div>
  );
}

// ── Main Reports page ────────────────────────────────────────────────
export default function Reports() {
  const [reports, setReports] = useState([]);
  const [monthTxMap, setMonthTxMap] = useState({}); // { "2026-05": [...txs] }
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [genMonth, setGenMonth] = useState(monthStr());
  const [generating, setGenerating] = useState(false);
  const [generatedMonth, setGeneratedMonth] = useState(null);
  const [deletingMonth, setDeletingMonth] = useState(null);
  const { show, ToastEl } = useToast();

  // ── Fetch all reports then fetch live transactions for each month ──
  // This is the fix: we do NOT rely on report.totalIncome / report.totalExpense
  // from the DB. Instead, for every report month we fetch the actual
  // transactions and compute stats client-side.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await reportsApi.all();
      const arr = Array.isArray(data) ? data : [];
      setReports(arr);

      // For each report month, fetch transactions and build a map
      const txMap = {};
      await Promise.all(arr.map(async r => {
        const { from, to } = monthRange(r.monthYear);
        const PAGE = 500;
        const first = await txApi.list(from, to, 0, PAGE);
        let all = [...(first.data.content || [])];
        const tp = first.data.totalPages ?? 1;
        if (tp > 1) {
          const rest = await Promise.all(
            Array.from({ length: tp - 1 }, (_, i) => txApi.list(from, to, i + 1, PAGE))
          );
          rest.forEach(res => { all = all.concat(res.data.content || []); });
        }
        txMap[r.monthYear] = all;
      }));

      setMonthTxMap(txMap);
    } catch {
      show('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await reportsApi.generate(genMonth);
      show(`Report for ${genMonth} generated!`);
      await load();
      setGeneratedMonth(genMonth);
      setExpanded(genMonth);
    } catch (err) {
      const msg = err.response?.data?.message
        || (typeof err.response?.data === 'string' ? err.response.data : null)
        || 'Generation failed — make sure you have transactions for this month.';
      show(msg, 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete(monthYear) {
    try {
      await reportsApi.delete(monthYear);
      show(`Report for ${monthYear} deleted successfully!`);
      setReports(prev => prev.filter(r => r.monthYear !== monthYear));
      setMonthTxMap(prev => {
        const copy = { ...prev };
        delete copy[monthYear];
        return copy;
      });
      if (expanded === monthYear) {
        setExpanded(null);
      }
      if (generatedMonth === monthYear) {
        setGeneratedMonth(null);
      }
    } catch (err) {
      show('Failed to delete report', 'error');
    }
  }

  // Sort: recently generated month always first, rest by date descending
  const sorted = [...reports].sort((a, b) => {
    if (generatedMonth) {
      if (a.monthYear === generatedMonth) return -1;
      if (b.monthYear === generatedMonth) return 1;
    }
    return b.monthYear.localeCompare(a.monthYear);
  });

  return (
    <Page title="Reports" subtitle="Monthly financial summaries">
      {ToastEl}

      {/* Generate panel */}
      <div className="card card-sm fade-up responsive-filter-bar" style={{ marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-head)' }}>Generate Budget Report</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Always regenerates fresh from your current transactions.
          </div>
        </div>
        <input type="month" value={genMonth}
          onChange={e => setGenMonth(e.target.value)}
          style={{ width: 'auto', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '7px 12px', color: 'var(--text)', fontSize: 13 }} />
        <Btn onClick={handleGenerate} disabled={generating}>
          {generating ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</> : <><Zap size={14} /> Generate</>}
        </Btn>
      </div>

      {/* Report list */}
      {loading ? <Spinner /> : sorted.length === 0 ? (
        <div className="card fade-up-1">
          <Empty icon={FileBarChart2} message="No reports yet. Select a month and click Generate." />
        </div>
      ) : (
        <div className="fade-up-1" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(r => (
            <ReportCard
              key={r.monthYear}
              report={r}
              monthTxs={monthTxMap[r.monthYear] || []}
              expanded={expanded === r.monthYear}
              onToggle={() => setExpanded(prev => prev === r.monthYear ? null : r.monthYear)}
              onDelete={setDeletingMonth}
            />
          ))}
        </div>
      )}

      {/* Beautiful Custom Delete Confirmation Modal */}
      {deletingMonth && (
        <div
          onClick={() => setDeletingMonth(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <div className="modal-box" style={{ maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Delete Report?</div>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
                Are you sure you want to delete the budget report for <strong>{deletingMonth}</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="ghost" onClick={() => setDeletingMonth(null)} style={{ flex: 1 }}>Cancel</Btn>
                <Btn variant="danger" onClick={() => { handleDelete(deletingMonth); setDeletingMonth(null); }} style={{ flex: 1 }}>Delete</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
