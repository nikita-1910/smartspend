import { useState, useEffect, useCallback } from 'react';
import { transactions as txApi, budgets as budgetsApi } from '../api';
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle,
  PiggyBank, BarChart3, ShieldCheck
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Page, StatCard, Spinner, fmtMoney, fmtCat,
  CAT_COLORS, computeStats, monthStr, monthRange
} from '../components/UI';

// ── Build 6-month bar chart data from raw transaction list ───────────
function buildChartData(txList, selectedMonth) {
  const months = [];
  const base = new Date(selectedMonth + '-02');
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(base.getMonth() - i);
    const key = monthStr(d);
    months.push({
      key,
      label: d.toLocaleString('default', { month: 'short' }),
      income: 0,
      expense: 0,
    });
  }
  txList.forEach(tx => {
    const key = tx.transactionDate.slice(0, 7);
    const m = months.find(x => x.key === key);
    if (!m) return;
    if (tx.type === 'INCOME') m.income += Number(tx.amount);
    else m.expense += Number(tx.amount);
  });
  return months;
}

// ── Custom chart tooltip ─────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontSize: 12 }}>
          {p.name}: ₹{fmtMoney(p.value)}
        </div>
      ))}
    </div>
  );
}

// ── Category spend bar ───────────────────────────────────────────────
function CatBar({ category, spent, max }) {
  const pct = max > 0 ? Math.min((spent / max) * 100, 100) : 0;
  const color = CAT_COLORS[category] || 'var(--accent)';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--text2)' }}>{fmtCat(category)}</span>
        <span style={{ fontWeight: 600 }}>₹{fmtMoney(spent)}</span>
      </div>
      <div className="budget-bar-bg">
        <div className="budget-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [month, setMonth] = useState(monthStr());
  const [txList, setTxList] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 6-month window for chart
      const base = new Date(month + '-02');
      const chartStart = new Date(base);
      chartStart.setMonth(base.getMonth() - 5);
      chartStart.setDate(1);
      const chartFrom = chartStart.toISOString().slice(0, 10);

      const chartEnd = new Date(base);
      chartEnd.setMonth(base.getMonth() + 1);
      chartEnd.setDate(0);
      const chartTo = chartEnd.toISOString().slice(0, 10);

      // Fetch all transactions in the 6-month window (paginate to get all)
      const PAGE_SIZE = 500;
      const first = await txApi.list(chartFrom, chartTo, 0, PAGE_SIZE);
      let all = [...(first.data.content || [])];
      const totalPages = first.data.totalPages ?? 1;
      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            txApi.list(chartFrom, chartTo, i + 1, PAGE_SIZE)
          )
        );
        rest.forEach(r => { all = all.concat(r.data.content || []); });
      }

      setChartData(buildChartData(all, month));

      // ── KEY FIX: filter to selected month ONLY for stat cards ──────
      // This is computed purely client-side from the fetched tx list.
      // No backend aggregate is used, so no cumulative-sum bug.
      const { from, to } = monthRange(month);
      const monthTxs = all.filter(tx =>
        tx.transactionDate >= from && tx.transactionDate <= to
      );
      setTxList(monthTxs);

      // Budget status for the selected month
      const bRes = await budgetsApi.status(month);
      setBudgetStatus(bRes.data || []);
    } catch (err) {
      console.error('Dashboard load error', err);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  // Compute stats from filtered month transactions (client-side)
  const { income, expense, savings, savingsRate } = computeStats(txList);
  const anomalyCount = txList.filter(tx => tx.isAnomaly).length;
  const overBudget = budgetStatus.filter(b => b.overBudget).length;

  // Category breakdown for selected month expenses only
  const catMap = {};
  txList.forEach(tx => {
    if (tx.type === 'EXPENSE') {
      catMap[tx.category] = (catMap[tx.category] || 0) + Number(tx.amount);
    }
  });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const topCat = catEntries[0];

  return (
    <Page
      title="Dashboard"
      subtitle={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          <span>Showing data for</span>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '5px 10px', color: 'var(--text)', fontSize: 13, width: 'auto' }}
          />
        </div>
      }
    >
      {loading ? <Spinner /> : (
        <>
          {/* Stat cards */}
          <div className="stat-grid fade-up" style={{ marginBottom: 14 }}>
            <StatCard
              label="Income"
              value={`₹${fmtMoney(income)}`}
              sub={`${savingsRate.toFixed(1)}% savings rate`}
              color="green"
              icon={TrendingUp}
            />
            <StatCard
              label="Expenses"
              value={`₹${fmtMoney(expense)}`}
              sub={topCat ? `Top: ${fmtCat(topCat[0])}` : 'No expenses'}
              color="red"
              icon={TrendingDown}
            />
            <StatCard
              label="Net Savings"
              value={`₹${fmtMoney(savings)}`}
              sub={savings >= 0 ? 'Positive balance' : 'Overspent'}
              color={savings >= 0 ? 'accent' : 'red'}
              icon={Wallet}
            />
            <StatCard
              label="Anomalies"
              value={anomalyCount}
              sub={overBudget > 0 ? `${overBudget} budget(s) over limit` : 'All budgets on track'}
              color={anomalyCount > 0 ? 'amber' : 'accent'}
              icon={anomalyCount > 0 ? AlertTriangle : ShieldCheck}
            />
          </div>

          {/* Chart + Budget status */}
          <div className="dash-row-1 fade-up-1">
            {/* Budget status */}
            <div className="card">
              <div className="section-label" style={{ marginBottom: 14 }}>Budget Status</div>
              {budgetStatus.length === 0 ? (
                <div style={{ color: 'var(--text3)', fontSize: 13 }}>
                  <PiggyBank size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <p>No budgets set for {month}.</p>
                </div>
              ) : (
                budgetStatus.map(b => (
                  <div key={b.category} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{fmtCat(b.category)}</span>
                      <span className={`badge badge-${b.overBudget ? 'red' : b.usedPercent > 80 ? 'amber' : 'green'}`}>
                        {b.overBudget ? 'Over' : b.usedPercent > 80 ? 'Warning' : 'OK'}
                      </span>
                    </div>
                    <div className="budget-bar-bg">
                      <div
                        className="budget-bar-fill"
                        style={{
                          width: `${Math.min(b.usedPercent, 100)}%`,
                          background: b.overBudget ? 'var(--red)' : b.usedPercent > 80 ? 'var(--amber)' : 'var(--green)',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                      ₹{fmtMoney(b.spentAmount)} / ₹{fmtMoney(b.limitAmount)} ({b.usedPercent.toFixed(1)}%)
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 6-month area chart */}
            <div className="card">
              <div className="section-label" style={{ marginBottom: 14 }}>6-Month Overview</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--red)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} width={48}
                    tickFormatter={v => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                  <Tooltip content={<ChartTip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
                  <Area type="monotone" dataKey="income"  name="Income"  stroke="var(--green)" fill="url(#gIncome)"  strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="var(--red)"   fill="url(#gExpense)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top category spend for selected month */}
          {catEntries.length > 0 && (
            <div className="dash-row-2 fade-up-2">
              <div className="card">
                <div className="section-label" style={{ marginBottom: 14 }}>
                  Category Breakdown — {month}
                </div>
                {catEntries.slice(0, 7).map(([cat, spent]) => (
                  <CatBar key={cat} category={cat} spent={spent} max={catEntries[0][1]} />
                ))}
              </div>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="section-label">Quick Summary</div>
                <SummaryRow label="Total Transactions" value={txList.length} />
                <SummaryRow label="Income Transactions" value={txList.filter(t => t.type === 'INCOME').length} color="var(--green)" />
                <SummaryRow label="Expense Transactions" value={txList.filter(t => t.type === 'EXPENSE').length} color="var(--red)" />
                <SummaryRow label="Anomalies Detected" value={anomalyCount} color={anomalyCount > 0 ? 'var(--amber)' : undefined} />
                <SummaryRow label="Savings Rate" value={`${savingsRate.toFixed(1)}%`} color={savingsRate >= 20 ? 'var(--green)' : savingsRate >= 0 ? 'var(--amber)' : 'var(--red)'} />
                <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', fontSize: 12 }}>
                    <BarChart3 size={14} />
                    <span>Data is computed from your actual transactions — always accurate.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Page>
  );
}

function SummaryRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{label}</span>
      <span style={{ fontWeight: 700, fontFamily: 'var(--font-head)', color: color || 'var(--text)', fontSize: 15 }}>{value}</span>
    </div>
  );
}
