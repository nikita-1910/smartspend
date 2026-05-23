import { useState, useCallback } from 'react';
import { X } from 'lucide-react';

// ── Formatting helpers ──────────────────────────────────────────────
export const fmtMoney = (n) => {
  const num = Number(n) || 0;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(num);
};

export const fmtCat = (s) =>
  (s || 'Other').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const CATEGORIES = [
  'FOOD_AND_DINING','TRANSPORT','SHOPPING','UTILITIES','ENTERTAINMENT',
  'HEALTHCARE','EDUCATION','RENT_AND_HOUSING','PERSONAL_CARE','TRAVEL',
  'SAVINGS','INCOME','OTHER'
];

export const CAT_COLORS = {
  FOOD_AND_DINING:  '#f87171',
  TRANSPORT:        '#fb923c',
  SHOPPING:         '#facc15',
  UTILITIES:        '#60a5fa',
  ENTERTAINMENT:    '#a78bfa',
  HEALTHCARE:       '#34d399',
  EDUCATION:        '#22d3ee',
  RENT_AND_HOUSING: '#f472b6',
  PERSONAL_CARE:    '#e879f9',
  TRAVEL:           '#38bdf8',
  SAVINGS:          '#4ade80',
  INCOME:           '#34d399',
  OTHER:            '#94a3b8',
};

// ── Today / month helpers ───────────────────────────────────────────
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const monthStr = (date = new Date()) =>
  date.toISOString().slice(0, 7);
export const monthRange = (ym) => {
  // ym = "2026-05"
  const [y, m] = ym.split('-').map(Number);
  const from = `${ym}-01`;
  const last = new Date(y, m, 0).getDate();
  const to   = `${ym}-${String(last).padStart(2, '0')}`;
  return { from, to };
};

// ── Compute stats from a transaction list (client-side) ─────────────
// This is THE source of truth for income/expense on dashboard & reports.
// It never relies on backend aggregate queries, eliminating the
// cumulative-sum bug entirely.
export const computeStats = (txList) => {
  let income = 0, expense = 0;
  txList.forEach(tx => {
    if (tx.type === 'INCOME') income += Number(tx.amount);
    else expense += Number(tx.amount);
  });
  const savings = income - expense;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  return { income, expense, savings, savingsRate };
};

// ── Spinner ─────────────────────────────────────────────────────────
export function Spinner({ size = 28 }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div className="spinner" style={{ width: size, height: size }} />
    </div>
  );
}

// ── Empty ───────────────────────────────────────────────────────────
export function Empty({ message = 'Nothing here yet.', icon: Icon }) {
  return (
    <div className="empty">
      {Icon && <Icon size={40} className="empty-icon" />}
      <p>{message}</p>
    </div>
  );
}

// ── Toast ───────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  const ToastEl = (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
  return { show, ToastEl };
}

// ── Modal ───────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 500 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── Btn ─────────────────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size, style, ...props }) {
  return (
    <button
      className={`btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''}`}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Input ───────────────────────────────────────────────────────────
export function Input({ label, ...props }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <input {...props} />
    </div>
  );
}

// ── Select ──────────────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <select {...props}>{children}</select>
    </div>
  );
}

// ── Badge ───────────────────────────────────────────────────────────
export function Badge({ children, color = 'blue' }) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}

// ── StatCard ─────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'accent', icon: Icon }) {
  const colorMap = {
    green:  { bg: 'var(--green-bg)',  fg: 'var(--green)' },
    red:    { bg: 'var(--red-bg)',    fg: 'var(--red)' },
    blue:   { bg: 'var(--blue-bg)',   fg: 'var(--blue)' },
    amber:  { bg: 'var(--amber-bg)',  fg: 'var(--amber)' },
    accent: { bg: 'var(--accent-glow)', fg: 'var(--accent)' },
  };
  const c = colorMap[color] || colorMap.accent;
  return (
    <div className="stat-card fade-up">
      <div className="stat-card-top">
        <div className="stat-card-label">{label}</div>
        {Icon && (
          <div className="stat-card-icon" style={{ background: c.bg }}>
            <Icon size={15} color={c.fg} />
          </div>
        )}
      </div>
      <div className="stat-card-value" style={{ color: c.fg }}>{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

// ── Page wrapper ─────────────────────────────────────────────────────
export function Page({ title, subtitle, action, children }) {
  return (
    <>
      <div className="page-header fade-up">
        <div>
          <div className="page-title">{title}</div>
          {subtitle && <div className="page-subtitle">{subtitle}</div>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="page-body">{children}</div>
    </>
  );
}
