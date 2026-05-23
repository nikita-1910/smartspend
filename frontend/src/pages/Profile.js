import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useTheme, THEME_LABELS } from '../ThemeContext';
import { user as userApi } from '../api';
import { User, Lock, Trash2, Palette, ShieldAlert, LogOut } from 'lucide-react';
import { Page, Btn, useToast, Input } from '../components/UI';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        <Icon size={16} color="var(--accent)" />
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function Profile() {
  const { user, login, logout } = useAuth();
  const { theme, changeTheme, themes } = useTheme();
  const { show, ToastEl } = useToast();

  // Profile form
  const [profile, setProfile] = useState({ username: '', monthlyIncomeTarget: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  // Delete account
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    userApi.profile().then(({ data }) => {
      setProfile({
        username: data.username || '',
        monthlyIncomeTarget: data.monthlyIncomeTarget || '',
      });
    }).catch(() => { });
  }, []);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await userApi.updateProfile({
        username: profile.username,
        monthlyIncomeTarget: String(profile.monthlyIncomeTarget),
      });
      // Update auth context with new token + username
      login(data.token, { username: data.username, email: data.email });
      show('Profile updated!');
    } catch (err) {
      show(err.response?.data || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirmPassword) {
      show('New passwords do not match', 'error'); return;
    }
    if (pwd.newPassword.length < 6) {
      show('Password must be at least 6 characters', 'error'); return;
    }
    setSavingPwd(true);
    try {
      await userApi.changePassword({
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      show('Password changed!');
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      show(err.response?.data || 'Failed to change password', 'error');
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await userApi.deleteAccount(deletePassword);
      show('Account deleted. Goodbye!');
      setTimeout(() => logout(), 1000);
    } catch (err) {
      const errData = err.response?.data;
      const errMsg = typeof errData === 'string'
        ? errData
        : errData?.message || 'Incorrect password';
      show(errMsg, 'error');
    } finally {
      setDeleting(false);
    }
  }

  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <Page title="Profile" subtitle="Manage your account settings">
      {ToastEl}

      <div style={{ maxWidth: 560 }}>

        {/* Avatar + name */}
        <div className="card fade-up" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 22, color: '#fff'
          }}>{initials}</div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 18 }}>{user?.username}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>{user?.email}</div>
          </div>
        </div>

        {/* Edit Profile */}
        <Section title="Edit Profile" icon={User}>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label="Username"
              value={profile.username}
              onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
              required
            />
            <Input
              label="Monthly Income Target (₹)"
              type="number"
              min="0"
              step="0.01"
              value={profile.monthlyIncomeTarget}
              onChange={e => setProfile(p => ({ ...p, monthlyIncomeTarget: e.target.value }))}
              placeholder="e.g. 50000"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </Btn>
            </div>
          </form>
        </Section>

        {/* Theme */}
        <Section title="Appearance" icon={Palette}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {Object.entries(themes).map(([key, { label, emoji }]) => (
              <button
                key={key}
                onClick={() => changeTheme(key)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: `2px solid ${theme === key ? 'var(--accent)' : 'var(--border2)'}`,
                  background: theme === key ? 'var(--accent-glow)' : 'var(--bg3)',
                  color: theme === key ? 'var(--accent)' : 'var(--text2)',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 18 }}>{emoji}</span> {label}
                {theme === key && <span style={{ marginLeft: 'auto', fontSize: 11 }}>Active</span>}
              </button>
            ))}
          </div>
        </Section>

        {/* Change Password */}
        <Section title="Change Password" icon={Lock}>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label="Current Password"
              type="password"
              required
              value={pwd.currentPassword}
              onChange={e => setPwd(p => ({ ...p, currentPassword: e.target.value }))}
              placeholder="••••••••"
            />
            <Input
              label="New Password"
              type="password"
              required
              minLength={6}
              value={pwd.newPassword}
              onChange={e => setPwd(p => ({ ...p, newPassword: e.target.value }))}
              placeholder="••••••••"
            />
            <Input
              label="Confirm New Password"
              type="password"
              required
              value={pwd.confirmPassword}
              onChange={e => setPwd(p => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="••••••••"
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Btn type="submit" disabled={savingPwd}>
                {savingPwd ? 'Changing…' : 'Change Password'}
              </Btn>
            </div>
          </form>
        </Section>

        {/* Delete Account */}
        <Section title="Danger Zone" icon={ShieldAlert}>
          {!showDeleteConfirm ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Delete Account</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Permanently deletes your account and all transaction data. This cannot be undone.
                </div>
              </div>
              <Btn variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={14} /> Delete Account
              </Btn>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: 'var(--red)' }}>
                ⚠ This will permanently delete your account, all transactions, budgets and reports.
              </div>
              <Input
                label="Enter your password to confirm"
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder="••••••••"
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <Btn variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}>
                  Cancel
                </Btn>
                <Btn variant="danger" onClick={handleDeleteAccount} disabled={deleting || !deletePassword}>
                  {deleting ? 'Deleting…' : <><Trash2 size={14} /> Confirm Delete</>}
                </Btn>
              </div>
            </div>
          )}
        </Section>

        {/* Sign Out (Specifically useful for mobile screens where sidebar footer is hidden) */}
        <div className="card fade-up" style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Sign Out</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>Log out from this device</div>
          </div>
          <Btn variant="ghost" onClick={logout} style={{ gap: 8 }}>
            <LogOut size={14} /> Sign Out
          </Btn>
        </div>

      </div>
    </Page>
  );
}
