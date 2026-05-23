import { useState, useEffect, useCallback, useRef } from 'react';
import { transactions as txApi } from '../api';
import {
  Plus, Trash2, Edit, Filter, AlertTriangle,
  ArrowUpCircle, ArrowDownCircle, Tag
} from 'lucide-react';
import {
  Page, Modal, Badge, Btn, Input, Select, Spinner,
  Empty, useToast, fmtMoney, fmtCat, CAT_COLORS, todayStr, computeStats
} from '../components/UI';

const EXPENSE_CATS = [
  'FOOD_AND_DINING', 'TRANSPORT', 'SHOPPING', 'UTILITIES', 'ENTERTAINMENT',
  'HEALTHCARE', 'EDUCATION', 'RENT_AND_HOUSING', 'PERSONAL_CARE', 'TRAVEL',
  'EMI', 'OTHER'
];
const INCOME_CATS = ['INCOME', 'SAVINGS'];

function sixMonthsAgo() {
  const d = new Date(); d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

// ── Add / Edit modal ─────────────────────────────────────────────────
export function AddTransactionModal({ open, onClose, onSaved, editingTx = null }) {
  const [form, setForm] = useState({
    amount: '', type: 'EXPENSE', category: 'FOOD_AND_DINING',
    description: '', transactionDate: todayStr()
  });
  const [loading, setLoading] = useState(false);
  const { show, ToastEl } = useToast();
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (editingTx) {
      setForm({
        amount: String(editingTx.amount),
        type: editingTx.type,
        category: editingTx.category || 'OTHER',
        description: editingTx.description,
        transactionDate: editingTx.transactionDate,
      });
    } else {
      setForm({ amount: '', type: 'EXPENSE', category: 'FOOD_AND_DINING', description: '', transactionDate: todayStr() });
    }
  }, [editingTx, open]);

  const handleTypeChange = t => setForm(f => ({
    ...f, type: t, category: t === 'INCOME' ? 'INCOME' : 'FOOD_AND_DINING'
  }));

  const submittingRef = useRef(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        type: form.type,
        category: form.category,
        description: form.description,
        transactionDate: form.transactionDate,
      };
      let saved;
      if (editingTx) {
        const { data } = await txApi.update(editingTx.id, payload);
        saved = data;
        show('Transaction updated!');
      } else {
        const { data } = await txApi.create(payload);
        saved = data;
        show('Transaction added!');
      }
      if (saved?.isAnomaly) show(`⚠ Anomaly: ${saved.anomalyNote}`, 'error');
      setTimeout(() => { onSaved(); onClose(); submittingRef.current = false; }, 300);
    } catch (err) {
      show(err.response?.data?.message || 'Failed to save', 'error');
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  }

  const cats = form.type === 'INCOME' ? INCOME_CATS : EXPENSE_CATS;

  return (
    <>
      {ToastEl}
      <Modal open={open} onClose={onClose} title={editingTx ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="type-toggle">
            {['EXPENSE', 'INCOME'].map(t => (
              <button key={t} type="button"
                className={`type-btn ${t.toLowerCase()} ${form.type === t ? 'active' : ''}`}
                onClick={() => handleTypeChange(t)}
              >
                {t === 'EXPENSE' ? <ArrowDownCircle size={15} /> : <ArrowUpCircle size={15} />}
                {t}
              </button>
            ))}
          </div>

          <Input label="Amount (₹)" type="number" min="0.01" step="0.01" required
            value={form.amount} onChange={set('amount')} placeholder="0.00" />

          <Input label="Description" required value={form.description}
            onChange={set('description')} placeholder="e.g. Swiggy order, Salary credit" />

          <Select label="Category" value={form.category} onChange={set('category')} required>
            {cats.map(c => <option key={c} value={c}>{fmtCat(c)}</option>)}
          </Select>

          <Input label="Date" type="date" required value={form.transactionDate}
            onChange={set('transactionDate')} />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn type="button" variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn type="submit" disabled={loading}>
              {loading ? 'Saving…' : editingTx ? 'Update' : 'Add Transaction'}
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ── Transaction row ──────────────────────────────────────────────────
// Note: delete confirmation is lifted to parent to escape table overflow clipping
function TxRow({ tx, onEdit, onDeleteRequest }) {
  const isExp = tx.type === 'EXPENSE';
  const dot = CAT_COLORS[tx.category] || '#888';

  return (
    <div className="table-row tx-cols">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tx.description}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{tx.transactionDate}</div>
        </div>
      </div>
      <div className="tx-col-tags" style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        <Badge color={isExp ? 'red' : 'green'}>{tx.type}</Badge>
        {tx.autoCategorised && <Badge color="blue"><Tag size={9} style={{ marginRight: 2 }} />Auto</Badge>}
        {tx.isAnomaly && <Badge color="amber"><AlertTriangle size={9} style={{ marginRight: 2 }} />Anomaly</Badge>}
      </div>
      <span className="tx-col-cat" style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtCat(tx.category)}</span>
      <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: isExp ? 'var(--red)' : 'var(--green)' }}>
        {isExp ? '−' : '+'}₹{fmtMoney(tx.amount)}
      </span>
      <div style={{ display: 'flex', gap: 5 }}>
        <IBtn onClick={() => onEdit(tx)} color="var(--accent)"><Edit size={13} /></IBtn>
        <IBtn onClick={() => onDeleteRequest(tx)} color="var(--red)"><Trash2 size={13} /></IBtn>
      </div>
    </div>
  );
}

