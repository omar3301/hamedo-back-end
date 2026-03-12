import { useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const STATUS_OPTIONS = ['pending','confirmed','processing','shipped','delivered','cancelled'];
const STATUS_COLORS = {
  pending: '#F4C430', confirmed: '#60A5FA', processing: '#A78BFA',
  shipped: '#34D399', delivered: '#22C55E', cancelled: '#F87171',
};

const fmt = n => Number(n || 0).toLocaleString();
const fmtDate = s => new Date(s).toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

// WhatsApp message builder
const buildWAMsg = (order) => {
  const lines = [
    `🎽 *HamedoSport Order Confirmation*`,
    `Order: *${order.orderNumber}*`,
    ``,
    `Hi ${order.customer.firstName}! Your order has been received ✅`,
    ``,
    `*Items:*`,
    ...order.items.map(i => `• ${i.name} (${i.color}, Size ${i.size}) x${i.qty} — ${fmt(i.price * i.qty)} EGP`),
    ``,
    `*Total: ${fmt(order.total)} EGP* (Cash on Delivery)`,
    ``,
    `📍 ${order.delivery.address}${order.delivery.apt ? ', ' + order.delivery.apt : ''}, ${order.delivery.city}, ${order.delivery.governorate}`,
    ``,
    `We'll contact you to schedule delivery. Thank you! 🙏`,
  ];
  return encodeURIComponent(lines.join('\n'));
};

// ── Order Detail Modal ──────────────────────────────────────────────
function OrderModal({ order, onClose, onUpdated }) {
  const [status, setStatus] = useState(order.status);
  const [notes,  setNotes]  = useState(order.notes || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateOrder(order._id, { status, notes });
      onUpdated(updated);
      onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const phone = order.customer.phone.replace(/\D/g,'').replace(/^0/, '20');
  const waLink = `https://wa.me/${phone}?text=${buildWAMsg(order)}`;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <div className="modal-order-num">{order.orderNumber}</div>
            <div className="modal-date">{fmtDate(order.createdAt)}</div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <span className="badge-lg" style={{ background: STATUS_COLORS[order.status]+'22', color: STATUS_COLORS[order.status], border:`1px solid ${STATUS_COLORS[order.status]}44` }}>
              {order.status.toUpperCase()}
            </span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-cols">
          {/* Customer */}
          <div className="modal-section">
            <div className="section-label">CUSTOMER</div>
            <div className="info-row"><span>Name</span><strong>{order.customer.firstName} {order.customer.lastName}</strong></div>
            <div className="info-row"><span>Phone</span><strong>{order.customer.phone}</strong></div>
            {order.customer.email && <div className="info-row"><span>Email</span><strong>{order.customer.email}</strong></div>}
          </div>

          {/* Delivery */}
          <div className="modal-section">
            <div className="section-label">DELIVERY ADDRESS</div>
            <div className="info-row"><span>Full Address</span><strong>{order.delivery.address}{order.delivery.apt ? ', '+order.delivery.apt : ''}, {order.delivery.city}, {order.delivery.governorate}, Egypt</strong></div>
            <div className="info-row"><span>Subtotal</span><strong>{fmt(order.subtotal)} EGP</strong></div>
            <div className="info-row"><span>Delivery</span><strong style={{ color: order.shipping===0 ? '#22C55E' : '#fff' }}>{order.shipping===0 ? 'Free 🎉' : `${order.shipping} EGP`}</strong></div>
            <div className="info-row"><span>Total</span><strong style={{ color:'#F4C430', fontSize:'1.1em' }}>{fmt(order.total)} EGP</strong></div>
          </div>
        </div>

        {/* Items */}
        <div className="modal-section">
          <div className="section-label">ITEMS ({order.items.length})</div>
          <div className="order-items">
            {order.items.map((it, i) => (
              <div key={i} className="order-item">
                <img src={it.image || it.images?.[0]} alt="" className="item-img" onError={e => e.target.style.opacity='0.2'}/>
                <div className="item-info">
                  <div className="item-name">{it.name}</div>
                  <div className="item-meta">{it.color} · Size {it.size} · Qty {it.qty}</div>
                  {it.brand && <div className="item-brand">{it.brand}</div>}
                </div>
                <div className="item-price">{fmt(it.price * it.qty)} EGP</div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="modal-section">
          <div className="section-label">NOTES</div>
          <textarea
            className="field-textarea"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Internal notes about this order…"
            rows={2}
          />
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <select className="field-select" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : '✓ Update'}
          </button>
          <a className="btn-whatsapp" href={waLink} target="_blank" rel="noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp Customer
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Orders Page ─────────────────────────────────────────────────────
export default function Orders() {
  const [orders,  setOrders]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [status,  setStatus]  = useState('all');
  const [search,  setSearch]  = useState('');
  const [q,       setQ]       = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [delId,   setDelId]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, sort: '-createdAt' };
      if (status !== 'all') params.status = status;
      if (q) params.search = q;
      const data = await api.getOrders(params);
      setOrders(data.orders);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, status, q]);

  useEffect(() => { load(); }, [load]);

  const handleUpdated = (updated) => {
    setOrders(prev => prev.map(o => o._id === updated._id ? updated : o));
  };

  const handleDelete = async (id) => {
    try { await api.deleteOrder(id); setDelId(null); load(); }
    catch (e) { alert(e.message); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setQ(search); setPage(1);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-desc">{total} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order #, name, phone…"
          />
          <button type="submit" className="btn-ghost">Search</button>
          {q && <button type="button" className="btn-ghost" onClick={() => { setQ(''); setSearch(''); setPage(1); }}>✕ Clear</button>}
        </form>

        <div className="status-tabs">
          {['all', ...STATUS_OPTIONS].map(s => (
            <button
              key={s}
              className={`tab${status === s ? ' active' : ''}`}
              onClick={() => { setStatus(s); setPage(1); }}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        {loading ? (
          <div className="page-loading"><div className="spinner"/></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id} className="table-row" onClick={() => setSelected(o)}>
                  <td className="mono">{o.orderNumber}</td>
                  <td>
                    <div className="td-name">{o.customer.firstName} {o.customer.lastName}</div>
                    <div className="td-sub">{o.customer.phone}</div>
                  </td>
                  <td className="muted">{fmtDate(o.createdAt)}</td>
                  <td className="muted">{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
                  <td className="bold yellow">{(o.total || 0).toLocaleString()} EGP</td>
                  <td>
                    <span className="badge" style={{ background: STATUS_COLORS[o.status]+'22', color: STATUS_COLORS[o.status], border:`1px solid ${STATUS_COLORS[o.status]}44` }}>
                      {o.status}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="row-actions">
                      <button className="btn-icon" title="View" onClick={() => setSelected(o)}>👁</button>
                      <button className="btn-icon red" title="Delete" onClick={() => setDelId(o._id)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="table-empty">No orders found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="pagination">
          <button className="btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span className="page-info">Page {page} of {pages}</span>
          <button className="btn-ghost" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Order Modal */}
      {selected && (
        <OrderModal
          order={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
        />
      )}

      {/* Delete Confirm */}
      {delId && (
        <div className="modal-overlay" onClick={() => setDelId(null)}>
          <div className="confirm-box" onClick={e => e.stopPropagation()}>
            <h3>Delete this order?</h3>
            <p>This action cannot be undone.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="btn-ghost" onClick={() => setDelId(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDelete(delId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
