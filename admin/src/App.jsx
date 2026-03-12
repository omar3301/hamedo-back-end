import { useState, useEffect, createContext, useContext } from 'react';
import { api } from './api.js';
import Dashboard    from './pages/Dashboard.jsx';
import Orders       from './pages/Orders.jsx';
import Products     from './pages/Products.jsx';
import ProductForm  from './pages/ProductForm.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import StoreSales   from './pages/StoreSales.jsx';
import './styles.css';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',   icon: '◈' },
  { id: 'orders',      label: 'Orders',       icon: '◎' },
  { id: 'store-sales', label: 'Store Sales',  icon: '🏪' },
  { id: 'products',    label: 'Products',     icon: '◫' },
  { id: 'settings',    label: 'Settings',     icon: '⚙' },
];

function Login({ onLogin }) {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await api.login(form.email, form.password);
      localStorage.setItem('hs_admin_token', data.token);
      onLogin(data.admin);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-mark">HS</span>
          <span className="logo-text">ADMIN</span>
        </div>
        <h1 className="login-title">Welcome back</h1>
        <p className="login-sub">Sign in to manage your store</p>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={submit} className="login-form">
          <div className="field-wrap">
            <label>Email</label>
            <input type="email" required autoFocus value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))}
              placeholder="admin@hamedosport.com"/>
          </div>
          <div className="field-wrap">
            <label>Password</label>
            <input type="password" required value={form.password}
              onChange={e => setForm(f => ({...f, password: e.target.value}))}
              placeholder="••••••••"/>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ page, setPage, admin, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-mark">HS</span>
        <div>
          <div className="logo-text">HAMEDOSPORT</div>
          <div className="logo-sub">Admin Panel</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(n => {
          // highlight Products also when on product-form
          const isActive = page === n.id || (page === 'product-form' && n.id === 'products');
          return (
            <button
              key={n.id}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => setPage(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="admin-info">
          <div className="admin-avatar">{admin?.name?.[0] || 'A'}</div>
          <div>
            <div className="admin-name">{admin?.name}</div>
            <div className="admin-role">{admin?.role}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </aside>
  );
}

export default function App() {
  const [admin,    setAdmin]    = useState(null);
  const [page,     setPage]     = useState('dashboard');
  const [editId,   setEditId]   = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hs_admin_token');
    if (!token) { setChecking(false); return; }
    api.me()
      .then(a => { setAdmin(a); setChecking(false); })
      .catch(() => { localStorage.removeItem('hs_admin_token'); setChecking(false); });
  }, []);

  const logout = () => {
    localStorage.removeItem('hs_admin_token');
    setAdmin(null);
    setPage('dashboard');
  };

  const goProductForm = (id = null) => { setEditId(id); setPage('product-form'); };

  if (checking) return <div className="full-center"><div className="spinner"/></div>;
  if (!admin)   return <Login onLogin={setAdmin}/>;

  return (
    <AuthCtx.Provider value={{ admin, logout }}>
      <div className="layout">
        <Sidebar
          page={page}
          setPage={p => { setPage(p); setEditId(null); }}
          admin={admin}
          onLogout={logout}
        />
        <main className="main-content">
          {page === 'dashboard'    && <Dashboard />}
          {page === 'orders'       && <Orders />}
          {page === 'store-sales'  && <StoreSales />}
          {page === 'products'     && <Products onNew={() => goProductForm(null)} onEdit={id => goProductForm(id)} />}
          {page === 'product-form' && <ProductForm editId={editId} onBack={() => setPage('products')} />}
          {page === 'settings'     && <SettingsPage />}
        </main>
      </div>
    </AuthCtx.Provider>
  );
}