function IBtn({ children, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', color: 'var(--text3)',
      cursor: 'pointer', padding: 4, borderRadius: 6, lineHeight: 0,
      transition: 'color 0.15s'
    }}
      onMouseEnter={e => e.currentTarget.style.color = color}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
    >
      {children}
    </button>
  );
}

// ── Main Transactions page ───────────────────────────────────────────
export default function Transactions() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(sixMonthsAgo());
  const [to, setTo] = useState(todayStr());
  const [appliedFrom, setAppliedFrom] = useState(sixMonthsAgo());
  const [appliedTo, setAppliedTo] = useState(todayStr());
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [deletingTx, setDeletingTx] = useState(null); // lifted delete confirm state
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('date');   // 'date' | 'amount'
  const [sortDir, setSortDir] = useState('desc');   // 'asc' | 'desc'
  const [typeFilter, setTypeFilter] = useState('ALL');  // 'ALL' | 'INCOME' | 'EXPENSE'
  const { show, ToastEl } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await txApi.list(appliedFrom, appliedTo, page, 100);
      setTxs(data.content || []);
      setTotalPages(data.totalPages || 1);
    } catch { show('Failed to load', 'error'); }
    finally { setLoading(false); }
  }, [appliedFrom, appliedTo, page]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    try { await txApi.delete(id); show('Deleted'); load(); }
    catch { show('Failed to delete', 'error'); }
  }

  // Client-side search + type filter + sort
  const displayed = txs
    .filter(tx => {
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        tx.description?.toLowerCase().includes(q) ||
        tx.category?.toLowerCase().includes(q) ||
        String(tx.amount).includes(q)
      );
    })
    .sort((a, b) => {
      if (sortField === 'amount') {
        return sortDir === 'asc'
          ? Number(a.amount) - Number(b.amount)
          : Number(b.amount) - Number(a.amount);
      }
      // default: date
      return sortDir === 'asc'
        ? a.transactionDate.localeCompare(b.transactionDate)
        : b.transactionDate.localeCompare(a.transactionDate);
    });

  const toggleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sortIcon = field => sortField === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  // Stats computed from displayed (filtered) list
  const { income, expense, savings } = computeStats(displayed);

  return (
    <Page
      title="Transactions"
      subtitle="Your financial activity"
      action={
        <Btn onClick={() => { setEditingTx(null); setShowAdd(true); }}>
          <Plus size={15} /> Add Transaction
        </Btn>
      }
    >
      {ToastEl}
      <AddTransactionModal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditingTx(null); }}
        onSaved={load}
        editingTx={editingTx}
      />

      {/* Summary banner */}
      {!loading && displayed.length > 0 && (
        <div className="card fade-up" style={{ display: 'flex', gap: 28, marginBottom: 14, flexWrap: 'wrap' }}>
          <SumCell label="Income" value={`+₹${fmtMoney(income)}`} color="var(--green)" />
          <SumCell label="Expenses" value={`−₹${fmtMoney(expense)}`} color="var(--red)" />
          <SumCell label="Net" value={`₹${fmtMoney(savings)}`} color={savings >= 0 ? 'var(--accent)' : 'var(--red)'} />
          <SumCell label="Showing" value={`${displayed.length} / ${txs.length}`} color="var(--text2)" />
        </div>
      )}

      {/* Date filters */}
      <div className="card card-sm fade-up-1 date-filter-bar" style={{  marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', color: 'var(--text2)', fontSize: 13, flexShrink: 0 }}>
          <Filter size={14} /> Date Range
        </div>
        {/* From & To — always side-by-side, never stack */}
        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 0 }}>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 0 }}>
            <label>From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              style={{ width: '100%', minWidth: 0, fontSize: 12 }} />
          </div>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 0 }}>
            <label>To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              style={{ width: '100%', minWidth: 0, fontSize: 12 }} />
          </div>
        </div>
        <Btn variant="primary" size="sm" onClick={() => { setPage(0); setAppliedFrom(from); setAppliedTo(to); }}>
          Apply
        </Btn>
      </div>

      {/* Search + Type filter + Sort */}
      <div className="card card-sm fade-up-1" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search description or category…"
          style={{ flex: 1, minWidth: 180 }}
        />
        {/* Type filter */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['ALL', 'INCOME', 'EXPENSE'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{
                padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                background: typeFilter === t ? 'var(--accent)' : 'var(--bg3)',
                color: typeFilter === t ? '#fff' : 'var(--text2)',
                transition: 'all 0.15s',
              }}>
              {t}
            </button>
          ))}
        </div>
        {/* Sort buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => toggleSort('date')}
            style={{
              padding: '5px 12px', borderRadius: 7,
              border: `1px solid ${sortField === 'date' ? 'var(--accent)' : 'var(--border2)'}`,
              background: sortField === 'date' ? 'var(--accent-glow)' : 'transparent',
              color: sortField === 'date' ? 'var(--accent)' : 'var(--text2)',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
            }}>
            Date{sortIcon('date')}
          </button>
          <button onClick={() => toggleSort('amount')}
            style={{
              padding: '5px 12px', borderRadius: 7,
              border: `1px solid ${sortField === 'amount' ? 'var(--accent)' : 'var(--border2)'}`,
              background: sortField === 'amount' ? 'var(--accent-glow)' : 'transparent',
              color: sortField === 'amount' ? 'var(--accent)' : 'var(--text2)',
              cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
            }}>
            Amount{sortIcon('amount')}
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : displayed.length === 0 ? (
        <div className="card"><Empty icon={ArrowUpCircle} message={search ? 'No transactions match your search.' : 'No transactions in this date range.'} /></div>
      ) : (
        <div className="table-wrap fade-up-2">
          <div className="table-head tx-cols">
            <span>Description</span>
            <span className="tx-col-tags">Tags</span>
            <span className="tx-col-cat">Category</span>
            <span>Amount</span>
            <span></span>
          </div>
          {displayed.map(tx => (
            <TxRow key={tx.id} tx={tx}
              onEdit={tx => { setEditingTx(tx); setShowAdd(true); }}
              onDeleteRequest={setDeletingTx}
            />
          ))}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16, background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
              <Btn variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</Btn>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Page {page + 1} of {totalPages}</span>
              <Btn variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</Btn>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal — rendered at page level to escape table overflow:hidden */}
      {deletingTx && (
        <div
          onClick={() => setDeletingTx(null)}
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
              <div className="modal-title">Delete Transaction?</div>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
                Are you sure you want to delete{' '}
                <strong>{deletingTx.description}</strong>?{' '}
                <span style={{ color: deletingTx.type === 'EXPENSE' ? 'var(--red)' : 'var(--green)' }}>
                  {deletingTx.type === 'EXPENSE' ? '−' : '+'}₹{fmtMoney(deletingTx.amount)}
                </span>
                <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 8 }}>
                  {deletingTx.transactionDate}
                </span>
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="ghost" onClick={() => setDeletingTx(null)} style={{ flex: 1 }}>
                  Cancel
                </Btn>
                <Btn
                  variant="danger"
                  onClick={() => { handleDelete(deletingTx.id); setDeletingTx(null); }}
                  style={{ flex: 1 }}
                >
                  Delete
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

function SumCell({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18, color }}>{value}</div>
    </div>
  );
}
