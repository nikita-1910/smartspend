import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank,
  FileBarChart2, AlertTriangle, LogOut, Zap, UserCircle
} from 'lucide-react';

const NAV = [
  { to: '/',             label: 'Dashboard',    Icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', Icon: ArrowLeftRight },
  { to: '/budgets',      label: 'Budgets',      Icon: PiggyBank },
  { to: '/reports',      label: 'Reports',      Icon: FileBarChart2 },
  { to: '/anomalies',    label: 'Anomalies',    Icon: AlertTriangle },
  { to: '/profile',      label: 'Profile',      Icon: UserCircle },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <Zap size={18} fill="var(--accent)" color="var(--accent)" />
            Smart<span style={{ color: 'var(--accent)' }}>Spend</span>
          </div>
          <div className="sidebar-logo-sub">Finance Tracker</div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <Icon size={16} className="nav-icon" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.username}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-ghost btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}
