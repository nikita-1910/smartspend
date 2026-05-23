import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api';
import { useAuth } from '../AuthContext';
import { Zap } from 'lucide-react';

export default function Register() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', monthlyIncomeTarget: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await auth.register({
        username: form.username,
        email: form.email,
        password: form.password,
        monthlyIncomeTarget: parseFloat(form.monthlyIncomeTarget) || 0,
      });
      // Auto-login after registration → redirect to dashboard
      const { data } = await auth.login(form.email, form.password);
      login(data.token, { username: data.username, email: data.email });
      nav('/');
    } catch (ex) {
      setErr(ex.response?.data?.message || ex.response?.data || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Zap size={24} fill="var(--accent)" color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800 }}>
              Smart<span style={{ color: 'var(--accent)' }}>Spend</span>
            </span>
          </div>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>Create your account</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label>Username</label>
              <input required value={form.username} onChange={set('username')} placeholder="johndoe" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" />
            </div>
            <div className="field">
              <label>Password (min 6 chars)</label>
              <input type="password" required minLength={6} value={form.password} onChange={set('password')} placeholder="••••••••" />
            </div>
            <div className="field">
              <label>Monthly Income Target (₹) — optional</label>
              <input type="number" min="0" step="0.01" value={form.monthlyIncomeTarget} onChange={set('monthlyIncomeTarget')} placeholder="e.g. 50000" />
            </div>
            {err && (
              <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                {err}
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text3)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
