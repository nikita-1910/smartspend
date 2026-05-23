import { useState, useEffect, useCallback } from 'react';
import { budgets as budgetsApi } from '../api';
import { Plus, PiggyBank } from 'lucide-react';
import {
  Page, Modal, Btn, Input, Select, Spinner,
  Empty, useToast, fmtMoney, fmtCat, monthStr
} from '../components/UI';

const CATS = [
  'FOOD_AND_DINING','TRANSPORT','SHOPPING','UTILITIES','ENTERTAINMENT',
  'HEALTHCARE','EDUCATION','RENT_AND_HOUSING','PERSONAL_CARE','TRAVEL','OTHER'
];

function BudgetCard({ b }) {
  const pct = Math.min(b.usedPercent, 100);
  const isOver    = b.overBudget;
  const isWarning = !isOver && b.usedPercent > 80;
  const color  = isOver ? 'var(--red)' : isWarning ? 'var(--amber)' : 'var(--green)';
  const bgColor = isOver ? 'var(--red-bg)' : isWarning ? 'var(--amber-bg)' : 'var(--green-bg)';
  const statusLabel = isOver ? 'Over Budget' : isWarning ? 'Warning' : 'On Track';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{fmtCat(b.category)}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
            Limit: ₹{fmtMoney(b.limitAmount)}
          </div>
        </div>
        <span className={`badge badge-${isOver ? 'red' : isWarning ? 'amber' : 'green'}`}>
          {statusLabel}
        </span>
      </div>

      <div>
        <div className="budget-bar-bg">
          <div className="budget-bar-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
          <span style={{ color: 'var(--text2)' }}>
            Spent: <strong style={{ color }}>₹{fmtMoney(b.spentAmount)}</strong>
          </span>
          <span style={{ color: 'var(--text3)' }}>
            {isOver
              ? `Over by ₹${fmtMoney(Math.abs(b.remainingAmount))}`
              : `₹${fmtMoney(b.remainingAmount)} left`}
          </span>
        </div>
      </div>

      <div style={{
        background: bgColor, borderRadius: 8, padding: '6px 10px',
        fontSize: 12, color, fontWeight: 600, textAlign: 'center'
      }}>
        {b.usedPercent.toFixed(1)}% used
      </div>
    </div>
  );
}

export default function Budgets() {
  const [month, setMonth] = useState(monthStr());
  const [budgetStatus, setBudgetStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: 'FOOD_AND_DINING', limitAmount: '', monthYear: monthStr() });
  const [creating, setCreating] = useState(false);
  const { show, ToastEl } = useToast();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await budgetsApi.status(month);
      setBudgetStatus(data || []);
    } catch { show('Failed to load budgets', 'error'); }
    finally { setLoading(false); }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await budgetsApi.create({
        category: form.category,
        limitAmount: parseFloat(form.limitAmount),
        monthYear: form.monthYear,
      });
      show(`Budget set for ${fmtCat(form.category)}!`);
      setShowAdd(false);
      if (form.monthYear === month) load();
    } catch (err) {
      show(err.response?.data || 'Failed to create budget', 'error');
    } finally {
      setCreating(false);
    }
  }

  const overCount = budgetStatus.filter(b => b.overBudget).length;

  return (
    <Page
      title="Budgets"
      subtitle="Set spending limits and track them"
      action={
        <Btn onClick={() => { setForm(f => ({ ...f, monthYear: month })); setShowAdd(true); }}>
          <Plus size={15} /> Set Budget
        </Btn>
      }
    >
      {ToastEl}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Set Budget">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select label="Category" value={form.category} onChange={set('category')} required>
            {CATS.map(c => <option key={c} value={c}>{fmtCat(c)}</option>)}
          </Select>
          <Input label="Monthly Limit (₹)" type="number" min="1" step="0.01" required
            value={form.limitAmount} onChange={set('limitAmount')} placeholder="e.g. 5000" />
          <div className="field">
            <label>Month</label>
            <input type="month" value={form.monthYear}
              onChange={e => setForm(f => ({ ...f, monthYear: e.target.value }))}
              style={{ width: 'auto' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn type="button" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
            <Btn type="submit" disabled={creating}>{creating ? 'Saving…' : 'Set Budget'}</Btn>
          </div>
        </form>
      </Modal>

      {/* Month picker + summary */}
      <div className="card card-sm fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ marginBottom: 0 }}>Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 'auto' }} />
        </div>
        {!loading && budgetStatus.length > 0 && (
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <span style={{ color: 'var(--text2)' }}>{budgetStatus.length} budget{budgetStatus.length !== 1 ? 's' : ''}</span>
            {overCount > 0 && <span style={{ color: 'var(--red)', fontWeight: 600 }}>{overCount} over limit</span>}
          </div>
        )}
      </div>

      {loading ? <Spinner /> : budgetStatus.length === 0 ? (
        <div className="card fade-up-1">
          <Empty icon={PiggyBank} message={`No budgets set for ${month}. Click "Set Budget" to create one.`} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }} className="fade-up-1">
          {budgetStatus.map(b => <BudgetCard key={b.category} b={b} />)}
        </div>
      )}
    </Page>
  );
}
