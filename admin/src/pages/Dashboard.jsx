// ─────────────────────────────────────────────
//  Dashboard — stats, charts, sold items, visits
//
//  📚 LEARNING NOTES INSIDE:
//  Search for "📚" to find explanations of
//  how things work so you can learn from them.
// ─────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { api } from '../api.js';

// ── Constants ──────────────────────────────────────────────────────────
const STATUS_COLORS = {
  pending:    '#F4C430',
  confirmed:  '#60A5FA',
  processing: '#A78BFA',
  shipped:    '#34D399',
  delivered:  '#22C55E',
  cancelled:  '#F87171',
};

// ── Helper functions ──────────────────────────────────────────────────
// 📚 Helper functions: small reusable functions that do one specific thing.
//    fmt()     → turns 3200 into "3,200" (adds comma separators)
//    fmtDate() → turns "2026-03-10T12:00:00Z" into "10 Mar 26"
const fmt     = (n) => Number(n || 0).toLocaleString();
const fmtDate = (s) => new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' });

// ── Stat Card ─────────────────────────────────────────────────────────
// 📚 This is a "component" — a reusable piece of UI.
//    We call it 4 times with different props (label, value, etc.)
//    instead of copy-pasting the same HTML 4 times.
function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div className="stat-card">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div className="stat-label">{label}</div>
        {icon && <div style={{ fontSize:'1.2rem', opacity:.6 }}>{icon}</div>}
      </div>
      <div className="stat-value" style={{ color: accent }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────
export default function Dashboard() {
  // 📚 useState: stores data in memory while the page is open.
  //    [stats, setStats] means:
  //    - stats      = current value (starts as null)
  //    - setStats() = function to UPDATE the value
  //    When setStats() is called, React re-renders the page automatically.
  const [stats,       setStats]       = useState(null);
  const [visitStats,  setVisitStats]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('overview'); // overview | sold | visits

  // 📚 useEffect: runs code AFTER the page first appears on screen.
  //    The [] at the end means "only run once" (not on every re-render).
  //    This is where you fetch data from your backend.
  useEffect(() => {
    // 📚 Promise.all: runs BOTH requests at the same time.
    //    If you did them one after another it would be twice as slow.
    Promise.all([
      api.getStats(),
      api.getVisitStats().catch(() => null), // don't crash if visits is empty
    ]).then(([s, v]) => {
      setStats(s);
      setVisitStats(v);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading"><div className="spinner"/></div>;

  const {
    totalOrders = 0, pendingOrders = 0, totalRevenue = 0,
    recentOrders = [], statusBreakdown = [], dailyRevenue = [],
    topProducts = [], soldByVariant = [], revenueByGov = [],
  } = stats || {};

  const deliveredCount = statusBreakdown.find(s => s._id === 'delivered')?.count || 0;
  const convRate = totalOrders ? Math.round((deliveredCount / totalOrders) * 100) : 0;

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-desc">Your store at a glance.</p>
        </div>
        <div className="live-badge">● LIVE</div>
      </div>

      {/* ── Tab navigation ── */}
      {/* 📚 Tabs: clicking a tab changes activeTab state → shows different content below */}
      <div className="dash-tabs">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'sold',     label: '📦 Sold Items' },
          { id: 'visits',   label: '👥 Visitors' },
        ].map(t => (
          <button
            key={t.id}
            className={`dash-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TAB 1: OVERVIEW
      ══════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Stat cards */}
          <div className="stats-grid">
            <StatCard label="Total Revenue"  value={`${fmt(totalRevenue)} EGP`} sub="All time (excl. cancelled)" accent="#F4C430" icon="💰"/>
            <StatCard label="Total Orders"   value={fmt(totalOrders)} sub="All time" accent="#60A5FA" icon="📦"/>
            <StatCard label="Pending"        value={fmt(pendingOrders)} sub="Need your action" accent="#F87171" icon="⏳"/>
            <StatCard label="Delivered"      value={`${convRate}%`} sub="Orders fulfilled" accent="#22C55E" icon="✅"/>
          </div>

          <div className="charts-grid">
            {/* Revenue chart */}
            <div className="chart-card wide">
              <div className="chart-title">Revenue — Last 7 Days</div>
              {/* 📚 ResponsiveContainer: makes the chart fill its parent width automatically */}
              {dailyRevenue.length === 0 ? (
                <div className="chart-empty">No data yet — orders will appear here once placed</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dailyRevenue} margin={{ top:5, right:10, left:0, bottom:0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#F4C430" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#F4C430" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="_id" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:11 }} tickLine={false} axisLine={false}/>
                    <YAxis tick={{ fill:'rgba(255,255,255,0.35)', fontSize:11 }} tickLine={false} axisLine={false} tickFormatter={v=>`${v/1000}k`}/>
                    <Tooltip
                      contentStyle={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff' }}
                      formatter={v => [`${fmt(v)} EGP`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#F4C430" strokeWidth={2} fill="url(#revGrad)"/>
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Status breakdown */}
            <div className="chart-card">
              <div className="chart-title">Order Status</div>
              <div className="status-list">
                {statusBreakdown.map(s => (
                  <div key={s._id} className="status-row">
                    <div className="status-dot" style={{ background: STATUS_COLORS[s._id] || '#888' }}/>
                    <span className="status-name" style={{ textTransform:'capitalize' }}>{s._id}</span>
                    <span className="status-count">{s.count}</span>
                    <div className="status-bar-wrap">
                      <div className="status-bar" style={{ width:`${(s.count/totalOrders)*100}%`, background: STATUS_COLORS[s._id] || '#888' }}/>
                    </div>
                  </div>
                ))}
                {statusBreakdown.length === 0 && <div className="chart-empty">No orders yet</div>}
              </div>
            </div>

            {/* Top products */}
            <div className="chart-card">
              <div className="chart-title">Top 5 Products</div>
              <div className="top-products">
                {topProducts.map((p, i) => (
                  <div key={p._id} className="top-product-row">
                    <div className="rank">#{i+1}</div>
                    {p.image && <img src={p.image} alt="" className="tp-img" onError={e=>e.target.style.display='none'}/>}
                    <div className="tp-info">
                      <div className="tp-name">{p.name}</div>
                      <div className="tp-brand">{p.brand}</div>
                    </div>
                    <div className="tp-stats">
                      <div className="tp-qty">{p.totalQty} sold</div>
                      <div className="tp-rev">{fmt(p.totalRevenue)} EGP</div>
                    </div>
                  </div>
                ))}
                {topProducts.length === 0 && <div className="chart-empty">No sales yet</div>}
              </div>
            </div>

            {/* Revenue by city */}
            <div className="chart-card">
              <div className="chart-title">Revenue by Governorate</div>
              {revenueByGov.length === 0 ? (
                <div className="chart-empty">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenueByGov} margin={{ top:5, right:10, left:0, bottom:0 }}>
                    <XAxis dataKey="_id" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:10 }} tickLine={false} axisLine={false}/>
                    <YAxis hide/>
                    <Tooltip
                      contentStyle={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff' }}
                      formatter={v => [`${fmt(v)} EGP`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" radius={[4,4,0,0]}>
                      {revenueByGov.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#F4C430' : `rgba(244,196,48,${0.6 - i*0.05})`}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Recent orders */}
            <div className="chart-card wide">
              <div className="chart-title">Recent Orders</div>
              <table className="mini-table">
                <thead>
                  <tr><th>Order #</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o._id}>
                      <td className="mono">{o.orderNumber}</td>
                      <td>{o.customer.firstName} {o.customer.lastName}</td>
                      <td className="muted">{fmtDate(o.createdAt)}</td>
                      <td className="bold">{fmt(o.total)} EGP</td>
                      <td>
                        <span className="badge" style={{ background:STATUS_COLORS[o.status]+'22', color:STATUS_COLORS[o.status], border:`1px solid ${STATUS_COLORS[o.status]}44` }}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentOrders.length === 0 && <tr><td colSpan={5} className="chart-empty">No orders yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          TAB 2: SOLD ITEMS (per product/size/color)
          📚 This answers: "How many of each size did I sell?"
          Every order saves items[] with productId, size, color, qty.
          The backend groups them together with MongoDB $group.
      ══════════════════════════════════════════ */}
      {activeTab === 'sold' && (
        <div className="sold-wrap">
          <div className="sold-header-row">
            <div>
              <h2 className="sold-title">What You've Sold</h2>
              <p className="sold-desc">Every item sold, broken down by product · size · color</p>
            </div>
            <div className="sold-total-badge">
              {soldByVariant.reduce((s, r) => s + r.qty, 0)} units total
            </div>
          </div>

          {soldByVariant.length === 0 ? (
            <div className="chart-card" style={{ textAlign:'center', padding:'60px' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>📦</div>
              <div style={{ color:'var(--text2)', fontSize:'14px' }}>No sales recorded yet.</div>
              <div style={{ color:'var(--text3)', fontSize:'12px', marginTop:6 }}>
                Sales appear here automatically when customers place orders.
              </div>
            </div>
          ) : (
            <div className="sold-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Color</th>
                    <th>Size</th>
                    <th>Units Sold</th>
                    <th>Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 📚 .map() loops through the array and renders one <tr> per item */}
                  {soldByVariant.map((row, i) => {
                    // Find max qty to draw proportional bar
                    const maxQty = soldByVariant[0]?.qty || 1;
                    const pct    = Math.round((row.qty / maxQty) * 100);
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            {row.image && (
                              <img src={row.image} alt="" style={{ width:36, height:36, objectFit:'cover', borderRadius:6, border:'1px solid rgba(255,255,255,.1)' }} onError={e=>e.target.style.display='none'}/>
                            )}
                            <span className="td-name">{row._id.name}</span>
                          </div>
                        </td>
                        <td className="muted">{row._id.color || '—'}</td>
                        <td>
                          <span style={{ background:'rgba(244,196,48,.12)', color:'#F4C430', border:'1px solid rgba(244,196,48,.25)', borderRadius:4, padding:'2px 8px', fontSize:12, fontWeight:700 }}>
                            {row._id.size}
                          </span>
                        </td>
                        <td>
                          <span className="bold" style={{ color:'#F4C430', fontFamily:'Syne,sans-serif', fontSize:16 }}>{row.qty}</span>
                        </td>
                        <td style={{ width:120 }}>
                          <div style={{ height:6, background:'rgba(255,255,255,.07)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ width:`${pct}%`, height:'100%', background:'#F4C430', borderRadius:3, transition:'width .4s' }}/>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          TAB 3: VISITORS
          📚 The frontend sends a silent POST to /api/visits
          every time someone opens the store. No personal data —
          just device type, source (Instagram/Google/direct), and page.
      ══════════════════════════════════════════ */}
      {activeTab === 'visits' && (
        <div className="visits-wrap">
          {!visitStats ? (
            <div className="chart-card" style={{ textAlign:'center', padding:'60px' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>👥</div>
              <div style={{ color:'var(--text2)' }}>No visit data yet.</div>
              <div style={{ color:'var(--text3)', fontSize:'12px', marginTop:6 }}>
                Visitors are tracked when the frontend calls /api/visits on page load.
              </div>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="stats-grid" style={{ marginBottom:20 }}>
                <StatCard label="Total Visitors"  value={fmt(visitStats.totalVisits)}   sub="All time"         accent="#60A5FA" icon="👥"/>
                <StatCard label="This Week"        value={fmt(visitStats.visitsThisWeek)} sub="Last 7 days"     accent="#A78BFA" icon="📅"/>
                <StatCard
                  label="Conversion Rate"
                  value={visitStats.totalVisits ? `${Math.round((totalOrders/visitStats.totalVisits)*100)}%` : '—'}
                  sub="Visitors who ordered"
                  accent="#22C55E"
                  icon="🎯"
                />
                <StatCard
                  label="Avg Orders/Day"
                  value={visitStats.visitsByDay?.length ? Math.round(visitStats.visitsThisWeek / 7) : '—'}
                  sub="Last 7 days"
                  accent="#F4C430"
                  icon="📈"
                />
              </div>

              <div className="charts-grid">
                {/* Daily visits chart */}
                <div className="chart-card wide">
                  <div className="chart-title">Daily Visits — Last 7 Days</div>
                  {visitStats.visitsByDay?.length === 0 ? (
                    <div className="chart-empty">No visit data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={visitStats.visitsByDay || []} margin={{ top:5, right:10, left:0, bottom:0 }}>
                        <defs>
                          <linearGradient id="visitGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#60A5FA" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="_id" tick={{ fill:'rgba(255,255,255,0.35)', fontSize:11 }} tickLine={false} axisLine={false}/>
                        <YAxis tick={{ fill:'rgba(255,255,255,0.35)', fontSize:11 }} tickLine={false} axisLine={false}/>
                        <Tooltip contentStyle={{ background:'#1a1a1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff' }}/>
                        <Area type="monotone" dataKey="count" stroke="#60A5FA" strokeWidth={2} fill="url(#visitGrad)" name="Visitors"/>
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Device breakdown */}
                <div className="chart-card">
                  <div className="chart-title">Device Type</div>
                  <div className="status-list">
                    {(visitStats.visitsByDevice || []).map(d => {
                      const total = visitStats.totalVisits || 1;
                      const icons = { desktop:'🖥️', mobile:'📱', tablet:'📱' };
                      return (
                        <div key={d._id} className="status-row">
                          <span style={{ fontSize:16 }}>{icons[d._id] || '📱'}</span>
                          <span className="status-name" style={{ textTransform:'capitalize' }}>{d._id}</span>
                          <span className="status-count">{d.count}</span>
                          <div className="status-bar-wrap">
                            <div className="status-bar" style={{ width:`${(d.count/total)*100}%`, background:'#60A5FA' }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Traffic source */}
                <div className="chart-card">
                  <div className="chart-title">Traffic Source</div>
                  <div className="status-list">
                    {(visitStats.visitsBySource || []).map(s => {
                      const total = visitStats.totalVisits || 1;
                      const icons = { direct:'🔗', instagram:'📸', google:'🔍', facebook:'👤', referral:'↗️' };
                      const colors = { direct:'#A78BFA', instagram:'#F472B6', google:'#60A5FA', facebook:'#3B82F6', referral:'#34D399' };
                      return (
                        <div key={s._id} className="status-row">
                          <span style={{ fontSize:16 }}>{icons[s._id] || '🔗'}</span>
                          <span className="status-name" style={{ textTransform:'capitalize' }}>{s._id}</span>
                          <span className="status-count">{s.count}</span>
                          <div className="status-bar-wrap">
                            <div className="status-bar" style={{ width:`${(s.count/total)*100}%`, background: colors[s._id] || '#888' }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Page popularity */}
                <div className="chart-card">
                  <div className="chart-title">Most Visited Categories</div>
                  <div className="status-list">
                    {(visitStats.visitsByPage || []).map(p => {
                      const total = visitStats.totalVisits || 1;
                      const icons = { home:'🏠', rackets:'🏓', shoes:'👟', accessories:'🎒', clothes:'👕', all:'⚡' };
                      return (
                        <div key={p._id} className="status-row">
                          <span style={{ fontSize:16 }}>{icons[p._id] || '📄'}</span>
                          <span className="status-name" style={{ textTransform:'capitalize' }}>{p._id}</span>
                          <span className="status-count">{p.count}</span>
                          <div className="status-bar-wrap">
                            <div className="status-bar" style={{ width:`${(p.count/total)*100}%`, background:'#F4C430' }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}